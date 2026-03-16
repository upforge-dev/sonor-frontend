// src/pages/LoginPage.jsx
import React, { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Lock, Mail, Eye, EyeOff, ShieldCheck, Loader2, HelpCircle, ChevronRight } from 'lucide-react'
import LogoSvg from '@/assets/logo.svg?react'
import useAuthStore from '../lib/auth-store'
import { signInWithGoogle, resetPasswordForEmail } from '../lib/supabase-auth'
import { authApi } from '../lib/portal-api'

// purely visual; server enforces access
const BRAND_UI = {
  default: {
    title: 'Sonor',
    tagline: 'Your unified marketing command center powered by Signal AI',
  },
  row94: {
    title: 'Row 94 — Client Portal',
    tagline: 'Secure access to your Row 94 Whiskey project',
  },
  mbfm: {
    title: 'MBFM — Client Portal',
    tagline: 'Secure access to your MBFM project',
  },
}

function normalizeErr(e) {
  const msg = String(e || '').toUpperCase()
  if (msg.includes('PLEASE_USE_GOOGLE_SIGNIN')) return 'This account uses Google Sign-In. Please use the "Sign in with Google" button.'
  if (msg.includes('DOMAIN_NOT_ASSIGNED')) return 'This email domain is not allowed.'
  if (msg.includes('INVALID_PASSWORD'))    return 'Invalid email or password.'
  if (msg.includes('MISSING_CREDENTIALS')) return 'Enter email and password.'
  if (msg.includes('MISSING_FIELDS'))      return 'Please fill in all fields.'
  if (msg.includes('INVALID_EMAIL'))       return 'Please enter a valid email address.'
  if (msg.includes('PASSWORD_TOO_SHORT'))  return 'Password must be at least 8 characters.'
  if (msg.includes('EMAIL_EXISTS'))        return 'An account with this email already exists.'
  if (msg.includes('SIGNUP_FAILED'))       return 'Unable to create account. Please try again.'
  if (msg.includes('AUTH_NOT_CONFIGURED') || msg.includes('SERVER_NOT_CONFIGURED'))
    return 'Sign-in temporarily unavailable.'
  return msg.includes('SIGN') ? 'Sign up failed' : 'Login failed'
}

