/**
 * EmailConfigWarning - Shows warning when email sending is not configured
 * 
 * Displays when project has neither:
 * - Resend domain configured (premium, Sonor manages)
 * - Gmail OAuth connected (self-service)
 */
import { useState, useEffect } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, Mail, ExternalLink, Loader2, CheckCircle2 } from 'lucide-react'
import { emailApi } from '@/lib/sonor-api'
import useAuthStore from '@/lib/auth-store'

export default function EmailConfigWarning({ className = '' }) {
  const { currentProject } = useAuthStore()
  const [emailCapability, setEmailCapability] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkEmailCapability() {
      if (!currentProject?.id) {
        setLoading(false)
        return
      }

      try {
        const { data: result } = await emailApi.checkEmailCapability(currentProject.id)
        setEmailCapability(result)
      } catch (error) {
        console.error('Failed to check email capability:', error)
        setEmailCapability({ enabled: false })
      } finally {
        setLoading(false)
      }
    }

    checkEmailCapability()
  }, [currentProject?.id])

  if (loading) {
    return null
  }

  if (emailCapability?.enabled) {
    return null
  }

  return (
    <Alert variant="warning" className={`border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50 ${className}`}>
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-800 dark:text-amber-200">Email sending not configured</AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-300">
        <p className="mb-3">
          To send automated emails to your subscribers, you need to configure an email provider:
        </p>
        <ul className="list-none space-y-2 mb-4">
          <li className="flex items-start gap-2">
            <Mail className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>Connect your Gmail account</strong> — Send emails from your personal or business Gmail
            </span>
          </li>
          <li className="flex items-start gap-2">
            <ExternalLink className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>Set up a custom domain</strong> — Add and verify your own sending domain (e.g., mail.yourdomain.com)
            </span>
          </li>
        </ul>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/50"
            onClick={() => {
              // Navigate to project settings email section
              window.location.href = `/settings?tab=email`
            }}
          >
            <Mail className="h-4 w-4 mr-2" />
            Connect Gmail
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-amber-700 hover:text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:text-amber-200 dark:hover:bg-amber-900/50"
            onClick={() => {
              // Navigate to domain setup in Outreach module
              window.location.href = `/outreach?tab=domain-setup`
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Set Up Domain
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}

/**
 * Compact version for inline use in forms/builders
 */
export function EmailConfigWarningCompact({ className = '' }) {
  const { currentProject } = useAuthStore()
  const [emailCapability, setEmailCapability] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkEmailCapability() {
      if (!currentProject?.id) {
        setLoading(false)
        return
      }

      try {
        const { data: result } = await emailApi.checkEmailCapability(currentProject.id)
        setEmailCapability(result)
      } catch (error) {
        console.error('Failed to check email capability:', error)
        setEmailCapability({ enabled: false })
      } finally {
        setLoading(false)
      }
    }

    checkEmailCapability()
  }, [currentProject?.id])

  if (loading || emailCapability?.enabled) {
    return null
  }

  return (
    <div className={`flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm dark:bg-amber-950/50 dark:border-amber-800 ${className}`}>
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
      <span className="text-amber-700 dark:text-amber-300">
        Email sending requires Gmail or custom domain.{' '}
        <a href="/outreach?tab=domain-setup" className="underline font-medium">Configure now</a>
      </span>
    </div>
  )
}

/**
 * Status indicator showing current email provider
 */
export function EmailConfigStatus({ className = '' }) {
  const { currentProject } = useAuthStore()
  const [emailCapability, setEmailCapability] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkEmailCapability() {
      if (!currentProject?.id) {
        setLoading(false)
        return
      }

      try {
        const { data: result } = await emailApi.checkEmailCapability(currentProject.id)
        setEmailCapability(result)
      } catch (error) {
        console.error('Failed to check email capability:', error)
        setEmailCapability({ enabled: false })
      } finally {
        setLoading(false)
      }
    }

    checkEmailCapability()
  }, [currentProject?.id])

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking email config...
      </div>
    )
  }

  if (!emailCapability?.enabled) {
    return (
      <div className={`flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 ${className}`}>
        <AlertCircle className="h-3 w-3" />
        Not configured
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 text-sm text-green-600 dark:text-green-400 ${className}`}>
      <CheckCircle2 className="h-3 w-3" />
      {emailCapability.provider === 'gmail' ? 'Gmail' : 'Custom domain'}: {emailCapability.email}
    </div>
  )
}
