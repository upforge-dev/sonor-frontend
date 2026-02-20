// src/pages/broadcast/components/StoryComposer.jsx
// Optimized composer for Stories - EPHEMERAL, AUTHENTIC, INTERACTIVE
// 3-column layout: Stickers & Tools | Canvas Editor | Preview & Engagement
// Purpose: Drive daily engagement with authentic, time-sensitive content
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Image,
  Video,
  Calendar,
  Clock,
  Send,
  Sparkles,
  Type,
  AlertCircle,
  Loader2,
  Eye,
  Save,
  Plus,
  X,
  Smartphone,
  Sticker,
  Palette,
  Link2,
  MessageCircle,
  BarChart2,
  MapPin,
  AtSign,
  Hash,
  Thermometer,
  Vote,
  HelpCircle,
  Smile,
  Music,
  Layers,
  Move,
  RotateCcw,
  Trash2,
  ChevronRight,
  ChevronDown,
  Search,
  Gift,
  ShoppingBag,
  ExternalLink,
  Timer,
  Users,
  Heart,
  MessageSquare,
  Share2,
  Camera,
  Maximize2,
  Upload,
  Wand2,
  Check,
  Circle,
  TrendingUp,
  Flame,
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
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { format, addHours, startOfHour } from 'date-fns';
import { useBroadcastStore } from '@/stores/broadcastStore';
import useAuthStore from '@/lib/auth-store';
import { useBroadcastInsights, transformInsightsForComponent } from '@/hooks/useBroadcastInsights';
import { PlatformIcon } from './PlatformIcon';
import { toast } from 'sonner';

// =============================================================================
// CONSTANTS - Story-specific
// =============================================================================

// Platforms that support Stories
const STORY_PLATFORMS = ['instagram', 'facebook', 'snapchat', 'linkedin', 'youtube'];

const PLATFORM_FEATURES = {
  instagram: { polls: true, questions: true, quiz: true, countdown: true, link: true, mentions: true, location: true, music: true },
  facebook: { polls: true, questions: false, quiz: false, countdown: false, link: true, mentions: true, location: true, music: false },
  snapchat: { polls: false, questions: false, quiz: false, countdown: false, link: true, mentions: true, location: true, music: true },
  linkedin: { polls: false, questions: false, quiz: false, countdown: false, link: true, mentions: true, location: false, music: false },
};

// Interactive stickers
const STICKER_TYPES = [
  { id: 'poll', label: 'Poll', icon: BarChart2, description: 'Ask your audience', color: 'bg-blue-500' },
  { id: 'question', label: 'Question', icon: HelpCircle, description: 'Get responses', color: 'bg-purple-500' },
  { id: 'quiz', label: 'Quiz', icon: Vote, description: 'Test knowledge', color: 'bg-pink-500' },
  { id: 'countdown', label: 'Countdown', icon: Timer, description: 'Build anticipation', color: 'bg-orange-500' },
  { id: 'mention', label: 'Mention', icon: AtSign, description: 'Tag accounts', color: 'bg-green-500' },
  { id: 'location', label: 'Location', icon: MapPin, description: 'Add place', color: 'bg-red-500' },
  { id: 'link', label: 'Link', icon: Link2, description: 'Swipe up/Tap', color: 'bg-cyan-500' },
  { id: 'music', label: 'Music', icon: Music, description: 'Add audio', color: 'bg-yellow-500' },
  { id: 'emoji', label: 'Emoji Slider', icon: Thermometer, description: 'Gauge reactions', color: 'bg-amber-500' },
  { id: 'hashtag', label: 'Hashtag', icon: Hash, description: 'Discoverability', color: 'bg-indigo-500' },
  { id: 'gif', label: 'GIF', icon: Smile, description: 'Add movement', color: 'bg-teal-500' },
  { id: 'product', label: 'Product', icon: ShoppingBag, description: 'Tag products', color: 'bg-emerald-500' },
];

// Background styles
const BACKGROUND_STYLES = [
  { id: 'gradient1', colors: ['#667eea', '#764ba2'], label: 'Purple Dream' },
  { id: 'gradient2', colors: ['#f093fb', '#f5576c'], label: 'Pink Sunset' },
  { id: 'gradient3', colors: ['#4facfe', '#00f2fe'], label: 'Ocean Blue' },
  { id: 'gradient4', colors: ['#43e97b', '#38f9d7'], label: 'Fresh Mint' },
  { id: 'gradient5', colors: ['#fa709a', '#fee140'], label: 'Warm Glow' },
  { id: 'gradient6', colors: ['#a8edea', '#fed6e3'], label: 'Soft Cotton' },
  { id: 'solid1', colors: ['#000000'], label: 'Black' },
  { id: 'solid2', colors: ['#ffffff'], label: 'White' },
];

