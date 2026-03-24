/**
 * EchoPanel — Module-embedded Echo assistant panel.
 *
 * Drop into any module page (SEO, CRM, Analytics) to give users contextual
 * AI assistance scoped to the current page. Automatically passes page context
 * (module, page, entity) so Echo knows what the user is looking at.
 *
 * Usage:
 *   <EchoPanel
 *     module="seo"
 *     page="keywords"
 *     entityType="seo_page"
 *     entityId="abc-123"
 *     entityName="/services/roofing"
 *   />
 */

import { useState, useCallback, useMemo } from 'react'
import { MessageCircle, X, Minimize2, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEchoChat, type EchoPageContext } from '@/hooks/useEchoChat'
import { ChatArea } from './ChatArea'
import EchoLogo from '@/components/EchoLogo'
import { openOAuthPopup } from '@/lib/oauth-popup'
import useAuthStore from '@/lib/auth-store'

interface EchoPanelProps {
  /** Module name (seo, crm, analytics, engage, etc.) */
  module: string
  /** Page within the module (keywords, contacts, overview, etc.) */
  page?: string
  /** Entity type being viewed (contact, seo_page, deal, etc.) */
  entityType?: string
  /** Entity ID */
  entityId?: string
  /** Entity display name */
  entityName?: string
  /** Additional contextual data */
  data?: Record<string, unknown>
  /** Pre-scoped skill to use (defaults to module name) */
  skill?: string
  /** Custom welcome prompts (overrides defaults) */
  prompts?: Array<{ label: string; prompt: string; icon?: string }>
  /** Position of the panel */
  position?: 'right' | 'bottom'
  className?: string
}

const MODULE_SKILLS: Record<string, string> = {
  seo: 'seo',
  crm: 'crm',
  analytics: 'analytics',
  engage: 'engage',
  commerce: 'commerce',
  email: 'email',
  broadcast: 'broadcast',
  proposals: 'proposals',
  reputation: 'reputation',
  forms: 'forms',
}

const DEFAULT_PROMPTS: Record<string, Array<{ label: string; prompt: string; icon?: string }>> = {
  seo: [
    { label: 'Quick wins', prompt: 'What are the top SEO quick wins for this page?', icon: '🎯' },
    { label: 'Content gaps', prompt: 'Identify content gaps on this page', icon: '📝' },
    { label: 'Meta analysis', prompt: 'Analyze the meta title and description', icon: '🔍' },
  ],
  crm: [
    { label: 'Follow-ups due', prompt: 'Which contacts need follow-up today?', icon: '📞' },
    { label: 'Pipeline status', prompt: 'Give me a pipeline overview', icon: '📊' },
    { label: 'Draft email', prompt: 'Draft a follow-up email for this contact', icon: '✉️' },
  ],
  analytics: [
    { label: 'Traffic trends', prompt: 'What are the traffic trends this week?', icon: '📈' },
    { label: 'Top pages', prompt: 'Show me the top performing pages', icon: '🏆' },
    { label: 'Conversion analysis', prompt: 'Analyze conversion rates', icon: '🎯' },
  ],
}

