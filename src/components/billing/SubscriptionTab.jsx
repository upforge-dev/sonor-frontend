/**
 * SubscriptionTab — What Sonor charges YOU
 *
 * Shows: current plan, per-project breakdown, seats, payment method, billing history.
 * Agencies see per-project line items + base fee.
 * Independent businesses see a simpler single-plan view.
 * Grandfathered orgs see "Billing Exempt" badge.
 */
import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  AlertCircle, CheckCircle, CreditCard, ExternalLink, Loader2, RefreshCw, Shield, XCircle, Zap
} from 'lucide-react'
import useAuthStore from '@/lib/auth-store'
import {
  useSubscription, useManagePaymentMethod, useCancelSubscription, useReactivateSubscription
} from '@/lib/hooks/use-billing'
import PlanSelector from './PlanSelector'

const PLAN_LABELS = {
  standard: 'Standard',
  limited_ai: 'Limited AI',
  full_signal: 'Full Signal AI',
  agency: 'Agency',
  free: 'Free',
}

const STATUS_STYLES = {
  active: { label: 'Active', variant: 'default', icon: CheckCircle },
  trialing: { label: 'Trial', variant: 'secondary', icon: Zap },
  past_due: { label: 'Past Due', variant: 'destructive', icon: AlertCircle },
  canceled: { label: 'Canceled', variant: 'outline', icon: AlertCircle },
  paused: { label: 'Paused', variant: 'secondary', icon: AlertCircle },
}

