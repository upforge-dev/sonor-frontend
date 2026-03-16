/**
 * Projects V2 Module Components
 * 
 * Three-view project management system:
 * - Sonor Admin: Full org/project management
 * - Org-Level: Project connections and personal tasks  
 * - Standard User: Personal tasks and deliverable viewing
 */

// Main component
export { default as ProjectsV2 } from './ProjectsModule'

// Panel components
export { default as ProjectOverviewPanel } from './ProjectOverviewPanel'
export { default as UptradeTasksPanel } from './UptradeTasksPanel'
export { default as UserTasksPanel } from './UserTasksPanel'
export { DeliverablesPanel } from './DeliverablesPanel'

// Navigation components
export { UptradeTaskNavigation, UserTaskNavigation } from './TaskNavigation'
// OrgNavigator and ProjectNavigator removed (unused)

// Drawer/Dialog components
export { TaskDetailDrawer } from './TaskDetailDrawer'
export { DeliverableDetailDrawer } from './DeliverableDetailDrawer'
export { default as OrgSettingsModal } from './OrgSettingsModal'
export { default as NewProjectModal } from './NewProjectModal'

// Connection wizard
export { default as ConnectionWizard, PlatformCard, PLATFORM_CONFIGS, CATEGORIES } from './ConnectionWizard'

// Legacy components (existing)
export { default as ProjectCard } from './ProjectCard'
export { default as ProjectDetailPanel } from './ProjectDetailPanel'
export { default as ProjectsPage } from './ProjectsPage'
export { default as TenantModulesDialog } from './TenantModulesDialog'
export { default as ProjectIntegrationsDialog } from './ProjectIntegrationsDialog'
