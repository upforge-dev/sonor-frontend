/**
 * ContactAvatar - Unified avatar component for all contact types
 * Handles visual differentiation between:
 * - Sonor team (brand green→teal gradient, Sonor logo)
 * - Client team members (org brand color, org logo)
 * - Live chat visitors (amber gradient, pulsing when active)
 * - Echo AI (echo logo with green gradient)
 */
import { cn } from '@/lib/utils'
import { User, MessageCircle } from 'lucide-react'

// Contact type configurations
const CONTACT_TYPES = {
  uptrade: {
    gradient: 'from-[#4bbf39] to-[#238b95]', // Brand green to teal
    label: 'Sonor',
    ringColor: 'ring-emerald-500',
    badgeColor: 'bg-gradient-to-r from-[#4bbf39] to-[#238b95] text-white'
  },
  team: {
    gradient: 'from-blue-500 to-blue-600',
    label: 'Team',
    ringColor: 'ring-blue-500',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  },
  client: {
    gradient: 'from-purple-500 to-purple-600',
    label: 'Client',
    ringColor: 'ring-purple-500',
    badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
  },
  livechat: {
    gradient: 'from-amber-400 to-orange-500',
    label: 'Live',
    ringColor: 'ring-amber-500',
    badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  },
  echo: {
    gradient: 'from-emerald-400 via-green-500 to-teal-600',
    label: 'AI',
    ringColor: 'ring-emerald-500',
    badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
  },
  visitor: {
    gradient: 'from-gray-400 to-gray-500',
    label: 'Visitor',
    ringColor: 'ring-gray-400',
    badgeColor: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
  }
}

const SIZE_CLASSES = {
  xs: { container: 'w-6 h-6', text: 'text-[10px]', logo: 'w-3 h-3', badge: 'w-2 h-2', badgeIcon: 'w-1.5 h-1.5' },
  sm: { container: 'w-8 h-8', text: 'text-xs', logo: 'w-4 h-4', badge: 'w-2.5 h-2.5', badgeIcon: 'w-2 h-2' },
  md: { container: 'w-10 h-10', text: 'text-sm', logo: 'w-5 h-5', badge: 'w-3 h-3', badgeIcon: 'w-2 h-2' },
  lg: { container: 'w-12 h-12', text: 'text-base', logo: 'w-6 h-6', badge: 'w-3.5 h-3.5', badgeIcon: 'w-2.5 h-2.5' },
  xl: { container: 'w-16 h-16', text: 'text-lg', logo: 'w-8 h-8', badge: 'w-4 h-4', badgeIcon: 'w-3 h-3' }
}

/**
 * Get contact type based on contact data
 */
export function getContactType(contact, currentUserOrgType) {
  if (!contact) return 'visitor'
  
  // Echo AI
  if (contact.is_ai || contact.contact_type === 'ai') {
    return 'echo'
  }
  
  // Live chat visitor (from engage widget)
  if (contact.is_visitor || contact.contact_type === 'visitor' || contact.source === 'widget') {
    return 'livechat'
  }
  
  // Sonor team member (agency org_type or explicit uptrade_team role)
  if (
    contact.org_type === 'agency' ||
    contact.role === 'uptrade_assigned' ||
    contact.contact_type === 'uptrade_team' ||
    contact.is_uptrade
  ) {
    return 'uptrade'
  }
  
  // Team member (same org as viewer)
  if (contact.is_team_member || contact.contact_type === 'team') {
    return 'team'
  }
  
  // Client (external contact)
  if (contact.contact_type === 'client' || contact.contact_type === 'prospect') {
    return 'client'
  }
  
  // Default based on current context
  return currentUserOrgType === 'agency' ? 'uptrade' : 'team'
}

/**
 * Sonor logo SVG component (white, for use on gradient backgrounds)
 */
function UptradeLogo({ className }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      className={className}
      fill="currentColor"
    >
      {/* Simplified Sonor "U" mark */}
      <path d="M50 10C27.9 10 10 27.9 10 50s17.9 40 40 40 40-17.9 40-40S72.1 10 50 10zm0 65c-13.8 0-25-11.2-25-25s11.2-25 25-25 25 11.2 25 25-11.2 25-25 25z"/>
      <path d="M50 30c-11 0-20 9-20 20v15c0 2.8 2.2 5 5 5s5-2.2 5-5V50c0-5.5 4.5-10 10-10s10 4.5 10 10v15c0 2.8 2.2 5 5 5s5-2.2 5-5V50c0-11-9-20-20-20z"/>
    </svg>
  )
}

