/**
 * Proposal Type Definitions
 * 
 * Each proposal type has:
 * - id: Unique identifier
 * - label: Human-readable name
 * - description: Short description for AI/UI
 * - icon: Lucide icon name
 * - sections: Array of section types to include
 * - suggestedComponents: Components commonly used
 * - aiPromptContext: Additional context for AI generation
 */

export const PROPOSAL_TYPES = {
  brand_website: {
    id: 'brand_website',
    label: 'New Brand + Website',
    shortLabel: 'New Website',
    description: 'Complete brand creation with custom website for new businesses or full rebrands',
    icon: 'Sparkles',
    color: 'purple',
    sections: [
      'hero',
      'executive_summary',
      'brand_discovery',
      'visual_identity',
      'website_build',
      'content_strategy',
      'seo_foundations',
      'timeline',
      'investment',
      'next_steps'
    ],
    suggestedComponents: [
      'BrandDiscoverySection',
      'VisualIdentityDeliverables',
      'WebsiteFeatureGrid',
      'ContentPackage',
      'SEOFoundations',
      'PricingTiers',
      'ProjectTimeline'
    ],
    aiPromptContext: `This is a full brand creation + website build. The client is either starting fresh or doing a complete rebrand. Include:
- Brand discovery and positioning workshop
- Naming assistance (if needed)
- Logo design with variations
- Brand guidelines/style guide
- Color palette, typography, visual system
- Custom website design and development
- Initial content writing and on-page SEO
- Technical SEO foundations baked in`
  },

  website_rebuild: {
    id: 'website_rebuild',
    label: 'Website Overhaul',
    shortLabel: 'Site Rebuild',
    description: 'Full redesign and rebuild for existing brands with outdated or underperforming sites',
    icon: 'RefreshCw',
    color: 'blue',
    sections: [
      'hero',
      'executive_summary',
      'current_state_audit',
      'critical_issues',
      'proposed_solution',
      'website_architecture',
      'performance_goals',
      'timeline',
      'investment',
      'next_steps'
    ],
    suggestedComponents: [
      'CurrentStateAudit',
      'CriticalIssues',
      'BeforeAfterComparison',
      'WebsiteArchitecture',
      'PerformanceGoals',
      'TechStackOverview',
      'PricingTiers',
      'ProjectTimeline'
    ],
    aiPromptContext: `This is a website overhaul for an existing brand. The client has a site but it's outdated, slow, or not converting. Include:
- Audit of current site issues (performance, UX, SEO)
- Competitive analysis positioning
- Full redesign in modern stack (Next.js/Vite)
- Performance and Lighthouse score improvements
- Structured data and technical SEO cleanup
- Information architecture optimization
- Content tightening and conversion focus
- Migration plan from old to new`
  },

  web_app: {
    id: 'web_app',
    label: 'Application Development',
    shortLabel: 'App Dev',
    description: 'Custom portals, client dashboards, SaaS apps, and complex web applications',
    icon: 'LayoutDashboard',
    color: 'indigo',
    sections: [
      'hero',
      'executive_summary',
      'requirements_overview',
      'user_flows',
      'feature_breakdown',
      'tech_stack',
      'security',
      'timeline',
      'investment',
      'next_steps'
    ],
    suggestedComponents: [
      'RequirementsMatrix',
      'UserFlowDiagrams',
      'FeatureBreakdown',
      'TechStackOverview',
      'SecurityCompliance',
      'IntegrationsList',
      'DevelopmentPhases',
      'PricingTiers'
    ],
    aiPromptContext: `This is a custom web application or portal build. Include:
- Requirements and user needs overview
- User types and permission levels
- Feature breakdown by module:
  - Admin and client logins
  - Dashboard and reporting
  - Proposals, billing, messaging
  - Document management
  - CRM integration
  - Payment processing
  - AI-powered features
- Technology stack recommendations
- Security and compliance considerations
- Development phases and milestones
- Often sold as phase 2 after marketing site proves itself`
  },

  ai_automation: {
    id: 'ai_automation',
    label: 'AI & Automations',
    shortLabel: 'AI & Auto',
    description: 'Custom AI systems, automation workflows, intelligent outreach, and data pipelines',
    icon: 'Bot',
    color: 'violet',
    sections: [
      'hero',
      'executive_summary',
      'problem_statement',
      'system_architecture',
      'ai_components',
      'automation_workflows',
      'integration_map',
      'data_pipeline',
      'security_compliance',
      'timeline',
      'investment',
      'next_steps'
    ],
    suggestedComponents: [
      'SystemArchitectureDiagram',
      'AIComponentBreakdown',
      'AutomationWorkflowMap',
      'IntegrationsList',
      'DataFlowDiagram',
      'TechStackOverview',
      'DevelopmentPhases',
      'PricingTiers'
    ],
    aiPromptContext: `This is a custom AI & automation system proposal. The client needs intelligent automation that replaces or augments manual workflows. Include:
- System architecture overview (what components exist and how they connect)
- AI engine: LLM selection (GPT-4o, Claude, etc.), prompt engineering, context management
- Automation workflows: step-by-step sequences with triggers, conditions, and actions
- Data ingestion: scraping, API polling, webhooks, file uploads
- Outreach infrastructure (if applicable): multi-domain rotation, warmup, deliverability
- Integration map: CRM, email platforms, databases, third-party APIs
- Monitoring & observability: error handling, rate limiting, alerting, dashboards
- Security: API key management, data handling, compliance
- Phased rollout with measurable milestones
- Pricing broken down by system component`
  }
}

