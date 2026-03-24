// src/components/proposals/ProposalAIEditorPanel.jsx
/**
 * Proposal AI Editor Panel - Right sidebar AI chat for proposal/contract editing
 * Renders in ModuleLayout's rightSidebar when editing a proposal.
 */
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bot, Send, Loader2 } from 'lucide-react'
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
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-[var(--glass-border)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
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
              className="px-2 py-1 text-xs rounded-full bg-[var(--surface-tertiary)] text-[var(--text-secondary)] hover:bg-purple-500/20 hover:text-purple-600 transition-colors"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {chatMessages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex gap-2',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-purple-500" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[80%] px-3 py-2 rounded-2xl text-sm',
                  msg.role === 'user'
                    ? 'bg-[var(--brand-primary)] text-white rounded-br-sm'
                    : 'bg-[var(--surface-tertiary)] text-[var(--text-primary)] rounded-bl-sm'
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isAiThinking && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-purple-500" />
              </div>
              <div className="bg-[var(--surface-tertiary)] px-4 py-2 rounded-2xl rounded-bl-sm">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
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
            disabled={isSaving}
            className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Save Changes
          </Button>
        )}
        <div className="flex gap-2">
          <Input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
            placeholder="Describe changes..."
            className="flex-1"
            disabled={isAiThinking}
          />
          <Button
            size="icon"
            onClick={sendChatMessage}
            disabled={!chatInput.trim() || isAiThinking}
            className="bg-purple-500 hover:bg-purple-600"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
