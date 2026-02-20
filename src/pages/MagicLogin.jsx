// src/pages/MagicLogin.jsx
// Handles magic link authentication (both Supabase and custom database tokens)
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent } from '../components/ui/card'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '../components/ui/button'
import { supabase, getCurrentUser } from '../lib/supabase-auth'
import useAuthStore from '../lib/auth-store'
import { authApi } from '../lib/portal-api'

export default function MagicLogin() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setUser } = useAuthStore()
  
  const [status, setStatus] = useState('validating') // validating, success, error
  const [error, setError] = useState('')

  useEffect(() => {
    // Check if this is a custom database token or Supabase magic link
    const token = searchParams.get('token')
    const redirect = searchParams.get('redirect')
    
    if (token) {
      // Custom database token flow
      handleDatabaseTokenAuth(token, redirect)
    } else {
      // Supabase magic link flow (token in URL hash)
      handleSupabaseMagicLinkAuth()
    }
    
    // Listen for auth state change (for Supabase magic links)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[MagicLogin] Auth event:', event)
      if (event === 'SIGNED_IN' && session) {
        await handleSuccessfulAuth()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleDatabaseTokenAuth = async (token, redirect) => {
    try {
      console.log('[MagicLogin] Validating database token...')
      
      // Validate the token against the Portal API
      const response = await authApi.validateMagicLink(token)
      
      if (response.data.valid && response.data.contact) {
        const contact = response.data.contact
        
        // Check if user needs account setup
        if (contact.account_setup === 'false' || contact.account_setup === false) {
          // Redirect to account setup with the token
          setStatus('success')
          setTimeout(() => {
            navigate(`/setup?token=${token}`, { replace: true })
          }, 1000)
          return
        }
        
        // User has account set up - try to sign them in
        // For now, redirect to the intended page or dashboard
        setUser({
          id: contact.id,
          email: contact.email,
          name: contact.name,
          role: contact.role,
          avatar: contact.avatar
        })
        setStatus('success')
        
        setTimeout(() => {
          const targetPath = redirect || (contact.role === 'admin' ? '/admin' : '/dashboard')
          navigate(targetPath, { replace: true })
        }, 1500)
      } else {
        setStatus('error')
        setError(response.data.error || 'Invalid or expired link')
      }
    } catch (err) {
      console.error('[MagicLogin] Database token auth error:', err)
      setStatus('error')
      setError(err.response?.data?.error || 'Authentication failed')
    }
  }

  const handleSupabaseMagicLinkAuth = async () => {
    try {
      // Check if there's already a session (from magic link in URL hash)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        throw sessionError
      }
      
      if (session) {
        await handleSuccessfulAuth()
      } else {
        // No session - might be an invalid or expired link
        setStatus('error')
        setError('Authentication failed. The link may have expired.')
      }
    } catch (err) {
      console.error('[MagicLogin] Auth error:', err)
      setStatus('error')
      setError(err.message || 'Authentication failed')
    }
  }

  const handleSuccessfulAuth = async () => {
    try {
      const contactUser = await getCurrentUser()
      
      if (contactUser) {
        setUser(contactUser)
        setStatus('success')
        
        // Redirect after brief success message
        setTimeout(() => {
          const redirect = contactUser.role === 'admin' ? '/admin' : '/dashboard'
          navigate(redirect, { replace: true })
        }, 1500)
      } else {
        // SECURITY: User has Supabase session but no contact record - sign them out
        console.warn('[MagicLogin] No contact record found - signing out')
        try {
          await supabase.auth.signOut()
        } catch (signOutError) {
          console.error('[MagicLogin] Error signing out:', signOutError)
        }
        throw new Error('Account not found in system. Please contact support.')
      }
    } catch (err) {
      setStatus('error')
      setError(err.message || 'Failed to load user data')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-primary)] relative overflow-hidden p-4">
      {/* Subtle gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-[var(--brand-primary)] opacity-[0.08] blur-[120px] rounded-full" />
        <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-[var(--brand-primary)] opacity-[0.08] blur-[120px] rounded-full" />
      </div>

      <Card className="relative w-full max-w-md bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] shadow-[var(--shadow-lg)]">
        <CardContent className="pt-8 pb-8">
          {status === 'validating' && (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-[var(--brand-primary)]/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Logging you in...</h2>
                <p className="text-[var(--text-secondary)] text-sm">Please wait while we authenticate your session</p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-[var(--accent-success)]/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-[var(--accent-success)]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Welcome back!</h2>
                <p className="text-[var(--text-secondary)] text-sm">Redirecting to your dashboard...</p>
              </div>
              <Loader2 className="h-5 w-5 animate-spin text-[var(--brand-primary)]" />
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="h-16 w-16 rounded-full bg-[var(--accent-error)]/10 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-[var(--accent-error)]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Link Expired</h2>
                <p className="text-[var(--text-secondary)] text-sm mb-4">
                  {error}
                </p>
                <p className="text-[var(--text-tertiary)] text-sm">
                  Magic links expire for security. Please request a new one from the login page.
                </p>
              </div>
              <Button
                onClick={() => navigate('/login')}
                variant="glass-primary"
                className="w-full"
              >
                Back to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
