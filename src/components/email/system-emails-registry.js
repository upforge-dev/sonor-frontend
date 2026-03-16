/**
 * System Emails Registry
 * 
 * This registry defines all transactional/system emails that are sent by the portal.
 * These are NOT marketing emails - they are functional emails triggered by system events.
 * 
 * Each email can be viewed and customized through the Outreach module.
 */

// Brand colors - consistent with email templates
const BRAND = {
  primary: '#4bbf39',
  primaryDark: '#3a9c2d',
  secondary: '#007AFF',
  dark: '#1a1a1a',
  gray: '#666666',
  lightGray: '#f5f5f7',
  white: '#ffffff',
  border: '#e5e5e5',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444'
}

/**
 * System email categories for organization
 */
export const SYSTEM_EMAIL_CATEGORIES = {
  authentication: {
    id: 'authentication',
    name: 'Authentication',
    description: 'Login, account setup, and access emails',
    icon: 'Shield'
  },
  audits: {
    id: 'audits',
    name: 'Website Audits',
    description: 'Audit results and reports',
    icon: 'Search'
  },
  billing: {
    id: 'billing',
    name: 'Billing & Invoices',
    description: 'Payment receipts, invoices, and reminders',
    icon: 'CreditCard'
  },
  proposals: {
    id: 'proposals',
    name: 'Proposals',
    description: 'Proposal notifications and signatures',
    icon: 'FileText'
  },
  projects: {
    id: 'projects',
    name: 'Projects',
    description: 'Project updates and milestones',
    icon: 'FolderKanban'
  },
  notifications: {
    id: 'notifications',
    name: 'Notifications',
    description: 'System notifications and alerts',
    icon: 'Bell'
  },
  forms: {
    id: 'forms',
    name: 'Form Submissions',
    description: 'Form confirmation and notification emails',
    icon: 'FormInput'
  }
}

/**
 * System email definitions
 * Each email has:
 * - id: Unique identifier (used for storage/API)
 * - name: Display name
 * - category: Category from SYSTEM_EMAIL_CATEGORIES
 * - description: What this email does
 * - trigger: What triggers this email
 * - variables: Available template variables
 * - defaultSubject: Default subject line
 * - defaultHtml: Default HTML template
 * - functionFile: The Netlify function that sends this email (for reference)
 */
