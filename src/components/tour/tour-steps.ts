/**
 * Tour step definitions for every toureable module.
 *
 * Each module has a complete walkthrough of 4-7 steps covering
 * the key features a new user needs to know about.
 *
 * The `target` field maps to `data-tour="target"` attributes
 * placed on actual DOM elements within each module.
 *
 * Naming convention: `{module}-{feature}` e.g. "seo-dashboard", "crm-pipeline"
 */

import type { TourStep } from './TourOverlay'

export interface ModuleTour {
  /** Route-level module key matching sidebar/routing */
  module: string
  /** Human-readable module name */
  name: string
  /** Route path for this module */
  path: string
  /** Ordered tour steps */
  steps: TourStep[]
}

export const MODULE_TOURS: Record<string, ModuleTour> = {
  seo: {
    module: 'seo',
    name: 'SEO',
    path: '/seo',
    steps: [
      {
        target: 'seo-overview',
        title: 'Your SEO Command Center',
        content: 'This is your SEO dashboard. Every page on your site is tracked here with real-time visibility scores, indexing status, and optimization suggestions powered by Signal AI.',
        placement: 'bottom',
      },
      {
        target: 'seo-pages-table',
        title: 'Page-by-Page Intelligence',
        content: 'Every indexed page shows its current title, meta description, word count, and optimization score. Click any row to edit metadata, schemas, and FAQs directly — changes push to your live site instantly.',
        placement: 'bottom',
      },
      {
        target: 'seo-schemas',
        title: 'Structured Data & Schemas',
        content: 'Sonor manages your JSON-LD schemas automatically. LocalBusiness, FAQ, Product, Service — whatever your business needs. These are injected at render time through site-kit, no code changes required.',
        placement: 'right',
      },
      {
        target: 'seo-keywords',
        title: 'Keyword Tracking',
        content: 'Keywords from Google Search Console flow in automatically. See your rankings, impressions, and click-through rates. Signal AI identifies opportunities you\'re missing and pages that could rank higher.',
        placement: 'bottom',
      },
      {
        target: 'seo-internal-links',
        title: 'Internal Link Map',
        content: 'Visualize how your pages connect to each other. Sonor detects orphaned pages (no inbound links) and suggests internal linking strategies to strengthen your site architecture.',
        placement: 'bottom',
      },
      {
        target: 'seo-redirects',
        title: 'Redirect Manager',
        content: 'Create and manage 301/302 redirects from here. They\'re applied at the edge through site-kit\'s middleware — instant, no deploy needed. Essential when restructuring URLs or fixing broken links.',
        placement: 'left',
      },
    ],
  },

  analytics: {
    module: 'analytics',
    name: 'Analytics',
    path: '/analytics',
    steps: [
      {
        target: 'analytics-overview',
        title: 'Real-Time Analytics Dashboard',
        content: 'Your analytics are powered by site-kit\'s first-party tracking — no third-party cookies, no ad blockers to dodge. Page views, sessions, scroll depth, and web vitals are all captured automatically.',
        placement: 'bottom',
      },
      {
        target: 'analytics-traffic',
        title: 'Traffic & Sources',
        content: 'See where your visitors come from — organic search, direct, referral, social. Drill into any source to see which pages they visit and how they convert. Signal AI flags traffic anomalies in real time.',
        placement: 'bottom',
      },
      {
        target: 'analytics-pages',
        title: 'Page Performance',
        content: 'Every page ranked by views, engagement, and conversion rate. Scroll depth tracking shows exactly where readers drop off. Click any page to see its full session journey map.',
        placement: 'right',
      },
      {
        target: 'analytics-heatmap',
        title: 'Click Heatmaps',
        content: 'Visual heatmaps show where visitors click on each page. Identify which CTAs get attention, which are ignored, and where users expect links that don\'t exist.',
        placement: 'bottom',
      },
      {
        target: 'analytics-journeys',
        title: 'Session Journeys',
        content: 'Follow a visitor\'s path through your site from entry to exit. See the most common flows, where users get stuck, and which paths lead to conversions. This is the full picture that Google Analytics never gives you.',
        placement: 'bottom',
      },
      {
        target: 'analytics-conversions',
        title: 'Conversion Tracking',
        content: 'Track form submissions, button clicks, page goals, and custom events as conversions. Attribution shows which traffic sources and landing pages drive the most value.',
        placement: 'left',
      },
    ],
  },

  crm: {
    module: 'crm',
    name: 'CRM',
    path: '/crm',
    steps: [
      {
        target: 'crm-overview',
        title: 'Your CRM Pipeline',
        content: 'Every lead, prospect, and client lives here. Form submissions from your site flow in automatically. Drag deals between stages, set follow-up reminders, and track revenue from first touch to close.',
        placement: 'bottom',
      },
      {
        target: 'crm-pipeline',
        title: 'Deal Pipeline',
        content: 'Kanban-style pipeline with customizable stages. Drag deals between columns to update their status. Each deal tracks value, probability, and expected close date. Signal AI flags deals that have gone cold.',
        placement: 'bottom',
      },
      {
        target: 'crm-contacts',
        title: 'Contact Management',
        content: 'Full contact profiles with interaction history, deal associations, and activity timeline. Every form submission, email, and touchpoint is logged automatically.',
        placement: 'right',
      },
      {
        target: 'crm-leads',
        title: 'Lead Inbox',
        content: 'New form submissions land here first. Review, qualify, and convert them into deals or contacts. Site-kit automatically routes submissions by form type — prospect forms create leads, support forms create tickets.',
        placement: 'bottom',
      },
      {
        target: 'crm-activity',
        title: 'Activity Timeline',
        content: 'A chronological feed of every interaction across all contacts — form fills, page views, email opens, deal changes. Filter by contact, date, or activity type to find what you need.',
        placement: 'left',
      },
    ],
  },

  engage: {
    module: 'engage',
    name: 'Engage',
    path: '/engage',
    steps: [
      {
        target: 'engage-overview',
        title: 'Engage Widget Builder',
        content: 'Engage lets you add popups, slide-ins, banners, nudges, and chat widgets to your site — all managed from here, no code changes. Widgets are delivered through site-kit\'s EngageWidget component.',
        placement: 'bottom',
      },
      {
        target: 'engage-widgets',
        title: 'Active Widgets',
        content: 'Your live widgets with real-time impressions and conversion stats. Toggle any widget on/off instantly. Each widget has targeting rules — show on specific pages, after scroll depth, on exit intent, or to specific audiences.',
        placement: 'bottom',
      },
      {
        target: 'engage-builder',
        title: 'Visual Builder',
        content: 'Design widgets with the drag-and-drop builder. Choose from templates or start from scratch. Preview exactly how it\'ll look on desktop and mobile before publishing.',
        placement: 'right',
      },
      {
        target: 'engage-targeting',
        title: 'Smart Targeting',
        content: 'Control who sees what and when. Target by page URL, device, referral source, visit count, scroll depth, or time on page. Combine conditions for precise audience targeting.',
        placement: 'bottom',
      },
      {
        target: 'engage-analytics',
        title: 'Widget Analytics',
        content: 'See impressions, interactions, and conversions for every widget. A/B test different variations to optimize messaging. Signal AI recommends targeting tweaks based on performance patterns.',
        placement: 'left',
      },
    ],
  },

  forms: {
    module: 'forms',
    name: 'Forms',
    path: '/forms',
    steps: [
      {
        target: 'forms-overview',
        title: 'Form Management Hub',
        content: 'Build, manage, and track all your site forms from one place. Forms created here render through site-kit\'s FormsProvider — styled to match your site automatically.',
        placement: 'bottom',
      },
      {
        target: 'forms-list',
        title: 'Your Forms',
        content: 'Each form shows its submission count, conversion rate, and status. Click to edit fields, validation rules, and routing. Submissions automatically flow to the right place — CRM leads, support tickets, newsletter subscribers.',
        placement: 'bottom',
      },
      {
        target: 'forms-builder',
        title: 'Form Builder',
        content: 'Drag-and-drop field builder with validation, conditional logic, and multi-step support. Fields include text, email, phone, dropdown, checkbox, file upload, date picker, and custom fields.',
        placement: 'right',
      },
      {
        target: 'forms-submissions',
        title: 'Submissions Dashboard',
        content: 'Every submission with full metadata — timestamp, source page, session data, and UTM parameters. Export to CSV, bulk actions, and automatic spam filtering. Never miss a lead.',
        placement: 'bottom',
      },
      {
        target: 'forms-routing',
        title: 'Submission Routing',
        content: 'Control where each form type sends data. Prospect forms create CRM leads, contact forms trigger email notifications, newsletter forms add subscribers to broadcast lists. All configurable per form.',
        placement: 'left',
      },
    ],
  },

  blog: {
    module: 'blog',
    name: 'Blog',
    path: '/blog',
    steps: [
      {
        target: 'blog-overview',
        title: 'Blog Management',
        content: 'Write, schedule, and publish blog posts that render on your Next.js site through site-kit\'s Blog module. Full SSG support with generateStaticParams for optimal SEO performance.',
        placement: 'bottom',
      },
      {
        target: 'blog-posts',
        title: 'Post Library',
        content: 'All your posts with status (draft, published, scheduled), categories, and performance metrics. Click to edit with the rich text editor. SEO metadata is managed alongside the content.',
        placement: 'bottom',
      },
      {
        target: 'blog-editor',
        title: 'Rich Text Editor',
        content: 'Full WYSIWYG editor with headings, lists, links, images, code blocks, and embeds. Paste from Google Docs or Word with formatting preserved. Add a featured image and excerpt for social sharing.',
        placement: 'right',
      },
      {
        target: 'blog-categories',
        title: 'Categories & Tags',
        content: 'Organize posts with categories and tags. These automatically generate category archive pages on your site with proper SEO metadata. Readers can filter and discover related content.',
        placement: 'bottom',
      },
      {
        target: 'blog-seo',
        title: 'Blog SEO',
        content: 'Each post gets its own SEO panel — custom title tag, meta description, Open Graph image, and structured Article schema. Signal AI suggests optimizations based on your target keywords.',
        placement: 'left',
      },
    ],
  },

  commerce: {
    module: 'commerce',
    name: 'Commerce',
    path: '/commerce',
    steps: [
      {
        target: 'commerce-overview',
        title: 'Commerce Dashboard',
        content: 'Manage products, services, events, and checkout from one hub. Commerce integrates with Square for payment processing and renders on your site through site-kit\'s Commerce components.',
        placement: 'bottom',
      },
      {
        target: 'commerce-products',
        title: 'Product Catalog',
        content: 'Add products and services with images, descriptions, pricing, and variants (size, color, etc.). Each item gets its own page on your site with Product schema markup for rich search results.',
        placement: 'bottom',
      },
      {
        target: 'commerce-orders',
        title: 'Order Management',
        content: 'Track orders from placement to fulfillment. See payment status, customer details, and order history. Get notified on new orders and manage refunds directly from here.',
        placement: 'right',
      },
      {
        target: 'commerce-checkout',
        title: 'Checkout Configuration',
        content: 'Configure checkout flow, payment methods (Square, Stripe), shipping zones, and tax rules. Customize confirmation emails and receipt branding.',
        placement: 'bottom',
      },
      {
        target: 'commerce-analytics',
        title: 'Sales Analytics',
        content: 'Revenue, average order value, conversion funnel, and top-selling items. See which traffic sources drive the most purchases and which products have the highest margins.',
        placement: 'left',
      },
    ],
  },

  reputation: {
    module: 'reputation',
    name: 'Reputation',
    path: '/reputation',
    steps: [
      {
        target: 'reputation-overview',
        title: 'Reputation Dashboard',
        content: 'Monitor and manage your online reviews from Google, Facebook, Yelp, and more — all in one place. Your average rating and review velocity are tracked in real time.',
        placement: 'bottom',
      },
      {
        target: 'reputation-reviews',
        title: 'Review Feed',
        content: 'Every review across all platforms in a unified feed. Filter by platform, rating, or date. Respond to Google reviews directly from here without switching between dashboards.',
        placement: 'bottom',
      },
      {
        target: 'reputation-widget',
        title: 'Review Widget',
        content: 'Display your best reviews on your website through site-kit\'s Reputation component. Choose which reviews to feature and they render with proper Review schema for rich snippets in search.',
        placement: 'right',
      },
      {
        target: 'reputation-request',
        title: 'Review Requests',
        content: 'Send review request emails and SMS to happy customers. Customize the message, choose which platform to direct them to, and track open and completion rates.',
        placement: 'bottom',
      },
      {
        target: 'reputation-insights',
        title: 'Sentiment Analysis',
        content: 'Signal AI analyzes review text to identify recurring themes — positive and negative. Know what customers love, what frustrates them, and how your sentiment trends over time.',
        placement: 'left',
      },
    ],
  },

  broadcast: {
    module: 'broadcast',
    name: 'Broadcast',
    path: '/broadcast',
    steps: [
      {
        target: 'broadcast-overview',
        title: 'Broadcast & Email Marketing',
        content: 'Send newsletters, announcements, and drip campaigns to your subscriber lists. Integrated with your CRM contacts and form submission subscribers.',
        placement: 'bottom',
      },
      {
        target: 'broadcast-campaigns',
        title: 'Campaign Library',
        content: 'All your campaigns with send status, open rates, click rates, and unsubscribe stats. Duplicate successful campaigns as templates. Schedule sends for optimal delivery times.',
        placement: 'bottom',
      },
      {
        target: 'broadcast-editor',
        title: 'Email Designer',
        content: 'Visual email builder with drag-and-drop blocks — headers, text, images, buttons, dividers, and social links. Mobile-responsive by default. Preview across email clients before sending.',
        placement: 'right',
      },
      {
        target: 'broadcast-lists',
        title: 'Subscriber Lists',
        content: 'Manage subscriber lists with tags and segments. Forms automatically add subscribers based on routing rules. Import/export CSV lists and manage unsubscribes to stay compliant.',
        placement: 'bottom',
      },
      {
        target: 'broadcast-automation',
        title: 'Automated Sequences',
        content: 'Set up drip campaigns that send automatically — welcome series for new subscribers, follow-ups after form submissions, re-engagement for dormant contacts. Each step has delay and condition triggers.',
        placement: 'left',
      },
    ],
  },

  sync: {
    module: 'sync',
    name: 'Sync',
    path: '/sync',
    steps: [
      {
        target: 'sync-calendar',
        title: 'Your Unified Calendar',
        content: 'Sync brings all your scheduling into one view — Google Calendar events, client bookings, CRM follow-ups, tasks, and focus blocks. Everything color-coded by source so you can see your day at a glance.',
        placement: 'bottom',
      },
      {
        target: 'sync-views',
        title: 'Calendar Views',
        content: 'Switch between day, week, and month views. Each view shows events from all connected sources. Filter by project, source, or event type to focus on what matters.',
        placement: 'right',
      },
      {
        target: 'sync-booking-types',
        title: 'Booking Types',
        content: 'Create booking types that clients can schedule — consultations, onboarding calls, review sessions. Each type has its own duration, availability rules, and booking page that you can share or embed on your site.',
        placement: 'bottom',
      },
      {
        target: 'sync-bookings',
        title: 'Bookings & Appointments',
        content: 'All client bookings in one place. See upcoming appointments, confirm or reschedule, and track booking history. Bookings automatically create CRM activities and send confirmation emails.',
        placement: 'bottom',
      },
      {
        target: 'sync-create',
        title: 'Quick Create',
        content: 'Create meetings, focus blocks, and tasks directly from the calendar. Block focus time to protect your schedule, add tasks with deadlines, or schedule meetings with video conferencing links.',
        placement: 'right',
      },
    ],
  },

  signal: {
    module: 'signal',
    name: 'Signal AI',
    path: '/signal',
    steps: [
      {
        target: 'signal-header',
        title: 'Signal AI — Your Business Brain',
        content: 'Signal is the intelligence layer of Sonor. It ingests everything about your business — analytics, CRM, SEO, reputation, content — and uses it to surface insights, detect patterns, and power Echo\'s conversations.',
        placement: 'bottom',
      },
      {
        target: 'signal-tabs',
        title: 'Navigation Tabs',
        content: 'Signal is organized into focused areas: Pulse (live dashboard), Mind (knowledge center), Insights (analytics & gaps), Playground (test responses), Voice Lab (Echo personality), Training (teach Echo), and Config (settings).',
        placement: 'bottom',
      },
      {
        target: 'signal-pulse',
        title: 'Pulse — Live Dashboard',
        content: 'Pulse shows Signal\'s real-time status: knowledge coverage, recent activity, pattern detections, and system health. It\'s the at-a-glance view of how well Signal understands your business.',
        placement: 'bottom',
      },
      {
        target: 'signal-mind',
        title: 'Mind — Knowledge Center',
        content: 'The Mind tab shows everything Signal knows: business facts, services, team members, locations, FAQs, and learned preferences. Add, edit, or verify knowledge entries to improve Echo\'s accuracy.',
        placement: 'bottom',
      },
      {
        target: 'signal-playground',
        title: 'Playground — Test Responses',
        content: 'Test how Echo responds to customer questions before going live. Simulate conversations, see which knowledge gets used, and refine responses. Essential for quality-checking before launch.',
        placement: 'bottom',
      },
      {
        target: 'signal-voice',
        title: 'Voice Lab — Echo Personality',
        content: 'Define Echo\'s personality, tone, and communication style. Set how formal or casual it should be, what topics to avoid, and how it should handle sensitive questions. Your brand voice, powered by AI.',
        placement: 'left',
      },
    ],
  },

  website: {
    module: 'website',
    name: 'Website',
    path: '/website',
    steps: [
      {
        target: 'website-header',
        title: 'Website Management',
        content: 'The Website module gives you page-level control over your site\'s content, metadata, images, and structured data. Every page tracked by site-kit appears here with its current SEO data and content.',
        placement: 'bottom',
      },
      {
        target: 'website-pages',
        title: 'Page List',
        content: 'Every page on your site, sorted by path. Click any page to view and edit its metadata, images, FAQs, and schema markup. Pages sync automatically when site-kit\'s SitemapSync runs.',
        placement: 'right',
      },
      {
        target: 'website-images',
        title: 'Site Images',
        content: 'Manage images across your site from one place. Upload, organize, and assign images to pages. ManagedImage components in site-kit pull these images at render time — update an image here, it changes everywhere.',
        placement: 'bottom',
      },
      {
        target: 'website-metadata',
        title: 'Metadata Management',
        content: 'Edit title tags, meta descriptions, and Open Graph data for every page. Changes push to your live site instantly through site-kit\'s getManagedMetadata — no deploy needed.',
        placement: 'bottom',
      },
      {
        target: 'website-schema',
        title: 'Schema & Structured Data',
        content: 'Manage JSON-LD schemas per page — LocalBusiness, FAQ, Product, Service, Article, and more. Site-kit\'s ManagedSchema injects these at render time for rich search results.',
        placement: 'left',
      },
    ],
  },

  outreach: {
    module: 'outreach',
    name: 'Outreach',
    path: '/outreach',
    steps: [
      {
        target: 'outreach-header',
        title: 'Outreach & Email Marketing',
        content: 'Outreach combines email marketing and cold outreach in one module. Send newsletters and campaigns to your subscribers, or use Signal-powered cold outreach to find and engage new leads.',
        placement: 'bottom',
      },
      {
        target: 'outreach-sidebar',
        title: 'Navigation',
        content: 'The sidebar organizes outreach into sections: Email Marketing (campaigns, automations, transactional), Cold Outreach (sequences, inbox, discovery — requires Signal AI), Shared Tools (templates, A/B tests, audience), and Infrastructure (domains, compliance).',
        placement: 'right',
      },
      {
        target: 'outreach-campaigns',
        title: 'Email Campaigns',
        content: 'Create and send email campaigns to your subscriber lists. Design with the visual builder, segment your audience, schedule delivery, and track opens, clicks, and conversions in real time.',
        placement: 'bottom',
      },
      {
        target: 'outreach-sequences',
        title: 'Cold Outreach Sequences',
        content: 'Build multi-step outreach sequences with automated follow-ups. Signal AI helps personalize each message based on prospect data. Track replies, bounces, and engagement across the full sequence.',
        placement: 'bottom',
      },
      {
        target: 'outreach-audience',
        title: 'Audience Management',
        content: 'Manage your subscriber lists, segments, and suppression rules. Import contacts, create dynamic segments based on behavior or attributes, and keep your lists clean with verification tools.',
        placement: 'left',
      },
    ],
  },

  affiliates: {
    module: 'affiliates',
    name: 'Affiliates',
    path: '/affiliates',
    steps: [
      {
        target: 'affiliates-header',
        title: 'Affiliate Partner Management',
        content: 'Track and manage your affiliate partnerships from one dashboard. See every partner\'s performance — clicks, conversions, and revenue — with real-time tracking links.',
        placement: 'bottom',
      },
      {
        target: 'affiliates-sidebar',
        title: 'Views & Filters',
        content: 'Filter affiliates by status (active, paused) and view aggregate performance stats. The sidebar gives you a quick overview of your affiliate program\'s health.',
        placement: 'right',
      },
      {
        target: 'affiliates-grid',
        title: 'Partner Cards',
        content: 'Each affiliate shows their name, status, tracking link, and key metrics — clicks, conversions, and earnings. Switch between grid and list views. Click any card to see full details.',
        placement: 'bottom',
      },
      {
        target: 'affiliates-detail',
        title: 'Affiliate Detail',
        content: 'The detail panel shows everything about a partner: their tracking links, offer assignments, conversion history, payout records, and performance trends over time.',
        placement: 'left',
      },
      {
        target: 'affiliates-create',
        title: 'Add Partners',
        content: 'Invite new affiliate partners with a single click. Set their commission structure, assign offers, and generate unique tracking links. Partners get their own dashboard to monitor performance.',
        placement: 'bottom',
      },
    ],
  },
}

/**
 * Get the tour config for a module. Returns null if no tour exists.
 */
export function getModuleTour(moduleKey: string): ModuleTour | null {
  return MODULE_TOURS[moduleKey] || null
}

/**
 * Get all available module tours.
 */
export function getAllModuleTours(): ModuleTour[] {
  return Object.values(MODULE_TOURS)
}
