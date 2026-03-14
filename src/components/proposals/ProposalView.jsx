// src/components/ProposalView.jsx
/**
 * Unified Proposal View Component
 * Used by both:
 * - ProposalEditor (admin preview with toolbar)
 * - ProposalGate (client-facing public view)
 */
import { useState, useEffect, useRef } from 'react'
import { evaluate } from '@mdx-js/mdx'
import * as runtime from 'react/jsx-runtime'
import { mdxComponents, ProposalHero } from './mdx/ProposalBlocks'
import { ProposalSection } from './ProposalBlockRegistry'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Clock, ArrowLeft } from 'lucide-react'
import ProposalSignature from './ProposalSignature'
import ProposalTerms from './ProposalTerms'

// Sanitize MDX content to escape problematic characters
function sanitizeMDXContent(mdxSource) {
  if (!mdxSource) return mdxSource
  
  let sanitized = mdxSource
  
  // Strip HTML comments (<!-- ... -->) — MDX only supports {/* */}
  sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, '')

  // Strip <!DOCTYPE ...> or any other <! constructs
  sanitized = sanitized.replace(/<![\s\S]*?>/g, '')
  
  // FIRST: Fix malformed JSX array attributes
  // AI sometimes generates: items=[ instead of items={[
  sanitized = sanitized.replace(/(\w+)=\[(\s*[\[\{"\w])/g, '$1={[$2')
  
  // Close the arrays properly
  sanitized = sanitized.replace(/\](\s*)(\/?>)/g, ']}$1$2')
  sanitized = sanitized.replace(/\](\s+)(\w+=)/g, ']}$1$2')
  
  // SECOND: Fix escaped quotes inside attribute values
  // AI generates: description="...\"quoted text\"..." 
  // Replace \" with ' (single quote) to avoid parsing issues
  sanitized = sanitized.replace(/\\"/g, "'")

  // SECOND-B: Fix apostrophe in contractions inside single-quoted attrs
  // e.g. description='...doesn't support...' — the ' in "doesn't" closes the string
  // Use Unicode apostrophe (U+2019) instead of escaping — avoids parser confusion
  sanitized = sanitized.replace(/(\w)'(\w)/g, '$1\u2019$2')
  
  // THIRD: Handle square brackets in text that look like placeholders
  // Replace [word] or [word word] with 'word' using single quotes
  sanitized = sanitized.replace(/\[([a-zA-Z][a-zA-Z\s]*)\]/g, "'$1'")
  
  // FOURTH: Fix angle brackets that might appear in text values
  // Replace <number with "less than number" and >number with "more than number"
  sanitized = sanitized.replace(/<(\d)/g, 'less than $1')
  sanitized = sanitized.replace(/>(\d)/g, 'more than $1')
  
  // FIFTH: Do not globally rewrite nested quotes.
  // Earlier heuristics here were mutating valid prose/JSX strings like "Free Intro"
  // into malformed MDX, so only keep the more targeted fixes below.

  // SEVENTH: Fix orphaned fragments after closing " — parser sees . as invalid attribute name
  // E) "value" . "rest" (AI splits sentence at period: "21/100" . "Slow initial...")
  // Allow \s* (optional) before period to catch "value". "rest" as well
  sanitized = sanitized.replace(/"([^"]*)"\s*\.\s*"([^"]*)"/g, (_, prefix, suffix) => {
    return `"${prefix}. ${suffix}"`
  })
  // A) "value" .com or "url" .png" (space before dot, optional trailing ")
  sanitized = sanitized.replace(/"([^"]*)" (\.[a-zA-Z0-9]+)(")?/g, (_, value, fragment) => {
    return `"${value}${fragment}"`
  })
  // B) "value".com (no space — dot directly after closing quote)
  sanitized = sanitized.replace(/"([^"]*)"(\.[a-zA-Z0-9]+)(?=[\s>\/]|$)/g, (_, value, fragment) => {
    return `"${value}${fragment}"`
  })
  // B2) "value". (orphan period only — e.g. "21/100".)
  sanitized = sanitized.replace(/"([^"]*)"\.(?=[\s>\/"'\)]|$)/g, (_, value) => {
    return `"${value}."`
  })
  // B3) "value" . (space before orphan period — e.g. "21/100" . before next attr)
  sanitized = sanitized.replace(/"([^"]*)"\s+\.(?=[\s>\/"'\)]|$)/g, (_, value) => {
    return `"${value}."`
  })
  // C) "value" 2.5 or "value" example.com (decimal or domain-like fragment)
  sanitized = sanitized.replace(/"([^"]*)" ([a-zA-Z0-9]*\.[a-zA-Z0-9]+)(?=[\s>\/]|$)/g, (_, value, fragment) => {
    return `"${value} ${fragment}"`
  })
  // D) Catch-all: "value" .anything (any orphaned . fragment we missed)
  sanitized = sanitized.replace(/"([^"]*)"\s+(\.[^\s"<>\/=]*)(?=[\s>\/"']|$)/g, (_, value, fragment) => {
    return `"${value}${fragment}"`
  })

  // E2) Fix "Next" .js " rest" inside arrays/objects — merge all three into one string
  sanitized = sanitized.replace(/"([^"]*)"\s+\.([a-zA-Z0-9]+)\s*"([^"]*)"/g, (_, prefix, mid, suffix) => {
    return `"${prefix}.${mid} ${suffix}"`
  })

  return sanitized
}

