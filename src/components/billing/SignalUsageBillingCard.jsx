/**
 * SignalUsageBillingCard
 * 
 * Displays current month's Signal AI usage and projected bill.
 * Shows real-time billing info including:
 * - Current usage (tokens + Copilot requests)
 * - Projected bill
 * - Days remaining in billing period
 * - Progress bar for the month
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  Zap, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Cpu,
  HelpCircle,
  Loader2,
  AlertCircle
} from 'lucide-react'
import SignalIcon from '@/components/ui/SignalIcon'
import { supabase } from '@/lib/supabase-auth'
import useAuthStore from '@/lib/auth-store'

export default function SignalUsageBillingCard() {
  const { currentOrg } = useAuthStore()
  const [billing, setBilling] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!currentOrg?.id) return
    fetchBillingData()
  }, [currentOrg?.id])

  const fetchBillingData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Call the database function
      const { data, error: fetchError } = await supabase
        .rpc('get_org_current_bill', { p_org_id: currentOrg.id })

      if (fetchError) {
        // If function doesn't exist yet (migration not run), show fallback
        if (fetchError.code === '42883') {
          setBilling(null)
          return
        }
        throw fetchError
      }

      // Function returns an array, get first row
      if (data && data.length > 0) {
        setBilling(data[0])
      } else {
        // No usage data yet
        setBilling({
          current_bill: 0,
          projected_month_end: 0,
          token_usage: { total_tokens: 0, total_calls: 0, cost: 0, billed: 0 },
          copilot_usage: { requests: 0, cost: 0, billed: 0 },
          period_info: {
            billing_period: new Date().toISOString().slice(0, 7),
            period_start: new Date().toISOString().slice(0, 10),
            period_end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
            days_elapsed: new Date().getDate(),
            days_in_month: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate(),
            active_projects: 0
          }
        })
      }
    } catch (err) {
      console.error('Failed to fetch Signal billing:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0)
  }

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num?.toString() || '0'
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardContent className="flex items-center gap-3 py-6">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-sm text-red-600">Failed to load Signal billing data</p>
        </CardContent>
      </Card>
    )
  }

  if (!billing) {
    return null // No billing data available yet
  }

  const periodInfo = billing.period_info || {}
  const tokenUsage = billing.token_usage || {}
  const copilotUsage = billing.copilot_usage || {}
  
  const daysElapsed = periodInfo.days_elapsed || 1
  const daysInMonth = periodInfo.days_in_month || 30
  const daysRemaining = daysInMonth - daysElapsed
  const progressPercent = (daysElapsed / daysInMonth) * 100

  // Due date is 14 days after month end
  const monthEnd = new Date(periodInfo.period_end || new Date())
  const dueDate = new Date(monthEnd)
  dueDate.setDate(dueDate.getDate() + 14)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="p-2 rounded-xl"
              style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
            >
              <SignalIcon className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
            </div>
            <div>
              <CardTitle className="text-lg">Signal Usage</CardTitle>
              <CardDescription>Current billing period</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {periodInfo.billing_period || 'Current Month'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Bill */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-[var(--brand-primary)]/10 to-[var(--brand-primary)]/10">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Current Bill</p>
            <p className="text-3xl font-bold text-[var(--text-primary)]">
              {formatCurrency(billing.current_bill)}
            </p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="text-right">
                  <p className="text-xs text-[var(--text-tertiary)]">Projected</p>
                  <p className="text-lg font-semibold text-[var(--text-secondary)]">
                    {formatCurrency(billing.projected_month_end)}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Estimated bill at end of month based on current usage</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Period Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Billing period</span>
            <span className="text-[var(--text-tertiary)]">
              {daysRemaining} days remaining
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
            <span>{periodInfo.period_start}</span>
            <span>{periodInfo.period_end}</span>
          </div>
        </div>

        {/* Usage Breakdown */}
        <div className="grid grid-cols-2 gap-3">
          {/* Token Usage */}
          <div className="p-3 rounded-lg bg-[var(--bg-secondary)] space-y-1">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
              <span className="text-xs font-medium text-[var(--text-secondary)]">AI Tokens</span>
            </div>
            <p className="text-lg font-semibold text-[var(--text-primary)]">
              {formatNumber(tokenUsage.total_tokens)}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              {tokenUsage.total_calls || 0} calls
            </p>
          </div>

          {/* Copilot Requests */}
          <div className="p-3 rounded-lg bg-[var(--bg-secondary)] space-y-1">
            <div className="flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
              <span className="text-xs font-medium text-[var(--text-secondary)]">Copilot</span>
            </div>
            <p className="text-lg font-semibold text-[var(--text-primary)]">
              {copilotUsage.requests || 0}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              premium requests
            </p>
          </div>
        </div>

        {/* Due Date */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-light)]">
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <Calendar className="h-4 w-4" />
            <span>Due Date</span>
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {dueDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </p>
        </div>

        {/* Help Text */}
        <p className="text-xs text-[var(--text-tertiary)] flex items-start gap-1.5">
          <HelpCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>
            Signal usage is billed monthly. Invoices are generated on the 1st and due 14 days later.
          </span>
        </p>
      </CardContent>
    </Card>
  )
}
