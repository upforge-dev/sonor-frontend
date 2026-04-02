/**
 * OnboardingFlow — THE unified onboarding experience for Sonor.
 *
 * Full-screen, no sidebar/header. Echo-guided AI conversation walks every user
 * through their setup: new self-serve signups, existing projects needing config,
 * agency clients, returning users who haven't finished.
 *
 * Route: /onboarding (auto-detects project) or /onboarding/:projectId
 *
 * Architecture:
 *   - Uses `useEchoChat` with `skill: 'onboarding'` to drive the conversation
 *   - Full ChatArea component for rich rendering (actions, code blocks, stats, etc.)
 *   - On mount, sends a silent "begin onboarding" message so Echo starts guiding
 *   - Progress bar tracks onboarding phases
 *   - User can exit anytime (dismisses onboarding)
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import LogoSvg from '@/assets/logo.svg?react'
import useAuthStore from '@/lib/auth-store'
import sonorApi, { getSonorApiUrl } from '@/lib/sonor-api'
import { useEchoChat } from '@/hooks/useEchoChat'
import { ChatArea } from '@/components/chat/ChatArea'
import { openOAuthPopup } from '@/lib/oauth-popup'
import { getSession } from '@/lib/supabase-auth'
import { lazy, Suspense } from 'react'

const SonicWaveform = lazy(() => import('@/components/onboarding/SonicWaveform'))
const FrequencyBars = lazy(() => import('@/components/onboarding/FrequencyBars'))

const ONBOARDING_PHASES = [
  { key: 'welcome', label: 'Welcome' },
  { key: 'code_setup', label: 'Code Setup' },
  { key: 'hosting_connect', label: 'Hosting' },
  { key: 'platform_connect', label: 'Platforms' },
  { key: 'business_profile', label: 'Profile' },
  { key: 'module_config', label: 'Modules' },
  { key: 'data_migration', label: 'Data' },
  { key: 'walkthroughs', label: 'Tours' },
  { key: 'complete', label: 'Done' },
] as const

export default function OnboardingFlow() {
  const { projectId: paramProjectId } = useParams<{ projectId?: string }>()
  const navigate = useNavigate()
  const { user, currentProject, currentOrg } = useAuthStore()

  // Resolve project ID: param > current project > first available
  const projectId = paramProjectId || currentProject?.id || null

  // Onboarding state from Portal API
  const [onboardingState, setOnboardingState] = useState<any>(null)
  const [stateLoading, setStateLoading] = useState(true)
  const hasSentInitRef = useRef(false)

  // Fetch onboarding state
  useEffect(() => {
    if (!projectId) {
      setStateLoading(false)
      return
    }

    const fetchState = async () => {
      try {
        const { data } = await sonorApi.get(`/onboarding/${projectId}`)
        setOnboardingState(data)
      } catch {
        // Non-critical — onboarding state may not exist yet
      } finally {
        setStateLoading(false)
      }
    }
    fetchState()
  }, [projectId])

  // Echo chat with onboarding skill
  const echo = useEchoChat({
    skill: 'onboarding',
    projectId,
    pageContext: {
      module: 'onboarding',
      page: onboardingState?.current_phase || 'welcome',
      data: {
        projectId,
        orgId: currentOrg?.id,
        orgName: currentOrg?.name,
        projectTitle: currentProject?.title,
        projectDomain: currentProject?.domain,
        track: onboardingState?.metadata?.track || 'full_setup',
        currentPhase: onboardingState?.current_phase || 'welcome',
        completedPhases: onboardingState?.completed_phases || [],
      },
    },
    enabled: true,
  })

  // Auto-send initial message to kick off onboarding conversation
  useEffect(() => {
    if (hasSentInitRef.current) return
    if (stateLoading) return
    if (echo.isLoading) return

    hasSentInitRef.current = true

    // Small delay to let Echo initialize
    const timer = setTimeout(() => {
      const phase = onboardingState?.current_phase || 'welcome'
      const track = onboardingState?.metadata?.track || 'full_setup'

      if (phase === 'welcome' && track === 'full_setup') {
        echo.sendMessage(
          '[system:onboarding_start] New user starting onboarding. ' +
          `Project: ${currentProject?.title || 'Not yet created'}. ` +
          `Org: ${currentOrg?.name || 'Unknown'}. ` +
          `User: ${user?.name || user?.email || 'Unknown'}. ` +
          'Please greet them warmly, explain what Sonor does briefly, and start the welcome phase.'
        )
      } else if (phase === 'complete') {
        // Already done — redirect to dashboard
        navigate('/dashboard')
      } else {
        echo.sendMessage(
          `[system:onboarding_resume] User is returning to onboarding. ` +
          `Current phase: ${phase}. ` +
          `Completed phases: ${(onboardingState?.completed_phases || []).join(', ') || 'none'}. ` +
          `Track: ${track}. ` +
          `Project: ${currentProject?.title || 'Unknown'}. ` +
          'Welcome them back and continue from where they left off.'
        )
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [stateLoading, echo.isLoading])

  // Progress calculation
  const currentPhaseIndex = useMemo(() => {
    const phase = onboardingState?.current_phase || 'welcome'
    return ONBOARDING_PHASES.findIndex(p => p.key === phase)
  }, [onboardingState?.current_phase])

  const progressPercent = useMemo(() => {
    if (currentPhaseIndex < 0) return 0
    return Math.round((currentPhaseIndex / (ONBOARDING_PHASES.length - 1)) * 100)
  }, [currentPhaseIndex])

  // Handle OAuth clicks from action buttons
  const handleOAuthClick = useCallback(async (provider: string) => {
    if (!projectId) {
      echo.sendMessage(`I tried to connect ${provider} but no project is selected.`)
      return
    }

    const defaultModules: Record<string, string> = {
      google: 'seo,seo_gbp,reputation,analytics',
      facebook: 'social',
      linkedin: 'social',
      tiktok: 'social',
      netlify: 'hosting',
      yelp: 'reputation',
      trustpilot: 'reputation',
      shopify: 'commerce',
    }
    const modules = defaultModules[provider] || ''

    try {
      const { data } = await sonorApi.get(
        `/oauth/initiate/${provider}`,
        { params: { projectId, modules, connectionType: 'business', popupMode: true } },
      )

      const { url } = data
      const result = await openOAuthPopup(url, `oauth-${provider}`)

      if (result.success) {
        echo.sendMessage(`I just connected ${provider}! What should I set up next?`)
      } else if (result.error && result.error !== 'OAuth window was closed') {
        echo.sendMessage(`The ${provider} connection failed: ${result.error}. Can you help me try again?`)
      }
    } catch (err: any) {
      echo.sendMessage(`I had trouble connecting ${provider}: ${err.message}. Let me know if you need help.`)
    }
  }, [projectId, echo.sendMessage])

  // Handle action button clicks
  const handleActionClick = useCallback((actionId: string, prompt?: string) => {
    if (prompt) {
      echo.sendMessage(prompt)
    }
  }, [echo.sendMessage])

  // Dismiss onboarding
  const handleDismiss = useCallback(async () => {
    if (projectId) {
      try {
        await sonorApi.post(`/onboarding/${projectId}/dismiss`)
      } catch {
        // Non-critical
      }
    }
    navigate('/dashboard')
  }, [projectId, navigate])

  // Migration context — provides auth + project info to DataMigrationWizard blocks
  const migrationContext = useMemo(() => {
    if (!projectId || !currentOrg?.id) return undefined
    return {
      apiUrl: getSonorApiUrl(),
      authToken: '', // Will be resolved per-request via getSession() inside the wizard
      projectId,
      orgId: currentOrg.id,
      onComplete: (result: { imported: number; skipped: number; errors: number }) => {
        echo.sendMessage(
          `[system:migration_complete] Data import finished. ` +
          `Imported: ${result.imported}, Skipped: ${result.skipped}, Errors: ${result.errors}. ` +
          `Please congratulate the user and offer to import more data or move to walkthroughs.`
        )
      },
      onSkip: () => {
        echo.sendMessage(
          `[system:migration_skip] User chose to skip data migration. ` +
          `Please acknowledge and advance to the walkthroughs phase.`
        )
      },
    }
  }, [projectId, currentOrg?.id, echo.sendMessage])

  // Resolve auth token for migration context on each render cycle
  useEffect(() => {
    if (!migrationContext) return
    getSession().then(({ data }) => {
      if (data?.session?.access_token && migrationContext) {
        migrationContext.authToken = data.session.access_token
      }
    })
  }, [migrationContext])

  // No project — show a project creation prompt or redirect
  if (!projectId && !stateLoading) {
    // The Echo conversation will handle project creation via the onboarding skill
  }

  return (
    <div className="onboarding-flow fixed inset-0 z-50 flex flex-col" style={{ background: '#0a0a0f' }}>
      <style>{`
        .onboarding-flow {
          color: #e8e8ed;
        }

        /* Override ChatArea theme for dark onboarding */
        .onboarding-chat-area {
          --surface-primary: #0a0a0f;
          --surface-page: #0a0a0f;
          --text-primary: #e8e8ed;
          --text-secondary: rgba(255, 255, 255, 0.5);
          --text-tertiary: rgba(255, 255, 255, 0.3);
          --glass-bg: rgba(255, 255, 255, 0.04);
          --glass-bg-hover: rgba(255, 255, 255, 0.08);
          --glass-border: rgba(255, 255, 255, 0.08);
          --glass-border-strong: rgba(255, 255, 255, 0.12);
          --brand-primary: #39bfb0;
          --accent-primary: #39bfb0;
        }

        /* Progress bar */
        .onboarding-progress-track {
          background: rgba(255, 255, 255, 0.06);
          height: 3px;
          border-radius: 2px;
          overflow: hidden;
        }
        .onboarding-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #54b948, #39bfb0);
          border-radius: 2px;
          transition: width 0.6s ease;
        }

        /* Phase dots */
        .phase-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          transition: all 0.3s ease;
        }
        .phase-dot-completed {
          background: #39bfb0;
        }
        .phase-dot-current {
          background: #39bfb0;
          box-shadow: 0 0 8px rgba(57, 191, 176, 0.5);
        }
        .phase-dot-pending {
          background: rgba(255, 255, 255, 0.15);
        }

        /* Fade in */
        @keyframes onboardFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .onboard-fade-in {
          animation: onboardFadeIn 0.5s ease-out forwards;
        }

        /* Mesh background */
        .onboarding-mesh {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 600px 400px at 30% 20%, rgba(57, 191, 176, 0.06) 0%, transparent 70%),
            radial-gradient(ellipse 500px 400px at 70% 80%, rgba(84, 185, 72, 0.04) 0%, transparent 60%);
          pointer-events: none;
        }
      `}</style>

      {/* Background mesh */}
      <div className="onboarding-mesh" />

      {/* Ambient sonic waveform — the platform's heartbeat */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 0, opacity: 0.5 }}>
        <Suspense fallback={null}>
          <SonicWaveform variant="ambient" height={80} />
        </Suspense>
      </div>

      {/* Header bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5">
        {/* Logo + Progress */}
        <div className="flex items-center gap-4">
          <LogoSvg
            className="h-7 w-7"
            fill="white"
            style={{ filter: 'drop-shadow(0 0 10px rgba(57, 191, 176, 0.3))' }}
          />

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-white/70">
              {currentProject?.title || currentOrg?.name || 'Setup'}
            </span>
            {onboardingState && (
              <>
                <span className="text-white/20">|</span>
                <span className="text-xs text-white/40">
                  {progressPercent}% complete
                </span>
              </>
            )}
          </div>
        </div>

        {/* Phase indicator + Exit */}
        <div className="flex items-center gap-4">
          {/* Mini phase dots */}
          {onboardingState && (
            <div className="hidden sm:flex items-center gap-1.5">
              {ONBOARDING_PHASES.map((phase, i) => (
                <div
                  key={phase.key}
                  className={`phase-dot ${
                    i < currentPhaseIndex
                      ? 'phase-dot-completed'
                      : i === currentPhaseIndex
                        ? 'phase-dot-current'
                        : 'phase-dot-pending'
                  }`}
                  title={phase.label}
                />
              ))}
            </div>
          )}

          <button
            onClick={handleDismiss}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/30 hover:text-white/60 border border-white/10 hover:border-white/20 rounded-lg transition-all"
          >
            Skip setup
            <X className="w-3 h-3" />
          </button>
        </div>
      </header>

      {/* Progress bar */}
      {onboardingState && (
        <div className="relative z-10 px-6">
          <div className="onboarding-progress-track">
            <div
              className="onboarding-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col onboard-fade-in onboarding-chat-area">
        {stateLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Suspense fallback={null}>
              <FrequencyBars variant="listening" bars={13} height={36} label="Preparing your setup..." />
            </Suspense>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex justify-center">
            <div className="w-full max-w-3xl flex flex-col min-h-0">
              <ChatArea
                thread={echo.thread}
                messages={echo.messages}
                isLoading={echo.isLoading}
                currentUserId={user?.id || ''}
                threadType="echo"
                isStreaming={echo.isStreaming}
                streamingContent={echo.streamingContent}
                onSendMessage={(content, files) => echo.sendMessage(content, files)}
                showFeedback={false}
                toolCallLabel={echo.activeToolCall?.label || null}
                suggestionChips={echo.suggestionChips}
                onActionClick={handleActionClick}
                onOAuthClick={handleOAuthClick}
                migrationContext={migrationContext}
                placeholder="Ask anything, or type to continue..."
                welcomeConfig={{
                  greeting: 'Welcome to Sonor',
                  description: 'I\'m Echo, your AI setup assistant. Let\'s get your project configured.',
                  prompts: [
                    { label: 'Start setup', prompt: 'Let\'s get started with setting up my project', icon: '🚀' },
                    { label: 'What is Sonor?', prompt: 'What can Sonor do for my business?', icon: '💡' },
                    { label: 'I have a developer', prompt: 'I have a developer who will handle the technical setup', icon: '👨‍💻' },
                    { label: 'Skip to dashboard', prompt: 'I want to explore the dashboard first', icon: '📊' },
                  ],
                }}
                error={echo.error}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="relative z-10 flex items-center justify-center px-6 py-3 border-t border-white/5">
        <div className="flex items-center gap-4 text-xs text-white/15">
          <span>Powered by Echo AI</span>
          <span>|</span>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-white/20 hover:text-white/40 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </footer>
    </div>
  )
}
