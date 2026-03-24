/**
 * Onboarding — First-time setup wizard for new self-serve signups
 *
 * Steps:
 * 1. Business details (org name, domain)
 * 2. Create first project (title, domain)
 * 3. Connect your site (API key + setup instructions)
 * 4. Verify connection (polls for first page view)
 */
import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Building2, Globe, Rocket, Check, Copy, ChevronRight, ArrowLeft, Loader2,
  Terminal, ExternalLink, CheckCircle, Zap
} from 'lucide-react'
import LogoSvg from '@/assets/logo.svg?react'
import useAuthStore from '@/lib/auth-store'
import { projectsApi } from '@/lib/sonor-api'
import { useActivateProject } from '@/lib/hooks/use-billing'
import PlanSelector from '@/components/billing/PlanSelector'

const STEPS = [
  { key: 'project', label: 'Create Project', icon: Globe },
  { key: 'connect', label: 'Connect Site', icon: Terminal },
  { key: 'verify', label: 'Go Live', icon: Rocket },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { currentOrg, isAuthenticated, availableProjects } = useAuthStore()
  const activateProject = useActivateProject()

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) navigate('/login')
  }, [isAuthenticated, navigate])

  // Skip onboarding if user already has projects
  useEffect(() => {
    if (availableProjects?.length > 0) {
      navigate('/dashboard')
    }
  }, [availableProjects, navigate])

  const [step, setStep] = useState('project')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [apiKeyCopied, setApiKeyCopied] = useState(false)
  const [envCopied, setEnvCopied] = useState(false)

  const [project, setProject] = useState({
    title: '',
    domain: '',
    plan: 'standard',
  })

  const [activationResult, setActivationResult] = useState(null) // { project, apiKey }

  const handleCreateProject = async () => {
    setIsSubmitting(true)
    setError('')

    try {
      // Create the project
      const { data: newProject } = await projectsApi.createProject({
        title: project.title.trim(),
        domain: project.domain.trim(),
      })

      const projectId = newProject.id || newProject.project?.id

      // Activate with plan (generates API key)
      const result = await activateProject.mutateAsync({
        projectId,
        plan: project.plan,
      })

      setActivationResult({
        project: { id: projectId, title: project.title, domain: project.domain },
        apiKey: result.apiKey,
      })
      setStep('connect')
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create project')
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyToClipboard = useCallback((text, setter) => {
    navigator.clipboard.writeText(text)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }, [])

  const handleFinish = () => {
    navigate('/dashboard')
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[var(--surface-primary)]">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-[var(--brand-primary)]/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-[var(--brand-primary)]/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative z-20 w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <LogoSvg className="h-10 w-10 text-black dark:text-white mx-auto mb-4" fill="currentColor" />
          <h1 className="text-2xl font-semibold">Welcome to Sonor</h1>
          <p className="text-muted-foreground mt-1">Let's get your site connected in a few minutes.</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const isActive = step === s.key
            const stepIdx = STEPS.findIndex((x) => x.key === step)
            const isDone = i < stepIdx

            return (
              <React.Fragment key={s.key}>
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                    isActive ? 'bg-[var(--brand-primary)] text-white' :
                    isDone ? 'bg-green-500 text-white' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={`text-sm font-medium hidden sm:inline ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-px w-12 ${isDone ? 'bg-green-500' : 'bg-border'}`} />
                )}
              </React.Fragment>
            )
          })}
        </div>

        {/* Step Content */}
        <Card>
          <CardContent className="pt-6 pb-6">
            {/* Step 1: Create Project */}
            {step === 'project' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Create your first project</h2>
                  <p className="text-sm text-muted-foreground">
                    A project represents one website or application.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="project-title">Project Name</Label>
                    <Input
                      id="project-title"
                      placeholder="My Website"
                      value={project.title}
                      onChange={(e) => setProject((p) => ({ ...p, title: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="project-domain">Domain</Label>
                    <Input
                      id="project-domain"
                      placeholder="mywebsite.com"
                      value={project.domain}
                      onChange={(e) => setProject((p) => ({ ...p, domain: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Plan</Label>
                    <PlanSelector
                      value={project.plan}
                      onChange={(plan) => setProject((p) => ({ ...p, plan }))}
                      compact
                    />
                    <p className="text-xs text-muted-foreground">
                      You're on a 14-day free trial. No charges until the trial ends.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="text-sm rounded-md border border-destructive/20 bg-destructive/10 text-destructive px-3 py-2">
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleCreateProject}
                  disabled={isSubmitting || !project.title.trim() || !project.domain.trim()}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating project...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      Create & Activate Project
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </div>
            )}

            {/* Step 2: Connect Site */}
            {step === 'connect' && activationResult && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Connect your site</h2>
                  <p className="text-sm text-muted-foreground">
                    Install site-kit in your Next.js project and add your API key.
                  </p>
                </div>

                {/* API Key Display */}
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Your API Key</Label>
                    <Badge variant="secondary" className="gap-1">
                      <Zap className="h-3 w-3" />
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm bg-background px-3 py-2 rounded border font-mono truncate">
                      {activationResult.apiKey}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(activationResult.apiKey, setApiKeyCopied)}
                    >
                      {apiKeyCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Setup Steps */}
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <h3 className="font-medium text-sm mb-2">1. Install site-kit</h3>
                    <code className="block text-sm bg-muted px-3 py-2 rounded font-mono">
                      npm install @sonordev/site-kit
                    </code>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h3 className="font-medium text-sm mb-2">2. Add to your .env.local</h3>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm bg-muted px-3 py-2 rounded font-mono truncate">
                        SONOR_API_KEY={activationResult.apiKey}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(`SONOR_API_KEY=${activationResult.apiKey}`, setEnvCopied)}
                      >
                        {envCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h3 className="font-medium text-sm mb-2">3. Run the setup CLI</h3>
                    <code className="block text-sm bg-muted px-3 py-2 rounded font-mono">
                      npx sonor-setup init
                    </code>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <a
                    href="https://sonor.dev/quickstart"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1"
                  >
                    Full documentation
                    <ExternalLink className="h-3 w-3" />
                  </a>

                  <Button onClick={() => setStep('verify')}>
                    <span className="inline-flex items-center gap-2">
                      Continue
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Verify / Go Live */}
            {step === 'verify' && (
              <div className="space-y-6 text-center py-4">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                <div>
                  <h2 className="text-xl font-semibold mb-2">You're all set!</h2>
                  <p className="text-muted-foreground">
                    Your project <strong>{activationResult?.project?.title}</strong> is active.
                    Once your site sends its first page view, data will appear in your dashboard.
                  </p>
                </div>

                <div className="rounded-lg border bg-muted/30 p-4 text-left text-sm space-y-2">
                  <p className="font-medium">What happens next:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      Deploy your site with site-kit installed
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      Analytics, SEO, and Forms start collecting data automatically
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      Check your dashboard for real-time insights
                    </li>
                  </ul>
                </div>

                <Button onClick={handleFinish} size="lg" className="gap-2">
                  Go to Dashboard
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Skip link */}
        <div className="text-center mt-4">
          <button
            onClick={handleFinish}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now — I'll set up later
          </button>
        </div>
      </div>
    </div>
  )
}