export function EchoPanel({
  module,
  page,
  entityType,
  entityId,
  entityName,
  data,
  skill,
  prompts,
  position = 'right',
  className,
}: EchoPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  const pageContext = useMemo<EchoPageContext>(() => ({
    module,
    page,
    entityType,
    entityId,
    entityName,
    data,
  }), [module, page, entityType, entityId, entityName, data])

  const resolvedSkill = skill || MODULE_SKILLS[module] || undefined

  const echo = useEchoChat({
    skill: resolvedSkill,
    pageContext,
    enabled: isOpen,
  })

  const welcomePrompts = prompts || DEFAULT_PROMPTS[module] || [
    { label: 'Help me', prompt: `Help me with ${module}`, icon: '💡' },
  ]

  const handlePromptClick = useCallback(
    (prompt: string) => echo.sendMessage(prompt),
    [echo.sendMessage],
  )

  const handleSendMessage = useCallback(
    (content: string) => echo.sendMessage(content),
    [echo.sendMessage],
  )

  // Handle OAuth action clicks from ```actions blocks
  const handleOAuthClick = useCallback(async (provider: string) => {
    const currentProject = useAuthStore.getState().currentProject
    if (!currentProject?.id) {
      echo.sendMessage(`I tried to connect ${provider} but no project is selected.`)
      return
    }

    const portalApiUrl = (import.meta.env.VITE_SONOR_API_URL || import.meta.env.VITE_PORTAL_API_URL) || ''
    const defaultModules: Record<string, string> = {
      google: 'seo,seo_gbp,reputation,analytics',
      facebook: 'social',
      linkedin: 'social',
      tiktok: 'social',
      netlify: 'hosting',
      yelp: 'reputation',
      trustpilot: 'reputation',
      shopify: 'commerce',
    }
    const modules = defaultModules[provider] || ''

    try {
      const response = await fetch(
        `${portalApiUrl}/oauth/initiate/${provider}?projectId=${currentProject.id}&modules=${modules}&connectionType=business&popupMode=true`,
        { credentials: 'include' },
      )

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.message || 'Failed to start OAuth')
      }

      const { url } = await response.json()
      const result = await openOAuthPopup(url, `oauth-${provider}`)

      if (result.success) {
        echo.sendMessage(`I just connected ${provider}! What should I set up next?`)
      } else if (result.error && result.error !== 'OAuth window was closed') {
        echo.sendMessage(`The ${provider} connection failed: ${result.error}. Can you help me try again?`)
      }
    } catch (err: any) {
      echo.sendMessage(`I had trouble connecting ${provider}: ${err.message}. Let me know if you need help.`)
    }
  }, [echo.sendMessage])

  const toolCallLabel = echo.activeToolCall?.label || null

  // Floating trigger button when panel is closed
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed z-40 flex items-center gap-2 px-4 py-2.5 rounded-full',
          'bg-[var(--brand-primary)] text-white shadow-lg',
          'hover:shadow-xl hover:scale-105 transition-all duration-200',
          position === 'right' ? 'bottom-6 right-6' : 'bottom-6 right-6',
          className,
        )}
      >
        <EchoLogo size={20} animated={false} isPulsing={false} />
        <span className="text-sm font-medium">Ask Echo</span>
      </button>
    )
  }

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col bg-[var(--surface-primary)] border border-[var(--glass-border)]/50 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300',
        isMinimized ? 'h-12' : '',
        position === 'right'
          ? 'bottom-6 right-6 w-[400px] max-w-[calc(100vw-3rem)]'
          : 'bottom-6 right-6 w-[500px] max-w-[calc(100vw-3rem)]',
        !isMinimized && 'h-[600px] max-h-[calc(100vh-6rem)]',
        className,
      )}
    >
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-[var(--glass-border)]/30 bg-[var(--surface-secondary)]/50">
        <div className="flex items-center gap-2">
          <EchoLogo size={20} animated={false} isPulsing={false} />
          <div>
            <span className="text-sm font-semibold text-[var(--text-primary)]">Echo</span>
            <span className="ml-1.5 text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
              {module}{page ? ` / ${page}` : ''}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-tertiary)] transition-colors"
          >
            {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-tertiary)] transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Chat area */}
      {!isMinimized && (
        <ChatArea
          thread={echo.thread}
          messages={echo.messages}
          isLoading={echo.isLoading}
          currentUserId="current-user"
          threadType="echo"
          isStreaming={echo.isStreaming}
          streamingContent={echo.streamingContent}
          onSendMessage={handleSendMessage}
          onPromptClick={handlePromptClick}
          onFeedback={echo.sendFeedback}
          onRetry={(id) => echo.retryMessage(id)}
          showFeedback
          placeholder={`Ask about ${module}...`}
          toolCallLabel={toolCallLabel}
          suggestionChips={echo.suggestionChips}
          error={echo.error}
          welcomeConfig={{
            greeting: `Echo / ${module.charAt(0).toUpperCase() + module.slice(1)}`,
            description: entityName
              ? `I have context on ${entityName}. How can I help?`
              : `Ask me anything about your ${module} data.`,
            prompts: welcomePrompts,
          }}
          onOAuthClick={handleOAuthClick}
          className="flex-1 min-h-0"
        />
      )}
    </div>
  )
}
