// src/pages/broadcast/components/PostComposerPage.jsx
// Full-page post composer - WORLD CLASS experience as a dedicated tab
// Responsive 3-column layout, collapsible header, Reels support
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  ArrowLeft,
  Image, 
  Video, 
  Calendar, 
  Clock, 
  Send, 
  Sparkles, 
  Hash, 
  AlertCircle, 
  Check, 
  Loader2, 
  Trash2, 
  Wand2, 
  Eye,
  Zap,
  Target,
  TrendingUp,
  Save,
  Copy,
  Undo,
  Redo,
  Link2,
  AtSign,
  Smile,
  FileText,
  Layout,
  Lightbulb,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  GripVertical,
  Plus,
  X,
  Smartphone,
  Monitor,
  Settings2,
  Layers,
  Film,
  Square,
  RectangleVertical,
  Crop,
  Circle,
  Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { format, addHours, setHours, setMinutes, startOfHour, differenceInMinutes } from 'date-fns';
import { useBroadcastStore } from '@/stores/broadcastStore';
import useAuthStore from '@/lib/auth-store';
import { useBroadcastInsights, transformInsightsForComponent } from '@/hooks/useBroadcastInsights';
import { PlatformIcon, PlatformSelector } from './PlatformIcon';
import { AiImageGenerator } from './AiImageGenerator';
import portalApi from '@/lib/portal-api';
import { toast } from 'sonner';
import { EchoGenerateButton } from '@/components/ai/EchoGenerateButton';
import { EchoTextActions } from '@/components/ai/EchoTextActions';

// =============================================================================
// CONSTANTS
// =============================================================================

// Platform-specific colors for preview borders
const PLATFORM_COLORS = {
  facebook: { primary: '#1877F2', bg: 'from-blue-600 to-blue-800' },
  instagram: { primary: '#E4405F', bg: 'from-purple-600 via-pink-500 to-orange-400' },
  linkedin: { primary: '#0A66C2', bg: 'from-blue-700 to-blue-900' },
  gbp: { primary: '#4285F4', bg: 'from-blue-500 to-green-500' },
};

// Platform-specific trending hooks
const PLATFORM_TRENDING_HOOKS = {
  facebook: [
    { hook: '"You won\'t believe what happened..."', uses: '2.1M', engagement: '+65%' },
    { hook: '"Share if you agree..."', uses: '1.8M', engagement: '+58%' },
    { hook: '"Tag someone who..."', uses: '1.5M', engagement: '+52%' },
    { hook: '"This changed my perspective..."', uses: '890K', engagement: '+45%' },
  ],
  instagram: [
    { hook: '"Save this for later 📌"', uses: '3.2M', engagement: '+78%' },
    { hook: '"Double tap if you relate..."', uses: '2.4M', engagement: '+68%' },
    { hook: '"The secret to..."', uses: '1.8M', engagement: '+62%' },
    { hook: '"Here\'s what nobody tells you..."', uses: '1.2M', engagement: '+55%' },
  ],
  linkedin: [
    { hook: '"I\'ve been in this industry for..."', uses: '890K', engagement: '+52%' },
    { hook: '"Unpopular opinion:"', uses: '720K', engagement: '+48%' },
    { hook: '"After 10 years, I learned..."', uses: '650K', engagement: '+42%' },
    { hook: '"Here\'s what hiring managers look for..."', uses: '580K', engagement: '+38%' },
  ],
  gbp: [
    { hook: '"Now offering..."', uses: '450K', engagement: '+42%' },
    { hook: '"Limited time:"', uses: '380K', engagement: '+38%' },
    { hook: '"Just in! Fresh..."', uses: '320K', engagement: '+35%' },
    { hook: '"Book your spot..."', uses: '280K', engagement: '+32%' },
  ],
};

// Platform-specific content formats
const PLATFORM_VIRAL_FORMATS = {
  facebook: [
    { format: 'Story Post', engagement: '+72%', description: 'Narrative content' },
    { format: 'Question', engagement: '+65%', description: 'Spark discussion' },
    { format: 'Photo Album', engagement: '+58%', description: 'Multiple images' },
    { format: 'Video', engagement: '+85%', description: 'Native video' },
    { format: 'Poll', engagement: '+68%', description: 'Interactive' },
    { format: 'Live', engagement: '+92%', description: 'Real-time' },
  ],
  instagram: [
    { format: 'Carousel', engagement: '+88%', description: 'Swipe posts' },
    { format: 'Behind Scenes', engagement: '+72%', description: 'Authentic content' },
    { format: 'Tutorial', engagement: '+65%', description: 'How-to content' },
    { format: 'UGC Repost', engagement: '+58%', description: 'Community content' },
    { format: 'Quote Card', engagement: '+52%', description: 'Shareable quotes' },
    { format: 'Infographic', engagement: '+62%', description: 'Data visual' },
  ],
  linkedin: [
    { format: 'Personal Story', engagement: '+78%', description: 'Career journey' },
    { format: 'Hot Take', engagement: '+72%', description: 'Industry opinion' },
    { format: 'How I Did It', engagement: '+65%', description: 'Success story' },
    { format: 'Document', engagement: '+85%', description: 'PDF carousel' },
    { format: 'Poll', engagement: '+68%', description: 'Professional poll' },
    { format: 'Celebration', engagement: '+55%', description: 'Win sharing' },
  ],
  gbp: [
    { format: 'Offer', engagement: '+82%', description: 'Special deals' },
    { format: 'Update', engagement: '+58%', description: 'Business news' },
    { format: 'Event', engagement: '+65%', description: 'Upcoming events' },
    { format: 'Product', engagement: '+72%', description: 'New items' },
    { format: 'Photo', engagement: '+55%', description: 'Business photos' },
    { format: 'FAQ', engagement: '+48%', description: 'Q&A content' },
  ],
};

// Platform-specific trending hashtags
const PLATFORM_TRENDING_TOPICS = {
  facebook: ['#ThrowbackThursday', '#MotivationMonday', '#SmallBusiness', '#ShopLocal', '#Community'],
  instagram: ['#InstaGood', '#PhotoOfTheDay', '#Explore', '#Trending', '#ViralPost', '#Aesthetic'],
  linkedin: ['#Leadership', '#CareerAdvice', '#Hiring', '#Innovation', '#Networking', '#ProfessionalGrowth'],
  gbp: ['#LocalBusiness', '#NowOpen', '#SpecialOffer', '#CustomerAppreciation', '#NewArrivals'],
};