// Text styles
const TEXT_STYLES = [
  { id: 'classic', label: 'Classic', font: 'sans-serif', style: 'normal' },
  { id: 'modern', label: 'Modern', font: 'system-ui', style: 'bold' },
  { id: 'neon', label: 'Neon', font: 'sans-serif', style: 'glow' },
  { id: 'typewriter', label: 'Typewriter', font: 'monospace', style: 'normal' },
  { id: 'handwritten', label: 'Script', font: 'cursive', style: 'normal' },
];

// Story templates
const STORY_TEMPLATES = [
  { id: 'question', label: 'Ask Me Anything', stickers: ['question'], description: 'Engage with Q&A' },
  { id: 'poll', label: 'This or That', stickers: ['poll'], description: 'Get quick opinions' },
  { id: 'countdown', label: 'Launch Countdown', stickers: ['countdown'], description: 'Build hype' },
  { id: 'behind', label: 'Behind the Scenes', stickers: ['emoji'], description: 'Show authenticity' },
  { id: 'product', label: 'Product Spotlight', stickers: ['product', 'link'], description: 'Drive sales' },
  { id: 'quiz', label: 'Fun Quiz', stickers: ['quiz'], description: 'Educate & entertain' },
];

// =============================================================================
// PLATFORM-SPECIFIC STORY DATA
// =============================================================================

const PLATFORM_COLORS = {
  instagram: { primary: '#E1306C', bg: 'from-pink-500 via-red-500 to-yellow-500' },
  facebook: { primary: '#1877F2', bg: 'from-blue-600 to-blue-700' },
  snapchat: { primary: '#FFFC00', bg: 'from-yellow-400 to-yellow-500' },
  linkedin: { primary: '#0A66C2', bg: 'from-blue-700 to-blue-800' },
  youtube: { primary: '#FF0000', bg: 'from-red-600 to-red-700' },
};

const PLATFORM_STORY_TRENDS = {
  instagram: [
    { hook: 'Day in my life...', uses: '2.8M', engagement: '+89%' },
    { hook: 'POV: You\'re...', uses: '1.9M', engagement: '+76%' },
    { hook: 'What I ordered vs what I got', uses: '1.2M', engagement: '+65%' },
    { hook: 'Rate 1-10 ⬇️', uses: '890K', engagement: '+71%' },
  ],
  facebook: [
    { hook: 'Quick update for you all...', uses: '1.5M', engagement: '+54%' },
    { hook: 'Behind the scenes look...', uses: '980K', engagement: '+62%' },
    { hook: 'What do you think? Poll below', uses: '1.1M', engagement: '+58%' },
    { hook: 'Throwback to...', uses: '750K', engagement: '+45%' },
  ],
  snapchat: [
    { hook: '📍 Live from...', uses: '2.1M', engagement: '+82%' },
    { hook: 'GRWM 💄', uses: '1.6M', engagement: '+78%' },
    { hook: 'ft. @...', uses: '1.3M', engagement: '+69%' },
    { hook: 'life update 🫶', uses: '990K', engagement: '+64%' },
  ],
  linkedin: [
    { hook: 'Quick professional tip...', uses: '450K', engagement: '+67%' },
    { hook: 'At [Event Name] today...', uses: '380K', engagement: '+72%' },
    { hook: 'Team celebration 🎉', uses: '290K', engagement: '+58%' },
    { hook: 'Office tour...', uses: '210K', engagement: '+51%' },
  ],
  youtube: [
    { hook: 'New video dropping soon...', uses: '1.8M', engagement: '+85%' },
    { hook: 'Subscribe for more 🔔', uses: '1.4M', engagement: '+72%' },
    { hook: 'BTS of my latest video', uses: '980K', engagement: '+68%' },
    { hook: 'Community poll 👇', uses: '650K', engagement: '+61%' },
  ],
};

