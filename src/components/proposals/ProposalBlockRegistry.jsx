/**
 * ProposalBlockRegistry — JSON-drivable proposal component registry.
 *
 * Maps section type strings to React components so that a `sections_json`
 * array can be rendered without any MDX compilation.
 *
 * Pattern mirrors ContractBlocks / ContractView but covers all 40+
 * proposal block components across three design systems:
 *   - Liquid Glass (primary)
 *   - Core (standard)
 *   - Advanced (conversion-focused)
 */
import React from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Liquid Glass
import {
  GlassHero,
  PortalModulesGrid,
  AppFeatureShowcase,
  BrandShowcase,
  IntegrationFlow,
  SiteAnalysisCard,
  SignalAIGlass,
  GlassPricing,
  GlassTimeline,
  GlassCTA,
  GlassLegal,
  SitemapPlan,
  AgencyProfile,
} from './mdx/proposal-blocks/LiquidGlassBlocks'

// Core
import { ProposalHero } from './mdx/proposal-blocks/ProposalHero'
import { Section } from './mdx/proposal-blocks/Section'
import { ExecutiveSummary } from './mdx/proposal-blocks/ExecutiveSummary'
import { StatsGrid, StatCard } from './mdx/proposal-blocks/StatsGrid'
import { CriticalIssues, IssueCard } from './mdx/proposal-blocks/CriticalIssues'
import { PricingSection, PricingTier } from './mdx/proposal-blocks/PricingSection'
import { Timeline, Phase } from './mdx/proposal-blocks/Timeline'
import { NewWebsiteBuild, WebsiteFeature } from './mdx/proposal-blocks/NewWebsiteBuild'
import { DownloadBlock } from './mdx/proposal-blocks/DownloadBlock'
import { SignalAISection } from './mdx/proposal-blocks/SignalAISection'
import { InvestmentSection } from './mdx/proposal-blocks/InvestmentSection'
import { WhyUs } from './mdx/proposal-blocks/WhyUs'

// Advanced
import {
  ValueStack,
  GuaranteeBadge,
  UrgencyBanner,
  Testimonial,
  ComparisonTable,
  ProcessSteps,
  MetricHighlight,
  CTASection,
  IconFeatureGrid,
  BonusSection,
  WebsitePortfolio,
} from './mdx/proposal-blocks/AdvancedBlocks'

// ---------------------------------------------------------------------------
// Markdown helper — renders a markdown string with proposal-appropriate styles
// ---------------------------------------------------------------------------

export function ProposalMarkdown({ content, className = '' }) {
  if (!content) return null
  return (
    <div className={`prose-proposal ${className}`}>
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <div className="mdx-p my-2 text-[var(--text-secondary)]">{children}</div>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-[var(--text-primary)]">{children}</strong>
        ),
        ul: ({ children }) => (
          <ul className="list-disc pl-5 space-y-1 text-[var(--text-secondary)]">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-5 space-y-1 text-[var(--text-secondary)]">{children}</ol>
        ),
        li: ({ children }) => <li className="text-[var(--text-secondary)]">{children}</li>,
        h3: ({ children }) => (
          <h3 className="text-xl font-bold text-[var(--text-primary)] mt-6 mb-3">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-lg font-semibold text-[var(--text-primary)] mt-4 mb-2">{children}</h4>
        ),
        a: ({ href, children }) => (
          <a href={href} className="text-[var(--brand-primary)] hover:underline" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </Markdown>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component registry
// ---------------------------------------------------------------------------

export const PROPOSAL_REGISTRY = {
  // Liquid Glass (primary design system)
  GlassHero,
  PortalModulesGrid,
  AppFeatureShowcase,
  BrandShowcase,
  IntegrationFlow,
  SiteAnalysisCard,
  SignalAIGlass,
  GlassPricing,
  GlassTimeline,
  GlassCTA,
  GlassLegal,
  SitemapPlan,
  AgencyProfile,

  // Core
  ProposalHero,
  Section,
  ExecutiveSummary,
  StatsGrid,
  StatCard,
  CriticalIssues,
  IssueCard,
  PricingSection,
  PricingTier,
  Timeline,
  Phase,
  NewWebsiteBuild,
  WebsiteFeature,
  DownloadBlock,
  SignalAISection,
  InvestmentSection,
  WhyUs,

  // Advanced
  ValueStack,
  GuaranteeBadge,
  UrgencyBanner,
  Testimonial,
  ComparisonTable,
  ProcessSteps,
  MetricHighlight,
  CTASection,
  IconFeatureGrid,
  BonusSection,
  WebsitePortfolio,
}

// ---------------------------------------------------------------------------
// Error boundary for individual sections
// ---------------------------------------------------------------------------

class SectionErrorBoundary extends React.Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mb-6 p-4 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-sm text-[var(--accent-red)]">
          Section render error: <code>{this.state.error?.message || 'Unknown error'}</code>
        </div>
      )
    }
    return this.props.children
  }
}

