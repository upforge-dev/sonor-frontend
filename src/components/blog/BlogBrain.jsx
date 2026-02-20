// src/components/blog/BlogBrain.jsx
// AI-powered blog content intelligence - uses SEO data for topic recommendations
// Integrated into Blog module (moved from SEO module for better workflow)
// Supports embedded mode when used from BlogDashboard (hides header and tabs)

import { useState } from 'react'
import {
  useBlogTopicRecommendations,
  useAnalyzeAllBlogPosts,
  useFixBlogPostEmDashes,
  useOptimizeBlogPost
} from '@/lib/hooks/use-seo'
import { useSignalAccess } from '@/lib/signal-access'
import SignalUpgradeCard from '@/components/seo/signal/SignalUpgradeCard'
import SignalIcon from '@/components/ui/SignalIcon'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Lightbulb,
  FileText,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Wand2,
  Quote,
  Link2,
  TrendingUp,
  Target,
  BookOpen,
  Play,
  Copy,
  Check
} from 'lucide-react'

// ============================================================================
// TOPIC IDEAS CONTENT
// ============================================================================

function TopicIdeasContent({
  projectId,
  blogTopicRecommendations,
  blogBrainLoading,
  refetchTopics,
  onCreateFromTopic,
  copiedId,
  setCopiedId
}) {
  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleCreateFromTopic = (topic) => {
    if (onCreateFromTopic) {
      onCreateFromTopic({
        topic: topic.title,
        keywords: topic.primaryKeyword,
        keyPoints: topic.contentAngle || topic.angle,
        category: topic.suggestedCategory
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
              Signal Topic Recommendations
            </CardTitle>
            <CardDescription>
              Blog topics based on your keyword gaps, search trends, and competitor analysis
            </CardDescription>
          </div>
          <Button 
            onClick={() => refetchTopics()}
            disabled={blogBrainLoading}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${blogBrainLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {blogBrainLoading && !blogTopicRecommendations.length ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Analyzing SEO data...</span>
          </div>
        ) : blogTopicRecommendations.length > 0 ? (
          <div className="space-y-4">
            {blogTopicRecommendations.map((topic, index) => (
              <div 
                key={index}
                className="p-4 rounded-xl border border-border hover:border-[var(--brand-primary)]/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-1">
                      {topic.title}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {topic.contentAngle || topic.angle}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Target className="w-3 h-3 mr-1" />
                        {topic.primaryKeyword}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          topic.trafficPotential === 'high' ? 'border-green-500 text-green-600' :
                          topic.trafficPotential === 'medium' ? 'border-yellow-500 text-yellow-600' :
                          'border-gray-500'
                        }`}
                      >
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {topic.trafficPotential} potential
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {topic.searchIntent || topic.intent}
                      </Badge>
                    </div>
                    {topic.relatedServices && topic.relatedServices.length > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <Link2 className="w-3 h-3" />
                        Link to: {topic.relatedServices.join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => copyToClipboard(topic.title, `topic-${index}`)}
                    >
                      {copiedId === `topic-${index}` ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleCreateFromTopic(topic)}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Create
                    </Button>
                  </div>
                </div>
                {topic.whyItMatters && (
                  <p 
                    className="mt-3 text-xs text-muted-foreground p-2 rounded"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)' }}
                  >
                    <strong>Why now:</strong> {topic.whyItMatters}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No topic recommendations yet.</p>
            <p className="text-sm">Train your SEO Signal Brain first for intelligent suggestions.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// CONTENT AUDIT CONTENT
// ============================================================================

function ContentAuditContent({
  allPostsAnalysis,
  blogBrainLoading,
  loadAllPostsAnalysis,
  fixingEmDashes,
  handleFixAllEmDashes,
  handleOptimizePost
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Content Quality Audit
            </CardTitle>
            <CardDescription>
              Scan all blog posts for style issues, missing citations, and SEO problems
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={loadAllPostsAnalysis}
              disabled={blogBrainLoading}
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${blogBrainLoading ? 'animate-spin' : ''}`} />
              Scan All
            </Button>
            {allPostsAnalysis?.postsWithIssues > 0 && (
              <Button 
                onClick={handleFixAllEmDashes}
                disabled={fixingEmDashes}
                style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary))' }}
                className="text-white"
              >
                <Wand2 className={`w-4 h-4 mr-2 ${fixingEmDashes ? 'animate-spin' : ''}`} />
                Fix All Em Dashes
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {blogBrainLoading && !allPostsAnalysis ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Scanning blog posts...</span>
          </div>
        ) : allPostsAnalysis ? (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-muted/50 text-center">
                <div className="text-2xl font-bold text-foreground">
                  {allPostsAnalysis.totalPosts}
                </div>
                <div className="text-sm text-muted-foreground">Total Posts</div>
              </div>
              <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {allPostsAnalysis.postsWithIssues}
                </div>
                <div className="text-sm text-yellow-700 dark:text-yellow-400">Posts with Issues</div>
              </div>
              <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {allPostsAnalysis.totalPosts - allPostsAnalysis.postsWithIssues}
                </div>
                <div className="text-sm text-green-700 dark:text-green-400">Clean Posts</div>
              </div>
            </div>

            {/* Posts with issues */}
            {allPostsAnalysis.results?.length > 0 && (
              <div className="space-y-3 mt-6">
                <h4 className="font-semibold text-foreground">Posts Needing Attention</h4>
                {allPostsAnalysis.results.map((post) => (
                  <div 
                    key={post.id}
                    className="p-4 rounded-xl border border-border"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="font-medium text-foreground">{post.title}</h5>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {post.issues.map((issue, i) => (
                            <Badge 
                              key={i}
                              variant="outline"
                              className={`text-xs ${
                                issue.severity === 'warning' ? 'border-yellow-500 text-yellow-600' :
                                issue.severity === 'error' ? 'border-red-500 text-red-600' :
                                'border-blue-500 text-blue-600'
                              }`}
                            >
                              {issue.type.replace(/-/g, ' ')}
                              {issue.autoFixable && (
                                <Sparkles className="w-3 h-3 ml-1" />
                              )}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleOptimizePost(post.id)}
                      >
                        <Wand2 className="w-4 h-4 mr-1" />
                        Optimize
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Click "Scan All" to analyze your blog posts</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// OPTIMIZE CONTENT
// ============================================================================

function OptimizeContent({ blogPostAnalysis, copiedId, setCopiedId }) {
  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
          Signal Post Optimizer
        </CardTitle>
        <CardDescription>
          Select a post to analyze and optimize with AI assistance
        </CardDescription>
      </CardHeader>
      <CardContent>
        {blogPostAnalysis ? (
          <div className="space-y-6">
            {/* Scores */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-muted/50 text-center">
                <div className={`text-2xl font-bold ${
                  (blogPostAnalysis.analysis?.seoScore || 0) >= 80 ? 'text-green-500' :
                  (blogPostAnalysis.analysis?.seoScore || 0) >= 60 ? 'text-yellow-500' :
                  'text-red-500'
                }`}>
                  {blogPostAnalysis.analysis?.seoScore || 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">SEO Score</div>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 text-center">
                <div className={`text-2xl font-bold ${
                  (blogPostAnalysis.analysis?.contentQualityScore || 0) >= 80 ? 'text-green-500' :
                  (blogPostAnalysis.analysis?.contentQualityScore || 0) >= 60 ? 'text-yellow-500' :
                  'text-red-500'
                }`}>
                  {blogPostAnalysis.analysis?.contentQualityScore || 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">Content Quality</div>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 text-center">
                <div className={`text-2xl font-bold ${
                  (blogPostAnalysis.analysis?.styleComplianceScore || 0) >= 80 ? 'text-green-500' :
                  (blogPostAnalysis.analysis?.styleComplianceScore || 0) >= 60 ? 'text-yellow-500' :
                  'text-red-500'
                }`}>
                  {blogPostAnalysis.analysis?.styleComplianceScore || 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">Style Compliance</div>
              </div>
            </div>

            {/* Issues */}
            {blogPostAnalysis.analysis?.issues && (
              <div>
                <h4 className="font-semibold text-foreground mb-3">Issues Found</h4>
                <div className="space-y-2">
                  {blogPostAnalysis.analysis.issues.map((issue, i) => (
                    <div key={i} className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-700 dark:text-red-300">{issue}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {blogPostAnalysis.analysis?.optimizedTitle && (
              <div>
                <h4 className="font-semibold text-foreground mb-3">Optimized Title</h4>
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center justify-between">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {blogPostAnalysis.analysis.optimizedTitle}
                  </p>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => copyToClipboard(blogPostAnalysis.analysis.optimizedTitle, 'title')}
                  >
                    {copiedId === 'title' ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {blogPostAnalysis.analysis?.optimizedMetaDescription && (
              <div>
                <h4 className="font-semibold text-foreground mb-3">Optimized Meta Description</h4>
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center justify-between">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {blogPostAnalysis.analysis.optimizedMetaDescription}
                  </p>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => copyToClipboard(blogPostAnalysis.analysis.optimizedMetaDescription, 'meta')}
                  >
                    {copiedId === 'meta' ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Wand2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Select a post from the Content Audit tab to optimize</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// GUIDELINES CONTENT
// ============================================================================

function GuidelinesContent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
          Writing Guidelines
        </CardTitle>
        <CardDescription>
          Style rules enforced by Blog Signal Brain
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Never Use */}
          <div>
            <h4 className="font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Never Use
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-red-500 font-bold">×</span>
                Em dashes (—) or en dashes (–) except in number ranges
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-red-500 font-bold">×</span>
                Generic openers like "In today's digital landscape..."
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-red-500 font-bold">×</span>
                Overly formal or academic language
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-red-500 font-bold">×</span>
                Sales-heavy or pushy language
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-red-500 font-bold">×</span>
                Passive voice when active is clearer
              </li>
            </ul>
          </div>

          {/* Always Do */}
          <div>
            <h4 className="font-semibold text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Always Do
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-green-500 font-bold">✓</span>
                Write like teaching a smart friend
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-green-500 font-bold">✓</span>
                Cite credible sources with specific data
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-green-500 font-bold">✓</span>
                Use contractions naturally (you'll, we've, it's)
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-green-500 font-bold">✓</span>
                Keep paragraphs to 2-3 sentences max
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-green-500 font-bold">✓</span>
                Start with a compelling hook, not generic intro
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-green-500 font-bold">✓</span>
                Include real examples and case studies
              </li>
            </ul>
          </div>

          {/* Tone Examples */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Quote className="w-4 h-4" />
              Tone Examples
            </h4>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">❌ Wrong</p>
                <p className="text-sm text-red-700 dark:text-red-300 italic">
                  "In today's ever-evolving digital marketing landscape — where competition is fierce — businesses must leverage innovative strategies to achieve success."
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">✅ Right</p>
                <p className="text-sm text-green-700 dark:text-green-300 italic">
                  "Here's the truth about digital marketing in 2025: the businesses winning aren't doing more. They're doing less, but doing it better. Let me show you exactly how."
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// MAIN BLOGBRAIN COMPONENT
// ============================================================================

/**
 * BlogBrain - AI Content Intelligence for Blog Module
 * 
 * Features:
 * - Topic Ideas: SEO-driven recommendations based on keyword gaps & competitor analysis
 * - Content Audit: Scan posts for style issues (em dashes, citations, etc.)
 * - Optimize: AI post optimizer with quality scores
 * - Guidelines: Writing style rules
 * 
 * @param {string} projectId - Current project ID
 * @param {function} onCreateFromTopic - Callback when user clicks "Create" on a topic
 * @param {string} activeTab - Controlled active tab (optional, used in embedded mode)
 * @param {function} onTabChange - Tab change callback (optional)
 * @param {boolean} embedded - When true, hides header and tabs (used in BlogDashboard)
 */
export default function BlogBrain({ 
  projectId, 
  onCreateFromTopic,
  activeTab: controlledTab,
  onTabChange,
  embedded = false
}) {
  const { hasAccess: hasSignalAccess } = useSignalAccess()
  const [internalTab, setInternalTab] = useState('topics')
  const activeTab = controlledTab ?? internalTab
  const setActiveTab = onTabChange ?? setInternalTab
  
  const [copiedId, setCopiedId] = useState(null)
  const [allPostsAnalysis, setAllPostsAnalysis] = useState(null)
  const [fixingEmDashes, setFixingEmDashes] = useState(false)
  
  // React Query hooks
  const { 
    data: blogTopicRecommendations = [], 
    isLoading: topicsLoading,
    refetch: refetchTopics
  } = useBlogTopicRecommendations(projectId, {
    enabled: activeTab === 'topics' && hasSignalAccess
  })
  
  const analyzeAllPostsMutation = useAnalyzeAllBlogPosts()
  const fixEmDashesMutation = useFixBlogPostEmDashes()
  const optimizePostMutation = useOptimizeBlogPost()
  
  const blogBrainLoading = topicsLoading || analyzeAllPostsMutation.isPending
  const blogBrainError = analyzeAllPostsMutation.error?.message || fixEmDashesMutation.error?.message
  const blogPostAnalysis = optimizePostMutation.data

  const loadAllPostsAnalysis = async () => {
    try {
      const result = await analyzeAllPostsMutation.mutateAsync({ projectId })
      setAllPostsAnalysis(result)
    } catch (error) {
      console.error('Failed to analyze posts:', error)
    }
  }

  const handleFixAllEmDashes = async () => {
    setFixingEmDashes(true)
    try {
      const result = await fixEmDashesMutation.mutateAsync({ projectId })
      await loadAllPostsAnalysis()
      alert(`Fixed ${result.fixed} posts with em dashes!`)
    } catch (error) {
      console.error('Failed to fix em dashes:', error)
    } finally {
      setFixingEmDashes(false)
    }
  }

  const handleOptimizePost = async (postId) => {
    try {
      await optimizePostMutation.mutateAsync({ postId, projectId, options: { applyChanges: false } })
    } catch (error) {
      console.error('Failed to optimize post:', error)
    }
  }

  // Show upgrade prompt if no Signal access
  if (!hasSignalAccess) {
    return (
      <div className="p-6">
        <SignalUpgradeCard feature="default" variant="default" />
      </div>
    )
  }

  // Render content for a specific tab
  const renderTabContent = (tab) => {
    switch (tab) {
      case 'topics':
        return (
          <TopicIdeasContent
            projectId={projectId}
            blogTopicRecommendations={blogTopicRecommendations}
            blogBrainLoading={blogBrainLoading}
            refetchTopics={refetchTopics}
            onCreateFromTopic={onCreateFromTopic}
            copiedId={copiedId}
            setCopiedId={setCopiedId}
          />
        )
      case 'audit':
        return (
          <ContentAuditContent
            allPostsAnalysis={allPostsAnalysis}
            blogBrainLoading={blogBrainLoading}
            loadAllPostsAnalysis={loadAllPostsAnalysis}
            fixingEmDashes={fixingEmDashes}
            handleFixAllEmDashes={handleFixAllEmDashes}
            handleOptimizePost={handleOptimizePost}
          />
        )
      case 'optimize':
        return (
          <OptimizeContent
            blogPostAnalysis={blogPostAnalysis}
            copiedId={copiedId}
            setCopiedId={setCopiedId}
          />
        )
      case 'guidelines':
        return <GuidelinesContent />
      default:
        return null
    }
  }

  // Embedded mode: render only content, no header or tabs
  if (embedded) {
    return (
      <div className="space-y-6">
        {renderTabContent(activeTab)}
        
        {/* Error Display */}
        {blogBrainError && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">{blogBrainError}</p>
          </div>
        )}
      </div>
    )
  }

  // Full mode: render with header and tabs
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary))' }}
          >
            <SignalIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Blog Signal Brain</h2>
            <p className="text-sm text-muted-foreground">
              SEO-powered content intelligence for your blog
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="topics" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Topic Ideas
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Content Audit
          </TabsTrigger>
          <TabsTrigger value="optimize" className="flex items-center gap-2">
            <Wand2 className="w-4 h-4" />
            Optimize
          </TabsTrigger>
          <TabsTrigger value="guidelines" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Guidelines
          </TabsTrigger>
        </TabsList>

        <TabsContent value="topics" className="space-y-4">
          {renderTabContent('topics')}
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          {renderTabContent('audit')}
        </TabsContent>

        <TabsContent value="optimize" className="space-y-4">
          {renderTabContent('optimize')}
        </TabsContent>

        <TabsContent value="guidelines" className="space-y-4">
          {renderTabContent('guidelines')}
        </TabsContent>
      </Tabs>

      {/* Error Display */}
      {blogBrainError && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300">{blogBrainError}</p>
        </div>
      )}
    </div>
  )
}