/**
 * Small badge logo for overlay on avatars with photos (Sonor version)
 */
function UptradeLogoBadge({ size = 'md' }) {
  const badgeSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6'
  }
  
  return (
    <div className={cn(
      "absolute -bottom-0.5 -right-0.5 rounded-full p-0.5",
      "bg-gradient-to-r from-[#4bbf39] to-[#238b95]",
      "border border-white dark:border-gray-900",
      "shadow-sm flex items-center justify-center",
      badgeSizes[size]
    )}>
      <svg 
        viewBox="0 0 100 100" 
        className="w-2/3 h-2/3 text-white"
        fill="currentColor"
      >
        <path d="M50 10C27.9 10 10 27.9 10 50s17.9 40 40 40 40-17.9 40-40S72.1 10 50 10zm0 65c-13.8 0-25-11.2-25-25s11.2-25 25-25 25 11.2 25 25-11.2 25-25 25z"/>
        <path d="M50 30c-11 0-20 9-20 20v15c0 2.8 2.2 5 5 5s5-2.2 5-5V50c0-5.5 4.5-10 10-10s10 4.5 10 10v15c0 2.8 2.2 5 5 5s5-2.2 5-5V50c0-11-9-20-20-20z"/>
      </svg>
    </div>
  )
}

/**
 * Small badge for org logo overlay on team member avatars with photos
 */
function OrgLogoBadge({ logo, primaryColor, size = 'md' }) {
  const badgeSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6'
  }
  
  return (
    <div 
      className={cn(
        "absolute -bottom-0.5 -right-0.5 rounded-full p-0.5",
        "border border-white dark:border-gray-900",
        "shadow-sm flex items-center justify-center overflow-hidden",
        badgeSizes[size]
      )}
      style={{ 
        background: primaryColor 
          ? `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` 
          : 'linear-gradient(135deg, #3b82f6, #2563eb)' 
      }}
    >
      {logo ? (
        <img 
          src={logo} 
          alt="Org" 
          className="w-2/3 h-2/3 object-contain"
        />
      ) : (
        // Fallback: small colored dot if no logo
        <span className="w-1/2 h-1/2 rounded-full bg-white/30" />
      )}
    </div>
  )
}

/**
 * Live chat indicator badge (pulsing when active)
 */
function LiveChatBadge({ isActive, className }) {
  return (
    <div className={cn(
      "absolute -top-1 -left-1 rounded-full p-0.5",
      "bg-amber-500",
      "border border-white dark:border-gray-900",
      className
    )}>
      <MessageCircle className="w-2 h-2 text-white" />
      {isActive && (
        <span className="absolute inset-0 rounded-full animate-ping bg-amber-400 opacity-75" />
      )}
    </div>
  )
}

/**
 * Status indicator dot
 */
function StatusIndicator({ status, size, type }) {
  const sizeClass = SIZE_CLASSES[size]
  
  if (type === 'echo') {
    // Echo is always "online" with sparkle
    return (
      <span className={cn(
        "absolute -bottom-0.5 -right-0.5 rounded-full",
        sizeClass.badge,
        "bg-emerald-400 border-2 border-white dark:border-gray-900",
        "flex items-center justify-center"
      )}>
        <span className="text-[6px]">✨</span>
      </span>
    )
  }
  
  if (!status) return null
  
  const statusColors = {
    online: 'bg-green-400',
    away: 'bg-amber-400',
    busy: 'bg-red-400',
    offline: 'bg-gray-400'
  }
  
  return (
    <span className={cn(
      "absolute -bottom-0.5 -right-0.5 rounded-full",
      sizeClass.badge,
      statusColors[status] || statusColors.offline,
      "border-2 border-white dark:border-gray-900"
    )} />
  )
}

/**
 * ContactAvatar - Main component
 */