// Platform-specific best times
const PLATFORM_PEAK_TIMES = {
  facebook: [
    { time: '9:00 AM', engagement: '+25%' },
    { time: '1:00 PM', engagement: '+32%' },
    { time: '4:00 PM', engagement: '+28%' },
    { time: '8:00 PM', engagement: '+35%' },
  ],
  instagram: [
    { time: '7:00 AM', engagement: '+22%' },
    { time: '12:00 PM', engagement: '+35%' },
    { time: '5:00 PM', engagement: '+42%' },
    { time: '9:00 PM', engagement: '+38%' },
  ],
  linkedin: [
    { time: '7:30 AM', engagement: '+28%' },
    { time: '12:00 PM', engagement: '+35%' },
    { time: '5:00 PM', engagement: '+42%' },
  ],
  gbp: [
    { time: '10:00 AM', engagement: '+32%' },
    { time: '2:00 PM', engagement: '+28%' },
    { time: '6:00 PM', engagement: '+25%' },
  ],
};

// All platforms that support regular posts (TikTok is Reels-only)
const ALL_POST_PLATFORMS = ['facebook', 'instagram', 'linkedin', 'gbp'];

// Platform character limits
const PLATFORM_LIMITS = {
  facebook: { text: 63206, hashtags: 30 },
  instagram: { text: 2200, hashtags: 30 },
  linkedin: { text: 3000, hashtags: 5 },
  gbp: { text: 1500, hashtags: 0 },
  tiktok: { text: 2200, hashtags: 100 },
};

// Platform-specific tips
const PLATFORM_TIPS = {
  facebook: 'Best engagement: 40-80 characters. Videos under 1 minute perform best.',
  instagram: 'Use 5-10 relevant hashtags. Carousel posts get 3x more engagement.',
  linkedin: 'Professional tone works best. Add industry hashtags for visibility.',
  gbp: 'Include a clear CTA. Posts appear in Google Search and Maps.',
  tiktok: 'Hook viewers in first 3 seconds. Trending sounds boost reach.',
};

// Optimal posting times (mock data - would be from analytics in production)
const SUGGESTED_TIMES = [
  { time: '9:00 AM', label: 'Morning peak', engagement: '+25%' },
  { time: '12:00 PM', label: 'Lunch break', engagement: '+18%' },
  { time: '6:00 PM', label: 'Evening prime', engagement: '+32%' },
  { time: '8:00 PM', label: 'Night scroll', engagement: '+22%' },
];

// AI content prompts
const AI_PROMPTS = [
  { id: 'announce', label: 'Announcement', prompt: 'Write an exciting announcement about' },
  { id: 'promo', label: 'Promotion', prompt: 'Create a promotional post for' },
  { id: 'behind', label: 'Behind the Scenes', prompt: 'Share a behind-the-scenes look at' },
  { id: 'tip', label: 'Tips & Tricks', prompt: 'Share helpful tips about' },
  { id: 'question', label: 'Engagement', prompt: 'Ask an engaging question about' },
  { id: 'story', label: 'Story', prompt: 'Tell a compelling story about' },
];

// Aspect ratios for Reels/Stories
const ASPECT_RATIOS = [
  { id: '9:16', label: 'Portrait', icon: RectangleVertical, description: 'Reels, TikTok, Stories' },
  { id: '1:1', label: 'Square', icon: Square, description: 'Feed posts' },
  { id: '4:5', label: 'Portrait Feed', icon: Crop, description: 'Instagram Feed' },
  { id: '16:9', label: 'Landscape', icon: Monitor, description: 'YouTube, LinkedIn' },
];

// =============================================================================
// COLLAPSIBLE HEADER COMPONENT
// =============================================================================