// MDX Content Renderer
function MDXContent({ mdxSource }) {
  const [Content, setContent] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function compileMDX() {
      if (!mdxSource) {
        setLoading(false)
        return
      }
      
      const sanitizedMDX = sanitizeMDXContent(mdxSource)
      try {
        const { default: CompiledContent } = await evaluate(sanitizedMDX, {
          ...runtime,
          development: false
        })
        setContent(() => CompiledContent)
      } catch (err) {
        console.error('MDX compilation error:', err)
        if (err.message?.includes('Unexpected character') && err.message?.includes('attribute name')) {
          const lineCol = err.message.match(/(\d+):(\d+)/)
          if (lineCol) {
            const [, line, col] = lineCol
            const lines = sanitizedMDX.split(/\r?\n/)
            const lineIdx = Math.max(0, parseInt(line, 10) - 1)
            const colIdx = Math.max(0, parseInt(col, 10) - 1)
            const targetLine = lines[lineIdx] || ''
            const pos = lines.slice(0, lineIdx).join('\n').length + colIdx
            const start = Math.max(0, pos - 80)
            const snippet = sanitizedMDX.slice(start, pos + 80)
            console.error('[ProposalView MDX] Error at L' + line + ':' + col + ' — snippet:', snippet)
            console.error('[ProposalView MDX] Char at position:', JSON.stringify(targetLine[colIdx]))
          }
        }
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    compileMDX()
  }, [mdxSource])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 rounded-lg p-6">
        <h3 className="text-[var(--accent-red)] font-semibold mb-2">Content Error</h3>
        <pre className="text-sm text-[var(--accent-red)]/80 overflow-auto whitespace-pre-wrap">{error}</pre>
      </div>
    )
  }

  if (!Content) {
    return <p className="text-[var(--text-secondary)]">No content available</p>
  }

  return (
    <div className="mdx-content text-[var(--text-primary)]">
      <Content components={mdxComponents} />
    </div>
  )
}

// JSON sections renderer — renders sections_json via ProposalBlockRegistry
function ProposalJSONContent({ sectionsJson, proposal }) {
  const sections = Array.isArray(sectionsJson) ? sectionsJson : []

  if (sections.length === 0) {
    return <p className="text-[var(--text-secondary)]">No content available</p>
  }

  return (
    <div className="proposal-json-content text-[var(--text-primary)]">
      {sections.map((section, index) => (
        <ProposalSection
          key={`${section.type}-${index}`}
          section={section}
          proposal={proposal}
        />
      ))}
    </div>
  )
}

