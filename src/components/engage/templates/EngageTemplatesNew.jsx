// src/components/engage/templates/EngageTemplatesNew.jsx
// JSX-based templates for the new EngageStudio design format
// Each template uses CSS variables (var(--brand-primary), var(--brand-primary)) for brand consistency

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Search, 
  Sparkles, 
  MessageSquare, 
  Megaphone, 
  Bell, 
  PanelBottom,
  Mail,
  ShoppingCart,
  Star,
  Clock,
  Gift,
  Users,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import SignalIcon from '@/components/ui/SignalIcon'
import { engageApi } from '@/lib/portal-api'
import { toast } from 'sonner'

// ============================================================================
// TEMPLATE CATEGORIES
// ============================================================================

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'welcome', label: 'Welcome' },
  { id: 'lead-capture', label: 'Lead Capture' },
  { id: 'promotional', label: 'Promotional' },
  { id: 'social-proof', label: 'Social Proof' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'announcement', label: 'Announcement' },
]

// ============================================================================
// TEMPLATE DESIGNS (JSX Tree Format)
// Each template is a design_json compatible structure
// Uses CSS variables for dynamic brand colors
// ============================================================================

const TEMPLATES = [
  // ─────────────────────────────────────────────────────────────────────────
  // WELCOME POPUP - First-time visitor greeting
  // Purpose: Welcome new visitors, establish brand trust, optional discount
  // UX: Clean, warm, non-intrusive with clear value proposition
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'welcome-warm',
    name: 'Warm Welcome',
    description: 'A friendly greeting for first-time visitors with optional discount offer',
    category: 'welcome',
    element_type: 'popup',
    icon: MessageSquare,
    trigger: { type: 'delay', config: { seconds: 3 } },
    design_json: {
      id: 'root',
      type: 'Box',
      name: 'Popup Container',
      props: {},
      style: {
        padding: '32px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        maxWidth: '400px',
        textAlign: 'center',
      },
      children: [
        {
          id: 'icon-wrapper',
          type: 'Box',
          name: 'Icon Container',
          props: {},
          style: {
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          },
          children: [
            {
              id: 'wave-emoji',
              type: 'Text',
              name: 'Wave Icon',
              props: { text: '👋' },
              style: { fontSize: '28px' },
              children: [],
            },
          ],
        },
        {
          id: 'heading',
          type: 'Heading',
          name: 'Welcome Title',
          props: { level: 2, text: 'Welcome!' },
          style: { 
            fontSize: '24px',
            fontWeight: '700',
            color: '#1a1a1a',
            marginBottom: '8px',
          },
          children: [],
        },
        {
          id: 'subtitle',
          type: 'Text',
          name: 'Welcome Message',
          props: { text: "We're so glad you're here. Take a look around and discover what makes us special." },
          style: { 
            fontSize: '15px',
            color: '#666666',
            lineHeight: '1.5',
            marginBottom: '24px',
          },
          children: [],
        },
        {
          id: 'cta-button',
          type: 'Button',
          name: 'Start Exploring',
          props: { text: 'Start Exploring', variant: 'primary' },
          style: {
            backgroundColor: 'var(--brand-primary)',
            color: '#ffffff',
            padding: '12px 32px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '15px',
            border: 'none',
            cursor: 'pointer',
            width: '100%',
          },
          children: [],
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // EMAIL CAPTURE POPUP - Newsletter signup with incentive
  // Purpose: Build email list with value exchange (discount/content)
  // UX: Clear value prop, minimal friction, email + single CTA
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'email-capture',
    name: 'Email Capture',
    description: 'Newsletter signup with discount incentive - builds your email list',
    category: 'lead-capture',
    element_type: 'popup',
    icon: Mail,
    trigger: { type: 'delay', config: { seconds: 8 } },
    design_json: {
      id: 'root',
      type: 'Box',
      name: 'Popup Container',
      props: {},
      style: {
        padding: '0',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        maxWidth: '420px',
        overflow: 'hidden',
      },
      children: [
        {
          id: 'header-band',
          type: 'Box',
          name: 'Header Band',
          props: {},
          style: {
            background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary))',
            padding: '24px',
            textAlign: 'center',
          },
          children: [
            {
              id: 'discount-badge',
              type: 'Text',
              name: 'Discount Amount',
              props: { text: '15% OFF' },
              style: {
                fontSize: '32px',
                fontWeight: '800',
                color: '#ffffff',
                letterSpacing: '-1px',
              },
              children: [],
            },
            {
              id: 'discount-subtitle',
              type: 'Text',
              name: 'Discount Label',
              props: { text: 'Your first order' },
              style: {
                fontSize: '14px',
                color: 'rgba(255,255,255,0.9)',
                marginTop: '4px',
              },
              children: [],
            },
          ],
        },
        {
          id: 'content-area',
          type: 'Box',
          name: 'Content Area',
          props: {},
          style: {
            padding: '28px',
          },
          children: [
            {
              id: 'headline',
              type: 'Heading',
              name: 'Headline',
              props: { level: 3, text: 'Join our community' },
              style: {
                fontSize: '20px',
                fontWeight: '600',
                color: '#1a1a1a',
                marginBottom: '8px',
                textAlign: 'center',
              },
              children: [],
            },
            {
              id: 'description',
              type: 'Text',
              name: 'Description',
              props: { text: 'Subscribe for exclusive deals, early access, and style inspiration.' },
              style: {
                fontSize: '14px',
                color: '#666666',
                textAlign: 'center',
                marginBottom: '20px',
                lineHeight: '1.5',
              },
              children: [],
            },
            {
              id: 'email-input',
              type: 'Input',
              name: 'Email Input',
              props: { 
                type: 'email', 
                placeholder: 'Enter your email',
                required: true,
              },
              style: {
                width: '100%',
                padding: '14px 16px',
                borderRadius: '8px',
                border: '1px solid #e5e5e5',
                fontSize: '15px',
                marginBottom: '12px',
              },
              children: [],
            },
            {
              id: 'submit-button',
              type: 'Button',
              name: 'Subscribe Button',
              props: { text: 'Get My 15% Off', variant: 'primary' },
              style: {
                backgroundColor: 'var(--brand-primary)',
                color: '#ffffff',
                padding: '14px 24px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '15px',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
              },
              children: [],
            },
            {
              id: 'privacy-note',
              type: 'Text',
              name: 'Privacy Note',
              props: { text: 'No spam, ever. Unsubscribe anytime.' },
              style: {
                fontSize: '12px',
                color: '#999999',
                textAlign: 'center',
                marginTop: '12px',
              },
              children: [],
            },
          ],
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // EXIT INTENT - Last chance to convert leaving visitors
  // Purpose: Recover abandoning visitors with compelling offer
  // UX: Urgency without desperation, clear value, easy action
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'exit-intent',
    name: 'Exit Intent Saver',
    description: 'Catch visitors before they leave with a special offer',
    category: 'promotional',
    element_type: 'popup',
    icon: Zap,
    trigger: { type: 'exit-intent', config: {} },
    design_json: {
      id: 'root',
      type: 'Box',
      name: 'Popup Container',
      props: {},
      style: {
        padding: '32px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        maxWidth: '380px',
        textAlign: 'center',
      },
      children: [
        {
          id: 'emoji-icon',
          type: 'Text',
          name: 'Attention Icon',
          props: { text: '⏰' },
          style: { 
            fontSize: '48px',
            marginBottom: '16px',
          },
          children: [],
        },
        {
          id: 'heading',
          type: 'Heading',
          name: 'Wait Message',
          props: { level: 2, text: "Wait! Don't miss out" },
          style: { 
            fontSize: '22px',
            fontWeight: '700',
            color: '#1a1a1a',
            marginBottom: '12px',
          },
          children: [],
        },
        {
          id: 'offer-text',
          type: 'Text',
          name: 'Offer Description',
          props: { text: 'Complete your order in the next 15 minutes and get free shipping on us.' },
          style: { 
            fontSize: '15px',
            color: '#666666',
            lineHeight: '1.5',
            marginBottom: '24px',
          },
          children: [],
        },
        {
          id: 'cta-button',
          type: 'Button',
          name: 'Claim Offer',
          props: { text: 'Claim Free Shipping', variant: 'primary' },
          style: {
            backgroundColor: 'var(--brand-primary)',
            color: '#ffffff',
            padding: '14px 28px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '15px',
            border: 'none',
            cursor: 'pointer',
            width: '100%',
            marginBottom: '12px',
          },
          children: [],
        },
        {
          id: 'dismiss-link',
          type: 'Text',
          name: 'No Thanks',
          props: { text: 'No thanks, I\'ll pay for shipping' },
          style: {
            fontSize: '13px',
            color: '#999999',
            cursor: 'pointer',
            textDecoration: 'underline',
          },
          children: [],
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SOCIAL PROOF TOAST - Recent purchase notification
  // Purpose: Build trust through social proof, create urgency
  // UX: Subtle, non-intrusive, quick-read format
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'social-proof-toast',
    name: 'Recent Purchase',
    description: 'Show recent purchases to build trust and urgency',
    category: 'social-proof',
    element_type: 'toast',
    icon: ShoppingCart,
    trigger: { type: 'delay', config: { seconds: 10 } },
    design_json: {
      id: 'root',
      type: 'Box',
      name: 'Toast Container',
      props: {},
      style: {
        padding: '16px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
        maxWidth: '320px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        borderLeft: '4px solid var(--brand-primary)',
      },
      children: [
        {
          id: 'product-image',
          type: 'Box',
          name: 'Product Image',
          props: {},
          style: {
            width: '48px',
            height: '48px',
            borderRadius: '8px',
            backgroundColor: '#f5f5f5',
            flexShrink: '0',
          },
          children: [],
        },
        {
          id: 'content',
          type: 'Box',
          name: 'Content',
          props: {},
          style: {
            flex: '1',
            minWidth: '0',
          },
          children: [
            {
              id: 'customer-name',
              type: 'Text',
              name: 'Customer',
              props: { text: 'Sarah from Austin' },
              style: {
                fontSize: '14px',
                fontWeight: '600',
                color: '#1a1a1a',
                marginBottom: '2px',
              },
              children: [],
            },
            {
              id: 'action-text',
              type: 'Text',
              name: 'Action',
              props: { text: 'just purchased this item' },
              style: {
                fontSize: '13px',
                color: '#666666',
              },
              children: [],
            },
            {
              id: 'time-ago',
              type: 'Text',
              name: 'Time',
              props: { text: '2 minutes ago' },
              style: {
                fontSize: '11px',
                color: '#999999',
                marginTop: '4px',
              },
              children: [],
            },
          ],
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ANNOUNCEMENT BANNER - Site-wide notification
  // Purpose: Communicate important info (sale, shipping, hours)
  // UX: Visible but not blocking, dismissible, scannable
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'announcement-banner',
    name: 'Announcement Bar',
    description: 'Site-wide banner for sales, shipping updates, or announcements',
    category: 'announcement',
    element_type: 'banner',
    icon: Megaphone,
    trigger: { type: 'immediate', config: {} },
    design_json: {
      id: 'root',
      type: 'Box',
      name: 'Banner Container',
      props: {},
      style: {
        background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary))',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
      },
      children: [
        {
          id: 'banner-icon',
          type: 'Text',
          name: 'Icon',
          props: { text: '🎉' },
          style: { fontSize: '18px' },
          children: [],
        },
        {
          id: 'banner-text',
          type: 'Text',
          name: 'Message',
          props: { text: 'Free shipping on orders over $50 — Limited time only!' },
          style: {
            fontSize: '14px',
            fontWeight: '500',
            color: '#ffffff',
          },
          children: [],
        },
        {
          id: 'banner-cta',
          type: 'Button',
          name: 'Shop Now',
          props: { text: 'Shop Now', variant: 'secondary' },
          style: {
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: '#ffffff',
            padding: '6px 16px',
            borderRadius: '6px',
            fontWeight: '600',
            fontSize: '13px',
            border: '1px solid rgba(255,255,255,0.3)',
            cursor: 'pointer',
          },
          children: [],
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FEEDBACK NUDGE - Quick satisfaction check
  // Purpose: Gather feedback without interrupting experience
  // UX: Minimal, one-click response, corner positioning
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'feedback-nudge',
    name: 'Quick Feedback',
    description: 'Gather customer satisfaction with a simple one-click response',
    category: 'feedback',
    element_type: 'nudge',
    icon: Star,
    trigger: { type: 'delay', config: { seconds: 30 } },
    design_json: {
      id: 'root',
      type: 'Box',
      name: 'Nudge Container',
      props: {},
      style: {
        padding: '20px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.12)',
        maxWidth: '280px',
      },
      children: [
        {
          id: 'question',
          type: 'Text',
          name: 'Question',
          props: { text: 'How was your experience today?' },
          style: {
            fontSize: '14px',
            fontWeight: '600',
            color: '#1a1a1a',
            marginBottom: '16px',
            textAlign: 'center',
          },
          children: [],
        },
        {
          id: 'emoji-row',
          type: 'Flex',
          name: 'Response Options',
          props: {},
          style: {
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
          },
          children: [
            {
              id: 'emoji-bad',
              type: 'Button',
              name: 'Bad',
              props: { text: '😞' },
              style: {
                fontSize: '28px',
                padding: '8px 12px',
                backgroundColor: '#f5f5f5',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              },
              children: [],
            },
            {
              id: 'emoji-ok',
              type: 'Button',
              name: 'Okay',
              props: { text: '😐' },
              style: {
                fontSize: '28px',
                padding: '8px 12px',
                backgroundColor: '#f5f5f5',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              },
              children: [],
            },
            {
              id: 'emoji-good',
              type: 'Button',
              name: 'Good',
              props: { text: '😊' },
              style: {
                fontSize: '28px',
                padding: '8px 12px',
                backgroundColor: '#f5f5f5',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              },
              children: [],
            },
            {
              id: 'emoji-great',
              type: 'Button',
              name: 'Great',
              props: { text: '😍' },
              style: {
                fontSize: '28px',
                padding: '8px 12px',
                backgroundColor: '#f5f5f5',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              },
              children: [],
            },
          ],
        },
      ],
    },
  },
]

// ============================================================================
// TEMPLATE CARD COMPONENT
// ============================================================================

function TemplateCard({ template, onSelect }) {
  const Icon = template.icon
  
  // Render a mini preview of the template
  const renderMiniPreview = () => {
    const design = template.design_json
    const rootStyle = design.style || {}
    
    return (
      <div 
        className="w-full h-full flex items-center justify-center p-3"
        style={{
          background: rootStyle.background || 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary))',
        }}
      >
        <div
          className="transform scale-[0.35] origin-center max-w-[280px]"
          style={{
            backgroundColor: rootStyle.backgroundColor || '#ffffff',
            borderRadius: rootStyle.borderRadius || '12px',
            padding: rootStyle.padding || '24px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          }}
        >
          {/* Simplified preview content */}
          <div className="text-center">
            <div className="text-sm font-semibold text-gray-800 mb-1 truncate">
              {design.children?.[0]?.props?.text || design.children?.[1]?.props?.text || template.name}
            </div>
            <div className="text-xs text-gray-500 mb-2 line-clamp-2">
              {template.description}
            </div>
            <div 
              className="inline-block px-3 py-1 text-xs font-medium text-white rounded"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              CTA Button
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <button
      onClick={() => onSelect(template)}
      className="group relative flex flex-col bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg hover:border-[var(--brand-primary)]/30 transition-all text-left"
    >
      {/* Preview Area */}
      <div className="relative h-40 bg-muted/30 overflow-hidden">
        {renderMiniPreview()}
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium bg-[var(--brand-primary)] px-4 py-2 rounded-lg">
            Use Template
          </span>
        </div>
      </div>
      
      {/* Info */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
          >
            <Icon className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{template.name}</div>
            <div className="text-xs text-muted-foreground capitalize">{template.element_type}</div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {template.description}
        </p>
      </div>
    </button>
  )
}

// ============================================================================
// MAIN TEMPLATES COMPONENT
// ============================================================================

export default function EngageTemplatesNew({ projectId }) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [isCreating, setIsCreating] = useState(false)
  
  // Filter templates
  const filteredTemplates = TEMPLATES.filter(t => {
    const matchesSearch = 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.element_type.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory
    return matchesSearch && matchesCategory
  })
  
  const handleSelect = async (template) => {
    setIsCreating(true)
    try {
      // Create the element with the template's design
      const result = await engageApi.createElement({
        project_id: projectId,
        name: template.name,
        element_type: template.element_type,
        status: 'draft',
        design_json: template.design_json,
        trigger_type: template.trigger?.type || 'manual',
        trigger_config: template.trigger?.config || {},
      })
      
      if (result?.id) {
        toast.success('Template applied! Opening editor...')
        navigate(`/engage/studio/${result.id}`)
      } else {
        throw new Error('Failed to create element')
      }
    } catch (err) {
      console.error('Failed to create from template:', err)
      toast.error('Failed to apply template. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-semibold mb-4">Start from a Template</h2>
        
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="pl-9"
          />
        </div>
        
        {/* Categories */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-full transition-colors",
                selectedCategory === cat.id
                  ? "bg-[var(--brand-primary)] text-white"
                  : "bg-muted hover:bg-[var(--brand-primary)]/10"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Templates Grid */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {isCreating ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin h-8 w-8 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full mb-4" />
              <p className="text-muted-foreground">Creating your element...</p>
            </div>
          ) : filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Sparkles className="h-10 w-10 mx-auto mb-4 opacity-40" />
              <p className="font-medium">No templates match your search</p>
              <p className="text-sm mt-1">Try a different keyword or category</p>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* AI Suggestion Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
          <div
            className="p-2.5 rounded-xl"
            style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
          >
            <SignalIcon className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Need something custom?</div>
            <div className="text-xs text-muted-foreground">
              Use Echo AI in the studio to design unique elements with natural language
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/engage/studio/new')}
          >
            Start Blank
          </Button>
        </div>
      </div>
    </div>
  )
}
