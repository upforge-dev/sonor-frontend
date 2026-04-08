/**
 * EchoBlogCreator - Conversational Blog Post Creation with Signal AI
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * An intelligent, conversational interface for creating blog posts using:
 * - Signal SEO (topic ideas from blog-ideas, strategy from content-brief)
 * - E-E-A-T (author, citations, FAQ, schema) for every post when project is set
 * - Business Context (brand voice, industry knowledge)
 * - Gemini AI (optional featured image generation)
 *
 * The flow is guided but flexible:
 * 1. Topic Discovery: Signal suggests SEO-driven topics or accepts custom topic
 * 2. Content Strategy: SEO content brief (target keyword, intent, length, angle)
 * 3. Generation: Full blog post with E-E-A-T (author, citations, FAQ, schema)
 * 4. Image Generation: Optionally generates a featured image with Gemini
 * 5. Review & Publish: Preview and fine-tune before publishing
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Sparkles, Send, RefreshCw, ChevronRight, Image as ImageIcon,
  Wand2, Eye, Edit3, Check, X, Loader2, ArrowRight, BookOpen,
  Target, FileText, Palette, Zap, Upload, Layers, Network
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { signalApi, skillsApi, signalSeoApi } from '@/lib/signal-api'
import { portalApi, filesApi } from '@/lib/sonor-api'
import useAuthStore from '@/lib/auth-store'
import SignalIcon from '@/components/ui/SignalIcon'
import { toast } from 'sonner'
import { ClusterGenerationWizard } from '@/components/blog/TopicClusterWorkspace'

// Conversation stages
const STAGES = {
  TOPIC: 'topic',
  STRATEGY: 'strategy', 
  GENERATING: 'generating',
  IMAGE: 'image',
  REVIEW: 'review',
  COMPLETE: 'complete'
}

/** Maps UI preset → Signal blog pipeline content_type */
const PIPELINE_CONTENT_TYPE_BY_PRESET = {
  guide: 'how_to_guide',
  listicle: 'listicle',
  faq_comprehensive: 'faq_comprehensive',
}

// Format markdown-style text in Echo responses
const formatMessage = (text) => {
  if (!text) return null
  
  // Split by lines and process each
  const lines = text.split('\n')
  const formatted = []
  let currentList = null
  let listType = null
  
  lines.forEach((line, idx) => {
    // Headings
    if (line.startsWith('## ')) {
      if (currentList) {
        formatted.push(currentList)
        currentList = null
      }
      formatted.push(<h3 key={idx} className="font-semibold text-base mt-3 mb-2">{line.replace('## ', '')}</h3>)
    }
    // Bold text (convert **text** to bold)
    else if (line.includes('**')) {
      if (currentList) {
        formatted.push(currentList)
        currentList = null
      }
      const parts = line.split(/\*\*/)
      formatted.push(
        <p key={idx} className="mb-2">
          {parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)}
        </p>
      )
    }
    // List items
    else if (line.match(/^[•\-\*]\s/)) {
      const content = line.replace(/^[•\-\*]\s/, '')
      if (!currentList) {
        currentList = { key: idx, items: [], type: 'ul' }
      }
      currentList.items.push(<li key={`${idx}-${currentList.items.length}`} className="ml-4">{content}</li>)
    }
    // Numbered lists
    else if (line.match(/^\d+\.\s/)) {
      const content = line.replace(/^\d+\.\s/, '')
      if (!currentList || currentList.type !== 'ol') {
        if (currentList) formatted.push(currentList)
        currentList = { key: idx, items: [], type: 'ol' }
      }
      currentList.items.push(<li key={`${idx}-${currentList.items.length}`} className="ml-4">{content}</li>)
    }
    // Regular text
    else if (line.trim()) {
      if (currentList) {
        formatted.push(currentList)
        currentList = null
      }
      formatted.push(<p key={idx} className="mb-2">{line}</p>)
    }
    // Empty line
    else {
      if (currentList) {
        formatted.push(currentList)
        currentList = null
      }
    }
  })
  
  if (currentList) {
    formatted.push(currentList)
  }
  
  return formatted.map(item => {
    if (item && typeof item === 'object' && item.items) {
      const ListTag = item.type === 'ol' ? 'ol' : 'ul'
      return (
        <ListTag key={item.key} className={cn("mb-2 space-y-1", item.type === 'ol' ? 'list-decimal' : 'list-disc')}>
          {item.items}
        </ListTag>
      )
    }
    return item
  })
}

// Message types
const MessageBubble = ({ message, isUser, isTyping }) => (
  <div className={cn(
    'flex gap-3 mb-4',
    isUser ? 'justify-end' : 'justify-start'
  )}>
    {!isUser && (
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
      >
        <SignalIcon className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
      </div>
    )}
    <div className={cn(
      'max-w-[80%] rounded-2xl px-4 py-2.5',
      isUser 
        ? 'bg-[var(--brand-primary)] text-white rounded-br-md' 
        : 'bg-[var(--surface-secondary)] rounded-bl-md'
    )}>
      {isTyping ? (
        <div className="flex gap-1 py-2">
          <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      ) : (
        <div className="text-sm">{isUser ? message : formatMessage(message)}</div>
      )}
    </div>
    {isUser && (
      <div className="w-8 h-8 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center shrink-0">
        <span className="text-sm font-medium">You</span>
      </div>
    )}
  </div>
)

