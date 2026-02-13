import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  }
})

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle() {
  // Force localhost redirect in development
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  const redirectUrl = isLocalhost 
    ? `${window.location.origin}/auth/callback`
    : (import.meta.env.VITE_SUPABASE_AUTH_REDIRECT_URL || `${window.location.origin}/auth/callback`)
  
  console.log('[Supabase Auth] Redirect URL:', redirectUrl)
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      }
    }
  })
  
  if (error) throw error
  return data
}

/**
 * Sign in with email/password
 */
export async function signInWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) throw error
  return data
}

/**
 * Sign up with email/password
 */
export async function signUp(email, password, metadata = {}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata // { name, company, etc. }
    }
  })
  
  if (error) throw error
  return data
}

/**
 * Reset password for email
 */
export async function resetPasswordForEmail(email) {
  const redirectUrl = `${window.location.origin}/reset-password`
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl
  })
  
  if (error) throw error
  return data
}

/**
 * Update user password (for reset password page)
 */
export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  })
  
  if (error) throw error
  return data
}

/**
 * Sign out
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Get current session
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return { data, error }
}

/**
 * Get current user with contact info
 * Links auth_user_id to contact record if found by email
 */
export async function getCurrentUser() {
  console.log('[getCurrentUser] Starting...')
  const { data: { session } } = await getSession()
  if (!session?.user) {
    console.log('[getCurrentUser] No session found')
    return null
  }
  console.log('[getCurrentUser] Session user:', session.user.email)
  
  // First try to fetch contact by auth_user_id
  console.log('[getCurrentUser] Querying contacts by auth_user_id:', session.user.id)
  let { data: contact, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('auth_user_id', session.user.id)
    .single()
  console.log('[getCurrentUser] Query result:', { contact: contact?.email, error: error?.message })
  
  // If not found by auth_user_id, try by email (case-insensitive)
  if (error || !contact) {
    const { data: contactByEmail, error: emailError } = await supabase
      .from('contacts')
      .select('*')
      .ilike('email', session.user.email)
      .single()
    
    if (contactByEmail) {
      contact = contactByEmail
      
      // Link auth_user_id to this contact for future lookups
      // This happens when a user was created via free audit form and then logs in
      if (!contactByEmail.auth_user_id) {
        const { error: updateError } = await supabase
          .from('contacts')
          .update({ auth_user_id: session.user.id })
          .eq('id', contactByEmail.id)
        
        if (updateError) {
          console.warn('Failed to link auth_user_id to contact:', updateError)
        } else {
          console.log('Linked auth_user_id to existing contact:', contactByEmail.email)
        }
      }
    }
  }
  
  if (!contact) {
    console.error('[getCurrentUser] No contact record found for authenticated user:', session.user.email)
    console.log('[getCurrentUser] User must have a contact record to access the portal')
    // SECURITY: Do NOT create a fallback user object
    // Users must have a contact record in the database to access the system
    return null
  }
  
  console.log('[getCurrentUser] Contact found:', contact.email, 'org_id:', contact.org_id)
  return {
    id: contact.id,
    authUserId: session.user.id,
    email: contact.email || session.user.email,
    name: contact.name || session.user.user_metadata?.name,
    role: contact.role || 'client',
    company: contact.company,
    avatar: contact.avatar || session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
    // Organization context
    org_id: contact.org_id,
    // Team member fields
    isTeamMember: contact.is_team_member || false,
    teamRole: contact.team_role || null,
    teamStatus: contact.team_status || null,
    contact
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
}

/**
 * Check if user is admin
 */
export async function isAdmin() {
  const user = await getCurrentUser()
  return user?.role === 'admin'
}

/**
 * Send magic link to email
 */
export async function sendMagicLink(email) {
  const redirectUrl = `${window.location.origin}/auth/callback`
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectUrl
    }
  })
  
  if (error) throw error
  return data
}
