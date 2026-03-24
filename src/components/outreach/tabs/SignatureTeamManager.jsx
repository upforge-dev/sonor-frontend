import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Users, RefreshCw, Send, Eye, PenLine, ChevronDown, CheckCircle2,
  AlertTriangle, MinusCircle, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { OutreachLoading } from '@/components/outreach/ui'
import { outreachApi, adminApi, emailApi } from '@/lib/sonor-api'
import useAuthStore from '@/lib/auth-store'

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

function getSignatureStatus(member, signatures) {
  const match = signatures.find(
    (sig) => sig.config?.email && member.email && sig.config.email.toLowerCase() === member.email.toLowerCase()
  )
  if (!match) return { status: 'none', signature: null }

  const cfg = match.config || {}
  const nameMatch = !cfg.name || !member.name || cfg.name === member.name
  const titleMatch = !cfg.title || !member.title || cfg.title === member.title
  const phoneMatch = !cfg.phone || !member.phone || cfg.phone === member.phone

  if (nameMatch && titleMatch && phoneMatch) {
    return { status: 'current', signature: match }
  }
  return { status: 'outdated', signature: match }
}

const statusConfig = {
  current: { label: 'Current', variant: 'default', className: 'bg-green-100 text-green-800 hover:bg-green-100', icon: CheckCircle2 },
  outdated: { label: 'Outdated', variant: 'secondary', className: 'bg-amber-100 text-amber-800 hover:bg-amber-100', icon: AlertTriangle },
  none: { label: 'None', variant: 'outline', className: 'bg-gray-100 text-gray-600 hover:bg-gray-100', icon: MinusCircle },
}

export default function SignatureTeamManager({ signatures = [], onCreateForMember }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [pushingAll, setPushingAll] = useState(false)

  const currentOrg = useAuthStore((s) => s.currentOrg)

  const fetchTeamMembers = useCallback(async () => {
    if (!currentOrg?.id) return
    try {
      const { data } = await adminApi.listOrgMembers(currentOrg.id)
      const list = Array.isArray(data) ? data
        : Array.isArray(data?.data) ? data.data
        : Array.isArray(data?.members) ? data.members
        : []
      setMembers(list)
    } catch (err) {
      toast.error('Failed to load team members')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [currentOrg?.id])

  useEffect(() => { fetchTeamMembers() }, [fetchTeamMembers])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchTeamMembers()
  }

  // Build enriched member list with signature status
  const enrichedMembers = useMemo(() => {
    return members.map((m) => ({
      ...m,
      ...getSignatureStatus(m, signatures),
    }))
  }, [members, signatures])

  // Consistency score
  const totalMembers = enrichedMembers.length
  const currentCount = enrichedMembers.filter((m) => m.status === 'current').length
  const consistencyPct = totalMembers > 0 ? Math.round((currentCount / totalMembers) * 100) : 0

  const scoreColor = consistencyPct > 80 ? 'text-green-700' : consistencyPct >= 50 ? 'text-amber-700' : 'text-red-700'
  const barColor = consistencyPct > 80 ? '[&>div]:bg-green-500' : consistencyPct >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'
  const bgColor = consistencyPct > 80 ? 'bg-green-50 border-green-200' : consistencyPct >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'

  // Template signatures (ones that could serve as templates for new members)
  const templateSignatures = signatures.filter((s) => s.name)

  const handlePushAllToGmail = async () => {
    const signaturesWithEmail = enrichedMembers.filter((m) => m.status === 'current' && m.signature)
    if (signaturesWithEmail.length === 0) {
      toast.error('No current signatures to push')
      return
    }

    setPushingAll(true)
    let success = 0
    let failed = 0

    for (const member of signaturesWithEmail) {
      try {
        const { renderSignature } = await import('../signature-templates')
        const html = member.signature.config?.mode === 'animated' && member.signature.animated_gif_url
          ? `<img src="${member.signature.animated_gif_url}" alt="${member.signature.config?.name || 'Email signature'}" style="display:block;max-width:600px;" />`
          : renderSignature(member.signature.config)
        await emailApi.setGmailSignature(html)
        success++
      } catch {
        failed++
      }
    }

    setPushingAll(false)
    if (failed === 0) {
      toast.success(`Pushed ${success} signature${success !== 1 ? 's' : ''} to Gmail`)
    } else {
      toast.warning(`Pushed ${success}, failed ${failed}`)
    }
  }

  const handleCreateFromTemplate = (member, templateSig) => {
    onCreateForMember?.({
      ...member,
      templateSignatureId: templateSig.id,
      templateConfig: templateSig.config,
    })
  }

  if (loading) {
    return <OutreachLoading />
  }

  if (totalMembers === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No team members found</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Add team members to your organization's contacts to manage their email signatures in bulk.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Consistency Score Banner */}
      <Card className={`border ${bgColor}`}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className={`text-sm font-semibold ${scoreColor}`}>
                {currentCount} of {totalMembers} team member{totalMembers !== 1 ? 's' : ''} using current signature
              </span>
            </div>
            <Badge variant="outline" className={scoreColor}>
              {consistencyPct}%
            </Badge>
          </div>
          <Progress value={consistencyPct} className={`h-2 ${barColor}`} />
        </CardContent>
      </Card>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {enrichedMembers.map((member) => {
          const cfg = statusConfig[member.status]
          const StatusIcon = cfg.icon

          return (
            <Card key={member.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={member.avatar_url || member.photo_url} alt={member.name} />
                    <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold truncate">{member.name || 'Unnamed'}</p>
                      <Badge className={`text-[10px] h-5 shrink-0 ${cfg.className}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {cfg.label}
                      </Badge>
                    </div>
                    {member.title && (
                      <p className="text-xs text-muted-foreground truncate">{member.title}</p>
                    )}
                    {member.email && (
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    )}
                    {member.signature && (
                      <p className="text-xs text-muted-foreground/70 mt-1 truncate">
                        Signature: {member.signature.name || 'Untitled'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  {member.status === 'none' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => onCreateForMember?.(member)}
                      >
                        <PenLine className="h-3 w-3" />
                        Create Signature
                      </Button>
                      {templateSignatures.length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                              From Template
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {templateSignatures.map((tpl) => (
                              <DropdownMenuItem
                                key={tpl.id}
                                onClick={() => handleCreateFromTemplate(member, tpl)}
                              >
                                {tpl.name || 'Untitled'}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </>
                  )}

                  {member.status === 'outdated' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                      onClick={() => onCreateForMember?.({ ...member, signatureId: member.signature?.id })}
                    >
                      <PenLine className="h-3 w-3" />
                      Update
                    </Button>
                  )}

                  {member.status === 'current' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1"
                      onClick={() => onCreateForMember?.({ ...member, signatureId: member.signature?.id, viewOnly: true })}
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Bulk Actions Bar */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {enrichedMembers.filter((m) => m.status !== 'none').length} of {totalMembers} members have signatures
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh Status
              </Button>
              <Button
                size="sm"
                className="gap-1"
                onClick={handlePushAllToGmail}
                disabled={pushingAll || currentCount === 0}
              >
                {pushingAll ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Push All to Gmail
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
