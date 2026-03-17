// src/pages/LoginPage.jsx
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Lock, Mail, Eye, EyeOff, ShieldCheck, Loader2, HelpCircle, ChevronRight } from 'lucide-react'
import useAuthStore from '../lib/auth-store'
import { signInWithGoogle, resetPasswordForEmail } from '../lib/supabase-auth'
import { authApi } from '../lib/portal-api'

// purely visual; server enforces access
const BRAND_UI = {
  default: {
    title: 'Sonor',
    tagline: 'Intelligence, activated.',
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
      let redirect = nextPath
      if (user.role === 'admin') {
        redirect = nextPath === '/dashboard' ? '/admin' : nextPath
      } else if (user.slugs && user.slugs.length > 0) {
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

  // Login-to-boot collapse transition
  const [isCollapsing, setIsCollapsing] = useState(false)

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

  // Mouse-responsive mesh gradient
  const containerRef = useRef(null)
  const mouseRef = useRef({ x: 50, y: 50 })
  const rafRef = useRef(null)

  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    mouseRef.current = {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    }
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.style.setProperty('--mouse-x', `${mouseRef.current.x}%`)
          containerRef.current.style.setProperty('--mouse-y', `${mouseRef.current.y}%`)
        }
        rafRef.current = null
      })
    }
  }, [])

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

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
      if (remember) {
        localStorage.setItem('um_email', email.trim())
      } else {
        localStorage.removeItem('um_email')
      }

      const result = await authLogin(email, password, nextPath)

      if (result.success) {
        // Set flags for boot sequence overlay in MainLayout
        sessionStorage.setItem('sonor_just_logged_in', '1')
        sessionStorage.removeItem('sonor_has_booted')
        sessionStorage.removeItem('sonor_onboarding_checked')
        const redirect = result.redirect || nextPath
        console.log('[Login] Auth success, collapsing → navigate')
        setIsSubmitting(false)
        // Collapse the form, then navigate (boot plays as overlay in MainLayout)
        setIsCollapsing(true)
        setTimeout(() => navigate(redirect), 500)
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
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="login-canvas relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ '--mouse-x': '50%', '--mouse-y': '50%' }}
    >
      {/* Inline styles for this page's dark palette + mesh animation */}
      <style>{`
        .login-canvas {
          background: #0a0a0f;
          color: #e8e8ed;
        }

        /* Animated teal mesh gradient — follows mouse at low opacity */
        .login-mesh {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 600px 400px at var(--mouse-x) var(--mouse-y), rgba(57, 191, 176, 0.08) 0%, transparent 70%),
            radial-gradient(ellipse 800px 600px at 20% 80%, rgba(57, 191, 176, 0.04) 0%, transparent 60%),
            radial-gradient(ellipse 600px 500px at 80% 20%, rgba(84, 185, 72, 0.03) 0%, transparent 60%);
          transition: background 0.3s ease;
          pointer-events: none;
        }

        /* Subtle grid overlay */
        .login-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
          background-size: 80px 80px;
          pointer-events: none;
        }

        /* Ghost input style */
        .login-canvas .ghost-input {
          background: rgba(255, 255, 255, 0.04) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #e8e8ed !important;
          transition: all 0.2s ease;
        }
        .login-canvas .ghost-input::placeholder {
          color: rgba(255, 255, 255, 0.3) !important;
        }
        .login-canvas .ghost-input:focus {
          border-color: rgba(57, 191, 176, 0.5) !important;
          box-shadow: 0 0 0 3px rgba(57, 191, 176, 0.1), 0 0 20px rgba(57, 191, 176, 0.05) !important;
          background: rgba(255, 255, 255, 0.06) !important;
          outline: none !important;
        }

        /* Label + text overrides */
        .login-canvas .login-label {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.8rem;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        /* Teal primary button */
        .login-canvas .btn-teal {
          background: linear-gradient(135deg, #39bfb0 0%, #2da89b 100%);
          color: #fff;
          font-weight: 600;
          border: none;
          transition: all 0.25s ease;
          box-shadow: 0 2px 20px rgba(57, 191, 176, 0.2);
        }
        .login-canvas .btn-teal:hover:not(:disabled) {
          box-shadow: 0 4px 30px rgba(57, 191, 176, 0.35);
          transform: translateY(-1px);
        }
        .login-canvas .btn-teal:disabled {
          opacity: 0.6;
        }

        /* Google button dark */
        .login-canvas .btn-google {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #e8e8ed;
          transition: all 0.2s ease;
        }
        .login-canvas .btn-google:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }

        /* Logo glow */
        .login-logo-glow {
          filter: drop-shadow(0 0 30px rgba(57, 191, 176, 0.25)) drop-shadow(0 0 60px rgba(57, 191, 176, 0.1));
        }

        /* Fade-in animation */
        @keyframes loginFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .login-fade-in {
          animation: loginFadeUp 0.6s ease-out forwards;
        }
        .login-fade-in-delay-1 { animation-delay: 0.1s; opacity: 0; }
        .login-fade-in-delay-2 { animation-delay: 0.2s; opacity: 0; }
        .login-fade-in-delay-3 { animation-delay: 0.35s; opacity: 0; }
        .login-fade-in-delay-4 { animation-delay: 0.5s; opacity: 0; }

        /* ── Login collapse transition ── */
        @keyframes loginCollapse {
          0%   { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
          40%  { opacity: 0.8; transform: scale(0.95) translateY(0); filter: blur(0); }
          70%  { opacity: 0.3; transform: scale(0.6) translateY(-20px); filter: blur(4px); }
          100% { opacity: 0; transform: scale(0.1) translateY(-40px); filter: blur(12px); }
        }
        .login-collapsing {
          animation: loginCollapse 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          pointer-events: none;
        }

        /* Checkbox teal */
        .login-canvas .teal-check {
          accent-color: #39bfb0;
        }

        /* Panel for forgot/support */
        .login-panel {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 1rem;
        }

        /* Divider */
        .login-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.06);
        }

        /* Error banner */
        .login-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
          border-radius: 10px;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }

        /* Textarea ghost */
        .login-canvas .ghost-textarea {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #e8e8ed;
          border-radius: 10px;
          padding: 0.75rem;
          font-size: 0.875rem;
          resize: vertical;
          transition: all 0.2s ease;
        }
        .login-canvas .ghost-textarea::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }
        .login-canvas .ghost-textarea:focus {
          border-color: rgba(57, 191, 176, 0.5);
          box-shadow: 0 0 0 3px rgba(57, 191, 176, 0.1);
          outline: none;
        }
      `}</style>

      {/* Animated mesh gradient background */}
      <div className="login-mesh" />

      {/* Subtle grid lines */}
      <div className="login-grid" />

      {/* Logout Button - Top Right */}
      {isAuthenticated && (
        <button
          onClick={() => useAuthStore.getState().logout()}
          className="absolute top-6 right-6 z-30 px-4 py-2 text-sm text-white/50 hover:text-white/80 border border-white/10 hover:border-white/20 rounded-lg transition-all"
        >
          Logout
        </button>
      )}

      {/* Main card */}
      <div className={`relative z-20 w-full max-w-md mx-4 ${isCollapsing ? 'login-collapsing' : ''}`}>
        {/* Logo + Tagline */}
        <div className="text-center mb-10 login-fade-in">
          <div className="flex justify-center mb-5">
            <img
              src="/sonor-logo-full-length.svg"
              alt="Sonor"
              className="h-14 login-logo-glow"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
          <p className="text-base text-white/40 tracking-wide">{brand.tagline}</p>
        </div>

        {/* Form container — glass card */}
        <div
          className="login-fade-in login-fade-in-delay-1"
          style={{
            background: 'rgba(255, 255, 255, 0.025)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '20px',
            padding: '2rem',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="btn-google w-full h-12 rounded-xl font-medium flex items-center justify-center gap-3 mb-6"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Signing in...
              </span>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 login-divider" />
            <span className="text-[11px] font-medium text-white/30 uppercase tracking-widest">or</span>
            <div className="flex-1 login-divider" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <div className="space-y-2 login-fade-in login-fade-in-delay-2">
              <label htmlFor="email" className="login-label block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 w-4 h-4 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="ghost-input w-full h-11 pl-10 pr-4 rounded-xl text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2 login-fade-in login-fade-in-delay-3">
              <label htmlFor="password" className="login-label block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 w-4 h-4 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="ghost-input w-full h-11 pl-10 pr-10 rounded-xl text-sm"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Utility row */}
            <div className="flex items-center justify-between text-sm login-fade-in login-fade-in-delay-3">
              <label htmlFor="remember" className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="teal-check w-4 h-4 rounded"
                  disabled={isSubmitting}
                />
                <span className="text-white/40 text-xs">Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => { setForgotOpen(!forgotOpen); setForgotMsg('') }}
                className="text-[#39bfb0]/80 hover:text-[#39bfb0] transition-colors text-xs font-medium"
              >
                Forgot password?
              </button>
            </div>

            {/* Error */}
            {(error || getUrlErrorMessage()) && (
              <div role="alert" aria-live="polite" className="login-error">
                {error || getUrlErrorMessage()}
              </div>
            )}

            {/* Submit */}
            <div className="login-fade-in login-fade-in-delay-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-teal w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    Sign in
                    <ChevronRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </div>

            {/* Forgot password panel */}
            {forgotOpen && (
              <div className="login-panel mt-3">
                <form onSubmit={submitForgot} className="space-y-3">
                  <label htmlFor="forgotEmail" className="login-label block">Account email</label>
                  <input
                    id="forgotEmail"
                    type="email"
                    placeholder="you@company.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="ghost-input w-full h-10 px-3 rounded-lg text-sm"
                  />
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="btn-teal w-full h-10 rounded-lg text-sm"
                  >
                    {forgotLoading ? 'Sending...' : 'Send reset instructions'}
                  </button>
                  {forgotMsg && <p className="text-xs text-white/50">{forgotMsg}</p>}
                </form>
              </div>
            )}
          </form>

          {/* Sign up link */}
          <div className="flex items-center justify-center text-sm mt-6">
            <span className="text-white/30">Don't have an account?</span>
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="ml-1.5 text-[#39bfb0]/80 hover:text-[#39bfb0] font-medium transition-colors"
            >
              Sign up
            </button>
          </div>

          {/* Trust / privacy note */}
          <div className="flex items-center justify-center gap-2 text-xs text-white/20 mt-4">
            <ShieldCheck className="w-3.5 h-3.5 text-[#39bfb0]/50" />
            <span>Private & secure. Encrypted in transit.</span>
          </div>

          {/* Divider */}
          <div className="login-divider my-5" />

          {/* Contact support row */}
          <div className="flex items-center justify-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => { setSupportOpen(!supportOpen); setSupportMsg('') }}
              className="inline-flex items-center gap-1.5 text-white/30 hover:text-white/50 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Need help?
            </button>

            <span className="text-white/10" aria-hidden="true">|</span>

            <a
              href="mailto:hello@sonor.io?subject=Support%20request"
              className="text-white/30 hover:text-white/50 transition-colors"
            >
              Email support
            </a>
          </div>

          {supportOpen && (
            <div className="login-panel mt-4">
              <form onSubmit={submitSupport} className="space-y-3">
                <div className="space-y-2">
                  <label htmlFor="supportEmail" className="login-label block">Your email</label>
                  <input
                    id="supportEmail"
                    type="email"
                    placeholder="you@company.com"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="ghost-input w-full h-10 px-3 rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="supportBody" className="login-label block">Message</label>
                  <textarea
                    id="supportBody"
                    rows={3}
                    value={supportBody}
                    onChange={(e) => setSupportBody(e.target.value)}
                    placeholder="Tell us what you need help with..."
                    className="ghost-textarea w-full"
                  />
                </div>
                <button
                  type="submit"
                  disabled={supportLoading}
                  className="btn-teal w-full h-10 rounded-lg text-sm"
                >
                  {supportLoading ? 'Sending...' : 'Send message'}
                </button>
                {supportMsg && <p className="text-xs text-white/50">{supportMsg}</p>}
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className={`absolute bottom-6 left-0 right-0 text-center z-20 transition-opacity duration-300 ${isCollapsing ? 'opacity-0' : ''}`}>
        <div className="flex items-center justify-center gap-3 mb-2">
          <a
            href="https://sonor.io/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/15 hover:text-white/30 text-xs transition-colors"
          >
            Terms of Service
          </a>
          <span className="text-white/10 text-xs">|</span>
          <a
            href="https://sonor.io/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/15 hover:text-white/30 text-xs transition-colors"
          >
            Privacy Policy
          </a>
        </div>
        <p className="text-white/10 text-xs">&copy; {new Date().getFullYear()} Sonor</p>
      </div>
    </div>
  )
}