export default function ContactAvatar({
  contact,
  name,
  email,
  src,
  type: explicitType,
  size = 'md',
  status,
  isLiveChatActive = false,
  orgTheme, // { primaryColor, logo } - org branding for team members
  showBadge = true,
  className
}) {
  // Determine contact type
  const type = explicitType || getContactType(contact)
  const config = CONTACT_TYPES[type] || CONTACT_TYPES.visitor
  const sizeClass = SIZE_CLASSES[size]
  
  // Get display info
  const displayName = name || contact?.name
  const displayEmail = email || contact?.email
  const avatarSrc = src || contact?.avatar || contact?.avatar_url
  
  // Get initials
  const initials = displayName 
    ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : displayEmail?.charAt(0)?.toUpperCase() || '?'
  
  // For team type, use org's brand color if provided
  const gradient = type === 'team' && orgTheme?.primaryColor
    ? undefined // Will use inline style instead
    : config.gradient
  
  const customBgStyle = type === 'team' && orgTheme?.primaryColor
    ? { background: `linear-gradient(135deg, ${orgTheme.primaryColor}, ${orgTheme.primaryColor}dd)` }
    : undefined

  // Echo type uses the echologo.svg (fills the entire space)
  if (type === 'echo') {
    return (
      <div className={cn("relative inline-block", className)}>
        <div className={cn(
          "rounded-full flex items-center justify-center overflow-hidden",
          "shadow-lg shadow-emerald-500/20 bg-white dark:bg-gray-900",
          sizeClass.container
        )}>
          <img 
            src="/echologo.svg" 
            alt="Echo AI" 
            className="w-full h-full object-cover p-1"
          />
        </div>
        {showBadge && <StatusIndicator status="online" size={size} type="echo" />}
      </div>
    )
  }

  return (
    <div className={cn("relative inline-block", className)}>
      {/* Main avatar circle */}
      <div 
        className={cn(
          "rounded-full flex items-center justify-center font-semibold text-white bg-gradient-to-br",
          sizeClass.container,
          sizeClass.text,
          gradient
        )}
        style={customBgStyle}
      >
        {avatarSrc ? (
          <img 
            src={avatarSrc} 
            alt={displayName || displayEmail} 
            className="w-full h-full rounded-full object-cover"
          />
        ) : type === 'uptrade' ? (
          // Sonor logo instead of initials
          <UptradeLogo className={cn(sizeClass.logo, "text-white")} />
        ) : orgTheme?.logo && type === 'team' ? (
          // Org logo for team members
          <img 
            src={orgTheme.logo} 
            alt="Org logo" 
            className={cn(sizeClass.logo, "object-contain")}
          />
        ) : (
          // Default: initials
          initials
        )}
      </div>
      
      {/* Type-specific badges */}
      {showBadge && (
        <>
          {/* Sonor badge on avatar photos */}
          {type === 'uptrade' && avatarSrc && (
            <UptradeLogoBadge size={size} />
          )}
          
          {/* Team member badge - org logo on avatar photos */}
          {type === 'team' && avatarSrc && orgTheme && (
            <OrgLogoBadge 
              logo={orgTheme.logo} 
              primaryColor={orgTheme.primaryColor} 
              size={size} 
            />
          )}
          
          {/* Live chat indicator */}
          {type === 'livechat' && (
            <LiveChatBadge isActive={isLiveChatActive} />
          )}
          
          {/* Status indicator for non-livechat (only if no other badge shown) */}
          {type !== 'livechat' && status && !(type === 'uptrade' && avatarSrc) && !(type === 'team' && avatarSrc && orgTheme) && (
            <StatusIndicator status={status} size={size} type={type} />
          )}
          
          {/* Pulsing indicator for active live chat */}
          {type === 'livechat' && isLiveChatActive && (
            <span className={cn(
              "absolute -bottom-0.5 -right-0.5 rounded-full",
              sizeClass.badge,
              "bg-amber-500 border-2 border-white dark:border-gray-900"
            )}>
              <span className="absolute inset-0 rounded-full animate-ping bg-amber-400 opacity-75" />
            </span>
          )}
        </>
      )}
    </div>
  )
}

// Export contact type constants for use elsewhere
export { CONTACT_TYPES }
