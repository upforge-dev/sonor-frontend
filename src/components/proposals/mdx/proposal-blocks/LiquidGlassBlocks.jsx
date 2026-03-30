/**
 * Liquid Glass MDX Components
 * 
 * Apple-inspired liquid glass aesthetic with Upforge brand teal
 * Brand color: Teal (#39bfb0)
 */

import { useState } from 'react'
import SignalAILogo from '@/components/signal/SignalAILogo'
import { 
  Sparkles, 
  Zap, 
  Shield, 
  Globe, 
  Smartphone,
  Layout,
  Database,
  Bot,
  Palette,
  Code2,
  Layers,
  ArrowRight,
  CheckCircle,
  TrendingUp,
  Users,
  MessageSquare,
  BarChart3,
  Mail,
  Calendar,
  ShoppingCart,
  FileText,
  Search,
  Bell,
  Workflow,
  Plug,
  Cpu,
  Cloud,
  Lock,
  Rocket
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// LIQUID GLASS BASE STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const liquidGlassBase = `
  relative
  bg-gradient-to-br from-white/10 to-white/5
  backdrop-blur-xl
  border border-white/20
  shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.2)]
  rounded-3xl
`

const liquidGlassClipped = `
  relative overflow-hidden
  bg-gradient-to-br from-white/10 to-white/5
  backdrop-blur-xl
  border border-white/20
  shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.2)]
  rounded-3xl
`

const liquidGlassHover = `
  transition-all duration-500 ease-out
  hover:shadow-[0_16px_48px_rgba(75,191,57,0.15),inset_0_1px_0_rgba(255,255,255,0.3)]
  hover:border-white/30
  hover:scale-[1.02]
