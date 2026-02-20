// src/pages/broadcast/components/PostComposer.jsx
// World-class post composer - split-pane with multiple platform previews
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Image, Video, Calendar, Clock, Send, Sparkles, Hash, AlertCircle, Check, Loader2, ChevronDown, Trash2, Wand2, Maximize2, Minimize2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, addHours, setHours, setMinutes, startOfHour } from 'date-fns';
import { useBroadcastStore } from '@/stores/broadcastStore';
import useAuthStore from '@/lib/auth-store';
import { PlatformIcon, PlatformSelector } from './PlatformIcon';
import { AiImageGenerator } from './AiImageGenerator';
import portalApi from '@/lib/portal-api';

// Platform-specific colors for preview borders
const PLATFORM_COLORS = {
  facebook: '#1877F2',
  instagram: '#E4405F',
  linkedin: '#0A66C2',
  tiktok: '#000000',
  gbp: '#4285F4',
};

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

export function PostComposer({ 
  open, 
  onClose, 
  editPost = null,
  defaultPlatforms = [],
  defaultScheduledAt = null,
  fullscreen = false,
}) {
  const { 
    createPost, 
    updatePost, 
    resetComposer,
    connections,
    suggestHashtags,
  } = useBroadcastStore();

  const { currentProject } = useAuthStore();
  const projectId = currentProject?.id;

  // Fullscreen toggle
  const [isFullscreen, setIsFullscreen] = useState(fullscreen);

  // Get connected platforms - memoized to prevent infinite loops
  const connectedPlatforms = useMemo(() =>
    connections
      .filter((c) => c.status === 'active')
      .map((c) => c.platform),
    [connections]
  );

  // Local state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [platforms, setPlatforms] = useState([]);
  const [hashtags, setHashtags] = useState([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [scheduledAt, setScheduledAt] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState('12:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [activePreview, setActivePreview] = useState('facebook');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [showAiImageGenerator, setShowAiImageGenerator] = useState(false);

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
      setTitle('');
      setContent('');
      setPlatforms(Array.isArray(defaultPlatforms) && defaultPlatforms.length ? defaultPlatforms : []);
      setHashtags([]);
      setMediaFiles([]);
      if (defaultScheduledAt) {
        setScheduledAt(new Date(defaultScheduledAt));
        setSelectedTime(format(new Date(defaultScheduledAt), 'HH:mm'));
      } else {
        // Default to next hour
        const nextHour = startOfHour(addHours(new Date(), 1));
        setScheduledAt(nextHour);
        setSelectedTime(format(nextHour, 'HH:mm'));
      }
    }
     
  }, [editPost?.id]); // Only depend on editPost ID to avoid infinite loops

  // Update preview when platforms change - only if current preview is not in platforms
  useEffect(() => {
    if (platforms.length > 0 && !platforms.includes(activePreview)) {
      setActivePreview(platforms[0]);
    }
     
  }, [platforms]); // Only depend on platforms, not activePreview

  // Character count for current platform
  const charCount = useMemo(() => {
    const limit = PLATFORM_LIMITS[activePreview]?.text || 2000;
    const current = content.length;
    const remaining = limit - current;
    return { current, limit, remaining, isOver: remaining < 0 };
  }, [content, activePreview]);

  // Hashtag count for current platform
  const hashtagCount = useMemo(() => {
    const limit = PLATFORM_LIMITS[activePreview]?.hashtags || 30;
    const current = hashtags.length;
    return { current, limit, isOver: current > limit };
  }, [hashtags, activePreview]);

  // Handle hashtag input
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

  // Generate AI content
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
        setContent(response.data.content);
        if (response.data.hashtags) {
          setHashtags(response.data.hashtags);
        }
      }
      setShowAiPrompt(false);
      setAiPrompt('');
    } catch (error) {
      console.error('Failed to generate content:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate AI hashtags
  const handleGenerateHashtags = async () => {
    if (!content.trim() || !projectId) return;
    
    setIsGenerating(true);
    try {
      const suggested = await suggestHashtags(projectId, content, platforms[0] || 'instagram', 10);
      if (suggested && suggested.length > 0) {
        // Merge with existing hashtags
        const newHashtags = [...new Set([...hashtags, ...suggested])];
        setHashtags(newHashtags);
      }
    } catch (error) {
      console.error('Failed to generate hashtags:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle media upload
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

  // Handle date/time selection
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

  // Validate form
  const validate = useCallback(() => {
    const newErrors = {};
    
    if (!content.trim()) {
      newErrors.content = 'Post content is required';
    }
    
    if (platforms.length === 0) {
      newErrors.platforms = 'Select at least one platform';
    }
    
    if (charCount.isOver) {
      newErrors.content = `Content exceeds ${activePreview} character limit`;
    }
    
    if (hashtagCount.isOver) {
      newErrors.hashtags = `Too many hashtags for ${activePreview}`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [content, platforms, charCount, hashtagCount, activePreview]);

  // Handle submit
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
      };

      if (editPost) {
        await updatePost(editPost.id, postData);
      } else {
        await createPost(postData);
      }
      
      resetComposer();
      onClose();
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preview component for each platform - enhanced with platform colors
  const PlatformPreview = ({ platform }) => {
    const previewContent = content + (hashtags.length ? '\n\n' + hashtags.map((t) => `#${t}`).join(' ') : '');
    const platformColor = PLATFORM_COLORS[platform] || '#666';
    const limit = PLATFORM_LIMITS[platform]?.text || 2000;
    const isOverLimit = content.length > limit;
    
    return (
      <div 
        className="overflow-hidden rounded-xl border-2 bg-[var(--glass-bg)] shadow-sm transition-all hover:shadow-md"
        style={{ borderColor: `${platformColor}30` }}
      >
        {/* Platform Header */}
        <div 
          className="flex items-center justify-between px-4 py-2"
          style={{ backgroundColor: `${platformColor}10` }}
        >
          <div className="flex items-center gap-2">
            <PlatformIcon platform={platform} size={18} />
            <span className="text-sm font-semibold capitalize" style={{ color: platformColor }}>
              {platform === 'gbp' ? 'Google Business' : platform}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isOverLimit ? (
              <Badge variant="destructive" className="text-xs">
                {content.length - limit} over limit
              </Badge>
            ) : (
              <span className="text-xs text-[var(--text-tertiary)]">{content.length}/{limit}</span>
            )}
          </div>
        </div>
        
        {/* Mock platform UI */}
        <div className="p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--surface-secondary)] to-[var(--glass-border)]" />
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">Your Business</div>
              <div className="text-xs text-[var(--text-tertiary)]">Just now</div>
            </div>
          </div>
          
          {/* Content preview */}
          <div className="mb-3 whitespace-pre-wrap text-sm text-[var(--text-primary)] leading-relaxed">
            {previewContent.slice(0, 300)}
            {previewContent.length > 300 && (
              <span className="text-[var(--text-tertiary)]">... see more</span>
            )}
          </div>
          
          {/* Media preview */}
          {mediaFiles.length > 0 && (
            <div className={cn(
              'grid gap-1 rounded-xl overflow-hidden',
              mediaFiles.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
            )}>
              {mediaFiles.slice(0, 4).map((media, idx) => (
                <div
                  key={media.id}
                  className={cn(
                    'relative aspect-square bg-[var(--surface-secondary)]',
                    mediaFiles.length === 3 && idx === 0 && 'row-span-2'
                  )}
                >
                  {media.type === 'video' ? (
                    <video src={media.url} className="h-full w-full object-cover" />
                  ) : (
                    <img src={media.url} alt="" className="h-full w-full object-cover" />
                  )}
                  {mediaFiles.length > 4 && idx === 3 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-2xl font-bold text-white">
                      +{mediaFiles.length - 4}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Engagement mock - platform specific */}
          <div className="mt-4 flex items-center justify-between border-t border-[var(--glass-border)] pt-3">
            {platform === 'instagram' ? (
              <div className="flex items-center gap-4 text-[var(--text-secondary)]">
                <span>❤️</span>
                <span>💬</span>
                <span>📤</span>
                <span className="ml-auto">🔖</span>
              </div>
            ) : platform === 'linkedin' ? (
              <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                <span>👍 Like</span>
                <span>💬 Comment</span>
                <span>🔄 Repost</span>
                <span>📤 Send</span>
              </div>
            ) : platform === 'tiktok' ? (
              <div className="flex items-center gap-4 text-[var(--text-secondary)]">
                <span>❤️</span>
                <span>💬</span>
                <span>🔖</span>
                <span>📤</span>
              </div>
            ) : (
              <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
                <span>👍 Like</span>
                <span>💬 Comment</span>
                <span>↗️ Share</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Platform tip */}
        <div className="flex items-start gap-2 border-t border-[var(--glass-border)] bg-[var(--surface-secondary)] px-4 py-3 text-xs text-[var(--text-tertiary)]">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brand-primary)]" />
          <span>{PLATFORM_TIPS[platform]}</span>
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent 
          className={cn(
            "overflow-hidden p-0 gap-0",
            isFullscreen 
              ? "max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] rounded-none" 
              : "max-w-5xl max-h-[90vh]"
          )}
        >
          {/* Header */}
          <DialogHeader className="flex-row items-center justify-between border-b border-[var(--glass-border)] bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] px-6 py-4">
            <div>
              <DialogTitle className="text-lg font-semibold text-white">
                {editPost ? 'Edit Post' : 'Create New Post'}
              </DialogTitle>
              <p className="text-sm text-white/70">
                Craft your message across multiple platforms
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white/80 hover:bg-white/10 hover:text-white"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-5 w-5" />
                    ) : (
                      <Maximize2 className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isFullscreen ? 'Exit fullscreen' : 'Fullscreen mode'}
                </TooltipContent>
              </Tooltip>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white/80 hover:bg-white/10 hover:text-white"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>

          <div className={cn(
            "flex overflow-hidden",
            isFullscreen ? "h-[calc(100vh-140px)]" : "max-h-[calc(90vh-140px)]"
          )}>
            {/* Left side - Editor */}
            <div className="flex-1 overflow-y-auto border-r border-[var(--glass-border)] p-6 bg-[var(--surface-page)]">
              <div className="mx-auto max-w-xl space-y-6">
              {/* Platform selector */}
              <div className="space-y-2">
                <Label>Platforms</Label>
                <PlatformSelector
                  platforms={connectedPlatforms}
                  selected={platforms}
                  onChange={setPlatforms}
                />
                {connectedPlatforms.length === 0 && (
                  <p className="text-sm text-amber-600">
                    No platforms connected. Connect accounts in Settings.
                  </p>
                )}
                {errors.platforms && (
                  <p className="text-sm text-red-500">{errors.platforms}</p>
                )}
              </div>

              {/* Title (optional) */}
              <div className="space-y-2">
                <Label>Title (optional)</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Internal title for organization"
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Content</Label>
                  <div className="flex items-center gap-2">
                    <Popover open={showAiPrompt} onOpenChange={setShowAiPrompt}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7">
                          <Wand2 className="mr-1 h-3.5 w-3.5" />
                          AI Generate
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="end">
                        <div className="space-y-2">
                          <Label>What would you like to post about?</Label>
                          <Textarea
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="e.g., Announce our new spring collection with a fun, engaging tone"
                            className="min-h-[80px]"
                          />
                          <Button 
                            onClick={handleGenerateContent} 
                            disabled={!aiPrompt.trim() || isGenerating}
                            className="w-full"
                          >
                            {isGenerating ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Sparkles className="mr-2 h-4 w-4" />
                            )}
                            Generate Content
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <span className={cn(
                      'text-xs',
                      charCount.isOver ? 'text-red-500' : 'text-[var(--text-tertiary)]'
                    )}>
                      {charCount.current}/{charCount.limit}
                    </span>
                  </div>
                </div>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What do you want to share?"
                  className="min-h-[120px] resize-none"
                />
                {errors.content && (
                  <p className="text-sm text-red-500">{errors.content}</p>
                )}
              </div>

              {/* Hashtags */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5" />
                    Hashtags
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7"
                      onClick={handleGenerateHashtags}
                      disabled={!content.trim() || isGenerating}
                    >
                      {isGenerating ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="mr-1 h-3.5 w-3.5" />
                      )}
                      Suggest
                    </Button>
                    <span className={cn(
                      'text-xs',
                      hashtagCount.isOver ? 'text-red-500' : 'text-[var(--text-tertiary)]'
                    )}>
                      {hashtagCount.current}/{hashtagCount.limit}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 rounded-lg border p-2">
                  {hashtags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="gap-1"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeHashtag(tag)}
                        className="ml-0.5 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <Input
                    value={hashtagInput}
                    onChange={(e) => setHashtagInput(e.target.value)}
                    onKeyDown={handleHashtagKeyDown}
                    onBlur={addHashtag}
                    placeholder="Add hashtag..."
                    className="h-6 flex-1 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
                  />
                </div>
                {errors.hashtags && (
                  <p className="text-sm text-red-500">{errors.hashtags}</p>
                )}
              </div>

              {/* Media upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Media</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    onClick={() => setShowAiImageGenerator(true)}
                  >
                    <Sparkles className="mr-1 h-3.5 w-3.5" />
                    AI Generate
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {mediaFiles.map((media) => (
                    <div
                      key={media.id}
                      className="group relative h-20 w-20 overflow-hidden rounded-lg border"
                    >
                      {media.type === 'video' ? (
                        <video
                          src={media.url}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <img
                          src={media.url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeMedia(media.id)}
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-[var(--glass-border)] hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleMediaUpload}
                      className="hidden"
                    />
                    <div className="text-center">
                      <Image className="mx-auto h-5 w-5 text-[var(--text-tertiary)]" />
                      <span className="mt-1 block text-xs text-[var(--text-tertiary)]">Add</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Schedule */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
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
                      <CalendarPicker
                        mode="single"
                        selected={scheduledAt}
                        onSelect={handleDateSelect}
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="w-32"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Multi-Platform Preview */}
            <div className={cn(
              "overflow-y-auto bg-gradient-to-br from-[var(--surface-page)] to-[var(--surface-secondary)] p-6",
              isFullscreen ? "w-[600px]" : "w-[480px]"
            )}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">Live Previews</h3>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    See exactly how your post will appear
                  </p>
                </div>
                <Badge variant="outline" className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
                  <Eye className="mr-1 h-3 w-3" />
                  {platforms.length} platform{platforms.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              
              {platforms.length > 0 ? (
                <div className={cn(
                  "space-y-4",
                  // Side-by-side on very large screens with 2 platforms
                  isFullscreen && platforms.length === 2 && "grid grid-cols-2 gap-4 space-y-0"
                )}>
                  {platforms.map((platform) => (
                    <PlatformPreview key={platform} platform={platform} />
                  ))}
                </div>
              ) : (
                <div className="flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--glass-border)] bg-[var(--glass-bg)]/50 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-secondary)]">
                    <Eye className="h-6 w-6 text-[var(--text-tertiary)]" />
                  </div>
                  <p className="font-medium text-[var(--text-secondary)]">No platforms selected</p>
                  <p className="text-sm text-[var(--text-tertiary)]">
                    Select platforms to see previews
                  </p>
                </div>
              )}
            </div>
          </div>

        {/* Footer */}
          <DialogFooter className="border-t border-[var(--glass-border)] bg-[var(--surface-secondary)] px-6 py-4">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                {errors.submit && (
                  <div className="flex items-center gap-2 text-sm text-red-500">
                    <AlertCircle className="h-4 w-4" />
                    {errors.submit}
                  </div>
                )}
                {scheduledAt && !errors.submit && (
                  <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
                    <Calendar className="h-4 w-4" />
                    Scheduled for {format(scheduledAt, 'MMM d, yyyy')} at {format(scheduledAt, 'h:mm a')}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting}
                  className="border-[var(--brand-primary)]/30 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Clock className="mr-2 h-4 w-4" />
                  )}
                  Save as Draft
                </Button>
                <Button
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white shadow-sm hover:opacity-90"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {scheduledAt ? 'Schedule Post' : 'Publish Now'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Image Generator Modal */}
      <AiImageGenerator
        open={showAiImageGenerator}
        onClose={() => setShowAiImageGenerator(false)}
        defaultPrompt={content}
        onSelectImage={(image) => {
          // Add AI-generated image to media files
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
        }}
      />
    </TooltipProvider>
  );
}

export default PostComposer;
