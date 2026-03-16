/**
 * ProjectDetailPanel - Slide-over panel showing full project details
 */
import { useState } from 'react'
import { 
  X, Edit, Calendar, DollarSign, Users, Building2, Clock,
  Target, FileText, MessageSquare, ExternalLink, Settings2,
  Sparkles, Check, Plug, Landmark
} from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { Separator } from '../ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import { Switch } from '../ui/switch'
import { Label } from '../ui/label'
import { PROJECT_STATUS_CONFIG } from '@/lib/hooks'
import { projectsApi } from '../../lib/portal-api'
import { toast } from 'sonner'
import TenantModulesDialog from './TenantModulesDialog'
import ProjectIntegrationsDialog from './ProjectIntegrationsDialog'

const formatCurrency = (amount) => {
  if (!amount) return '$0'
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatDate = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric',
  })
}

const ProjectDetailPanel = ({ open, onOpenChange, project, onEdit }) => {
  const [modulesDialogOpen, setModulesDialogOpen] = useState(false)
  const [integrationsDialogOpen, setIntegrationsDialogOpen] = useState(false)
  const [isUptradeClient, setIsUptradeClient] = useState(project?.is_uptrade_client !== false)
  const [savingUptradeClient, setSavingUptradeClient] = useState(false)
  
  if (!project) return null
  
  const statusConfig = PROJECT_STATUS_CONFIG[project.status] || PROJECT_STATUS_CONFIG.planning
  const enabledModules = project.tenant_features || []

  // Handle Sonor client toggle
  const handleUptradeClientToggle = async (checked) => {
    setSavingUptradeClient(true)
    try {
      await projectsApi.updateProject(project.id, { isUptradeClient: checked })
      setIsUptradeClient(checked)
      toast.success(checked 
        ? 'Sonor services enabled' 
        : 'Sonor services hidden (Sonor mode)'
      )
    } catch (error) {
      console.error('Failed to update is_uptrade_client:', error)
      toast.error('Failed to update setting')
    } finally {
      setSavingUptradeClient(false)
    }
  }
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {project.is_tenant && (
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                    <Building2 className="w-3 h-3 mr-1" />
                    Web App
                  </Badge>
                )}
                <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
              </div>
              <SheetTitle className="text-xl">{project.title}</SheetTitle>
            </div>
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Progress</span>
              <span className="font-medium">{statusConfig.progress}%</span>
            </div>
            <Progress value={statusConfig.progress} className="h-2" />
          </div>

          <Separator />

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Users className="w-4 h-4" />
                Client
              </div>
              <p className="font-medium">
                {project.client_name || project.contacts?.name || 'No client'}
              </p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <DollarSign className="w-4 h-4" />
                Budget
              </div>
              <p className="font-medium">{formatCurrency(project.budget)}</p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Calendar className="w-4 h-4" />
                Start Date
              </div>
              <p className="font-medium">{formatDate(project.start_date)}</p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Calendar className="w-4 h-4" />
                End Date
              </div>
              <p className="font-medium">{formatDate(project.end_date)}</p>
            </div>
          </div>

          {/* Description */}
          {project.description && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Description
                </h4>
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                  {project.description}
                </p>
              </div>
            </>
          )}

          {/* Tenant Domain */}
          {project.is_tenant && project.tenant_domain && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Website
                </h4>
                <a 
                  href={project.tenant_domain.startsWith('http') ? project.tenant_domain : `https://${project.tenant_domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[var(--brand-primary)] hover:underline"
                >
                  {project.tenant_domain}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </>
          )}

          {/* Tenant Module Access */}
          {project.is_tenant && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <Settings2 className="w-4 h-4" />
                    Module Access
                  </h4>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setModulesDialogOpen(true)}
                  >
                    <Settings2 className="w-4 h-4 mr-2" />
                    Manage
                  </Button>
                </div>
                
                {enabledModules.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {enabledModules.map((moduleKey) => (
                      <Badge 
                        key={moduleKey} 
                        variant="secondary"
                        className="capitalize"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        {moduleKey}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">
                    No modules enabled. Click Manage to configure access.
                  </p>
                )}
              </div>
            </>
          )}

          {/* Integrations */}
          {project.is_tenant && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <Plug className="w-4 h-4" />
                    Integrations
                  </h4>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIntegrationsDialogOpen(true)}
                  >
                    <Plug className="w-4 h-4 mr-2" />
                    Configure
                  </Button>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  Connect Square payments, OpenPhone, and other services.
                </p>
              </div>
            </>
          )}

          {/* Sonor Client Setting (Sonor SaaS) */}
          <>
            <Separator />
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="font-medium flex items-center gap-2">
                      <Landmark className="w-4 h-4" />
                      Sonor Client
                    </h4>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Show Sonor services (Proposals, Billing) to this client
                    </p>
                  </div>
                  <Switch
                    id="is-uptrade-client"
                    checked={isUptradeClient}
                    onCheckedChange={handleUptradeClientToggle}
                    disabled={savingUptradeClient}
                  />
                </div>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Disable for white-label Sonor mode where client shouldn't see Sonor branding
                </p>
              </div>
            </>

          <Separator />

          {/* Quick Links */}
          <Tabs defaultValue="overview">
            <TabsList className="w-full">
              <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
              <TabsTrigger value="tasks" className="flex-1">Tasks</TabsTrigger>
              <TabsTrigger value="files" className="flex-1">Files</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-4">
              <div className="text-sm text-[var(--text-secondary)] text-center py-8">
                Project overview coming soon
              </div>
            </TabsContent>
            
            <TabsContent value="tasks" className="mt-4">
              <div className="text-sm text-[var(--text-secondary)] text-center py-8">
                Task list coming soon
              </div>
            </TabsContent>
            
            <TabsContent value="files" className="mt-4">
              <div className="text-sm text-[var(--text-secondary)] text-center py-8">
                Files list coming soon
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Tenant Modules Dialog */}
        {project.is_tenant && (
          <>
            <TenantModulesDialog
              open={modulesDialogOpen}
              onOpenChange={setModulesDialogOpen}
              project={project}
            />
            <ProjectIntegrationsDialog
              open={integrationsDialogOpen}
              onOpenChange={setIntegrationsDialogOpen}
              project={project}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

export default ProjectDetailPanel