// ---------------------------------------------------------------------------
// ProposalSection — renders one section from a JSON entry
// ---------------------------------------------------------------------------

export function ProposalSection({ section, proposal }) {
  const Component = PROPOSAL_REGISTRY[section.type]

  if (!Component) {
    if (section.type === 'Custom' && section.props?.html) {
      return <div className="mb-6" dangerouslySetInnerHTML={{ __html: section.props.html }} />
    }
    if (section.type === 'Markdown' && section.props?.content) {
      return (
        <div className="mb-6">
          <ProposalMarkdown content={section.props.content} />
        </div>
      )
    }
    return (
      <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
        Unknown section type: <code>{section.type}</code>
      </div>
    )
  }

  const props = { ...section.props }

  // Inject proposal-level data for specific section types
  if (section.source === 'line_items') {
    props.items = proposal?.line_items || proposal?.metadata?.line_items || []
    props.total = proposal?.total_amount || proposal?.totalAmount
  }

  // Inject agency branding + proposal metadata into GlassHero
  if (section.type === 'GlassHero' && proposal) {
    if (!props.agencyName) props.agencyName = proposal.project?.title
    if (!props.agencyLogo) props.agencyLogo = proposal.project?.logo_url
    if (!props.totalAmount) {
      const amt = proposal.totalAmount || proposal.total_amount
      if (amt) props.totalAmount = parseFloat(amt)
    }
    if (!props.heroImage) props.heroImage = proposal.heroImageUrl || proposal.hero_image_url
  }

  // Inject org-level agency profile data into AgencyProfile
  if (section.type === 'AgencyProfile' && proposal) {
    const org = proposal.org || proposal.organization
    const project = proposal.project
    const profile = org?.agency_profile || org?.metadata?.agency_profile || {}
    if (!props.name) props.name = profile.name || org?.name || project?.title
    if (!props.logo) props.logo = profile.logo || project?.logo_url
    if (!props.tagline) props.tagline = profile.tagline
    if (!props.description) props.description = profile.description
    if (!props.founded) props.founded = profile.founded
    if (!props.teamSize) props.teamSize = profile.team_size
    if (!props.projectsCompleted) props.projectsCompleted = profile.projects_completed
    if (!props.website) props.website = profile.website || org?.website
    if (!props.highlights?.length && profile.highlights?.length) props.highlights = profile.highlights
    if (!props.portfolioItems?.length && profile.portfolio_items?.length) props.portfolioItems = profile.portfolio_items
  }

  // For sections that contain markdown prose, wrap with ProposalMarkdown
  if (props.content && typeof props.content === 'string' && needsMarkdownRendering(section.type)) {
    props.children = <ProposalMarkdown content={props.content} />
    delete props.content
  }

  return (
    <SectionErrorBoundary>
      <Component {...props} />
    </SectionErrorBoundary>
  )
}

function needsMarkdownRendering(type) {
  return ['Section', 'ExecutiveSummary', 'InvestmentSection', 'NewWebsiteBuild', 'PricingSection'].includes(type)
}
