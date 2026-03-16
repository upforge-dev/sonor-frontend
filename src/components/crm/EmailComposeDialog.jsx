/**
 * EmailComposeDialog - CRM Email Composer
 * Send tracked emails from the CRM to prospects/clients
 * Supports Gmail API integration with signature and audit attachments
 */
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Send,
  Loader2,
  Mail,
  User,
  Building2,
  Sparkles,
  Eye,
  FileText,
  Link2,
  ChevronDown,
  Clock,
  Plus,
  X,
  CalendarClock,
  Bell,
  CalendarDays
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/lib/toast'
import { emailApi } from '@/lib/portal-api'
import useAuthStore from '@/lib/auth-store'

// Available "from" mailboxes - Gmail/Google Workspace accounts
// All composed emails go through Gmail API for proper threading & replies
const MAILBOXES = [
  { id: 'ramsey', email: 'hello@sonor.io', name: 'Ramsey Deal' },
  { id: 'hello', email: 'hello@sonor.io', name: 'Sonor' },
]

// Quick templates for common emails
const TEMPLATES = [
  {
    id: 'follow_up',
    name: 'Follow-Up After Call',
    subject: 'Great chatting with you!',
    body: `Hi {{firstName}},

Great speaking with you today! As promised, I wanted to follow up with some more information.

{{customContent}}

Let me know if you have any questions - happy to hop on another call anytime.

Best,
Ramsey`
  },
  {
    id: 'audit_send',
    name: 'Send Audit Results',
    subject: 'Your Website Audit Results',
    body: `Hi {{firstName}},

Thanks for taking the time to chat. As discussed, I've put together a comprehensive audit of {{companyName}}'s website.

{{customContent}}

I'd love to walk you through the findings and discuss how we can improve your site's performance. Would you have 15-20 minutes this week?

Best,
Ramsey`
  },
  {
    id: 'proposal_send',
    name: 'Proposal Follow-Up',
    subject: 'Proposal for {{companyName}}',
    body: `Hi {{firstName}},

Following our conversation, I've prepared a proposal outlining how we can help {{companyName}} achieve your goals.

{{customContent}}

Let me know if you have any questions or if you'd like to discuss any aspects in more detail.

Looking forward to working together!

Best,
Ramsey`
  },
  {
    id: 'schedule_call',
    name: 'Schedule Consultation',
    subject: 'Let\'s chat about {{companyName}}\'s growth',
    body: `Hi {{firstName}},

I'd love to learn more about {{companyName}} and discuss how we might be able to help you achieve your goals.

I've included a link below to book a time that works for you:

{{schedulingLink}}

Looking forward to connecting!

Best,
Ramsey`
  },
  {
    id: 'blank',
    name: 'Blank Email',
    subject: '',
    body: ''
  }
]

