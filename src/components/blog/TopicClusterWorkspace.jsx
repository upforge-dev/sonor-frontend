/**
 * TopicClusterWorkspace — Flagship topic cluster management UI
 *
 * Three sub-views:
 * 1. Cluster List — overview of all clusters with stats
 * 2. Cluster Generation — Plan → Approve → Generate flow with live progress
 * 3. Cluster Detail — workspace for managing a single cluster's articles
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import useAuthStore from '@/lib/auth-store'
import { blogApi } from '@/lib/sonor-api'
import { skillsApi } from '@/lib/signal-api'
import { SonorSpinner } from '@/components/SonorLoading'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/glass-card'
import { StatTile, StatTileGrid } from '@/components/ui/stat-tile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Layers,
  Plus,
  Sparkles,
  ArrowLeft,
  CheckCircle,
  Clock,
  FileText,
  Pencil,
  Trash2,
  Calendar,
  ExternalLink,
  Target,
  Search,
  BarChart3,
  Loader2,
  AlertTriangle,
  ChevronRight,
  Network,
  ImageIcon,
  Wand2,
} from 'lucide-react'

// ============================================================================
// STATUS BADGE
// ============================================================================

const STATUS_STYLES = {
  draft: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  planning: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  generating: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  complete: 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-[var(--brand-primary)]/20',
  archived: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
}

const ARTICLE_TYPE_COLORS = {
  pillar: 'bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] border-[var(--brand-primary)]/25',
  support: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  comparison: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  faq: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  glossary: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  checklist: 'bg-green-500/10 text-green-600 border-green-500/20',
  'case-study-adjacent': 'bg-rose-500/10 text-rose-500 border-rose-500/20',
}

const INTENT_LABELS = {
  informational: 'Informational',
  navigational: 'Navigational',
  commercial: 'Commercial',
  transactional: 'Transactional',
}

const FUNNEL_LABELS = {
  awareness: 'Awareness',
  consideration: 'Consideration',
  decision: 'Decision',
  retention: 'Retention',
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${STATUS_STYLES[status] || STATUS_STYLES.draft}`}>
      {status}
    </span>
  )
}

function ArticleTypeBadge({ type }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${ARTICLE_TYPE_COLORS[type] || ARTICLE_TYPE_COLORS.support}`}>
      {type}
    </span>
  )
}

// ============================================================================
// GENERATION PROGRESS INDICATORS
// ============================================================================

const ARTICLE_STATUS_ICONS = {
  pending: <Clock className="h-4 w-4 text-[var(--text-tertiary)]" />,
  'gathering-context': <Search className="h-4 w-4 text-blue-500 animate-pulse" />,
  writing: <Pencil className="h-4 w-4 text-amber-500 animate-pulse" />,
  assembling: <Loader2 className="h-4 w-4 text-purple-500 animate-spin" />,
  complete: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  error: <AlertTriangle className="h-4 w-4 text-red-500" />,
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TopicClusterWorkspace({ posts, projectId, orgId, fetchPosts }) {
  const [view, setView] = useState('list') // list | generate | detail
  const [selectedClusterId, setSelectedClusterId] = useState(null)
  const [clusters, setClusters] = useState([])
  const [loading, setLoading] = useState(true)

  const loadClusters = useCallback(async () => {
    try {
      setLoading(true)
      const data = await blogApi.listClusters({ projectId, orgId })
      setClusters(data.clusters || [])
    } catch (err) {
      console.error('Failed to load clusters:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId, orgId])

  useEffect(() => {
    loadClusters()
  }, [loadClusters])

  const openClusterDetail = (clusterId) => {
    setSelectedClusterId(clusterId)
    setView('detail')
  }

  const goBack = () => {
    setView('list')
    setSelectedClusterId(null)
    loadClusters()
  }

  if (view === 'generate') {
    return (
      <ClusterGenerationWizard
        projectId={projectId}
        orgId={orgId}
        onBack={goBack}
        onComplete={(clusterId) => {
          loadClusters()
          openClusterDetail(clusterId)
        }}
      />
    )
  }

  if (view === 'detail' && selectedClusterId) {
    return (
      <ClusterDetailView
        clusterId={selectedClusterId}
        projectId={projectId}
        onBack={goBack}
        fetchPosts={fetchPosts}
      />
    )
  }

  return (
    <ClusterListView
      clusters={clusters}
      loading={loading}
      onRefresh={loadClusters}
      onOpenCluster={openClusterDetail}
      onGenerate={() => setView('generate')}
    />
  )
}

// ============================================================================
// VIEW 1: CLUSTER LIST
// ============================================================================

function ClusterListView({ clusters, loading, onRefresh, onOpenCluster, onGenerate }) {
  const activeClusters = clusters.filter(c => ['active', 'complete'].includes(c.status))
  const totalArticles = clusters.reduce((sum, c) => sum + (c.articleCount || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Topic Clusters</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Pillar + support article hierarchies for topical authority
          </p>
        </div>
        <Button onClick={onGenerate} className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white">
          <Sparkles className="h-4 w-4 mr-2" />
          Generate Cluster
        </Button>
      </div>

      {/* Stats */}
      <StatTileGrid columns={4}>
        <StatTile label="Total Clusters" value={clusters.length} icon={Layers} />
        <StatTile label="Active" value={activeClusters.length} icon={CheckCircle} />
        <StatTile label="Total Articles" value={totalArticles} icon={FileText} />
        <StatTile
          label="Avg Articles"
          value={clusters.length > 0 ? Math.round(totalArticles / clusters.length) : 0}
          icon={BarChart3}
        />
      </StatTileGrid>

      {/* Cluster Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <SonorSpinner size="md" label="Loading clusters..." />
        </div>
      ) : clusters.length === 0 ? (
        <GlassCard>
          <GlassCardContent className="flex flex-col items-center py-12">
            <div className="h-12 w-12 rounded-xl bg-[var(--brand-primary)]/10 flex items-center justify-center mb-4">
              <Layers className="h-6 w-6 text-[var(--brand-primary)]" />
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">No clusters yet</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4 text-center max-w-md">
              Generate your first topic cluster to build topical authority with a pillar page and supporting articles.
            </p>
            <Button onClick={onGenerate} className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Your First Cluster
            </Button>
          </GlassCardContent>
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clusters.map(cluster => (
            <GlassCard
              key={cluster.id}
              hover
              className="cursor-pointer"
              onClick={() => onOpenCluster(cluster.id)}
            >
              <GlassCardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {cluster.clusterName}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                      {cluster.coreTopic}
                    </p>
                  </div>
                  <StatusBadge status={cluster.status} />
                </div>

                <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {cluster.articleCount} articles
                  </span>
                  {cluster.geoTarget && (
                    <span className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      {cluster.geoTarget}
                    </span>
                  )}
                </div>

                {cluster.commercialGoal && (
                  <p className="text-xs text-[var(--text-tertiary)] mt-2 truncate">
                    Goal: {cluster.commercialGoal}
                  </p>
                )}

                <div className="flex items-center justify-end mt-3">
                  <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />
                </div>
              </GlassCardContent>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// VIEW 2: CLUSTER GENERATION WIZARD (Plan → Approve → Generate)
// ============================================================================

const GEN_STAGES = {
  INPUT: 'input',
  PLANNING: 'planning',
  REVIEW: 'review',
  GENERATING: 'generating',
  COMPLETE: 'complete',
}

function ClusterGenerationWizard({ projectId, orgId, onBack, onComplete }) {
  const { currentProject, currentOrg } = useAuthStore()
  const [stage, setStage] = useState(GEN_STAGES.INPUT)
  const [form, setForm] = useState({
    topic: '',
    audience: '',
    servicePage: '',
    geoTarget: '',
    tone: 'professional',
    supportCount: 8,
    commercialGoal: '',
    primaryEntity: currentProject?.name || currentOrg?.name || '',
    industry: '',
    imageMode: 'ai', // 'ai' = auto-generate with Gemini after articles, 'manual' = upload later, 'none' = skip
  })
  const [plan, setPlan] = useState(null)
  const [planJobId, setPlanJobId] = useState(null)
  const [genJobId, setGenJobId] = useState(null)
  const [clusterId, setClusterId] = useState(null)
  const [genProgress, setGenProgress] = useState(null)
  const [error, setError] = useState(null)
  const pollRef = useRef(null)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // --- Stage 1: Submit for planning ---
  const handlePlan = async () => {
    setError(null)
    setStage(GEN_STAGES.PLANNING)

    try {
      const result = await blogApi.planCluster({
        topic: form.topic,
        audience: form.audience,
        servicePage: form.servicePage,
        geoTarget: form.geoTarget || undefined,
        tone: form.tone,
        supportCount: form.supportCount,
        commercialGoal: form.commercialGoal || undefined,
        primaryEntity: form.primaryEntity || undefined,
        industry: form.industry || undefined,
        projectId,
        orgId,
      })

      setPlanJobId(result.jobId)

      // Poll for planning completion
      pollRef.current = setInterval(async () => {
        try {
          const job = await blogApi.getClusterGenerationJob(result.jobId)
          if (job.status === 'completed' && job.result?.plan) {
            clearInterval(pollRef.current)
            setPlan(job.result.plan)
            setStage(GEN_STAGES.REVIEW)
          } else if (job.status === 'failed') {
            clearInterval(pollRef.current)
            setError(job.error || 'Planning failed')
            setStage(GEN_STAGES.INPUT)
          }
        } catch (err) {
          // Keep polling
        }
      }, 2000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start planning')
      setStage(GEN_STAGES.INPUT)
    }
  }

  // --- Stage 3: Execute generation from approved plan ---
  const handleGenerate = async () => {
    setError(null)
    setStage(GEN_STAGES.GENERATING)

    try {
      const result = await blogApi.generateClusterFromPlan({
        plan,
        projectId,
        orgId,
      })

      setGenJobId(result.jobId)
      setClusterId(result.clusterId)

      // Poll for generation progress
      pollRef.current = setInterval(async () => {
        try {
          const job = await blogApi.getClusterGenerationJob(result.jobId)
          if (job.clusterProgress) {
            setGenProgress(job.clusterProgress)
          }
          if (job.status === 'completed') {
            clearInterval(pollRef.current)
            setStage(GEN_STAGES.COMPLETE)
          } else if (job.status === 'failed') {
            clearInterval(pollRef.current)
            setError(job.error || 'Generation failed — you can retry')
            setStage(GEN_STAGES.REVIEW)
          }
        } catch (err) {
          // Keep polling
        }
      }, 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start generation')
      setStage(GEN_STAGES.REVIEW)
    }
  }

  // --- Edit support article in plan ---
  const updateSupport = (index, field, value) => {
    setPlan(prev => ({
      ...prev,
      supports: prev.supports.map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      ),
    }))
  }

  const removeSupport = (index) => {
    setPlan(prev => ({
      ...prev,
      supports: prev.supports.filter((_, i) => i !== index),
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Generate Topic Cluster</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {stage === GEN_STAGES.INPUT && 'Define your topic and audience'}
            {stage === GEN_STAGES.PLANNING && 'AI is planning your cluster...'}
            {stage === GEN_STAGES.REVIEW && 'Review and approve the cluster plan'}
            {stage === GEN_STAGES.GENERATING && 'Generating articles...'}
            {stage === GEN_STAGES.COMPLETE && 'Cluster generation complete'}
          </p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        {Object.values(GEN_STAGES).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`h-1.5 w-8 rounded-full transition-colors ${
              Object.values(GEN_STAGES).indexOf(stage) >= i
                ? 'bg-[var(--brand-primary)]'
                : 'bg-[var(--glass-border)]'
            }`} />
          </div>
        ))}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Stage content */}
      {stage === GEN_STAGES.INPUT && (
        <InputStage form={form} setForm={setForm} onSubmit={handlePlan} />
      )}
      {stage === GEN_STAGES.PLANNING && (
        <div className="flex flex-col items-center py-16">
          <SonorSpinner size="lg" label="Planning your cluster..." />
          <p className="text-sm text-[var(--text-tertiary)] mt-4">
            AI is designing the pillar + support article structure
          </p>
        </div>
      )}
      {stage === GEN_STAGES.REVIEW && plan && (
        <ReviewStage
          plan={plan}
          setPlan={setPlan}
          updateSupport={updateSupport}
          removeSupport={removeSupport}
          onGenerate={handleGenerate}
          onBack={() => { setStage(GEN_STAGES.INPUT); setPlan(null) }}
        />
      )}
      {stage === GEN_STAGES.GENERATING && (
        <GeneratingStage progress={genProgress} plan={plan} />
      )}
      {stage === GEN_STAGES.COMPLETE && (
        <CompleteStage
          progress={genProgress}
          clusterId={clusterId}
          onViewCluster={() => onComplete(clusterId)}
        />
      )}
    </div>
  )
}

