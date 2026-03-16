// src/pages/broadcast/components/ReelComposer.jsx
// Revolutionary Platform-First Composer for Reels, TikToks, YouTube Shorts
// Architecture: Platform Context Bar connects LEFT (tools) and RIGHT (preview) sidebars
// One piece of media → tailored per platform with platform-specific sounds, trends, and previews
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Video,
  Music,
  Calendar,
  Clock,
  Send,
  Sparkles,
  Hash,
  AlertCircle,
  Check,
  Loader2,
  Wand2,
  Eye,
  Save,
  Plus,
  X,
  Target,
  TrendingUp,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Film,
  Smartphone,
  Square,
  RectangleVertical,
  Scissors,
  Type,
  Sticker,
  Zap,
  Flame,
  BarChart2,
  Users,
  Share2,
  Heart,
  MessageSquare,
  Bookmark,
  SkipBack,
  SkipForward,
  Repeat,
  Maximize2,
  Download,
  Upload,
  Layers,
  Palette,
  Mic,
  ChevronRight,
  ChevronDown,
  Search,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { format, addHours, startOfHour } from 'date-fns';
import { useBroadcastStore } from '@/stores/broadcastStore';
import useAuthStore from '@/lib/auth-store';
import { useBroadcastInsights, transformInsightsForComponent } from '@/hooks/useBroadcastInsights';
import { PlatformIcon, PlatformSelector } from './PlatformIcon';
import { toast } from 'sonner';

// =============================================================================
// CONSTANTS - Reel-specific
// =============================================================================

// Platforms that support Reels/Shorts
const REEL_PLATFORMS = ['instagram', 'tiktok', 'facebook', 'youtube', 'snapchat'];

const PLATFORM_LIMITS = {
  instagram: { text: 2200, hashtags: 30, duration: 90 },
  tiktok: { text: 2200, hashtags: 100, duration: 180 },
  facebook: { text: 2200, hashtags: 30, duration: 90 },
  youtube: { text: 100, hashtags: 15, duration: 60 },
  snapchat: { text: 250, hashtags: 0, duration: 60 },
};

const ASPECT_RATIOS = [
  { id: '9:16', label: '9:16', description: 'Vertical (Best)', icon: Smartphone, width: 9, height: 16 },
  { id: '4:5', label: '4:5', description: 'Portrait', icon: RectangleVertical, width: 4, height: 5 },
  { id: '1:1', label: '1:1', description: 'Square', icon: Square, width: 1, height: 1 },
];

// =============================================================================
// PLATFORM-SPECIFIC CONTENT - Trends, hooks, formats vary by platform
// =============================================================================

const PLATFORM_TRENDING_HOOKS = {
  tiktok: [
    { hook: '"POV: You just discovered..."', uses: '4.8M', engagement: '+85%' },
    { hook: '"Wait for it..."', uses: '3.2M', engagement: '+72%' },
    { hook: '"Nobody talks about this..."', uses: '2.1M', engagement: '+68%' },
    { hook: '"This changed everything..."', uses: '1.9M', engagement: '+61%' },
  ],
  instagram: [
    { hook: '"Save this for later 📌"', uses: '2.4M', engagement: '+78%' },
    { hook: '"Try this hack..."', uses: '1.8M', engagement: '+65%' },
    { hook: '"Stop scrolling if..."', uses: '1.5M', engagement: '+58%' },
    { hook: '"Here\'s what I learned..."', uses: '1.2M', engagement: '+52%' },
  ],
  youtube: [
    { hook: '"In just 60 seconds..."', uses: '890K', engagement: '+45%' },
    { hook: '"Watch till the end..."', uses: '720K', engagement: '+42%' },
    { hook: '"The truth about..."', uses: '650K', engagement: '+38%' },
    { hook: '"Here\'s how to..."', uses: '580K', engagement: '+35%' },
  ],
  facebook: [
    { hook: '"You won\'t believe..."', uses: '1.2M', engagement: '+55%' },
    { hook: '"Share if you agree..."', uses: '980K', engagement: '+48%' },
    { hook: '"Tag someone who..."', uses: '850K', engagement: '+42%' },
    { hook: '"This is so true..."', uses: '720K', engagement: '+38%' },
  ],
  snapchat: [
    { hook: '"Only real ones know..."', uses: '1.8M', engagement: '+72%' },
    { hook: '"POV: It\'s 3am and..."', uses: '1.4M', engagement: '+65%' },
    { hook: '"When you..."', uses: '1.1M', engagement: '+58%' },
    { hook: '"Me explaining..."', uses: '890K', engagement: '+52%' },
  ],
};

