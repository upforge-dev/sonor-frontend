// src/components/proposals/ProposalAIEditorPanel.jsx
/**
 * Proposal AI Editor Panel - Right sidebar AI chat for proposal/contract editing
 * Renders in ModuleLayout's rightSidebar when editing a proposal.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Bold, Heading2, List, ListOrdered, Send, Loader2 } from 'lucide-react'
import EchoLogo from '@/components/EchoLogo'
import { commerceApi, proposalsApi } from '@/lib/sonor-api'
import useAuthStore from '@/lib/auth-store'
import { cn } from '@/lib/utils'

const QUICK_ACTIONS = [
  { label: 'Adjust price', prompt: 'Change the price to ' },
  { label: 'Change payment terms', prompt: 'Change the payment terms to 50% upfront and 50% on completion' },
  { label: 'Update timeline', prompt: 'Change the timeline to ' },
  { label: 'Simplify language', prompt: 'Simplify the language and make it more concise' },
  { label: 'Add detail', prompt: 'Add more detail about ' },
]

export default function ProposalAIEditorPanel({
  contract,
  projectId,
  isProposal = false,
  onSave,
  onContractChange,
  onHasUnsavedChanges,
}) {
  const { currentProject } = useAuthStore()
  const effectiveProjectId = projectId || currentProject?.id

  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      content: `I'm your ${isProposal ? 'proposal' : 'contract'} assistant! Tell me what you'd like to change - pricing, wording, sections, or anything else.`,
    },
  ])
  const [chatInput, setChatInput] = useState('')
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const chatEndRef = useRef(null)
  const chatInputRef = useRef(null)

  const withTextarea = useCallback((fn) => {
    const el = chatInputRef.current
    if (!el) return
    fn(el)
  }, [])

  /** Insert markdown at caret (proposal instructions are interpreted as plain / markdown by the model). */
  const insertAtCursor = useCallback(
    (snippet) => {
      withTextarea((ta) => {
        const start = ta.selectionStart
        const end = ta.selectionEnd
        const text = chatInput
        const next = text.slice(0, start) + snippet + text.slice(end)
        setChatInput(next)
        requestAnimationFrame(() => {
          ta.focus()
          const pos = start + snippet.length
          ta.setSelectionRange(pos, pos)
        })
      })
    },
    [chatInput, withTextarea],
  )

  const wrapSelection = useCallback(
    (before, after) => {
      withTextarea((ta) => {
        const start = ta.selectionStart
        const end = ta.selectionEnd
        const text = chatInput
        const selected = text.slice(start, end)
        const middle = selected.length ? selected : 'text'
        const insertion = before + middle + after
        const next = text.slice(0, start) + insertion + text.slice(end)
        setChatInput(next)
        requestAnimationFrame(() => {
          ta.focus()
          if (selected.length) {
            ta.setSelectionRange(start + before.length, start + before.length + middle.length)
          } else {
            const i = start + before.length
            ta.setSelectionRange(i, i + middle.length)
          }
        })
      })
    },
    [chatInput, withTextarea],
  )

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isAiThinking || !contract?.id) return

    const userMessage = chatInput.trim()
    setChatInput('')
    setChatMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setIsAiThinking(true)

    try {
      let response
      if (isProposal) {
        response = await proposalsApi.updateAI(contract.id, userMessage)
      } else {
        response = await commerceApi.aiEditContract(effectiveProjectId, contract.id, userMessage)
      }

      const data = response?.data ?? response

      // Handle proposals API: returns { proposal }
      const proposalData = data?.proposal
      if (proposalData) {
        const updatedContract = {
          ...contract,
          mdx_content: proposalData.mdx_content,
          mdxContent: proposalData.mdx_content,
          sections_json: proposalData.sections_json,
          sectionsJson: proposalData.sections_json,
          total_amount: proposalData.total_amount,
          totalAmount: proposalData.total_amount,
          payment_terms: proposalData.payment_terms,
          paymentTerms: proposalData.payment_terms,
          timeline: proposalData.timeline,
        }
        onContractChange?.(updatedContract)
        setHasUnsavedChanges(false)
        onHasUnsavedChanges?.(false)
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data?.message || "I've made those changes.",
          },
        ])
        return
      }

      // Handle commerce contracts API: returns updatedContent, updatedPrice, etc.
      const hasChanges =
        data?.updatedContent ||
        data?.updatedPrice !== undefined ||
        data?.updatedPaymentTerms ||
        data?.updatedTimeline

      if (hasChanges) {
        const updatedContract = { ...contract }
        if (data.updatedContent) {
          updatedContract.mdxContent = data.updatedContent
          updatedContract.mdx_content = data.updatedContent
        }
        if (data.updatedPrice !== undefined) {
          updatedContract.totalAmount = data.updatedPrice
          updatedContract.total_amount = data.updatedPrice
        }
        if (data.updatedPaymentTerms) {
          updatedContract.paymentTerms = data.updatedPaymentTerms
          updatedContract.payment_terms = data.updatedPaymentTerms
        }
        if (data.updatedTimeline) {
          updatedContract.timeline = data.updatedTimeline
        }
        onContractChange?.(updatedContract)
        const unsaved = !data?.contract
        setHasUnsavedChanges(unsaved)
        onHasUnsavedChanges?.(unsaved)
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data?.message || "I've made those changes. Here's the updated content.",
          },
        ])
      } else if (data?.message) {
        setChatMessages((prev) => [...prev, { role: 'assistant', content: data.message }])
      }
    } catch (error) {
      console.error('AI edit error:', error)
      const errMsg =
        error?.response?.data?.message ||
        error?.message ||
        "Sorry, I encountered an error. Please try again or describe your changes differently."
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: errMsg },
      ])
    } finally {
      setIsAiThinking(false)
    }
  }

  const handleSave = () => {
    if (!hasUnsavedChanges || !contract) return
    onSave?.(contract)
    setHasUnsavedChanges(false)
    onHasUnsavedChanges?.(false)
  }

  if (!contract) return null

  return (
    <div className="flex flex-col h-full min-w-0 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-[var(--glass-border)]">
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            <EchoLogo size={24} animated={false} isPulsing={false} />
          </div>
          <div>
            <span className="font-medium text-[var(--text-primary)]">Echo AI Editor</span>
            <p className="text-xs text-[var(--text-tertiary)]">Ask me to make changes</p>
          </div>
        </div>
      </div>

      <div className="p-3 border-b border-[var(--glass-border)]">
        <p className="text-xs text-[var(--text-tertiary)] mb-2">Quick actions:</p>
        <div className="flex flex-wrap gap-1">
          {QUICK_ACTIONS.map((action, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setChatInput(action.prompt)}
              className="px-2 py-1 text-xs rounded-full bg-[var(--surface-tertiary)] text-[var(--text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--brand-primary)_14%,transparent)] hover:text-[var(--brand-primary)]"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0 min-w-0 max-w-full overflow-x-hidden p-4">
        <div className="space-y-4 min-w-0">
          {chatMessages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex gap-2 w-full min-w-0',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {msg.role === 'assistant' && (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  <EchoLogo size={18} animated={false} isPulsing={false} />
                </div>
              )}
              <div
                className={cn(
                  'min-w-0 max-w-full overflow-x-auto overflow-y-hidden px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]',
                  msg.role === 'user' && 'break-all',
                  msg.role === 'user'
                    ? 'max-w-[min(24rem,calc(100vw-3rem))] bg-[var(--brand-primary)] text-white rounded-br-sm'
                    : 'max-w-[calc(100%-2.25rem)] bg-[var(--surface-tertiary)] text-[var(--text-primary)] rounded-bl-sm'
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isAiThinking && (
            <div className="flex gap-2 w-full min-w-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <EchoLogo size={18} animated={false} isPulsing={false} />
              </div>
              <div className="bg-[var(--surface-tertiary)] px-4 py-2 rounded-2xl rounded-bl-sm">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--brand-primary)' }} />
                  <span className="text-sm text-[var(--text-secondary)]">Making changes...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-[var(--glass-border)] space-y-2">
        {hasUnsavedChanges && (
          <Button
            size="sm"
            onClick={handleSave}
            className="w-full bg-[var(--brand-primary)] hover:opacity-90 text-white"
          >
            Save Changes
          </Button>
        )}
        <TooltipProvider delayDuration={300}>
          <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-2 space-y-2">
            <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--glass-border)]/80 pb-2 mb-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
                    disabled={isAiThinking}
                    onClick={() => wrapSelection('**', '**')}
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Bold (**text**)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
                    disabled={isAiThinking}
                    onClick={() => insertAtCursor('\n## ')}
                  >
                    <Heading2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Section heading</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
                    disabled={isAiThinking}
                    onClick={() => insertAtCursor('\n- ')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Bullet list</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
                    disabled={isAiThinking}
                    onClick={() => insertAtCursor('\n1. ')}
                  >
                    <ListOrdered className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Numbered list</TooltipContent>
              </Tooltip>
            </div>
            <div className="flex gap-2 items-end min-w-0">
              <Textarea
                ref={chatInputRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendChatMessage()
                  }
                }}
                placeholder="Describe edits in detail. Use the toolbar for structure, or paste notes. Enter to send · Shift+Enter for newline."
                disabled={isAiThinking}
                rows={5}
                className="flex-1 min-w-0 min-h-[7.5rem] max-h-[min(40vh,280px)] resize-y text-sm leading-relaxed border-0 bg-transparent shadow-none focus-visible:ring-0 px-2 py-1.5"
              />
              <Button
                type="button"
                size="icon"
                onClick={sendChatMessage}
                disabled={!chatInput.trim() || isAiThinking}
                className="h-10 w-10 shrink-0 text-white hover:opacity-90 border-0"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </TooltipProvider>
      </div>
    </div>
  )
}
