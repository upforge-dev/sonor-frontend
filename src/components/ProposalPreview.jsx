// src/components/ProposalPreview.jsx
/**
 * Proposal Preview with AI Chat
 * 
 * Shows a live preview of the generated proposal with:
 * - Floating AI chat button for edits
 * - Approve/Send flow
 * - Edit capabilities
 */
import React, { useState, useRef, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'
import { 
  Bot, 
  Send, 
  X, 
  Check, 
  Loader2, 
  MessageSquare,
  Edit3,
  Eye,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Mail,
  ExternalLink,
  Minimize2,
  Maximize2
} from 'lucide-react'
import { proposalsApi } from '../lib/sonor-api'
import { cn } from '../lib/utils'

export default function ProposalPreview({
  proposal,
  isOpen,
  onClose,
  onApprove,
  onEdit,
  onSend
}) {
  const [showChat, setShowChat] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      content: "I'm your proposal assistant! Tell me what you'd like to change - pricing, wording, sections, or anything else."
    }
  ])
  const [chatInput, setChatInput] = useState('')
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const chatEndRef = useRef(null)

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Send chat message to AI
  const sendChatMessage = async () => {
    if (!chatInput.trim() || isAiThinking) return

    const userMessage = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsAiThinking(true)

    try {
      const response = await proposalsApi.updateAI(proposal.id, userMessage)

      // Check if any changes were made
      const hasChanges = response.data.updatedContent || response.data.updatedPrice || 
                         response.data.updatedPaymentTerms || response.data.updatedTimeline ||
                         response.data.updatedValidUntil

      if (hasChanges) {
        // AI made changes
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: response.data.message || "I've made those changes. Here's the updated proposal."
        }])
        
        // Build updated proposal object
        const updatedProposal = { ...proposal }
        if (response.data.updatedContent) {
          updatedProposal.mdxContent = response.data.updatedContent
        }
        if (response.data.updatedPrice) {
          updatedProposal.totalAmount = response.data.updatedPrice
        }
        if (response.data.updatedPaymentTerms) {
          updatedProposal.paymentTerms = response.data.updatedPaymentTerms
          updatedProposal.payment_terms = response.data.updatedPaymentTerms
        }
        if (response.data.updatedTimeline) {
          updatedProposal.timeline = response.data.updatedTimeline
        }
        if (response.data.updatedValidUntil) {
          updatedProposal.validUntil = response.data.updatedValidUntil
          updatedProposal.valid_until = response.data.updatedValidUntil
        }
        
        // Trigger preview refresh
        if (onEdit) {
          onEdit(updatedProposal)
        }
      } else if (response.data.message) {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: response.data.message
        }])
      }
    } catch (error) {
      console.error('AI edit error:', error)
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I encountered an error. Please try again or describe your changes differently."
      }])
    } finally {
      setIsAiThinking(false)
    }
  }

  // Handle approve and proceed to send
  const handleApprove = () => {
    if (onApprove) {
      onApprove(proposal)
    }
  }

  // Quick action buttons for common edits
  const quickActions = [
    { label: 'Adjust price', prompt: 'Change the price to ' },
    { label: 'Change payment terms', prompt: 'Change the payment terms to 50% upfront and 50% on completion' },
    { label: 'Shorten timeline', prompt: 'Reduce the timeline to ' },
    { label: 'Add urgency', prompt: 'Add more urgency triggers and a limited-time offer' },
    { label: 'Simplify language', prompt: 'Simplify the language and make it more concise' },
  ]

  if (!proposal) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className={cn(
        "flex flex-col overflow-hidden transition-all duration-300",
        isExpanded 
          ? "max-w-[95vw] h-[95vh]" 
          : "max-w-5xl max-h-[90vh]"
      )}>
        <DialogHeader className="flex-shrink-0 pb-4 border-b border-[var(--glass-border)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg">{proposal.title}</DialogTitle>
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <Badge variant="secondary" className="text-xs">
                    {proposal.status || 'draft'}
                  </Badge>
                  <span>•</span>
                  <span>${parseFloat(proposal.totalAmount || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/p/${proposal.slug}`, '_blank')}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open Full
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden gap-4">
          {/* Proposal Preview */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-6 prose prose-sm dark:prose-invert max-w-none">
                {/* Render MDX content preview */}
                {proposal.mdxContent ? (
                  <div 
                    className="proposal-preview"
                    dangerouslySetInnerHTML={{ 
                      __html: convertMdxToHtml(proposal.mdxContent) 
                    }}
                  />
                ) : (
                  <div className="text-center py-12 text-[var(--text-tertiary)]">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Proposal content preview</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Bottom Action Bar */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-t border-[var(--glass-border)] bg-[var(--surface-secondary)]">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setShowChat(true)}
                  className="gap-2"
                >
                  <Bot className="w-4 h-4" />
                  AI Edits
                </Button>
                <Button 
                  onClick={handleApprove}
                  className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                >
                  <Check className="w-4 h-4" />
                  Approve & Send
                </Button>
              </div>
            </div>
          </div>

          {/* AI Chat Panel */}
          {showChat && (
            <div className="w-96 flex flex-col border-l border-[var(--glass-border)] bg-[var(--surface-secondary)]">
              <div className="flex items-center justify-between p-4 border-b border-[var(--glass-border)]">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-purple-500" />
                  <span className="font-medium">AI Editor</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowChat(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Quick Actions */}
              <div className="p-3 border-b border-[var(--glass-border)]">
                <p className="text-xs text-[var(--text-tertiary)] mb-2">Quick actions:</p>
                <div className="flex flex-wrap gap-1">
                  {quickActions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => setChatInput(action.prompt)}
                      className="px-2 py-1 text-xs rounded-full bg-[var(--surface-tertiary)] text-[var(--text-secondary)] hover:bg-purple-500/20 hover:text-purple-600 transition-colors"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex gap-2",
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
                          "max-w-[80%] px-3 py-2 rounded-2xl text-sm",
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
                        <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              {/* Chat Input */}
              <div className="p-3 border-t border-[var(--glass-border)]">
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
          )}
        </div>

        {/* Floating AI Chat Button (when chat is closed) */}
        {!showChat && (
          <button
            onClick={() => setShowChat(true)}
            className="absolute bottom-20 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
          >
            <MessageSquare className="w-6 h-6" />
          </button>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Simple MDX to HTML converter for preview
function convertMdxToHtml(mdxContent) {
  if (!mdxContent) return ''
  
  return mdxContent
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Lists
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)\n(?=<li>)/g, '$1')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gim, (match) => {
      if (match.startsWith('<')) return match
      return `<p>${match}</p>`
    })
    // Clean up
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<[hul])/g, '$1')
    .replace(/(<\/[hul][^>]*>)<\/p>/g, '$1')
}
