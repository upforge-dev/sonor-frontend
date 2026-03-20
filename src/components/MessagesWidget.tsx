/**
 * MessagesWidget - Floating chat bubble unified with Messages module
 *
 * Single source of truth: renders MessagesModuleV2 (Echo, Team, Live) inside
 * the widget chrome. Live count and notifications use Engage API.
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { X, Minus, Globe, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import useAuthStore from '@/lib/auth-store'
import usePageContextStore from '@/lib/page-context-store'
import { useBrandColors } from '@/hooks/useBrandColors'
import { portalApi } from '@/lib/portal-api'
import MessagesModuleV2 from '@/components/messages/MessagesModuleV2'
import MessagesIcon from '@/components/MessagesIcon'

let notificationAudio: HTMLAudioElement | null = null
function playNotificationSound(urgent = false) {
  try {
    if (!notificationAudio) {
      notificationAudio = new Audio('/chatnotification.wav')
    }
    notificationAudio.volume = urgent ? 0.8 : 0.5
    notificationAudio.currentTime = 0
    notificationAudio.play().catch(() => {})
  } catch {
    // ignore
  }
}

interface MessagesWidgetProps {
  hidden?: boolean
}

export default function MessagesWidget({ hidden = false }: MessagesWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [liveSessionCount, setLiveSessionCount] = useState(0)
  const [showLiveNotification, setShowLiveNotification] = useState(false)
  const [latestVisitorName, setLatestVisitorName] = useState<string | null>(null)
  const [openWithTab, setOpenWithTab] = useState<'echo' | 'user' | 'visitor'>('echo')
  const prevCountRef = useRef(0)

  const user = useAuthStore((state) => state.user)
  const project = useAuthStore((state) => state.currentProject)
  const brandColors = useBrandColors()
  const currentModule = usePageContextStore((s) => s.module)

  // Live session count from Engage API (single source of truth)
  useEffect(() => {
    if (!user?.id || !project?.id) return

    const fetchLiveCount = async () => {
      try {
        const res = await portalApi.get('/engage/chat/sessions', {
          params: { projectId: project.id },
        })
        const data = res?.data?.data ?? res?.data ?? []
        const sessions = Array.isArray(data) ? data : []
        const active = sessions.filter(
          (s: { status?: string }) => s.status && s.status !== 'closed'
        )
        const count = active.length

        if (count > prevCountRef.current && prevCountRef.current > 0) {
          playNotificationSound(true)
          setShowLiveNotification(true)
          const latest = active[0]
          setLatestVisitorName(
            latest?.visitor_name ?? latest?.visitor_email ?? 'Website Visitor'
          )
          setTimeout(() => setShowLiveNotification(false), 5000)
        }
        prevCountRef.current = count
        setLiveSessionCount(count)
      } catch {
        setLiveSessionCount(0)
      }
    }

    fetchLiveCount()
    const interval = setInterval(fetchLiveCount, 30_000) // 30s – avoid hammering auth on every request
    return () => clearInterval(interval)
  }, [user?.id, project?.id])

  const handleToggle = useCallback(() => {
    if (isMinimized) {
      setIsMinimized(false)
    } else {
      setIsOpen((prev) => !prev)
    }
    if (isOpen) {
      setShowLiveNotification(false)
    }
  }, [isOpen, isMinimized])

  const handleMinimize = useCallback(() => {
    setIsMinimized(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setIsMinimized(false)
    setOpenWithTab('echo')
  }, [])

  // Echo context passed from open-echo events (contextual help, errors, etc.)
  const [echoContext, setEchoContext] = useState<string | null>(null)

  // Listen for 'open-echo' custom events (from contextual help, error boundaries, etc.)
  // Opens the widget in-place to the Echo tab with context — no page navigation needed.
  useEffect(() => {
    const handleOpenEcho = (e: CustomEvent) => {
      const context = e.detail?.context || null
      setOpenWithTab('echo')
      setEchoContext(context)
      setIsOpen(true)
      setIsMinimized(false)
    }
    window.addEventListener('open-echo', handleOpenEcho as EventListener)
    return () => window.removeEventListener('open-echo', handleOpenEcho as EventListener)
  }, [])

  if (hidden || !user) return null

  const hasLiveSessions = liveSessionCount > 0

  return (
    <>
      {/* Chat Panel - unified Messages module */}
      {isOpen && !isMinimized && (
        <>
          <div
            className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-[55] md:hidden"
            onClick={handleClose}
            aria-hidden
          />
          <div
            className={cn(
              'fixed z-[60] overflow-hidden flex flex-col',
              'bg-[var(--surface-primary)]/95 backdrop-blur-2xl',
              'border border-[var(--glass-border)]/80 rounded-2xl',
              'shadow-2xl shadow-black/20',
              'ring-1 ring-white/10',
              'bottom-24 right-6 w-[400px] h-[600px] max-h-[calc(100vh-120px)]',
              'max-md:bottom-0 max-md:right-0 max-md:w-full max-md:h-[80vh] max-md:rounded-b-none',
              'animate-in slide-in-from-bottom-4 fade-in duration-200'
            )}
          >
            <div className="flex items-center justify-between p-3 border-b border-[var(--glass-border)]/50 bg-gradient-to-r from-[var(--glass-bg)]/60 to-transparent shrink-0">
              <div className="flex items-center gap-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: brandColors.primary,
                  }}
                >
                  <MessagesIcon size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                    Messages
                  </h3>
                  {currentModule && openWithTab === 'echo' ? (
                    <p className="text-[10px] text-[var(--brand-primary)]">
                      Echo / {currentModule.charAt(0).toUpperCase() + currentModule.slice(1)}
                    </p>
                  ) : (
                    <p className="text-[10px] text-[var(--text-tertiary)]">
                      Echo, Team & Live
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)]"
                  onClick={handleMinimize}
                  title="Minimize"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)]"
                  onClick={handleClose}
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <MessagesModuleV2
                variant="widget"
                className="h-full"
                defaultTab={openWithTab}
                echoContext={echoContext}
                onEchoContextConsumed={() => setEchoContext(null)}
              />
            </div>
          </div>
        </>
      )}

      {/* Minimized bar */}
      {isOpen && isMinimized && (
        <button
          onClick={() => setIsMinimized(false)}
          className={cn(
            'fixed bottom-6 right-24 z-50',
            'h-12 px-4 rounded-full',
            'flex items-center gap-2',
            'bg-[var(--surface-primary)]/90 backdrop-blur-xl',
            'border border-[var(--glass-border)]/80',
            'shadow-xl shadow-black/10',
            'transition-all duration-200 hover:scale-105 hover:shadow-2xl',
            'animate-in slide-in-from-bottom-2 fade-in duration-200'
          )}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: brandColors.primary }}
          >
            <MessagesIcon size={16} className="text-white" />
          </div>
          <span className="text-sm font-medium text-[var(--text-primary)]">
            Messages
          </span>
        </button>
      )}

      {/* New live chat notification */}
      {showLiveNotification && !isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 animate-in slide-in-from-right-5 fade-in duration-300 cursor-pointer"
          onClick={() => {
            setIsOpen(true)
            setIsMinimized(false)
            setShowLiveNotification(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setIsOpen(true)
              setIsMinimized(false)
              setShowLiveNotification(false)
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="New visitor chat - open Messages"
        >
          <div className="bg-amber-500 text-white rounded-2xl px-4 py-3 shadow-xl shadow-amber-500/30 hover:bg-amber-600 transition-colors max-w-[240px]">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">New visitor chat</p>
                <p className="text-xs text-amber-100 truncate">
                  {latestVisitorName ?? 'Website visitor'} needs help
                </p>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-2 right-6 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-amber-500 pointer-events-none" />
        </div>
      )}

      {/* Launcher button */}
      <button
        onClick={handleToggle}
        type="button"
        className={cn(
          'fixed bottom-4 right-6 z-50',
          'w-14 h-14 rounded-full',
          'flex items-center justify-center',
          'transition-all duration-300 ease-out',
          'hover:scale-105 active:scale-95',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]',
          'shadow-xl shadow-[var(--brand-primary)]/40 focus:ring-[var(--brand-primary)]',
          'text-white',
          hasLiveSessions && !isOpen && 'ring-4 ring-amber-500/50 animate-pulse'
        )}
        aria-label={isOpen ? 'Close messages' : 'Open messages'}
      >
        <MessagesIcon size={28} />
        {hasLiveSessions && !isOpen && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center animate-bounce">
            {liveSessionCount}
          </span>
        )}
      </button>
    </>
  )
}