export default function EmailComposeDialog({
  open,
  onOpenChange,
  contact,
  projectId, // Project ID for Gmail OAuth
  audits = [], // Available audits for this contact
  proposals = [], // Available proposals for this contact
  defaultSubject = '',
  defaultBody = '',
  onSent
}) {
  const { currentOrg, currentProject } = useAuthStore()
  
  // Use passed projectId or fall back to current project
  const effectiveProjectId = projectId || currentProject?.id
  
  // Schedule Consultation is Sonor only feature
  const isUptradeMedia = currentOrg?.slug === 'uptrade-media' || 
                         currentOrg?.domain === 'sonor.io' || 
                         currentOrg?.org_type === 'agency'
  
  // Filter templates based on org
  const availableTemplates = isUptradeMedia 
    ? TEMPLATES 
    : TEMPLATES.filter(t => t.id !== 'schedule_call')

  const [activeTab, setActiveTab] = useState('compose')
  const [selectedMailbox, setSelectedMailbox] = useState('ramsey')
  const [selectedTemplate, setSelectedTemplate] = useState('blank')
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody] = useState(defaultBody)
  const [isSending, setIsSending] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [selectedAudit, setSelectedAudit] = useState(null) // Audit to attach with magic link
  const [selectedProposal, setSelectedProposal] = useState(null) // Proposal to attach with magic link
  const [includeSchedulingLink, setIncludeSchedulingLink] = useState(false) // Include scheduling button
  const [selectedBookingType, setSelectedBookingType] = useState('discovery-call') // Default booking type
  const [includeSignature, setIncludeSignature] = useState(true)
  
  // Automated follow-up state
  const [enableFollowUps, setEnableFollowUps] = useState(false)
  const [followUps, setFollowUps] = useState([
    { id: 1, daysAfter: 3, subject: '', body: '', enabled: true },
  ])

  // Add a follow-up
  const addFollowUp = () => {
    const lastDays = followUps.length > 0 ? followUps[followUps.length - 1].daysAfter : 0
    setFollowUps([
      ...followUps,
      { 
        id: Date.now(), 
        daysAfter: lastDays + 3, 
        subject: '', 
        body: '', 
        enabled: true 
      }
    ])
  }

  // Remove a follow-up
  const removeFollowUp = (id) => {
    setFollowUps(followUps.filter(f => f.id !== id))
  }

  // Update a follow-up
  const updateFollowUp = (id, field, value) => {
    setFollowUps(followUps.map(f => 
      f.id === id ? { ...f, [field]: value } : f
    ))
  }

  // Generate follow-up content based on original email
  const generateFollowUpContent = (followUpIndex) => {
    const firstName = contact?.name?.split(' ')[0] || 'there'
    const followUpNumber = followUpIndex + 1
    
    const templates = [
      {
        subject: `Re: ${subject}`,
        body: `Hi ${firstName},

Just wanted to follow up on my previous email. I know things get busy, so I wanted to make sure this didn't slip through the cracks.

Let me know if you have any questions or if there's a better time to connect.

Best,
Ramsey`
      },
      {
        subject: `Quick check-in - ${subject}`,
        body: `Hi ${firstName},

I hope you're doing well! I wanted to check in one more time regarding my previous messages.

If you're interested in chatting, I'd love to find a time that works for you. If not, no worries at all - just let me know either way.

Thanks!
Ramsey`
      },
      {
        subject: `Last follow-up: ${subject}`,
        body: `Hi ${firstName},

I wanted to reach out one final time. I understand if now isn't the right time, but I didn't want to miss the opportunity to help.

If you'd like to revisit this in the future, my door is always open. Feel free to reach out anytime.

All the best,
Ramsey`
      }
    ]
    
    const template = templates[Math.min(followUpIndex, templates.length - 1)]
    updateFollowUp(followUps[followUpIndex].id, 'subject', template.subject)
    updateFollowUp(followUps[followUpIndex].id, 'body', template.body)
  }

  // Update fields when contact changes
  useEffect(() => {
    if (contact) {
      setTo(contact.email || '')
    }
  }, [contact])

  // Update fields when defaults change
  useEffect(() => {
    if (defaultSubject) setSubject(defaultSubject)
    if (defaultBody) setBody(defaultBody)
  }, [defaultSubject, defaultBody])

  // Apply template and auto-select relevant attachments
  const applyTemplate = (templateId) => {
    setSelectedTemplate(templateId)
    const template = TEMPLATES.find(t => t.id === templateId)
    if (!template) return

    // Replace variables
    const firstName = contact?.name?.split(' ')[0] || 'there'
    const companyName = contact?.company || 'your company'
    
    let newSubject = template.subject
      .replace('{{firstName}}', firstName)
      .replace('{{companyName}}', companyName)
    
    let newBody = template.body
      .replace(/\{\{firstName\}\}/g, firstName)
      .replace(/\{\{companyName\}\}/g, companyName)
      .replace('{{customContent}}', '')
      .replace('{{auditLink}}', '[Audit link will be inserted]')
      .replace('{{proposalLink}}', '[Proposal link will be inserted]')
      .replace('{{schedulingLink}}', '[📅 Schedule a Call button will be inserted]')

    setSubject(newSubject)
    setBody(newBody)

    // Auto-select most recent audit for audit template
    if (templateId === 'audit_send') {
      const mostRecentAudit = audits.length > 0 
        ? audits.reduce((latest, a) => 
            new Date(a.created_at) > new Date(latest.created_at) ? a : latest
          )
        : null
      setSelectedAudit(mostRecentAudit)
      setSelectedProposal(null)
    }
    // Auto-select most recent proposal for proposal template
    else if (templateId === 'proposal_send') {
      const mostRecentProposal = proposals.length > 0
        ? proposals.reduce((latest, p) => 
            new Date(p.created_at) > new Date(latest.created_at) ? p : latest
          )
        : null
      setSelectedProposal(mostRecentProposal)
      setSelectedAudit(null)
      setIncludeSchedulingLink(false)
    }
    // Auto-enable scheduling link for schedule template
    else if (templateId === 'schedule_call') {
      setIncludeSchedulingLink(true)
      setSelectedBookingType('discovery-call')
      setSelectedAudit(null)
      setSelectedProposal(null)
    }
    // Clear attachments for other templates
    else {
      setSelectedAudit(null)
      setSelectedProposal(null)
      setIncludeSchedulingLink(false)
    }
  }

  // Generate AI suggestion
  const handleAISuggest = async () => {
    if (!contact) return
    
    setIsGeneratingAI(true)
    try {
      const response = await emailApi.generateAIEmail({
        contactId: contact.id,
        context: {
          name: contact.name,
          company: contact.company,
          website: contact.website,
          pipelineStage: contact.pipeline_stage,
          notes: contact.notes
        }
      })
      
      if (response.data.subject) setSubject(response.data.subject)
      if (response.data.body) setBody(response.data.body)
      toast.success('AI suggestion applied')
    } catch (err) {
      console.error('AI suggestion error:', err)
      toast.error('Failed to generate suggestion')
    } finally {
      setIsGeneratingAI(false)
    }
  }

  // Send email via Gmail API
  const handleSend = async () => {
    if (!to || !subject || !body) {
      toast.error('Please fill in all required fields')
      return
    }

    const mailbox = MAILBOXES.find(m => m.id === selectedMailbox)
    if (!mailbox) {
      toast.error('Please select a mailbox')
      return
    }

    setIsSending(true)
    try {
      // Use Gmail API for all composed emails
      const response = await emailApi.sendGmail({
        projectId: effectiveProjectId, // For Gmail OAuth lookup
        contactId: contact?.id,
        to,
        fromEmail: mailbox.email,
        subject,
        content: body,
        auditId: selectedAudit?.id || null, // Include audit magic link if selected
        proposalId: selectedProposal?.id || null, // Include proposal magic link if selected
        includeSchedulingLink, // Include scheduling CTA button
        bookingType: includeSchedulingLink ? selectedBookingType : null, // Booking type for scheduling
        includeSignature, // Pull signature from Gmail settings
        // Include automated follow-ups if enabled
        followUps: enableFollowUps ? followUps.filter(f => f.enabled && f.subject && f.body).map(f => ({
          daysAfter: f.daysAfter,
          subject: f.subject,
          body: f.body,
          cancelOnReply: true // Always cancel if prospect replies
        })) : []
      })

      const followUpCount = enableFollowUps ? followUps.filter(f => f.enabled && f.subject && f.body).length : 0
      toast.success(followUpCount > 0 
        ? `Email sent with ${followUpCount} scheduled follow-up${followUpCount > 1 ? 's' : ''}!` 
        : 'Email sent via Gmail!'
      )
      onSent?.(response.data)
      onOpenChange(false)
      
      // Reset form
      setSubject('')
      setBody('')
      setSelectedTemplate('blank')
      setSelectedAudit(null)
      setSelectedProposal(null)
      setIncludeSchedulingLink(false)
      setSelectedBookingType('discovery-call')
      setEnableFollowUps(false)
      setFollowUps([{ id: 1, daysAfter: 3, subject: '', body: '', enabled: true }])
    } catch (err) {
      console.error('Send error:', err)
      toast.error(err.response?.data?.error || 'Failed to send email')
    } finally {
      setIsSending(false)
    }
  }

  // Build audit link section for preview
  const auditLinkHtml = selectedAudit ? `
    <div style="margin: 24px 0; padding: 16px; background: linear-gradient(135deg, #4bbf39 0%, #39bfb0 100%); border-radius: 12px;">
      <p style="margin: 0 0 12px 0; color: white; font-weight: 600;">📊 Your Website Audit Results</p>
      <a href="[Magic Link]" style="display: inline-block; padding: 10px 20px; background: white; color: #4bbf39; text-decoration: none; border-radius: 8px; font-weight: 600;">View Full Audit Report →</a>
    </div>
  ` : ''

  // Build proposal link section for preview
  const proposalLinkHtml = selectedProposal ? `
    <div style="margin: 24px 0; padding: 16px; background: linear-gradient(135deg, #39bfb0 0%, #4bbf39 100%); border-radius: 12px;">
      <p style="margin: 0 0 12px 0; color: white; font-weight: 600;">📄 Your Custom Proposal</p>
      <p style="margin: 0 0 12px 0; color: rgba(255,255,255,0.9); font-size: 14px;">${selectedProposal.title || 'Project Proposal'}</p>
      <a href="[Magic Link]" style="display: inline-block; padding: 10px 20px; background: white; color: #39bfb0; text-decoration: none; border-radius: 8px; font-weight: 600;">Review Proposal →</a>
    </div>
  ` : ''

  // Build scheduling link section for preview
  const schedulingLinkHtml = includeSchedulingLink ? `
    <div style="margin: 24px 0; padding: 20px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px; text-align: center;">
      <p style="margin: 0 0 12px 0; color: white; font-weight: 600; font-size: 16px;">📅 Ready to chat?</p>
      <p style="margin: 0 0 16px 0; color: rgba(255,255,255,0.9); font-size: 14px;">Book a time that works best for you</p>
      <a href="[Scheduling Link]" style="display: inline-block; padding: 12px 28px; background: white; color: #6366f1; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Schedule a Call →</a>
    </div>
  ` : ''

  // Preview HTML - dark background with light text to simulate email client
  const previewHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <div style="color: #666; font-size: 12px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #e0e0e0;">
        <strong>From:</strong> ${MAILBOXES.find(m => m.id === selectedMailbox)?.name} &lt;${MAILBOXES.find(m => m.id === selectedMailbox)?.email}&gt;<br>
        <strong>To:</strong> ${contact?.name || 'Recipient'} &lt;${to}&gt;<br>
        <strong>Subject:</strong> ${subject}
      </div>
      <div style="white-space: pre-wrap; line-height: 1.6; color: #1a1a1a;">${body}</div>
      ${auditLinkHtml}
      ${proposalLinkHtml}
      ${schedulingLinkHtml}
      ${includeSignature ? `
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e0e0e0; color: #666; font-size: 13px;">
          <em>— Your Gmail signature will appear here —</em>
        </div>
      ` : ''}
    </div>
  `

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-[var(--brand-primary)]" />
            Compose Email
          </DialogTitle>
          <DialogDescription>
            Send a tracked email from the CRM
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="compose">Compose</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="flex-1 overflow-y-auto space-y-4 mt-4">
            {/* From & Template Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From</Label>
                <Select value={selectedMailbox} onValueChange={setSelectedMailbox}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MAILBOXES.map(mailbox => (
                      <SelectItem key={mailbox.id} value={mailbox.id}>
                        <span className="font-medium">{mailbox.name}</span>
                        <span className="text-[var(--text-tertiary)] ml-2">&lt;{mailbox.email}&gt;</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={selectedTemplate} onValueChange={applyTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTemplates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* To */}
            <div className="space-y-2">
              <Label>To</Label>
              <div className="relative">
                <Input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="recipient@example.com"
                  className="pr-24"
                />
                {contact && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                    <User className="h-3 w-3" />
                    {contact.name}
                  </div>
                )}
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Subject</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAISuggest}
                  disabled={isGeneratingAI || !contact}
                  className="h-7 text-xs gap-1.5"
                >
                  {isGeneratingAI ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  AI Suggest
                </Button>
              </div>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject..."
              />
            </div>

            {/* Body */}
            <div className="space-y-2 flex-1">
              <Label>Message</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email..."
                className="min-h-[200px] resize-none"
              />
            </div>

            {/* Attachments & Options */}
            <div className="grid grid-cols-2 gap-4">
              {/* Template-driven Attachment */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Attachment
                </Label>
                
                {/* Show audit selector when audit template is selected */}
                {selectedTemplate === 'audit_send' && (
                  <>
                    <Select 
                      value={selectedAudit?.id || 'none'} 
                      onValueChange={(val) => setSelectedAudit(val === 'none' ? null : audits.find(a => a.id === val))}
                    >
                      <SelectTrigger className="border-[var(--brand-primary)]/50">
                        <SelectValue placeholder="Select audit to attach" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No audit attached</SelectItem>
                        {audits.map(audit => (
                          <SelectItem key={audit.id} value={audit.id}>
                            {audit.target_url ? new URL(audit.target_url).hostname : 'Audit'} 
                            {audit.score_overall ? ` (${audit.score_overall}/100)` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedAudit && (
                      <p className="text-xs text-[var(--brand-primary)] flex items-center gap-1">
                        <Link2 className="h-3 w-3" />
                        Magic link will be generated on send
                      </p>
                    )}
                    {audits.length === 0 && (
                      <p className="text-xs text-amber-500">No audits available for this contact</p>
                    )}
                  </>
                )}

                {/* Show proposal selector when proposal template is selected */}
                {selectedTemplate === 'proposal_send' && (
                  <>
                    <Select 
                      value={selectedProposal?.id || 'none'} 
                      onValueChange={(val) => setSelectedProposal(val === 'none' ? null : proposals.find(p => p.id === val))}
                    >
                      <SelectTrigger className="border-[#6366f1]/50">
                        <SelectValue placeholder="Select proposal to attach" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No proposal attached</SelectItem>
                        {proposals.map(proposal => (
                          <SelectItem key={proposal.id} value={proposal.id}>
                            {proposal.title || 'Untitled Proposal'}
                            {proposal.total_amount ? ` ($${proposal.total_amount.toLocaleString()})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedProposal && (
                      <p className="text-xs text-[#6366f1] flex items-center gap-1">
                        <Link2 className="h-3 w-3" />
                        Magic link will be generated on send
                      </p>
                    )}
                    {proposals.length === 0 && (
                      <p className="text-xs text-amber-500">No proposals available for this contact</p>
                    )}
                  </>
                )}

                {/* Show scheduling link selector when schedule template is selected */}
                {selectedTemplate === 'schedule_call' && (
                  <>
                    <Select 
                      value={selectedBookingType} 
                      onValueChange={setSelectedBookingType}
                    >
                      <SelectTrigger className="border-[#6366f1]/50">
                        <SelectValue placeholder="Select meeting type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="discovery-call">Discovery Call (15 min)</SelectItem>
                        <SelectItem value="strategy-session">Strategy Session (30 min)</SelectItem>
                        <SelectItem value="project-kickoff">Project Kickoff (45 min)</SelectItem>
                        <SelectItem value="audit-review">Audit Review (30 min)</SelectItem>
                        <SelectItem value="quick-chat">Quick Chat (15 min)</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2 pt-1">
                      <Switch 
                        checked={includeSchedulingLink} 
                        onCheckedChange={setIncludeSchedulingLink}
                        id="include-scheduling"
                      />
                      <Label htmlFor="include-scheduling" className="text-sm cursor-pointer">
                        Include "Schedule a Call" button
                      </Label>
                    </div>
                    {includeSchedulingLink && (
                      <p className="text-xs text-[#6366f1] flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        Booking link to app.sonor.io/schedule
                      </p>
                    )}
                  </>
                )}

                {/* Show placeholder for other templates */}
                {selectedTemplate !== 'audit_send' && selectedTemplate !== 'proposal_send' && selectedTemplate !== 'schedule_call' && (
                  <p className="text-sm text-[var(--text-tertiary)] py-2">
                    Select a template to attach magic links or scheduling buttons
                  </p>
                )}
              </div>

              {/* Include Signature */}
              <div className="space-y-2">
                <Label>Gmail Signature</Label>
                <Button
                  type="button"
                  variant={includeSignature ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIncludeSignature(!includeSignature)}
                  className={cn(
                    "w-full justify-start gap-2",
                    includeSignature && "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90"
                  )}
                >
                  {includeSignature ? '✓ Include signature' : 'No signature'}
                </Button>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Uses your Gmail account signature
                </p>
              </div>
            </div>

            {/* Automated Follow-ups Section */}
            <div className="space-y-3 p-4 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-amber-500" />
                  <Label className="text-sm font-medium">Automated Follow-ups</Label>
                </div>
                <Switch
                  checked={enableFollowUps}
                  onCheckedChange={setEnableFollowUps}
                />
              </div>
              
              <p className="text-xs text-[var(--text-tertiary)]">
                <Bell className="h-3 w-3 inline mr-1" />
                Follow-ups are automatically cancelled if the prospect replies
              </p>

              {enableFollowUps && (
                <div className="space-y-3 pt-2">
                  {followUps.map((followUp, index) => (
                    <div 
                      key={followUp.id} 
                      className="p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--surface-primary)] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Follow-up #{index + 1}
                          </Badge>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3 text-[var(--text-tertiary)]" />
                            <Input
                              type="number"
                              min="1"
                              max="30"
                              value={followUp.daysAfter}
                              onChange={(e) => updateFollowUp(followUp.id, 'daysAfter', parseInt(e.target.value) || 1)}
                              className="w-16 h-7 text-xs text-center"
                            />
                            <span className="text-xs text-[var(--text-secondary)]">days after</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => generateFollowUpContent(index)}
                            className="h-7 text-xs gap-1"
                          >
                            <Sparkles className="h-3 w-3" />
                            Generate
                          </Button>
                          {followUps.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFollowUp(followUp.id)}
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <Input
                        placeholder="Follow-up subject..."
                        value={followUp.subject}
                        onChange={(e) => updateFollowUp(followUp.id, 'subject', e.target.value)}
                        className="text-sm"
                      />
                      
                      <Textarea
                        placeholder="Follow-up message..."
                        value={followUp.body}
                        onChange={(e) => updateFollowUp(followUp.id, 'body', e.target.value)}
                        className="min-h-[80px] text-sm resize-none"
                      />
                    </div>
                  ))}
                  
                  {followUps.length < 3 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addFollowUp}
                      className="w-full gap-2"
                    >
                      <Plus className="h-3 w-3" />
                      Add Another Follow-up
                    </Button>
                  )}
                  
                  <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                    ⏰ All follow-ups will be sent from {MAILBOXES.find(m => m.id === selectedMailbox)?.email} and cancelled automatically if {contact?.name?.split(' ')[0] || 'they'} replies to any email in this thread.
                  </p>
                </div>
              )}
            </div>

            {/* Contact Context */}
            {contact && (
              <div className="flex items-center gap-4 p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-sm">
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <User className="h-4 w-4" />
                  <span>{contact.name}</span>
                </div>
                {contact.company && (
                  <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
                    <Building2 className="h-4 w-4" />
                    <span>{contact.company}</span>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="preview" className="flex-1 overflow-y-auto mt-4">
            <div 
              className="border border-[var(--glass-border)] rounded-lg p-4 bg-white min-h-[300px]"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-shrink-0 gap-2 pt-4 border-t border-[var(--glass-border)]">
          <div className="flex-1 text-xs text-[var(--text-tertiary)]">
            Sent via Gmail • Replies go to your inbox
          </div>
          <Button
            onClick={handleSend}
            disabled={isSending || !to || !subject || !body}
            className="gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send via Gmail
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
