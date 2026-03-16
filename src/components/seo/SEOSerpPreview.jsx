/**
 * SEO SERP Preview Component
 * 
 * Live preview of how pages will appear in Google search results.
 * Features:
 * - Desktop and mobile preview
 * - Character count warnings
 * - Title truncation simulation
 * - Keyword highlighting
 * - A/B variant testing
 */
import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Monitor, 
  Smartphone, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  Copy,
  RotateCcw,
  ArrowUpDown
} from 'lucide-react'

// Google's display limits
const TITLE_DESKTOP_LIMIT = 600 // pixels, roughly 60 chars
const TITLE_MOBILE_LIMIT = 78 // chars
const DESC_DESKTOP_LIMIT = 920 // pixels, roughly 160 chars
const DESC_MOBILE_LIMIT = 120 // chars

// Character to pixel ratio (approximate)
const CHAR_TO_PIXEL = 10

// Normalize page metadata from API (snake_case) or legacy (camelCase)
const getPageTitle = (p) => p?.managed_title ?? p?.managedTitle ?? p?.title ?? ''
const getPageDescription = (p) => p?.managed_meta_description ?? p?.managedMetaDescription ?? p?.meta_description ?? p?.metaDescription ?? ''

export default function SEOSerpPreview({ 
  page,
  onSave,
  targetKeyword = '',
  showVariants = false,
  /** Project/site domain (e.g. nkylawfirm.com) for URL preview; uses page.url host when absent */
  domain: domainProp
}) {
  const [title, setTitle] = useState(getPageTitle(page))
  const [description, setDescription] = useState(getPageDescription(page))
  const [previewMode, setPreviewMode] = useState('desktop')
  const [variants, setVariants] = useState([])
  const [isDirty, setIsDirty] = useState(false)

  // Sync from page when it changes (e.g. after save or refetch)
  useEffect(() => {
    setTitle(getPageTitle(page))
    setDescription(getPageDescription(page))
  }, [page?.managed_title, page?.managed_meta_description, page?.title, page?.meta_description])

  // Calculate character limits based on mode
  const titleLimit = previewMode === 'desktop' ? 60 : TITLE_MOBILE_LIMIT
  const descLimit = previewMode === 'desktop' ? 160 : DESC_MOBILE_LIMIT

  // Title analysis
  const titleAnalysis = useMemo(() => {
    const length = title.length
    const pixelWidth = length * CHAR_TO_PIXEL
    const willTruncate = previewMode === 'desktop' 
      ? pixelWidth > TITLE_DESKTOP_LIMIT 
      : length > TITLE_MOBILE_LIMIT

    const issues = []
    if (length < 30) issues.push('Too short - aim for 50-60 characters')
    if (length > 60) issues.push('May be truncated in search results')
    if (targetKeyword && !title.toLowerCase().includes(targetKeyword.toLowerCase())) {
      issues.push(`Target keyword "${targetKeyword}" not found in title`)
    }
    if (!title.match(/\d/)) issues.push('Consider adding numbers for better CTR')

    return {
      length,
      pixelWidth,
      willTruncate,
      truncatedTitle: willTruncate ? title.substring(0, titleLimit - 3) + '...' : title,
      issues,
      score: issues.length === 0 ? 'good' : issues.length === 1 ? 'warning' : 'error'
    }
  }, [title, previewMode, targetKeyword, titleLimit])

  // Description analysis
  const descAnalysis = useMemo(() => {
    const length = description.length
    const willTruncate = length > descLimit

    const issues = []
    if (length < 120) issues.push('Too short - aim for 140-160 characters')
    if (length > 160) issues.push('May be truncated in search results')
    if (targetKeyword && !description.toLowerCase().includes(targetKeyword.toLowerCase())) {
      issues.push(`Target keyword "${targetKeyword}" not found`)
    }
    if (!description.includes('|') && !description.match(/[.!?]$/)) {
      issues.push('End with a call-to-action or value proposition')
    }

    return {
      length,
      willTruncate,
      truncatedDesc: willTruncate ? description.substring(0, descLimit - 3) + '...' : description,
      issues,
      score: issues.length === 0 ? 'good' : issues.length === 1 ? 'warning' : 'error'
    }
  }, [description, descLimit, targetKeyword])

  // Highlight keywords in text
  const highlightKeywords = (text, keyword) => {
    if (!keyword || !text) return text
    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    return text.replace(regex, '<mark class="bg-yellow-200 text-yellow-900">$1</mark>')
  }

  // Generate URL preview (guard against invalid or relative URLs; use project domain when provided)
  const urlPreview = useMemo(() => {
    const path = page?.path || '/example-page/'
    const pathNorm = path.startsWith('/') ? path : `/${path}`
    const isAbsolute = page?.url && (page.url.startsWith('http://') || page.url.startsWith('https://'))
    let baseHost = domainProp
    if (!baseHost && isAbsolute) {
      try {
        baseHost = new URL(page.url).hostname
      } catch {
        baseHost = null
      }
    }
    const base = baseHost ? `https://${baseHost.replace(/^(https?:\/\/)?(www\.)?/, '')}` : 'https://sonor.io'
    const urlStr = isAbsolute ? page.url : `${base}${pathNorm}`
    let urlObj
    try {
      urlObj = new URL(urlStr)
    } catch {
      urlObj = new URL(`${base}/`)
    }
    const breadcrumbs = urlObj.pathname.split('/').filter(Boolean)
    return {
      domain: urlObj.hostname,
      breadcrumbs: breadcrumbs.length > 2
        ? [breadcrumbs[0], '...', breadcrumbs[breadcrumbs.length - 1]]
        : breadcrumbs
    }
  }, [page, domainProp])

  const handleSave = () => {
    if (onSave) {
      onSave({
        managed_title: title,
        managed_meta_description: description,
        managedTitle: title,
        managedMetaDescription: description
      })
      setIsDirty(false)
    }
  }

  const handleReset = () => {
    setTitle(getPageTitle(page))
    setDescription(getPageDescription(page))
    setIsDirty(false)
  }

  const addVariant = () => {
    setVariants([...variants, { title: '', description: '' }])
  }

  return (
    <div className="space-y-6">
      {/* Preview Mode Toggle */}
      <div className="flex items-center justify-between">
        <Tabs value={previewMode} onValueChange={setPreviewMode}>
          <TabsList>
            <TabsTrigger value="desktop" className="gap-2">
              <Monitor className="h-4 w-4" />
              Desktop
            </TabsTrigger>
            <TabsTrigger value="mobile" className="gap-2">
              <Smartphone className="h-4 w-4" />
              Mobile
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          {isDirty && (
            <>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {/* SERP Preview Card */}
      <Card className={previewMode === 'mobile' ? 'max-w-sm mx-auto' : ''}>
        <CardContent className="p-4">
          <div className="font-google">
            {/* URL / Breadcrumbs */}
            <div className="flex items-center gap-1 text-sm mb-1">
              <span className="text-gray-700">{urlPreview.domain}</span>
              {urlPreview.breadcrumbs.map((crumb, i) => (
                <span key={i} className="text-gray-500">
                  {' › '}{crumb}
                </span>
              ))}
            </div>

            {/* Title */}
            <h3 
              className="text-xl text-blue-800 hover:underline cursor-pointer leading-snug"
              dangerouslySetInnerHTML={{ 
                __html: highlightKeywords(titleAnalysis.truncatedTitle, targetKeyword) 
              }}
            />

            {/* Description */}
            <p 
              className="text-sm text-gray-600 mt-1 leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: highlightKeywords(descAnalysis.truncatedDesc, targetKeyword) 
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Editor Section */}
      <div className="grid gap-4">
        {/* Title Editor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Title Tag</label>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${
                titleAnalysis.length > titleLimit ? 'text-red-500' : 
                titleAnalysis.length < 30 ? 'text-yellow-500' : 'text-green-500'
              }`}>
                {titleAnalysis.length} / {titleLimit}
              </span>
              {titleAnalysis.score === 'good' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              {titleAnalysis.score === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
              {titleAnalysis.score === 'error' && <AlertTriangle className="h-4 w-4 text-red-500" />}
            </div>
          </div>
          <Input
            value={title}
            onChange={(e) => { setTitle(e.target.value); setIsDirty(true) }}
            placeholder="Enter page title..."
            className={titleAnalysis.willTruncate ? 'border-yellow-500' : ''}
          />
          {titleAnalysis.issues.length > 0 && (
            <ul className="mt-2 text-sm text-muted-foreground">
              {titleAnalysis.issues.map((issue, i) => (
                <li key={i} className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-yellow-500" />
                  {issue}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Description Editor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Meta Description</label>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${
                descAnalysis.length > descLimit ? 'text-red-500' : 
                descAnalysis.length < 120 ? 'text-yellow-500' : 'text-green-500'
              }`}>
                {descAnalysis.length} / {descLimit}
              </span>
              {descAnalysis.score === 'good' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              {descAnalysis.score === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
              {descAnalysis.score === 'error' && <AlertTriangle className="h-4 w-4 text-red-500" />}
            </div>
          </div>
          <Textarea
            value={description}
            onChange={(e) => { setDescription(e.target.value); setIsDirty(true) }}
            placeholder="Enter meta description..."
            rows={3}
            className={descAnalysis.willTruncate ? 'border-yellow-500' : ''}
          />
          {descAnalysis.issues.length > 0 && (
            <ul className="mt-2 text-sm text-muted-foreground">
              {descAnalysis.issues.map((issue, i) => (
                <li key={i} className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-yellow-500" />
                  {issue}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Target Keyword */}
      {targetKeyword && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-blue-500" />
              <span className="text-blue-700">Target Keyword:</span>
              <Badge variant="outline" className="bg-white">{targetKeyword}</Badge>
              <span className="text-blue-600 ml-auto">
                {title.toLowerCase().includes(targetKeyword.toLowerCase()) && 
                 description.toLowerCase().includes(targetKeyword.toLowerCase())
                  ? '✓ Found in both title and description'
                  : title.toLowerCase().includes(targetKeyword.toLowerCase())
                  ? '✓ Found in title'
                  : description.toLowerCase().includes(targetKeyword.toLowerCase())
                  ? '✓ Found in description'
                  : '⚠ Not found - consider adding'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* A/B Variants Section */}
      {showVariants && (
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4" />
                A/B Test Variants
              </CardTitle>
              <Button variant="outline" size="sm" onClick={addVariant}>
                Add Variant
              </Button>
            </div>
          </CardHeader>
          {variants.length > 0 && (
            <CardContent className="space-y-4">
              {variants.map((variant, i) => (
                <div key={i} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">Variant {String.fromCharCode(66 + i)}</Badge>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setVariants(variants.filter((_, j) => j !== i))}
                    >
                      Remove
                    </Button>
                  </div>
                  <Input
                    value={variant.title}
                    onChange={(e) => {
                      const newVariants = [...variants]
                      newVariants[i].title = e.target.value
                      setVariants(newVariants)
                    }}
                    placeholder="Variant title..."
                    className="mb-2"
                  />
                  <Textarea
                    value={variant.description}
                    onChange={(e) => {
                      const newVariants = [...variants]
                      newVariants[i].description = e.target.value
                      setVariants(newVariants)
                    }}
                    placeholder="Variant description..."
                    rows={2}
                  />
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