// ============================================
// AI PROMPT TEMPLATES
// ============================================

/**
 * Base system prompt for all proposal generation
 */
export const AI_SYSTEM_PROMPT = `You are an expert proposal writer for Upforge (upforge.io), a premium digital agency specializing in web design, development, AI & automation, and custom applications for ambitious businesses across industries.

Your proposals are:
- Professional yet conversational
- Data-driven with specific metrics when available
- Focused on outcomes and ROI
- Clear about what's included AND what's not
- Legally binding documents that protect both parties

Writing Style:
- Use "we" for Upforge
- Address the client directly as "you" or by name
- Be specific, not vague ("increase organic traffic by 40%" not "improve your online presence")
- Include concrete deliverables with clear descriptions
- Break down complex work into understandable phases

Structure every proposal with:
1. Executive Summary (hook them in 2 paragraphs)
2. Problem Statement (show you understand their pain)
3. Proposed Solution (the vision and transformation)
4. Scope & Deliverables (detailed breakdown of what they get)
5. Timeline (realistic phases with milestones)
6. Investment (fixed price + optional add-ons)
7. Terms & Conditions (legal protections)
8. Next Steps (clear CTA to accept)

Always include pricing as a FIXED amount (not hourly estimates).
Always include add-ons as optional enhancements.
Always include clear exclusions to prevent scope creep.`

/**
 * Generate the full AI prompt for a proposal
 * @param {string} typeId - The proposal type ID
 * @param {object} clientData - Client information
 * @param {object} projectData - Project details
 * @returns {string} Complete prompt for AI generation
 */
