/**
 * ProposalBlocks - MDX Components for Proposals
 * 
 * All components are theme-compatible using CSS custom properties.
 * Individual components are in ./proposal-blocks/ for maintainability.
 */

// Re-export all components from modular files
export { ProposalHero } from './proposal-blocks/ProposalHero'
export { Section } from './proposal-blocks/Section'
export { ExecutiveSummary } from './proposal-blocks/ExecutiveSummary'
export { StatsGrid, StatCard } from './proposal-blocks/StatsGrid'
export { CriticalIssues, IssueCard } from './proposal-blocks/CriticalIssues'
export { PricingSection, PricingTier } from './proposal-blocks/PricingSection'
export { Timeline, Phase } from './proposal-blocks/Timeline'
export { NewWebsiteBuild, WebsiteFeature } from './proposal-blocks/NewWebsiteBuild'
export { DownloadBlock } from './proposal-blocks/DownloadBlock'
export { SignalAISection } from './proposal-blocks/SignalAISection'
export { InvestmentSection } from './proposal-blocks/InvestmentSection'
export { WhyUs } from './proposal-blocks/WhyUs'

// Advanced conversion-focused components
export { 
  ValueStack,
  GuaranteeBadge,
  UrgencyBanner,
  Testimonial,
  ComparisonTable,
  ComparisonRow,
  ProcessSteps,
  MetricHighlight,
  CTASection,
  IconFeatureGrid,
  BonusSection,
  WebsitePortfolio
} from './proposal-blocks/AdvancedBlocks'

// Liquid Glass components (Apple-inspired premium design)
export {
  GlassHero,
  PortalModulesGrid,
  AppFeatureShowcase,
  BrandShowcase,
  IntegrationFlow,
  SiteAnalysisCard,
  SignalAIGlass,
  GlassPricing,
  GlassTimeline,
  GlassCTA
} from './proposal-blocks/LiquidGlassBlocks'

// Import for mdxComponents object
import { ProposalHero } from './proposal-blocks/ProposalHero'
import { Section } from './proposal-blocks/Section'
import { ExecutiveSummary } from './proposal-blocks/ExecutiveSummary'
import { StatsGrid, StatCard } from './proposal-blocks/StatsGrid'
import { CriticalIssues, IssueCard } from './proposal-blocks/CriticalIssues'
import { PricingSection, PricingTier } from './proposal-blocks/PricingSection'
import { Timeline, Phase } from './proposal-blocks/Timeline'
import { NewWebsiteBuild, WebsiteFeature } from './proposal-blocks/NewWebsiteBuild'
import { DownloadBlock } from './proposal-blocks/DownloadBlock'
import { SignalAISection } from './proposal-blocks/SignalAISection'
import { InvestmentSection } from './proposal-blocks/InvestmentSection'
import { WhyUs } from './proposal-blocks/WhyUs'
import { 
  ValueStack,
  GuaranteeBadge,
  UrgencyBanner,
  Testimonial,
  ComparisonTable,
  ComparisonRow,
  ProcessSteps,
  MetricHighlight,
  CTASection,
  IconFeatureGrid,
  BonusSection,
  WebsitePortfolio
} from './proposal-blocks/AdvancedBlocks'
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
  GlassCTA
} from './proposal-blocks/LiquidGlassBlocks'

// Lucide icons for MDX usage
import { 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  Target,
  Clock,
  DollarSign,
  Download,
  BarChart3,
  Shield,
  Sparkles,
  Zap,
  Award,
  Users,
  Globe,
  Smartphone,
  Search,
  Mail,
  Calendar,
  ArrowRight,
  Bot,
  Plug,
  Palette,
  Code2,
  Layers,
  Database,
  Cloud,
  Lock,
  Rocket,
  Workflow
} from 'lucide-react'

// Paragraph as div to avoid invalid HTML: <p> cannot contain block elements like <div> (e.g. MetricHighlight)
const MdxP = (props) => <div className="mdx-p my-2 text-[var(--text-secondary)]" {...props} />

// Export all components for MDX runtime
export const mdxComponents = {
  p: MdxP,
  // Core components
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
  InvestmentSection,
  SignalAISection,
  WhyUs,
  
  // Advanced conversion components
  ValueStack,
  GuaranteeBadge,
  UrgencyBanner,
  Testimonial,
  ComparisonTable,
  ComparisonRow,
  ProcessSteps,
  MetricHighlight,
  CTASection,
  IconFeatureGrid,
  BonusSection,
  WebsitePortfolio,
  
  // Liquid Glass components (premium)
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
  
  // Lucide icons for use in MDX
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Target,
  Clock,
  DollarSign,
  Download,
  BarChart3,
  Shield,
  Sparkles,
  Zap,
  Award,
  Users,
  Globe,
  Smartphone,
  Search,
  Mail,
  Calendar,
  ArrowRight,
  Bot,
  Plug,
  Palette,
  Code2,
  Layers,
  Database,
  Cloud,
  Lock,
  Rocket,
  Workflow
}
