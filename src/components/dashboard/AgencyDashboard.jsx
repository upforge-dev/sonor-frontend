/**
 * AgencyDashboard - First-view dashboard for agency users (Sonor org)
 *
 * Plan-aligned: hero, "Needs your attention" / "All caught up", KPI row, revenue AreaChart,
 * project status + proposals + audits + activity + invoices Tremor charts, quick actions,
 * section cards (Audits, Projects, CRM, Commerce, Messages), period selector, data freshness.
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  FileText,
  MessageSquare,
  DollarSign,
  Users,
  Building2,
  Shield,
  UserPlus,
  Send,
  LineChart,
  ChevronRight,
  CheckCircle2,
  FolderOpen,
  RefreshCw,
  Search,
  Zap,
  Settings,
  PlusCircle,
  Receipt,
} from 'lucide-react'
import { AreaChart, BarChart, DonutChart } from '@tremor/react'
import useAuthStore from '@/lib/auth-store'
import { adminApi } from '@/lib/portal-api'
import {
  useUnreadMessagesCount,
  useOverdueInvoices,
  useNewLeadsCount,
  useProposals,
  useAllAudits,
  useOverviewReport,
  useActivityReport,
} from '@/lib/hooks'
import { toast } from '@/lib/toast'
import UptradeLoading from '@/components/UptradeLoading'
import { StatsSkeleton, ChartSkeleton } from '@/components/DashboardSkeleton'
import { InvoicesEmptyState } from '@/components/DashboardEmptyState'
import ActivityTimeline from '@/components/ActivityTimeline'
import UpcomingDeadlines from '@/components/UpcomingDeadlines'
import TrendIndicators from '@/components/TrendIndicators'
import { formatDistanceToNow, format } from 'date-fns'

const TREMOR_COLORS = ['blue', 'emerald', 'amber', 'rose', 'violet', 'cyan']

function AttentionItem({ count, label, icon: Icon, onClick, variant = 'default' }) {
  if (!count || count <= 0) return null
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-1.5 text-sm transition-colors hover:bg-[var(--surface-secondary)]"
    >
      <Icon className="h-4 w-4 text-[var(--accent-warning)]" />
      <span className="font-medium text-[var(--text-primary)]">{count}</span>
      <span className="text-[var(--text-secondary)]">{label}</span>
    </button>
  )
}

const PERIOD_OPTIONS = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
]

export default function AgencyDashboard({ onNavigate }) {
  const { user, currentOrg } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const [period, setPeriod] = useState(30)

  const { data: unreadMessages = 0 } = useUnreadMessagesCount()
  const { data: invoicesData } = useOverdueInvoices(currentOrg?.id)
  const invoices = Array.isArray(invoicesData) ? invoicesData : (invoicesData?.invoices ?? [])
  const { data: newLeadsData } = useNewLeadsCount({ enabled: isAdmin })
  const newLeadsCount = newLeadsData?.count ?? 0
  const { data: proposalsData, isLoading: proposalsLoading } = useProposals()
  const proposals = proposalsData?.proposals ?? []
  const { data: audits = [], isLoading: auditsLoading } = useAllAudits()

  const { data: overviewData, isLoading: overviewLoading, dataUpdatedAt: overviewUpdatedAt } = useOverviewReport(period)
  const { data: activityData, isLoading: activityLoading } = useActivityReport(period)

  const unpaidInvoicesCount = invoices.filter(
    (inv) => inv.status === 'pending' || inv.status === 'overdue'
  ).length
  const pendingProposalsCount = proposals.filter(
    (p) => p.status === 'sent' || p.status === 'viewed'
  ).length
  const unreadAuditsCount = audits.filter(
    (a) => a.status === 'completed' && !a.viewedAt
  ).length

  const revenueTrend = overviewData?.charts?.revenue_trend ?? []
  const projectStatusDistribution = overviewData?.charts?.project_status_distribution ?? []
  const activityByDay = useMemo(() => {
    const raw = activityData?.activities ?? activityData ?? []
    if (!Array.isArray(raw) || raw.length === 0) return []
    const byDay = {}
    raw.forEach((a) => {
      const d = a.date ?? a.created_at ?? a.timestamp
      const key = d ? format(new Date(d), 'yyyy-MM-dd') : 'Unknown'
      byDay[key] = (byDay[key] || 0) + 1
    })
    return Object.entries(byDay)
      .map(([date, count]) => ({ date, count, day: format(new Date(date), 'MMM d') }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14)
  }, [activityData])

  const invoiceDonutData = useMemo(() => {
    const pending = invoices.filter((i) => i.status === 'pending').length
    const overdue = invoices.filter((i) => i.status === 'overdue').length
    const out = []
    if (pending) out.push({ name: 'Pending', value: pending })
    if (overdue) out.push({ name: 'Overdue', value: overdue })
    return out
  }, [invoices])

  const dataUpdatedAt = overviewUpdatedAt ?? Date.now()
  const updatedLabel = dataUpdatedAt
    ? formatDistanceToNow(dataUpdatedAt, { addSuffix: true })
    : ''

  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ['admin', 'clients'],
    queryFn: async () => {
      const res = await adminApi.listClients()
      return res.data
    },
    enabled: isAdmin,
  })
  const { data: orgsData, isLoading: orgsLoading } = useQuery({
    queryKey: ['admin', 'organizations'],
    queryFn: async () => {
      const res = await adminApi.listOrganizations()
      return res.data
    },
    enabled: isAdmin,
  })
  const totalClients = Array.isArray(clientsData?.clients) ? clientsData.clients.length : 0
  const tenantCount = Array.isArray(orgsData) ? orgsData.length : (orgsData?.organizations?.length ?? 0)

  const [isAddClientOpen, setIsAddClientOpen] = useState(false)
  const [isAddingClient, setIsAddingClient] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', email: '', company: '' })

  const handleAddClient = async () => {
    if (!newClient.name?.trim() || !newClient.email?.trim()) {
      toast.error('Please fill in name and email')
      return
    }
    setIsAddingClient(true)
    try {
      await adminApi.createClient({
        name: newClient.name.trim(),
        email: newClient.email.trim(),
        company: newClient.company?.trim() || null,
      })
      toast.success(`Client ${newClient.name} added. They will receive an account setup email.`)
      setNewClient({ name: '', email: '', company: '' })
      setIsAddClientOpen(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add client')
    } finally {
      setIsAddingClient(false)
    }
  }

  const attentionCount =
    unpaidInvoicesCount + pendingProposalsCount + unreadAuditsCount + newLeadsCount + (unreadMessages || 0)
  const isLoadingInitial = proposalsLoading && proposals.length === 0

  if (!user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <UptradeLoading />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-8 space-y-6">
      {/* Hero: welcome, period selector, data freshness */}
      <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-6 shadow-[var(--shadow-md)] backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {user?.name ? `Welcome back, ${user.name.split(' ')[0]}` : 'Welcome back'}!
            </h1>
            <p className="mt-1 text-[var(--text-secondary)]">
              {currentOrg?.name ? `${currentOrg.name} · ` : ''}
              Here’s what needs your attention across clients and projects.
            </p>
            {updatedLabel && (
              <p className="mt-2 text-xs text-[var(--text-tertiary)]">Updated {updatedLabel}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Select value={String(period)} onValueChange={(v) => setPeriod(Number(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdmin && (
              <Badge
                variant="secondary"
                className="border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]"
              >
                <Shield className="mr-1 h-3 w-3" />
                Admin
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Needs your attention / All caught up */}
      {attentionCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-secondary)]/50 px-4 py-3">
          <span className="mr-1 text-sm font-medium text-[var(--text-secondary)]">Needs your attention:</span>
          <AttentionItem
            count={unpaidInvoicesCount}
            label="overdue/pending invoices"
            icon={DollarSign}
            onClick={() => onNavigate?.('billing')}
          />
          <AttentionItem
            count={pendingProposalsCount}
            label="pending proposals"
            icon={Send}
            onClick={() => onNavigate?.('proposals')}
          />
          <AttentionItem
            count={unreadAuditsCount}
            label="unread audits"
            icon={LineChart}
            onClick={() => onNavigate?.('audits')}
          />
          <AttentionItem
            count={newLeadsCount}
            label="new leads"
            icon={Users}
            onClick={() => onNavigate?.('crm')}
          />
          <AttentionItem
            count={unreadMessages}
            label="unread messages"
            icon={MessageSquare}
            onClick={() => onNavigate?.('messages')}
          />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-secondary)]/30 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-[var(--accent-success)]" />
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            All caught up.
            {tenantCount > 0 && ` ${tenantCount} organization${tenantCount === 1 ? '' : 's'} active.`}
          </span>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoadingInitial ? (
          <StatsSkeleton />
        ) : (
          <>
            {isAdmin && (
              <>
                <Card
                  className="cursor-pointer transition-shadow hover:shadow-lg"
                  onClick={() => onNavigate?.('settings')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Clients</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{clientsLoading ? '—' : totalClients}</div>
                    <p className="text-xs text-muted-foreground">Registered clients</p>
                  </CardContent>
                </Card>
                <Card
                  className="cursor-pointer transition-shadow hover:shadow-lg"
                  onClick={() => onNavigate?.('proposals')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending proposals</CardTitle>
                    <Send className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{pendingProposalsCount}</div>
                    <p className="text-xs text-muted-foreground">Awaiting response</p>
                  </CardContent>
                </Card>
                <Card
                  className="cursor-pointer transition-shadow hover:shadow-lg"
                  onClick={() => onNavigate?.('projects')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Organizations</CardTitle>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{orgsLoading ? '—' : tenantCount}</div>
                    <p className="text-xs text-muted-foreground">Client orgs</p>
                  </CardContent>
                </Card>
                <Card
                  className="cursor-pointer transition-shadow hover:shadow-lg"
                  onClick={() => onNavigate?.('audits')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Unread audits</CardTitle>
                    <LineChart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{unreadAuditsCount}</div>
                    <p className="text-xs text-muted-foreground">To review</p>
                  </CardContent>
                </Card>
              </>
            )}
            <Card
              className="cursor-pointer transition-shadow hover:shadow-lg"
              onClick={() => onNavigate?.('messages')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unread messages</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{unreadMessages ?? 0}</div>
                <p className="text-xs text-muted-foreground">Inbox</p>
              </CardContent>
            </Card>
            <Card
              className="cursor-pointer transition-shadow hover:shadow-lg"
              onClick={() => onNavigate?.('billing')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending invoices</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{unpaidInvoicesCount}</div>
                <p className="text-xs text-muted-foreground">Due / overdue</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Primary chart row: Revenue trend (headline) + Project status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue trend</CardTitle>
            <CardDescription>Monthly revenue over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <ChartSkeleton />
            ) : !revenueTrend?.length ? (
              <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-[var(--glass-border)]">
                <p className="text-sm text-[var(--text-tertiary)]">No revenue data yet</p>
              </div>
            ) : (
              <AreaChart
                data={revenueTrend}
                index="month_name"
                categories={['revenue']}
                colors={['blue']}
                valueFormatter={(v) => (v != null ? `$${Number(v).toLocaleString()}` : '—')}
                className="h-64"
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Project status</CardTitle>
            <CardDescription>Projects by status</CardDescription>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <ChartSkeleton />
            ) : !projectStatusDistribution?.length ? (
              <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-[var(--glass-border)]">
                <p className="text-sm text-[var(--text-tertiary)]">No project data yet</p>
              </div>
            ) : (
              <DonutChart
                data={projectStatusDistribution.map((s) => ({ name: s.name, value: s.count }))}
                category="value"
                index="name"
                colors={TREMOR_COLORS}
                valueFormatter={(v) => v?.toString() ?? '0'}
                className="h-64"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add new client
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add new client</DialogTitle>
                    <DialogDescription>
                      Create a new client account. They will receive an email to set up their account.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="agency-name">Full name *</Label>
                      <Input
                        id="agency-name"
                        placeholder="Jane Doe"
                        value={newClient.name}
                        onChange={(e) => setNewClient((c) => ({ ...c, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="agency-email">Email *</Label>
                      <Input
                        id="agency-email"
                        type="email"
                        placeholder="jane@example.com"
                        value={newClient.email}
                        onChange={(e) => setNewClient((c) => ({ ...c, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="agency-company">Company (optional)</Label>
                      <Input
                        id="agency-company"
                        placeholder="Acme Inc."
                        value={newClient.company}
                        onChange={(e) => setNewClient((c) => ({ ...c, company: e.target.value }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddClientOpen(false)
                        setNewClient({ name: '', email: '', company: '' })
                      }}
                      disabled={isAddingClient}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAddClient} disabled={isAddingClient}>
                      {isAddingClient ? 'Adding...' : 'Add client'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={() => onNavigate?.('proposal-editor')}>
                <PlusCircle className="mr-2 h-4 w-4" />
                New proposal
              </Button>
              <Button variant="outline" onClick={() => onNavigate?.('audits')}>
                <LineChart className="mr-2 h-4 w-4" />
                Request audit
              </Button>
              <Button variant="outline" onClick={() => onNavigate?.('projects')}>
                <FolderOpen className="mr-2 h-4 w-4" />
                View projects
              </Button>
              <Button variant="outline" onClick={() => onNavigate?.('billing')}>
                <Receipt className="mr-2 h-4 w-4" />
                Create invoice
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Graph row 2: Proposals, Audits, Activity, Invoices */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Proposals by status</CardTitle>
            <CardDescription>Distribution of proposal states</CardDescription>
          </CardHeader>
          <CardContent>
            {proposals.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-[var(--glass-border)]">
                <p className="text-sm text-[var(--text-tertiary)]">No proposals yet</p>
                <Button variant="link" className="ml-2" onClick={() => onNavigate?.('proposals')}>
                  Create proposal
                </Button>
              </div>
            ) : (
              <DonutChart
                data={Object.entries(
                  proposals.reduce((acc, p) => {
                    const s = p.status || 'draft'
                    acc[s] = (acc[s] || 0) + 1
                    return acc
                  }, {})
                ).map(([name, value]) => ({ name, value }))}
                category="value"
                index="name"
                colors={TREMOR_COLORS}
                valueFormatter={(v) => v?.toString() ?? '0'}
                className="h-64"
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Audits by status</CardTitle>
            <CardDescription>Completed, running, and pending</CardDescription>
          </CardHeader>
          <CardContent>
            {audits.length === 0 && !auditsLoading ? (
              <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-[var(--glass-border)]">
                <p className="text-sm text-[var(--text-tertiary)]">No audits yet</p>
                <Button variant="link" className="ml-2" onClick={() => onNavigate?.('audits')}>
                  Run audit
                </Button>
              </div>
            ) : (
              <DonutChart
                data={Object.entries(
                  (audits || []).reduce((acc, a) => {
                    const s = a.status || 'pending'
                    acc[s] = (acc[s] || 0) + 1
                    return acc
                  }, {})
                ).map(([name, value]) => ({ name, value }))}
                category="value"
                index="name"
                colors={TREMOR_COLORS}
                valueFormatter={(v) => v?.toString() ?? '0'}
                className="h-64"
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Activity over time</CardTitle>
            <CardDescription>Activity by day</CardDescription>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <ChartSkeleton />
            ) : !activityByDay?.length ? (
              <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-[var(--glass-border)]">
                <p className="text-sm text-[var(--text-tertiary)]">No activity data yet</p>
              </div>
            ) : (
              <BarChart
                data={activityByDay}
                index="day"
                categories={['count']}
                colors={['blue']}
                valueFormatter={(v) => v?.toString() ?? '0'}
                className="h-64"
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>Pending vs overdue</CardDescription>
          </CardHeader>
          <CardContent>
            {invoiceDonutData.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-[var(--glass-border)]">
                <p className="text-sm text-[var(--text-tertiary)]">No pending invoices</p>
                <Button variant="link" className="ml-2" onClick={() => onNavigate?.('billing')}>
                  View billing
                </Button>
              </div>
            ) : (
              <DonutChart
                data={invoiceDonutData}
                category="value"
                index="name"
                colors={['amber', 'rose']}
                valueFormatter={(v) => v?.toString() ?? '0'}
                className="h-64"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lists + activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent proposals</CardTitle>
              <CardDescription>Latest proposal activity</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate?.('proposals')}>
              View all <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {proposals.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--glass-border)] py-8 text-center">
                <FileText className="mb-2 h-10 w-10 text-[var(--text-tertiary)]" />
                <p className="text-sm font-medium text-[var(--text-secondary)]">No proposals yet</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => onNavigate?.('proposals')}>
                  View proposals
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {proposals.slice(0, 5).map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--glass-border)] p-3 transition-colors hover:bg-[var(--surface-secondary)]"
                  >
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{p.title || 'Untitled'}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {p.updatedAt ? formatDistanceToNow(new Date(p.updatedAt), { addSuffix: true }) : ''}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {p.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending invoices</CardTitle>
            <CardDescription>Invoices due for payment</CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.filter((i) => i.status === 'pending' || i.status === 'overdue').length === 0 ? (
              <InvoicesEmptyState onAction={() => onNavigate?.('billing')} />
            ) : (
              <ul className="space-y-2">
                {invoices
                  .filter((i) => i.status === 'pending' || i.status === 'overdue')
                  .slice(0, 5)
                  .map((inv) => (
                    <li
                      key={inv.id}
                      className="flex items-center justify-between rounded-lg border border-[var(--glass-border)] p-3"
                    >
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{inv.invoice_number || inv.number || inv.id}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          Due {inv.due_date ? formatDistanceToNow(new Date(inv.due_date), { addSuffix: true }) : '—'}
                        </p>
                      </div>
                      <span className="font-semibold text-[var(--text-primary)]">
                        {typeof inv.amount === 'number'
                          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(inv.amount)
                          : inv.amount ?? '—'}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section cards: Audits, Projects, CRM, Messages (Commerce = proposals + invoices above) */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Audits</CardTitle>
              <CardDescription>Recent audits</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate?.('audits')}>
              View all <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {audits.length === 0 && !auditsLoading ? (
              <p className="text-sm text-[var(--text-tertiary)]">No audits yet</p>
            ) : (
              <ul className="space-y-2">
                {(audits || []).slice(0, 3).map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--glass-border)] p-2 text-sm"
                  >
                    <span className="truncate text-[var(--text-primary)]">{a.project_name ?? a.id}</span>
                    <Badge variant="outline" className="ml-2 shrink-0 capitalize">
                      {a.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Organizations</CardTitle>
              <CardDescription>Client orgs</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate?.('projects')}>
              View all <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {!orgsData?.organizations?.length && !Array.isArray(orgsData) ? (
              <p className="text-sm text-[var(--text-tertiary)]">No organizations yet</p>
            ) : (
              <ul className="space-y-2">
                {(Array.isArray(orgsData) ? orgsData : orgsData?.organizations ?? []).slice(0, 3).map((o) => (
                  <li
                    key={o.id}
                    className="truncate rounded-lg border border-[var(--glass-border)] p-2 text-sm text-[var(--text-primary)]"
                  >
                    {o.name ?? o.slug ?? o.id}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>CRM</CardTitle>
              <CardDescription>New leads</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate?.('crm')}>
              View all <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{newLeadsCount}</p>
            <p className="text-xs text-[var(--text-tertiary)]">New leads need follow-up</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Messages</CardTitle>
              <CardDescription>Inbox</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate?.('messages')}>
              View all <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{unreadMessages ?? 0}</p>
            <p className="text-xs text-[var(--text-tertiary)]">Unread messages</p>
          </CardContent>
        </Card>
      </div>

      {/* Optional: other modules strip (KPI + link) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modules</CardTitle>
          <CardDescription>Jump to a module</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => onNavigate?.('files')}>
              <FolderOpen className="mr-1.5 h-4 w-4" />
              Files
            </Button>
            <Button variant="outline" size="sm" onClick={() => onNavigate?.('sync')}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Sync
            </Button>
            <Button variant="outline" size="sm" onClick={() => onNavigate?.('seo')}>
              <Search className="mr-1.5 h-4 w-4" />
              SEO
            </Button>
            <Button variant="outline" size="sm" onClick={() => onNavigate?.('engage')}>
              <Zap className="mr-1.5 h-4 w-4" />
              Engage
            </Button>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => onNavigate?.('settings')}>
                <Settings className="mr-1.5 h-4 w-4" />
                Our team
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TrendIndicators period="month" />
        <UpcomingDeadlines limit={8} />
      </div>
      <ActivityTimeline limit={15} />
    </div>
  )
}
