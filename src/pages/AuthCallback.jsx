import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
// No loading spinner — seamless dark void matching boot sequence aesthetic
import useAuthStore from '../lib/auth-store'
import { authApi, contactsApi } from '../lib/sonor-api'
import { supabase, getCurrentUser } from '../lib/supabase-auth'
import { uploadGoogleAvatarToStorage } from '../lib/avatar-utils'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { setUser, fetchOrganizationContext } = useAuthStore()

  useEffect(() => {
    const handleCallback = async () => {
      console.log('[AuthCallback] Processing OAuth callback...')
      console.log('[AuthCallback] URL:', window.location.href)
      console.log('[AuthCallback] Hash:', window.location.hash ? 'present' : 'none')
      
      // If there's a hash fragment with tokens, we need to handle it
      // Supabase's detectSessionInUrl should handle this, but we'll be more explicit
      if (window.location.hash && window.location.hash.includes('access_token')) {
        console.log('[AuthCallback] Hash fragment detected, parsing tokens...')
        
        // Parse the hash fragment
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        
        if (accessToken && refreshToken) {
          console.log('[AuthCallback] Setting session from URL tokens...')
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          
          if (error) {
            console.error('[AuthCallback] Failed to set session:', error)
            navigate('/login?error=session_failed', { replace: true })
            return
          }
          
          if (data.session) {
            console.log('[AuthCallback] Session set successfully, processing...')
            await processAuthenticatedUser(data.session)
            return
          }
        }
      }
      
      // Fallback: try getSession in case tokens were already processed
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      console.log('[AuthCallback] getSession result:', { hasSession: !!session, error: sessionError?.message })
      
      if (sessionError) {
        console.error('[AuthCallback] Session error:', sessionError)
        navigate('/login?error=session_failed', { replace: true })
        return
      }
      
      if (session) {
        // Session exists, process immediately
        console.log('[AuthCallback] Session found, processing...')
        await processAuthenticatedUser(session)
        return
      }
      
      console.log('[AuthCallback] No session yet, waiting for auth state change...')
      // Session might not be ready yet - wait for auth state change
      let handled = false
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        console.log('[AuthCallback] Auth state changed:', event, 'session:', !!newSession)
        
        // Handle SIGNED_IN or INITIAL_SESSION with a valid session
        if (!handled && newSession && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
          handled = true
          subscription.unsubscribe()
          await processAuthenticatedUser(newSession)
        }
      })
      
      // Timeout after 15 seconds (increased from 10)
      setTimeout(() => {
        if (!handled) {
          subscription.unsubscribe()
          console.error('[AuthCallback] Timeout waiting for session')
          navigate('/login?error=timeout', { replace: true })
        }
      }, 15000)
    }
    
    const processAuthenticatedUser = async (session) => {
      const user = session.user
      const accessToken = session.access_token
      console.log('[AuthCallback] User authenticated:', user.email, 'token present:', !!accessToken)
      
      // Check if this is a new account setup (from AccountSetup page with token)
      const pendingSetupToken = localStorage.getItem('pendingSetupToken')
      const pendingSetupContactId = localStorage.getItem('pendingSetupContactId')
      
      // Create axios config with the new token (bypassing interceptor's getSession)
      const authConfig = {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
      
      let setupLinked = false

      if (pendingSetupToken) {
        console.log('[AuthCallback] Completing account setup after OAuth...')
        localStorage.removeItem('pendingSetupToken')

        try {
          const googleId = user?.user_metadata?.provider_id || user?.id
          await authApi.completeSetup({
            token: pendingSetupToken,
            method: 'google',
            googleId
          })
          setupLinked = true
          console.log('[AuthCallback] Account setup completed via Google OAuth')
        } catch (setupError) {
          console.error('[AuthCallback] Failed to complete setup (token may be expired):', setupError)
        }
      } else if (pendingSetupContactId) {
        console.log('[AuthCallback] Completing account setup (contactId)...')
        localStorage.removeItem('pendingSetupContactId')

        try {
          await authApi.markSetupComplete()
          setupLinked = true
        } catch (setupError) {
          console.error('[AuthCallback] Failed to complete setup:', setupError)
        }
      }

      // Always try linkContact as fallback — handles expired tokens, regular logins,
      // and any case where the contact exists but auth_user_id isn't linked yet.
      if (!setupLinked) {
        console.log('[AuthCallback] Linking contact by email for:', user.email)
        try {
          await authApi.linkContact({
            email: user.email,
            authUserId: user.id,
            name: user.user_metadata?.name || user.user_metadata?.full_name
          })
        } catch (linkError) {
          console.log('[AuthCallback] Contact link result:', linkError?.response?.data || 'ok')
        }
      }
      
      // Small delay to ensure session is persisted before getCurrentUser reads it
      console.log('[AuthCallback] Waiting for session to sync...')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Get user data from contacts table - we already have a valid session
      try {
        const contactUser = await getCurrentUser()
        
        if (contactUser) {
          console.log('[AuthCallback] Found contact:', contactUser.email)
          let userToSet = contactUser

          // Google avatar: direct upload to Supabase storage (no base64), then set as contact avatar
          const googlePicture = user.user_metadata?.picture ?? user.user_metadata?.avatar_url
          if (googlePicture) {
            const avatarUrl = await uploadGoogleAvatarToStorage(googlePicture, user.id)
            if (avatarUrl) {
              try {
                await contactsApi.patch(contactUser.id, { avatar: avatarUrl })
                userToSet = { ...contactUser, avatar: avatarUrl }
                console.log('[AuthCallback] Avatar saved to storage and contact updated')
              } catch (patchErr) {
                console.warn('[AuthCallback] Contact avatar patch failed:', patchErr?.response?.data ?? patchErr)
              }
            }
          }

          setUser(userToSet)
          
          // Fetch organization context
          await fetchOrganizationContext(session.access_token)
          
          // Double check auth state was set
          const { isAuthenticated } = useAuthStore.getState()
          console.log('[AuthCallback] Auth state after setUser:', { isAuthenticated, user: userToSet.email })
          
          console.log('[AuthCallback] Auth successful, redirecting to dashboard')
          // Flag for boot sequence on next page load
          sessionStorage.setItem('sonor_just_logged_in', '1')
          sessionStorage.removeItem('sonor_has_booted')
          sessionStorage.removeItem('sonor_onboarding_checked')
          navigate('/dashboard', { replace: true })
        } else {
          // SECURITY: User authenticated via OAuth but has no contact record
          // Sign them out to prevent session from persisting
          console.error('[AuthCallback] No contact found for user - signing out')
          try {
            await supabase.auth.signOut()
          } catch (signOutError) {
            console.error('[AuthCallback] Error signing out:', signOutError)
          }
          navigate('/login?error=no_contact', { replace: true })
        }
      } catch (error) {
        console.error('[AuthCallback] Error fetching user:', error)
        navigate('/login?error=fetch_failed', { replace: true })
      }
    }

    handleCallback()
  }, [navigate, setUser, fetchOrganizationContext])

  // Seamless dark void — same background as login page + boot sequence.
  // No spinner, no text. Just the dark canvas with a subtle central glow
  // so there's zero visual discontinuity in the login → boot transition.
  return (
    <>
      <style>{`
        .auth-callback-void {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: #0a0a0f;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .auth-callback-glow {
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(57,191,176,0.06) 0%, transparent 70%);
          animation: authPulse 2s ease-in-out infinite;
        }
        @keyframes authPulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
      <div className="auth-callback-void">
        <div className="auth-callback-glow" />
      </div>
    </>
  )
}
