// src/components/ContractEditorWithAI.jsx
/**
 * Contract Editor with AI Chat
 * 
 * Full-featured contract editor with AI assistant for making changes.
 * Used within Commerce module for editing contracts/proposals with Echo AI.
 * 
 * Features:
 * - Live preview of contract content
 * - AI chat panel for edits (powered by Signal)
 * - Quick action buttons for common edits
 * - Analytics overlay (for sent contracts)
 */
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft,
  Bot, 
  Send, 
  X, 
  Check, 
  Loader2, 
  MessageSquare,
  Edit3,
  Eye,
  Sparkles,
  ExternalLink,
  BarChart2,
  Timer,
  MousePointer,
  Activity,
  DollarSign,
  Calendar,
  FileText,
  Save
} from 'lucide-react'
import ProposalView from './proposals/ProposalView'
import { commerceApi, proposalsApi } from '@/lib/sonor-api'
import useAuthStore from '@/lib/auth-store'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

// Analytics Summary Component
function AnalyticsStat({ icon: Icon, label, value, subValue }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-[var(--surface-secondary)] rounded-lg">
      <div className="p-2 bg-[var(--brand-primary)]/10 rounded-lg">
        <Icon className="w-4 h-4 text-[var(--brand-primary)]" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-[var(--text-tertiary)]">{label}</p>
        <p className="text-lg font-semibold text-[var(--text-primary)]">{value}</p>
        {subValue && (
          <p className="text-xs text-[var(--text-tertiary)]">{subValue}</p>
        )}
      </div>
    </div>
  )
}

