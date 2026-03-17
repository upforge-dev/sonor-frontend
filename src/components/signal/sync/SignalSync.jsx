// src/components/signal/sync/SignalSync.jsx
// Signal Sync - AI-Powered Calendar & Planning Dashboard
// Motion-like intelligent scheduling with meeting prep and focus time

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  Clock,
  Target,
  Brain,
  Sparkles,
  Sun,
  Coffee,
  Focus,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Play,
  Lock,
  AlertCircle,
  CheckCircle,
  Video,
  Users,
  Briefcase,
  Zap,
  Moon,
  BarChart3
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { syncApi } from '@/lib/signal-api'
import { useSignalAccess, useSignalStatus } from '@/lib/signal-access'
import useAuthStore from '@/lib/auth-store'

// Signal UI components
import { 
  SignalAmbient, 
  SignalLoader,
  GlowCard,
  PulseIndicator,
  SignalGradientText
} from '../shared/SignalUI'
import SignalAILogo from '../SignalAILogo'

// Sub-components
import CalendarOverview from './CalendarOverview'
import DailyBriefing from './DailyBriefing'
import FocusTimeManager from './FocusTimeManager'
import MeetingPrepCard from './MeetingPrepCard'

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SignalSync({ projectId, className }) {
  const { hasAccess, hasCurrentProjectSignal } = useSignalAccess()
  const signalStatus = useSignalStatus()
  const { currentOrg } = useAuthStore()

  const [activeTab, setActiveTab] = useState('overview')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [calendarData, setCalendarData] = useState(null)
  const [briefingData, setBriefingData] = useState(null)
  const [focusData, setFocusData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  // Selected meeting for prep
  const [selectedMeeting, setSelectedMeeting] = useState(null)
  const [meetingPrep, setMeetingPrep] = useState(null)
  const [loadingPrep, setLoadingPrep] = useState(false)

  // Check if Signal is enabled via project plan
  const signalEnabled = hasCurrentProjectSignal
  
  // Format date for API
  const formatDate = (date) => {
    return date.toISOString().split('T')[0]
  }
  
  // Load calendar data
  const loadCalendarData = useCallback(async () => {
    if (!signalEnabled) return
    
    try {
      setLoading(true)
      setError(null)
      
      const [calendar, briefing, focus] = await Promise.all([
        syncApi.getCalendar(formatDate(selectedDate)),
        syncApi.getDailyBriefing(),
        syncApi.getFocusTime()
      ])
      
      setCalendarData(calendar)
      setBriefingData(briefing)
      setFocusData(focus)
    } catch (err) {
      console.error('Failed to load sync data:', err)
      setError(err.message || 'Failed to load calendar data')
    } finally {
      setLoading(false)
    }
  }, [signalEnabled, selectedDate])
  
  // Initial load
  useEffect(() => {
    loadCalendarData()
  }, [loadCalendarData])
  
  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true)
    await loadCalendarData()
    setRefreshing(false)
  }
  
  // Navigate date
  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + direction)
    setSelectedDate(newDate)
  }
  
  // Load meeting prep
  const loadMeetingPrep = async (meeting) => {
    setSelectedMeeting(meeting)
    setLoadingPrep(true)
    try {
      const prep = await syncApi.getMeetingPrep(meeting.id)
      setMeetingPrep(prep)
    } catch (err) {
      console.error('Failed to load meeting prep:', err)
    } finally {
      setLoadingPrep(false)
    }
  }
  
  // Check if today
  const isToday = formatDate(selectedDate) === formatDate(new Date())
  
  // Not enabled state
  if (!signalEnabled) {
    return (
      <SignalAmbient className={cn("min-h-[400px] rounded-2xl", className)}>
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <motion.div 
            className="relative mb-6"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 rounded-full blur-xl" />
            <div className="relative p-6 rounded-full bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20">
              <Lock className="h-12 w-12 text-emerald-400/50" />
            </div>
          </motion.div>
          
          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            Signal Sync
          </h3>
          <p className="text-[var(--text-secondary)] max-w-md mb-6">
            AI-powered calendar intelligence, meeting prep, and focus time management.
            Enable Signal to unlock these features.
          </p>
          
          <div className="flex flex-wrap gap-3 justify-center mb-8">
            <Badge variant="outline" className="bg-white/5 border-white/10">
              <Calendar className="h-3 w-3 mr-1" />
              Smart Scheduling
            </Badge>
            <Badge variant="outline" className="bg-white/5 border-white/10">
              <Brain className="h-3 w-3 mr-1" />
              Meeting Prep
            </Badge>
            <Badge variant="outline" className="bg-white/5 border-white/10">
              <Focus className="h-3 w-3 mr-1" />
              Focus Time
            </Badge>
            <Badge variant="outline" className="bg-white/5 border-white/10">
              <Sun className="h-3 w-3 mr-1" />
              Daily Briefings
            </Badge>
          </div>
          
          <Alert className="max-w-lg bg-amber-500/10 border-amber-500/30">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            <AlertDescription className="text-amber-200">
              {signalStatus.message}
            </AlertDescription>
          </Alert>
        </div>
      </SignalAmbient>
    )
  }
  
  // Loading state
  if (loading && !calendarData) {
    return (
      <SignalAmbient className={cn("min-h-[400px] rounded-2xl", className)}>
        <SignalLoader size="lg" message="Loading your day..." className="py-20" />
      </SignalAmbient>
    )
  }
  
  // Error state
  if (error && !calendarData) {
    return (
      <SignalAmbient className={cn("min-h-[400px] rounded-2xl", className)}>
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            Failed to Load
          </h3>
          <p className="text-[var(--text-secondary)] mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </SignalAmbient>
    )
  }

  return (
    <SignalAmbient className={cn("rounded-2xl", className)}>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div 
              className="relative"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 rounded-xl blur-lg" />
              <div className="relative p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20">
                <Calendar className="h-6 w-6 text-emerald-400" />
              </div>
            </motion.div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <SignalGradientText>Signal Sync</SignalGradientText>
                <PulseIndicator status="active" />
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                AI-powered calendar intelligence
              </p>
            </div>
          </div>
          
          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateDate(-1)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <Button
              variant="ghost"
              onClick={() => setSelectedDate(new Date())}
              className={cn(
                "min-w-[140px] font-medium",
                isToday && "bg-emerald-500/10 text-emerald-400"
              )}
            >
              {isToday ? 'Today' : selectedDate.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              })}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateDate(1)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              className="ml-2"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickStat
            icon={Video}
            label="Meetings"
            value={calendarData?.events?.filter(e => e.type === 'meeting').length || 0}
            color="teal"
          />
          <QuickStat
            icon={Focus}
            label="Focus Blocks"
            value={calendarData?.events?.filter(e => e.type === 'focus').length || 0}
            color="emerald"
          />
          <QuickStat
            icon={Clock}
            label="Available Hours"
            value={`${calendarData?.availability?.totalAvailable || 0}h`}
            color="cyan"
          />
          <QuickStat
            icon={Target}
            label="Priority Tasks"
            value={briefingData?.priorities?.length || 0}
            color="amber"
          />
        </div>
        
        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start bg-white/[0.03] border border-white/[0.06]">
            <TabsTrigger value="overview" className="gap-1.5 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              <Calendar className="h-4 w-4" />
              Today
            </TabsTrigger>
            <TabsTrigger value="briefing" className="gap-1.5 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              <Sun className="h-4 w-4" />
              Briefing
            </TabsTrigger>
            <TabsTrigger value="focus" className="gap-1.5 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              <Focus className="h-4 w-4" />
              Focus Time
            </TabsTrigger>
            <TabsTrigger value="prep" className="gap-1.5 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              <Brain className="h-4 w-4" />
              Meeting Prep
            </TabsTrigger>
          </TabsList>
          
          <div className="mt-6">
            <TabsContent value="overview" className="mt-0">
              <CalendarOverview 
                data={calendarData}
                date={selectedDate}
                onMeetingSelect={loadMeetingPrep}
              />
            </TabsContent>
            
            <TabsContent value="briefing" className="mt-0">
              <DailyBriefing 
                data={briefingData}
                onRefresh={handleRefresh}
                loading={refreshing}
              />
            </TabsContent>
            
            <TabsContent value="focus" className="mt-0">
              <FocusTimeManager 
                data={focusData}
                calendarData={calendarData}
                onBlockTime={(slot) => syncApi.blockFocusTime(slot)}
                onRefresh={handleRefresh}
              />
            </TabsContent>
            
            <TabsContent value="prep" className="mt-0">
              <MeetingPrepCard 
                meeting={selectedMeeting}
                prep={meetingPrep}
                loading={loadingPrep}
                onSelectMeeting={loadMeetingPrep}
                upcomingMeetings={calendarData?.events?.filter(e => e.type === 'meeting') || []}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </SignalAmbient>
  )
}

// ============================================================================
// QUICK STAT COMPONENT
// ============================================================================

function QuickStat({ icon: Icon, label, value, color = 'emerald' }) {
  const colors = {
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
    teal: 'from-teal-500/20 to-teal-500/5 border-teal-500/20 text-teal-400',
    cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-400',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-400',
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className={cn(
        "relative p-4 rounded-xl overflow-hidden",
        "bg-gradient-to-br",
        colors[color],
        "border backdrop-blur-sm"
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5" />
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-[var(--text-muted)]">{label}</div>
        </div>
      </div>
    </motion.div>
  )
}