function CollapsibleHeader({ 
  isCollapsed, 
  onToggle, 
  title, 
  subtitle,
  postType,
  onPostTypeChange,
  autoSaveStatus,
  isSubmitting,
  onSaveDraft,
  onSubmit,
  onCancel,
  scheduledAt,
}) {
  return (
    <div className={cn(
      'border-b border-[var(--glass-border)] transition-all duration-300',
      isCollapsed 
        ? 'bg-[var(--surface-secondary)]' 
        : 'bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)]'
    )}>
      <div className={cn(
        'flex items-center justify-between transition-all duration-300',
        isCollapsed ? 'px-4 py-2' : 'px-6 py-4'
      )}>
        {/* Left side */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className={cn(
              isCollapsed 
                ? 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg)]' 
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            )}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-semibold text-white">{title}</h1>
              <p className="text-sm text-white/70">{subtitle}</p>
            </div>
          )}
          
          {isCollapsed && (
            <span className="text-sm font-medium text-[var(--text-primary)]">{title}</span>
          )}
        </div>
        
        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Auto-save indicator */}
          {autoSaveStatus && (
            <div className={cn(
              'flex items-center gap-1.5 text-xs',
              isCollapsed ? 'text-[var(--text-tertiary)]' : 'text-white/60'
            )}>
              {autoSaveStatus === 'saving' ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="hidden sm:inline">Saving...</span>
                </>
              ) : (
                <>
                  <Check className="h-3 w-3" />
                  <span className="hidden sm:inline">Saved</span>
                </>
              )}
            </div>
          )}
          
          {/* Post type selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size={isCollapsed ? 'sm' : 'default'}
                className={cn(
                  isCollapsed 
                    ? 'border-[var(--glass-border)] bg-[var(--glass-bg)]' 
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                )}
              >
                {postType === 'reel' ? (
                  <><Film className="mr-2 h-4 w-4" />Reel</>
                ) : postType === 'story' ? (
                  <><Layers className="mr-2 h-4 w-4" />Story</>
                ) : (
                  <><FileText className="mr-2 h-4 w-4" />Post</>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onPostTypeChange('post')}>
                <FileText className="mr-2 h-4 w-4" />
                Regular Post
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPostTypeChange('reel')}>
                <Film className="mr-2 h-4 w-4" />
                Reel / Short
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPostTypeChange('story')}>
                <Layers className="mr-2 h-4 w-4" />
                Story
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size={isCollapsed ? 'sm' : 'default'}
            onClick={onSaveDraft}
            disabled={isSubmitting}
            className={cn(
              'hidden sm:flex',
              isCollapsed 
                ? 'border-[var(--glass-border)] bg-[var(--glass-bg)]' 
                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
            )}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Draft
          </Button>
          
          <Button
            size={isCollapsed ? 'sm' : 'default'}
            onClick={onSubmit}
            disabled={isSubmitting}
            className={cn(
              isCollapsed 
                ? 'bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white' 
                : 'bg-white text-[var(--brand-primary)] hover:bg-white/90 shadow-lg'
            )}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {scheduledAt ? 'Schedule' : 'Publish'}
          </Button>
          
          {/* Collapse toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className={cn(
                  'h-8 w-8',
                  isCollapsed 
                    ? 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg)]' 
                    : 'text-white/80 hover:bg-white/10'
                )}
              >
                {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isCollapsed ? 'Expand header' : 'Collapse header'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// REELS EDITOR COMPONENT
// =============================================================================

function ReelsEditor({ 
  mediaFiles, 
  onMediaUpload, 
  onRemoveMedia,
  selectedSound,
  onSelectSound,
  aspectRatio,
  onAspectRatioChange,
}) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  
  const videoFile = mediaFiles.find(m => m.type === 'video');
  
  return (
    <div className="space-y-4">
      {/* Aspect Ratio Selector */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-[var(--text-secondary)]">Aspect Ratio</Label>
        <div className="flex gap-2">
          {ASPECT_RATIOS.filter(ar => ['9:16', '1:1', '4:5'].includes(ar.id)).map((ratio) => (
            <Tooltip key={ratio.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onAspectRatioChange(ratio.id)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition-all',
                    aspectRatio === ratio.id 
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10' 
                      : 'border-[var(--glass-border)] hover:border-[var(--brand-primary)]/50'
                  )}
                >
                  <ratio.icon className={cn(
                    'h-5 w-5',
                    aspectRatio === ratio.id ? 'text-[var(--brand-primary)]' : 'text-[var(--text-tertiary)]'
                  )} />
                  <span className="text-[10px] font-medium">{ratio.id}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>{ratio.description}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
      
      {/* Video Preview / Upload */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-[var(--text-secondary)]">Video</Label>
        {videoFile ? (
          <div className={cn(
            'relative mx-auto overflow-hidden rounded-2xl bg-black',
            aspectRatio === '9:16' ? 'aspect-[9/16] max-w-[280px]' :
            aspectRatio === '1:1' ? 'aspect-square max-w-[320px]' :
            aspectRatio === '4:5' ? 'aspect-[4/5] max-w-[300px]' :
            'aspect-video max-w-full'
          )}>
            <video
              ref={videoRef}
              src={videoFile.url}
              className="h-full w-full object-cover"
              loop
              muted={isMuted}
              playsInline
            />
            {/* Video controls overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity hover:opacity-100">
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (isPlaying) {
                      videoRef.current?.pause();
                    } else {
                      videoRef.current?.play();
                    }
                    setIsPlaying(!isPlaying);
                  }}
                  className="h-12 w-12 rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
                >
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                </Button>
              </div>
            </div>
            {/* Bottom controls */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMuted(!isMuted)}
                className="h-8 w-8 rounded-full bg-black/40 p-0 text-white hover:bg-black/60"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRemoveMedia(videoFile.id)}
                className="h-8 w-8 rounded-full bg-black/40 p-0 text-white hover:bg-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <label className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--glass-border)] bg-[var(--glass-bg)] transition-colors hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5',
            aspectRatio === '9:16' ? 'mx-auto aspect-[9/16] max-w-[280px]' :
            aspectRatio === '1:1' ? 'mx-auto aspect-square max-w-[320px]' :
            'aspect-video'
          )}>
            <input
              type="file"
              accept="video/*"
              onChange={onMediaUpload}
              className="hidden"
            />
            <Video className="mb-3 h-12 w-12 text-[var(--text-tertiary)]" />
            <span className="text-sm font-medium text-[var(--text-secondary)]">Upload Video</span>
            <span className="mt-1 text-xs text-[var(--text-tertiary)]">MP4, MOV up to 60s</span>
          </label>
        )}
      </div>
      
      {/* Sound - Original Audio from Video */}
      {videoFile && (
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
            <Music className="h-3.5 w-3.5" />
            Sound
          </Label>
          <div className="flex items-center gap-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)]">
              <Volume2 className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)]">Original Audio</p>
              <p className="text-xs text-[var(--text-tertiary)]">Audio from uploaded video</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SMART SUGGESTIONS COMPONENT
// =============================================================================

function SmartSuggestions({ content, platforms, onSuggestion }) {
  // Smart suggestions based on content analysis
  const suggestions = useMemo(() => {
    const tips = [];
    
    // Content length suggestions
    if (content.length < 50) {
      tips.push({ type: 'improve', message: 'Posts with 50-100 characters get 25% more engagement' });
    }
    
    // Question suggestion
    if (!content.includes('?')) {
      tips.push({ type: 'engagement', message: 'Try adding a question to boost comments' });
    }
    
    // CTA suggestion
    const ctaWords = ['click', 'learn', 'discover', 'visit', 'shop', 'buy', 'get', 'try'];
    if (!ctaWords.some(word => content.toLowerCase().includes(word))) {
      tips.push({ type: 'action', message: 'Add a call-to-action to drive conversions' });
    }
    
    // Emoji suggestion
    const hasEmoji = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]/u.test(content);
    if (!hasEmoji && content.length > 20) {
      tips.push({ type: 'visual', message: 'Emojis can increase engagement by 33%' });
    }
    
    return tips.slice(0, 3);
  }, [content]);

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
        <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
        AI Suggestions
      </div>
      <div className="space-y-1.5">
        {suggestions.map((tip, idx) => (
          <button
            key={idx}
            onClick={() => onSuggestion?.(tip)}
            className="flex w-full items-center gap-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] p-2 text-left text-xs transition-colors hover:bg-[var(--glass-bg-hover)]"
          >
            <span className="text-[var(--text-secondary)]">{tip.message}</span>
            <ChevronRight className="ml-auto h-3 w-3 text-[var(--text-tertiary)]" />
          </button>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// PLATFORM PREVIEW COMPONENT
// =============================================================================

function PlatformPreview({ platform, content, hashtags, mediaFiles }) {
  const previewContent = content + (hashtags.length ? '\n\n' + hashtags.map((t) => `#${t}`).join(' ') : '');
  const platformColor = PLATFORM_COLORS[platform] || '#666';
  const limit = PLATFORM_LIMITS[platform]?.text || 2000;
  const isOverLimit = content.length > limit;
  
  return (
    <div className="mx-auto max-w-[280px]">
      {/* Platform Header */}
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <PlatformIcon platform={platform} size={16} />
          <span className="text-xs font-semibold capitalize" style={{ color: platformColor }}>
            {platform === 'gbp' ? 'Google Business' : platform}
          </span>
        </div>
        {isOverLimit ? (
          <Badge variant="destructive" className="text-[10px] h-5">
            {content.length - limit} over
          </Badge>
        ) : (
          <span className="text-[10px] text-[var(--text-tertiary)]">{content.length}/{limit}</span>
        )}
      </div>
      
      {/* Phone Frame */}
      <div className="relative rounded-[2.5rem] border-4 border-gray-800 bg-gray-800 p-2 shadow-2xl">
        <div className="relative overflow-hidden rounded-[2rem] bg-white dark:bg-gray-900" style={{ minHeight: '400px' }}>
          {/* Status bar */}
          <div className="flex items-center justify-between px-6 py-2 text-[10px] text-gray-500">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <span>📶</span>
              <span>📡</span>
              <span>🔋</span>
            </div>
          </div>
          
          {/* App header */}
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-2">
            <PlatformIcon platform={platform} size={20} />
            <span className="text-sm font-bold text-[var(--text-primary)]">
              {platform === 'gbp' ? 'Google' : platform.charAt(0).toUpperCase() + platform.slice(1)}
            </span>
            <div className="w-5" />
          </div>
          
          {/* Post content */}
          <div className="p-3">
            {/* User row */}
            <div className="mb-3 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)]" />
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">Your Business</div>
                <div className="text-[10px] text-[var(--text-tertiary)]">Just now</div>
              </div>
            </div>
            
            {/* Media preview */}
            {mediaFiles.length > 0 && (
              <div className={cn(
                'mb-3 grid gap-0.5 rounded-lg overflow-hidden',
                mediaFiles.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
              )}>
                {mediaFiles.slice(0, 4).map((media, idx) => (
                  <div
                    key={media.id}
                    className={cn(
                      'relative bg-[var(--surface-secondary)]',
                      mediaFiles.length === 1 ? 'aspect-[4/3]' : 'aspect-square',
                      mediaFiles.length === 3 && idx === 0 && 'row-span-2'
                    )}
                  >
                    {media.type === 'video' ? (
                      <video src={media.url} className="h-full w-full object-cover" />
                    ) : (
                      <img src={media.url} alt="" className="h-full w-full object-cover" />
                    )}
                    {/* Carousel indicator */}
                    {mediaFiles.length > 1 && idx === 0 && (
                      <div className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] text-white">
                        1/{Math.min(mediaFiles.length, 4)}{mediaFiles.length > 4 ? '+' : ''}
                      </div>
                    )}
                    {mediaFiles.length > 4 && idx === 3 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xl font-bold text-white">
                        +{mediaFiles.length - 4}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Engagement row */}
            <div className="mb-2 flex items-center gap-3 text-[var(--text-secondary)]">
              {platform === 'instagram' ? (
                <>
                  <span className="text-base">♡</span>
                  <span className="text-base">💬</span>
                  <span className="text-base">↗️</span>
                  <span className="ml-auto text-base">🔖</span>
                </>
              ) : platform === 'linkedin' ? (
                <>
                  <span className="text-xs">👍 Like</span>
                  <span className="text-xs">💬 Comment</span>
                  <span className="text-xs">🔄 Repost</span>
                </>
              ) : (
                <>
                  <span className="text-base">👍</span>
                  <span className="text-base">💬</span>
                  <span className="text-base">↗️</span>
                </>
              )}
            </div>
            
            {/* Content preview */}
            <div className="text-xs text-[var(--text-primary)] leading-relaxed">
              <span className="font-semibold">yourbusiness</span>{' '}
              {previewContent.slice(0, 150)}
              {previewContent.length > 150 && (
                <span className="text-[var(--text-tertiary)]">... more</span>
              )}
            </div>
          </div>
        </div>
        {/* Notch */}
        <div className="absolute left-1/2 top-4 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
      </div>
      
      {/* Platform tip */}
      <div className="mt-3 flex items-start gap-2 rounded-lg bg-[var(--glass-bg)] px-3 py-2 text-[10px] text-[var(--text-tertiary)]">
        <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-[var(--brand-primary)]" />
        <span>{PLATFORM_TIPS[platform]}</span>
      </div>
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
          <p className="text-xs font-medium text-[var(--text-primary)]">Tailoring for</p>
          <p className="text-[10px] text-[var(--text-tertiary)]">Click platform to preview & customize</p>
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
                  <span className="text-sm font-medium capitalize">{platform === 'gbp' ? 'Google' : platform}</span>
                  
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
  onHashtagAdd,
  aiPrompt,
  setAiPrompt,
  onGenerateContent,
  isGenerating,
  onShowAiImageGenerator,
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
      {/* Platform Header */}
      <div 
        className="shrink-0 border-b border-[var(--glass-border)] px-4 py-3"
        style={{ background: `linear-gradient(135deg, ${colors.primary}15, ${colors.primary}05)` }}
      >
        <div className="flex items-center gap-2">
          <PlatformIcon platform={activePlatform} size={24} />
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] capitalize">
              {activePlatform === 'gbp' ? 'Google Business' : activePlatform} Tools
            </h3>
            <p className="text-[10px] text-[var(--text-tertiary)]">Trending content & formats</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 space-y-5">
          {/* AI Content Generator */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              <Sparkles className="h-3.5 w-3.5" style={{ color: colors.primary }} />
              AI Content Generator
            </Label>
            <Textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={`Describe what you want to post on ${activePlatform}...`}
              className="min-h-[80px] resize-none text-sm"
            />
            <div className="flex gap-2">
              <Button 
                onClick={onGenerateContent}
                disabled={!aiPrompt.trim() || isGenerating}
                className="flex-1 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white"
              >
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Generate
              </Button>
              <Button variant="outline" onClick={onShowAiImageGenerator}>
                <Image className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Trending Hooks for This Platform */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              <TrendingUp className="h-3.5 w-3.5" style={{ color: colors.primary }} />
              Trending Hooks
              {insightsSource === 'live' && (
                <span className="text-[9px] text-green-500">• Live</span>
              )}
            </h4>
            <div className="space-y-2">
              {insightsLoading ? (
                // Loading skeleton
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] p-2.5 animate-pulse">
                    <div className="h-3 bg-[var(--glass-border)] rounded w-3/4 mb-2" />
                    <div className="h-2 bg-[var(--glass-border)] rounded w-1/2" />
                  </div>
                ))
              ) : platformHooks.length > 0 ? (
                platformHooks.map((item, i) => (
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
                ))
              ) : (
                <p className="text-xs text-[var(--text-tertiary)] italic">No trending hooks available</p>
              )}
            </div>
          </div>

          {/* Viral Formats for This Platform */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              <Flame className="h-3.5 w-3.5" style={{ color: colors.primary }} />
              Top Formats
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {insightsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] p-2.5 text-center animate-pulse">
                    <div className="h-3 bg-[var(--glass-border)] rounded w-3/4 mx-auto mb-1" />
                    <div className="h-2 bg-[var(--glass-border)] rounded w-1/2 mx-auto" />
                  </div>
                ))
              ) : platformFormats.length > 0 ? (
                platformFormats.map((item) => (
                  <div
                    key={item.format}
                    className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] p-2.5 text-center transition-colors hover:border-[var(--brand-primary)]/50"
                  >
                    <p className="text-xs font-medium text-[var(--text-primary)]">{item.format}</p>
                    <p className="text-[10px] text-green-500">{item.engagement}</p>
                    <p className="text-[9px] text-[var(--text-tertiary)]">{item.description}</p>
                  </div>
                ))
              ) : (
                <p className="col-span-2 text-xs text-[var(--text-tertiary)] italic text-center">No format data available</p>
              )}
            </div>
          </div>

          {/* Trending Topics/Hashtags */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              <Hash className="h-3.5 w-3.5" style={{ color: colors.primary }} />
              Trending Topics
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {insightsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 py-1 animate-pulse">
                    <div className="h-3 bg-[var(--glass-border)] rounded w-16" />
                  </div>
                ))
              ) : platformTopics.length > 0 ? (
                platformTopics.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => onHashtagAdd?.(tag.replace('#', ''))}
                    className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 py-1 text-xs transition-colors hover:border-[var(--brand-primary)]/50"
                  >
                    {tag}
                  </button>
                ))
              ) : (
                <p className="text-xs text-[var(--text-tertiary)] italic">No trending topics available</p>
              )}
            </div>
          </div>

          {/* Peak Times */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              <Clock className="h-3.5 w-3.5" style={{ color: colors.primary }} />
              Peak Post Times
              {insightsSource === 'live' && (
                <span className="text-[9px] text-green-500 ml-auto">Based on your audience</span>
              )}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {insightsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 animate-pulse">
                    <div className="h-3 bg-[var(--glass-border)] rounded w-12" />
                    <div className="h-3 bg-[var(--glass-border)] rounded w-8" />
                  </div>
                ))
              ) : platformTimes.length > 0 ? (
                platformTimes.map((slot) => (
                  <div
                    key={slot.time}
                    className="flex items-center justify-between rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2"
                  >
                    <span className="text-xs text-[var(--text-secondary)]">{slot.time}</span>
                    <span className="text-xs font-medium text-green-500">{slot.engagement}</span>
                  </div>
                ))
              ) : (
                <p className="col-span-2 text-xs text-[var(--text-tertiary)] italic text-center">No peak time data</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN POST COMPOSER PAGE COMPONENT
// =============================================================================

export function PostComposerPage({ 
  editPost = null,
  defaults = {},
  onComplete,
  onCancel,
  connections = [],
}) {
  const { 
    createPost, 
    updatePost, 
    resetComposer,
    suggestHashtags,
  } = useBroadcastStore();

  const { currentProject } = useAuthStore();
  const projectId = currentProject?.id;

  // Content state - needs to be before the insights hook for activePlatform
  const [activePlatform, setActivePlatform] = useState('instagram'); // Currently focused platform

  // Fetch real insights for the active platform (peak times, formats, trends, hooks)
  const insights = useBroadcastInsights(projectId, activePlatform);
  const insightsData = transformInsightsForComponent(insights);

  // Get connected platforms
  const connectedPlatforms = useMemo(() =>
    connections
      .filter((c) => c.status === 'active')
      .map((c) => c.platform),
    [connections]
  );

  // Content state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [platforms, setPlatforms] = useState([]);
  // activePlatform is declared above (before insights hook)
  const [hashtags, setHashtags] = useState([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [scheduledAt, setScheduledAt] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState('12:00');
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [activePreview, setActivePreview] = useState('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [showAiImageGenerator, setShowAiImageGenerator] = useState(false);
  const [contentHistory, setContentHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [autoSaveStatus, setAutoSaveStatus] = useState(null);
  const [postType, setPostType] = useState(defaults.postType || 'post');
  
  // New UI state for improvements
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [previewMode, setPreviewMode] = useState('stacked'); // 'stacked' | 'grid' | 'single'
  const [selectedSound, setSelectedSound] = useState(defaults.sound || null);
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [showPreviewPanel, setShowPreviewPanel] = useState(true);
  const contentRef = useRef(null);
  const captionContainerRef = useRef(null);

  // Initialize from edit post or defaults
  useEffect(() => {
    if (editPost) {
      setTitle(editPost.title || '');
      setContent(editPost.content || '');
      setPlatforms(editPost.platforms || []);
      setHashtags(editPost.hashtags || []);
      setMediaFiles(editPost.mediaUrls?.map((url, i) => ({ id: i, url, type: 'image' })) || []);
      if (editPost.scheduledAt) {
        const date = new Date(editPost.scheduledAt);
        setScheduledAt(date);
        setSelectedTime(format(date, 'HH:mm'));
      }
    } else {
      // Apply defaults
      setTitle('');
      setContent(defaults.contentIdea?.title || '');
      setPlatforms(defaults.platforms || []);
      setHashtags([]);
      setMediaFiles(defaults.media || []);
      
      if (defaults.scheduledAt) {
        setScheduledAt(new Date(defaults.scheduledAt));
        setSelectedTime(format(new Date(defaults.scheduledAt), 'HH:mm'));
      } else {
        const nextHour = startOfHour(addHours(new Date(), 1));
        setScheduledAt(nextHour);
        setSelectedTime(format(nextHour, 'HH:mm'));
      }
      
      if (defaults.aiMode) {
        setShowAiPrompt(true);
      }
    }
  }, [editPost, defaults]);

  // Update preview when platforms change
  useEffect(() => {
    if (platforms.length > 0 && activePreview !== 'all' && !platforms.includes(activePreview)) {
      setActivePreview('all');
    }
  }, [platforms, activePreview]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!content.trim()) return;
    
    const timer = setTimeout(() => {
      setAutoSaveStatus('saving');
      // In production, save to localStorage or API
      localStorage.setItem('broadcast_draft', JSON.stringify({
        title, content, platforms, hashtags, scheduledAt: scheduledAt?.toISOString(),
      }));
      setTimeout(() => setAutoSaveStatus('saved'), 500);
    }, 30000);
    
    return () => clearTimeout(timer);
  }, [title, content, platforms, hashtags, scheduledAt]);

  // Sync activePlatform with connected platforms
  useEffect(() => {
    if (connectedPlatforms.length > 0 && !connectedPlatforms.includes(activePlatform)) {
      setActivePlatform(connectedPlatforms[0]);
    }
  }, [connectedPlatforms, activePlatform]);

  // Character count for primary platform
  const charCount = useMemo(() => {
    const primaryPlatform = platforms[0] || 'facebook';
    const limit = PLATFORM_LIMITS[primaryPlatform]?.text || 2000;
    const current = content.length;
    const remaining = limit - current;
    return { current, limit, remaining, isOver: remaining < 0 };
  }, [content, platforms]);

  // Hashtag count
  const hashtagCount = useMemo(() => {
    const primaryPlatform = platforms[0] || 'instagram';
    const limit = PLATFORM_LIMITS[primaryPlatform]?.hashtags || 30;
    const current = hashtags.length;
    return { current, limit, isOver: current > limit };
  }, [hashtags, platforms]);

  // Handle content change with history
  const handleContentChange = useCallback((newContent) => {
    setContent(newContent);
    // Add to history for undo/redo
    setContentHistory(prev => [...prev.slice(0, historyIndex + 1), newContent]);
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  // Undo/Redo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setContent(contentHistory[historyIndex - 1]);
    }
  }, [historyIndex, contentHistory]);

  const handleRedo = useCallback(() => {
    if (historyIndex < contentHistory.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setContent(contentHistory[historyIndex + 1]);
    }
  }, [historyIndex, contentHistory]);

  // Hashtag handlers
  const handleHashtagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addHashtag();
    }
  };

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, '');
    if (tag && !hashtags.includes(tag)) {
      setHashtags([...hashtags, tag]);
      setHashtagInput('');
    }
  };

  const removeHashtag = (tag) => {
    setHashtags(hashtags.filter((t) => t !== tag));
  };

  // AI content generation
  const handleGenerateContent = async () => {
    if (!aiPrompt.trim() || !projectId) return;
    
    setIsGenerating(true);
    try {
      const response = await portalApi.post(`/broadcast/projects/${projectId}/generate-content`, {
        prompt: aiPrompt,
        platforms: platforms.length > 0 ? platforms : ['facebook'],
        tone: 'professional',
      });
      
      if (response.data?.content) {
        handleContentChange(response.data.content);
        if (response.data.hashtags) {
          setHashtags(response.data.hashtags);
        }
        toast.success('Content generated!');
      }
      setShowAiPrompt(false);
      setAiPrompt('');
    } catch (error) {
      console.error('Failed to generate content:', error);
      toast.error('Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  // AI hashtag generation
  const handleGenerateHashtags = async () => {
    if (!content.trim() || !projectId) return;
    
    setIsGenerating(true);
    try {
      const suggested = await suggestHashtags(projectId, content, platforms[0] || 'instagram', 10);
      if (suggested && suggested.length > 0) {
        const newHashtags = [...new Set([...hashtags, ...suggested])];
        setHashtags(newHashtags);
        toast.success(`Added ${suggested.length} hashtags`);
      }
    } catch (error) {
      console.error('Failed to generate hashtags:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Media upload
  const handleMediaUpload = (e) => {
    const files = Array.from(e.target.files);
    const newMedia = files.map((file) => ({
      id: Date.now() + Math.random(),
      file,
      url: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image',
      name: file.name,
    }));
    setMediaFiles([...mediaFiles, ...newMedia]);
  };

  const removeMedia = (id) => {
    setMediaFiles(mediaFiles.filter((m) => m.id !== id));
  };

  // Date/time handling
  const handleDateSelect = (date) => {
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const newDate = setMinutes(setHours(date, hours), minutes);
    setScheduledAt(newDate);
    setShowDatePicker(false);
  };

  const handleTimeChange = (time) => {
    setSelectedTime(time);
    if (scheduledAt) {
      const [hours, minutes] = time.split(':').map(Number);
      setScheduledAt(setMinutes(setHours(scheduledAt, hours), minutes));
    }
  };

  const handleQuickTime = (timeString) => {
    const [time, period] = timeString.split(' ');
    const [hourStr] = time.split(':');
    let hours = parseInt(hourStr);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    const newTime = `${hours.toString().padStart(2, '0')}:00`;
    handleTimeChange(newTime);
    toast.info(`Scheduled for ${timeString}`);
  };

  // Validation
  const validate = useCallback(() => {
    const newErrors = {};
    
    if (!content.trim()) {
      newErrors.content = 'Post content is required';
    }
    
    if (platforms.length === 0) {
      newErrors.platforms = 'Select at least one platform';
    }
    
    if (charCount.isOver) {
      newErrors.content = `Content exceeds character limit`;
    }
    
    if (hashtagCount.isOver) {
      newErrors.hashtags = `Too many hashtags for selected platform`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [content, platforms, charCount, hashtagCount]);

  // Submit handler
  const handleSubmit = async (publishNow = false) => {
    if (!validate()) return;
    
    setIsSubmitting(true);
    try {
      const postData = {
        title: title.trim() || undefined,
        content: content.trim(),
        platforms,
        hashtags,
        mediaUrls: mediaFiles.map((m) => m.url),
        scheduledAt: publishNow ? new Date().toISOString() : scheduledAt?.toISOString(),
        status: publishNow ? 'pending' : 'draft',
        postType,
      };

      if (editPost) {
        await updatePost(editPost.id, postData);
        toast.success('Post updated!');
      } else {
        await createPost(postData);
        toast.success(publishNow ? 'Post scheduled!' : 'Draft saved!');
      }
      
      // Clear draft from localStorage
      localStorage.removeItem('broadcast_draft');
      
      resetComposer();
      onComplete?.();
    } catch (error) {
      setErrors({ submit: error.message });
      toast.error('Failed to save post');
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
          availablePlatforms={ALL_POST_PLATFORMS}
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

        {/* ================================================================ */}
        {/* MAIN CONTENT - True 3-column: AI Tools | Editor | Preview */}
        {/* ================================================================ */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* LEFT PANEL - Platform-aware AI Tools & Creative Assistance */}
          <div className="hidden h-full min-h-0 w-80 flex flex-col shrink-0 overflow-hidden border-r border-[var(--glass-border)] bg-[var(--surface-page)] lg:flex xl:w-96">
            <PlatformToolsPanel
              activePlatform={activePlatform}
              onHookClick={(hook) => setAiPrompt(hook)}
              onHashtagAdd={(tag) => handleAddHashtag(tag)}
              aiPrompt={aiPrompt}
              setAiPrompt={setAiPrompt}
              onGenerateContent={handleGenerateContent}
              isGenerating={isGenerating}
              onShowAiImageGenerator={() => setShowAiImageGenerator(true)}
              // Real insights data from API
              platformHooks={insightsData.platformHooks}
              platformFormats={insightsData.platformFormats}
              platformTopics={insightsData.platformTopics}
              platformTimes={insightsData.platformTimes}
              insightsLoading={insights.isLoading}
              insightsSource={insights.source}
            />
          </div>
          
          {/* CENTER PANEL - Content Editor */}
          <ScrollArea className="flex-1 border-r border-[var(--glass-border)]">
            <div className="p-4 lg:p-6">
              <div className="mx-auto max-w-4xl space-y-5">
                {/* Platform selector is now in the top PlatformContextBar */}
                {errors.platforms && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                    <p className="text-xs text-red-500">{errors.platforms}</p>
                  </div>
                )}

                {/* REELS/STORY SPECIFIC - Video-first experience */}
                {(postType === 'reel' || postType === 'story') && (
                  <>
                    <Separator />
                    <ReelsEditor
                      mediaFiles={mediaFiles}
                      onMediaUpload={handleMediaUpload}
                      onRemoveMedia={removeMedia}
                      selectedSound={selectedSound}
                      onSelectSound={setSelectedSound}
                      aspectRatio={aspectRatio}
                      onAspectRatioChange={setAspectRatio}
                    />
                  </>
                )}

                <Separator />

                {/* Content Editor - Enhanced */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-[var(--text-secondary)]">Caption</Label>
                    <div className="flex items-center gap-1">
                      <EchoGenerateButton
                        entityType="broadcast_post"
                        entityId={projectId}
                        field="content"
                        currentValue={content}
                        onGenerate={(text) => handleContentChange(text)}
                        size="sm"
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={handleUndo} disabled={historyIndex <= 0} className="h-6 w-6">
                            <Undo className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Undo</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={handleRedo} disabled={historyIndex >= contentHistory.length - 1} className="h-6 w-6">
                            <Redo className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Redo</TooltipContent>
                      </Tooltip>
                      <span className={cn(
                        'ml-2 text-xs tabular-nums',
                        charCount.isOver ? 'text-red-500 font-medium' : 'text-[var(--text-tertiary)]'
                      )}>
                        {charCount.current.toLocaleString()}/{charCount.limit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div ref={captionContainerRef} className="relative">
                    <Textarea
                      ref={contentRef}
                      value={content}
                      onChange={(e) => handleContentChange(e.target.value)}
                      placeholder={postType === 'reel' ? "Write an engaging caption for your Reel..." : "What's on your mind? Share something awesome..."}
                      className={cn(
                        'resize-none bg-[var(--glass-bg)] text-sm leading-relaxed w-full',
                        postType === 'reel' ? 'min-h-[100px]' : 'min-h-[160px]'
                      )}
                    />
                    <EchoTextActions
                      containerRef={captionContainerRef}
                      onReplace={(newText, { start, end }) =>
                        handleContentChange(content.slice(0, start) + newText + content.slice(end))
                      }
                      entityType="broadcast_post"
                      entityId={projectId}
                    />
                  </div>
                  {errors.content && (
                    <p className="text-xs text-red-500">{errors.content}</p>
                  )}
                </div>

                {/* Hashtags - Inline */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)]">
                      <Hash className="h-3 w-3" />
                      Hashtags
                    </Label>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-xs"
                        onClick={handleGenerateHashtags}
                        disabled={!content.trim() || isGenerating}
                      >
                        {isGenerating ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
                        Suggest
                      </Button>
                      <span className={cn('text-xs tabular-nums', hashtagCount.isOver ? 'text-red-500' : 'text-[var(--text-tertiary)]')}>
                        {hashtagCount.current}/{hashtagCount.limit}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] p-2 min-h-[40px]">
                    {hashtags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1 text-xs bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] h-6">
                        #{tag}
                        <button onClick={() => removeHashtag(tag)} className="hover:text-red-500">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                    <Input
                      value={hashtagInput}
                      onChange={(e) => setHashtagInput(e.target.value)}
                      onKeyDown={handleHashtagKeyDown}
                      onBlur={addHashtag}
                      placeholder={hashtags.length === 0 ? "Type hashtag and press Enter..." : "Add more..."}
                      className="h-6 min-w-[100px] flex-1 border-0 bg-transparent p-0 text-xs focus-visible:ring-0"
                    />
                  </div>
                </div>

                {/* Media Upload - Only for regular posts */}
                {postType === 'post' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-[var(--text-secondary)]">Media</Label>
                      {mediaFiles.length > 1 && (
                        <Badge variant="outline" className="gap-1 border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
                          <Layers className="h-3 w-3" />
                          Carousel ({mediaFiles.length} items)
                        </Badge>
                      )}
                    </div>
                    
                    {/* Carousel mode info */}
                    {mediaFiles.length === 0 && (
                      <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10">
                            <Layers className="h-5 w-5 text-[var(--brand-primary)]" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[var(--text-primary)]">Upload multiple images for a carousel</p>
                            <p className="text-xs text-[var(--text-tertiary)]">Select up to 10 images at once to create a swipeable carousel post</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Media grid with drag hint */}
                    <div className="flex flex-wrap gap-2">
                      {mediaFiles.map((media, index) => (
                        <div key={media.id} className="group relative h-20 w-20 overflow-hidden rounded-xl border border-[var(--glass-border)]">
                          {media.type === 'video' ? (
                            <video src={media.url} className="h-full w-full object-cover" />
                          ) : (
                            <img src={media.url} alt="" className="h-full w-full object-cover" />
                          )}
                          {/* Order indicator for carousels */}
                          {mediaFiles.length > 1 && (
                            <div className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[10px] font-bold text-white">
                              {index + 1}
                            </div>
                          )}
                          <button
                            onClick={() => removeMedia(media.id)}
                            className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          {media.aiGenerated && (
                            <Badge className="absolute bottom-1 left-1 text-[8px] h-4 bg-[var(--brand-primary)]">AI</Badge>
                          )}
                          {/* Drag handle hint on hover */}
                          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-gradient-to-t from-black/60 to-transparent p-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <GripVertical className="h-3 w-3 text-white" />
                          </div>
                        </div>
                      ))}
                      
                      {/* Add more button */}
                      <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--glass-border)] bg-[var(--glass-bg)] transition-colors hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5">
                        <input type="file" accept="image/*,video/*" multiple onChange={handleMediaUpload} className="hidden" />
                        <Plus className="h-5 w-5 text-[var(--text-tertiary)]" />
                        <span className="mt-1 text-[9px] text-[var(--text-tertiary)]">
                          {mediaFiles.length > 0 ? 'Add more' : 'Upload'}
                        </span>
                      </label>
                    </div>
                    
                    {/* Carousel tip */}
                    {mediaFiles.length >= 2 && (
                      <p className="flex items-center gap-1.5 text-[10px] text-[var(--text-tertiary)]">
                        <Sparkles className="h-3 w-3 text-[var(--brand-primary)]" />
                        Carousels get 3x more engagement! Swipe order matches upload order.
                      </p>
                    )}
                  </div>
                )}

                {/* Schedule - Compact */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)]">
                    <Calendar className="h-3 w-3" />
                    Schedule
                  </Label>
                  <div className="flex gap-2">
                    <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="flex-1 justify-start h-9 text-sm bg-[var(--glass-bg)]">
                          <Calendar className="mr-2 h-3.5 w-3.5" />
                          {scheduledAt ? format(scheduledAt, 'MMM d, yyyy') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarPicker mode="single" selected={scheduledAt} onSelect={handleDateSelect} disabled={(date) => date < new Date()} />
                      </PopoverContent>
                    </Popover>
                    <Input type="time" value={selectedTime} onChange={(e) => handleTimeChange(e.target.value)} className="w-28 h-9 text-sm bg-[var(--glass-bg)]" />
                  </div>
                  
                  {/* Optimal times - From real insights API */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <span className="text-[10px] text-[var(--text-tertiary)] whitespace-nowrap">
                      Best{insights.source === 'live' ? ' (your audience)' : ''}:
                    </span>
                    {insights.isLoading ? (
                      // Loading skeleton
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-1 animate-pulse">
                          <div className="h-3 w-16 bg-[var(--glass-border)] rounded" />
                        </div>
                      ))
                    ) : insightsData.platformTimes.length > 0 ? (
                      insightsData.platformTimes.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => handleQuickTime(slot.time)}
                          className="flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2 py-1 text-[10px] whitespace-nowrap transition-colors hover:border-[var(--brand-primary)]"
                        >
                          {slot.time}
                          <span className="text-emerald-500 font-medium">{slot.engagement}</span>
                        </button>
                      ))
                    ) : (
                      // Fallback to static times if no data
                      SUGGESTED_TIMES.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => handleQuickTime(slot.time)}
                          className="flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2 py-1 text-[10px] whitespace-nowrap transition-colors hover:border-[var(--brand-primary)]"
                        >
                          {slot.time}
                          <span className="text-emerald-500 font-medium">{slot.engagement}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Smart Suggestions - Collapsible */}
                <SmartSuggestions content={content} platforms={platforms} onSuggestion={(tip) => toast.info(tip.message)} />

                {/* Error display */}
                {errors.submit && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    {errors.submit}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          {/* RIGHT PANEL - Live Previews with Action Buttons at Bottom */}
          <div className={cn(
            'hidden flex-col bg-gradient-to-br from-[var(--surface-page)] to-[var(--surface-secondary)] transition-all',
            showPreviewPanel ? 'lg:flex lg:w-[400px] xl:w-[480px] 2xl:w-[560px]' : 'w-0'
          )}>
            {/* Header - Platform Aware */}
            <div 
              className="flex items-center justify-between border-b border-[var(--glass-border)] px-4 py-3"
              style={{ background: `linear-gradient(135deg, ${PLATFORM_COLORS[activePlatform]?.primary || '#666'}15, transparent)` }}
            >
              <div className="flex items-center gap-2">
                <PlatformIcon platform={activePlatform} size={20} />
                <div>
                  <span className="text-sm font-medium text-[var(--text-primary)] capitalize">
                    {activePlatform === 'gbp' ? 'Google Business' : activePlatform} Preview
                  </span>
                  <p className="text-[10px] text-[var(--text-tertiary)]">
                    {platforms.length > 1 ? `+${platforms.length - 1} more selected` : 'Primary platform'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-[10px] h-5 bg-[var(--glass-bg)]">
                  {platforms.length} platform{platforms.length !== 1 ? 's' : ''}
                </Badge>
                {/* Preview mode toggle for 2+ platforms */}
                {platforms.length > 1 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Settings2 className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setPreviewMode('stacked')}>
                        <Layers className="mr-2 h-4 w-4" />
                        Stacked
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPreviewMode('grid')}>
                        <Monitor className="mr-2 h-4 w-4" />
                        Side by Side
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
            
            {/* Action Buttons - At top of right panel */}
            <div className="shrink-0 border-b border-[var(--glass-border)] bg-[var(--surface-page)]/95 backdrop-blur-sm p-4 space-y-3">
              {/* Schedule Picker */}
              <div className="flex gap-2">
                <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start h-10 bg-[var(--glass-bg)]">
                      <Calendar className="mr-2 h-4 w-4" />
                      {scheduledAt ? format(scheduledAt, 'MMM d, yyyy') : 'Schedule for later'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker 
                      mode="single" 
                      selected={scheduledAt} 
                      onSelect={handleDateSelect} 
                      disabled={(date) => date < new Date()} 
                    />
                  </PopoverContent>
                </Popover>
                {scheduledAt && (
                  <Input 
                    type="time" 
                    value={selectedTime} 
                    onChange={(e) => handleTimeChange(e.target.value)} 
                    className="w-28 h-10 bg-[var(--glass-bg)]" 
                  />
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => handleSubmit(false)} 
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Draft
                </Button>
                <Button 
                  onClick={() => handleSubmit(true)} 
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white"
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  {scheduledAt ? 'Schedule Post' : 'Publish Now'}
                </Button>
              </div>
            </div>
            
            {/* Scrollable Preview Area - Active Platform First */}
            <div className="flex-1 overflow-y-auto p-4">
              {platforms.length > 0 ? (
                <div className={cn(
                  previewMode === 'grid' && platforms.length === 2 
                    ? 'grid grid-cols-2 gap-4' 
                    : 'space-y-4'
                )}>
                  {/* Show active platform first */}
                  {platforms.includes(activePlatform) && (
                    <div className="ring-2 ring-[var(--brand-primary)] rounded-xl">
                      <PlatformPreview 
                        platform={activePlatform}
                        content={content}
                        hashtags={hashtags}
                        mediaFiles={mediaFiles}
                      />
                    </div>
                  )}
                  {/* Then other selected platforms */}
                  {platforms.filter(p => p !== activePlatform).map((platform) => (
                    <PlatformPreview 
                      key={platform} 
                      platform={platform}
                      content={content}
                      hashtags={hashtags}
                      mediaFiles={mediaFiles}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--glass-border)] bg-[var(--glass-bg)]/50 text-center">
                  <Eye className="mb-3 h-10 w-10 text-[var(--text-tertiary)]" />
                  <p className="text-sm font-medium text-[var(--text-secondary)]">No platforms selected</p>
                  <p className="text-xs text-[var(--text-tertiary)]">Click platforms above to see previews</p>
                </div>
              )}
              
              {/* Performance prediction */}
              {content.length > 30 && platforms.length > 0 && (
                <Card className="mt-4 border-[var(--glass-border)] bg-[var(--glass-bg)]">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="flex items-center gap-2 text-xs font-semibold">
                      <Target className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                      Performance Prediction
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 px-4 pb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-secondary)]">Engagement</span>
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-20 rounded-full bg-[var(--surface-secondary)]">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)]"
                            style={{ width: `${Math.min(100, Math.max(20, content.length / 2))}%` }}
                          />
                        </div>
                        <span className="font-medium text-[var(--text-primary)]">
                          {content.length > 100 ? 'Excellent' : content.length > 50 ? 'Good' : 'Add more'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-secondary)]">Hashtags</span>
                      <span className={cn('font-medium', hashtags.length >= 3 ? 'text-emerald-500' : 'text-amber-500')}>
                        {hashtags.length >= 5 ? 'Optimal' : hashtags.length >= 3 ? 'Good' : 'Add more'}
                      </span>
                    </div>
                    {postType === 'reel' && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--text-secondary)]">Sound</span>
                        <span className={cn('font-medium', selectedSound ? 'text-emerald-500' : 'text-amber-500')}>
                          {selectedSound ? 'Added' : 'Recommended'}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Preview Toggle - Fixed at bottom on mobile */}
        <div className="flex lg:hidden items-center justify-between border-t border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2">
          <Button variant="ghost" size="sm" onClick={() => setShowPreviewPanel(!showPreviewPanel)}>
            <Eye className="mr-2 h-4 w-4" />
            {showPreviewPanel ? 'Hide Preview' : 'Show Preview'}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleSubmit(false)} disabled={isSubmitting}>
              <Save className="mr-1 h-3 w-3" />
              Draft
            </Button>
            <Button size="sm" onClick={() => handleSubmit(true)} disabled={isSubmitting} className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)]">
              <Send className="mr-1 h-3 w-3" />
              {scheduledAt ? 'Schedule' : 'Post'}
            </Button>
          </div>
        </div>
      </div>

      {/* AI Image Generator Modal */}
      <AiImageGenerator
        open={showAiImageGenerator}
        onClose={() => setShowAiImageGenerator(false)}
        defaultPrompt={content}
        onSelectImage={(image) => {
          setMediaFiles([
            ...mediaFiles,
            {
              id: image.id || Date.now(),
              url: image.imageUrl || image.url,
              type: 'image',
              name: 'AI Generated',
              aiGenerated: true,
            },
          ]);
          setShowAiImageGenerator(false);
        }}
      />
    </TooltipProvider>
  );
}

export default PostComposerPage;