export function generateProposalPrompt(typeId, clientData, projectData) {
  const type = PROPOSAL_TYPES[typeId]
  if (!type) throw new Error(`Unknown proposal type: ${typeId}`)

  const template = AI_PROMPT_TEMPLATES[typeId]
  if (!template) throw new Error(`No template for type: ${typeId}`)

  // Build the user prompt
  const userPrompt = `
## Proposal Request

**Type:** ${type.label}
**Client:** ${clientData.name}${clientData.company ? ` (${clientData.company})` : ''}
**Industry:** ${clientData.industry || 'Not specified'}

### Client Context
${projectData.context || 'No additional context provided.'}

### Goals
${projectData.goals || 'Not specified'}

### Challenges/Pain Points
${projectData.challenges || 'Not specified'}

### Budget Guidance
${projectData.budget || 'To be determined based on scope'}

### Timeline Preference
${projectData.timeline || 'Standard timeline'}

### Additional Notes
${projectData.notes || 'None'}

${projectData.auditData ? `
### Audit Results (Include in AuditCallout)
- Performance Score: ${projectData.auditData.performance}/100
- SEO Score: ${projectData.auditData.seo}/100
- Accessibility Score: ${projectData.auditData.accessibility}/100
- Best Practices: ${projectData.auditData.bestPractices}/100
- Key Issues: ${projectData.auditData.issues?.join(', ') || 'None flagged'}
` : ''}

---

## Type-Specific Instructions

${type.aiPromptContext}

---

## Template Structure

${template}

---

## Output Format

Generate the proposal content as structured JSON matching this schema:
\`\`\`json
{
  "title": "Proposal title",
  "subtitle": "One-line value proposition",
  "sections": [
    {
      "type": "executive_summary",
      "title": "Section title",
      "content": "Section content with markdown formatting"
    }
  ],
  "deliverables": [
    {
      "name": "Deliverable name",
      "description": "What it is",
      "why": "Why it matters",
      "includes": ["Item 1", "Item 2"]
    }
  ],
  "phases": [
    {
      "name": "Phase name",
      "duration": "X weeks",
      "milestones": ["Milestone 1", "Milestone 2"]
    }
  ],
  "investment": {
    "total": 15000,
    "breakdown": [
      { "item": "Item name", "amount": 5000 }
    ]
  },
  "addOns": [
    {
      "name": "Add-on name",
      "price": 2500,
      "description": "What it adds"
    }
  ],
  "exclusions": ["What's NOT included"],
  "paymentSchedule": [
    { "milestone": "Upon signing", "percent": 50, "amount": 7500 }
  ],
  "validUntil": "YYYY-MM-DD",
  "estimatedStart": "X weeks from acceptance"
}
\`\`\`
`

  return {
    system: AI_SYSTEM_PROMPT,
    user: userPrompt
  }
}

/**
 * Type-specific prompt templates with section guidance
 */