export default function ContractEditorWithAI({ 
  contract, 
  projectId,
  onBack, 
  onSave,
  isProposal = false  // Flag for Sonor proposals vs client contracts
}) {
  const { currentProject } = useAuthStore()
  const effectiveProjectId = projectId || currentProject?.id

  // State
  const [currentContract, setCurrentContract] = useState(contract)
  const [showChat, setShowChat] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [analytics, setAnalytics] = useState(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      content: `I'm your ${isProposal ? 'proposal' : 'contract'} assistant! Tell me what you'd like to change - pricing, wording, sections, or anything else.`
    }
  ])
  const [chatInput, setChatInput] = useState('')
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const chatEndRef = useRef(null)

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Fetch analytics when panel opens
  useEffect(() => {
    if (showAnalytics && !analytics && currentContract?.id) {
      fetchAnalytics()
    }
  }, [showAnalytics, currentContract?.id])

  const fetchAnalytics = async () => {
    if (!currentContract?.id) return
    setLoadingAnalytics(true)
    try {
      if (isProposal) {
        const response = await proposalsApi.getAnalytics(currentContract.id)
        setAnalytics(response.data?.analytics || response.data)
      }
      // TODO: Add contract analytics endpoint
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
    } finally {
      setLoadingAnalytics(false)
    }
  }

  // Send chat message to AI
  const sendChatMessage = async () => {
    if (!chatInput.trim() || isAiThinking) return

    const userMessage = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsAiThinking(true)

    try {
      let response
      
      if (isProposal) {
        // Use proposals API for Sonor proposals
        response = await proposalsApi.updateAI(currentContract.id, userMessage)
      } else {
        // Use commerce contracts API for client contracts
        response = await commerceApi.aiEditContract(effectiveProjectId, currentContract.id, userMessage)
      }

      const data = response.data

      // Check if any changes were made
      const hasChanges = data.updatedContent || data.updatedPrice || 
                         data.updatedPaymentTerms || data.updatedTimeline

      if (hasChanges) {
        // AI made changes - update local state
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: data.message || "I've made those changes. Here's the updated content."
        }])
        
        // Build updated contract object
        const updatedContract = { ...currentContract }
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
        
        setCurrentContract(updatedContract)
        setHasUnsavedChanges(true)
        
        // If the API already saved, mark as saved
        if (data.contract) {
          setCurrentContract(data.contract)
          setHasUnsavedChanges(false)
        }
      } else if (data.message) {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: data.message
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

  // Save changes
  const handleSave = async () => {
    if (!hasUnsavedChanges) return
    
    setIsSaving(true)
    try {
      if (isProposal) {
        await proposalsApi.update(currentContract.id, {
          mdx_content: currentContract.mdxContent || currentContract.mdx_content,
          total_amount: currentContract.totalAmount || currentContract.total_amount,
          payment_terms: currentContract.paymentTerms || currentContract.payment_terms,
          timeline: currentContract.timeline
        })
      } else {
        await commerceApi.updateContract(effectiveProjectId, currentContract.id, {
          mdx_content: currentContract.mdxContent || currentContract.mdx_content,
          total_amount: currentContract.totalAmount || currentContract.total_amount,
          payment_terms: currentContract.paymentTerms || currentContract.payment_terms,
          timeline: currentContract.timeline
        })
      }
      setHasUnsavedChanges(false)
      toast.success('Changes saved successfully')
      onSave?.(currentContract)
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  // Quick action buttons for common edits
  const quickActions = [
    { label: 'Adjust price', prompt: 'Change the price to ' },
    { label: 'Change payment terms', prompt: 'Change the payment terms to 50% upfront and 50% on completion' },
    { label: 'Update timeline', prompt: 'Change the timeline to ' },
    { label: 'Simplify language', prompt: 'Simplify the language and make it more concise' },
    { label: 'Add detail', prompt: 'Add more detail about ' },
  ]

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '0s'
    if (seconds < 60) return `${Math.round(seconds)}s`
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }

  const hasBeenViewed = currentContract?.status !== 'draft' && (
    currentContract?.viewed_at || 
    currentContract?.viewedAt ||
    (analytics?.summary?.totalViews > 0)
  )

  if (!currentContract) return null

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar */}
      <div className="sticky top-0 z-40 bg-[var(--surface-primary)]/95 backdrop-blur border-b border-[var(--border-primary)]">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button onClick={onBack} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="h-6 w-px bg-[var(--border-primary)]" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-[var(--text-primary)] line-clamp-1">
                  {currentContract.title || 'Untitled'}
                </h1>
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="text-amber-600 border-amber-200">
                    Unsaved
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
                {(currentContract.recipient_name || currentContract.contact?.name) && (
                  <span>{currentContract.recipient_name || currentContract.contact?.name}</span>
                )}
                <span>•</span>
                <Badge variant="outline" className="text-xs">
                  {currentContract.status || 'draft'}
                </Badge>
                {(currentContract.total_amount || currentContract.totalAmount) && (
                  <>
                    <span>•</span>
                    <span className="font-medium">
                      ${parseFloat(currentContract.total_amount || currentContract.totalAmount || 0).toLocaleString()}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasBeenViewed && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAnalytics(!showAnalytics)}
              >
                <BarChart2 className="w-4 h-4 mr-2" />
                {showAnalytics ? 'Hide' : 'Show'} Analytics
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChat(!showChat)}
              className={cn(showChat && 'bg-purple-500/10 border-purple-500')}
            >
              <Bot className="w-4 h-4 mr-2" />
              AI Editor
            </Button>

            {hasUnsavedChanges && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            )}

            {currentContract.slug && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/p/${currentContract.slug}`, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Preview
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Analytics Panel (left) */}
        {showAnalytics && hasBeenViewed && (
          <div className="w-80 border-r border-[var(--border-primary)] bg-[var(--surface-secondary)] p-4 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-[var(--brand-primary)]" />
                <h3 className="font-semibold text-[var(--text-primary)]">Analytics</h3>
              </div>

              {loadingAnalytics ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-primary)]" />
                </div>
              ) : analytics ? (
                <div className="space-y-3">
                  <AnalyticsStat
                    icon={Eye}
                    label="Total Views"
                    value={analytics.summary?.totalViews || 0}
                    subValue={`${analytics.summary?.uniqueViews || 0} unique`}
                  />
                  <AnalyticsStat
                    icon={Timer}
                    label="Avg. Time on Page"
                    value={formatDuration(analytics.summary?.avgTimeOnPage || 0)}
                  />
                  <AnalyticsStat
                    icon={MousePointer}
                    label="Avg. Scroll Depth"
                    value={`${Math.round(analytics.summary?.avgScrollDepth || 0)}%`}
                  />
                  <AnalyticsStat
                    icon={Activity}
                    label="Engagement Score"
                    value={analytics.summary?.engagementScore || 'N/A'}
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <Eye className="w-8 h-8 mx-auto mb-2 text-[var(--text-tertiary)]" />
                  <p className="text-sm text-[var(--text-tertiary)]">
                    No analytics data yet
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto py-8 px-6">
          <div className="max-w-4xl mx-auto">
            <ProposalView 
              proposal={{
                ...currentContract,
                mdxContent: currentContract.mdxContent || currentContract.mdx_content,
                totalAmount: currentContract.totalAmount || currentContract.total_amount
              }} 
              isPublicView={false}
              showSignature={false}
            />
          </div>
        </div>

        {/* AI Chat Panel (right) */}
        {showChat && (
          <div className="w-96 flex flex-col border-l border-[var(--glass-border)] bg-[var(--surface-secondary)]">
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
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-50"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}
    </div>
  )
}