`

const brandGradient = 'bg-[#39bfb0]'
const brandGradientText = 'text-[#39bfb0]'

// ═══════════════════════════════════════════════════════════════════════════════
// GLASS HERO - Premium proposal opener
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GlassHero - Premium liquid glass hero with agency branding
 * The opening visual for all proposals — sets the tone for the entire document.
 */
export function GlassHero({
  title,
  subtitle,
  clientName,
  proposalType, // 'new-brand' | 'rebuild' | 'app-development' | 'ai-automation'
  stats = [],
  agencyName,
  agencyLogo,
  totalAmount,
  heroImage,
}) {
  const typeLabels = {
    'new-brand': 'New Website',
    'rebuild': 'Website Rebuild',
    'app-development': 'Application Development',
    'ai-automation': 'AI & Automations',
  }

  const typeIcons = {
    'new-brand': Palette,
    'rebuild': Layers,
    'app-development': Smartphone,
    'ai-automation': Bot,
  }

  const TypeIcon = typeIcons[proposalType] || Sparkles
  const displayName = agencyName || ''
  const displayLogo = agencyLogo || ''

  return (
    <div className={`${liquidGlassClipped} mt-8 mb-10 min-h-[360px]`}>
      {/* Hero background image */}
      {heroImage && (
        <div className="absolute inset-0 z-0">
          <img src={heroImage} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
        </div>
      )}

      {/* Animated gradient orbs */}
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-[#39bfb0]/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#39bfb0]/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 p-8 md:p-12">
        {/* Top row: Agency logo + Total investment */}
        {(displayName || displayLogo || totalAmount) && (
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              {displayLogo && (
                <img
                  src={displayLogo}
                  alt={displayName}
                  className="w-10 h-10 rounded-lg object-contain"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              )}
              {displayName && (
                <span className="text-sm font-medium text-white/70">{displayName}</span>
              )}
            </div>
            {totalAmount && (
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider text-white/40">Total Investment</div>
                <div className={`text-3xl font-bold ${brandGradientText}`}>
                  ${typeof totalAmount === 'number' ? totalAmount.toLocaleString() : totalAmount}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Type badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
          <TypeIcon className="w-4 h-4 text-[#39bfb0]" />
          <span className="text-sm font-medium text-white/80">{typeLabels[proposalType] || 'Proposal'}</span>
        </div>

        {/* Main title */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
          {title}
        </h1>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-xl md:text-2xl text-white/70 max-w-3xl mb-8">
            {subtitle}
          </p>
        )}

        {/* Client name with gradient */}
        {clientName && (
          <div className="flex items-center gap-3 mb-8">
            <span className="text-white/50">Prepared for</span>
            <span className={`text-xl font-semibold ${brandGradientText}`}>{clientName}</span>
          </div>
        )}

        {/* Stats row */}
        {stats.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 border-t border-white/10">
            {stats.map((stat, i) => (
              <div key={i} className="text-center md:text-left">
                <div className={`text-3xl font-bold ${brandGradientText}`}>{stat.value}</div>
                <div className="text-sm text-white/50">{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PORTAL MODULES SHOWCASE - Visual display of Portal features
// ═══════════════════════════════════════════════════════════════════════════════

// Fixed 9 Sonor platform tiles — always the same, always 9
const SONOR_MODULES = [
  { id: 'crm', icon: Users, label: 'CRM & Pipelines', description: 'Track every lead from first touch to close with visual pipelines and automated follow-ups' },
  { id: 'forms', icon: FileText, label: 'Smart Forms', description: 'Capture and qualify leads with conditional forms that route submissions to the right pipeline' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics & Heatmaps', description: 'See which pages drive conversions, where visitors drop off, and what CTAs actually work' },
  { id: 'seo', icon: Search, label: 'SEO & Rankings', description: 'Monitor keyword rankings, run audits, and find opportunities to grow organic traffic' },
  { id: 'blog', icon: Layers, label: 'Blog & Content', description: 'Publish and manage SEO-optimized content directly from your dashboard' },
  { id: 'signal', icon: Bot, label: 'AI Chat Widget', description: 'A 24/7 AI assistant on your site that answers questions, qualifies leads, and books meetings' },
  { id: 'outreach', icon: Mail, label: 'Email Campaigns', description: 'Send targeted campaigns, automate follow-up sequences, and track opens and clicks' },
  { id: 'sync', icon: Calendar, label: 'Bookings & Calendar', description: 'Let visitors schedule consultations with calendar sync and automated reminders' },
  { id: 'reputation', icon: Shield, label: 'Reviews & Reputation', description: 'Collect, manage, and showcase client reviews to build trust and social proof' },
]

/**
 * PortalModulesGrid — Fixed 9-tile Sonor platform showcase.
 * Always shows the same 9 modules. AI only provides the subtitle.
 */
export function PortalModulesGrid({
  title = "Built-In Business Tools",
  subtitle,
}) {
  return (
    <div className="my-10">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">{title}</h2>
        {subtitle && <p className="text-[var(--text-secondary)]">{subtitle}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SONOR_MODULES.map((mod, i) => {
          const Icon = mod.icon

          return (
            <div
              key={mod.id}
              className={`${liquidGlassBase} ${liquidGlassHover} p-6 group cursor-default`}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"
                style={{ background: `radial-gradient(circle at center, #39bfb015 0%, transparent 70%)` }}
              />

              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-[#39bfb0]/10">
                  <Icon className="w-6 h-6 text-[#39bfb0]" />
                </div>

                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                  {mod.label}
                </h3>

                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {mod.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Subtle platform attribution with link */}
      <div className="mt-6 text-center">
        <a
          href="https://sonor.io"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
        >
          <span>Powered by</span>
          <span className="font-semibold text-[#39bfb0]">Sonor</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#39bfb0]" />
        </a>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP FEATURE SHOWCASE - For app development proposals
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * AppFeatureShowcase - Premium display of app features
 * Use for app development proposals to show planned features
 */
export function AppFeatureShowcase({
  title = "Your App Features",
  subtitle,
  features = [] // [{ title, description, icon: 'smartphone' }]
}) {
  const iconMap = {
    smartphone: Smartphone,
    globe: Globe,
    shield: Shield,
    zap: Zap,
    users: Users,
    database: Database,
    cloud: Cloud,
    lock: Lock,
    bot: Bot,
    code: Code2,
    workflow: Workflow,
    rocket: Rocket
  }

  return (
    <div className="my-10">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">{title}</h2>
        {subtitle && <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">{subtitle}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature, i) => {
          const Icon = iconMap[feature.icon] || Sparkles

          return (
            <div 
              key={i}
              className={`${liquidGlassBase} ${liquidGlassHover} p-8 group overflow-hidden`}
            >
              <div className={`absolute top-0 left-0 right-0 h-[2px] ${brandGradient} opacity-60`} />

              <div className="relative z-10 flex gap-5">
                <div className={`flex-shrink-0 w-14 h-14 rounded-2xl ${brandGradient} flex items-center justify-center shadow-lg shadow-[#39bfb0]/20`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>

                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// BRAND SHOWCASE - For new site + brand proposals
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * BrandShowcase - Visual brand identity preview
 * Use for new brand proposals to show the vision
 */
export function BrandShowcase({
  brandName,
  tagline,
  colorPalette = [], // [{ name: 'Primary', hex: '#39bfb0' }]
  typography,
  moodWords = [] // ['Modern', 'Bold', 'Innovative']
}) {
  return (
    <div className={`${liquidGlassBase} p-8 md:p-10 my-10`}>
      {/* Background orbs */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-[#39bfb0]/20 rounded-full blur-3xl" />
      
      <div className="relative z-10">
        <div className="text-center mb-10">
          <span className="text-sm uppercase tracking-widest text-[#39bfb0] mb-2 block">Brand Vision</span>
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-3">{brandName}</h2>
          {tagline && <p className="text-xl text-[var(--text-secondary)] italic">"{tagline}"</p>}
        </div>

        {/* Mood words */}
        {moodWords.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {moodWords.map((word, i) => (
              <span 
                key={i}
                className="px-5 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-medium text-[var(--text-primary)]"
              >
                {word}
              </span>
            ))}
          </div>
        )}

        {/* Color palette */}
        {colorPalette.length > 0 && (
          <div className="mb-10">
            <h3 className="text-center text-sm uppercase tracking-widest text-[var(--text-tertiary)] mb-4">Color Palette</h3>
            <div className="flex justify-center gap-4 flex-wrap">
              {colorPalette.map((color, i) => (
                <div key={i} className="text-center">
                  <div 
                    className="w-16 h-16 md:w-20 md:h-20 rounded-2xl shadow-lg mb-2 border border-white/20"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="text-xs text-[var(--text-secondary)]">{color.name}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{color.hex}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Typography hint */}
        {typography && (
          <div className="text-center">
            <h3 className="text-sm uppercase tracking-widest text-[var(--text-tertiary)] mb-3">Typography</h3>
            <p className="text-lg text-[var(--text-secondary)]">{typography}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION FLOW - For Portal API integration proposals
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * IntegrationFlow - Visual representation of how Portal integrates
 * Shows the flow from their system → Portal → outcomes
 */
export function IntegrationFlow({
  title = "How It Works",
  steps = [] // [{ label: 'Your Website', description: '...' }, ...]
}) {
  return (
    <div className="my-10">
      <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] text-center mb-10">{title}</h2>
      
      <div className="relative">
        {/* Connection line */}
        <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-[#39bfb0]/50 -translate-y-1/2" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <div key={i} className="relative pt-4">
              {/* Step number - outside card so it's not clipped */}
              <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full ${brandGradient} flex items-center justify-center text-white text-sm font-bold shadow-lg z-10`}>
                {i + 1}
              </div>

              <div className={`${liquidGlassBase} ${liquidGlassHover} p-6 pt-8 text-center`}>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{step.label}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{step.description}</p>
              </div>

              {/* Arrow between steps (mobile) */}
              {i < steps.length - 1 && (
                <div className="md:hidden flex justify-center my-4">
                  <ArrowRight className="w-6 h-6 text-[#39bfb0]" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SITE ANALYSIS CARD - Shows findings from site analysis
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * SiteAnalysisCard - Display site analysis findings
 * Use after running site analysis for rebuilds/integrations
 */
export function SiteAnalysisCard({
  url,
  screenshot, // optional URL to screenshot
  scores = {}, // { performance: 45, seo: 62, accessibility: 78 }
  findings = [], // [{ type: 'issue' | 'opportunity', text: '...' }]
  technologies = [] // ['WordPress', 'PHP', 'MySQL']
}) {
  return (
    <div className={`${liquidGlassBase} p-6 md:p-8 my-8`}>
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Screenshot or placeholder */}
        <div className="lg:w-1/3">
          {screenshot ? (
            <img
              src={screenshot}
              alt={`Screenshot of ${url}`}
              className="w-full rounded-2xl border border-white/20 shadow-lg"
              onError={(e) => {
                // Fallback to placeholder if image fails to load
                e.target.style.display = 'none'
                e.target.nextElementSibling?.classList.remove('hidden')
              }}
            />
          ) : null}
          <div className={`w-full aspect-video rounded-2xl bg-gradient-to-br from-white/5 to-white/10 border border-white/20 flex items-center justify-center ${screenshot ? 'hidden' : ''}`}>
            <Globe className="w-12 h-12 text-white/30" />
          </div>
          <div className="mt-3 text-center">
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#39bfb0] hover:underline">
              {url?.replace(/^https?:\/\//, '')}
            </a>
          </div>
        </div>

        {/* Right: Analysis data */}
        <div className="lg:w-2/3 space-y-6">
          {/* Scores */}
          {Object.keys(scores).length > 0 && (
            <div>
              <h3 className="text-sm uppercase tracking-widest text-[var(--text-tertiary)] mb-4">Performance Scores</h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(scores).map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div 
                      className={`text-3xl font-bold ${
                        value >= 80 ? 'text-emerald-400' : 
                        value >= 50 ? 'text-amber-400' : 'text-red-400'
                      }`}
                    >
                      {value}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] capitalize">{key}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technologies */}
          {technologies.length > 0 && (
            <div>
              <h3 className="text-sm uppercase tracking-widest text-[var(--text-tertiary)] mb-3">Current Stack</h3>
              <div className="flex flex-wrap gap-2">
                {technologies.map((tech, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-white/10 text-sm text-[var(--text-secondary)]">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Findings */}
          {findings.length > 0 && (
            <div>
              <h3 className="text-sm uppercase tracking-widest text-[var(--text-tertiary)] mb-3">Key Findings</h3>
              <div className="space-y-2">
                {findings.map((finding, i) => (
                  <div 
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-xl ${
                      finding.type === 'issue' 
                        ? 'bg-red-500/10 border border-red-500/20' 
                        : 'bg-emerald-500/10 border border-emerald-500/20'
                    }`}
                  >
                    {finding.type === 'issue' ? (
                      <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-red-400 text-xs">!</span>
                      </div>
                    ) : (
                      <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    )}
                    <span className="text-sm text-[var(--text-primary)]">{finding.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNAL AI GLASS - Premium Signal AI section
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * SignalAIGlass - Liquid glass version of Signal AI section
 * More premium look, tailored benefits
 */
export function SignalAIGlass({
  title = "Supercharge with Signal AI",
  description,
  capabilities = [], // [{ title: '24/7 Chat', description: '...' }]
  price = "199"
}) {
  return (
    <div className={`${liquidGlassClipped} p-8 md:p-10 my-10`}>
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#39bfb0]/5 via-transparent to-[#39bfb0]/5" />
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-[#39bfb0]/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#39bfb0]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl ${brandGradient} flex items-center justify-center shadow-lg shadow-[#39bfb0]/30`}>
              <SignalAILogo size={32} white className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">{title}</h2>
              <span className={`text-sm ${brandGradientText} font-medium`}>Powered by Signal AI</span>
            </div>
          </div>

          <div className="flex items-baseline gap-1">
            <span className={`text-4xl font-bold ${brandGradientText}`}>${price}</span>
            <span className="text-[var(--text-tertiary)]">/month</span>
          </div>
        </div>

        {description && (
          <p className="text-lg text-[var(--text-secondary)] mb-8 max-w-3xl">
            {description}
          </p>
        )}

        {/* Capabilities grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {capabilities.map((cap, i) => (
            <div 
              key={i}
              className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10"
            >
              <div className="w-10 h-10 rounded-xl bg-[#39bfb0]/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-[#39bfb0]" />
              </div>
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-1">{cap.title}</h4>
                <p className="text-sm text-[var(--text-secondary)]">{cap.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// GLASS PRICING - Premium pricing display
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GlassPricing - Liquid glass pricing section
 * Beautiful, premium pricing display
 */
export function GlassPricing({
  title = "Your Investment",
  tiers = [], // [{ name, price, description, features, highlighted, badge }]
  note
}) {
  return (
    <div className="my-10">
      <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] text-center mb-10">{title}</h2>

      <div className={`grid grid-cols-1 ${tiers.length > 1 ? 'md:grid-cols-2' : ''} ${tiers.length > 2 ? 'lg:grid-cols-3' : ''} gap-6`}>
        {tiers.map((tier, i) => (
          <div key={i} className={`relative ${tier.badge ? 'pt-4' : ''}`}>
            {/* Badge - centered above card */}
            {tier.badge && (
              <div className={`absolute top-0 left-1/2 -translate-x-1/2 px-5 py-1.5 ${brandGradient} rounded-full text-white text-xs font-semibold shadow-lg z-10`}>
                {tier.badge}
              </div>
            )}

            <div 
              className={`
                ${liquidGlassBase} 
                ${tier.highlighted ? 'border-[#39bfb0]/50' : ''} 
                p-8 relative
              `}
            >
              <div className="relative z-10">
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">{tier.name}</h3>
                {tier.description && (
                  <p className="text-sm text-[var(--text-secondary)] mb-6">{tier.description}</p>
                )}

                <div className="flex items-baseline gap-1 mb-6">
                  <span className={`text-4xl font-bold ${tier.highlighted ? brandGradientText : 'text-[var(--text-primary)]'}`}>
                    {tier.price}
                  </span>
                  {tier.period && <span className="text-[var(--text-tertiary)]">/{tier.period}</span>}
                </div>

                <div className="space-y-3">
                  {tier.features?.map((feature, j) => (
                    <div key={j} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-[#39bfb0] flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-[var(--text-secondary)]">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {note && (
        <p className="text-center text-sm text-[var(--text-tertiary)] mt-6">{note}</p>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// GLASS TIMELINE - Premium timeline display
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GlassTimeline - Liquid glass project timeline
 */
export function GlassTimeline({
  title = "Project Timeline",
  phases = [] // [{ title, duration, description, deliverables }]
}) {
  return (
    <div className="my-10">
      <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] text-center mb-10">{title}</h2>

      <div className="relative">
        {/* Vertical line */}
        <div className={`absolute left-6 top-0 bottom-0 w-0.5 ${brandGradient}`} />

        <div className="space-y-6">
          {phases.map((phase, i) => (
            <div key={i} className="relative pl-16">
              {/* Circle marker */}
              <div className={`absolute left-3.5 top-6 w-5 h-5 rounded-full ${brandGradient} border-4 border-[var(--surface-page)]`} />

              <div className={`${liquidGlassBase} ${liquidGlassHover} p-6`}>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className={`text-sm font-semibold ${brandGradientText}`}>Phase {i + 1}</span>
                  <span className="text-[var(--text-tertiary)]">•</span>
                  <span className="text-sm text-[var(--text-secondary)]">{phase.duration}</span>
                </div>

                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{phase.title}</h3>
                
                {phase.description && (
                  <p className="text-sm text-[var(--text-secondary)] mb-4">{phase.description}</p>
                )}

                {phase.deliverables?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {phase.deliverables.map((d, j) => (
                      <span key={j} className="px-3 py-1 rounded-full bg-white/10 text-xs text-[var(--text-secondary)]">
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// GLASS CTA - Premium call to action
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GlassCTA - Liquid glass call to action
 */
export function GlassCTA({
  title = "Ready to Start?",
  subtitle,
  urgency
}) {
  return (
    <div className={`${liquidGlassClipped} p-8 md:p-12 my-10 text-center`}>
      {/* Gradient orbs */}
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#39bfb0]/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#39bfb0]/20 rounded-full blur-3xl" />

      <div className="relative z-10">
        <h2 className={`text-3xl md:text-4xl font-bold ${brandGradientText} mb-4`}>{title}</h2>
        
        {subtitle && (
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-6">
            {subtitle}
          </p>
        )}

        {urgency && (
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">{urgency}</span>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * GlassLegal - Premium legal / ownership points section
 */
export function GlassLegal({
  title = "Ownership & Editing Rights",
  points = []
}) {
  return (
    <div className={`${liquidGlassBase} p-8 md:p-10 my-10`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
          <Shield className="w-6 h-6 text-[#39bfb0]" />
        </div>
        <div>
          <span className="text-sm uppercase tracking-widest text-[#39bfb0] block">Included</span>
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">{title}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {points.map((point, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10"
          >
            <CheckCircle className="w-5 h-5 text-[#39bfb0] flex-shrink-0 mt-0.5" />
            <span className="text-sm leading-relaxed text-[var(--text-secondary)]">{point}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SITEMAP PLAN - What we're actually building
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * SitemapPlan - The deliverables section that shows exactly what pages we're building.
 * This is the "here's what you get" section that closes deals.
 *
 * pages: [{ name, purpose, status, features[] }]
 *   status: "rebuild" | "new" | "optimize" | "migrate"
 */
export function SitemapPlan({
  title = "Your New Website",
  subtitle,
  pages = [],
  totalPages,
}) {
  const statusConfig = {
    rebuild: { label: 'Rebuild', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    new:     { label: 'New Page', bg: 'bg-[#39bfb0]/10', text: 'text-[#39bfb0]', border: 'border-[#39bfb0]/20' },
    optimize:{ label: 'Optimize', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    migrate: { label: 'Migrate', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  }

  const pageCount = totalPages || pages.length

  return (
    <div className={`${liquidGlassBase} p-8 md:p-10 my-10`}>
      {/* Subtle glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#39bfb0]/10 rounded-full blur-3xl" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-[#39bfb0]/20 border border-[#39bfb0]/30 flex items-center justify-center">
            <Layout className="w-6 h-6 text-[#39bfb0]" />
          </div>
          <div>
            <span className="text-sm uppercase tracking-widest text-[#39bfb0] block">Deliverables</span>
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">{title}</h2>
          </div>
        </div>
        {subtitle && (
          <p className="text-[var(--text-secondary)] mb-6 ml-15">{subtitle}</p>
        )}

        {/* Page count summary */}
        <div className="flex items-center gap-4 mb-8 p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-3xl font-bold text-[#39bfb0]">{pageCount}</div>
          <div>
            <div className="font-medium text-[var(--text-primary)]">Pages & Experiences</div>
            <div className="text-sm text-[var(--text-secondary)]">Custom-built for your business</div>
          </div>
        </div>

        {/* Page cards */}
        <div className="space-y-3">
          {pages.map((page, i) => {
            const status = statusConfig[page.status] || statusConfig.new
            return (
              <div
                key={i}
                className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className="font-semibold text-[var(--text-primary)] text-lg">{page.name}</h3>
                  <span className={`flex-shrink-0 px-3 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text} border ${status.border}`}>
                    {status.label}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mb-3">{page.purpose}</p>
                {page.features?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {page.features.map((f, j) => (
                      <span key={j} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 text-xs text-[var(--text-tertiary)]">
                        <CheckCircle className="w-3 h-3 text-[#39bfb0]" />
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENCY PROFILE - Trust builder before the pricing ask
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * AgencyProfile - "Who we are" section auto-populated from org data.
 * Placed after deliverables and analysis, before timeline/pricing.
 *
 * All props are auto-injected from the org record by ProposalBlockRegistry.
 * The AI just places { "type": "AgencyProfile" } in the sections array.
 */
export function AgencyProfile({
  name,
  logo,
  tagline,
  description,
  founded,
  teamSize,
  projectsCompleted,
  website,
  portfolioItems = [], // [{ title, url, image }]
  highlights = [],     // ["150+ Projects", "5-Star Google Rating", "Next.js Experts"]
}) {
  // Don't render if we have no meaningful data
  if (!name && !description && highlights.length === 0) return null

  const statItems = [
    founded && { value: founded, label: 'Founded' },
    teamSize && { value: teamSize, label: 'Team Members' },
    projectsCompleted && { value: projectsCompleted, label: 'Projects Delivered' },
  ].filter(Boolean)

  return (
    <div className={`${liquidGlassBase} p-8 md:p-10 my-10`}>
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#39bfb0]/10 rounded-full blur-3xl" />

      <div className="relative z-10">
        {/* Agency identity */}
        <div className="flex items-center gap-4 mb-6">
          {logo && (
            <img
              src={logo}
              alt={name}
              className="w-14 h-14 rounded-2xl object-contain border border-white/20"
              onError={(e) => { e.target.style.display = 'none' }}
            />
          )}
          <div>
            {name && (
              <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">{name}</h2>
            )}
            {tagline && (
              <p className="text-[#39bfb0] font-medium">{tagline}</p>
            )}
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="text-[var(--text-secondary)] leading-relaxed mb-8 max-w-3xl">
            {description}
          </p>
        )}

        {/* Stats row */}
        {statItems.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {statItems.map((stat, i) => (
              <div key={i} className="text-center p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-2xl font-bold text-[#39bfb0]">{stat.value}</div>
                <div className="text-xs text-[var(--text-tertiary)]">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Highlight badges */}
        {highlights.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {highlights.map((h, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-[var(--text-secondary)]"
              >
                <CheckCircle className="w-3.5 h-3.5 text-[#39bfb0]" />
                {h}
              </span>
            ))}
          </div>
        )}

        {/* Portfolio preview */}
        {portfolioItems.length > 0 && (
          <div>
            <h3 className="text-sm uppercase tracking-widest text-[var(--text-tertiary)] mb-4">Recent Work</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {portfolioItems.slice(0, 3).map((item, i) => (
                <a
                  key={i}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-2xl overflow-hidden border border-white/10 hover:border-[#39bfb0]/30 transition-colors"
                >
                  {item.image ? (
                    <img src={item.image} alt={item.title} className="w-full aspect-video object-cover" />
                  ) : (
                    <div className="w-full aspect-video bg-white/5 flex items-center justify-center">
                      <Globe className="w-8 h-8 text-white/20" />
                    </div>
                  )}
                  <div className="p-3 bg-white/5">
                    <div className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[#39bfb0] transition-colors">
                      {item.title}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Website link */}
        {website && (
          <div className="mt-6 text-center">
            <a
              href={website.startsWith('http') ? website : `https://${website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-[#39bfb0] hover:underline"
            >
              {website.replace(/^https?:\/\//, '')}
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export default {
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
}