export const AI_PROMPT_TEMPLATES = {
  brand_website: `
### Brand + Website Proposal Structure

**Executive Summary:**
Hook them with the transformation - from invisible/inconsistent brand to market leader with cohesive identity and high-converting website.

**Problem Statement:**
- Brand confusion or lack of recognition
- Inconsistent visual identity across touchpoints
- No website or embarrassingly outdated one
- Losing deals because they look less credible than competitors

**Brand Discovery Section:**
Detail the brand discovery workshop process:
- Stakeholder interviews
- Competitive analysis
- Brand personality/archetype exercise
- Positioning statement development

**Visual Identity Deliverables:**
- Primary logo + variations (stacked, horizontal, icon-only)
- Color palette with hex codes and usage guidelines
- Typography system (headings, body, accents)
- Brand guidelines PDF (15-20 pages)
- Social media templates
- Business card design
- Email signature template

**Website Build Section:**
- Custom design (no templates)
- Responsive across all devices
- Core pages: Home, About, Services, Contact
- Blog/Resource section setup
- On-page SEO foundations
- Speed optimization
- Analytics integration

**Recommended Pricing:**
- Small brand + 5-page site: $8,000-12,000
- Full brand + 8-10 page site: $15,000-25,000
- Enterprise brand + custom site: $30,000+

**Typical Add-ons:**
- Additional logo variations: $500-1,000
- Social media kit expansion: $1,500
- Video brand intro: $3,000-5,000
- Photography session: $2,000-4,000
`,

  website_rebuild: `
### Website Overhaul Proposal Structure

**Executive Summary:**
Lead with audit findings - their current site is costing them money. Position the rebuild as an investment with measurable ROI.

**REQUIRED: Audit Callout Section**
If audit data is provided, create an AuditCallout comparing:
- Current Performance score → Target (95+)
- Current SEO score → Target (100)
- Current accessibility → Target (95+)
- Load time reduction targets

**Critical Issues Section:**
List 5-8 specific problems from the audit:
- Slow load times (X seconds)
- Mobile usability issues
- Missing structured data
- Broken links or 404s
- Outdated content
- Security vulnerabilities
- Poor Core Web Vitals

**Proposed Solution:**
Frame as a complete transformation:
- Modern tech stack (Next.js/Vite, not WordPress)
- Performance-first architecture
- Conversion-focused design
- SEO cleanup and foundations

**Website Architecture Section:**
- Sitemap and page structure
- User flow optimization
- Content hierarchy recommendations
- CTA placement strategy

**Performance Goals:**
Set measurable targets:
- Lighthouse Performance: 95+
- Time to Interactive: <2s
- First Contentful Paint: <1s
- Core Web Vitals: All green

**Recommended Pricing:**
- Small site (5-7 pages) rebuild: $8,000-12,000
- Medium site (10-15 pages) rebuild: $15,000-25,000
- Large/complex rebuild: $25,000-50,000

**Typical Add-ons:**
- Content rewriting: $150-300/page
- Professional photography: $2,000-4,000
- SEO retainer (ongoing): $1,500-3,000/month
- Maintenance package: $300-500/month
`,

  ai_automation: `
### AI & Automations Proposal Structure

**Executive Summary:**
Position as a force multiplier — this system will do the work of a full team at a fraction of the cost, without the bottlenecks of manual processes.

**Problem Statement:**
Describe the specific operational pain:
- Manual, repetitive tasks consuming team time
- Inconsistent outreach or follow-up
- Data trapped in silos
- Slow response times losing deals
- No visibility into what's working

**System Architecture Overview:**
Present the "brain + body" framing:
- The Brain: AI/LLM layer (GPT-4o or Claude) — intent understanding, content generation, decision routing
- The Body: Automation layer (n8n, Make, or custom Node.js) — triggers, sequences, integrations
- The Memory: Data layer (Postgres/Supabase) — CRM, logs, state management
- The Nervous System: Integration layer — APIs connecting everything

**AI Component Breakdown:**
For each AI-powered feature:
- Component name
- What it does
- Input → Output
- LLM used and why
- Prompt strategy overview

Common components:
- Personalized message drafting
- Lead scoring and prioritization
- Sentiment analysis and reply classification
- Context-aware follow-up sequencing
- Document or report generation
- Data extraction and enrichment

**Automation Workflows:**
For each workflow, describe:
- Trigger (what starts it)
- Steps (numbered, clear actions)
- Conditions (if/then logic)
- Output (what gets created or sent)
- Error handling

**Integration Map:**
List every external system connected:
- CRM (HubSpot, Salesforce, Supabase)
- Email platform (Gmail, Outlook, Sendgrid, Instantly)
- Data sources (APIs, scrapers, webhooks)
- Notification channels (Slack, SMS)
- Storage (Google Drive, S3, Supabase Storage)

**Outreach Infrastructure (if applicable):**
- Domain pool strategy (primary vs. secondary domains)
- Warm-up schedule and ramp timeline
- Sending limits per inbox/domain
- Blacklist monitoring and domain health
- Unibox / reply centralization setup

**Data Pipeline (if applicable):**
- Data sources (FAA registry, LinkedIn, news, internal CRM)
- Scraping strategy (Scrapy, Bright Data, Playwright)
- Enrichment steps (normalize, deduplicate, score)
- Storage schema overview
- Trigger event detection logic

**Security & Compliance:**
- API key vault and rotation
- PII handling and data residency
- Rate limiting and abuse prevention
- Audit logging
- Relevant compliance (CAN-SPAM, GDPR, CCPA)

**Development Phases:**
- Phase 1 — Discovery & Architecture (1-2 weeks)
  - Requirements finalization, workflow mapping, API audit
- Phase 2 — Core Infrastructure (2-4 weeks)
  - Database schema, base integrations, auth layer
- Phase 3 — AI & Automation Build (3-6 weeks)
  - LLM integrations, workflow automation, testing
- Phase 4 — Outreach / Data Layer (2-4 weeks, if applicable)
  - Domain setup, scraping pipeline, sequencing engine
- Phase 5 — Testing, Hardening & Launch (1-2 weeks)
  - QA, monitoring setup, team training

**Recommended Pricing:**
- Simple automation (1-3 workflows): $5,000-12,000
- Mid-complexity system (4-8 workflows + AI): $15,000-30,000
- Full AI infrastructure (outreach + data + AI): $35,000-75,000
- Enterprise custom: $75,000+

**Typical Add-ons:**
- Additional workflow automations: $1,500-4,000 each
- Custom dashboard / reporting: $3,000-8,000
- Ongoing monitoring & iteration retainer: $1,500-4,000/month
- Staff training and runbook: $2,000-4,000
- Data enrichment API subscriptions: pass-through
`,

  web_app: `
### Application Development Proposal Structure

**Executive Summary:**
Position as a competitive advantage — custom software that solves their specific problems, not a one-size-fits-all SaaS.

**Requirements Overview:**
- Business problem being solved
- Current workflow/pain points
- User types and needs
- Integration requirements
- Scale considerations

**User Flows Section:**
For each user type:
- Primary actions
- Key screens
- Permissions/access levels
- Mobile requirements

**Feature Breakdown:**
By module, detail:
- Feature name
- What it does
- Why it matters
- Technical complexity (for pricing)

Common modules:
- Authentication & user management
- Dashboard & reporting
- Data management (CRUD)
- Communication/messaging
- File management
- Integrations (payment, email, etc.)
- AI features

**Tech Stack Recommendations:**
- Frontend: React/Next.js/Vite
- Backend: Node.js/NestJS
- Database: Postgres/Supabase
- Storage: S3/Supabase Storage
- Hosting: Vercel/Railway
- Integrations: List relevant APIs

**Security & Compliance:**
- Authentication method
- Data encryption
- Access controls
- Backup strategy
- Compliance requirements (HIPAA, etc.)

**Development Phases:**
- Discovery & Planning
- Design & Prototyping
- Core Development
- Testing & QA
- Launch & Training

**Recommended Pricing:**
- Simple portal (5-10 features): $15,000-25,000
- Medium complexity: $25,000-50,000
- Enterprise app: $50,000-150,000+

**Typical Add-ons:**
- Additional user roles: $1,500-3,000
- Advanced reporting: $3,000-5,000
- AI features: $5,000-15,000
- Mobile app: $15,000-30,000
- Ongoing maintenance: $500-2,000/month
`
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Get proposal type by ID
export function getProposalType(id) {
  return PROPOSAL_TYPES[id] || null
}

// Get all proposal types as array
export function getProposalTypesList() {
  return Object.values(PROPOSAL_TYPES)
}

// Get icon component for a proposal type
export function getProposalTypeIcon(id) {
  const icons = {
    brand_website: 'Sparkles',
    website_rebuild: 'RefreshCw',
    web_app: 'LayoutDashboard',
    ai_automation: 'Bot'
  }
  return icons[id] || 'FileText'
}

// Get color classes for a proposal type
export function getProposalTypeColors(id) {
  const colors = {
    purple: {
      bg: 'bg-purple-500',
      bgLight: 'bg-purple-50',
      text: 'text-purple-600',
      border: 'border-purple-200',
      gradient: 'from-purple-500 to-violet-600'
    },
    blue: {
      bg: 'bg-blue-500',
      bgLight: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-200',
      gradient: 'from-blue-500 to-cyan-600'
    },
    green: {
      bg: 'bg-green-500',
      bgLight: 'bg-green-50',
      text: 'text-green-600',
      border: 'border-green-200',
      gradient: 'from-green-500 to-emerald-600'
    },
    emerald: {
      bg: 'bg-emerald-500',
      bgLight: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-emerald-200',
      gradient: 'from-emerald-500 to-teal-600'
    },
    orange: {
      bg: 'bg-orange-500',
      bgLight: 'bg-orange-50',
      text: 'text-orange-600',
      border: 'border-orange-200',
      gradient: 'from-orange-500 to-amber-600'
    },
    pink: {
      bg: 'bg-pink-500',
      bgLight: 'bg-pink-50',
      text: 'text-pink-600',
      border: 'border-pink-200',
      gradient: 'from-pink-500 to-rose-600'
    },
    indigo: {
      bg: 'bg-indigo-500',
      bgLight: 'bg-indigo-50',
      text: 'text-indigo-600',
      border: 'border-indigo-200',
      gradient: 'from-indigo-500 to-purple-600'
    },
    cyan: {
      bg: 'bg-cyan-500',
      bgLight: 'bg-cyan-50',
      text: 'text-cyan-600',
      border: 'border-cyan-200',
      gradient: 'from-cyan-500 to-blue-600'
    },
    violet: {
      bg: 'bg-violet-500',
      bgLight: 'bg-violet-50',
      text: 'text-violet-600',
      border: 'border-violet-200',
      gradient: 'from-violet-500 to-fuchsia-600'
    }
  }
  
  const type = PROPOSAL_TYPES[id]
  return type ? colors[type.color] : colors.blue
}

export default PROPOSAL_TYPES
