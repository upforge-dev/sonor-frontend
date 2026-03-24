/**
 * SystemEmailsTab - Manage transactional/system emails
 * 
 * Displays all system emails (audit, account setup, invoices, etc.)
 * with ability to view, preview, and edit templates.
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Mail,
  Search,
  Eye,
  Edit,
  Copy,
  Check,
  Shield,
  CreditCard,
  FileText,
  FolderKanban,
  Bell,
  Loader2,
  Smartphone,
  Monitor,
  RefreshCw,
  Info,
  Settings,
  Variable,
  Send,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { EmailEditor } from './EmailEditor'
import { 
  SYSTEM_EMAILS, 
  SYSTEM_EMAIL_CATEGORIES,
  getSystemEmailsByCategory,
  getSystemEmailById,
  getSystemEmailCategories 
} from './system-emails-registry'
import { emailApi } from '@/lib/sonor-api'
import usePageContextStore from '@/lib/page-context-store'

// Icon mapping for categories
const CATEGORY_ICONS = {
  all: Mail,
  authentication: Shield,
  audits: Search,
  billing: CreditCard,
  proposals: FileText,
  projects: FolderKanban,
  notifications: Bell
}

// Status colors
const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700 border-green-200',
  draft: 'bg-amber-100 text-amber-700 border-amber-200',
  disabled: 'bg-gray-100 text-gray-500 border-gray-200'
}

// Default email template previews - matches system-email-sender.js defaults
// Defined at module level for use in both preview dialog and full-page editor
const DEFAULT_TEMPLATES = {
  'account-setup-invite': `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="background: linear-gradient(135deg, #4bbf39 0%, #3a9c2d 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Welcome to {{company_name}}!</h1>
      </div>
      <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e5e5; border-top: none;">
        <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi {{first_name}},</p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">You've been invited to join the {{company_name}} client portal. Click the button below to set up your account.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{setup_link}}" style="background: #4bbf39; color: #fff; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Set Up My Account</a>
        </div>
        <p style="color: #666; font-size: 14px;">This link expires in 7 days.</p>
      </div>
    </div>
  `,
  'magic-link-login': `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e5e5; border-radius: 12px; text-align: center;">
        <div style="width: 60px; height: 60px; background: rgba(75, 191, 57, 0.1); border-radius: 50%; margin: 0 auto 20px; line-height: 60px; font-size: 28px;">🔐</div>
        <h1 style="color: #1a1a1a; margin: 0 0 16px; font-size: 24px;">Sign in to {{company_name}}</h1>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">Hi {{first_name}}, click the button below to securely sign in.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{magic_link}}" style="background: #4bbf39; color: #fff; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Sign In →</a>
        </div>
        <p style="color: #999; font-size: 14px;">This link expires in {{expires_in}}.</p>
      </div>
    </div>
  `,
  'audit-complete': `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #f4f4f4; padding: 40px 20px;">
      <div style="background: linear-gradient(135deg, #4bbf39 0%, #39bfb0 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
        <h1 style="color: #ffffff; margin: 0 0 10px; font-size: 28px;">Your Website Audit is Ready! 🎉</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">Hi {{first_name}}, we've completed a comprehensive analysis</p>
      </div>
      <div style="background: #ffffff; padding: 30px; text-align: center; border: 1px solid #e5e5e5; border-top: none;">
        <div style="background: #10b981; color: white; font-size: 64px; font-weight: bold; width: 100px; height: 100px; line-height: 100px; border-radius: 20px; margin: 0 auto 15px;">{{grade}}</div>
        <p style="color: #374151; font-size: 18px; margin: 0; font-weight: 600;">Overall Grade</p>
        <p style="color: #6b7280; font-size: 14px; margin: 8px 0 0;">{{target_url}}</p>
      </div>
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none;">
        <table style="width: 100%; text-align: center;">
          <tr>
            <td style="padding: 15px;"><div style="font-size: 28px; font-weight: bold; color: #10b981;">{{performance_score}}</div><div style="font-size: 12px; color: #6b7280;">Performance</div></td>
            <td style="padding: 15px;"><div style="font-size: 28px; font-weight: bold; color: #10b981;">{{seo_score}}</div><div style="font-size: 12px; color: #6b7280;">SEO</div></td>
            <td style="padding: 15px;"><div style="font-size: 28px; font-weight: bold; color: #10b981;">{{accessibility_score}}</div><div style="font-size: 12px; color: #6b7280;">Accessibility</div></td>
            <td style="padding: 15px;"><div style="font-size: 28px; font-weight: bold; color: #10b981;">{{security_score}}</div><div style="font-size: 12px; color: #6b7280;">Security</div></td>
          </tr>
        </table>
      </div>
      <div style="background: #ffffff; padding: 30px; text-align: center; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 16px 16px;">
        <a href="{{magic_link}}" style="background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); color: #fff; padding: 18px 40px; border-radius: 12px; text-decoration: none; font-size: 18px; font-weight: bold; display: inline-block;">View Full Report →</a>
      </div>
    </div>
  `,
  'invoice-sent': `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-radius: 12px;">
        <div style="border-bottom: 1px solid #e5e5e5; padding-bottom: 20px; margin-bottom: 20px; display: flex; justify-content: space-between;">
          <strong style="font-size: 20px;">{{company_name}}</strong>
          <span style="color: #666;">Invoice #{{invoice_number}}</span>
        </div>
        <p style="color: #333; font-size: 16px;">Hi {{first_name}},</p>
        <p style="color: #333; font-size: 16px;">Here's your invoice for {{amount}}. Payment is due by {{due_date}}.</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <div style="border-top: 2px solid #e5e5e5; padding-top: 15px; margin-top: 15px;">
            <strong style="font-size: 18px;">Total Due: {{amount}}</strong>
          </div>
        </div>
        <div style="text-align: center;">
          <a href="{{payment_link}}" style="background: #4bbf39; color: #fff; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Pay Now →</a>
        </div>
      </div>
    </div>
  `,
  'payment-received': `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="background: #ffffff; padding: 50px 40px; border: 1px solid #e5e5e5; border-radius: 12px; text-align: center;">
        <div style="width: 70px; height: 70px; background: rgba(16, 185, 129, 0.1); border-radius: 50%; margin: 0 auto 24px; line-height: 70px; font-size: 32px;">✓</div>
        <h1 style="margin: 0 0 12px; font-size: 28px; color: #1a1a1a;">Payment Successful!</h1>
        <p style="color: #666; font-size: 16px;">Thanks for your payment, {{first_name}}!</p>
        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-top: 30px; text-align: left;">
          <p style="margin: 8px 0;"><span style="color: #666;">Invoice:</span> <strong>#{{invoice_number}}</strong></p>
          <p style="margin: 8px 0;"><span style="color: #666;">Amount Paid:</span> <strong style="color: #10b981;">{{amount}}</strong></p>
          <p style="margin: 8px 0;"><span style="color: #666;">Date:</span> {{payment_date}}</p>
        </div>
      </div>
    </div>
  `,
  'proposal-sent': `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">New Proposal Ready</h1>
      </div>
      <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e5e5; border-top: none;">
        <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi {{first_name}},</p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">We've prepared a proposal for <strong>{{project_name}}</strong> for your review.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{proposal_link}}" style="background: #3b82f6; color: #fff; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">View Proposal →</a>
        </div>
        <p style="color: #666; font-size: 14px;">This proposal is valid for 30 days. Questions? Just reply to this email.</p>
      </div>
    </div>
  `,
  'proposal-accepted': `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎉 Proposal Accepted!</h1>
      </div>
      <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e5e5; border-top: none;">
        <p style="color: #333; font-size: 16px; line-height: 1.6;">Great news!</p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">Your proposal for <strong>{{project_name}}</strong> has been accepted. Our team will be in touch shortly to kick off the project.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{dashboard_link}}" style="background: #10b981; color: #fff; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Go to Dashboard →</a>
        </div>
      </div>
    </div>
  `,
  'project-update': `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e5e5; border-radius: 12px;">
        <h1 style="color: #1a1a1a; margin: 0 0 16px; font-size: 24px;">Project Update</h1>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi {{first_name}},</p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">There's a new update on your project <strong>{{project_name}}</strong>:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <p style="color: #333; margin: 0;">{{update_message}}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{project_link}}" style="background: #3b82f6; color: #fff; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">View Project →</a>
        </div>
      </div>
    </div>
  `,
  'password-reset': `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e5e5; border-radius: 12px; text-align: center;">
        <div style="width: 60px; height: 60px; background: rgba(239, 68, 68, 0.1); border-radius: 50%; margin: 0 auto 20px; line-height: 60px; font-size: 28px;">🔑</div>
        <h1 style="color: #1a1a1a; margin: 0 0 16px; font-size: 24px;">Reset Your Password</h1>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">We received a request to reset your password. Click the button below to create a new one.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{reset_link}}" style="background: #ef4444; color: #fff; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Reset Password →</a>
        </div>
        <p style="color: #999; font-size: 14px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      </div>
    </div>
  `,
  'new-message': `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e5e5; border-radius: 12px;">
        <h1 style="color: #1a1a1a; margin: 0 0 16px; font-size: 24px;">New Message</h1>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">You have a new message from <strong>{{sender_name}}</strong>:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #333; margin: 0; font-style: italic;">"{{message_preview}}"</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{message_link}}" style="background: #3b82f6; color: #fff; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">View Message →</a>
        </div>
      </div>
    </div>
  `
}

// Helper to get default template
const getDefaultTemplate = (emailId) => DEFAULT_TEMPLATES[emailId] || null

export default function SystemEmailsTab({ onEditTemplate }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [editingEmail, setEditingEmail] = useState(null)  // Full-page editor state
  const [previewDevice, setPreviewDevice] = useState('desktop')
  const [loading, setLoading] = useState(false)
  const [copiedVariable, setCopiedVariable] = useState(null)
  
  // Custom templates stored in database (overrides defaults)
  const [customTemplates, setCustomTemplates] = useState({})
  const [templatesLoading, setTemplatesLoading] = useState(true)

  // Fetch custom templates on mount
  useEffect(() => {
    fetchCustomTemplates()
  }, [])

  const fetchCustomTemplates = async () => {
    setTemplatesLoading(true)
    try {
      const res = await emailApi.listSystemEmails()
      if (res.data?.templates) {
        const templatesMap = {}
        res.data.templates.forEach(t => {
          templatesMap[t.email_id] = t
        })
        setCustomTemplates(templatesMap)
      }
    } catch (error) {
      console.error('Failed to fetch custom templates:', error)
      // Not critical - we'll use defaults
    } finally {
      setTemplatesLoading(false)
    }
  }

  const categories = getSystemEmailCategories()
  
  // Filter emails by search and category
  const filteredEmails = getSystemEmailsByCategory(selectedCategory).filter(email => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      email.name.toLowerCase().includes(query) ||
      email.description.toLowerCase().includes(query) ||
      email.trigger.toLowerCase().includes(query)
    )
  })

  const handleCopyVariable = (variable) => {
    navigator.clipboard.writeText(variable)
    setCopiedVariable(variable)
    setTimeout(() => setCopiedVariable(null), 2000)
    toast.success('Variable copied to clipboard')
  }

  const handlePreview = (email) => {
    setSelectedEmail(email)
    setShowPreview(true)
  }

  const handleEdit = (email) => {
    setEditingEmail(email)  // Sets full-page edit mode
    
    // Set page context for Echo awareness - let AI know we're editing this email
    const customTemplate = customTemplates[email.id]
    usePageContextStore.getState().setEntity({
      id: email.id,
      type: 'system-email',
      name: email.name,
      data: {
        currentHtml: customTemplate?.html_content || DEFAULT_TEMPLATES[email.id] || '',
        currentSubject: customTemplate?.subject || email.defaultSubject,
        description: email.description,
        variables: email.variables?.map(v => v.name).join(', ')
      }
    })
  }

  const handleBackFromEditor = () => {
    setEditingEmail(null)
    // Clear entity context when leaving editor
    usePageContextStore.getState().clearEntity()
  }

  const handleSaveTemplate = async (emailId, updates) => {
    setLoading(true)
    try {
      await emailApi.updateSystemEmail(emailId, updates)
      toast.success('Email template saved')
      fetchCustomTemplates()
      setEditingEmail(null)  // Close full-page editor
    } catch (error) {
      toast.error('Failed to save template')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleResetToDefault = async (emailId) => {
    setLoading(true)
    try {
      await emailApi.deleteSystemEmail(emailId)
      toast.success('Reset to default template')
      fetchCustomTemplates()
    } catch (error) {
      toast.error('Failed to reset template')
    } finally {
      setLoading(false)
    }
  }

  const handleSendTest = async (email) => {
    setLoading(true)
    try {
      await emailApi.testSystemEmail(email.id)
      toast.success('Test email sent to your address')
    } catch (error) {
      toast.error('Failed to send test email')
    } finally {
      setLoading(false)
    }
  }

  // FULL-PAGE EDITOR VIEW
  if (editingEmail) {
    return (
      <FullPageEmailEditor
        email={editingEmail}
        customTemplate={customTemplates[editingEmail.id]}
        onBack={handleBackFromEditor}
        onSave={(updates) => handleSaveTemplate(editingEmail.id, updates)}
        onReset={() => handleResetToDefault(editingEmail.id)}
        onCopyVariable={handleCopyVariable}
        copiedVariable={copiedVariable}
        loading={loading}
      />
    )
  }

  // MAIN LIST VIEW
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Emails</h2>
          <p className="text-muted-foreground">
            Transactional emails sent by the portal (audits, invoices, notifications, etc.)
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={fetchCustomTemplates}>
                <RefreshCw className={`h-4 w-4 ${templatesLoading ? 'animate-spin' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh templates</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Info Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                These are transactional emails, not marketing emails
              </p>
              <p className="text-sm text-blue-600">
                System emails are triggered by actions (audits, invoices, etc.) and are sent to specific 
                recipients. They don't require an unsubscribe link and have high deliverability.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {categories.slice(0, 5).map(category => {
            const Icon = CATEGORY_ICONS[category.id] || Mail
            return (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden lg:inline">{category.name}</span>
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                  {category.count}
                </Badge>
              </Button>
            )
          })}
        </div>
      </div>

      {/* Email List */}
      {templatesLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredEmails.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No emails found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredEmails.map(email => {
            const hasCustomTemplate = !!customTemplates[email.id]
            const CategoryIcon = CATEGORY_ICONS[email.category] || Mail
            
            return (
              <Card key={email.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="p-3 rounded-lg bg-primary/10">
                      <CategoryIcon className="h-5 w-5 text-primary" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{email.name}</h3>
                        {hasCustomTemplate && (
                          <Badge variant="outline" className="text-xs">
                            Customized
                          </Badge>
                        )}
                        {email.hasAiPersonalization && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Sparkles className="h-3 w-3" />
                            AI
                          </Badge>
                        )}
                        {email.isInternal && (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                            Internal
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {email.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Settings className="h-3 w-3" />
                          {email.trigger}
                        </span>
                        <span className="flex items-center gap-1">
                          <Variable className="h-3 w-3" />
                          {email.variables?.length || 0} variables
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePreview(email)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Preview</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(email)}
                              disabled={!email.editable}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {email.editable ? 'Edit template' : 'Not editable'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSendTest(email)}
                              disabled={loading}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Send test email</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview: {selectedEmail?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedEmail?.description}
            </DialogDescription>
          </DialogHeader>

          {selectedEmail && (
            <div className="space-y-4">
              {/* Device Toggle */}
              <div className="flex justify-center gap-2">
                <Button
                  variant={previewDevice === 'desktop' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewDevice('desktop')}
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Desktop
                </Button>
                <Button
                  variant={previewDevice === 'mobile' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewDevice('mobile')}
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  Mobile
                </Button>
              </div>

              {/* Subject Line */}
              <div className="p-3 bg-muted rounded-lg">
                <Label className="text-xs text-muted-foreground">Subject</Label>
                <p className="font-medium">
                  {customTemplates[selectedEmail.id]?.subject || selectedEmail.defaultSubject}
                </p>
              </div>

              {/* Preview Frame */}
              <div 
                className={`border rounded-lg bg-white overflow-hidden mx-auto shadow-lg ${
                  previewDevice === 'mobile' ? 'max-w-[375px]' : 'w-full'
                }`}
              >
                <div className="bg-gray-100 px-4 py-2 border-b flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 text-center text-xs text-muted-foreground truncate">
                    {customTemplates[selectedEmail.id]?.subject || selectedEmail.defaultSubject}
                  </div>
                </div>
                <ScrollArea className="h-[400px]">
                  <div 
                    className="p-0"
                    dangerouslySetInnerHTML={{ 
                      __html: customTemplates[selectedEmail.id]?.html || 
                              getDefaultTemplate(selectedEmail.id) || 
                              `<p style="padding: 48px; text-align: center; color: #666;">Default template for "${selectedEmail.name}"</p>`
                    }}
                  />
                </ScrollArea>
              </div>

              {/* Variables */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Available Variables</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedEmail.variables?.map(v => (
                    <TooltipProvider key={v.name}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="font-mono text-xs gap-2"
                            onClick={() => handleCopyVariable(v.name)}
                          >
                            {v.name}
                            {copiedVariable === v.name ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{v.description}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
            <Button onClick={() => { setShowPreview(false); handleEdit(selectedEmail); }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * Full-Page Email Editor wrapper - uses the universal EmailEditor component
 */
function FullPageEmailEditor({ 
  email, 
  customTemplate, 
  onBack,
  onSave, 
  onReset, 
  loading 
}) {
  const handleSave = ({ subject, html }) => {
    onSave({ subject, html })
  }

  return (
    <EmailEditor
      title={email.name}
      description={email.description}
      initialSubject={customTemplate?.subject || email.defaultSubject}
      initialHtml={customTemplate?.html || getDefaultTemplate(email.id)}
      variables={email.variables || []}
      onSave={handleSave}
      onBack={onBack}
      onReset={onReset}
      showReset={!!customTemplate}
      loading={loading}
      saveLabel="Save Changes"
    />
  )
}
