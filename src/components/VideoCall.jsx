/**
 * VideoCall - Embedded video calling using Daily.co
 * 
 * Setup Instructions:
 * 1. Sign up at https://daily.co (Free tier: unlimited 1:1 calls, 10 concurrent rooms)
 * 2. Get your domain name (e.g., 'yourdomain' from yourdomain.daily.co)
 * 3. Update DAILY_DOMAIN below with your domain
 * 4. For production: Add Daily API key to .env as VITE_DAILY_API_KEY
 * 5. Rooms are auto-created on first join (no backend needed for basic setup)
 * 
 * Features:
 * - Screen sharing
 * - Mute audio/video
 * - Recording (premium feature)
 * - Chat (via Daily chat API)
 * - Virtual backgrounds (premium)
 * 
 * Alternative providers:
 * - Jitsi (self-hosted, free)
 * - Twilio Video (pay-as-you-go)
 * - Whereby (embed API, free tier)
 */
import { useState, useEffect, useRef } from 'react'
import { X, Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Monitor, MonitorOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const DAILY_DOMAIN = 'uptrademedia' // Your Daily.co subdomain - UPDATE THIS!

export default function VideoCall({ 
  contactName, 
  contactEmail,
  roomName, // Unique room identifier
  onEnd,
  className 
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [error, setError] = useState(null)
  const callFrameRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    // Load Daily.co iframe library
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/@daily-co/daily-js'
    script.async = true
    script.onload = initializeCall
    script.onerror = () => setError('Failed to load video call library')
    document.body.appendChild(script)

    return () => {
      if (callFrameRef.current) {
        callFrameRef.current.destroy()
      }
      document.body.removeChild(script)
    }
  }, [])

  const initializeCall = async () => {
    try {
      // Create or join room
      const roomUrl = `https://${DAILY_DOMAIN}.daily.co/${roomName}`
      
      // Initialize Daily call frame
      const callFrame = window.DailyIframe.createFrame(containerRef.current, {
        showLeaveButton: false,
        showFullscreenButton: true,
        iframeStyle: {
          width: '100%',
          height: '100%',
          border: 0,
          borderRadius: '12px'
        }
      })

      callFrameRef.current = callFrame

      // Listen for events
      callFrame
        .on('loaded', () => setIsLoading(false))
        .on('left-meeting', handleLeftMeeting)
        .on('error', (e) => setError(e.errorMsg))

      // Join the call
      await callFrame.join({ url: roomUrl })

    } catch (err) {
      console.error('[VideoCall] Error:', err)
      setError(err.message)
    }
  }

  const handleLeftMeeting = () => {
    if (callFrameRef.current) {
      callFrameRef.current.destroy()
      callFrameRef.current = null
    }
    onEnd?.()
  }

  const toggleMute = async () => {
    if (!callFrameRef.current) return
    const localAudio = callFrameRef.current.localAudio()
    callFrameRef.current.setLocalAudio(!localAudio)
    setIsMuted(!localAudio)
  }

  const toggleVideo = async () => {
    if (!callFrameRef.current) return
    const localVideo = callFrameRef.current.localVideo()
    callFrameRef.current.setLocalVideo(!localVideo)
    setIsVideoOff(!localVideo)
  }

  const toggleScreenShare = async () => {
    if (!callFrameRef.current) return
    if (isScreenSharing) {
      await callFrameRef.current.stopScreenShare()
    } else {
      await callFrameRef.current.startScreenShare()
    }
    setIsScreenSharing(!isScreenSharing)
  }

  const endCall = () => {
    if (callFrameRef.current) {
      callFrameRef.current.leave()
    }
  }

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 bg-[var(--surface-primary)] rounded-xl", className)}>
        <div className="text-red-500 mb-4">
          <X className="w-12 h-12" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Call Failed</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">{error}</p>
        <Button onClick={onEnd} variant="outline">Close</Button>
      </div>
    )
  }

  return (
    <div className={cn("relative flex flex-col bg-[var(--surface-primary)] rounded-xl overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white">
        <div>
          <h3 className="font-semibold">{contactName}</h3>
          <p className="text-xs opacity-80">{contactEmail}</p>
        </div>
        <Button 
          onClick={onEnd} 
          variant="ghost" 
          size="sm" 
          className="text-white hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Video Container */}
      <div className="flex-1 relative bg-gray-900" ref={containerRef}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white">Connecting...</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 p-4 bg-gray-800">
        <Button
          onClick={toggleMute}
          variant={isMuted ? "destructive" : "outline"}
          size="sm"
          className="rounded-full w-12 h-12"
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>

        <Button
          onClick={toggleVideo}
          variant={isVideoOff ? "destructive" : "outline"}
          size="sm"
          className="rounded-full w-12 h-12"
        >
          {isVideoOff ? <VideoOff className="h-5 w-5" /> : <VideoIcon className="h-5 w-5" />}
        </Button>

        <Button
          onClick={toggleScreenShare}
          variant={isScreenSharing ? "default" : "outline"}
          size="sm"
          className="rounded-full w-12 h-12"
        >
          {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
        </Button>

        <Button
          onClick={endCall}
          variant="destructive"
          size="sm"
          className="rounded-full w-12 h-12"
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