const PLATFORM_VIRAL_FORMATS = {
  tiktok: [
    { format: 'Duet/Stitch', engagement: '+89%', description: 'React to trending' },
    { format: 'Get Ready', engagement: '+78%', description: 'GRWM style' },
    { format: 'Storytime', engagement: '+71%', description: 'Engaging narrative' },
    { format: 'Tutorial', engagement: '+65%', description: 'Quick how-to' },
    { format: 'Before/After', engagement: '+82%', description: 'Transformation' },
    { format: 'Day in Life', engagement: '+54%', description: 'Lifestyle content' },
  ],
  instagram: [
    { format: 'Carousel Reel', engagement: '+82%', description: 'Slide content' },
    { format: 'Behind Scenes', engagement: '+75%', description: 'Show process' },
    { format: 'Tutorial', engagement: '+68%', description: 'Step-by-step' },
    { format: 'Before/After', engagement: '+78%', description: 'Transformation' },
    { format: 'Trending Audio', engagement: '+85%', description: 'Audio trends' },
    { format: 'Aesthetic B-Roll', engagement: '+62%', description: 'Visual mood' },
  ],
  youtube: [
    { format: 'Quick Tips', engagement: '+72%', description: '60s value' },
    { format: 'Explainer', engagement: '+65%', description: 'Break it down' },
    { format: 'Reaction', engagement: '+58%', description: 'React content' },
    { format: 'Behind Scenes', engagement: '+55%', description: 'Show process' },
    { format: 'Tutorial', engagement: '+68%', description: 'How-to guide' },
    { format: 'Clips', engagement: '+62%', description: 'Long-form clips' },
  ],
  facebook: [
    { format: 'Relatable', engagement: '+72%', description: 'Share-worthy' },
    { format: 'Heartwarming', engagement: '+68%', description: 'Emotional content' },
    { format: 'Tutorial', engagement: '+58%', description: 'Easy how-to' },
    { format: 'Nostalgia', engagement: '+65%', description: 'Throwback vibes' },
    { format: 'Family Content', engagement: '+75%', description: 'Family-friendly' },
    { format: 'News/Updates', engagement: '+52%', description: 'Timely content' },
  ],
  snapchat: [
    { format: 'Quick Cut', engagement: '+85%', description: 'Fast edits' },
    { format: 'POV', engagement: '+78%', description: 'First-person' },
    { format: 'AR Lens', engagement: '+92%', description: 'Use filters' },
    { format: 'Raw/Unfiltered', engagement: '+72%', description: 'Authentic' },
    { format: 'Challenge', engagement: '+82%', description: 'Trending challenge' },
    { format: 'Day Recap', engagement: '+58%', description: 'Daily life' },
  ],
};

const PLATFORM_TRENDING_TOPICS = {
  tiktok: ['#fyp', '#viral', '#trending', '#foryou', '#duet', '#stitch'],
  instagram: ['#reels', '#explore', '#instagood', '#trending', '#viral', '#aesthetic'],
  youtube: ['#shorts', '#viral', '#trending', '#subscribe', '#youtubeshorts'],
  facebook: ['#reels', '#viral', '#trending', '#share', '#facebook'],
  snapchat: ['#spotlight', '#snapchat', '#viral', '#fyp', '#trending'],
};

const PLATFORM_COLORS = {
  tiktok: { primary: '#000000', accent: '#FE2C55', bg: 'from-black to-gray-900' },
  instagram: { primary: '#E1306C', accent: '#833AB4', bg: 'from-purple-600 via-pink-500 to-orange-400' },
  youtube: { primary: '#FF0000', accent: '#282828', bg: 'from-red-600 to-red-800' },
  facebook: { primary: '#1877F2', accent: '#4267B2', bg: 'from-blue-600 to-blue-800' },
  snapchat: { primary: '#FFFC00', accent: '#000000', bg: 'from-yellow-400 to-yellow-500' },
};

const PLATFORM_PEAK_TIMES = {
  tiktok: [
    { time: '9:00 AM', engagement: '+22%' },
    { time: '12:00 PM', engagement: '+35%' },
    { time: '7:00 PM', engagement: '+48%' },
    { time: '10:00 PM', engagement: '+52%' },
  ],
  instagram: [
    { time: '7:00 AM', engagement: '+18%' },
    { time: '12:00 PM', engagement: '+32%' },
    { time: '5:00 PM', engagement: '+42%' },
    { time: '9:00 PM', engagement: '+45%' },
  ],
  youtube: [
    { time: '2:00 PM', engagement: '+25%' },
    { time: '6:00 PM', engagement: '+38%' },
    { time: '9:00 PM', engagement: '+42%' },
  ],
  facebook: [
    { time: '9:00 AM', engagement: '+28%' },
    { time: '1:00 PM', engagement: '+35%' },
    { time: '7:00 PM', engagement: '+32%' },
  ],
  snapchat: [
    { time: '10:00 AM', engagement: '+32%' },
    { time: '3:00 PM', engagement: '+45%' },
    { time: '11:00 PM', engagement: '+55%' },
  ],
};

// Quick caption templates for Reels
const REEL_HOOKS = [
  { id: 'pov', label: 'POV:', example: 'POV: You just discovered...' },
  { id: 'wait', label: 'Wait for it...', example: 'Wait for it... 🔥' },
  { id: 'howto', label: 'How to', example: 'How to [achieve X] in 30 seconds' },
  { id: 'secret', label: 'Secret', example: 'The secret no one tells you about...' },
  { id: 'before', label: 'Before/After', example: 'Before vs After using...' },
  { id: 'unpopular', label: 'Unpopular Opinion', example: 'Unpopular opinion:' },
];