// --- Stage 1: Input Form ---
function InputStage({ form, setForm, onSubmit }) {
  const update = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target?.value ?? e }))

  const canSubmit = form.topic.trim() && form.audience.trim() && form.servicePage.trim()

  return (
    <GlassCard>
      <GlassCardContent className="p-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="text-sm text-[var(--text-secondary)]">Broad Topic</Label>
            <Input
              value={form.topic}
              onChange={update('topic')}
              placeholder="e.g., Custom Software Development Cincinnati"
              className="mt-1"
            />
          </div>

          <div className="sm:col-span-2">
            <Label className="text-sm text-[var(--text-secondary)]">Target Audience / ICP</Label>
            <Textarea
              value={form.audience}
              onChange={update('audience')}
              placeholder="e.g., Growing service businesses with 20-200 employees outgrowing off-the-shelf software"
              className="mt-1"
              rows={2}
            />
          </div>

          <div>
            <Label className="text-sm text-[var(--text-secondary)]">Service Page URL</Label>
            <Input
              value={form.servicePage}
              onChange={update('servicePage')}
              placeholder="/services/application-development"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm text-[var(--text-secondary)]">Commercial Goal</Label>
            <Input
              value={form.commercialGoal}
              onChange={update('commercialGoal')}
              placeholder="Book a discovery call"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm text-[var(--text-secondary)]">Geographic Target</Label>
            <Input
              value={form.geoTarget}
              onChange={update('geoTarget')}
              placeholder="Cincinnati, Northern Kentucky"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm text-[var(--text-secondary)]">Industry</Label>
            <Input
              value={form.industry}
              onChange={update('industry')}
              placeholder="cross-industry"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm text-[var(--text-secondary)]">Business Name</Label>
            <Input
              value={form.primaryEntity}
              onChange={update('primaryEntity')}
              placeholder="Upforge"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm text-[var(--text-secondary)]">Tone</Label>
            <Select value={form.tone} onValueChange={(v) => setForm(prev => ({ ...prev, tone: v }))}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="conversational">Conversational</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="authoritative">Authoritative</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm text-[var(--text-secondary)]">Support Articles</Label>
            <Select
              value={String(form.supportCount)}
              onValueChange={(v) => setForm(prev => ({ ...prev, supportCount: parseInt(v) }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                  <SelectItem key={n} value={String(n)}>{n} articles</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <Label className="text-sm text-[var(--text-secondary)]">Featured Images</Label>
            <div className="flex gap-2 mt-1">
              {[
                { value: 'ai', label: 'Generate with AI', desc: 'Gemini creates unique images after articles generate' },
                { value: 'manual', label: 'Upload manually', desc: 'Add images later in the cluster workspace' },
                { value: 'none', label: 'Skip for now', desc: 'Publish without featured images' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, imageMode: opt.value }))}
                  className={`flex-1 p-3 rounded-lg border text-left transition-all ${
                    form.imageMode === opt.value
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5'
                      : 'border-[var(--glass-border)] bg-[var(--glass-bg)] hover:border-[var(--glass-border)]/80'
                  }`}
                >
                  <p className="text-xs font-medium text-[var(--text-primary)]">{opt.label}</p>
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Plan Cluster
          </Button>
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}

// --- Stage 3: Review & Approve ---
function ReviewStage({ plan, setPlan, updateSupport, removeSupport, onGenerate, onBack }) {
  return (
    <div className="space-y-6">
      {/* Pillar Card */}
      <GlassCard className="border-[var(--brand-primary)]/30 border-2">
        <GlassCardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[var(--brand-primary)]/15 flex items-center justify-center">
                <Network className="h-4 w-4 text-[var(--brand-primary)]" />
              </div>
              <div>
                <ArticleTypeBadge type="pillar" />
                <span className="text-xs text-[var(--text-tertiary)] ml-2">
                  ~{plan.pillar.word_count_target} words
                </span>
              </div>
            </div>
          </div>

          <Input
            value={plan.pillar.title}
            onChange={(e) => setPlan(prev => ({
              ...prev,
              pillar: { ...prev.pillar, title: e.target.value }
            }))}
            className="text-base font-semibold mb-2"
          />

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-0.5 rounded bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-secondary)]">
              {plan.pillar.target_keyword}
            </span>
            {plan.pillar.secondary_keywords?.slice(0, 3).map(kw => (
              <span key={kw} className="px-2 py-0.5 rounded bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-tertiary)]">
                {kw}
              </span>
            ))}
          </div>

          {plan.pillar.outline && plan.pillar.outline.length > 0 && (
            <div className="mt-3 pl-3 border-l-2 border-[var(--brand-primary)]/20">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Outline ({plan.pillar.outline.length} sections)</p>
              {plan.pillar.outline.map((section, i) => (
                <p key={i} className="text-xs text-[var(--text-secondary)]">
                  {section.section_number || section.number || i + 1}. {section.heading || section.title || section.name || JSON.stringify(section).slice(0, 80)}
                </p>
              ))}
            </div>
          )}

          {plan.pillar.image_concept && (
            <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
              <ImageIcon className="h-3 w-3" />
              <span>{plan.pillar.image_concept.style}: {plan.pillar.image_concept.description}</span>
            </div>
          )}
        </GlassCardContent>
      </GlassCard>

      {/* Support Articles */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
          Support Articles ({plan.supports?.length || 0})
        </h3>

        <div className="grid gap-3 sm:grid-cols-2">
          {plan.supports?.map((support, i) => (
            <GlassCard key={i}>
              <GlassCardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <ArticleTypeBadge type={support.article_type} />
                    <span className="text-xs text-[var(--text-tertiary)]">W{support.publish_priority}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-[var(--text-tertiary)] hover:text-red-500"
                    onClick={() => removeSupport(i)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <Input
                  value={support.title}
                  onChange={(e) => updateSupport(i, 'title', e.target.value)}
                  className="text-sm font-medium mb-2"
                />

                <div className="space-y-1 text-xs text-[var(--text-tertiary)]">
                  <div className="flex gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                      {INTENT_LABELS[support.search_intent] || support.search_intent}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                      {FUNNEL_LABELS[support.funnel_stage] || support.funnel_stage}
                    </span>
                  </div>
                  <p className="text-[var(--text-secondary)]">{support.relationship_to_pillar}</p>
                  <p>
                    <span className="text-[var(--text-tertiary)]">{support.target_keyword}</span>
                    {' · ~'}{support.word_count_target} words
                  </p>
                  {support.fills_competitor_gap && (
                    <span className="text-amber-500">Fills competitor gap</span>
                  )}
                  {support.image_concept && (
                    <div className="mt-1 flex items-center gap-1">
                      <ImageIcon className="h-3 w-3 text-[var(--text-tertiary)]" />
                      <span className="text-[var(--text-tertiary)] truncate">{support.image_concept.description}</span>
                    </div>
                  )}
                </div>
              </GlassCardContent>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Overlap Matrix (if any high-risk overlaps) */}
      {plan.overlap_matrix?.some(o => o.risk === 'high' || o.risk === 'medium') && (
        <GlassCard>
          <GlassCardContent className="p-4">
            <h3 className="text-sm font-semibold text-amber-500 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Overlap Warnings
            </h3>
            <div className="space-y-1">
              {plan.overlap_matrix
                .filter(o => o.risk === 'high' || o.risk === 'medium')
                .map((o, i) => (
                  <p key={i} className="text-xs text-[var(--text-secondary)]">
                    <span className={o.risk === 'high' ? 'text-red-500' : 'text-amber-500'}>
                      [{o.risk}]
                    </span>{' '}
                    {o.article_a} / {o.article_b}: {o.detail} (score: {o.overlap_score})
                  </p>
                ))}
            </div>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Re-plan
        </Button>
        <Button
          onClick={onGenerate}
          className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Generate All Articles
        </Button>
      </div>
    </div>
  )
}

// --- Stage 4: Generation Progress ---
function GeneratingStage({ progress, plan }) {
  const articles = progress?.articles || plan?.supports?.map(s => ({
    title: s.title,
    type: s.article_type,
    status: 'pending',
  })) || []
  const completed = progress?.completed_articles || 0
  const total = progress?.total_articles || (plan ? 1 + (plan.supports?.length || 0) : 0)

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-secondary)]">
            {completed} of {total} articles complete
          </span>
          <span className="text-[var(--text-tertiary)]">
            {total > 0 ? Math.round((completed / total) * 100) : 0}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--brand-primary)] transition-all duration-500"
            style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Article cards */}
      <div className="space-y-3">
        {articles.map((article, i) => (
          <GlassCard
            key={i}
            className={article.status === 'writing' || article.status === 'gathering-context'
              ? 'border-[var(--brand-primary)]/30'
              : ''}
          >
            <GlassCardContent className="p-4 flex items-center gap-4">
              <div className="flex-shrink-0">
                {ARTICLE_STATUS_ICONS[article.status] || ARTICLE_STATUS_ICONS.pending}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {article.title}
                  </span>
                  <ArticleTypeBadge type={article.type} />
                </div>
                <p className="text-xs text-[var(--text-tertiary)] capitalize">
                  {article.status?.replace('-', ' ')}
                </p>
              </div>
              {article.word_count && (
                <span className="text-xs text-[var(--text-tertiary)]">
                  {article.word_count.toLocaleString()} words
                </span>
              )}
              {article.seo_score != null && (
                <span className="text-xs text-emerald-500">
                  SEO {article.seo_score}
                </span>
              )}
              {(article.status === 'writing' || article.status === 'gathering-context') && (
                <SonorSpinner size="sm" />
              )}
            </GlassCardContent>
          </GlassCard>
        ))}
      </div>

      <p className="text-xs text-center text-[var(--text-tertiary)]">
        You can navigate away — generation continues in the background
      </p>
    </div>
  )
}

