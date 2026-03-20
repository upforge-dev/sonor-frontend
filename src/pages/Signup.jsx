/**
 * Signup — Public self-serve signup page
 *
 * Flow: email + password + name → plan selection → create account → confirm email → onboarding
 */
import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, Mail, User, Eye, EyeOff, Loader2, ChevronRight, CheckCircle, ArrowLeft } from 'lucide-react'
import LogoSvg from '@/assets/logo.svg?react'
import useAuthStore from '@/lib/auth-store'
import { signInWithGoogle } from '@/lib/supabase-auth'
import { authApi } from '@/lib/portal-api'
import PlanSelector from '@/components/billing/PlanSelector'

const STEPS = [
  { key: 'account', label: 'Create Account' },
  { key: 'plan', label: 'Choose Plan' },
]

export default function Signup() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const preselectedPlan = params.get('plan') || 'standard'

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) navigate('/onboarding')
  }, [isAuthenticated, navigate])

  const [step, setStep] = useState('account')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    businessName: '',
    plan: preselectedPlan,
  })

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const [existingOrg, setExistingOrg] = useState(null)

  const handleAccountNext = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) return setError('Name is required')
    if (!form.email.trim()) return setError('Email is required')
    if (!form.password || form.password.length < 8) return setError('Password must be at least 8 characters')

    // Check if email belongs to an existing org member — if so, skip plan selection
    try {
      const { data } = await authApi.checkExistingMembership(form.email.trim())
      if (data?.exists && data?.orgName) {
        setExistingOrg(data)
        // Skip plan picker — go straight to signup with existing org
        handleSignup(data)
        return
      }
    } catch {
      // Not found or endpoint doesn't exist yet — continue to plan picker
    }

    setStep('plan')
  }

  const handleSignup = async (existingOrgData = null) => {
    setIsSubmitting(true)
    setError('')

    try {
      const { data } = await authApi.publicSignup({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        plan: existingOrgData ? undefined : form.plan,
        businessName: existingOrgData ? undefined : (form.businessName.trim() || form.name.trim()),
        linkToExistingOrg: !!existingOrgData,
      })

      if (data.success) {
        setSuccess(true)
      } else {
        setError(data.message || 'Signup failed')
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Signup failed'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSignup = async () => {
    setIsSubmitting(true)
    setError('')
    try {
      const { error: signInError } = await signInWithGoogle()
      if (signInError) throw signInError
      // Supabase redirects to /auth/callback
    } catch (err) {
      setError(err?.message || 'Google sign-in failed')
      setIsSubmitting(false)
    }
  }

  // Success state — email verification needed
  if (success) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-[var(--surface-primary)]">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-[var(--brand-primary)]/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-[var(--brand-primary)]/5 to-transparent rounded-full blur-3xl" />
        </div>

        <Card className="relative z-20 w-full max-w-md mx-4">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-semibold">Check your email</h2>
            <p className="text-muted-foreground">
              We sent a verification link to <strong>{form.email}</strong>.
              Click the link to activate your account, then sign in.
            </p>
            <Button variant="outline" onClick={() => navigate('/login')} className="mt-4">
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[var(--surface-primary)]">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-[var(--brand-primary)]/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-[var(--brand-primary)]/5 to-transparent rounded-full blur-3xl" />
      </div>

      <Card className="relative z-20 w-full max-w-lg mx-4">
        <CardHeader className="space-y-4 text-center pb-2">
          <div className="flex justify-center">
            <LogoSvg className="h-14 w-14 text-black dark:text-white" fill="currentColor" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-semibold">
              {step === 'account' ? 'Create your account' : 'Choose your plan'}
            </CardTitle>
            <CardDescription>
              {step === 'account'
                ? '14-day free trial. No credit card required.'
                : 'You can change your plan anytime.'}
            </CardDescription>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.key}>
                <div
                  className={`h-2 w-2 rounded-full transition-colors ${
                    step === s.key ? 'bg-[var(--brand-primary)]' : 'bg-[var(--glass-border)]'
                  }`}
                />
                {i < STEPS.length - 1 && (
                  <div className="h-px w-8 bg-[var(--glass-border)]" />
                )}
              </React.Fragment>
            ))}
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          {step === 'account' && (
            <>
              {/* Google */}
              <Button
                type="button"
                onClick={handleGoogleSignup}
                disabled={isSubmitting}
                className="w-full h-12 bg-[var(--surface-primary)] hover:bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border border-[var(--glass-border-strong)] font-medium shadow-[var(--shadow-sm)] mb-6"
              >
                <span className="inline-flex items-center gap-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </span>
              </Button>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-[var(--glass-border)]" />
                <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-[var(--glass-border)]" />
              </div>

              <form onSubmit={handleAccountNext} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] w-4 h-4" />
                    <Input
                      id="name"
                      placeholder="Jane Smith"
                      value={form.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] w-4 h-4" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@company.com"
                      value={form.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] w-4 h-4" />
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 8 characters"
                      value={form.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      required
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business-name">Business Name <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    id="business-name"
                    placeholder="Your Company LLC"
                    value={form.businessName}
                    onChange={(e) => handleChange('businessName', e.target.value)}
                  />
                </div>

                {error && (
                  <div className="text-sm rounded-md border border-destructive/20 bg-destructive/10 text-destructive px-3 py-2">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full h-11">
                  <span className="inline-flex items-center gap-2">
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </Button>
              </form>
            </>
          )}

          {step === 'plan' && (
            <div className="space-y-6">
              <PlanSelector
                value={form.plan}
                onChange={(plan) => handleChange('plan', plan)}
                isAgency={false}
              />

              <p className="text-sm text-muted-foreground text-center">
                14-day free trial on all plans. No credit card required to start.
              </p>

              {error && (
                <div className="text-sm rounded-md border border-destructive/20 bg-destructive/10 text-destructive px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('account')} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleSignup}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      Start Free Trial
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Footer links */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-[var(--brand-primary)] hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 right-0 text-center z-20">
        <div className="flex items-center justify-center gap-3 mb-2">
          <a href="https://sonor.io/terms" target="_blank" rel="noopener noreferrer" className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-xs">
            Terms of Service
          </a>
          <span className="text-[var(--text-tertiary)] text-xs">•</span>
          <a href="https://sonor.io/privacy" target="_blank" rel="noopener noreferrer" className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-xs">
            Privacy Policy
          </a>
        </div>
        <p className="text-[var(--text-tertiary)] text-xs">&copy; {new Date().getFullYear()} Sonor</p>
      </div>
    </div>
  )
}
