// src/pages/AccountSetup.jsx
// Account setup page for new clients - allows Google OAuth or password setup
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Loader2, CheckCircle2, XCircle, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { supabase, signInWithGoogle, signUp, signInWithPassword, getCurrentUser } from '../lib/supabase-auth'
import useAuthStore from '../lib/auth-store'
import axios from 'axios'
import { authApi } from '../lib/sonor-api'

export default function AccountSetup() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  
  const { setUser, fetchOrganizationContext } = useAuthStore()
  
  const [status, setStatus] = useState('validating') // validating, ready, creating, success, error
  const [error, setError] = useState('')
  const [tokenData, setTokenData] = useState(null)
  
  // Password form state
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (token) {
      // Custom JWT token flow (from database magic links)
      validateToken()
    } else {
      // Supabase magic link flow - user is already authenticated
      // Check if we have a session from Supabase magic link
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user?.email) {
          try {
            // Get contact info from Portal API using the authenticated session
            const response = await authApi.getMe()
            const { contact } = response.data
            
            if (contact) {
              setTokenData({
                email: contact.email,
                name: contact.name,
                contactId: contact.id,
                isAlreadySetup: contact.accessLevel !== undefined || contact.role
              })
              setStatus('ready')
            } else {
              setStatus('error')
              setError('Account not found')
            }
          } catch (err) {
            setStatus('error')
            setError(err.response?.data?.error || 'Failed to load account information')
          }
        } else {
          setStatus('error')
          setError('No setup token provided')
        }
      })
    }
  }, [token])

  const validateToken = async () => {
    try {
      const response = await authApi.validateSetupToken(token)
      
      if (response.data.valid) {
        setTokenData(response.data)
        setStatus('ready')
      } else {
        setStatus('error')
        setError(response.data.error || 'Invalid or expired token')
      }
    } catch (err) {
      console.error('[AccountSetup] Token validation error:', err)
      setStatus('error')
      setError(err.response?.data?.error || 'Failed to validate token')
    }
  }

  const handleGoogleSignup = async () => {
    try {
      setIsSubmitting(true)
      
      // Store the setup token and contact ID in localStorage for use after OAuth redirect
      if (token) {
        localStorage.setItem('pendingSetupToken', token)
      } else {
        localStorage.setItem('pendingSetupContactId', tokenData.contactId)
      }
      
      // Initiate Google OAuth - Supabase will handle the popup/redirect
      await signInWithGoogle()
      
      // Note: The actual completion happens in AuthCallback.jsx after redirect
    } catch (err) {
      console.error('[AccountSetup] Google signup error:', err)
      setError(err.message || 'Failed to sign up with Google')
      setIsSubmitting(false)
    }
  }

  const handlePasswordSignup = async (e) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    try {
      setIsSubmitting(true)
      setError('')
      setStatus('creating')
      
      if (token) {
        // Invite flow: backend creates auth user server-side (bypasses Supabase email confirmation)
        await authApi.completeSetup({
          token,
          method: 'password',
          password,
        })
        // Sign in with the new password to establish session
        const { error: signInError } = await signInWithPassword(tokenData.email, password)
        if (signInError) throw signInError
        // Populate auth store so dashboard loads correctly
        const contactUser = await getCurrentUser()
        if (contactUser) {
          setUser(contactUser)
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token) {
            await fetchOrganizationContext(session.access_token)
          }
        }
      } else {
        // Supabase magic link flow - create via client signUp, then mark setup complete
        const { error: signupError } = await signUp(
          tokenData.email,
          password,
          { name: tokenData.name }
        )
        if (signupError) throw signupError
        await authApi.markSetupComplete()
      }
      
      setStatus('success')
      
      // Redirect after brief success message
      setTimeout(() => {
        navigate('/dashboard', { replace: true })
      }, 2000)
      
    } catch (err) {
      console.error('[AccountSetup] Password signup error:', err)
      setStatus('ready')
      const apiMsg = err.response?.data?.message
      const msg = Array.isArray(apiMsg) ? apiMsg[0] : (apiMsg || err.message || 'Failed to create account')
      setError(msg)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[var(--surface-primary)] transition-colors duration-300">
      {/* Subtle gradient background - matching login page */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-[var(--brand-primary)]/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-[var(--brand-primary)]/5 to-transparent rounded-full blur-3xl" />
      </div>

      <Card className="relative z-20 w-full max-w-md mx-4">
        {status === 'validating' && (
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex justify-center mb-2">
                <img src="/logo.svg" alt="Sonor" className="h-14 w-14" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Validating your link...</h2>
                <p className="text-[var(--text-secondary)] text-sm">Please wait while we verify your setup link</p>
              </div>
              <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-primary)]" />
            </div>
          </CardContent>
        )}

        {status === 'ready' && tokenData && (
          <>
            <CardHeader className="space-y-4 text-center pb-2">
              {/* Logo */}
              <div className="flex justify-center">
                <img src="/logo.svg" alt="Sonor" className="h-14 w-14" />
              </div>
              
              <div className="space-y-2">
                <CardTitle className="text-2xl font-semibold text-[var(--text-primary)]">
                  Complete Your Setup
                </CardTitle>
                <CardDescription className="text-[var(--text-secondary)]">
                  Welcome, {tokenData.name || 'there'}! Choose how you'd like to sign in.
                </CardDescription>
              </div>
            </CardHeader>
            
            <CardContent className="pt-2">
              {/* Google Sign Up - Primary (matching login page style) */}
              <Button
                type="button"
                onClick={handleGoogleSignup}
                disabled={isSubmitting}
                className="w-full h-12 bg-[var(--surface-primary)] hover:bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border border-[var(--glass-border-strong)] font-medium shadow-[var(--shadow-sm)] transition-all duration-200 mb-2"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-3">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </span>
                )}
              </Button>
              <p className="text-xs text-center text-[var(--text-tertiary)] mb-6">
                Recommended - Secure & fast sign-in
              </p>

              {/* Divider */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-[var(--glass-border)]" />
                <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">or set a password</span>
                <div className="flex-1 h-px bg-[var(--glass-border)]" />
              </div>

              {/* Password Form */}
              <form onSubmit={handlePasswordSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] w-4 h-4" />
                    <Input
                      id="email"
                      type="email"
                      value={tokenData.email}
                      disabled
                      className="pl-10 bg-[var(--surface-secondary)] text-[var(--text-tertiary)]"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Create Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] w-4 h-4" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="pl-10 pr-10"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] w-4 h-4" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div role="alert" aria-live="polite" className="text-sm rounded-[var(--radius-md)] border border-[var(--accent-red)]/20 bg-[var(--accent-red)]/10 text-[var(--accent-red)] px-3 py-2">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting || !password || !confirmPassword}
                  className="w-full h-11 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] hover:opacity-90 text-white font-medium shadow-[var(--shadow-md)] transition-all duration-200"
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating account...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Create Account with Password
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {status === 'creating' && (
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex justify-center mb-2">
                <img src="/logo.svg" alt="Sonor" className="h-14 w-14" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Creating your account...</h2>
                <p className="text-[var(--text-secondary)] text-sm">This will just take a moment</p>
              </div>
              <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-primary)]" />
            </div>
          </CardContent>
        )}

        {status === 'success' && (
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex justify-center mb-2">
                <img src="/logo.svg" alt="Sonor" className="h-14 w-14" />
              </div>
              <div className="h-12 w-12 rounded-full bg-[var(--accent-success)]/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-[var(--accent-success)]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Account Created!</h2>
                <p className="text-[var(--text-secondary)] text-sm">Redirecting to your dashboard...</p>
              </div>
            </div>
          </CardContent>
        )}

        {status === 'error' && (
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex justify-center mb-2">
                <img src="/logo.svg" alt="Sonor" className="h-14 w-14" />
              </div>
              <div className="h-12 w-12 rounded-full bg-[var(--accent-red)]/10 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-[var(--accent-red)]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Setup Link Invalid</h2>
                <p className="text-[var(--text-secondary)] text-sm mb-2">
                  {error}
                </p>
                <p className="text-[var(--text-tertiary)] text-xs">
                  Setup links expire after 7 days. Please contact your account manager to request a new link.
                </p>
              </div>
              <Button
                onClick={() => navigate('/login')}
                className="w-full h-11 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] hover:opacity-90 text-white font-medium shadow-[var(--shadow-md)] transition-all duration-200"
              >
                Go to Login
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