const PLATFORM_STORY_FORMATS = {
  instagram: [
    { format: 'This or That', engagement: '+78%', description: 'Poll sticker' },
    { format: 'Q&A Box', engagement: '+71%', description: 'Question sticker' },
    { format: 'Countdown', engagement: '+65%', description: 'Build hype' },
    { format: 'Link Sticker', engagement: '+58%', description: 'Drive traffic' },
  ],
  facebook: [
    { format: 'Poll Story', engagement: '+62%', description: 'Quick engagement' },
    { format: 'Text Update', engagement: '+48%', description: 'Casual share' },
    { format: 'Photo Moment', engagement: '+55%', description: 'Real photos' },
    { format: 'Birthday/Event', engagement: '+71%', description: 'Celebrations' },
  ],
  snapchat: [
    { format: 'Snap Streak', engagement: '+85%', description: 'Daily content' },
    { format: 'Lens Story', engagement: '+79%', description: 'AR filters' },
    { format: 'Map Check-in', engagement: '+68%', description: 'Location share' },
    { format: 'Spotlight Tease', engagement: '+72%', description: 'Cross promo' },
  ],
  linkedin: [
    { format: 'Event Story', engagement: '+74%', description: 'Conference/event' },
    { format: 'Achievement', engagement: '+68%', description: 'Wins & milestones' },
    { format: 'Team Intro', engagement: '+52%', description: 'Culture content' },
    { format: 'Industry News', engagement: '+45%', description: 'Commentary' },
  ],
  youtube: [
    { format: 'Video Tease', engagement: '+81%', description: 'Upcoming content' },
    { format: 'Community Poll', engagement: '+69%', description: 'Engage subs' },
    { format: 'Stream Alert', engagement: '+75%', description: 'Live notice' },
    { format: 'Shorts Preview', engagement: '+62%', description: 'Cross promo' },
  ],
};

const PLATFORM_PEAK_TIMES = {
  instagram: [
    { time: '7-9 AM', engagement: '+42%' },
    { time: '12-2 PM', engagement: '+38%' },
    { time: '7-9 PM', engagement: '+52%' },
  ],
  facebook: [
    { time: '9-11 AM', engagement: '+35%' },
    { time: '1-3 PM', engagement: '+41%' },
    { time: '7-9 PM', engagement: '+45%' },
  ],
  snapchat: [
    { time: '10 AM-12 PM', engagement: '+48%' },
    { time: '8-10 PM', engagement: '+62%' },
    { time: '10 PM-12 AM', engagement: '+55%' },
  ],
  linkedin: [
    { time: '7-8 AM', engagement: '+52%' },
    { time: '12-1 PM', engagement: '+48%' },
    { time: '5-6 PM', engagement: '+41%' },
  ],
  youtube: [
    { time: '2-4 PM', engagement: '+45%' },
    { time: '6-8 PM', engagement: '+58%' },
    { time: '9-11 PM', engagement: '+52%' },
  ],
};

// =============================================================================
// STICKERS & TOOLS PANEL - Left column
// =============================================================================

