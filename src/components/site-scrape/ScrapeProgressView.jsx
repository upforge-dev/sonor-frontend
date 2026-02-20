import React from 'react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import {
  FileText,
  Image,
  Palette,
  Loader2,
  Check,
  AlertCircle,
  Globe,
} from 'lucide-react'

const PHASE_INFO = {
  discovering: {
    icon: Globe,
    title: 'Discovering Pages',
    description: 'Finding all pages on the website...',
  },
  extracting: {
    icon: FileText,
    title: 'Extracting Content',
    description: 'Reading page content, headings, and metadata...',
  },
  downloading_images: {
    icon: Image,
    title: 'Downloading Images',
    description: 'Downloading and storing images...',
  },
  extracting_brand: {
    icon: Palette,
    title: 'Extracting Brand',
    description: 'Analyzing brand elements, colors, and fonts...',
  },
  analyzing: {
    icon: Loader2,
    title: 'AI Analysis',
    description: 'Using AI to classify and organize content...',
  },
  completed: {
    icon: Check,
    title: 'Complete',
    description: 'Scrape completed successfully!',
  },
  failed: {
    icon: AlertCircle,
    title: 'Failed',
    description: 'An error occurred during scraping.',
  },
}

export function ScrapeProgressView({ scrapeId, scrapeData, onComplete }) {
  const phase = scrapeData?.current_step || 'discovering'
  const phaseInfo = PHASE_INFO[phase] || PHASE_INFO.discovering
  const Icon = phaseInfo.icon

  // Calculate overall progress
  const calculateProgress = () => {
    if (!scrapeData) return 0
    
    const phases = ['discovering', 'extracting', 'downloading_images', 'extracting_brand', 'analyzing', 'completed']
    const currentIndex = phases.indexOf(phase)
    if (currentIndex === -1) return 0
    
    // Base progress from phase
    const baseProgress = (currentIndex / (phases.length - 1)) * 100
    
    // Add sub-progress within phase
    const subProgress = scrapeData.pages_extracted || 0
    const totalPages = scrapeData.pages_discovered || 1
    const phaseProgress = phase === 'extracting' ? (subProgress / totalPages) * (100 / phases.length) : 0
    
    return Math.min(baseProgress + phaseProgress, 100)
  }

  const progress = calculateProgress()

  return (
    <div className="py-8 space-y-8">
      <div className="text-center">
        <div
          className={cn(
            'inline-flex items-center justify-center w-20 h-20 rounded-full mb-4',
            phase === 'completed'
              ? 'bg-green-100 dark:bg-green-900/30'
              : phase === 'failed'
              ? 'bg-red-100 dark:bg-red-900/30'
              : 'bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)]'
          )}
        >
          <Icon
            className={cn(
              'h-10 w-10',
              phase === 'completed'
                ? 'text-green-600'
                : phase === 'failed'
                ? 'text-red-600'
                : 'text-white',
              phase !== 'completed' && phase !== 'failed' && 'animate-pulse'
            )}
          />
        </div>
        <h3 className="text-xl font-semibold text-[var(--text-primary)]">
          {phaseInfo.title}
        </h3>
        <p className="text-[var(--text-secondary)] mt-2">
          {scrapeData?.error || phaseInfo.description}
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm text-[var(--text-secondary)]">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {scrapeData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Pages Found"
            value={scrapeData.pages_discovered || 0}
            icon={Globe}
          />
          <StatCard
            label="Pages Extracted"
            value={scrapeData.pages_extracted || 0}
            icon={FileText}
          />
          <StatCard
            label="Images Found"
            value={scrapeData.images_found || 0}
            icon={Image}
          />
          <StatCard
            label="Images Downloaded"
            value={scrapeData.images_downloaded || 0}
            icon={Check}
          />
        </div>
      )}

      {scrapeData?.current_url && (
        <div className="bg-[var(--surface-secondary)] rounded-lg p-4">
          <p className="text-xs text-[var(--text-tertiary)] mb-1">Currently processing:</p>
          <p className="text-sm text-[var(--text-secondary)] font-mono truncate">
            {scrapeData.current_url}
          </p>
        </div>
      )}

      {/* Phase timeline */}
      <div className="space-y-2">
        {Object.entries(PHASE_INFO)
          .filter(([key]) => key !== 'completed' && key !== 'failed')
          .map(([key, info], index, arr) => {
            const phases = ['discovering', 'extracting', 'downloading_images', 'extracting_brand', 'analyzing']
            const currentIndex = phases.indexOf(phase)
            const itemIndex = phases.indexOf(key)
            const isActive = key === phase
            const isComplete = itemIndex < currentIndex || phase === 'completed'
            const PhaseIcon = info.icon

            return (
              <div
                key={key}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20'
                    : isComplete
                    ? 'bg-green-50 dark:bg-green-900/10'
                    : 'bg-[var(--surface-secondary)]'
                )}
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full',
                    isComplete
                      ? 'bg-green-500 text-white'
                      : isActive
                      ? 'bg-[var(--brand-primary)] text-white'
                      : 'bg-[var(--glass-border)] text-[var(--text-tertiary)]'
                  )}
                >
                  {isComplete ? (
                    <Check className="h-4 w-4" />
                  ) : isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PhaseIcon className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p
                    className={cn(
                      'font-medium',
                      isActive
                        ? 'text-[var(--brand-primary)]'
                        : isComplete
                        ? 'text-green-600'
                        : 'text-[var(--text-tertiary)]'
                    )}
                  >
                    {info.title}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">{info.description}</p>
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="bg-[var(--surface-secondary)] rounded-lg p-4 text-center">
      <Icon className="h-5 w-5 text-[var(--text-tertiary)] mx-auto mb-2" />
      <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
      <p className="text-xs text-[var(--text-tertiary)]">{label}</p>
    </div>
  )
}

export default ScrapeProgressView
