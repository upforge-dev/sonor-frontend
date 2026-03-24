// src/components/reputation/ReputationModuleDashboard.jsx
// Reputation Module Dashboard - now uses unified dashboard with collapsible sidebar
// This component is kept for backwards compatibility with existing imports

import { useState, useEffect } from 'react'
import { Star, Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import useAuthStore from '@/lib/auth-store'
import { projectsApi } from '@/lib/sonor-api'

// Reputation dashboard (pages/reputation/ReputationModule.jsx)
import ReputationModule from '@/pages/reputation/ReputationModule'

export default function ReputationModuleDashboard({ projectId: propProjectId, onNavigate }) {
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [loadingProjects, setLoadingProjects] = useState(false)
  const { currentProject, currentOrg } = useAuthStore()
  
  // Get project ID from props, current context, or selected
  const projectId = propProjectId || currentProject?.id || selectedProjectId
  const orgId = currentOrg?.id
  
  // Fetch projects if no project context
  useEffect(() => {
    if (!propProjectId && !currentProject?.id && orgId) {
      fetchProjects()
    }
  }, [propProjectId, currentProject?.id, orgId])
  
  const fetchProjects = async () => {
    try {
      setLoadingProjects(true)
      const { data } = await projectsApi.list({ organizationId: orgId })
      const orgProjects = data.projects || []
      setProjects(orgProjects)
      if (orgProjects.length > 0) {
        setSelectedProjectId(orgProjects[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoadingProjects(false)
    }
  }

  // Show project selector if no project in context
  if (!projectId) {
    return (
      <div className="flex-1 p-6 bg-[var(--surface-page)]">
        <Card className="max-w-lg mx-auto mt-12 bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
              <Star className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
              Select a Project
            </CardTitle>
            <CardDescription className="text-[var(--text-secondary)]">
              Choose a project to manage its reputation and reviews
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingProjects ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--text-tertiary)]" />
              </div>
            ) : projects.length > 0 ? (
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-8 w-8 text-[var(--text-tertiary)] mx-auto mb-2" />
                <p className="text-sm text-[var(--text-secondary)]">
                  No projects found. Create a project to get started.
                </p>
                <Button 
                  className="mt-4" 
                  onClick={() => onNavigate?.('projects')}
                  style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
                >
                  Go to Projects
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render the reputation module dashboard
  return <div data-sonor-help="reputation/dashboard"><ReputationModule onNavigate={onNavigate} /></div>
}