// --- Stage 5: Complete ---
function CompleteStage({ progress, clusterId, onViewCluster }) {
  const articles = progress?.articles || []
  const totalWords = articles.reduce((sum, a) => sum + (a.word_count || 0), 0)
  const avgSeo = articles.filter(a => a.seo_score).length > 0
    ? Math.round(articles.filter(a => a.seo_score).reduce((s, a) => s + a.seo_score, 0) / articles.filter(a => a.seo_score).length)
    : 0
  const totalReading = Math.round(totalWords / 250)

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center py-6">
        <div className="h-14 w-14 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-3">
          <CheckCircle className="h-7 w-7 text-emerald-500" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Cluster Generated</h3>
        <p className="text-sm text-[var(--text-secondary)]">All articles are ready for review</p>
      </div>

      <StatTileGrid columns={4}>
        <StatTile label="Total Words" value={totalWords.toLocaleString()} icon={FileText} />
        <StatTile label="Articles" value={articles.length} icon={Layers} />
        <StatTile label="Avg SEO" value={avgSeo} icon={BarChart3} />
        <StatTile label="Reading Time" value={`${totalReading} min`} icon={Clock} />
      </StatTileGrid>

      <div className="flex justify-center gap-3">
        <Button
          onClick={onViewCluster}
          className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white"
        >
          View Cluster Workspace
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// VIEW 3: CLUSTER DETAIL
// ============================================================================

function ClusterDetailView({ clusterId, projectId, onBack, fetchPosts }) {
  const [cluster, setCluster] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadCluster = useCallback(async () => {
    try {
      setLoading(true)
      const data = await blogApi.getCluster(clusterId)
      setCluster(data)
    } catch (err) {
      console.error('Failed to load cluster:', err)
    } finally {
      setLoading(false)
    }
  }, [clusterId])

  useEffect(() => {
    loadCluster()
  }, [loadCluster])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <SonorSpinner size="md" label="Loading cluster..." />
      </div>
    )
  }

  if (!cluster) {
    return (
      <div className="text-center py-16 text-[var(--text-secondary)]">
        Cluster not found
      </div>
    )
  }

  const pillar = cluster.pillar
  const articles = cluster.articles || []

  // Group by publish priority (week)
  const byWeek = {}
  articles.forEach(a => {
    const week = a.publishPriority || 1
    if (!byWeek[week]) byWeek[week] = []
    byWeek[week].push(a)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{cluster.clusterName}</h2>
            <StatusBadge status={cluster.status} />
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)] mt-0.5">
            <span>{cluster.coreTopic}</span>
            {cluster.geoTarget && <span>· {cluster.geoTarget}</span>}
            {cluster.commercialGoal && <span>· {cluster.commercialGoal}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {cluster.targetServicePage && (
            <Button variant="outline" size="sm" asChild>
              <a href={cluster.targetServicePage} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                Service Page
              </a>
            </Button>
          )}
          <PublishClusterButton
            clusterId={clusterId}
            articles={[...(pillar ? [pillar] : []), ...articles]}
            onPublished={loadCluster}
          />
        </div>
      </div>

      {/* Stats */}
      <StatTileGrid columns={4}>
        <StatTile label="Articles" value={cluster.articleCount} icon={FileText} />
        <StatTile
          label="Published"
          value={articles.filter(a => a.status === 'published').length + (pillar?.status === 'published' ? 1 : 0)}
          icon={CheckCircle}
        />
        <StatTile
          label="Drafts"
          value={articles.filter(a => a.status === 'draft').length + (pillar?.status === 'draft' ? 1 : 0)}
          icon={Clock}
        />
        <StatTile
          label="Scheduled"
          value={articles.filter(a => a.status === 'scheduled').length + (pillar?.status === 'scheduled' ? 1 : 0)}
          icon={Calendar}
        />
      </StatTileGrid>

      {/* Image Queue */}
      <ClusterImageQueue
        pillar={pillar}
        articles={articles}
        projectId={projectId}
        orgId={cluster.orgId}
        onImageGenerated={loadCluster}
      />

      {/* Pillar */}
      {pillar && (
        <GlassCard className="border-[var(--brand-primary)]/30 border-2">
          <GlassCardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[var(--brand-primary)]/15 flex items-center justify-center">
                  <Network className="h-4 w-4 text-[var(--brand-primary)]" />
                </div>
                <ArticleTypeBadge type="pillar" />
                <StatusBadge status={pillar.status} />
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                {pillar.wordCount && <span>{pillar.wordCount.toLocaleString()} words</span>}
                {pillar.seoScore != null && <span className="text-emerald-500">SEO {pillar.seoScore}</span>}
              </div>
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">{pillar.title}</h3>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">/{pillar.slug}</p>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Support Articles by Week */}
      {Object.entries(byWeek).sort(([a], [b]) => Number(a) - Number(b)).map(([week, weekArticles]) => (
        <div key={week}>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[var(--text-tertiary)]" />
            Week {week}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {weekArticles.map(article => (
              <GlassCard key={article.id} hover>
                <GlassCardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ArticleTypeBadge type={article.articleType} />
                      <StatusBadge status={article.status} />
                    </div>
                  </div>
                  <h4 className="text-sm font-medium text-[var(--text-primary)] line-clamp-2">
                    {article.title}
                  </h4>
                  {article.relationshipToPillar && (
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">
                      {article.relationshipToPillar}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs text-[var(--text-tertiary)]">
                    {article.searchIntent && (
                      <span className="px-1.5 py-0.5 rounded bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                        {INTENT_LABELS[article.searchIntent] || article.searchIntent}
                      </span>
                    )}
                    {article.funnelStage && (
                      <span className="px-1.5 py-0.5 rounded bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                        {FUNNEL_LABELS[article.funnelStage] || article.funnelStage}
                      </span>
                    )}
                    {article.wordCount && (
                      <span>{article.wordCount.toLocaleString()} words</span>
                    )}
                  </div>
                </GlassCardContent>
              </GlassCard>
            ))}
          </div>
        </div>
      ))}

      {/* No articles fallback */}
      {!pillar && articles.length === 0 && (
        <GlassCard>
          <GlassCardContent className="flex flex-col items-center py-8">
            <p className="text-sm text-[var(--text-secondary)]">
              No articles in this cluster yet.
            </p>
          </GlassCardContent>
        </GlassCard>
      )}
    </div>
  )
}

// ============================================================================
// CLUSTER IMAGE QUEUE
// ============================================================================

function PublishClusterButton({ clusterId, articles, onPublished }) {
  const [publishing, setPublishing] = useState(false)

  const draftArticles = articles.filter(a => a.status === 'draft')

  if (draftArticles.length === 0) return null

  const handlePublish = async () => {
    setPublishing(true)
    try {
      // Publish all draft articles in the cluster
      await Promise.all(
        draftArticles.map(a =>
          blogApi.updatePost(a.id, { status: 'published', publishedAt: new Date().toISOString() })
        )
      )
      toast.success(`Published ${draftArticles.length} articles`)
      onPublished?.()
    } catch (err) {
      toast.error('Failed to publish some articles')
      console.error(err)
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Button
      size="sm"
      onClick={handlePublish}
      disabled={publishing}
      className="bg-emerald-600 hover:bg-emerald-700 text-white"
    >
      {publishing ? (
        <>
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Publishing...
        </>
      ) : (
        <>
          <CheckCircle className="h-3 w-3 mr-1" />
          Publish All ({draftArticles.length})
        </>
      )}
    </Button>
  )
}

function ClusterImageQueue({ pillar, articles, projectId, orgId, onImageGenerated }) {
  const [generatingId, setGeneratingId] = useState(null)
  const [collapsed, setCollapsed] = useState(true)

  // Combine pillar + supports, track which need images
  const allArticles = useMemo(() => {
    const list = []
    if (pillar) {
      list.push({
        id: pillar.id,
        title: pillar.title,
        slug: pillar.slug,
        type: 'pillar',
        hasImage: !!(pillar.featuredImage || pillar.featured_image),
        imageUrl: pillar.featuredImage || pillar.featured_image,
        suggestedImages: pillar.suggestedImages || pillar.suggested_images,
      })
    }
    for (const a of articles) {
      list.push({
        id: a.id,
        title: a.title,
        slug: a.slug,
        type: a.articleType || a.article_type || 'support',
        hasImage: !!(a.featuredImage || a.featured_image),
        imageUrl: a.featuredImage || a.featured_image,
        suggestedImages: a.suggestedImages || a.suggested_images,
      })
    }
    return list
  }, [pillar, articles])

  const needsImage = allArticles.filter(a => !a.hasImage)
  const hasImage = allArticles.filter(a => a.hasImage)

  if (allArticles.length === 0) return null

  const handleGenerateImage = async (article) => {
    setGeneratingId(article.id)
    // Use AI-planned image concept if available, otherwise fall back to title
    const concept = article.suggestedImages?.[0] || article.suggested_images?.[0]
    try {
      const result = await skillsApi.invoke('content', 'generate_blog_image', {
        params: {
          title: article.title,
          topic: concept?.description || article.title,
          style: concept?.style || 'photorealistic',
          aspectRatio: '16:9',
          ...(concept?.mood ? { customInstructions: `Mood: ${concept.mood}. ${concept.description}` } : {}),
        },
        context: {
          project_id: projectId,
          org_id: orgId,
        },
      })

      const imageResult = result?.result || result
      if (imageResult?.success && imageResult?.imageUrl) {
        // Update the post with the generated image
        await blogApi.updatePost(article.id, {
          featuredImage: imageResult.imageUrl,
          featuredImageAlt: imageResult.altText || article.title,
        })
        toast.success(`Image generated for "${article.title}"`)
        onImageGenerated?.()
      } else {
        throw new Error(imageResult?.error || 'Image generation failed')
      }
    } catch (err) {
      console.error('Image generation failed:', err)
      toast.error(`Failed to generate image for "${article.title}"`)
    } finally {
      setGeneratingId(null)
    }
  }

  const handleGenerateAll = async () => {
    for (const article of needsImage) {
      await handleGenerateImage(article)
    }
  }

  return (
    <GlassCard>
      <GlassCardContent className="p-4">
        <button
          className="flex items-center justify-between w-full text-left"
          onClick={() => setCollapsed(!collapsed)}
        >
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-[var(--brand-primary)]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              Featured Images
            </span>
            {needsImage.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                {needsImage.length} missing
              </span>
            )}
            {needsImage.length === 0 && (
              <span className="px-1.5 py-0.5 text-xs rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                All set
              </span>
            )}
          </div>
          <ChevronRight className={`h-4 w-4 text-[var(--text-tertiary)] transition-transform ${collapsed ? '' : 'rotate-90'}`} />
        </button>

        {!collapsed && (
          <div className="mt-4 space-y-3">
            {needsImage.length > 0 && (
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[var(--text-tertiary)]">
                  {needsImage.length} article{needsImage.length !== 1 ? 's' : ''} without featured images
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateAll}
                  disabled={!!generatingId}
                  className="text-xs h-7"
                >
                  <Wand2 className="h-3 w-3 mr-1" />
                  Generate All
                </Button>
              </div>
            )}

            {allArticles.map(article => (
              <div
                key={article.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]"
              >
                {/* Thumbnail or placeholder */}
                <div className="h-10 w-16 rounded bg-[var(--glass-bg-inset)] border border-[var(--glass-border)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {article.hasImage ? (
                    <img src={article.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-[var(--text-tertiary)]" />
                  )}
                </div>

                {/* Title + type */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--text-primary)] truncate">{article.title}</p>
                  <ArticleTypeBadge type={article.type} />
                </div>

                {/* Actions */}
                {article.hasImage ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                ) : generatingId === article.id ? (
                  <SonorSpinner size="sm" />
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleGenerateImage(article)}
                    disabled={!!generatingId}
                    className="h-7 text-xs text-[var(--brand-primary)]"
                  >
                    <Wand2 className="h-3 w-3 mr-1" />
                    Generate
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}

// Named export for use in EchoBlogCreator dialog
export { ClusterGenerationWizard }