export const SYSTEM_EMAILS = [
  // ============================================
  // AUTHENTICATION EMAILS
  // ============================================
  {
    id: 'account-setup-invite',
    name: 'Account Setup Invite',
    category: 'authentication',
    description: 'Sent when a new client is added and needs to set up their account',
    trigger: 'Admin creates a new client or resends setup email',
    functionFile: 'admin-resend-setup-email.js',
    variables: [
      { name: '{{first_name}}', description: 'Client first name' },
      { name: '{{setup_link}}', description: 'One-time setup link' },
      { name: '{{company}}', description: 'Client company name' }
    ],
    defaultSubject: 'Set up your Sonor portal account',
    editable: true
  },
  {
    id: 'magic-link-login',
    name: 'Magic Link Login',
    category: 'authentication',
    description: 'Passwordless login link sent to existing users',
    trigger: 'User requests magic link login',
    functionFile: 'admin-resend-setup-email.js',
    variables: [
      { name: '{{first_name}}', description: 'User first name' },
      { name: '{{magic_link}}', description: 'One-time login link' },
      { name: '{{expires_in}}', description: 'Link expiration time' }
    ],
    defaultSubject: 'Your login link for Sonor',
    editable: true
  },
  {
    id: 'password-reset',
    name: 'Password Reset',
    category: 'authentication',
    description: 'Password reset link for users with password auth',
    trigger: 'User requests password reset',
    functionFile: 'auth-forgot.js',
    variables: [
      { name: '{{first_name}}', description: 'User first name' },
      { name: '{{reset_link}}', description: 'Password reset link' },
      { name: '{{expires_in}}', description: 'Link expiration time' }
    ],
    defaultSubject: 'Reset your Sonor password',
    editable: true
  },

  // ============================================
  // AUDIT EMAILS
  // ============================================
  {
    id: 'audit-complete',
    name: 'Audit Complete',
    category: 'audits',
    description: 'Sent when a website audit is complete with results summary',
    trigger: 'Admin sends audit results to client',
    functionFile: 'audits-send-email.js',
    variables: [
      { name: '{{first_name}}', description: 'Recipient first name' },
      { name: '{{target_url}}', description: 'Website URL that was audited' },
      { name: '{{grade}}', description: 'Overall audit grade (A-F)' },
      { name: '{{performance_score}}', description: 'Performance score (0-100)' },
      { name: '{{seo_score}}', description: 'SEO score (0-100)' },
      { name: '{{accessibility_score}}', description: 'Accessibility score (0-100)' },
      { name: '{{security_score}}', description: 'Security score (0-100)' },
      { name: '{{magic_link}}', description: 'Link to view full audit report' },
      { name: '{{personalized_message}}', description: 'AI-generated personalized message' }
    ],
    defaultSubject: '{{first_name}}, Your Website Audit is Ready - Grade: {{grade}}',
    editable: true,
    hasAiPersonalization: true
  },

  // ============================================
  // BILLING EMAILS
  // ============================================
  {
    id: 'invoice-sent',
    name: 'Invoice Sent',
    category: 'billing',
    description: 'Sent when a new invoice is created and sent to client',
    trigger: 'Admin sends an invoice',
    functionFile: 'invoices-send.js',
    variables: [
      { name: '{{first_name}}', description: 'Client first name' },
      { name: '{{invoice_number}}', description: 'Invoice number' },
      { name: '{{amount}}', description: 'Invoice amount' },
      { name: '{{due_date}}', description: 'Payment due date' },
      { name: '{{payment_link}}', description: 'Link to pay invoice' },
      { name: '{{line_items}}', description: 'Invoice line items (HTML table)' }
    ],
    defaultSubject: 'Invoice #{{invoice_number}} from Sonor',
    editable: true
  },
  {
    id: 'invoice-reminder',
    name: 'Invoice Reminder',
    category: 'billing',
    description: 'Reminder for unpaid invoices',
    trigger: 'Automated reminder or manual send',
    functionFile: 'invoices-reminder.js',
    variables: [
      { name: '{{first_name}}', description: 'Client first name' },
      { name: '{{invoice_number}}', description: 'Invoice number' },
      { name: '{{amount}}', description: 'Invoice amount' },
      { name: '{{due_date}}', description: 'Payment due date' },
      { name: '{{days_overdue}}', description: 'Days past due date' },
      { name: '{{payment_link}}', description: 'Link to pay invoice' }
    ],
    defaultSubject: 'Reminder: Invoice #{{invoice_number}} is due',
    editable: true
  },
  {
    id: 'payment-received',
    name: 'Payment Received',
    category: 'billing',
    description: 'Confirmation when a payment is successfully processed',
    trigger: 'Payment webhook from Square',
    functionFile: 'invoices-webhook.js',
    variables: [
      { name: '{{first_name}}', description: 'Client first name' },
      { name: '{{invoice_number}}', description: 'Invoice number' },
      { name: '{{amount}}', description: 'Amount paid' },
      { name: '{{payment_method}}', description: 'Payment method used' },
      { name: '{{payment_date}}', description: 'Date of payment' }
    ],
    defaultSubject: 'Payment received - Invoice #{{invoice_number}}',
    editable: true
  },

  // ============================================
  // PROPOSAL EMAILS
  // ============================================
  {
    id: 'proposal-sent',
    name: 'Proposal Sent',
    category: 'proposals',
    description: 'Notification when a proposal is shared with a client',
    trigger: 'Admin sends proposal to client',
    functionFile: 'proposals-send.js',
    variables: [
      { name: '{{first_name}}', description: 'Client first name' },
      { name: '{{proposal_title}}', description: 'Title of the proposal' },
      { name: '{{total_amount}}', description: 'Total proposal amount' },
      { name: '{{view_link}}', description: 'Link to view proposal' },
      { name: '{{expires_at}}', description: 'Proposal expiration date' }
    ],
    defaultSubject: 'New proposal from Sonor: {{proposal_title}}',
    editable: true
  },
  {
    id: 'proposal-accepted',
    name: 'Proposal Accepted',
    category: 'proposals',
    description: 'Confirmation when a client accepts a proposal',
    trigger: 'Client accepts and signs proposal',
    functionFile: 'proposals-accept.js',
    variables: [
      { name: '{{first_name}}', description: 'Client first name' },
      { name: '{{proposal_title}}', description: 'Title of the proposal' },
      { name: '{{signed_at}}', description: 'Date/time of signature' },
      { name: '{{project_link}}', description: 'Link to new project' }
    ],
    defaultSubject: 'Proposal accepted: {{proposal_title}}',
    editable: true
  },
  {
    id: 'proposal-signature-request',
    name: 'Counter-Signature Request',
    category: 'proposals',
    description: 'Sent to admin when client signs, requesting counter-signature',
    trigger: 'Client signs proposal',
    functionFile: 'proposals-sign.js',
    variables: [
      { name: '{{client_name}}', description: 'Client who signed' },
      { name: '{{proposal_title}}', description: 'Title of the proposal' },
      { name: '{{signed_at}}', description: 'Date/time of client signature' },
      { name: '{{counter_sign_link}}', description: 'Link to counter-sign' }
    ],
    defaultSubject: 'Action required: Counter-sign {{proposal_title}}',
    editable: true,
    isInternal: true
  },

  // ============================================
  // PROJECT EMAILS
  // ============================================
  {
    id: 'project-created',
    name: 'Project Created',
    category: 'projects',
    description: 'Welcome email when a new project is created for client',
    trigger: 'New project created (usually from accepted proposal)',
    functionFile: 'projects-create.js',
    variables: [
      { name: '{{first_name}}', description: 'Client first name' },
      { name: '{{project_name}}', description: 'Name of the project' },
      { name: '{{project_link}}', description: 'Link to project dashboard' },
      { name: '{{start_date}}', description: 'Project start date' }
    ],
    defaultSubject: "Let's get started: {{project_name}}",
    editable: true
  },
  {
    id: 'milestone-complete',
    name: 'Milestone Complete',
    category: 'projects',
    description: 'Notification when a project milestone is completed',
    trigger: 'Admin marks milestone as complete',
    functionFile: 'project-milestones-update.js',
    variables: [
      { name: '{{first_name}}', description: 'Client first name' },
      { name: '{{project_name}}', description: 'Name of the project' },
      { name: '{{milestone_name}}', description: 'Completed milestone name' },
      { name: '{{next_milestone}}', description: 'Next milestone (if any)' },
      { name: '{{project_link}}', description: 'Link to project dashboard' }
    ],
    defaultSubject: 'Milestone complete: {{milestone_name}}',
    editable: true
  },
  {
    id: 'project-complete',
    name: 'Project Complete',
    category: 'projects',
    description: 'Celebration email when project is marked complete',
    trigger: 'Admin marks project as complete',
    functionFile: 'projects-complete.js',
    variables: [
      { name: '{{first_name}}', description: 'Client first name' },
      { name: '{{project_name}}', description: 'Name of the project' },
      { name: '{{completed_date}}', description: 'Project completion date' },
      { name: '{{review_link}}', description: 'Link to leave a review' }
    ],
    defaultSubject: '🎉 Project complete: {{project_name}}',
    editable: true
  },

  // ============================================
  // NOTIFICATION EMAILS
  // ============================================
  {
    id: 'new-message',
    name: 'New Message',
    category: 'notifications',
    description: 'Notification when client receives a new message',
    trigger: 'Admin sends message to client',
    functionFile: 'messages-send.js',
    variables: [
      { name: '{{first_name}}', description: 'Client first name' },
      { name: '{{sender_name}}', description: 'Name of message sender' },
      { name: '{{message_preview}}', description: 'First 100 chars of message' },
      { name: '{{message_link}}', description: 'Link to view full message' }
    ],
    defaultSubject: 'New message from {{sender_name}}',
    editable: true
  },
  {
    id: 'file-shared',
    name: 'File Shared',
    category: 'notifications',
    description: 'Notification when a file is shared with client',
    trigger: 'Admin shares file with client',
    functionFile: 'drive-upload.js',
    variables: [
      { name: '{{first_name}}', description: 'Client first name' },
      { name: '{{file_name}}', description: 'Name of shared file' },
      { name: '{{shared_by}}', description: 'Name of person who shared' },
      { name: '{{download_link}}', description: 'Link to download file' }
    ],
    defaultSubject: '{{shared_by}} shared a file with you',
    editable: true
  },

  // ============================================
  // FORM SUBMISSION EMAILS
  // ============================================
  {
    id: 'form-submission-confirmation',
    name: 'Form Submission Confirmation',
    category: 'forms',
    description: 'Confirmation email sent to form submitter thanking them for their submission',
    trigger: 'Form is submitted with email field',
    functionFile: 'forms-submit.js',
    variables: [
      { name: '{{first_name}}', description: 'Submitter first name (extracted from form)' },
      { name: '{{form_name}}', description: 'Name of the form submitted' },
      { name: '{{company_name}}', description: 'Your company/organization name' },
      { name: '{{submission_summary}}', description: 'Summary of submitted fields (HTML)' }
    ],
    defaultSubject: 'Thank you for your submission!',
    editable: true,
    // Default branded template using brand_primary and brand_primary
    defaultHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f7;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, {{brand_primary}} 0%, {{brand_primary}} 100%); padding: 40px; border-radius: 16px 16px 0 0; text-align: center;">
              <div style="width: 60px; height: 60px; background-color: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 28px;">✓</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                Thank You!
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #1a1a1a;">
                Hi{{#if first_name}} {{first_name}}{{/if}},
              </p>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #1a1a1a;">
                We've received your submission and wanted to let you know we're on it! Our team will review your information and get back to you as soon as possible.
              </p>
              
              {{#if submission_summary}}
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #666666; text-transform: uppercase; letter-spacing: 0.5px;">
                  Your Submission
                </h3>
                {{{submission_summary}}}
              </div>
              {{/if}}
              
              <p style="margin: 24px 0 0 0; font-size: 16px; line-height: 1.6; color: #1a1a1a;">
                If you have any questions in the meantime, feel free to reply to this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #666666;">
                {{company_name}}
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #999999;">
                This is an automated confirmation of your form submission.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  },
  {
    id: 'form-submission-notification',
    name: 'Form Submission Notification',
    category: 'forms',
    description: 'Internal notification sent to team when a form is submitted',
    trigger: 'Form is submitted',
    functionFile: 'forms-submit.js',
    variables: [
      { name: '{{form_name}}', description: 'Name of the form submitted' },
      { name: '{{submitter_email}}', description: 'Email of the person who submitted' },
      { name: '{{submitter_name}}', description: 'Name of the person who submitted' },
      { name: '{{submission_details}}', description: 'Full form field data (HTML table)' },
      { name: '{{submission_time}}', description: 'Timestamp of submission' },
      { name: '{{source_page}}', description: 'Page URL where form was submitted' },
      { name: '{{view_link}}', description: 'Link to view submission in Portal' }
    ],
    defaultSubject: 'New {{form_name}} Submission',
    editable: true
  }
]

/**
 * Get system emails by category
 */
export function getSystemEmailsByCategory(categoryId) {
  if (categoryId === 'all') return SYSTEM_EMAILS
  return SYSTEM_EMAILS.filter(email => email.category === categoryId)
}

/**
 * Get a single system email by ID
 */
export function getSystemEmailById(emailId) {
  return SYSTEM_EMAILS.find(email => email.id === emailId)
}

/**
 * Get all categories with email counts
 */
export function getSystemEmailCategories() {
  const categories = Object.values(SYSTEM_EMAIL_CATEGORIES).map(cat => ({
    ...cat,
    count: SYSTEM_EMAILS.filter(e => e.category === cat.id).length
  }))
  
  return [
    { id: 'all', name: 'All Emails', description: 'All system emails', icon: 'Mail', count: SYSTEM_EMAILS.length },
    ...categories
  ]
}

export default SYSTEM_EMAILS