// Topic suggestion card
const TopicCard = ({ topic, onSelect }) => (
  <button
    onClick={() => onSelect(topic)}
    className="w-full p-3 rounded-xl border border-border hover:border-[var(--brand-primary)] hover:bg-[var(--surface-secondary)] transition-all text-left group"
  >
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-sm group-hover:text-[var(--brand-primary)]">
            {topic.title}
          </h4>
          {topic.trending && (
            <Badge variant="outline" className="text-xs border-orange-500 text-orange-600 shrink-0">
              🔥 Trending
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {topic.reasoning || topic.contentAngle || topic.angle}
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="outline" className="text-xs">
            <Target className="w-3 h-3 mr-1" />
            {topic.primaryKeyword}
          </Badge>
          {topic.businessValue && (
            <Badge 
              variant="outline" 
              className={cn(
                'text-xs',
                topic.businessValue === 'high' && 'border-green-500 text-green-600',
                topic.businessValue === 'medium' && 'border-yellow-500 text-yellow-600'
              )}
            >
              {topic.businessValue} value
            </Badge>
          )}
          {topic.searchIntent && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {topic.searchIntent}
            </Badge>
          )}
          {topic.suggested_content_type === 'listicle' && (
            <Badge variant="outline" className="text-xs border-violet-500/30 text-violet-600">
              Listicle
            </Badge>
          )}
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-[var(--brand-primary)] shrink-0 mt-1" />
    </div>
  </button>
)

// Category selector
const CategorySelector = ({ categories, selected, onSelect }) => (
  <div className="flex flex-wrap gap-2">
    {categories.map(cat => (
      <button
        key={cat.slug}
        onClick={() => onSelect(cat)}
        className={cn(
          'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
          selected?.slug === cat.slug
            ? 'bg-[var(--brand-primary)] text-white'
            : 'bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)]'
        )}
      >
        {cat.name}
      </button>
    ))}
  </div>
)

export default function EchoBlogCreator({
  open,
  onOpenChange,
  onSuccess,
  prefillTopic = null
}) {
  const { currentOrg, currentProject } = useAuthStore()
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  // Creation mode: null = choosing, 'single' = article, 'cluster' = topic cluster
  const [creationMode, setCreationMode] = useState(prefillTopic ? 'single' : null)

  // State
  const [stage, setStage] = useState(STAGES.TOPIC)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  
  // Data state
  const [categories, setCategories] = useState([])
  const [topicSuggestions, setTopicSuggestions] = useState([])
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [contentStrategy, setContentStrategy] = useState(null)
  const [generatedPost, setGeneratedPost] = useState(null)
  const [generatedImage, setGeneratedImage] = useState(null)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef(null)
  
  // Content enhancement options (E-E-A-T generation always used when project is set)
  const [includeFAQs, setIncludeFAQs] = useState(true)
  const [includeRealWorldData, setIncludeRealWorldData] = useState(true)
  /** guide | listicle | faq_comprehensive */
  const [contentFormatPreset, setContentFormatPreset] = useState('guide')
  const [citationLevel, setCitationLevel] = useState('standard')
  const [topicIdeasMode, setTopicIdeasMode] = useState('default')
  const [pipelineWordCount, setPipelineWordCount] = useState(2000)
  
  useEffect(() => {
    if (open && currentProject?.id) {
      loadCategories()
    }
  }, [open, currentProject?.id])

  useEffect(() => {
    if (open && currentProject?.id && !prefillTopic) {
      loadTopicSuggestions()
    }
  }, [open, currentProject?.id, topicIdeasMode, prefillTopic])

  useEffect(() => {
    if (contentFormatPreset === 'listicle') setPipelineWordCount(1500)
    else if (contentFormatPreset === 'faq_comprehensive') setPipelineWordCount(2400)
    else setPipelineWordCount(2000)
  }, [contentFormatPreset])
  
  // Handle prefill topic
  useEffect(() => {
    if (open && prefillTopic) {
      handleTopicSelect(prefillTopic)
    }
  }, [open, prefillTopic])
  
  // Initial greeting
  useEffect(() => {
    if (open && messages.length === 0) {
      addBotMessage(getGreeting())
    }
  }, [open])
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])
  
  // Focus input
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, stage])
  
  const getGreeting = () => {
    const greetings = [
      "Hey! 👋 Ready to create an amazing blog post together. What would you like to write about?",
      "Hi there! 🚀 Let's craft some great content. Got a topic in mind, or want me to suggest some based on your SEO opportunities?",
      "Hello! ✨ I'm here to help you create engaging content. Tell me your topic idea, or I can analyze your SEO gaps for inspiration."
    ]
    return greetings[Math.floor(Math.random() * greetings.length)]
  }
  
  const addBotMessage = (content) => {
    setMessages(prev => [...prev, { role: 'assistant', content }])
  }
  
  const addUserMessage = (content) => {
    setMessages(prev => [...prev, { role: 'user', content }])
  }
  
  const simulateTyping = async (callback) => {
    setIsTyping(true)
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))
    setIsTyping(false)
    callback()
  }
  
  const loadCategories = async () => {
    try {
      const response = await portalApi.get(`/blog/categories/${currentProject.id}`)
      setCategories(response.data || [])
      if (response.data?.length > 0) {
        setSelectedCategory(response.data[0])
      }
    } catch (error) {
      console.error('Failed to load categories:', error)
      // Fallback categories - generic but usable
      setCategories([
        { slug: 'guides', name: 'Guides', description: 'How-to guides and tutorials' },
        { slug: 'news', name: 'News', description: 'Industry news and updates' },
        { slug: 'tips', name: 'Tips', description: 'Tips and best practices' },
      ])
    }
  }
  
  const loadTopicSuggestions = async () => {
    if (!currentProject?.id) return
    try {
      const data = await signalSeoApi.getBlogAiSuggestions(currentProject.id, {
        count: 5,
        ideasMode: topicIdeasMode === 'answer_engine_listicles' ? 'answer_engine_listicles' : undefined,
      })
      const raw = data?.ideas ?? data?.topics ?? (Array.isArray(data) ? data : [])
      const topics = raw.map((t) => ({
        title: t.title ?? t.topic ?? t.headline ?? '',
        primaryKeyword: t.target_keyword ?? t.primaryKeyword ?? t.keyword ?? t.targetKeyword ?? t.title ?? '',
        contentAngle: t.reasoning ?? t.angle ?? t.contentAngle ?? t.summary ?? '',
        angle: t.reasoning ?? t.angle ?? t.contentAngle ?? t.summary ?? '',
        reasoning: t.reasoning ?? '',
        businessValue: t.business_value ?? t.businessValue ?? null,
        searchIntent: t.search_intent ?? t.searchIntent ?? null,
        trending: t.trending ?? false,
        trafficPotential: t.trafficPotential ?? t.potential ?? null,
        suggested_content_type: t.suggested_content_type ?? t.suggestedContentType ?? null,
      })).filter((t) => t.title)
      setTopicSuggestions(topics)
    } catch (error) {
      console.error('Failed to load topic suggestions from Signal SEO:', error)
      try {
        const result = await skillsApi.invoke('content', 'get_topic_suggestions', {
          params: { category: null, count: 5 },
          context: { project_id: currentProject?.id, org_id: currentOrg?.id },
        })
        setTopicSuggestions(result?.topics ?? [])
      } catch (fallback) {
        setTopicSuggestions([])
      }
    }
  }
  
  const handleTopicSelect = async (topic) => {
    // For Signal suggestions, topic is an object with .title
    // For custom user input, topic is a string (possibly multi-line concept)
    const isCustom = typeof topic === 'string'
    const fullText = isCustom ? topic : topic.title

    // Extract a short display title: first line, or first sentence, capped at 80 chars
    let displayTitle = fullText
    if (isCustom && fullText.length > 80) {
      // Use first line if multi-line, otherwise first sentence
      const firstLine = fullText.split('\n')[0].trim()
      if (firstLine.length <= 80 && firstLine.length > 10) {
        displayTitle = firstLine
      } else {
        // Truncate to nearest word boundary
        displayTitle = fullText.substring(0, 77).replace(/\s+\S*$/, '') + '...'
      }
    }

    const topicData = isCustom
      ? { title: fullText, displayTitle, isCustomConcept: true }
      : topic

    setSelectedTopic(topicData)
    addUserMessage(displayTitle)

    simulateTyping(() => {
      if (isCustom) {
        addBotMessage(`Got it! I'll use your concept to craft a high-impact article. Let me analyze the SEO opportunity and build a content strategy...`)
      } else {
        addBotMessage(`Great choice! "${displayTitle}" is a solid topic. Let me analyze the SEO opportunity and build a content strategy...`)
      }
      setStage(STAGES.STRATEGY)
      generateContentStrategy(topicData)
    })
  }
  
  const generateContentStrategy = async (topic) => {
    setIsLoading(true)
    const projectId = currentProject?.id
    // For Signal SEO topics, use the primary keyword directly.
    // For custom user input (concept text), send it as the topic — Signal derives the keyword.
    const hasExplicitKeyword = !!topic.primaryKeyword
    const targetKeyword = topic.primaryKeyword || topic.title

    let briefContentType = 'how_to_guide'
    if (typeof topic !== 'string' && topic.suggested_content_type === 'listicle') {
      setContentFormatPreset('listicle')
      briefContentType = 'listicle'
    } else if (typeof topic !== 'string' && topic.suggested_content_type === 'faq_comprehensive') {
      setContentFormatPreset('faq_comprehensive')
      setIncludeFAQs(true)
      briefContentType = 'faq_comprehensive'
    } else if (typeof topic !== 'string' && topic.suggested_content_type === 'how_to_guide') {
      setContentFormatPreset('guide')
      briefContentType = 'how_to_guide'
    }

    try {
      if (projectId && targetKeyword) {
        const brief = await signalSeoApi.generateContentBrief(projectId, {
          targetKeyword,
          contentType: briefContentType,
        })
        // The brief should return a refined keyword. For custom concepts (no explicit keyword),
        // strongly prefer what the brief derived over the raw user input.
        const derivedKeyword = brief?.targetKeyword ?? brief?.primary_keyword
        const strategy = {
          strategy: {
            targetKeyword: derivedKeyword || (hasExplicitKeyword ? targetKeyword : null),
            searchIntent: brief?.searchIntent ?? brief?.intent ?? 'informational',
            suggestedLength: brief?.suggestedLength ?? brief?.word_count ?? '1500-2000 words',
            angle: brief?.angle ?? brief?.content_angle ?? 'In-depth guide',
            tone: brief?.tone ?? 'professional',
          },
          isCustomConcept: !hasExplicitKeyword,
          ...brief,
        }
        setContentStrategy(strategy)
        simulateTyping(() => {
          let strategyMessage = `Here's your SEO content strategy:\n\n`
          if (strategy.strategy.targetKeyword) {
            strategyMessage += `📌 **Target Keyword:** ${strategy.strategy.targetKeyword}\n`
          }
          strategyMessage += `👥 **Search Intent:** ${strategy.strategy.searchIntent}\n`
          strategyMessage += `📝 **Suggested Length:** ${strategy.strategy.suggestedLength}\n`
          strategyMessage += `🎯 **Angle:** ${strategy.strategy.angle}\n\n`
          strategyMessage += `Ready to generate the full blog post with E-E-A-T? Pick a category and I'll get started!`
          addBotMessage(strategyMessage)
        })
      } else {
        const strategy = await skillsApi.invoke('content', 'generate_content_strategy', {
          params: {
            topic: topic.title,
            category: selectedCategory?.slug,
            businessContext: currentOrg?.name,
            targetAudience: topic.targetAudience,
          },
          context: { project_id: projectId, org_id: currentOrg?.id },
        })
        setContentStrategy(strategy)
        simulateTyping(() => {
          let strategyMessage = `Here's your content strategy:\n\n`
          strategyMessage += `📌 **Target Keyword:** ${strategy?.strategy?.targetKeyword || topic.title}\n`
          strategyMessage += `👥 **Search Intent:** ${strategy?.strategy?.searchIntent || 'informational'}\n`
          strategyMessage += `📝 **Suggested Length:** ${strategy?.strategy?.suggestedLength || '1500-2000 words'}\n`
          strategyMessage += `🎯 **Angle:** ${strategy?.strategy?.angle || 'In-depth guide'}\n\n`
          strategyMessage += `Ready to generate the full blog post? Pick a category and I'll get started!`
          addBotMessage(strategyMessage)
        })
      }
    } catch (error) {
      console.error('Failed to generate strategy:', error)
      simulateTyping(() => {
        addBotMessage(`I'll create a comprehensive content strategy as I generate your post. Let's pick a category and get started!`)
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleCategorySelect = (category) => {
    setSelectedCategory(category)
    addUserMessage(`Category: ${category.name}`)
    
    simulateTyping(() => {
      addBotMessage(`Perfect! I'll create your "${selectedTopic.title}" post in the ${category.name} category.\n\nGenerating your blog post now... This typically takes 2-4 minutes for a full SEO-optimized article. ✨`)
      setStage(STAGES.GENERATING)
      generateBlogPost()
    })
  }
  
  const retryCountRef = useRef(0)

  const generateBlogPost = async () => {
    setIsLoading(true)
    const projectId = currentProject?.id
    const topic = selectedTopic?.title
    // Prefer the derived keyword from the content brief. For custom concepts where the brief
    // couldn't derive a keyword, pass the topic — the pipeline will extract one.
    const targetKeyword = contentStrategy?.strategy?.targetKeyword || selectedTopic?.primaryKeyword || topic

    try {
      let result
      // Use new phased pipeline when we have a project (SEO-driven blog creation with E-E-A-T)
      if (projectId && topic) {
        const pipelineContentType =
          PIPELINE_CONTENT_TYPE_BY_PRESET[contentFormatPreset] || 'how_to_guide'
        const includeFaqPipeline =
          contentFormatPreset === 'faq_comprehensive' ? true : includeFAQs

        const pipelineResult = await signalSeoApi.generateBlogPipeline(projectId, {
          topic,
          target_keyword: targetKeyword,
          content_type: pipelineContentType,
          word_count_target: pipelineWordCount,
          include_faq: includeFaqPipeline,
          citation_level: citationLevel,
          category_id: selectedCategory?.slug,
        }, {
          timeout: 600000, // 10 minute timeout — pipeline generates 6 phases with multiple AI calls
        })

        // Map pipeline result to expected format
        const post = pipelineResult.post || pipelineResult

        // Extract FAQ items from schemas if available
        const faqSchema = post.schemas?.find(s => s.type === 'FAQPage')
        const faqItems = faqSchema?.data?.mainEntity?.map(item => ({
          question: item.name,
          answer: item.acceptedAnswer?.text,
        })) || []

        result = {
          post_id: post.post_id,
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt || post.meta_description,
          content: post.content,
          contentHtml: post.content,
          metadata: { metaDescription: post.meta_description },
          author: post.author,
          citations: post.external_citations?.map(c => ({
            claim: c.claim,
            source: c.source,
            url: c.url,
          })) || [],
          faqItems,
          tableOfContents: post.table_of_contents,
          internalLinks: post.internal_links,
          schema: post.schemas,
          eatScore: post.quality_scores?.eeat_score || 0,
          seoScore: post.quality_scores?.seo_score || 0,
          readabilityScore: post.quality_scores?.readability_score || 0,
          keywordDensity: post.quality_scores?.keyword_density || post.keyword_density || 0,
          keywords: [post.target_keyword, ...(post.secondary_keywords || [])].filter(Boolean),
          wordCount: post.word_count,
          readTime: post.estimated_read_time,
        }
      } else {
        result = await skillsApi.invoke('content', 'generate_blog', {
          params: {
            topic,
            category: selectedCategory?.slug,
            keywords: targetKeyword,
            targetLength: contentStrategy?.strategy?.suggestedLength || '1500-2000',
            includeStats: true,
            includeExamples: true,
            includeFAQs,
            includeRealWorldData,
            tone: contentStrategy?.strategy?.tone || 'professional',
          },
          context: {
            project_id: projectId,
            org_id: currentOrg?.id,
          },
        })
      }

      retryCountRef.current = 0
      setGeneratedPost(result)

      simulateTyping(() => {
        const byline = result.author?.name ? ` By ${result.author.name}.` : ''
        const wordInfo = result.wordCount ? ` (${result.wordCount.toLocaleString()} words)` : ''
        addBotMessage(`Your blog post is ready! 🎉\n\n**Title:** ${result.title}${wordInfo}\n\n${result.excerpt || result.metadata?.metaDescription || ''}${byline}\n\nWould you like me to generate a featured image using AI, or would you prefer to upload your own?`)
        setStage(STAGES.IMAGE)
      })
    } catch (error) {
      console.error('Failed to generate blog post:', error)

      if (retryCountRef.current < 1) {
        retryCountRef.current++
        addBotMessage(`Hmm, I ran into an issue generating your post. Let me try once more...`)
        // Don't clear loading — retry immediately keeps the loading state
        setTimeout(() => generateBlogPost(), 3000)
        return // Skip finally clearing isLoading
      }

      // Exhausted retries — let the user know
      retryCountRef.current = 0
      addBotMessage(`I wasn't able to generate the post after retrying. This can happen with longer articles. You can try again by selecting a new topic, or reach out if this keeps happening.`)
      setStage(STAGES.TOPIC)
      setIsLoading(false)
      return
    }

    setIsLoading(false)
  }
  
  const handleGenerateImage = async () => {
    addUserMessage('Generate an AI image')
    setIsGeneratingImage(true)
    
    simulateTyping(() => {
      addBotMessage(`Creating a custom featured image for "${generatedPost.title}"... This may take a moment.`)
    })
    
    try {
      const result = await skillsApi.invoke('content', 'generate_blog_image', {
        params: {
          title: generatedPost.title,
          topic: selectedTopic.title,
          category: selectedCategory?.slug,
          excerpt: generatedPost.excerpt || generatedPost.metadata?.metaDescription,
          style: 'digital-art',
          aspectRatio: '16:9'
        },
        context: {
          project_id: currentProject?.id,
          org_id: currentOrg?.id
        }
      })
      
      // Signal wraps tool results: { result: { success, imageUrl, ... }, durationMs, skill, tool }
      const imageResult = result?.result || result
      if (imageResult?.success && (imageResult?.imageUrl || imageResult?.imageBase64)) {
        const imageUrl = imageResult.imageUrl || `data:${imageResult.mimeType || 'image/png'};base64,${imageResult.imageBase64}`
        setGeneratedImage({
          url: imageUrl,
          alt: imageResult.altText || `Featured image for: ${generatedPost.title}`,
          isUploaded: !!imageResult.imageUrl // Already uploaded if we got a URL
        })
        
        // Register file in Files module so it appears in the file browser
        if (imageResult.imageUrl && currentProject?.id) {
          try {
            const urlParts = new URL(imageResult.imageUrl)
            const pathMatch = urlParts.pathname.match(/\/files\/(.+)$/)
            if (pathMatch) {
              const storagePath = pathMatch[1]
              const filename = imageResult.filename || storagePath.split('/').pop()
              await filesApi.registerFile({
                fileId: crypto.randomUUID(),
                filename,
                mimeType: imageResult.mimeType || 'image/png',
                fileSize: 0,
                storagePath,
                publicUrl: imageResult.imageUrl,
                projectId: currentProject.id,
                folderPath: 'Blog/Featured',
                category: 'content',
                isPublic: true
              })
            }
          } catch (regError) {
            console.warn('Failed to register file in Files module:', regError)
          }
        }
        
        addBotMessage(`Here's your AI-generated featured image! Looking good? You can regenerate it or proceed to review your post.`)
      } else {
        addBotMessage(`I wasn't able to generate an image this time. You can try again or skip to use your own image later.`)
      }
    } catch (error) {
      console.error('Failed to generate image:', error)
      addBotMessage(`Image generation isn't available right now. No worries - you can upload a custom image after publishing!`)
    } finally {
      setIsGeneratingImage(false)
      setStage(STAGES.REVIEW)
    }
  }
  
  const handleSkipImage = () => {
    addUserMessage('Skip image generation')
    simulateTyping(() => {
      addBotMessage(`No problem! You can always add a featured image later. Let's review your post!`)
      setStage(STAGES.REVIEW)
    })
  }
  
  // Handle manual image upload
  const handleImageUpload = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file')
      return
    }
    
    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB')
      return
    }
    
    addUserMessage(`Uploading: ${file.name}`)
    setIsUploadingImage(true)
    
    try {
      // Create form data for upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', currentProject.id)
      formData.append('folderPath', 'Blog/Featured')
      
      const uploadResponse = await portalApi.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      if (uploadResponse.data?.url) {
        setGeneratedImage({
          url: uploadResponse.data.url,
          alt: `Featured image for: ${generatedPost?.title || selectedTopic?.title}`,
          isUploaded: true
        })
        
        simulateTyping(() => {
          addBotMessage(`Great image! Your photo has been uploaded and will be used as the featured image. Ready to review your post?`)
          setStage(STAGES.REVIEW)
        })
      } else {
        throw new Error('No URL returned from upload')
      }
    } catch (error) {
      console.error('Failed to upload image:', error)
      toast.error('Failed to upload image. Please try again.')
      addBotMessage(`Hmm, I couldn't upload that image. Would you like to try again, generate an AI image, or skip?`)
    } finally {
      setIsUploadingImage(false)
    }
  }
  
  // Drag and drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (stage === STAGES.IMAGE) {
      setIsDragging(true)
    }
  }, [stage])
  
  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])
  
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    if (stage !== STAGES.IMAGE) return
    
    const files = e.dataTransfer?.files
    if (files?.length > 0) {
      handleImageUpload(files[0])
    }
  }, [stage, currentProject?.id, generatedPost, selectedTopic])
  
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(file)
    }
    // Reset input so same file can be selected again
    e.target.value = ''
  }
  
  const handlePublish = async (asDraft = false) => {
    addUserMessage(asDraft ? 'Save as draft' : 'Publish now')
    setIsLoading(true)
    
    try {
      // Handle image - either already uploaded (user upload) or needs upload (AI generated base64)
      let featuredImageUrl = null
      if (generatedImage) {
        if (generatedImage.isUploaded) {
          // User uploaded - already has a URL
          featuredImageUrl = generatedImage.url
        } else if (generatedImage.url.startsWith('data:')) {
          // AI generated base64 - needs to be uploaded
          const blob = await fetch(generatedImage.url).then(r => r.blob())
          const formData = new FormData()
          formData.append('file', blob, 'featured-image.png')
          formData.append('projectId', currentProject.id)
          formData.append('folderPath', 'Blog/Featured')
          
          try {
            const uploadResponse = await portalApi.post('/files/upload', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            })
            featuredImageUrl = uploadResponse.data?.url
          } catch (uploadError) {
            console.warn('Image upload failed, continuing without image:', uploadError)
          }
        }
      }
      
      // Use the selected category's slug directly - categories are per-project from blog_categories table
      const categorySlug = selectedCategory?.slug || 'general'

      // Check if post was already created by the pipeline (has post_id)
      const existingPostId = generatedPost?.post_id
      
      let response
      if (existingPostId) {
        // Update existing post (already created by pipeline Phase 6)
        response = await portalApi.patch(`/blog/posts/${existingPostId}`, {
          ...(featuredImageUrl && { featuredImage: featuredImageUrl }),
          ...(featuredImageUrl && generatedImage?.alt && { featuredImageAlt: generatedImage.alt }),
          category: categorySlug,
          status: asDraft ? 'draft' : 'published',
          publishedAt: asDraft ? null : new Date().toISOString(),
        })
      } else {
        // Create new post (fallback for non-pipeline generation)
        const postTitle = generatedPost?.title || topic || 'Untitled Post'
        const slugFromTitle = postTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') || 'post'

        response = await portalApi.post('/blog/posts', {
          title: postTitle,
          slug: generatedPost?.slug || slugFromTitle,
          content: generatedPost?.content || generatedPost?.contentHtml || '',
          excerpt: generatedPost?.excerpt || generatedPost?.metadata?.metaDescription,
          author: generatedPost?.author,
          faqItems: generatedPost?.faqItems ?? generatedPost?.faq_items,
          schema: generatedPost?.schema,
          featuredImage: featuredImageUrl || undefined,
          featuredImageAlt: generatedImage?.alt || undefined,
          category: categorySlug,
          status: asDraft ? 'draft' : 'published',
          publishedAt: asDraft ? null : new Date().toISOString(),
          projectId: currentProject?.id,
          orgId: currentOrg?.id
        })
      }
      
      simulateTyping(() => {
        if (asDraft) {
          addBotMessage(`Your blog post has been saved as a draft! You can find it in your blog dashboard to edit and publish when ready. 📝`)
        } else {
          addBotMessage(`🎉 Congratulations! Your blog post is now live!\n\n**"${generatedPost?.title}"**\n\nI'll continue monitoring its SEO performance and let you know if there are opportunities for improvement.`)
        }
        setStage(STAGES.COMPLETE)
      })
      
      toast.success(asDraft ? 'Draft saved!' : 'Blog post published!')
      
      if (onSuccess) {
        onSuccess(response.data)
      }
    } catch (error) {
      console.error('Failed to save blog post:', error)
      addBotMessage(`I had trouble saving your post. Please try again or check the console for details.`)
      toast.error('Failed to save blog post')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleSendMessage = (e) => {
    e?.preventDefault()
    if (!input.trim() || isLoading) return
    
    const message = input.trim()
    setInput('')
    // TOPIC stage: handleTopicSelect adds the user message (avoids duplicate when pasting + Enter)
    if (stage !== STAGES.TOPIC) addUserMessage(message)
    
    switch (stage) {
      case STAGES.TOPIC:
        handleTopicSelect(message)
        break
      case STAGES.STRATEGY:
      case STAGES.GENERATING:
        // User is asking questions during generation
        simulateTyping(() => {
          addBotMessage(`I'm working on your content! Just a moment...`)
        })
        break
      case STAGES.IMAGE:
        if (message.toLowerCase().includes('generate') || message.toLowerCase().includes('ai')) {
          handleGenerateImage()
        } else if (message.toLowerCase().includes('skip') || message.toLowerCase().includes('no')) {
          handleSkipImage()
        } else {
          simulateTyping(() => {
            addBotMessage(`Would you like me to generate an AI image, or skip and add your own later?`)
          })
        }
        break
      case STAGES.REVIEW:
        if (message.toLowerCase().includes('publish')) {
          handlePublish(false)
        } else if (message.toLowerCase().includes('draft')) {
          handlePublish(true)
        } else {
          simulateTyping(() => {
            addBotMessage(`Ready to publish? Say "publish" to go live now, or "save as draft" to finish later.`)
          })
        }
        break
      default:
        simulateTyping(() => {
          addBotMessage(`I'm not sure what you mean. Let me help guide you through the process.`)
        })
    }
  }
  
  const handleClose = () => {
    // Reset state
    setCreationMode(null)
    setStage(STAGES.TOPIC)
    setMessages([])
    setInput('')
    setSelectedTopic(null)
    setSelectedCategory(null)
    setContentStrategy(null)
    setGeneratedPost(null)
    setGeneratedImage(null)
    setIncludeFAQs(true)
    setIncludeRealWorldData(true)
    setContentFormatPreset('guide')
    setCitationLevel('standard')
    setTopicIdeasMode('default')
    setPipelineWordCount(2000)
    onOpenChange(false)
  }
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(
        'p-0 flex flex-col gap-0',
        creationMode === 'cluster' ? 'max-w-4xl h-[90vh]' : 'max-w-2xl h-[80vh]'
      )}>
        {/* Header */}
        <DialogHeader className="p-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
            >
              <SignalIcon className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
            </div>
            <div>
              <span className="text-lg">
                {creationMode === 'cluster' ? 'Create Topic Cluster with Signal' : 'Create Blog Post with Signal'}
              </span>
              {creationMode === 'single' && (
                <div className="flex gap-2 mt-1">
                  {Object.values(STAGES).slice(0, -1).map((s, i) => (
                    <div
                      key={s}
                      className={cn(
                        'h-1 w-8 rounded-full transition-all',
                        Object.values(STAGES).indexOf(stage) >= i
                          ? 'bg-[var(--brand-primary)]'
                          : 'bg-[var(--surface-secondary)]'
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Mode Selector — shown when no mode is chosen yet */}
        {!creationMode && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
              <button
                onClick={() => setCreationMode('single')}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:border-[var(--brand-primary)]/40 hover:bg-[var(--brand-primary)]/5 transition-all text-left"
              >
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-500" />
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Single Article</h3>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    One SEO-optimized blog post with AI-driven topic selection and content generation
                  </p>
                </div>
              </button>

              <button
                onClick={() => setCreationMode('cluster')}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:border-[var(--brand-primary)]/40 hover:bg-[var(--brand-primary)]/5 transition-all text-left"
              >
                <div className="h-12 w-12 rounded-xl bg-[var(--brand-primary)]/10 flex items-center justify-center">
                  <Network className="h-6 w-6 text-[var(--brand-primary)]" />
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Topic Cluster</h3>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    Pillar article + 5-12 supporting posts for full topical authority
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Cluster Mode — full wizard inline */}
        {creationMode === 'cluster' && (
          <div className="flex-1 overflow-y-auto p-6">
            <ClusterGenerationWizard
              projectId={currentProject?.id}
              orgId={currentOrg?.id}
              onBack={() => setCreationMode(null)}
              onComplete={(clusterId) => {
                handleClose()
                onSuccess?.()
              }}
            />
          </div>
        )}

        {/* Single Article Mode — existing flow */}
        {creationMode === 'single' && (
        <>
        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full p-4" ref={scrollRef}>
          <div className="space-y-1">
            {messages.map((msg, i) => (
              <MessageBubble 
                key={i} 
                message={msg.content} 
                isUser={msg.role === 'user'} 
              />
            ))}
            
            {isTyping && (
              <MessageBubble isTyping />
            )}
            
            {/* Topic Suggestions */}
            {stage === STAGES.TOPIC && topicSuggestions.length > 0 && !isLoading && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Signal SEO topic ideas
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Topic mix:</span>
                  <button
                    type="button"
                    onClick={() => setTopicIdeasMode('default')}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
                      topicIdeasMode === 'default'
                        ? 'border-[var(--brand-primary)] bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)]'
                        : 'border-border bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)]',
                    )}
                  >
                    Balanced
                  </button>
                  <button
                    type="button"
                    onClick={() => setTopicIdeasMode('answer_engine_listicles')}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
                      topicIdeasMode === 'answer_engine_listicles'
                        ? 'border-[var(--brand-primary)] bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)]'
                        : 'border-border bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)]',
                    )}
                  >
                    Answer-engine listicles
                  </button>
                </div>
                {topicSuggestions.slice(0, 3).map((topic, i) => (
                  <TopicCard key={i} topic={topic} onSelect={handleTopicSelect} />
                ))}
              </div>
            )}
            
            {/* Category Selector */}
            {stage === STAGES.STRATEGY && categories.length > 0 && !isLoading && (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                    Select Category
                  </p>
                  <CategorySelector 
                    categories={categories}
                    selected={selectedCategory}
                    onSelect={handleCategorySelect}
                  />
                </div>

                <div className="p-4 rounded-xl bg-[var(--surface-secondary)] space-y-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Content format
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'guide', label: 'Guide' },
                      { id: 'listicle', label: 'Listicle (AI-citation style)' },
                      { id: 'faq_comprehensive', label: 'FAQ-heavy' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setContentFormatPreset(opt.id)
                          if (opt.id === 'faq_comprehensive') setIncludeFAQs(true)
                        }}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                          contentFormatPreset === opt.id
                            ? 'border-[var(--brand-primary)] bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)]'
                            : 'border-border bg-[var(--surface-tertiary)] hover:border-[var(--brand-primary)]/40',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-xs text-muted-foreground shrink-0">Citations:</span>
                    {[
                      { id: 'minimal', label: 'Light' },
                      { id: 'standard', label: 'Standard' },
                      { id: 'comprehensive', label: 'Heavy' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setCitationLevel(opt.id)}
                        className={cn(
                          'px-2.5 py-1 rounded-md text-xs border',
                          citationLevel === opt.id
                            ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                            : 'border-border text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs text-muted-foreground shrink-0" htmlFor="pipeline-word-count">
                      Target length (words)
                    </label>
                    <Input
                      id="pipeline-word-count"
                      type="number"
                      min={600}
                      max={8000}
                      className="h-8 w-24 text-xs"
                      value={pipelineWordCount}
                      onChange={(e) => setPipelineWordCount(Number(e.target.value) || 2000)}
                    />
                  </div>
                </div>
                
                {/* Content Enhancement Options */}
                <div className="p-4 rounded-xl bg-[var(--surface-secondary)] space-y-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Content Enhancements
                  </p>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={includeFAQs}
                      disabled={contentFormatPreset === 'faq_comprehensive'}
                      onChange={(e) => setIncludeFAQs(e.target.checked)}
                      className="w-4 h-4 rounded border-border accent-[var(--brand-primary)] disabled:opacity-50"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium group-hover:text-[var(--brand-primary)]">
                        Include FAQs
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Add a FAQ section at the end of the blog post
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={includeRealWorldData}
                      onChange={(e) => setIncludeRealWorldData(e.target.checked)}
                      className="w-4 h-4 rounded border-border accent-[var(--brand-primary)]"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium group-hover:text-[var(--brand-primary)]">
                        Include Real-World Data
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Add current statistics, recent news, and industry trends
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}
            
            {/* Generation Progress */}
            {stage === STAGES.GENERATING && isLoading && (
              <div className="mt-4 p-4 rounded-xl bg-[var(--surface-secondary)]">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--brand-primary)]" />
                  <div>
                    <p className="font-medium">Generating your blog post...</p>
                    <p className="text-sm text-muted-foreground">
                      Writing with E-E-A-T (author, citations, FAQ, schema)…
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Image Options */}
            {stage === STAGES.IMAGE && !isGeneratingImage && !isUploadingImage && !isLoading && (
              <div className="mt-4 space-y-4">
                {/* Drag & Drop Upload Zone */}
                <div
                  className={cn(
                    'relative border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer',
                    isDragging 
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5' 
                      : 'border-border hover:border-[var(--brand-primary)]/50 hover:bg-[var(--surface-secondary)]'
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div 
                      className="p-3 rounded-full"
                      style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
                    >
                      <Upload className="w-6 h-6" style={{ color: 'var(--brand-primary)' }} />
                    </div>
                    <div>
                      <p className="font-medium">Drop your image here</p>
                      <p className="text-sm text-muted-foreground">or click to browse • PNG, JPG up to 10MB</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground uppercase">or</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleGenerateImage} className="gap-2 flex-1">
                    <Wand2 className="w-4 h-4" />
                    Generate AI Image
                  </Button>
                  <Button variant="outline" onClick={handleSkipImage}>
                    Skip for now
                  </Button>
                </div>
              </div>
            )}
            
            {/* Image Upload Progress */}
            {isUploadingImage && (
              <div className="mt-4 p-4 rounded-xl bg-[var(--surface-secondary)]">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--brand-primary)]" />
                  <div>
                    <p className="font-medium">Uploading your image...</p>
                    <p className="text-sm text-muted-foreground">
                      Saving to your Files library
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Image Generation Progress */}
            {isGeneratingImage && (
              <div className="mt-4 p-4 rounded-xl bg-[var(--surface-secondary)]">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--brand-primary)]" />
                  <div>
                    <p className="font-medium">Creating your featured image...</p>
                    <p className="text-sm text-muted-foreground">
                      Using Gemini AI to generate a custom image
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Generated Image Preview */}
            {generatedImage && (
              <div className="mt-4 overflow-hidden">
                <img
                  src={generatedImage.url}
                  alt={generatedImage.alt}
                  className="w-full max-h-[240px] object-cover rounded-xl border border-[var(--glass-border)]"
                />
                <p className="text-xs text-[var(--text-tertiary)] mt-2 text-center">
                  {generatedImage.alt}
                </p>
              </div>
            )}
            
            {/* Review Actions */}
            {stage === STAGES.REVIEW && !isLoading && (
              <div className="mt-4 space-y-3">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">{generatedPost?.title}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{generatedPost?.excerpt}</p>
                    <div className="flex flex-wrap gap-2">
                      {(generatedPost?.keywords ?? [generatedPost?.metadata?.targetKeyword].filter(Boolean)).slice(0, 3).map((kw, i) => (
                        <Badge key={i} variant="outline">{kw}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <div className="flex gap-2">
                  <Button onClick={() => handlePublish(false)} className="gap-2 flex-1">
                    <Zap className="w-4 h-4" />
                    Publish Now
                  </Button>
                  <Button variant="outline" onClick={() => handlePublish(true)} className="gap-2 flex-1">
                    <FileText className="w-4 h-4" />
                    Save as Draft
                  </Button>
                </div>
              </div>
            )}
            
            {/* Complete */}
            {stage === STAGES.COMPLETE && (
              <div className="mt-4">
                <Button onClick={handleClose} className="w-full">
                  Done
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
        </div>
        
        {/* Input Area */}
        {stage !== STAGES.COMPLETE && (
          <form onSubmit={handleSendMessage} className="p-4 border-t shrink-0">
            <div className="flex gap-2 items-end">
              {stage === STAGES.TOPIC ? (
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage(e)
                    }
                  }}
                  placeholder="Describe your article concept, or pick from suggestions above..."
                  disabled={isLoading || isTyping}
                  className="flex-1 !min-h-[80px] max-h-[160px] resize-none"
                  rows={3}
                />
              ) : (
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    stage === STAGES.IMAGE ? "Type 'generate' or 'skip'..." :
                    stage === STAGES.REVIEW ? "Type 'publish' or 'save as draft'..." :
                    "Type a message..."
                  }
                  disabled={isLoading || isTyping}
                  className="flex-1"
                />
              )}
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading || isTyping}
                className="shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        )}
        </>
        )}
      </DialogContent>
    </Dialog>
  )
}