export default function LoginPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { login: authLogin, signup: authSignup, checkAuth, isAuthenticated, user } = useAuthStore()
  const nextPath = params.get('next') || '/dashboard'
  const brandKey = (params.get('brand') || 'default').toLowerCase()
  
  // Handle error from OAuth callback
  const urlError = params.get('error')
  const getUrlErrorMessage = () => {
    switch (urlError) {
      case 'no_contact':
        return 'Account not found in system. If you believe this is an error, please contact support.'
      case 'session_failed':
        return 'Failed to establish session. Please try again.'
      case 'fetch_failed':
        return 'Failed to load account data. Please try again.'
      case 'timeout':
        return 'Authentication timed out. Please try again.'
      default:
        return null
    }
  }
  const brand = useMemo(() => BRAND_UI[brandKey] || BRAND_UI.default, [brandKey])

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // Determine redirect based on user role
      let redirect = nextPath
      if (user.role === 'admin') {
        redirect = nextPath === '/dashboard' ? '/admin' : nextPath
      } else if (user.slugs && user.slugs.length > 0) {
        // Legacy proposal client
        redirect = `/p/${user.slugs[0]}`
      }
      navigate(redirect)
    }
  }, [isAuthenticated, user, navigate, nextPath])

  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Forgot password UI
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMsg, setForgotMsg] = useState('')

  // Contact support UI
  const [supportOpen, setSupportOpen] = useState(false)
  const [supportEmail, setSupportEmail] = useState('')
  const [supportBody, setSupportBody] = useState('')
  const [supportLoading, setSupportLoading] = useState(false)
  const [supportMsg, setSupportMsg] = useState('')

  // Handle Google Sign-In with Supabase
  async function handleGoogleSignIn() {
    setIsSubmitting(true)
    setError('')
    
    try {
      console.log('[Supabase Auth] Initiating Google sign-in...')
      const { error: signInError } = await signInWithGoogle()
      
      if (signInError) {
        console.error('[Supabase Auth] Sign-in error:', signInError)
        throw signInError
      }
      
      // Supabase will redirect to /auth/callback
      // AuthCallback.jsx will handle the rest
    } catch (err) {
      const msg = err?.message || String(err || 'Google sign-in failed')
      console.error('[Supabase Auth] Error:', msg)
      setError(normalizeErr(msg))
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem('um_email')
    if (saved) {
      setEmail(saved)
      setRemember(true)
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    
    try {
      // Remember email if checked
      if (remember) {
        localStorage.setItem('um_email', email.trim())
      } else {
        localStorage.removeItem('um_email')
      }

      // Use auth store login (which handles cookie-based auth)
      const result = await authLogin(email, password, nextPath)
      
      if (result.success) {
        // Navigate using React Router
        const redirect = result.redirect || nextPath
        console.log('[Login] Redirecting to:', redirect)
        setIsSubmitting(false)
        navigate(redirect)
      } else {
        throw new Error(result.error || 'Login failed')
      }
    } catch (err) {
      const msg = (err && typeof err === 'object' && 'message' in err) ? err.message : String(err || '')
      setError(normalizeErr(msg))
      setIsSubmitting(false)
    }
  }

  async function submitForgot(e) {
    e.preventDefault()
    setForgotLoading(true)
    setForgotMsg('')
    try {
      // Use Supabase password reset
      await resetPasswordForEmail((forgotEmail || email).trim())
      setForgotMsg('If your account exists, we emailed instructions to reset access.')
    } catch (err) {
      const msg = (err && typeof err === 'object' && 'message' in err) ? err.message : String(err || '')
      setForgotMsg(msg || 'Unable to process request')
    } finally {
      setForgotLoading(false)
    }
  }

  async function submitSupport(e) {
    e.preventDefault()
    setSupportLoading(true)
    setSupportMsg('')
    try {
      const { data } = await authApi.submitSupport({
        email: (supportEmail || email).trim(),
        message: supportBody || 'Support request from login screen.',
      })
      setSupportMsg('Thanks — your message was sent. We will get back to you shortly.')
      setSupportBody('')
    } catch (err) {
      const msg = (err && typeof err === 'object' && 'message' in err) ? err.message : String(err || '')
      setSupportMsg(msg || 'Unable to send message')
    } finally {
      setSupportLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[var(--surface-primary)] transition-colors duration-300">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-[var(--brand-primary)]/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-[var(--brand-primary)]/5 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Logout Button - Top Right */}
      {isAuthenticated && (
        <Button
          variant="glass"
          size="sm"
          onClick={() => useAuthStore.getState().logout()}
          className="absolute top-6 right-6 z-30"
        >
          Logout
        </Button>
      )}

      <Card className="relative z-20 w-full max-w-md mx-4">
        <CardHeader className="space-y-4 text-center pb-2">
          {/* Logo */}
          <div className="flex justify-center">
            <LogoSvg className="h-14 w-14 text-black dark:text-white" fill="currentColor" />
          </div>
          
          <div className="space-y-2">
            <CardTitle className="text-2xl font-semibold text-[var(--text-primary)]">
              {brand.title}
            </CardTitle>
            <CardDescription className="text-[var(--text-secondary)]">
              {brand.tagline}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          {/* Google Sign-In Button - Primary */}
          <Button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="w-full h-12 bg-[var(--surface-primary)] hover:bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border border-[var(--glass-border-strong)] font-medium shadow-[var(--shadow-sm)] transition-all duration-200 mb-6"
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

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-[var(--glass-border)]" />
            <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-[var(--glass-border)]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] w-4 h-4" />
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] w-4 h-4" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Utility row */}
            <div className="flex items-center justify-between text-sm">
              <label htmlFor="remember" className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--glass-border-strong)] bg-[var(--glass-bg)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]/30"
                  disabled={isSubmitting}
                />
                <span className="text-[var(--text-secondary)]">Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => { setForgotOpen(!forgotOpen); setForgotMsg('') }}
                className="text-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors font-medium"
              >
                Forgot password?
              </button>
            </div>

            {/* Error */}
            {(error || getUrlErrorMessage()) && (
              <div role="alert" aria-live="polite" className="text-sm rounded-[var(--radius-md)] border border-[var(--accent-red)]/20 bg-[var(--accent-red)]/10 text-[var(--accent-red)] px-3 py-2">
                {error || getUrlErrorMessage()}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] hover:opacity-90 text-white font-medium shadow-[var(--shadow-md)] transition-all duration-200"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  Sign in
                  <ChevronRight className="w-4 h-4" />
                </span>
              )}
            </Button>

            {/* Forgot password panel */}
            {forgotOpen && (
              <div className="mt-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] p-4 bg-[var(--glass-bg-inset)]">
                <form onSubmit={submitForgot} className="space-y-3">
                  <Label htmlFor="forgotEmail">Account email</Label>
                  <Input
                    id="forgotEmail"
                    type="email"
                    placeholder="you@company.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                  <Button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)]"
                  >
                    {forgotLoading ? 'Sending…' : 'Send reset instructions'}
                  </Button>
                  {forgotMsg && <p className="text-xs text-[var(--text-secondary)]">{forgotMsg}</p>}
                </form>
              </div>
            )}
          </form>

          {/* Trust / privacy note */}
          <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-tertiary)] mt-6">
            <ShieldCheck className="w-4 h-4 text-[var(--brand-primary)]" />
            <span>Private & secure. Encrypted in transit.</span>
          </div>

          {/* Divider */}
          <div className="my-6 h-px bg-[var(--glass-border)]" />

          {/* Contact support row */}
          <div className="flex items-center justify-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => { setSupportOpen(!supportOpen); setSupportMsg('') }}
              className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              Need help?
            </button>

            <span className="text-[var(--glass-border-strong)]" aria-hidden="true">•</span>

            <a
              href="mailto:hello@sonor.io?subject=Support%20request"
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Email support
            </a>
          </div>

          {supportOpen && (
            <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--glass-border)] p-4 bg-[var(--glass-bg-inset)]">
              <form onSubmit={submitSupport} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="supportEmail">Your email</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    placeholder="you@company.com"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportBody">Message</Label>
                  <textarea
                    id="supportBody"
                    rows={3}
                    value={supportBody}
                    onChange={(e) => setSupportBody(e.target.value)}
                    placeholder="Tell us what you need help with…"
                    className="w-full rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)] transition-all"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={supportLoading}
                  className="w-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)]"
                >
                  {supportLoading ? 'Sending…' : 'Send message'}
                </Button>
                {supportMsg && <p className="text-xs text-[var(--text-secondary)]">{supportMsg}</p>}
              </form>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 right-0 text-center z-20">
        <div className="flex items-center justify-center gap-3 mb-2">
          <a 
            href="https://sonor.io/terms" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-xs transition-colors"
          >
            Terms of Service
          </a>
          <span className="text-[var(--text-tertiary)] text-xs">•</span>
          <a 
            href="https://sonor.io/privacy" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-xs transition-colors"
          >
            Privacy Policy
          </a>
        </div>
        <p className="text-[var(--text-tertiary)] text-xs">© {new Date().getFullYear()} Sonor</p>
      </div>
    </div>
  )
}
