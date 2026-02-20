/**
 * Liquid Glass MDX Components
 * 
 * Apple-inspired liquid glass aesthetic with Uptrade brand gradients
 * Green (#4bbf39) → Teal (#39bfb0) gradients throughout
 */

import { useState } from 'react'
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

const brandGradient = 'bg-gradient-to-r from-[#4bbf39] to-[#39bfb0]'
const brandGradientText = 'bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] bg-clip-text text-transparent'

// ═══════════════════════════════════════════════════════════════════════════════
// GLASS HERO - Premium proposal opener
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GlassHero - Stunning liquid glass hero section
 * Use as the opening visual for premium proposals
 */
export function GlassHero({ 
  title, 
  subtitle, 
  clientName,
  proposalType, // 'portal-integration' | 'new-brand' | 'app-development' | 'rebuild'
  stats = []
}) {
  const typeLabels = {
    'portal-integration': 'Portal API Integration',
    'new-brand': 'New Site & Brand',
    'app-development': 'App Development',
    'rebuild': 'Website Rebuild'
  }

  const typeIcons = {
    'portal-integration': Plug,
    'new-brand': Palette,
    'app-development': Smartphone,
    'rebuild': Layers
  }

  const TypeIcon = typeIcons[proposalType] || Sparkles

  return (
    <div className={`${liquidGlassBase} p-8 md:p-12 mb-10`}>
      {/* Animated gradient orbs */}
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-gradient-to-br from-[#4bbf39]/30 to-[#39bfb0]/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-[#39bfb0]/20 to-[#4bbf39]/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="relative z-10">
        {/* Type badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
          <TypeIcon className="w-4 h-4 text-[#4bbf39]" />
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

const portalModules = {
  crm: { icon: Users, label: 'CRM & Pipelines', color: '#4bbf39' },
  commerce: { icon: ShoppingCart, label: 'Commerce', color: '#39bfb0' },
  forms: { icon: FileText, label: 'Forms & Intake', color: '#4bbf39' },
  analytics: { icon: BarChart3, label: 'Analytics', color: '#39bfb0' },
  seo: { icon: Search, label: 'SEO Tracking', color: '#4bbf39' },
  engage: { icon: Bell, label: 'Engage', color: '#39bfb0' },
  outreach: { icon: Mail, label: 'Outreach', color: '#4bbf39' },
  sync: { icon: Calendar, label: 'Sync', color: '#39bfb0' },
  signal: { icon: Bot, label: 'Signal AI', color: '#4bbf39' }
}

/**
 * PortalModulesGrid - Shows which Portal modules benefit their business
 * Highlight specific modules with descriptions of how they help
 */
export function PortalModulesGrid({ 
  title = "Your Sonor",
  subtitle,
  modules = [] // [{ id: 'crm', benefit: 'Track all leads...' }, ...]
}) {
  return (
    <div className="my-10">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">{title}</h2>
        {subtitle && <p className="text-[var(--text-secondary)]">{subtitle}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((mod, i) => {
          const moduleInfo = portalModules[mod.id] || { icon: Sparkles, label: mod.id, color: '#4bbf39' }
          const Icon = moduleInfo.icon

          return (
            <div 
              key={i}
              className={`${liquidGlassBase} ${liquidGlassHover} p-6 group cursor-default`}
            >
              {/* Glow effect on hover */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"
                style={{ 
                  background: `radial-gradient(circle at center, ${moduleInfo.color}15 0%, transparent 70%)`
                }}
              />

              <div className="relative z-10">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: `linear-gradient(135deg, ${moduleInfo.color}20, ${moduleInfo.color}10)` }}
                >
                  <Icon className="w-6 h-6" style={{ color: moduleInfo.color }} />
                </div>

                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                  {moduleInfo.label}
                </h3>

                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {mod.benefit}
                </p>
              </div>
            </div>
          )
        })}
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
          const isEven = i % 2 === 0

          return (
            <div 
              key={i}
              className={`${liquidGlassBase} ${liquidGlassHover} p-8 group`}
            >
              {/* Gradient accent */}
              <div 
                className={`absolute top-0 ${isEven ? 'left-0' : 'right-0'} w-1/2 h-1 rounded-full ${brandGradient}`}
              />

              <div className="relative z-10 flex gap-5">
                <div className={`flex-shrink-0 w-14 h-14 rounded-2xl ${brandGradient} flex items-center justify-center shadow-lg shadow-[#4bbf39]/20`}>
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
  colorPalette = [], // [{ name: 'Primary', hex: '#4bbf39' }]
  typography,
  moodWords = [] // ['Modern', 'Bold', 'Innovative']
}) {
  return (
    <div className={`${liquidGlassBase} p-8 md:p-10 my-10`}>
      {/* Background orbs */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-[#4bbf39]/20 to-[#39bfb0]/20 rounded-full blur-3xl" />
      
      <div className="relative z-10">
        <div className="text-center mb-10">
          <span className="text-sm uppercase tracking-widest text-[#4bbf39] mb-2 block">Brand Vision</span>
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
        <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-[#4bbf39]/50 via-[#39bfb0]/50 to-[#4bbf39]/50 -translate-y-1/2" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              <div className={`${liquidGlassBase} ${liquidGlassHover} p-6 text-center`}>
                {/* Step number */}
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full ${brandGradient} flex items-center justify-center text-white text-sm font-bold shadow-lg`}>
                  {i + 1}
                </div>

                <div className="pt-4">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{step.label}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{step.description}</p>
                </div>
              </div>

              {/* Arrow between steps (mobile) */}
              {i < steps.length - 1 && (
                <div className="md:hidden flex justify-center my-4">
                  <ArrowRight className="w-6 h-6 text-[#4bbf39]" />
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
            />
          ) : (
            <div className="w-full aspect-video rounded-2xl bg-gradient-to-br from-white/5 to-white/10 border border-white/20 flex items-center justify-center">
              <Globe className="w-12 h-12 text-white/30" />
            </div>
          )}
          <div className="mt-3 text-center">
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#4bbf39] hover:underline">
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
    <div className={`${liquidGlassBase} p-8 md:p-10 my-10 relative overflow-hidden`}>
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#4bbf39]/5 via-transparent to-[#39bfb0]/5" />
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-[#4bbf39]/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#39bfb0]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl ${brandGradient} flex items-center justify-center shadow-lg shadow-[#4bbf39]/30`}>
              <Bot className="w-8 h-8 text-white" />
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4bbf39]/20 to-[#39bfb0]/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-[#4bbf39]" />
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
          <div 
            key={i}
            className={`
              ${liquidGlassBase} 
              ${tier.highlighted ? 'border-[#4bbf39]/50 scale-105' : ''} 
              p-8 relative
            `}
          >
            {/* Highlighted gradient top */}
            {tier.highlighted && (
              <div className={`absolute top-0 left-0 right-0 h-1 ${brandGradient} rounded-t-3xl`} />
            )}

            {/* Badge */}
            {tier.badge && (
              <div className={`absolute -top-3 right-6 px-4 py-1 ${brandGradient} rounded-full text-white text-xs font-semibold shadow-lg`}>
                {tier.badge}
              </div>
            )}

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
                    <CheckCircle className="w-5 h-5 text-[#4bbf39] flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[var(--text-secondary)]">{feature}</span>
                  </div>
                ))}
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
    <div className={`${liquidGlassBase} p-8 md:p-12 my-10 text-center relative overflow-hidden`}>
      {/* Gradient orbs */}
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#4bbf39]/20 rounded-full blur-3xl" />
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
  GlassCTA
}
