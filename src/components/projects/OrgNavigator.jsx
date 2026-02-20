/**
 * OrgNavigator - Right sidebar for Uptrade admins to navigate orgs and projects
 * 
 * Features:
 * - Search across all orgs and projects
 * - Expandable org groups with project lists
 * - Star/favorite frequently accessed projects
 * - Visual indicator for active project
 */
import { useState, useMemo, useEffect } from 'react'
import { 
  Search, Star, ChevronRight, ChevronDown, Building2,
  FolderKanban, Check, Plus, Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function OrgNavigator({
  organizations = [],
  projects = [],
  favorites = [],
  activeOrgId,
  activeProjectId,
  onOrgSelect,
  onProjectSelect,
  onToggleFavorite,
  onNewProject,
  isLoading = false,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedOrgs, setExpandedOrgs] = useState(new Set([activeOrgId]))

  // Auto-expand the active org
  useEffect(() => {
    if (activeOrgId) {
      setExpandedOrgs(prev => new Set([...prev, activeOrgId]))
    }
  }, [activeOrgId])

  // Group projects by org and filter based on search
  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    
    // Filter organizations
    let filteredOrgs = organizations
    let filteredProjects = projects

    if (query) {
      // Filter orgs that match or have matching projects
      const matchingProjectOrgIds = new Set(
        projects
          .filter(p => p.title?.toLowerCase().includes(query))
          .map(p => p.org_id)
      )
      
      filteredOrgs = organizations.filter(org => 
        org.name?.toLowerCase().includes(query) ||
        matchingProjectOrgIds.has(org.id)
      )
      
      filteredProjects = projects.filter(p => 
        p.title?.toLowerCase().includes(query) ||
        organizations.find(o => o.id === p.org_id)?.name?.toLowerCase().includes(query)
      )
    }

    // Group projects by org
    const projectsByOrg = {}
    filteredProjects.forEach(project => {
      if (!projectsByOrg[project.org_id]) {
        projectsByOrg[project.org_id] = []
      }
      projectsByOrg[project.org_id].push(project)
    })

    return {
      organizations: filteredOrgs,
      projectsByOrg,
    }
  }, [organizations, projects, searchQuery])

  const favoriteProjects = useMemo(() => {
    return projects.filter(p => favorites.includes(p.id))
  }, [projects, favorites])

  const toggleOrg = (orgId) => {
    setExpandedOrgs(prev => {
      const next = new Set(prev)
      if (next.has(orgId)) {
        next.delete(orgId)
      } else {
        next.add(orgId)
      }
      return next
    })
  }

  return (
    <div className="flex flex-col h-full border-l bg-muted/30">
      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orgs/projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-background"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-2">
          {/* Organizations & Projects */}
          {filteredData.organizations.map((org) => {
            const orgProjects = filteredData.projectsByOrg[org.id] || []
            const isExpanded = expandedOrgs.has(org.id)
            const isActive = org.id === activeOrgId

            return (
              <Collapsible
                key={org.id}
                open={isExpanded}
                onOpenChange={() => toggleOrg(org.id)}
              >
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors",
                      isActive && "bg-primary/5 font-medium"
                    )}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1 text-left">{org.name}</span>
                    <Badge variant="secondary" className="h-5 px-1.5">
                      {orgProjects.length}
                    </Badge>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="ml-4 pl-4 border-l">
                    {orgProjects.map((project) => {
                      const isActiveProject = project.id === activeProjectId
                      const isFavorite = favorites.includes(project.id)
                      const brandPrimary = project.brand_primary || '#4bbf39'

                      return (
                        <button
                          key={project.id}
                          onClick={() => onProjectSelect(project)}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors relative overflow-hidden",
                            isActiveProject 
                              ? "bg-primary/10 text-primary font-medium" 
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                          style={{
                            borderLeft: isActiveProject ? '2px solid transparent' : 'none',
                            borderImage: isActiveProject ? `linear-gradient(to bottom, ${brandPrimary}, ${brandPrimary}) 1` : 'none'
                          }}
                        >
                          {isActiveProject ? (
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                          ) : (
                            <FolderKanban className="h-3.5 w-3.5 shrink-0" />
                          )}
                          <span className="truncate flex-1 text-left">{project.title}</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onToggleFavorite?.(project.id)
                                  }}
                                  className="opacity-0 group-hover:opacity-100 hover:text-yellow-500 transition-opacity"
                                >
                                  <Star 
                                    className={cn(
                                      "h-3.5 w-3.5",
                                      isFavorite && "fill-yellow-400 text-yellow-400"
                                    )} 
                                  />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </button>
                      )
                    })}

                    {orgProjects.length === 0 && (
                      <div className="px-2 py-2 text-xs text-muted-foreground italic">
                        No projects
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )
          })}

          {filteredData.organizations.length === 0 && (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No organizations found</p>
            </div>
          )}
        </div>

        {/* Favorites Section */}
        {favoriteProjects.length > 0 && (
          <>
            <Separator className="my-2" />
            <div className="py-2">
              <div className="px-3 mb-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  Favorites
                </h3>
              </div>
              <div className="space-y-0.5">
                {favoriteProjects.map((project) => {
                  const isActiveProject = project.id === activeProjectId
                  const org = organizations.find(o => o.id === project.org_id)

                  return (
                    <button
                      key={project.id}
                      onClick={() => onProjectSelect(project)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors",
                        isActiveProject 
                          ? "bg-primary/10 text-primary font-medium" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <FolderKanban className="h-3.5 w-3.5 shrink-0" />
                      <div className="flex-1 text-left truncate">
                        <span>{project.title}</span>
                        {org && (
                          <span className="text-xs text-muted-foreground ml-1">
                            · {org.name}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </ScrollArea>

      {/* Bottom Actions */}
      <div className="p-3 border-t">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={onNewProject}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>
    </div>
  )
}

// Simplified version for org-level users (no org switching)
export function ProjectNavigator({
  projects = [],
  activeProjectId,
  onProjectSelect,
  isLoading = false,
}) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects
    const query = searchQuery.toLowerCase()
    return projects.filter(p => p.title?.toLowerCase().includes(query))
  }, [projects, searchQuery])

  return (
    <div className="flex flex-col h-full border-l bg-muted/30">
      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-background"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-2">
          <div className="px-3 mb-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Your Projects
            </h3>
          </div>
          
          {filteredProjects.map((project) => {
            const isActive = project.id === activeProjectId
            const brandPrimary = project.brand_primary || '#4bbf39'
            
            return (
              <button
                key={project.id}
                onClick={() => onProjectSelect(project)}
                className={cn(
                  "w-full px-3 py-2 text-left transition-colors relative overflow-hidden",
                  isActive 
                    ? "bg-primary/10" 
                    : "hover:bg-muted"
                )}
                style={{
                  borderLeft: isActive ? '2px solid transparent' : 'none',
                  borderImage: isActive ? `linear-gradient(to bottom, ${brandPrimary}, ${brandPrimary}) 1` : 'none'
                }}
              >
                <div className="flex items-center gap-2">
                  {isActive ? (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className={cn(
                    "font-medium truncate",
                    isActive && "text-primary"
                  )}>
                    {project.title}
                  </span>
                </div>
                
                {/* Module badges */}
                {project.enabled_modules && (
                  <div className="flex flex-wrap gap-1 mt-1 ml-6">
                    {project.enabled_modules.slice(0, 3).map((mod) => (
                      <Badge 
                        key={mod} 
                        variant="secondary" 
                        className="text-[10px] h-4 px-1"
                      >
                        {mod}
                      </Badge>
                    ))}
                    {project.enabled_modules.length > 3 && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1">
                        +{project.enabled_modules.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
                
                {/* Connection status */}
                {project.connection_count !== undefined && (
                  <div className="text-xs text-muted-foreground mt-1 ml-6">
                    {project.connection_count > 0 
                      ? `${project.connected_count || 0}/${project.connection_count} connected`
                      : 'Setup needed'
                    }
                  </div>
                )}
              </button>
            )
          })}

          {filteredProjects.length === 0 && (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <FolderKanban className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No projects found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export default { OrgNavigator, ProjectNavigator }