function formatCents(cents) {
  if (!cents && cents !== 0) return '-'
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export default function SubscriptionTab() {
  const { currentOrg } = useAuthStore()
  const orgId = currentOrg?.id
  const isAgency = currentOrg?.org_type === 'agency'

  const { data: subscription, isLoading, error } = useSubscription(orgId)
  const managePayment = useManagePaymentMethod()
  const cancelSub = useCancelSubscription()
  const reactivateSub = useReactivateSubscription()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load subscription details.
      </div>
    )
  }

  if (!subscription) return null

  const status = STATUS_STYLES[subscription.billingStatus] || STATUS_STYLES.active
  const StatusIcon = status.icon

  return (
    <div className="space-y-6">
      {/* Plan Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Subscription</CardTitle>
            <CardDescription>
              {subscription.billingExempt
                ? 'Grandfathered account — no charges'
                : `Your ${PLAN_LABELS[subscription.billingPlan] || subscription.billingPlan} plan`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {subscription.billingExempt && (
              <Badge variant="outline" className="gap-1">
                <Shield className="h-3 w-3" />
                Billing Exempt
              </Badge>
            )}
            <Badge variant={status.variant} className="gap-1">
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Monthly Total</div>
              <div className="text-2xl font-bold">
                {subscription.billingExempt ? '$0' : formatCents(subscription.monthlyTotalCents)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Projects</div>
              <div className="text-2xl font-bold">
                {subscription.projects.filter(p => p.status === 'active').length}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  / {subscription.projects.length} total
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Seats</div>
              <div className="text-2xl font-bold">
                {subscription.seatsCurrent}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  / {subscription.seatsIncluded} included
                </span>
              </div>
            </div>
            {subscription.currentPeriodEnd && (
              <div>
                <div className="text-sm text-muted-foreground">Next Billing</div>
                <div className="text-lg font-semibold">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Per-Project Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {isAgency ? 'Per-Client Project Breakdown' : 'Project Breakdown'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {isAgency && <TableHead>Client</TableHead>}
                <TableHead>Project</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Monthly</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                // For agencies, group by client org
                if (isAgency && subscription.projects.some(p => p.clientOrgName)) {
                  const grouped = {}
                  subscription.projects.forEach((project) => {
                    const key = project.clientOrgId || 'own'
                    if (!grouped[key]) grouped[key] = { name: project.clientOrgName || currentOrg?.name, projects: [] }
                    grouped[key].projects.push(project)
                  })

                  return Object.entries(grouped).map(([orgKey, group]) => (
                    group.projects.map((project, idx) => (
                      <TableRow key={project.projectId}>
                        {isAgency && (
                          <TableCell className={idx > 0 ? 'border-t-0' : ''}>
                            {idx === 0 && (
                              <div className="font-medium text-sm">{group.name}</div>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="font-medium">{project.projectTitle}</div>
                          {project.projectDomain && (
                            <div className="text-xs text-muted-foreground">{project.projectDomain}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{PLAN_LABELS[project.plan] || project.plan}</Badge>
                          {project.billingExempt && (
                            <Badge variant="secondary" className="ml-1 text-[10px]">Exempt</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {project.billingExempt
                            ? <span className="text-muted-foreground">$0</span>
                            : project.status === 'active' ? `${formatCents(project.priceCents)}/mo` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                            {project.status === 'active' ? 'Active' : 'Draft'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )).flat()
                }

                // Non-agency or no grouping data — flat list
                return subscription.projects.map((project) => (
                  <TableRow key={project.projectId}>
                    {isAgency && <TableCell />}
                    <TableCell>
                      <div className="font-medium">{project.projectTitle}</div>
                      {project.projectDomain && (
                        <div className="text-xs text-muted-foreground">{project.projectDomain}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{PLAN_LABELS[project.plan] || project.plan}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {project.status === 'active' ? `${formatCents(project.priceCents)}/mo` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                        {project.status === 'active' ? 'Active' : 'Draft'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              })()}

              {/* Totals */}
              {!subscription.billingExempt && (
                <>
                  <TableRow className="border-t-2">
                    <TableCell colSpan={isAgency ? 3 : 2} className="font-medium">Project subtotal</TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCents(subscription.projects
                        .filter(p => p.status === 'active' && !p.billingExempt)
                        .reduce((sum, p) => sum + (p.priceCents || 0), 0))}/mo
                    </TableCell>
                    <TableCell />
                  </TableRow>

                  {subscription.agencyBaseFee > 0 && (
                    <TableRow>
                      <TableCell colSpan={isAgency ? 3 : 2} className="font-medium">Agency base fee</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCents(subscription.agencyBaseFee)}/mo
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  )}

                  {subscription.seatOverageCents > 0 && (
                    <TableRow>
                      <TableCell colSpan={isAgency ? 3 : 2} className="font-medium">
                        Seat overage ({subscription.seatsCurrent - subscription.seatsIncluded} extra)
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCents(subscription.seatOverageCents)}/mo
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  )}

                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={isAgency ? 3 : 2} className="font-bold text-base">Total</TableCell>
                    <TableCell className="text-right font-mono font-bold text-base">
                      {formatCents(subscription.monthlyTotalCents)}/mo
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </>
              )}

              {/* Grandfathered agency note */}
              {subscription.billingExempt && isAgency && subscription.projects.some(p => !p.billingExempt) && (
                <>
                  <TableRow className="border-t-2">
                    <TableCell colSpan={isAgency ? 3 : 2} className="font-medium text-muted-foreground">
                      Grandfathered projects
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">$0</TableCell>
                    <TableCell />
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={isAgency ? 3 : 2} className="font-medium">
                      New client projects
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCents(subscription.projects
                        .filter(p => p.status === 'active' && !p.billingExempt)
                        .reduce((sum, p) => sum + (p.priceCents || 0), 0))}/mo
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment Method */}
      {!subscription.billingExempt && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Payment Method</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                managePayment.mutate({}, {
                  onSuccess: (data) => {
                    if (data?.url) window.open(data.url, '_blank')
                  },
                })
              }}
              disabled={managePayment.isPending}
            >
              {managePayment.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-1" />
              )}
              Manage
            </Button>
          </CardHeader>
          <CardContent>
            {subscription.paymentMethod ? (
              <div className="flex items-center gap-3">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
                <div>
                  <div className="font-medium capitalize">
                    {subscription.paymentMethod.brand} ending in {subscription.paymentMethod.last4}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Expires {subscription.paymentMethod.expMonth}/{subscription.paymentMethod.expYear}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">
                No payment method on file.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cancel / Reactivate Subscription */}
      {!subscription.billingExempt && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Manage Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            {subscription.billingStatus === 'canceled' || subscription.billingStatus === 'paused' ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      Your subscription is {subscription.billingStatus}.
                    </p>
                    <p className="text-amber-700 dark:text-amber-300 mt-1">
                      {subscription.currentPeriodEnd
                        ? `Your access continues until ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}. After that, API keys will stop working and the dashboard becomes read-only. Your data is preserved for 90 days.`
                        : 'API keys are no longer active. Reactivate to restore access. Your data is preserved for 90 days.'}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    reactivateSub.mutate(undefined, {
                      onSuccess: (data) => {
                        if (data?.checkoutUrl) {
                          window.location.href = data.checkoutUrl
                        }
                      },
                    })
                  }}
                  disabled={reactivateSub.isPending}
                  className="gap-2"
                >
                  {reactivateSub.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Reactivate Subscription
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Cancel your subscription at any time. Your access continues until the end of your current billing period.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-destructive hover:text-destructive gap-2">
                      <XCircle className="h-4 w-4" />
                      Cancel Subscription
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <p>
                          Your subscription will remain active until the end of your current billing period
                          {subscription.currentPeriodEnd && (
                            <> ({new Date(subscription.currentPeriodEnd).toLocaleDateString()})</>
                          )}.
                        </p>
                        <p>After that:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>API keys will stop working (return 402)</li>
                          <li>Dashboard becomes read-only</li>
                          <li>Your data is preserved for 90 days</li>
                          <li>You can reactivate anytime within that window</li>
                        </ul>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => cancelSub.mutate()}
                        disabled={cancelSub.isPending}
                      >
                        {cancelSub.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : null}
                        Yes, Cancel Subscription
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
