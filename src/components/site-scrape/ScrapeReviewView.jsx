import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import {
  FileText,
  Image,
  Palette,
  Check,
  Download,
  RefreshCw,
  ArrowRight,
  Globe,
  Layout,
  AlertCircle,
  Clock,
  Zap,
  Route,
  Map,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Code,
} from 'lucide-react'
import { portalApi } from '@/lib/portal-api'
import { RoutePlanView } from './RoutePlanView'
import { ScrapedFAQsView } from './ScrapedFAQsView'
import { IntegrationCodeView } from '@uptrade/site-kit/setup'

export function ScrapeReviewView({ scrapeId, scrapeData, projectId, enabledModules = [], onFinish }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [showRoutes, setShowRoutes] = useState(false)
  const [showFAQs, setShowFAQs] = useState(false)
  const [showIntegration, setShowIntegration] = useState(false)

  useEffect(() => {
    fetchSummary()
  }, [scrapeId])

  const fetchSummary = async () => {
    try {
      setLoading(true)
      const response = await portalApi.get(`/site-scrape/${scrapeId}/summary`)
      if (response) {
        setSummary(response)
      }
    } catch (err) {
      toast.error('Failed to load summary')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    setImporting(true)
    try {
      await portalApi.post(`/site-scrape/${scrapeId}/import`, {
        selectedPages: [], // In a real implementation, this would include selected page IDs
        selectedImages: [],
      })
      toast.success('Content imported successfully!')
      onFinish()
    } catch (err) {
      toast.error('Failed to import content')
      console.error(err)
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
      </div>
    )
  }

  const stats = summary || {
    pages: { total: 0, selected: 0 },
    images: { total: 0, downloaded: 0, selected: 0 },
    brand: { extracted: false },
    routes: { total: 0, included: 0, byType: {} },
    sitemap: { found: false, entryCount: 0 },
    domain: scrapeData?.domain || 'Unknown',
    duration: 0,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-green-400 to-green-600 mb-4">
          <Check className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-xl font-semibold text-[var(--text-primary)]">
          Scrape Complete!
        </h3>
        <p className="text-[var(--text-secondary)] mt-2">
          Review the extracted content before importing
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={Globe}
          label="Domain"
          value={stats.domain}
          color="blue"
        />
        <StatCard
          icon={FileText}
          label="Pages"
          value={stats.pages?.total || 0}
          subValue={`${stats.pages?.selected || 0} selected`}
          color="green"
        />
        <StatCard
          icon={Image}
          label="Images"
          value={stats.images?.total || 0}
          subValue={`${stats.images?.downloaded || 0} downloaded`}
          color="purple"
        />
        <StatCard
          icon={Clock}
          label="Duration"
          value={formatDuration(stats.duration)}
          color="orange"
        />
      </div>

      {/* Content Summary */}
      <div className="bg-[var(--surface-secondary)] rounded-lg p-6 space-y-4">
        <h4 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Layout className="h-5 w-5" />
          Content Summary
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pages breakdown */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              Pages by Type
            </p>
            {stats.pagesByType &&
              Object.entries(stats.pagesByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-secondary)] capitalize">
                    {type}
                  </span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            {(!stats.pagesByType || Object.keys(stats.pagesByType).length === 0) && (
              <p className="text-sm text-[var(--text-tertiary)] italic">
                No page type data available
              </p>
            )}
          </div>

          {/* Images breakdown */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              Images by Category
            </p>
            {stats.imagesByCategory &&
              Object.entries(stats.imagesByCategory).map(([cat, count]) => (
                <div key={cat} className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-secondary)] capitalize">
                    {cat}
                  </span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            {(!stats.imagesByCategory ||
              Object.keys(stats.imagesByCategory).length === 0) && (
              <p className="text-sm text-[var(--text-tertiary)] italic">
                No image category data available
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Brand Status */}
      <div className="bg-[var(--surface-secondary)] rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                stats.brand?.extracted
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-yellow-100 dark:bg-yellow-900/30'
              )}
            >
              <Palette
                className={cn(
                  'h-5 w-5',
                  stats.brand?.extracted ? 'text-green-600' : 'text-yellow-600'
                )}
              />
            </div>
            <div>
              <p className="font-medium text-[var(--text-primary)]">Brand Identity</p>
              <p className="text-sm text-[var(--text-secondary)]">
                {stats.brand?.extracted
                  ? 'Successfully extracted'
                  : 'Extraction pending or incomplete'}
              </p>
            </div>
          </div>
          {stats.brand?.extracted && (
            <Check className="h-5 w-5 text-green-500" />
          )}
        </div>

        {stats.brand?.summary && (
          <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[var(--text-tertiary)]">Business Name</p>
                <p className="font-medium">{stats.brand.summary.businessName || '-'}</p>
              </div>
              <div>
                <p className="text-[var(--text-tertiary)]">Industry</p>
                <p className="font-medium">{stats.brand.summary.industry || '-'}</p>
              </div>
              <div>
                <p className="text-[var(--text-tertiary)]">Colors Detected</p>
                <p className="font-medium">{stats.brand.summary.colorsCount || 0}</p>
              </div>
              <div>
                <p className="text-[var(--text-tertiary)]">Social Links</p>
                <p className="font-medium">{stats.brand.summary.socialLinksCount || 0}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Route Plan Section */}
      <div className="bg-[var(--surface-secondary)] rounded-lg p-6">
        <button
          onClick={() => setShowRoutes(!showRoutes)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                stats.routes?.total > 0
                  ? 'bg-blue-100 dark:bg-blue-900/30'
                  : 'bg-gray-100 dark:bg-gray-900/30'
              )}
            >
              <Route
                className={cn(
                  'h-5 w-5',
                  stats.routes?.total > 0 ? 'text-blue-600' : 'text-gray-600'
                )}
              />
            </div>
            <div className="text-left">
              <p className="font-medium text-[var(--text-primary)]">Route Plan</p>
              <p className="text-sm text-[var(--text-secondary)]">
                {stats.routes?.total > 0
                  ? `${stats.routes.included} of ${stats.routes.total} routes included`
                  : 'No routes planned yet'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {stats.sitemap?.found && (
              <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                <Map className="h-3 w-3 mr-1" />
                Sitemap Found
              </Badge>
            )}
            {showRoutes ? (
              <ChevronUp className="h-5 w-5 text-[var(--text-tertiary)]" />
            ) : (
              <ChevronDown className="h-5 w-5 text-[var(--text-tertiary)]" />
            )}
          </div>
        </button>

        {showRoutes && (
          <div className="mt-6 pt-6 border-t border-[var(--glass-border)]">
            <RoutePlanView scrapeId={scrapeId} scrapeData={scrapeData} />
          </div>
        )}
      </div>

      {/* Scraped FAQs Section */}
      <div className="bg-[var(--surface-secondary)] rounded-lg p-6">
        <button
          onClick={() => setShowFAQs(!showFAQs)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                stats.faqs?.total > 0
                  ? 'bg-purple-100 dark:bg-purple-900/30'
                  : 'bg-gray-100 dark:bg-gray-900/30'
              )}
            >
              <HelpCircle
                className={cn(
                  'h-5 w-5',
                  stats.faqs?.total > 0 ? 'text-purple-600' : 'text-gray-600'
                )}
              />
            </div>
            <div className="text-left">
              <p className="font-medium text-[var(--text-primary)]">Extracted FAQs</p>
              <p className="text-sm text-[var(--text-secondary)]">
                {stats.faqs?.total > 0
                  ? `${stats.faqs.total} FAQs found from ${Object.keys(stats.faqs.bySource || {}).length} source types`
                  : 'No FAQs detected on scraped pages'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {stats.faqs?.bySource?.schema && (
              <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                Schema Detected
              </Badge>
            )}
            {stats.faqs?.imported > 0 && (
              <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
                {stats.faqs.imported} Imported
              </Badge>
            )}
            {showFAQs ? (
              <ChevronUp className="h-5 w-5 text-[var(--text-tertiary)]" />
            ) : (
              <ChevronDown className="h-5 w-5 text-[var(--text-tertiary)]" />
            )}
          </div>
        </button>

        {showFAQs && (
          <div className="mt-6 pt-6 border-t border-[var(--glass-border)]">
            <ScrapedFAQsView scrapeId={scrapeId} projectId={projectId} />
          </div>
        )}
      </div>

      {/* Integration Code Section */}
      {enabledModules.length > 0 && (
        <div className="bg-[var(--surface-secondary)] rounded-lg p-6">
          <button
            onClick={() => setShowIntegration(!showIntegration)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30">
                <Code className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-[var(--text-primary)]">Integration Code</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Site-kit snippets for {enabledModules.length} enabled modules
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
                Ready to Copy
              </Badge>
              {showIntegration ? (
                <ChevronUp className="h-5 w-5 text-[var(--text-tertiary)]" />
              ) : (
                <ChevronDown className="h-5 w-5 text-[var(--text-tertiary)]" />
              )}
            </div>
          </button>

          {showIntegration && (
            <div className="mt-6 pt-6 border-t border-[var(--glass-border)]">
              <IntegrationCodeView
                projectId={projectId}
                enabledModules={enabledModules}
                brand={summary?.brand ? {
                  primaryColor: summary.brand.primary_colors?.[0],
                  businessName: summary.brand.business_name,
                } : undefined}
              />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between pt-4 border-t border-[var(--glass-border)]">
        <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
          <Zap className="h-4 w-4" />
          <span>Ready to import to your project</span>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchSummary}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing}
            className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)]"
          >
            {importing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Import to Project
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-gradient-to-r from-[var(--brand-primary)]/10 to-[var(--brand-primary)]/10 rounded-lg p-6">
        <h4 className="font-semibold text-[var(--text-primary)] mb-4">
          What happens next?
        </h4>
        <div className="space-y-3">
          <NextStep
            number={1}
            title="Content Import"
            description="Selected pages and images will be saved to your project's content library."
          />
          <NextStep
            number={2}
            title="Brand Setup"
            description="Extracted brand colors, fonts, and identity will be applied to your project settings."
          />
          <NextStep
            number={3}
            title="Site Architecture"
            description="Use the AI-generated site architecture recommendation to plan your new site structure."
          />
          <NextStep
            number={4}
            title="Content Enhancement"
            description="Echo AI can help you rewrite and improve the imported content for your new site."
          />
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, subValue, color }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  }

  return (
    <div className="bg-[var(--surface-secondary)] rounded-lg p-4">
      <div
        className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center mb-3',
          colorClasses[color]
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs text-[var(--text-tertiary)]">{label}</p>
      <p className="text-xl font-bold text-[var(--text-primary)]">{value}</p>
      {subValue && (
        <p className="text-xs text-[var(--text-tertiary)]">{subValue}</p>
      )}
    </div>
  )
}

function NextStep({ number, title, description }) {
  return (
    <div className="flex gap-3">
      <div className="w-6 h-6 rounded-full bg-[var(--brand-primary)] text-white flex items-center justify-center text-sm font-medium shrink-0">
        {number}
      </div>
      <div>
        <p className="font-medium text-[var(--text-primary)]">{title}</p>
        <p className="text-sm text-[var(--text-secondary)]">{description}</p>
      </div>
    </div>
  )
}

function formatDuration(seconds) {
  if (!seconds || seconds < 60) {
    return `${seconds || 0}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

export default ScrapeReviewView