function StickersPanel({ onAddSticker, activeStickers, platforms }) {
  const [activeTab, setActiveTab] = useState('stickers');
  const [selectedBackground, setSelectedBackground] = useState(null);
  const [selectedTextStyle, setSelectedTextStyle] = useState('classic');

  // Get available stickers based on selected platforms
  const availableStickers = useMemo(() => {
    if (platforms.length === 0) return STICKER_TYPES;
    
    return STICKER_TYPES.filter(sticker => {
      const featureKey = sticker.id === 'question' ? 'questions' : 
                        sticker.id === 'mention' ? 'mentions' :
                        sticker.id === 'emoji' ? 'polls' :
                        sticker.id === 'gif' ? 'mentions' :
                        sticker.id === 'product' ? 'link' :
                        sticker.id;
      return platforms.some(p => PLATFORM_FEATURES[p]?.[featureKey]);
    });
  }, [platforms]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--glass-border)] bg-[var(--brand-primary)]/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sticker className="h-5 w-5 text-[var(--brand-primary)]" />
          <h3 className="font-semibold text-[var(--text-primary)]">Stickers & Tools</h3>
        </div>
        <p className="mt-1 text-xs text-[var(--text-tertiary)]">
          Interactive stickers boost engagement 3x
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-3 grid grid-cols-3">
          <TabsTrigger value="stickers" className="text-xs">
            <Sticker className="mr-1 h-3 w-3" />
            Stickers
          </TabsTrigger>
          <TabsTrigger value="style" className="text-xs">
            <Palette className="mr-1 h-3 w-3" />
            Style
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs">
            <Layers className="mr-1 h-3 w-3" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stickers" className="flex-1 mt-0 p-0">
          <ScrollArea className="flex-1 p-4">
            <div className="grid grid-cols-2 gap-2">
              {availableStickers.map((sticker) => {
                const isActive = activeStickers.some(s => s.type === sticker.id);
                return (
                  <button
                    key={sticker.id}
                    onClick={() => onAddSticker(sticker)}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl border p-3 transition-all',
                      isActive
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                        : 'border-[var(--glass-border)] bg-[var(--glass-bg)] hover:border-[var(--brand-primary)]/50'
                    )}
                  >
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-white', sticker.color)}>
                      <sticker.icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium text-[var(--text-primary)]">{sticker.label}</span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">{sticker.description}</span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="style" className="flex-1 mt-0 p-4">
          <div className="space-y-4">
            {/* Backgrounds */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-[var(--text-secondary)]">Background</Label>
              <div className="grid grid-cols-4 gap-2">
                {BACKGROUND_STYLES.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => setSelectedBackground(bg.id)}
                    className={cn(
                      'aspect-square rounded-lg border-2 transition-all',
                      selectedBackground === bg.id ? 'border-white ring-2 ring-[var(--brand-primary)]' : 'border-transparent'
                    )}
                    style={{
                      background: bg.colors.length === 1 
                        ? bg.colors[0] 
                        : `linear-gradient(135deg, ${bg.colors.join(', ')})`
                    }}
                    title={bg.label}
                  />
                ))}
              </div>
            </div>

            <Separator />

            {/* Text Styles */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-[var(--text-secondary)]">Text Style</Label>
              <div className="space-y-1.5">
                {TEXT_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedTextStyle(style.id)}
                    className={cn(
                      'w-full rounded-lg border p-2 text-left transition-all',
                      selectedTextStyle === style.id
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                        : 'border-[var(--glass-border)] hover:border-[var(--brand-primary)]/50'
                    )}
                  >
                    <span 
                      className="text-sm"
                      style={{ 
                        fontFamily: style.font,
                        fontWeight: style.style === 'bold' ? 'bold' : 'normal',
                        textShadow: style.style === 'glow' ? '0 0 10px currentColor' : 'none'
                      }}
                    >
                      {style.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="flex-1 mt-0 p-4">
          <div className="space-y-2">
            {STORY_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => {
                  template.stickers.forEach(s => {
                    const sticker = STICKER_TYPES.find(st => st.id === s);
                    if (sticker) onAddSticker(sticker);
                  });
                  toast.success(`${template.label} template applied!`);
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3 text-left transition-colors hover:border-[var(--brand-primary)]/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-primary)] text-white">
                  <Layers className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{template.label}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{template.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--brand-primary)]">
              <Sparkles className="h-3.5 w-3.5" />
              Pro Tip
            </div>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Stories with interactive stickers see 2-3x more engagement than static content!
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =============================================================================
// STORY PREVIEW - Right column
// =============================================================================

function StoryPreviewPanel({ 
  mediaFile,
  text,
  stickers,
  platforms,
  linkUrl,
}) {
  const [selectedPreview, setSelectedPreview] = useState(platforms[0] || 'instagram');

  useEffect(() => {
    if (platforms.length > 0 && !platforms.includes(selectedPreview)) {
      setSelectedPreview(platforms[0]);
    }
  }, [platforms, selectedPreview]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--glass-border)] bg-[var(--surface-secondary)] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-[var(--text-tertiary)]" />
            <h3 className="font-semibold text-[var(--text-primary)]">Preview</h3>
          </div>
          <div className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
            <Timer className="h-3 w-3" />
            24h
          </div>
        </div>
      </div>

      {/* Platform Selector */}
      {platforms.length > 1 && (
        <div className="flex gap-1 border-b border-[var(--glass-border)] bg-[var(--glass-bg)] p-2">
          {platforms.map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPreview(p)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors',
                selectedPreview === p
                  ? 'bg-[var(--surface-secondary)] text-[var(--text-primary)]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              )}
            >
              <PlatformIcon platform={p} size={14} />
            </button>
          ))}
        </div>
      )}

      <ScrollArea className="flex-1 p-4">
        <div className="mx-auto max-w-[280px]">
          {/* Phone Frame */}
          <div className="relative rounded-[2.5rem] border-4 border-gray-800 bg-gray-800 p-2 shadow-2xl">
            <div className="relative overflow-hidden rounded-[2rem] bg-black" style={{ paddingBottom: '177.78%' }}>
              <div className="absolute inset-0">
                {mediaFile ? (
                  mediaFile.type === 'video' ? (
                    <video src={mediaFile.url} className="h-full w-full object-cover" loop muted playsInline />
                  ) : (
                    <img src={mediaFile.url} alt="" className="h-full w-full object-cover" />
                  )
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-[var(--brand-primary)]">
                    {text ? (
                      <p className="p-6 text-center text-xl font-bold text-white">{text}</p>
                    ) : (
                      <>
                        <Camera className="mb-3 h-12 w-12 text-white/80" />
                        <p className="text-sm text-white/60">Add media or text</p>
                      </>
                    )}
                  </div>
                )}

                {/* Story Progress Bar */}
                <div className="absolute inset-x-3 top-3 flex gap-1">
                  <div className="h-0.5 flex-1 rounded-full bg-white" />
                </div>

                {/* Profile */}
                <div className="absolute left-3 top-6 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-[var(--brand-primary)] ring-2 ring-white" />
                  <span className="text-xs font-semibold text-white drop-shadow">yourbrand</span>
                  <span className="text-xs text-white/60">2h</span>
                </div>

                {/* Stickers overlay */}
                {stickers.length > 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8">
                    {stickers.map((sticker, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 rounded-xl bg-white/90 px-4 py-2 shadow-lg backdrop-blur"
                      >
                        <sticker.icon className="h-5 w-5 text-gray-700" />
                        <span className="text-sm font-medium text-gray-800">{sticker.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Link sticker */}
                {linkUrl && (
                  <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-lg">
                      <Link2 className="h-4 w-4 text-gray-700" />
                      <span className="text-sm font-medium text-gray-800">See More</span>
                    </div>
                  </div>
                )}

                {/* Reply box */}
                <div className="absolute inset-x-3 bottom-3">
                  <div className="flex items-center gap-2 rounded-full bg-white/20 backdrop-blur px-4 py-2">
                    <span className="flex-1 text-xs text-white/60">Send message...</span>
                    <Heart className="h-5 w-5 text-white" />
                    <Share2 className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>
            </div>
            {/* Notch */}
            <div className="absolute left-1/2 top-4 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
          </div>

          {/* Engagement Tips */}
          <Card className="mt-4 border-[var(--glass-border)] bg-[var(--glass-bg)]">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                Engagement Boosters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-3 pb-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Interactive sticker</span>
                <span className={cn('font-medium', stickers.length > 0 ? 'text-emerald-500' : 'text-amber-500')}>
                  {stickers.length > 0 ? '+150% replies' : 'Add one!'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Media quality</span>
                <span className={cn('font-medium', mediaFile ? 'text-emerald-500' : 'text-amber-500')}>
                  {mediaFile ? 'Good' : 'Add media'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Link</span>
                <span className={cn('font-medium', linkUrl ? 'text-emerald-500' : 'text-[var(--text-tertiary)]')}>
                  {linkUrl ? 'Added' : 'Optional'}
                </span>
              </div>
            </CardContent>
          </Card>

          <p className="mt-3 text-center text-xs text-[var(--text-tertiary)]">
            Story expires in 24 hours
          </p>
        </div>
      </ScrollArea>
    </div>
  );
}

// =============================================================================
// PLATFORM CONTEXT BAR - Connects left and right sidebars
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
          <p className="text-xs font-medium text-[var(--text-primary)]">Story for</p>
          <p className="text-[10px] text-[var(--text-tertiary)]">Expires in 24 hours</p>
        </div>
      </div>

      {/* Center: Platform Buttons */}
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
                    onActivePlatformChange(platform);
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
                  <span className="text-sm font-medium capitalize">{platform}</span>
                  
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
                  <p>Viewing {platform} story trends</p>
                ) : isSelected ? (
                  <p>Click to preview {platform}</p>
                ) : (
                  <p>Click to add {platform} story</p>
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
  onHookClick,
  onAddSticker,
  activeStickers,
  platforms,
  // Real insights data from API
  platformTimes = [],
  insightsLoading = false,
  insightsSource = null,
}) {
  const platformTrends = PLATFORM_STORY_TRENDS[activePlatform] || [];
  const platformFormats = PLATFORM_STORY_FORMATS[activePlatform] || [];
  // Use passed-in peak times (fall back to hardcoded if needed)
  const peakTimes = platformTimes.length > 0 ? platformTimes : (PLATFORM_PEAK_TIMES[activePlatform] || []);
  const colors = PLATFORM_COLORS[activePlatform] || { primary: '#666' };

  // Get available stickers based on platform
  const availableStickers = useMemo(() => {
    return STICKER_TYPES.filter(sticker => {
      const featureKey = sticker.id === 'question' ? 'questions' : 
                        sticker.id === 'mention' ? 'mentions' :
                        sticker.id === 'emoji' ? 'polls' :
                        sticker.id === 'gif' ? 'mentions' :
                        sticker.id === 'product' ? 'link' :
                        sticker.id;
      return PLATFORM_FEATURES[activePlatform]?.[featureKey];
    });
  }, [activePlatform]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Platform Header */}
      <div 
        className="shrink-0 border-b border-[var(--glass-border)] px-4 py-3"
        style={{ background: `linear-gradient(135deg, ${colors.primary}15, ${colors.primary}05)` }}
      >
        <div className="flex items-center gap-2">
          <PlatformIcon platform={activePlatform} size={24} />
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] capitalize">
              {activePlatform} Stories
            </h3>
            <p className="text-[10px] text-[var(--text-tertiary)]">Trends & stickers</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 space-y-5">
          {/* Interactive Stickers */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              <Sticker className="h-3.5 w-3.5" style={{ color: colors.primary }} />
              Interactive Stickers
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {availableStickers.map((sticker) => {
                const Icon = sticker.icon;
                const isActive = activeStickers.some(s => s.id === sticker.id);
                return (
                  <button
                    key={sticker.id}
                    onClick={() => onAddSticker(sticker)}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl border p-3 transition-all',
                      isActive
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                        : 'border-[var(--glass-border)] bg-[var(--glass-bg)] hover:border-[var(--brand-primary)]/50'
                    )}
                  >
                    <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', sticker.color)}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-xs font-medium text-[var(--text-primary)]">{sticker.label}</span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">{sticker.description}</span>
                    {isActive && (
                      <Badge variant="secondary" className="text-[9px] h-4">Added</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trending Story Hooks */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              <TrendingUp className="h-3.5 w-3.5" style={{ color: colors.primary }} />
              Trending Hooks
            </h4>
            <div className="space-y-2">
              {platformTrends.map((item, i) => (
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

          {/* Story Formats */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              <Flame className="h-3.5 w-3.5" style={{ color: colors.primary }} />
              Top Story Formats
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {platformFormats.map((item) => (
                <div
                  key={item.format}
                  className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] p-2.5 text-center"
                >
                  <p className="text-xs font-medium text-[var(--text-primary)]">{item.format}</p>
                  <p className="text-[10px] text-green-500">{item.engagement}</p>
                  <p className="text-[9px] text-[var(--text-tertiary)]">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Peak Times */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              <Clock className="h-3.5 w-3.5" style={{ color: colors.primary }} />
              Peak Story Times
              {insightsSource === 'live' && (
                <span className="text-[9px] text-green-500 ml-auto">Live</span>
              )}
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {insightsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2 py-2 animate-pulse">
                    <div className="h-3 bg-[var(--glass-border)] rounded w-12 mb-1" />
                    <div className="h-3 bg-[var(--glass-border)] rounded w-8" />
                  </div>
                ))
              ) : peakTimes.length > 0 ? (
                peakTimes.map((slot) => (
                  <div
                    key={slot.time}
                    className="flex flex-col items-center rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2 py-2"
                  >
                    <span className="text-[10px] text-[var(--text-secondary)]">{slot.time}</span>
                    <span className="text-xs font-medium text-green-500">{slot.engagement}</span>
                  </div>
                ))
              ) : (
                <p className="col-span-3 text-xs text-[var(--text-tertiary)] italic text-center">No peak time data</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN STORY COMPOSER
// =============================================================================

export function StoryComposer({ 
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
    connections.filter(c => c.status === 'active' && STORY_PLATFORMS.includes(c.platform)).map(c => c.platform),
    [connections]
  );

  // State
  const [platforms, setPlatforms] = useState([]);
  const [activePlatform, setActivePlatform] = useState('instagram'); // Currently focused platform

  // Fetch real insights for the active platform (peak times, formats, trends)
  const insights = useBroadcastInsights(projectId, activePlatform);
  const insightsData = transformInsightsForComponent(insights);

  const [mediaFile, setMediaFile] = useState(null);
  const [text, setText] = useState('');
  const [stickers, setStickers] = useState([]);
  const [linkUrl, setLinkUrl] = useState('');
  const [scheduledAt, setScheduledAt] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Sticker configs
  const [pollOptions, setPollOptions] = useState(['Yes', 'No']);
  const [questionPrompt, setQuestionPrompt] = useState('');
  const [countdownTitle, setCountdownTitle] = useState('');
  const [countdownDate, setCountdownDate] = useState(null);

  // Sync activePlatform with connected platforms
  useEffect(() => {
    if (connectedPlatforms.length > 0 && !connectedPlatforms.includes(activePlatform)) {
      setActivePlatform(connectedPlatforms[0]);
    }
  }, [connectedPlatforms, activePlatform]);

  // Initialize
  useEffect(() => {
    if (editPost) {
      setPlatforms(editPost.platforms?.filter(p => STORY_PLATFORMS.includes(p)) || []);
      setText(editPost.content || '');
      if (editPost.mediaUrls?.[0]) {
        const isVideo = editPost.mediaUrls[0].includes('.mp4') || editPost.mediaUrls[0].includes('.mov');
        setMediaFile({ url: editPost.mediaUrls[0], type: isVideo ? 'video' : 'image' });
      }
      if (editPost.scheduledAt) {
        setScheduledAt(new Date(editPost.scheduledAt));
      }
    }
  }, [editPost]);

  // Handlers
  const handleMediaUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile({
        file,
        url: URL.createObjectURL(file),
        type: file.type.startsWith('video') ? 'video' : 'image',
        name: file.name,
      });
    }
  };

  const handleAddSticker = (sticker) => {
    const exists = stickers.find(s => s.id === sticker.id);
    if (exists) {
      setStickers(stickers.filter(s => s.id !== sticker.id));
    } else {
      setStickers([...stickers, sticker]);
    }
  };

  const handleDateSelect = (date) => {
    setScheduledAt(date);
    setShowDatePicker(false);
  };

  const validate = () => {
    const newErrors = {};
    if (!mediaFile && !text.trim()) newErrors.content = 'Add media or text';
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
        content: text,
        platforms,
        mediaUrls: mediaFile ? [mediaFile.url] : [],
        scheduledAt: scheduledAt?.toISOString(),
        status: publish ? (scheduledAt && scheduledAt > new Date() ? 'scheduled' : 'published') : 'draft',
        postType: 'story',
        metadata: {
          stickers: stickers.map(s => s.id),
          linkUrl,
          pollOptions: stickers.some(s => s.id === 'poll') ? pollOptions : undefined,
          questionPrompt: stickers.some(s => s.id === 'question') ? questionPrompt : undefined,
          countdown: stickers.some(s => s.id === 'countdown') ? { title: countdownTitle, date: countdownDate } : undefined,
        },
      };

      if (editPost) {
        await updatePost(editPost.id, postData);
        toast.success('Story updated!');
      } else {
        await createPost(postData);
        toast.success(publish ? 'Story posted!' : 'Draft saved!');
      }
      onComplete?.();
    } catch (error) {
      toast.error('Failed to save story');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex h-full min-h-0 flex-col bg-[var(--surface-page)]">
        {/* ================================================================ */}
        {/* PLATFORM CONTEXT BAR - Connects left and right sidebars */}
        {/* ================================================================ */}
        <PlatformContextBar
          availablePlatforms={STORY_PLATFORMS}
          selectedPlatforms={platforms}
          onTogglePlatform={(platform) => {
            setPlatforms(platforms.includes(platform)
              ? platforms.filter(p => p !== platform)
              : [...platforms, platform]
            );
          }}
          activePlatform={activePlatform}
          onActivePlatformChange={setActivePlatform}
          connectedPlatforms={connectedPlatforms}
        />

        {/* 3-Column Layout */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* LEFT: Platform-aware Stickers & Tools */}
          <div className="hidden h-full min-h-0 w-80 flex flex-col shrink-0 overflow-hidden border-r border-[var(--glass-border)] bg-[var(--surface-page)] lg:flex xl:w-96">
            <PlatformToolsPanel
              activePlatform={activePlatform}
              onHookClick={(hook) => setText(hook)}
              onAddSticker={handleAddSticker}
              activeStickers={stickers}
              platforms={platforms}
              // Real insights data from API
              platformTimes={insightsData.platformTimes}
              insightsLoading={insights.isLoading}
              insightsSource={insights.source}
            />
          </div>

          {/* CENTER: Canvas Editor */}
          <ScrollArea className="flex-1">
            <div className="mx-auto max-w-4xl space-y-5 p-6">
              {/* Platform selector moved to top bar - show errors here */}
              {errors.platforms && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                  <p className="text-xs text-red-500">{errors.platforms}</p>
                </div>
              )}

              {/* Media Upload */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Media</Label>
                {mediaFile ? (
                  <div className="relative overflow-hidden rounded-xl border border-[var(--glass-border)]">
                    {mediaFile.type === 'video' ? (
                      <video src={mediaFile.url} className="aspect-[9/16] max-h-[400px] w-full object-cover" controls />
                    ) : (
                      <img src={mediaFile.url} alt="" className="aspect-[9/16] max-h-[400px] w-full object-cover" />
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setMediaFile(null)}
                      className="absolute right-2 top-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--glass-border)] bg-[var(--glass-bg)] transition-colors hover:border-[var(--brand-primary)]">
                      <input type="file" accept="image/*" onChange={handleMediaUpload} className="hidden" />
                      <Image className="mb-2 h-8 w-8 text-[var(--text-tertiary)]" />
                      <span className="text-sm font-medium text-[var(--text-secondary)]">Photo</span>
                    </label>
                    <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--glass-border)] bg-[var(--glass-bg)] transition-colors hover:border-[var(--brand-primary)]">
                      <input type="file" accept="video/*" onChange={handleMediaUpload} className="hidden" />
                      <Video className="mb-2 h-8 w-8 text-[var(--text-tertiary)]" />
                      <span className="text-sm font-medium text-[var(--text-secondary)]">Video</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Text (for text-only stories) */}
              {!mediaFile && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Text</Label>
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type your message..."
                    className="min-h-[100px] resize-none text-lg"
                  />
                </div>
              )}

              {/* Active Stickers */}
              {stickers.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Active Stickers</Label>
                  <div className="flex flex-wrap gap-2">
                    {stickers.map((sticker) => (
                      <Badge key={sticker.id} className={cn('gap-1.5 py-1.5', sticker.color, 'text-white')}>
                        <sticker.icon className="h-3.5 w-3.5" />
                        {sticker.label}
                        <button onClick={() => handleAddSticker(sticker)} className="ml-1 hover:text-white/80">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>

                  {/* Sticker Configurations */}
                  {stickers.some(s => s.id === 'poll') && (
                    <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3 space-y-2">
                      <Label className="text-xs">Poll Options</Label>
                      {pollOptions.map((opt, idx) => (
                        <Input
                          key={idx}
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...pollOptions];
                            newOpts[idx] = e.target.value;
                            setPollOptions(newOpts);
                          }}
                          placeholder={`Option ${idx + 1}`}
                          className="h-8 text-sm"
                        />
                      ))}
                    </div>
                  )}

                  {stickers.some(s => s.id === 'question') && (
                    <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3">
                      <Label className="text-xs">Question Prompt</Label>
                      <Input
                        value={questionPrompt}
                        onChange={(e) => setQuestionPrompt(e.target.value)}
                        placeholder="Ask me anything..."
                        className="mt-2 h-8 text-sm"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Link */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <Link2 className="h-3.5 w-3.5" />
                  Link (optional)
                </Label>
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://yoursite.com/page"
                  type="url"
                />
              </div>

              {/* Schedule */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 text-sm font-medium">
                    <Calendar className="h-3.5 w-3.5" />
                    Schedule (optional)
                  </Label>
                  {scheduledAt && (
                    <Button variant="ghost" size="sm" onClick={() => setScheduledAt(null)}>
                      Post now instead
                    </Button>
                  )}
                </div>
                <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="mr-2 h-4 w-4" />
                      {scheduledAt ? format(scheduledAt, 'PPp') : 'Post immediately'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker mode="single" selected={scheduledAt} onSelect={handleDateSelect} disabled={(date) => date < new Date()} />
                  </PopoverContent>
                </Popover>
              </div>

              {errors.content && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  {errors.content}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* RIGHT: Preview + Actions - Platform Aware */}
          <div className="hidden w-80 flex-col border-l border-[var(--glass-border)] bg-[var(--surface-secondary)] lg:flex xl:w-96">
            {/* Platform Header */}
            <div 
              className="shrink-0 border-b border-[var(--glass-border)] px-4 py-3"
              style={{ background: `linear-gradient(135deg, ${PLATFORM_COLORS[activePlatform]?.primary || '#666'}15, transparent)` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PlatformIcon platform={activePlatform} size={20} />
                  <div>
                    <span className="text-sm font-medium text-[var(--text-primary)] capitalize">
                      {activePlatform} Story
                    </span>
                    <p className="text-[10px] text-[var(--text-tertiary)]">
                      {platforms.length > 1 ? `+${platforms.length - 1} more` : 'Live preview'}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] h-5 bg-[var(--glass-bg)]">
                  24h
                </Badge>
              </div>
            </div>

            {/* Action Buttons - At Top */}
            <div className="shrink-0 border-b border-[var(--glass-border)] bg-[var(--surface-page)] p-4 space-y-3">
              {/* Schedule Picker */}
              <div className="flex gap-2">
                <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 justify-start text-xs">
                      <Calendar className="mr-2 h-3.5 w-3.5" />
                      {scheduledAt ? format(scheduledAt, 'MMM d, h:mm a') : 'Post now'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <CalendarPicker mode="single" selected={scheduledAt} onSelect={handleDateSelect} disabled={(date) => date < new Date()} />
                  </PopoverContent>
                </Popover>
                {scheduledAt && (
                  <Button variant="ghost" size="sm" onClick={() => setScheduledAt(null)} className="px-2">
                    <X className="h-4 w-4" />
                  </Button>
                )}
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
                  {scheduledAt ? 'Schedule' : 'Share Now'}
                </Button>
              </div>
            </div>
            
            {/* Preview Area - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <StoryPreviewPanel
                mediaFile={mediaFile}
                text={text}
                stickers={stickers}
                platforms={platforms.length > 0 ? [activePlatform, ...platforms.filter(p => p !== activePlatform)] : [activePlatform]}
                linkUrl={linkUrl}
              />
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default StoryComposer;
