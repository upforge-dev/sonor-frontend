// src/components/SendProposalDialog.jsx
/**
 * Send Proposal Dialog
 * 
 * Email composition with:
 * - Client email display
 * - Custom subject line
 * - Personal message
 * - Email preview
 * - Sends magic link in branded email
 */
import React, { useState, useMemo, useRef, useCallback } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Mail, 
  Send, 
  Loader2,
  User,
  Building2,
  FileText,
  Eye,
  Edit3,
  Check,
  DollarSign,
  Calendar,
  Sparkles,
  Copy,
  ExternalLink,
  X,
  Plus,
  Users
} from 'lucide-react'
import { proposalsApi } from '@/lib/portal-api'
import { cn } from '@/lib/utils'

export default function SendProposalDialog({
  proposal,
  client,
  isOpen,
  onClose,
  onSuccess
}) {
  const [activeTab, setActiveTab] = useState('compose')
  const [isSending, setIsSending] = useState(false)
  const [recipients, setRecipients] = useState(client?.email ? [client.email] : [])
  const [newRecipient, setNewRecipient] = useState('')
  const [recipientError, setRecipientError] = useState('')
  const inputRef = useRef(null)
  const [emailData, setEmailData] = useState({
    subject: `Your Proposal from Upforge: ${proposal?.title || ''}`,
    personalMessage: ''
  })

  // Validate email format
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  // Add a recipient
  const addRecipient = useCallback((email) => {
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) return
    
    if (!isValidEmail(trimmedEmail)) {
      setRecipientError('Please enter a valid email address')
      return
    }
    
    if (recipients.includes(trimmedEmail)) {
      setRecipientError('This email is already added')
      return
    }
    
    setRecipients(prev => [...prev, trimmedEmail])
    setNewRecipient('')
    setRecipientError('')
  }, [recipients])

  // Remove a recipient
  const removeRecipient = (email) => {
    setRecipients(prev => prev.filter(e => e !== email))
  }

  // Handle key press in input
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      e.preventDefault()
      addRecipient(newRecipient)
    } else if (e.key === 'Backspace' && !newRecipient && recipients.length > 0) {
      // Remove last recipient on backspace if input is empty
      setRecipients(prev => prev.slice(0, -1))
    }
  }

  // Handle paste (for pasting multiple emails)
  const handlePaste = (e) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text')
    // Split by comma, semicolon, space, or newline
    const emails = pastedText.split(/[,;\s\n]+/).filter(Boolean)
    emails.forEach(email => addRecipient(email))
  }

  // Generate default subject
  useMemo(() => {
    if (proposal?.title && client?.name) {
      setEmailData(prev => ({
        ...prev,
        subject: `${client.name.split(' ')[0]}, your custom proposal is ready`,
        personalMessage: `Hi ${client.name.split(' ')[0]},\n\nI've put together a custom proposal for you based on our conversation. This outlines exactly how we can help ${client.company || 'your business'} achieve your goals.\n\nTake a look when you get a chance - I'm confident you'll love what you see.\n\nLooking forward to working together!`
      }))
    }
    // Initialize recipients with client email
    if (client?.email && !recipients.includes(client.email)) {
      setRecipients([client.email])
    }
  }, [proposal, client])

  // Handle send
  const handleSend = async () => {
    if (recipients.length === 0 || !proposal?.id) return

    setIsSending(true)
    try {
      const response = await proposalsApi.send(proposal.id, {
        recipients: recipients,
        subject: emailData.subject,
        personalMessage: emailData.personalMessage
      })

      if (response.data.success) {
        onSuccess?.(response.data)
        onClose?.()
      }
    } catch (error) {
      console.error('Failed to send proposal:', error)
      alert('Failed to send: ' + (error.response?.data?.error || error.message))
    } finally {
      setIsSending(false)
    }
  }

  // Email preview HTML
  const emailPreviewHtml = useMemo(() => {
    const proposalUrl = `https://portal.uptrademedia.com/p/${proposal?.slug}`
    const validUntilFormatted = proposal?.validUntil 
      ? new Date(proposal.validUntil).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : null
    const daysLeft = proposal?.validUntil 
      ? Math.ceil((new Date(proposal.validUntil) - new Date()) / (1000 * 60 * 60 * 24))
      : null
    const recipientName = client?.name?.split(' ')[0] || ''
    const recipientEmail = recipients[0] || 'recipient@email.com'
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Proposal is Ready</title>
  <style type="text/css">
    /* Mobile Styles */
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .stack-column { display: block !important; width: 100% !important; }
      .stack-column-center { display: block !important; width: 100% !important; text-align: center !important; }
      .mobile-padding { padding: 24px 20px !important; }
      .mobile-padding-header { padding: 32px 20px 24px !important; }
      .mobile-hide { display: none !important; }
      .mobile-center { text-align: center !important; }
      .mobile-full-width { width: 100% !important; padding-right: 0 !important; padding-bottom: 16px !important; }
      .mobile-font-lg { font-size: 22px !important; }
      .mobile-font-xl { font-size: 24px !important; }
      .cta-button { padding: 14px 32px !important; font-size: 15px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  
  <!-- Wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        
        <!-- Email Container -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td align="center" class="mobile-padding-header" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 40px 32px;">
              <img src="https://upforge.io/logo.png" alt="Upforge" width="140" style="display: block; margin-bottom: 20px; max-width: 140px; height: auto;" />
              <h1 class="mobile-font-lg" style="margin: 0; color: #94a3b8; font-size: 26px; font-weight: 700; line-height: 1.3;">Your Proposal is Ready</h1>
              <p style="margin: 10px 0 0; color: #94a3b8; font-size: 15px; line-height: 1.5;">A custom proposal prepared just for you</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td class="mobile-padding" style="padding: 40px;">
              
              ${emailData.personalMessage ? `
              <!-- Personal Message -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 28px;">
                <tr>
                  <td style="background-color: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 8px; padding: 20px;">
                    <p style="margin: 0; color: #166534; font-size: 15px; line-height: 1.6;">${emailData.personalMessage.replace(/\n/g, '<br>')}</p>
                  </td>
                </tr>
              </table>
              ` : recipientName ? `
              <!-- Greeting -->
              <p style="margin: 0 0 16px; color: #1f2937; font-size: 16px; line-height: 1.6;">Hi ${recipientName},</p>
              <p style="margin: 0 0 28px; color: #4b5563; font-size: 15px; line-height: 1.6;">We've put together a custom proposal based on our conversation. Click below to review the details and take the next step.</p>
              ` : `
              <p style="margin: 0 0 28px; color: #4b5563; font-size: 15px; line-height: 1.6;">We've prepared a custom proposal for you. Click below to review the details.</p>
              `}
              
              <!-- Proposal Card -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 24px;">
                    <h2 class="mobile-font-lg" style="margin: 0 0 20px; color: #0f172a; font-size: 20px; font-weight: 700; line-height: 1.3;">${proposal?.title || 'Your Custom Proposal'}</h2>
                    
                    <!-- Meta Info Row -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td class="mobile-full-width" width="50%" valign="top" style="padding-right: 16px;">
                          <p style="margin: 0 0 4px; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Investment</p>
                          <p class="mobile-font-xl" style="margin: 0; color: #059669; font-size: 28px; font-weight: 700;">$${parseFloat(proposal?.totalAmount ?? proposal?.total_amount ?? 0).toLocaleString()}</p>
                        </td>
                        ${validUntilFormatted ? `
                        <td class="mobile-full-width" width="50%" valign="top">
                          <p style="margin: 0 0 4px; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Valid Until</p>
                          <p style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 600;">${validUntilFormatted}</p>
                        </td>
                        ` : ''}
                      </tr>
                    </table>
                    
                    ${daysLeft && daysLeft <= 7 && daysLeft > 0 ? `
                    <!-- Urgency Banner -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 20px;">
                      <tr>
                        <td align="center" style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 14px 20px;">
                          <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">⏰ Only ${daysLeft} day${daysLeft > 1 ? 's' : ''} left to accept this offer</p>
                        </td>
                      </tr>
                    </table>
                    ` : ''}
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${proposalUrl}" target="_blank" class="cta-button" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 700; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.35);">View Your Proposal →</a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; color: #64748b; font-size: 13px;">Click the button above to view the full proposal</p>
                  </td>
                </tr>
              </table>
              
              <!-- Divider -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 28px 0;">
                <tr>
                  <td style="border-top: 1px solid #e2e8f0;"></td>
                </tr>
              </table>
              
              <!-- Help Text -->
              <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6; text-align: center;">Questions? Simply reply to this email or give us a call.</p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td class="mobile-padding" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 28px 40px; text-align: center;">
              <p style="margin: 0 0 4px; color: #0f172a; font-size: 15px; font-weight: 700;">Upforge</p>
              <p style="margin: 0 0 16px; color: #64748b; font-size: 13px;">Premium Digital Marketing & Web Design</p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">This email was sent to ${recipientEmail}</p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>`
  }, [proposal, emailData, client, recipients])

  if (!proposal) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4 border-b border-[var(--glass-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle>Send Proposal</DialogTitle>
              <DialogDescription>
                {client?.name} will receive a magic link to view and sign
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="mx-4 mt-4 grid w-fit grid-cols-2">
            <TabsTrigger value="compose" className="gap-2">
              <Edit3 className="w-4 h-4" />
              Compose
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="w-4 h-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Compose Tab */}
            <TabsContent value="compose" className="mt-0 space-y-6">
              {/* Recipients */}
              <div className="p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--glass-border)]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-medium">
                    {client?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{client?.name}</p>
                    <p className="text-sm text-[var(--text-secondary)]">{client?.company}</p>
                  </div>
                  <Badge variant="secondary" className="ml-auto">
                    {client?.type === 'prospect' ? 'Prospect' : 'Client'}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[var(--text-secondary)] flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Send to {recipients.length > 1 ? `(${recipients.length} recipients)` : ''}
                    </Label>
                  </div>
                  
                  {/* Recipients tags container */}
                  <div 
                    className="min-h-[46px] p-2 rounded-lg border border-[var(--glass-border)] glass-bg flex flex-wrap gap-2 cursor-text"
                    onClick={() => inputRef.current?.focus()}
                  >
                    {recipients.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-primary)]/20"
                      >
                        <Mail className="w-3 h-3" />
                        {email}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeRecipient(email)
                          }}
                          className="ml-0.5 hover:bg-[var(--brand-primary)]/20 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    
                    <input
                      ref={inputRef}
                      type="email"
                      value={newRecipient}
                      onChange={(e) => {
                        setNewRecipient(e.target.value)
                        setRecipientError('')
                      }}
                      onKeyDown={handleKeyDown}
                      onPaste={handlePaste}
                      onBlur={() => newRecipient && addRecipient(newRecipient)}
                      placeholder={recipients.length === 0 ? 'Enter email addresses...' : 'Add another...'}
                      className="flex-1 min-w-[150px] bg-transparent border-none outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                    />
                  </div>
                  
                  {recipientError && (
                    <p className="text-xs text-red-500">{recipientError}</p>
                  )}
                  
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Press Enter, Tab, or comma to add. Paste multiple emails separated by commas.
                  </p>
                </div>
              </div>

              {/* Proposal Summary */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-purple-500" />
                  <span className="font-medium text-[var(--text-primary)]">Proposal</span>
                </div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">{proposal.title}</h4>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-green-600">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-medium">${parseFloat(proposal.totalAmount ?? proposal.total_amount ?? 0).toLocaleString()}</span>
                  </div>
                  {proposal.validUntil && (
                    <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                      <Calendar className="w-4 h-4" />
                      <span>Valid until {new Date(proposal.validUntil).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label className="text-[var(--text-secondary)]">Subject Line</Label>
                <Input
                  value={emailData.subject}
                  onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                  placeholder="Your proposal from Upforge"
                  className="glass-bg border-[var(--glass-border)]"
                />
              </div>

              {/* Personal Message */}
              <div className="space-y-2">
                <Label className="text-[var(--text-secondary)]">Personal Message (optional)</Label>
                <Textarea
                  value={emailData.personalMessage}
                  onChange={(e) => setEmailData({ ...emailData, personalMessage: e.target.value })}
                  placeholder="Add a personal note to accompany the proposal..."
                  rows={6}
                  className="glass-bg border-[var(--glass-border)] resize-none"
                />
                <p className="text-xs text-[var(--text-tertiary)]">
                  This message will appear at the top of the email before the proposal details.
                </p>
              </div>
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="mt-0">
                <div className="border border-[var(--glass-border)] rounded-xl overflow-hidden">
                <div className="p-3 bg-[var(--surface-secondary)] border-b border-[var(--glass-border)] flex items-center justify-between">
                  <div className="text-sm flex-1">
                    <span className="text-[var(--text-tertiary)]">To:</span>
                    <span className="ml-2 text-[var(--text-primary)]">
                      {recipients.length > 2 
                        ? `${recipients.slice(0, 2).join(', ')} +${recipients.length - 2} more`
                        : recipients.join(', ') || 'No recipients'}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-[var(--text-tertiary)]">Subject:</span>
                    <span className="ml-2 text-[var(--text-primary)]">{emailData.subject}</span>
                  </div>
                </div>
                <iframe
                  srcDoc={emailPreviewHtml}
                  className="w-full h-[400px] bg-white"
                  title="Email Preview"
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <DialogFooter className="flex-shrink-0 pt-4 border-t border-[var(--glass-border)]">
          <div className="flex items-center gap-3 w-full">
            <p className="text-xs text-[var(--text-tertiary)] flex-1">
              <Sparkles className="w-3 h-3 inline mr-1" />
              {recipients.length === 1 
                ? `A magic link will be generated so ${client?.name?.split(' ')[0] || 'the recipient'} can access this proposal without logging in.`
                : `Magic links will be generated for all ${recipients.length} recipients to access this proposal.`}
            </p>
            <Button variant="outline" onClick={onClose} disabled={isSending}>
              Cancel
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={isSending || recipients.length === 0}
              className="gap-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send {recipients.length > 1 ? `to ${recipients.length} Recipients` : 'Proposal'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
