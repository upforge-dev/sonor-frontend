/**
 * Shared constants for the Email Marketing module.
 */

// Default transactional email definitions (pre-seeded per project)
export const defaultTransactionalEmails = [
  {
    id: 'default-form-confirmation',
    name: 'Form Submission Confirmation',
    description: 'Sent automatically when someone submits a form',
    system_type: 'form-confirmation',
    is_default: true,
  },
  {
    id: 'default-thank-you',
    name: 'Thank You Email',
    description: 'General thank you email for various actions',
    system_type: 'thank-you',
    is_default: true,
  },
]

// Template card gradient map by type/category
export const templateGradients = {
  'form-confirmation': 'from-emerald-500/80 to-emerald-600/80',
  'welcome': 'from-emerald-500/80 to-emerald-600/80',
  'newsletter': 'from-blue-500/80 to-indigo-500/80',
  'promotional': 'from-purple-500/80 to-pink-500/80',
  'thank-you': 'from-rose-500/80 to-red-500/80',
  'appointment-reminder': 'from-cyan-500/80 to-blue-500/80',
  'transactional': 'from-amber-500/80 to-orange-500/80',
  'default': 'from-[var(--text-tertiary)] to-[var(--text-secondary)]',
}

// Category display config
export const templateCategories = [
  { value: 'all', label: 'All Categories' },
  { value: 'welcome', label: 'Welcome', emoji: '👋' },
  { value: 'newsletter', label: 'Newsletter', emoji: '📰' },
  { value: 'promotional', label: 'Promotional', emoji: '🎯' },
  { value: 'transactional', label: 'Transactional', emoji: '📋' },
  { value: 'notification', label: 'Notification', emoji: '🔔' },
  { value: 'announcement', label: 'Announcement', emoji: '📢' },
  { value: 'custom', label: 'Custom', emoji: '✨' },
]

// Campaign status config for glass badges
export const campaignStatuses = {
  draft: 'draft',
  scheduled: 'scheduled',
  sending: 'sending',
  sent: 'sent',
  paused: 'paused',
  cancelled: 'cancelled',
}

// Automation trigger display labels
export const automationTriggerLabels = {
  signup: 'When someone signs up',
  tag_added: 'When tag is added',
  tag_removed: 'When tag is removed',
  list_joined: 'When added to list',
  campaign_opened: 'When campaign is opened',
  link_clicked: 'When link is clicked',
  date_based: 'On a specific date',
  form_submitted: 'When form is submitted',
}