export default function ProposalView({ 
  proposal, 
  isPublicView = false,
  showSignature = true,
  onBack,
  className = ''
}) {
  if (!proposal) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    )
  }

  // Normalize field names (API returns camelCase, some places have snake_case)
  const totalAmount = proposal.totalAmount || (proposal.total_amount ? parseFloat(proposal.total_amount) : null)
  const validUntil = proposal.validUntil || proposal.valid_until
  const mdxContent = proposal.mdxContent || proposal.mdx_content
  const sectionsJson = proposal.sectionsJson || proposal.sections_json
  const heroImageUrl = proposal.heroImageUrl || proposal.hero_image_url
  const brandName = proposal.brandName || proposal.brand_name || proposal.contact?.company
  const rawTimeline = proposal.timeline || '6-weeks'
  const rawPaymentTerms = proposal.paymentTerms || proposal.payment_terms || '50-50'
  
  // Deposit info
  const depositPercentage = proposal.depositPercentage || proposal.deposit_percentage || 50
  const depositAmount = proposal.depositAmount || proposal.deposit_amount || (totalAmount * depositPercentage / 100)
  const depositPaidAt = proposal.depositPaidAt || proposal.deposit_paid_at

  // Parse timeline into readable format
  const formatTimeline = (value) => {
    if (!value) return '6 weeks'
    // Handle formats like "1-week", "6-weeks", "12-weeks", etc.
    const match = value.match(/^(\d+)-?weeks?$/i)
    if (match) {
      const num = parseInt(match[1])
      return num === 1 ? '1 week' : `${num} weeks`
    }
    // Handle formats like "3-months", etc.
    const monthMatch = value.match(/^(\d+)-?months?$/i)
    if (monthMatch) {
      const num = parseInt(monthMatch[1])
      return num === 1 ? '1 month' : `${num} months`
    }
    // Handle "ongoing"
    if (value.toLowerCase() === 'ongoing') return 'Ongoing'
    // Already formatted or custom
    return value.replace(/-/g, ' ')
  }

  // Parse payment terms into readable format
  const formatPaymentTerms = (value) => {
    if (!value) return '50/50'
    const terms = {
      '50-50': '50/50',
      '100-upfront': '100% Upfront',
      '25-25-25-25': '25% Quarterly',
      'monthly': 'Monthly',
      'custom': 'Custom'
    }
    return terms[value] || value.replace(/-/g, ' ')
  }

  const timeline = formatTimeline(rawTimeline)
  const paymentTerms = formatPaymentTerms(rawPaymentTerms)

  const hasJsonContent = Array.isArray(sectionsJson) && sectionsJson.length > 0
  const hasMdxContent = mdxContent && 
    !mdxContent.startsWith('# Generating') && 
    mdxContent.length > 100
  const hasContent = hasJsonContent || hasMdxContent

  const isGenerating = !hasContent && proposal.status === 'draft'

  if (isGenerating) {
    return (
      <div className={`max-w-6xl mx-auto ${className}`}>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-16 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-[var(--brand-primary)] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              Generating Your Proposal...
            </h3>
            <p className="text-[var(--text-secondary)]">
              Our AI is crafting a high-converting proposal. This usually takes 30-60 seconds.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!hasContent) {
    return (
      <div className={`max-w-6xl mx-auto ${className}`}>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-16 text-center">
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              No Content Yet
            </h3>
            <p className="text-[var(--text-secondary)]">
              This proposal doesn't have any content.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`max-w-6xl mx-auto ${className}`}>
      {/* Back Button - only show when onBack is provided (internal views) */}
      {onBack && (
        <div className="mb-6">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Proposals
          </Button>
        </div>
      )}

      {/* Hero Section */}
      <ProposalHero
        title={proposal.title}
        subtitle={proposal.description}
        heroImage={heroImageUrl}
        brandName={brandName}
        agencyName={proposal.project?.title}
        agencyLogo={proposal.project?.logo_url}
        totalAmount={totalAmount}
        validUntil={validUntil}
        stats={[
          { value: timeline, label: 'Timeline' },
          { value: `$${(totalAmount || 0).toLocaleString()}`, label: 'Investment' },
          { value: paymentTerms, label: 'Payment' },
          { value: '2', label: 'Q1 Slots Left' }
        ]}
      />

      {/* Content — JSON sections preferred, MDX fallback */}
      <div className="mb-8">
        {hasJsonContent
          ? <ProposalJSONContent sectionsJson={sectionsJson} proposal={proposal} />
          : <MDXContent mdxSource={mdxContent} />}
      </div>

      {/* Signature Section - for public client view */}
      {isPublicView && showSignature && (
        <>
          {/* Terms & Conditions - Only show if not yet signed */}
          {!['signed', 'accepted'].includes(proposal.status) && (
            <ProposalTerms 
              proposalTitle={proposal.title}
              depositPercentage={depositPercentage}
              timeline={timeline}
            />
          )}
          
          <Card className="mb-8 bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-primary)]">
                {['signed', 'accepted'].includes(proposal.status) ? 'Proposal Signed' : 'Accept This Proposal'}
              </CardTitle>
              <CardDescription className="text-[var(--text-secondary)]">
                {['signed', 'accepted'].includes(proposal.status) 
                  ? 'This proposal has been signed and accepted'
                  : 'Sign below to accept this proposal and get started'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProposalSignature 
                proposalId={proposal.id} 
                proposalSlug={proposal.slug}
                proposalTitle={proposal.title}
                clientName={proposal.contact?.name}
                clientEmail={proposal.contact?.email}
                clientSignature={proposal.clientSignatureUrl || proposal.clientSignature}
                clientSignedBy={proposal.clientSignedBy}
                clientSignedAt={proposal.clientSignedAt || proposal.signedAt}
                status={proposal.status}
                depositPercentage={depositPercentage}
                depositAmount={depositAmount}
                totalAmount={totalAmount}
                depositPaidAt={depositPaidAt}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
