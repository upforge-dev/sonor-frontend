// src/pages/ResetPassword.jsx
// Uses Supabase Auth for password reset - user clicks link in email,
// Supabase establishes session, then they can update password here
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Loader2, Eye, EyeOff, Lock, CheckCircle2, ShieldCheck, ArrowRight, XCircle } from 'lucide-react'
import { supabase, updatePassword, getSession } from '../lib/supabase-auth'

export default function ResetPassword() {
  const navigate = useNavigate()
  
  const [isValidating, setIsValidating] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Check for Supabase session on mount (set by clicking email link)
  useEffect(() => {
    checkSession()
    
    // Listen for auth state change (Supabase sets session from email link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[ResetPassword] Auth event:', event)
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked password recovery link
        setHasSession(true)
        setIsValidating(false)
      } else if (event === 'SIGNED_IN' && session) {
        setHasSession(true)
        setIsValidating(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkSession = async () => {
    try {
      const { data: { session } } = await getSession()
      if (session) {
        setHasSession(true)
      }
    } catch (err) {
      console.error('[ResetPassword] Session check error:', err)
    }
    setIsValidating(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate passwords
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsSubmitting(true)

    try {
      await updatePassword(newPassword)
      setSuccess(true)

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)
    } catch (err) {
      console.error('[ResetPassword] Update error:', err)
      setError(err.message || 'Failed to reset password')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-primary)] relative overflow-hidden p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-[var(--brand-primary)] opacity-[0.08] blur-[120px] rounded-full" />
          <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-[var(--brand-primary)] opacity-[0.08] blur-[120px] rounded-full" />
        </div>
        <Card className="relative w-full max-w-md bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] shadow-[var(--shadow-lg)]">
          <CardContent className="pt-8 pb-8 flex flex-col items-center">
            <div className="h-16 w-16 rounded-full bg-[var(--brand-primary)]/10 flex items-center justify-center mb-4">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
            </div>
            <p className="text-[var(--text-secondary)]">Validating reset link...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // No session state (invalid/expired link)
  if (!hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-primary)] relative overflow-hidden p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-[var(--brand-primary)] opacity-[0.08] blur-[120px] rounded-full" />
          <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-[var(--brand-primary)] opacity-[0.08] blur-[120px] rounded-full" />
        </div>
        <Card className="relative w-full max-w-md bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] shadow-[var(--shadow-lg)]">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-[var(--accent-error)]/10 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-[var(--accent-error)]" />
              </div>
            </div>
            <CardTitle className="text-[var(--accent-error)]">Reset Link Invalid</CardTitle>
            <CardDescription className="text-[var(--text-secondary)]">
              This reset link may have expired or is invalid.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--text-tertiary)] mb-6 text-center">
              Please request a new password reset from the login page.
            </p>
            <Button onClick={() => navigate('/login')} variant="glass-primary" className="w-full">
              Back to Login
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-primary)] relative overflow-hidden p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-[var(--brand-primary)] opacity-[0.08] blur-[120px] rounded-full" />
          <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-[var(--brand-primary)] opacity-[0.08] blur-[120px] rounded-full" />
        </div>
        <Card className="relative w-full max-w-md bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] shadow-[var(--shadow-lg)]">
          <CardContent className="pt-8 pb-8 flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-[var(--accent-success)]/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-[var(--accent-success)]" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Password Updated!</h2>
              <p className="text-[var(--text-secondary)]">
                Your password has been successfully reset. Redirecting to dashboard...
              </p>
            </div>
            <Loader2 className="h-5 w-5 animate-spin text-[var(--brand-primary)]" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main form
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-primary)] relative overflow-hidden p-4">
      {/* Subtle gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-[var(--brand-primary)] opacity-[0.08] blur-[120px] rounded-full" />
        <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-[var(--brand-primary)] opacity-[0.08] blur-[120px] rounded-full" />
      </div>

      <Card className="relative w-full max-w-md bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] shadow-[var(--shadow-lg)]">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <img src="/logo.svg" alt="Uptrade Media" className="h-12 w-12" />
          </div>
          <CardTitle className="text-2xl font-semibold text-[var(--text-primary)]">Reset Your Password</CardTitle>
          <CardDescription className="text-[var(--text-secondary)]">
            Choose a new secure password for your account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-[var(--text-primary)]">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isSubmitting}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">
                Choose a strong password with at least 8 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-[var(--text-primary)]">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" variant="glass-primary" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting password...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>

          <div className="bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/20 rounded-xl p-4 text-sm">
            <div className="flex items-center gap-2 text-[var(--brand-primary)] font-medium mb-1">
              <ShieldCheck className="h-4 w-4" />
              Security
            </div>
            <p className="text-[var(--text-secondary)]">
              After resetting your password, you'll be automatically logged in and can access your dashboard.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