const SUGGESTED_TIMES = [
  { time: '7:00 AM', engagement: '+15%', reason: 'Early scrollers' },
  { time: '12:00 PM', engagement: '+28%', reason: 'Lunch break peak' },
  { time: '5:00 PM', engagement: '+35%', reason: 'Commute time' },
  { time: '9:00 PM', engagement: '+42%', reason: 'Evening prime time' },
];

// =============================================================================
// SOUNDS & EFFECTS PANEL - Shows Original Audio indicator
// =============================================================================

function SoundsPanel({ selectedSound, onSelectSound, onAddEffect, selectedPlatforms = [] }) {
  return (
    <div className="flex flex-col">
      <div className="border-b border-[var(--glass-border)] bg-gradient-to-r from-[var(--brand-primary)]/10 to-[var(--brand-primary)]/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5 text-[var(--brand-primary)]" />
          <h3 className="font-semibold text-[var(--text-primary)]">Audio</h3>
        </div>
        <p className="mt-1 text-xs text-[var(--text-tertiary)]">
          Audio from your uploaded video will be used
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Original Audio Indicator */}
        <div className="flex items-center gap-3 rounded-xl border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)]">
            <Volume2 className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Original Audio</p>
            <p className="text-xs text-[var(--text-tertiary)]">Audio from uploaded video</p>
          </div>
          <Check className="h-5 w-5 text-[var(--brand-primary)]" />
        </div>

        <p className="text-xs text-[var(--text-tertiary)] text-center">
          Add trending sounds directly in {selectedPlatforms.length > 0 ? selectedPlatforms.join(', ') : 'the app'} after posting
        </p>

        {/* Effects Section */}
        <div className="pt-4 border-t border-[var(--glass-border)]">
          <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            Effects
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Palette, label: 'Filters', count: '24' },
              { icon: Type, label: 'Text Styles', count: '18' },
              { icon: Sticker, label: 'Stickers', count: '100+' },
              { icon: Zap, label: 'Transitions', count: '32' },
            ].map((effect) => (
              <button
                key={effect.label}
                onClick={() => onAddEffect?.(effect.label)}
                className="flex flex-col items-center gap-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3 transition-colors hover:border-[var(--brand-primary)]/50"
              >
                <effect.icon className="h-5 w-5 text-[var(--text-secondary)]" />
                <span className="text-xs font-medium text-[var(--text-primary)]">{effect.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PLATFORM CONTEXT BAR - Connects left and right sidebars, controls platform state
// =============================================================================

function PlatformContextBar({ 
  availablePlatforms,
  selectedPlatforms,
  onTogglePlatform,
  activePlatform,
  onActivePlatformChange,
  connectedPlatforms,
}) {
  return (
    <div className="shrink-0 flex items-center justify-between border-b border-[var(--glass-border)] bg-gradient-to-r from-[var(--glass-bg)] via-[var(--surface-page)] to-[var(--glass-bg)] px-6 py-3">
      {/* Left: Tailoring indicator */}
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10">
          <Wand2 className="h-4 w-4 text-[var(--brand-primary)]" />
        </div>
        <div>
          <p className="text-xs font-medium text-[var(--text-primary)]">Tailoring for</p>
          <p className="text-[10px] text-[var(--text-tertiary)]">Click platform to preview & customize</p>
        </div>
      </div>

      {/* Center: Platform Buttons - THE MAIN CONTROL */}
      <div className="flex items-center gap-1">
        {availablePlatforms.map((platform) => {
          const isConnected = connectedPlatforms.includes(platform);
          const isSelected = selectedPlatforms.includes(platform);
          const isActive = activePlatform === platform;
          const colors = PLATFORM_COLORS[platform] || { primary: '#666', bg: 'from-gray-600 to-gray-700' };
          
          return (
            <Tooltip key={platform}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    if (!isConnected) return;
                    // Always activate this platform for preview
                    onActivePlatformChange(platform);
                    // If not selected, add to post targets
                    if (!isSelected) {
                      onTogglePlatform(platform);
                    }
                  }}
                  disabled={!isConnected}
                  className={cn(
                    'group relative flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all duration-200',
                    isActive
                      ? `bg-gradient-to-r ${colors.bg} text-white shadow-lg scale-105`
                      : isSelected
                        ? 'border-2 border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 text-[var(--text-primary)]'
                        : isConnected
                          ? 'border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/50 hover:bg-[var(--glass-bg-hover)]'
                          : 'border border-[var(--glass-border)] bg-[var(--glass-bg)] opacity-40 cursor-not-allowed'
                  )}
                >
                  <PlatformIcon platform={platform} size={18} />
                  <span className="text-sm font-medium capitalize">{platform === 'youtube' ? 'Shorts' : platform}</span>
                  
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full transition-colors',
                      isActive ? 'bg-white/20' : 'bg-[var(--brand-primary)]'
                    )}>
                      <Check className={cn('h-3 w-3', isActive ? 'text-white' : 'text-white')} />
                    </div>
                  )}
                  {!isSelected && isConnected && (
                    <Circle className="h-4 w-4 text-[var(--text-tertiary)]" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {!isConnected ? (
                  <p>Connect {platform} in settings</p>
                ) : isActive ? (
                  <p>Viewing {platform} preview & trends</p>
                ) : isSelected ? (
                  <p>Click to preview {platform}</p>
                ) : (
                  <p>Click to add {platform} to post</p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Right: Selected count */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-xs font-medium text-[var(--text-primary)]">
            {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''}
          </p>
          <p className="text-[10px] text-[var(--text-tertiary)]">
            {selectedPlatforms.length > 0 ? 'Will post to all' : 'Select platforms'}
          </p>
        </div>
        {selectedPlatforms.length > 1 && (
          <div className="flex -space-x-2">
            {selectedPlatforms.slice(0, 4).map((p) => (
              <div key={p} className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--surface-page)] bg-[var(--glass-bg)]">
                <PlatformIcon platform={p} size={12} />
              </div>
            ))}
            {selectedPlatforms.length > 4 && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--surface-page)] bg-[var(--glass-bg)] text-[10px] font-medium">
                +{selectedPlatforms.length - 4}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// PLATFORM-AWARE TOOLS PANEL - Left sidebar content changes per platform
// =============================================================================

function PlatformToolsPanel({ 
  activePlatform,
  selectedSound,
  onSelectSound,
  onHookClick,
  onHashtagAdd,
  // Real insights data from API
  platformHooks = [],
  platformFormats = [],
  platformTopics = [],
  platformTimes = [],
  insightsLoading = false,
  insightsSource = null,
}) {
  const colors = PLATFORM_COLORS[activePlatform] || { primary: '#666' };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Platform Header - Shows which platform's tools we're viewing */}
      <div 
        className="shrink-0 border-b border-[var(--glass-border)] px-4 py-3"
        style={{ 
          background: `linear-gradient(135deg, ${colors.primary}15, ${colors.primary}05)` 
        }}
      >
        <div className="flex items-center gap-2">
          <PlatformIcon platform={activePlatform} size={24} />
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] capitalize">
              {activePlatform === 'youtube' ? 'YouTube Shorts' : `${activePlatform} Reels`}
            </h3>
            <p className="text-[10px] text-[var(--text-tertiary)]">Trending content & tools</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 space-y-5">
          {/* Trending Hooks for This Platform */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                <TrendingUp className="h-3.5 w-3.5" style={{ color: colors.primary }} />
                Trending Hooks
              </h4>
            </div>
            <div className="space-y-2">
              {platformHooks.map((item, i) => (
                <button
                  key={i}
                  onClick={() => onHookClick?.(item.hook)}
                  className="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] p-2.5 text-left transition-all hover:border-[var(--brand-primary)]/50"
                >
                  <p className="text-xs text-[var(--text-primary)]">{item.hook}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[10px]" style={{ color: colors.primary }}>{item.uses} uses</span>
                    <span className="text-[10px] text-green-500">{item.engagement}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Viral Formats for This Platform */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              <Flame className="h-3.5 w-3.5" style={{ color: colors.primary }} />
              Viral Formats
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {platformFormats.map((item) => (
                <div
                  key={item.format}
                  className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] p-2.5 text-center transition-colors hover:border-[var(--brand-primary)]/50"
                >
                  <p className="text-xs font-medium text-[var(--text-primary)]">{item.format}</p>
                  <p className="text-[10px] text-green-500">{item.engagement}</p>
                  <p className="text-[9px] text-[var(--text-tertiary)]">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Trending Topics/Hashtags for This Platform */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              <Hash className="h-3.5 w-3.5" style={{ color: colors.primary }} />
              Trending Topics
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {platformTopics.map((tag) => (
                <button
                  key={tag}
                  onClick={() => onHashtagAdd?.(tag.replace('#', ''))}
                  className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 py-1 text-xs transition-colors hover:border-[var(--brand-primary)]/50"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Peak Times for This Platform */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              <Clock className="h-3.5 w-3.5" style={{ color: colors.primary }} />
              Peak Post Times
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {platformTimes.map((slot) => (
                <div
                  key={slot.time}
                  className="flex items-center justify-between rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2"
                >
                  <span className="text-xs text-[var(--text-secondary)]">{slot.time}</span>
                  <span className="text-xs font-medium text-green-500">{slot.engagement}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Audio Section */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              <Music className="h-3.5 w-3.5" style={{ color: colors.primary }} />
              Audio
            </h4>
            <div className="flex items-center gap-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3">
              <div 
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: colors.primary }}
              >
                <Volume2 className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)]">Original Audio</p>
                <p className="text-xs text-[var(--text-tertiary)]">From uploaded video</p>
              </div>
              <Check className="h-5 w-5" style={{ color: colors.primary }} />
            </div>
            <p className="text-[10px] text-[var(--text-tertiary)] text-center">
              Add trending sounds in {activePlatform} after posting
            </p>
          </div>

          {/* AI Assistant */}
          <div className="rounded-xl border border-[var(--glass-border)] bg-gradient-to-br from-[var(--brand-primary)]/10 to-[var(--brand-primary)]/10 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)]">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">AI Assistant</h3>
                <p className="text-[10px] text-[var(--text-tertiary)]">Optimized for {activePlatform}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={async () => {
                try {
                  toast.info('Generating caption...')
                  const { default: signalApi } = await import('@/lib/signal-api')
                  const { data } = await signalApi.post('/echo/send', {
                    message: `Write a short, engaging ${activePlatform} caption for a video reel. ${caption ? `Current caption for context: "${caption}"` : 'No context yet.'}. Keep it under 200 characters, punchy and platform-appropriate.`,
                    skill: 'content',
                  })
                  if (data?.content) setCaption(data.content.trim())
                } catch { toast.error('Failed to generate caption') }
              }}>
                <Sparkles className="mr-2 h-3.5 w-3.5 text-[var(--brand-primary)]" />
                Generate {activePlatform} Caption
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={async () => {
                try {
                  toast.info('Writing script...')
                  const { default: signalApi } = await import('@/lib/signal-api')
                  const { data } = await signalApi.post('/echo/send', {
                    message: `Write a short video script for a ${activePlatform} reel. ${caption ? `Topic: "${caption}"` : 'Create something engaging.'}. Format: Hook → Body → CTA. Keep it under 60 seconds.`,
                    skill: 'content',
                  })
                  if (data?.content) setCaption(data.content.trim())
                } catch { toast.error('Failed to generate script') }
              }}>
                <Type className="mr-2 h-3.5 w-3.5 text-[var(--brand-primary)]" />
                Write Video Script
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// VIDEO PREVIEW - Right column - Now platform-aware
// =============================================================================

function VideoPreviewPanel({ 
  videoFile, 
  aspectRatio, 
  selectedSound,
  caption,
  hashtags,
  activePlatform,
}) {
  const colors = PLATFORM_COLORS[activePlatform] || { primary: '#666' };

  const getAspectStyle = () => {
    const ratio = ASPECT_RATIOS.find(r => r.id === aspectRatio);
    if (!ratio) return { paddingBottom: '177.78%' }; // Default 9:16
    return { paddingBottom: `${(ratio.height / ratio.width) * 100}%` };
  };

  // Platform-specific UI elements
  const getPlatformUI = () => {
    switch (activePlatform) {
      case 'tiktok':
        return { label: 'For You', icon: 'home' };
      case 'instagram':
        return { label: 'Reels', icon: 'reels' };
      case 'youtube':
        return { label: 'Shorts', icon: 'shorts' };
      case 'facebook':
        return { label: 'Reels', icon: 'reels' };
      case 'snapchat':
        return { label: 'Spotlight', icon: 'spotlight' };
      default:
        return { label: 'Preview', icon: 'default' };
    }
  };

  const platformUI = getPlatformUI();

  return (
    <div className="flex h-full flex-col">
      {/* Platform-aware header */}
      <div 
        className="border-b border-[var(--glass-border)] px-4 py-3"
        style={{ background: `linear-gradient(135deg, ${colors.primary}15, ${colors.primary}05)` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlatformIcon platform={activePlatform} size={20} />
            <div>
              <h3 className="font-semibold text-[var(--text-primary)] capitalize">
                {activePlatform === 'youtube' ? 'YouTube Shorts' : `${activePlatform}`} Preview
              </h3>
              <p className="text-[10px] text-[var(--text-tertiary)]">{platformUI.label}</p>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="mx-auto max-w-[280px]">
          {/* Phone Frame with platform-specific accent */}
          <div 
            className="relative rounded-[2.5rem] border-4 p-2 shadow-2xl"
            style={{ borderColor: colors.primary, backgroundColor: '#1a1a1a' }}
          >
            <div className="relative overflow-hidden rounded-[2rem] bg-black" style={getAspectStyle()}>
              <div className="absolute inset-0">
                {videoFile ? (
                  <video
                    src={videoFile.url}
                    className="h-full w-full object-cover"
                    loop
                    muted
                    playsInline
                  />
                ) : (
                  <div 
                    className="flex h-full w-full flex-col items-center justify-center"
                    style={{ background: `linear-gradient(180deg, ${colors.primary}20, #000)` }}
                  >
                    <Video className="mb-3 h-12 w-12 text-gray-600" />
                    <p className="text-sm text-gray-500">Upload video</p>
                  </div>
                )}

                {/* Overlay UI */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Top gradient */}
                  <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/50 to-transparent" />
                  
                  {/* Platform indicator */}
                  <div className="absolute left-3 top-3 flex items-center gap-1.5">
                    <PlatformIcon platform={activePlatform} size={16} />
                    <span className="text-xs font-medium text-white">{platformUI.label}</span>
                  </div>

                  {/* Right side actions - platform-specific styling */}
                  <div className="absolute right-3 bottom-32 flex flex-col items-center gap-4">
                    <div className="flex flex-col items-center">
                      <Heart className="h-7 w-7 text-white" />
                      <span className="text-xs text-white">24.5K</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <MessageSquare className="h-7 w-7 text-white" />
                      <span className="text-xs text-white">892</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Share2 className="h-7 w-7 text-white" />
                      <span className="text-xs text-white">Share</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Bookmark className="h-7 w-7 text-white" />
                      <span className="text-xs text-white">Save</span>
                    </div>
                  </div>

                  {/* Bottom content */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-16">
                    <p className="text-sm font-semibold text-white">@yourbrand</p>
                    <p className="mt-1 text-xs text-white/90 line-clamp-2">
                      {caption || 'Your caption here...'}
                    </p>
                    {hashtags.length > 0 && (
                      <p className="mt-1 text-xs text-white/70">
                        {hashtags.slice(0, 3).map(t => `#${t}`).join(' ')}
                        {hashtags.length > 3 && ` +${hashtags.length - 3}`}
                      </p>
                    )}
                    {selectedSound && (
                      <div className="mt-2 flex items-center gap-2">
                        <Music className="h-3 w-3 text-white" />
                        <span className="text-xs text-white/80 truncate">{selectedSound.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* Notch */}
            <div className="absolute left-1/2 top-4 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
          </div>

          {/* Predicted Performance - Platform specific */}
          <Card className="mt-4 border-[var(--glass-border)] bg-[var(--glass-bg)]">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold">
                <BarChart2 className="h-3.5 w-3.5" style={{ color: colors.primary }} />
                <span className="capitalize">{activePlatform}</span> Predicted Reach
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-3 pb-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {selectedSound ? '25K - 100K' : '5K - 20K'}
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">estimated views on {activePlatform}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">Sound</span>
                  <span className={cn('font-medium', selectedSound ? 'text-emerald-500' : 'text-amber-500')}>
                    {selectedSound ? '+40% boost' : 'Add trending sound'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">Hook</span>
                  <span className={cn('font-medium', caption.length > 10 ? 'text-emerald-500' : 'text-amber-500')}>
                    {caption.length > 10 ? 'Strong' : 'Add hook'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">Hashtags</span>
                  <span className={cn('font-medium', hashtags.length >= 3 ? 'text-emerald-500' : 'text-amber-500')}>
                    {hashtags.length >= 5 ? 'Optimal' : hashtags.length >= 3 ? 'Good' : 'Add more'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}

// =============================================================================
// MAIN REEL COMPOSER
// =============================================================================

export function ReelComposer({ 
  editPost = null,
  defaults = {},
  onComplete,
  onCancel,
  connections = [],
}) {
  const { createPost, updatePost } = useBroadcastStore();
  const { currentProject } = useAuthStore();
  const projectId = currentProject?.id;

  const connectedPlatforms = useMemo(() =>
    connections.filter(c => c.status === 'active' && REEL_PLATFORMS.includes(c.platform)).map(c => c.platform),
    [connections]
  );

  // State
  const [caption, setCaption] = useState('');
  const [platforms, setPlatforms] = useState([]);
  const [activePlatform, setActivePlatform] = useState(connectedPlatforms[0] || 'instagram'); // NEW: Active platform for context

  // Fetch real insights for the active platform (peak times, formats, trends, hooks)
  const insights = useBroadcastInsights(projectId, activePlatform);
  const insightsData = transformInsightsForComponent(insights);

  const [hashtags, setHashtags] = useState([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [selectedSound, setSelectedSound] = useState(defaults.sound || null);
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [scheduledAt, setScheduledAt] = useState(null);
  const [selectedTime, setSelectedTime] = useState('21:00');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errors, setErrors] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef(null);

  // Sync active platform with first connected platform
  useEffect(() => {
    if (connectedPlatforms.length > 0 && !connectedPlatforms.includes(activePlatform)) {
      setActivePlatform(connectedPlatforms[0]);
    }
  }, [connectedPlatforms, activePlatform]);

  // Initialize
  useEffect(() => {
    if (editPost) {
      setCaption(editPost.content || '');
      setPlatforms(editPost.platforms?.filter(p => REEL_PLATFORMS.includes(p)) || []);
      setHashtags(editPost.hashtags || []);
      if (editPost.mediaUrls?.[0]) {
        setVideoFile({ url: editPost.mediaUrls[0], type: 'video' });
      }
      if (editPost.scheduledAt) {
        setScheduledAt(new Date(editPost.scheduledAt));
        setSelectedTime(format(new Date(editPost.scheduledAt), 'HH:mm'));
      }
    } else {
      const tonight = new Date();
      tonight.setHours(21, 0, 0, 0);
      if (tonight < new Date()) tonight.setDate(tonight.getDate() + 1);
      setScheduledAt(tonight);
      if (defaults.sound) setSelectedSound(defaults.sound);
    }
  }, [editPost, defaults]);

  // Handlers
  const handleVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile({
        file,
        url: URL.createObjectURL(file),
        type: 'video',
        name: file.name,
        duration: 0,
      });
    }
  };

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, '');
    if (tag && !hashtags.includes(tag)) {
      setHashtags([...hashtags, tag]);
    }
    setHashtagInput('');
  };

  const removeHashtag = (tag) => {
    setHashtags(hashtags.filter(t => t !== tag));
  };

  const handleDateSelect = (date) => {
    if (date) {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);
      setScheduledAt(date);
    }
    setShowDatePicker(false);
  };

  const handleTimeChange = (time) => {
    setSelectedTime(time);
    if (scheduledAt) {
      const [hours, minutes] = time.split(':').map(Number);
      const newDate = new Date(scheduledAt);
      newDate.setHours(hours, minutes, 0, 0);
      setScheduledAt(newDate);
    }
  };

  const handleQuickTime = (timeStr) => {
    const today = scheduledAt || new Date();
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    const newDate = new Date(today);
    newDate.setHours(hours, minutes || 0, 0, 0);
    setScheduledAt(newDate);
    setSelectedTime(`${hours.toString().padStart(2, '0')}:${(minutes || 0).toString().padStart(2, '0')}`);
  };

  const handleHookClick = (hookText) => {
    // hookText is now just the hook string from the platform-specific data
    const cleanHook = hookText.replace(/^"|"$/g, ''); // Remove quotes
    setCaption(cleanHook + '\n\n' + caption);
  };

  // Add hashtag from trending topics
  const handleHashtagFromTrending = (tag) => {
    if (!hashtags.includes(tag)) {
      setHashtags([...hashtags, tag]);
    }
  };

  // Toggle platform selection for posting
  const handleTogglePlatform = (platform) => {
    setPlatforms(prev => 
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const validate = () => {
    const newErrors = {};
    if (!videoFile) newErrors.video = 'Upload a video';
    if (platforms.length === 0) newErrors.platforms = 'Select at least one platform';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (publish = true) => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const postData = {
        projectId,
        content: caption,
        platforms,
        hashtags,
        mediaUrls: videoFile ? [videoFile.url] : [],
        scheduledAt: scheduledAt?.toISOString(),
        status: publish ? (scheduledAt > new Date() ? 'scheduled' : 'published') : 'draft',
        postType: 'reel',
        metadata: {
          sound: selectedSound,
          aspectRatio,
        },
      };

      if (editPost) {
        await updatePost(editPost.id, postData);
        toast.success('Reel updated!');
      } else {
        await createPost(postData);
        toast.success(publish ? 'Reel scheduled!' : 'Draft saved!');
      }
      onComplete?.();
    } catch (error) {
      toast.error('Failed to save reel');
    } finally {
      setIsSubmitting(false);
    }
  };

  const charCount = useMemo(() => {
    const limit = PLATFORM_LIMITS[platforms[0]]?.text || 2200;
    return { current: caption.length, limit, isOver: caption.length > limit };
  }, [caption, platforms]);

  return (
    <TooltipProvider>
      <div className="flex h-full min-h-0 flex-col bg-[var(--surface-page)]">
        {/* PLATFORM CONTEXT BAR - Connects left and right sidebars */}
        <PlatformContextBar
          availablePlatforms={REEL_PLATFORMS}
          selectedPlatforms={platforms}
          onTogglePlatform={handleTogglePlatform}
          activePlatform={activePlatform}
          onActivePlatformChange={setActivePlatform}
          connectedPlatforms={connectedPlatforms}
        />
        
        {/* 3-Column Layout */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* LEFT: Platform-Aware Tools Panel */}
          <div className="hidden h-full min-h-0 min-w-80 w-80 shrink-0 flex flex-col overflow-hidden border-r border-[var(--glass-border)] bg-[var(--surface-page)] lg:flex xl:min-w-96 xl:w-96">
            <PlatformToolsPanel
              activePlatform={activePlatform}
              selectedSound={selectedSound}
              onSelectSound={setSelectedSound}
              onHookClick={handleHookClick}
              onHashtagAdd={handleHashtagFromTrending}
              // Real insights data from API
              platformHooks={insightsData.platformHooks}
              platformFormats={insightsData.platformFormats}
              platformTopics={insightsData.platformTopics}
              platformTimes={insightsData.platformTimes}
              insightsLoading={insights.isLoading}
              insightsSource={insights.source}
            />
          </div>

          {/* CENTER: Video Editor - Universal content creation */}
          <ScrollArea className="flex-1">
            <div className="mx-auto max-w-4xl space-y-5 p-6">
              {errors.platforms && (
                <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <p className="text-sm text-red-500">{errors.platforms}</p>
                </div>
              )}

              {/* Video Upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Video</Label>
                  <div className="flex gap-1">
                    {ASPECT_RATIOS.map((ratio) => (
                      <Tooltip key={ratio.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setAspectRatio(ratio.id)}
                            className={cn(
                              'rounded-lg border p-1.5 transition-colors',
                              aspectRatio === ratio.id
                                ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                                : 'border-[var(--glass-border)] hover:border-[var(--brand-primary)]/50'
                            )}
                          >
                            <ratio.icon className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{ratio.description}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
                
                {videoFile ? (
                  <div className="relative overflow-hidden rounded-xl border border-[var(--glass-border)]">
                    <video
                      ref={videoRef}
                      src={videoFile.url}
                      className="aspect-video w-full bg-black object-contain"
                      loop
                      muted={isMuted}
                    />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent p-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (isPlaying) videoRef.current?.pause();
                            else videoRef.current?.play();
                            setIsPlaying(!isPlaying);
                          }}
                          className="h-8 w-8 text-white hover:bg-white/20"
                        >
                          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setIsMuted(!isMuted)}
                          className="h-8 w-8 text-white hover:bg-white/20"
                        >
                          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setVideoFile(null)}
                        className="text-white hover:bg-white/20"
                      >
                        <X className="mr-1 h-3 w-3" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--glass-border)] bg-[var(--glass-bg)] transition-colors hover:border-[var(--brand-primary)]">
                    <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                    <Upload className="mb-2 h-10 w-10 text-[var(--text-tertiary)]" />
                    <p className="text-sm font-medium text-[var(--text-secondary)]">Upload Video</p>
                    <p className="text-xs text-[var(--text-tertiary)]">MP4, MOV up to 90 seconds</p>
                  </label>
                )}
                {errors.video && <p className="text-xs text-red-500">{errors.video}</p>}
              </div>

              {/* Selected Sound */}
              {selectedSound && (
                <div className="flex items-center gap-3 rounded-xl border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-primary)]">
                    <Music className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{selectedSound.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{selectedSound.artist} • {selectedSound.uses} uses</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedSound(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Caption */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Caption</Label>
                  <span className={cn('text-xs', charCount.isOver ? 'text-red-500' : 'text-[var(--text-tertiary)]')}>
                    {charCount.current}/{charCount.limit}
                  </span>
                </div>
                
                {/* Hook Templates */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {REEL_HOOKS.map((hook) => (
                    <button
                      key={hook.id}
                      onClick={() => handleHookClick(hook.example)}
                      className="whitespace-nowrap rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-1 text-xs transition-colors hover:border-[var(--brand-primary)]"
                    >
                      {hook.label}
                    </button>
                  ))}
                </div>
                
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a catchy caption... Start with a hook!"
                  className="min-h-[100px] resize-none"
                />
              </div>

              {/* Hashtags */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 text-sm font-medium">
                    <Hash className="h-3.5 w-3.5" />
                    Hashtags
                  </Label>
                  <Button variant="ghost" size="sm" onClick={async () => {
                    try {
                      toast.info('Generating hashtags...')
                      const { default: signalApi } = await import('@/lib/signal-api')
                      const { data } = await signalApi.post('/echo/send', {
                        message: `Suggest 8-12 trending ${activePlatform} hashtags for a video reel. ${caption ? `Context: "${caption}"` : ''}. Return ONLY the hashtags as a comma-separated list without the # symbol.`,
                        skill: 'content',
                      })
                      if (data?.content) {
                        const tags = data.content.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean)
                        if (tags.length) setHashtags(tags)
                      }
                    } catch { toast.error('Failed to generate hashtags') }
                  }}>
                    <Sparkles className="mr-1 h-3 w-3" />
                    AI Suggest
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] p-2 min-h-[44px]">
                  {hashtags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
                      #{tag}
                      <button onClick={() => removeHashtag(tag)} className="hover:text-red-500">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                  <Input
                    value={hashtagInput}
                    onChange={(e) => setHashtagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
                    onBlur={addHashtag}
                    placeholder="Add hashtags..."
                    className="h-6 min-w-[100px] flex-1 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
                  />
                </div>
              </div>

              {/* Schedule */}
              <div className="space-y-3">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <Calendar className="h-3.5 w-3.5" />
                  Schedule
                </Label>
                <div className="flex gap-2">
                  <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start">
                        <Calendar className="mr-2 h-4 w-4" />
                        {scheduledAt ? format(scheduledAt, 'MMM d, yyyy') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker mode="single" selected={scheduledAt} onSelect={handleDateSelect} disabled={(date) => date < new Date()} />
                    </PopoverContent>
                  </Popover>
                  <Input type="time" value={selectedTime} onChange={(e) => handleTimeChange(e.target.value)} className="w-32" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-[var(--text-tertiary)]">Peak times for {activePlatform}:</span>
                  {(PLATFORM_PEAK_TIMES[activePlatform] || SUGGESTED_TIMES).map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => handleQuickTime(slot.time)}
                      className="flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2 py-0.5 text-xs transition-colors hover:border-[var(--brand-primary)]"
                    >
                      {slot.time}
                      <span className="text-[var(--brand-primary)]">{slot.engagement}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* RIGHT: Platform-Aware Preview + Actions */}
          <div className="hidden w-80 flex-col border-l border-[var(--glass-border)] bg-[var(--surface-secondary)] lg:flex xl:w-96">
            {/* Action Buttons - At Top */}
            <div className="shrink-0 border-b border-[var(--glass-border)] bg-[var(--surface-page)] p-4 space-y-3">
              {/* Schedule Picker */}
              <div className="flex gap-2">
                <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 justify-start text-xs">
                      <Calendar className="mr-2 h-3.5 w-3.5" />
                      {scheduledAt ? format(scheduledAt, 'MMM d') : 'Schedule'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <CalendarPicker mode="single" selected={scheduledAt} onSelect={handleDateSelect} disabled={(date) => date < new Date()} />
                  </PopoverContent>
                </Popover>
                <Input 
                  type="time" 
                  value={selectedTime} 
                  onChange={(e) => handleTimeChange(e.target.value)} 
                  className="w-24 text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleSubmit(false)} 
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Draft
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => handleSubmit(true)} 
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white hover:opacity-90"
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  {scheduledAt && scheduledAt > new Date() ? 'Schedule' : 'Publish'}
                </Button>
              </div>
            </div>

            {/* Preview Area - Platform-specific */}
            <div className="flex-1 overflow-y-auto">
              <VideoPreviewPanel
                videoFile={videoFile}
                aspectRatio={aspectRatio}
                selectedSound={selectedSound}
                caption={caption}
                hashtags={hashtags}
                activePlatform={activePlatform}
              />
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default ReelComposer;
