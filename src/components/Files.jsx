import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { toast } from '@/lib/toast'
import { EmptyState } from './EmptyState'
import { ConfirmDialog } from './ConfirmDialog'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Upload, 
  Download, 
  Trash2, 
  RefreshCw,
  Search, 
  Filter,
  FileText,
  Image,
  Video,
  Table,
  Archive,
  File,
  Eye,
  MoreVertical,
  FolderOpen,
  FolderPlus,
  Folder,
  Share2,
  MessageCircle,
  Copy,
  Home,
  ChevronRight,
  ArrowLeft,
  Grid3X3,
  List,
  Pencil
} from 'lucide-react'
import { UptradeSpinner } from '@/components/UptradeLoading'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu'
import { useFiles, useFolders, useUploadFile, useCreateFolder, useDeleteFile, useFileCategories, useUpdateFile, useUploadMultipleFiles, filesKeys, useProjects, projectsKeys } from '@/lib/hooks'
import { useQueryClient } from '@tanstack/react-query'
import useAuthStore from '@/lib/auth-store'
import { adminApi } from '@/lib/sonor-api'

// Utility: Format file size
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

// Derive usage module from file (category + folder_path) for sidebar filtering
function getFileModule(file) {
  const path = (file.folder_path || '').toLowerCase()
  const cat = (file.category || '').toLowerCase()
  if (cat === 'proposal' || path.includes('proposal')) return 'proposal'
  if (path.startsWith('engage')) return 'engage'
  if (path.startsWith('commerce')) return 'commerce'
  if (path.startsWith('website') || path.startsWith('seo')) return 'website'
  if (path.startsWith('broadcast')) return 'broadcast'
  if (path.startsWith('blog')) return 'blog'
  return cat || 'general'
}

const Files = ({
  embedded = false,
  viewFilter: externalViewFilter = null,
  onViewFilterChange,
  selectedFile = null,
  onSelectFile,
  triggerUpload = 0,
  onClearTriggerUpload
} = {}) => {
  const { user, isSuperAdmin, currentOrg } = useAuthStore()
  const { data: projectsData } = useProjects()
  const projects = projectsData?.projects ?? projectsData ?? []
  
  // Check if this is an agency org - should see ALL projects
  const isAgencyOrg = isSuperAdmin || currentOrg?.org_type === 'agency'
  
  const queryClient = useQueryClient()
  const uploadFileMutation = useUploadFile()
  const uploadMultipleFilesMutation = useUploadMultipleFiles()
  const deleteFileMutation = useDeleteFile()
  const updateFileMutation = useUpdateFile()
  
  const hasFetchedRef = useRef(false)
  const [allProjects, setAllProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [currentFolder, setCurrentFolder] = useState(null)
  
  // Build filters for files query - include folder path
  const filesFilters = useMemo(() => {
    const filters = {}
    if (searchTerm) filters.search = searchTerm
    if (selectedCategory) filters.category = selectedCategory
    if (currentFolder) filters.folderPath = currentFolder
    return filters
  }, [searchTerm, selectedCategory, currentFolder])
  
  // Fetch files for selected project with filters
  const { data: filesData, isLoading, error, refetch: refetchFiles } = useFiles(selectedProject?.id, filesFilters)
  const files = filesData?.files || []
  
  // Fetch file categories
  const { data: categories = [] } = useFileCategories()
  
  // Fetch folders from database
  const { data: apiFolders = [] } = useFolders(selectedProject?.id)
  
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [isPublic, setIsPublic] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState({ open: false, file: null })
  const [replaceTarget, setReplaceTarget] = useState(null)
  const [createFolderDialog, setCreateFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [imagePreviewFile, setImagePreviewFile] = useState(null)
  const [localFolders, setLocalFolders] = useState(() => {
    // Load custom folders from localStorage
    const saved = localStorage.getItem('uptrade_custom_folders')
    return saved ? JSON.parse(saved) : []
  })
  
  // Merge API folders with local folders
  const customFolders = useMemo(() => {
    if (!selectedProject) return localFolders
    
    // Get API folder paths for this project
    const apiFolderPaths = new Set(apiFolders.map(f => f.path))
    
    // Convert API folders to same format as local folders
    const apiFormatted = apiFolders.map(f => ({
      id: `api-${f.path}`,
      name: f.name,
      path: f.path,
      projectId: selectedProject.id,
      isFromApi: true,
    }))
    
    // Filter local folders to only include ones not already from API
    const localOnly = localFolders.filter(f => 
      f.projectId !== selectedProject.id || !apiFolderPaths.has(f.path)
    )
    
    return [...apiFormatted, ...localOnly]
  }, [apiFolders, localFolders, selectedProject])
  
  // Alias for backwards compatibility
  const setCustomFolders = setLocalFolders
  
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('date_desc') // date_desc | date_asc | name_asc | name_desc | size_asc | size_desc
  const [siteUsageFilter, setSiteUsageFilter] = useState('all') // 'all' | 'used' | 'unused' — which files are used by managed image slots
  const [selectedFileIds, setSelectedFileIds] = useState([]) // file IDs selected for bulk actions
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [renamingFolder, setRenamingFolder] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const replaceInputRef = useRef(null)

  // Get current folder path segments for breadcrumb
  const folderSegments = currentFolder ? currentFolder.split('/') : []
  
  // Navigate to a specific segment in the path
  const navigateToSegment = (index) => {
    if (index < 0) {
      setCurrentFolder(null)
    } else {
      const newPath = folderSegments.slice(0, index + 1).join('/')
      setCurrentFolder(newPath)
    }
  }

  // Navigate up one folder level
  const navigateUp = () => {
    if (!currentFolder) return
    const segments = currentFolder.split('/')
    if (segments.length === 1) {
      setCurrentFolder(null)
    } else {
      setCurrentFolder(segments.slice(0, -1).join('/'))
    }
  }

  // Get subfolders of current folder
  const getSubfolders = () => {
    if (!selectedProject) return []
    
    // Build a set of unique folder paths at the current level
    const folderMap = new Map()
    
    customFolders.forEach(f => {
      if (f.projectId !== selectedProject.id) return
      
      let targetPath
      if (!currentFolder) {
        // At root: get the first segment of each path
        const firstSegment = f.path.split('/')[0]
        targetPath = firstSegment
      } else {
        // In a folder: show folders that start with currentFolder/
        if (!f.path.startsWith(currentFolder + '/')) return
        const remainder = f.path.slice(currentFolder.length + 1)
        const nextSegment = remainder.split('/')[0]
        targetPath = `${currentFolder}/${nextSegment}`
      }
      
      if (targetPath && !folderMap.has(targetPath)) {
        folderMap.set(targetPath, {
          id: f.isFromApi ? `api-${targetPath}` : f.id,
          name: targetPath.split('/').pop(),
          path: targetPath,
          projectId: selectedProject.id,
          isFromApi: f.isFromApi,
        })
      }
    })
    
    return Array.from(folderMap.values())
  }

  // Delete a custom folder
  const handleDeleteFolder = (folder) => {
    const updated = customFolders.filter(f => f.id !== folder.id && !f.path.startsWith(folder.path + '/'))
    saveCustomFolders(updated)
    toast.success(`Folder "${folder.name}" deleted`)
    // If we're inside the deleted folder, go back to root
    if (currentFolder && (currentFolder === folder.path || currentFolder.startsWith(folder.path + '/'))) {
      setCurrentFolder(null)
    }
  }

  // Rename a custom folder
  const handleRenameFolder = (folder) => {
    if (!renameValue.trim()) return
    const oldPath = folder.path
    const segments = oldPath.split('/')
    segments[segments.length - 1] = renameValue.trim()
    const newPath = segments.join('/')
    
    // Update this folder and all subfolders
    const updated = customFolders.map(f => {
      if (f.id === folder.id) {
        return { ...f, name: renameValue.trim(), path: newPath }
      }
      if (f.path.startsWith(oldPath + '/')) {
        return { ...f, path: f.path.replace(oldPath, newPath) }
      }
      return f
    })
    
    saveCustomFolders(updated)
    toast.success('Folder renamed')
    setRenamingFolder(null)
    setRenameValue('')
    
    // Update current folder path if we're inside the renamed folder
    if (currentFolder === oldPath) {
      setCurrentFolder(newPath)
    } else if (currentFolder && currentFolder.startsWith(oldPath + '/')) {
      setCurrentFolder(currentFolder.replace(oldPath, newPath))
    }
  }

  // Handle share file - copy link to clipboard
  const handleShare = async (file) => {
    const url = file.public_url || file.url
    if (url) {
      await navigator.clipboard.writeText(url)
      toast.success('File link copied to clipboard')
    } else {
      toast.error('No shareable URL available')
    }
  }

  // Handle Ask Echo about file
  const handleAskEcho = (file) => {
    // Navigate to messages with Echo pre-populated with file context
    const echoUrl = `/messages?echo=true&context=file&fileId=${file.id}&fileName=${encodeURIComponent(file.original_filename || file.filename)}`
    window.location.href = echoUrl
  }

  // Handle create folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !selectedProject) return
    
    const folderPath = currentFolder 
      ? `${currentFolder}/${newFolderName.trim()}` 
      : newFolderName.trim()
    
    // Check if folder already exists
    if (customFolders.some(f => f.path === folderPath && f.projectId === selectedProject.id)) {
      toast.error('A folder with this name already exists')
      return
    }
    
    const newFolder = {
      id: `folder-${Date.now()}`,
      name: newFolderName.trim(),
      path: folderPath,
      projectId: selectedProject.id,
      createdAt: new Date().toISOString()
    }
    
    saveCustomFolders([...customFolders, newFolder])
    toast.success(`Folder "${newFolderName}" created`)
    setNewFolderName('')
    setCreateFolderDialog(false)
  }

  // Check if user is admin
  const isAdmin = user?.role === 'admin' || isSuperAdmin

  // Fetch initial data only once
  useEffect(() => {
    if (hasFetchedRef.current) return
    
    console.log('[Files] Fetching initial data, isAgencyOrg:', isAgencyOrg)
    hasFetchedRef.current = true
    
    // Fetch projects based on org type
    if (isAgencyOrg) {
      // Agency org - fetch ALL projects from admin API
      console.log('[Files] Loading all projects via admin API')
      loadAllProjects()
    }
    // Client org: useProjects() auto-fetches org-scoped projects
    // Categories are fetched by useFileCategories hook above
  }, [isAgencyOrg])
  
  // Load all projects for agency org
  const loadAllProjects = async () => {
    try {
      console.log('[Files] Calling adminApi.listTenants()')
      const response = await adminApi.listTenants()
      const payload = response?.data || response
      const orgsWithProjects = payload.organizations || payload.tenants || []
      
      console.log('[Files] Received orgs:', orgsWithProjects.length)
      
      // Flatten all projects from all orgs
      const allProjectsList = orgsWithProjects.flatMap(org => 
        (org.projects || []).map(project => ({
          ...project,
          title: project.title || project.name,
          org_id: project.org_id || org.id,
          organization: { name: org.name, slug: org.slug }
        }))
      )
      
      console.log('[Files] Total projects loaded:', allProjectsList.length)
      setAllProjects(allProjectsList)
    } catch (error) {
      console.error('[Files] Failed to load all projects:', error)
    }
  }

  // Get effective projects list based on org type
  const effectiveProjects = isAgencyOrg ? allProjects : projects

  // Filter files by module view when embedded and viewFilter is set, then by site usage, then sort
  const displayFiles = useMemo(() => {
    let list = files
    if (embedded && externalViewFilter && externalViewFilter !== 'all') {
      list = files.filter((f) => getFileModule(f) === externalViewFilter)
    }
    if (siteUsageFilter === 'used') {
      list = list.filter((f) => f.usedInSlots?.length > 0)
    } else if (siteUsageFilter === 'unused') {
      list = list.filter((f) => !f.usedInSlots?.length)
    }
    const sorted = [...list]
    switch (sortBy) {
      case 'date_asc':
        sorted.sort((a, b) => new Date(a.uploaded_at || a.createdAt || 0) - new Date(b.uploaded_at || b.createdAt || 0))
        break
      case 'date_desc':
        sorted.sort((a, b) => new Date(b.uploaded_at || b.createdAt || 0) - new Date(a.uploaded_at || a.createdAt || 0))
        break
      case 'name_asc':
        sorted.sort((a, b) => (a.original_filename || a.filename || a.name || '').localeCompare(b.original_filename || b.filename || b.name || ''))
        break
      case 'name_desc':
        sorted.sort((a, b) => (b.original_filename || b.filename || b.name || '').localeCompare(a.original_filename || a.filename || a.name || ''))
        break
      case 'size_asc':
        sorted.sort((a, b) => (a.file_size || a.fileSize || a.size || 0) - (b.file_size || b.fileSize || b.size || 0))
        break
      case 'size_desc':
        sorted.sort((a, b) => (b.file_size || b.fileSize || b.size || 0) - (a.file_size || a.fileSize || a.size || 0))
        break
      default:
        sorted.sort((a, b) => new Date(b.uploaded_at || b.createdAt || 0) - new Date(a.uploaded_at || a.createdAt || 0))
    }
    return sorted
  }, [files, embedded, externalViewFilter, siteUsageFilter, sortBy])
  
  // Auto-select project if there's only one
  useEffect(() => {
    if (effectiveProjects.length === 1 && !selectedProject) {
      setSelectedProject(effectiveProjects[0])
    }
  }, [effectiveProjects, selectedProject])

  // Clear selection when project or folder changes
  useEffect(() => {
    setSelectedFileIds([])
  }, [selectedProject?.id, currentFolder])

  // No need for handleSearch - TanStack Query automatically refetches when selectedProject changes
  // The filesFilters dependency in useFiles hook handles filter changes

  const getFileIcon = (category) => {
    switch (category) {
      case 'documents':
        return <FileText className="w-5 h-5" />
      case 'images':
        return <Image className="w-5 h-5" />
      case 'videos':
        return <Video className="w-5 h-5" />
      case 'spreadsheets':
        return <Table className="w-5 h-5" />
      case 'presentations':
        return <FileText className="w-5 h-5" />
      case 'archives':
        return <Archive className="w-5 h-5" />
      default:
        return <File className="w-5 h-5" />
    }
  }

  // Check if file is an image that can be previewed
  const isPreviewableImage = (file) => {
    const mimeType = (file.mime_type || file.mimeType || '').toLowerCase()
    const filename = file.original_filename || file.filename || file.name || ''
    const storagePath = file.storagePath || file.storage_path || ''
    const extFromName = filename.split('.').pop()?.toLowerCase()
    const extFromPath = storagePath.split('.').pop()?.toLowerCase()
    const ext = extFromName || extFromPath

    const imageMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp']
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']

    return imageMimeTypes.includes(mimeType) || (ext && imageExtensions.includes(ext))
  }

  // Get preview URL for a file (API returns url for Supabase/public files)
  const getPreviewUrl = (file) => {
    return file.url || file.public_url || file.publicUrl || file.download_url || file.downloadUrl || null
  }

  // Handle copy URL to clipboard
  const handleCopyUrl = async (file) => {
    const url = getPreviewUrl(file)
    if (url) {
      await navigator.clipboard.writeText(url)
      toast.success('URL copied to clipboard')
    } else {
      toast.error('No URL available for this file')
    }
  }

  // Handle clicking on a file card/row: select for right panel and optionally open image preview
  const handleFileClick = (file) => {
    onSelectFile?.(file)
    if (isPreviewableImage(file) && getPreviewUrl(file) && !embedded) {
      setImagePreviewFile(file)
    }
  }

  // Save custom folders to localStorage
  const saveCustomFolders = (folders) => {
    localStorage.setItem('uptrade_custom_folders', JSON.stringify(folders))
    setCustomFolders(folders)
  }

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files)
    setSelectedFiles(files)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    setSelectedFiles(files)
    setIsUploadDialogOpen(true)
  }

  const handleUpload = async () => {
    if (!selectedProject || selectedFiles.length === 0) return

    try {
      if (selectedFiles.length === 1) {
        await uploadFileMutation.mutateAsync({ 
          projectId: selectedProject.id, 
          file: selectedFiles[0], 
          isPublic 
        })
      } else {
        await uploadMultipleFilesMutation.mutateAsync({ 
          projectId: selectedProject.id, 
          files: selectedFiles, 
          isPublic 
        })
      }
      toast.success(selectedFiles.length === 1 ? 'File uploaded successfully!' : `${selectedFiles.length} files uploaded successfully!`)
      setIsUploadDialogOpen(false)
      setSelectedFiles([])
      setIsPublic(false)
    } catch (error) {
      toast.error(error.message || 'Upload failed')
    }
  }

  const handleDownload = async (file) => {
    try {
      // Create download link from public URL
      const link = document.createElement('a')
      link.href = file.public_url || file.publicUrl
      link.download = file.original_filename || file.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('File downloaded successfully!')
    } catch (error) {
      toast.error('Download failed')
    }
  }

  const handleDelete = async (file) => {
    try {
      await deleteFileMutation.mutateAsync({ 
        fileId: file.id, 
        projectId: selectedProject?.id 
      })
      toast.success('File deleted successfully!')
    } catch (error) {
      toast.error('Delete failed')
    }
  }

  // Multi-select for bulk delete
  const isFileSelected = (fileId) => selectedFileIds.includes(fileId)
  const toggleFileSelection = (fileId, e) => {
    if (e) e.stopPropagation()
    setSelectedFileIds((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    )
  }
  const selectAllDisplayFiles = () => {
    setSelectedFileIds(displayFiles.map((f) => f.id))
  }
  const clearSelection = () => setSelectedFileIds([])
  const toggleSelectAll = () => {
    if (selectedFileIds.length === displayFiles.length) clearSelection()
    else selectAllDisplayFiles()
  }

  const handleBulkDelete = async () => {
    if (!selectedFileIds.length) return
    setBulkDeleteDialogOpen(false)
    const projectId = selectedProject?.id
    let done = 0
    let failed = 0
    for (const fileId of selectedFileIds) {
      try {
        await deleteFileMutation.mutateAsync({ fileId, projectId })
        done++
      } catch {
        failed++
      }
    }
    clearSelection()
    if (done) toast.success(`${done} file${done !== 1 ? 's' : ''} deleted`)
    if (failed) toast.error(`${failed} file${failed !== 1 ? 's' : ''} could not be deleted`)
  }

  const handleReplaceClick = (file) => {
    setReplaceTarget(file)
    replaceInputRef.current?.click()
  }

  const handleReplaceFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !replaceTarget) return

    try {
      // Delete old file and upload new one with same metadata
      await deleteFileMutation.mutateAsync({ 
        fileId: replaceTarget.id, 
        projectId: selectedProject?.id 
      })
      await uploadFileMutation.mutateAsync({ 
        projectId: selectedProject?.id, 
        file, 
        isPublic: replaceTarget.is_public 
      })
      toast.success('File replaced successfully')
    } catch (error) {
      toast.error('Replace failed')
    }
    setReplaceTarget(null)
    if (replaceInputRef.current) replaceInputRef.current.value = ''
  }

  const canUpload = user?.role === 'admin' || user?.role === 'client_admin' || user?.role === 'client_user'

  // When embedded, open upload dialog when parent triggers it
  useEffect(() => {
    if (embedded && triggerUpload > 0 && canUpload) {
      setIsUploadDialogOpen(true)
      onClearTriggerUpload?.()
    }
  }, [embedded, triggerUpload, canUpload, onClearTriggerUpload])

  // Module filter label for embedded view (sidebar filter)
  const viewFilterLabel = embedded && externalViewFilter && externalViewFilter !== 'all'
    ? { all: 'All', engage: 'Engage', proposal: 'Proposals', website: 'Website / SEO', commerce: 'Commerce', broadcast: 'Broadcast', blog: 'Blog', general: 'General' }[externalViewFilter] || externalViewFilter
    : null

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className={embedded ? 'flex flex-col h-full min-h-0' : 'space-y-6 min-h-[400px]'}>
      {/* Header - hide when embedded (module provides top bar) */}
      {!embedded && (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Files</h1>
          <p className="text-[var(--text-secondary)]">Manage project files and documents</p>
        </div>
        {canUpload && (
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="glass-primary">
                <Upload className="w-4 h-4 mr-2" />
                Upload Files
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Files</DialogTitle>
                <DialogDescription>
                  Upload files to the selected project.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select 
                    value={selectedProject?.id?.toString()} 
                    onValueChange={(value) => {
                      const project = effectiveProjects.find(p => p.id === parseInt(value) || p.id === value)
                      setSelectedProject(project)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {effectiveProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragOver 
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5' 
                      : 'border-[var(--glass-border)] hover:border-[var(--text-tertiary)]'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-[var(--text-tertiary)]" />
                  <p className="text-sm text-[var(--text-secondary)] mb-2">
                    Drag and drop files here, or click to select
                  </p>
                  <Input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span>Choose Files</span>
                    </Button>
                  </Label>
                </div>
                
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label>Selected Files ({selectedFiles.length})</Label>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between text-sm p-2 bg-[var(--surface-secondary)] rounded">
                          <span className="truncate">{file.name}</span>
                          <span className="text-[var(--text-tertiary)]">{formatFileSize(file.size)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {uploadProgress > 0 && (
                  <div className="space-y-2">
                    <Label>Upload Progress</Label>
                    <Progress value={uploadProgress} className="w-full" />
                    <p className="text-sm text-[var(--text-secondary)]">{uploadProgress}% complete</p>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_public"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="is_public" className="text-sm">
                    Make files public (visible to all project members)
                  </Label>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsUploadDialogOpen(false)
                      setSelectedFiles([])
                      setIsPublic(false)
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="glass-primary"
                    onClick={handleUpload}
                    disabled={isLoading || !selectedProject || selectedFiles.length === 0}
                  >
                    {isLoading ? (
                      <>
                        <UptradeSpinner size="sm" className="mr-2 [&_p]:hidden [&_svg]:!h-4 [&_svg]:!w-4" />
                        Uploading...
                      </>
                    ) : (
                      `Upload ${selectedFiles.length} File${selectedFiles.length !== 1 ? 's' : ''}`
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
      )}

      <div className={embedded ? 'flex flex-col flex-1 overflow-hidden min-h-0' : ''}>
      {/* Toolbar: compact when embedded, full Card when standalone */}
      {embedded ? (
        <div className="flex-shrink-0 flex flex-wrap items-center gap-2 px-4 py-2 border-b border-[var(--glass-border)] bg-[var(--glass-bg)]">
          {viewFilterLabel && (
            <span className="text-xs font-medium text-[var(--text-tertiary)] px-2 py-1 rounded bg-[var(--glass-bg)]">
              View: {viewFilterLabel}
            </span>
          )}
          <Select value={selectedProject?.id?.toString() || ''} onValueChange={(value) => {
            const project = effectiveProjects.find(p => p.id === parseInt(value) || p.id === value)
            setSelectedProject(project)
          }}>
            <SelectTrigger className="w-44 h-8">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              {effectiveProjects.map((project) => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  {project.title || project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1 min-w-[120px] max-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-36 h-8">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Newest</SelectItem>
              <SelectItem value="date_asc">Oldest</SelectItem>
              <SelectItem value="name_asc">Name A–Z</SelectItem>
              <SelectItem value="name_desc">Name Z–A</SelectItem>
              <SelectItem value="size_desc">Largest</SelectItem>
              <SelectItem value="size_asc">Smallest</SelectItem>
            </SelectContent>
          </Select>
          {selectedProject && (
            <Select value={siteUsageFilter} onValueChange={setSiteUsageFilter}>
              <SelectTrigger className="w-36 h-8">
                <SelectValue placeholder="Site usage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All files</SelectItem>
                <SelectItem value="used">Used by site</SelectItem>
                <SelectItem value="unused">Not used by site</SelectItem>
              </SelectContent>
            </Select>
          )}
          <div className="flex border rounded-md">
            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" className="h-8 rounded-r-none px-2" onClick={() => setViewMode('grid')}>
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" className="h-8 rounded-l-none px-2" onClick={() => setViewMode('list')}>
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : null}
      
      {/* Scrollable content area - with padding for embedded mode */}
      <div className={embedded ? 'flex-1 overflow-auto min-h-0 p-4 space-y-4' : 'space-y-4'}>
      
      {!embedded && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)] w-4 h-4" />
                  <Input
                    placeholder="Search files..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={selectedProject?.id?.toString() || ''} onValueChange={(value) => {
                  const project = effectiveProjects.find(p => p.id === parseInt(value) || p.id === value)
                  setSelectedProject(project)
                }}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {effectiveProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedCategory || 'all'} onValueChange={(val) => setSelectedCategory(val === 'all' ? '' : val)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date_desc">Date: Newest</SelectItem>
                    <SelectItem value="date_asc">Date: Oldest</SelectItem>
                    <SelectItem value="name_asc">Name: A–Z</SelectItem>
                    <SelectItem value="name_desc">Name: Z–A</SelectItem>
                    <SelectItem value="size_desc">Size: Largest</SelectItem>
                    <SelectItem value="size_asc">Size: Smallest</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={siteUsageFilter} onValueChange={setSiteUsageFilter}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Site usage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All files</SelectItem>
                    <SelectItem value="used">Used by site</SelectItem>
                    <SelectItem value="unused">Not used by site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Bar - back button + breadcrumb (show when we have projects, including embedded) */}
      {effectiveProjects.length > 0 && (
        <div className={cn('flex items-center justify-between', embedded && 'py-2 px-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]')}>
          {/* Left: Back button + Breadcrumb */}
          <div className="flex items-center gap-2">
            {/* Back button - show when inside a project or folder */}
            {(selectedProject || currentFolder) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  if (currentFolder) {
                    navigateUp()
                  } else if (selectedProject) {
                    // Go back to all projects view
                    setSelectedProject(null)
                  }
                }}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] mr-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1 text-sm">
              {/* Root: Always show "All Projects" as clickable for navigation */}
              <button 
                onClick={() => { setSelectedProject(null); setCurrentFolder(null) }}
                className={`flex items-center gap-1 hover:text-[var(--brand-primary)] transition-colors ${
                  !selectedProject ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>All Projects</span>
              </button>
              
              {/* Project name in breadcrumb */}
              {selectedProject && (
                <>
                  <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
                  <button 
                    onClick={() => setCurrentFolder(null)}
                    className={`hover:text-[var(--brand-primary)] transition-colors ${
                      !currentFolder ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {selectedProject.title || selectedProject.name}
                  </button>
                </>
              )}
              
              {folderSegments.map((segment, index) => (
                <div key={index} className="flex items-center gap-1">
                  <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
                  <button 
                    onClick={() => navigateToSegment(index)}
                    className={`hover:text-[var(--brand-primary)] transition-colors ${
                      index === folderSegments.length - 1 
                        ? 'text-[var(--text-primary)] font-medium' 
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {segment}
                  </button>
                </div>
              ))}
            </nav>
          </div>
          
          {/* Right: View toggle + New Folder (only when inside a project) */}
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-md">
              <Button 
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
            {selectedProject && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCreateFolderDialog(true)}
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                New Folder
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Folders Section */}
      {selectedProject && getSubfolders().length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-[var(--text-secondary)]">Folders</h3>
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3" 
            : "space-y-1"
          }>
            {getSubfolders().map((folder) => (
              <ContextMenu key={folder.id}>
                <ContextMenuTrigger>
                  {viewMode === 'grid' ? (
                    <Card 
                      className="hover:shadow-md transition-shadow cursor-pointer bg-[var(--surface-secondary)] group"
                      onClick={() => setCurrentFolder(folder.path)}
                    >
                      <CardContent className="p-3 flex items-center gap-2">
                        <Folder className="w-5 h-5 text-[var(--brand-primary)]" />
                        {renamingFolder === folder.id ? (
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => handleRenameFolder(folder)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameFolder(folder)
                              if (e.key === 'Escape') { setRenamingFolder(null); setRenameValue('') }
                            }}
                            className="h-6 text-sm py-0 px-1"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="text-sm font-medium truncate flex-1">{folder.name}</span>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <div 
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-[var(--surface-secondary)] cursor-pointer group"
                      onClick={() => setCurrentFolder(folder.path)}
                    >
                      <Folder className="w-5 h-5 text-[var(--brand-primary)]" />
                      {renamingFolder === folder.id ? (
                        <Input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => handleRenameFolder(folder)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameFolder(folder)
                            if (e.key === 'Escape') { setRenamingFolder(null); setRenameValue('') }
                          }}
                          className="h-6 text-sm py-0 px-1 w-48"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="text-sm font-medium">{folder.name}</span>
                      )}
                    </div>
                  )}
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => setCurrentFolder(folder.path)}>
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Open
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => {
                    setRenamingFolder(folder.id)
                    setRenameValue(folder.name)
                  }}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Rename
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem 
                    onClick={() => handleDeleteFolder(folder)}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>
        </div>
      )}

      {/* Files Section */}
      {!selectedProject ? (
        /* Show projects as folders when no project is selected */
        effectiveProjects.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No projects found"
            description="You don't have access to any projects yet."
          />
        ) : (
          <div className={cn('space-y-4', embedded && 'space-y-5')}>
            <h3 className="text-sm font-medium text-[var(--text-secondary)]">Projects</h3>
            <div className={viewMode === 'grid'
              ? 'flex flex-wrap gap-2'
              : 'space-y-1 border rounded-lg divide-y'
            }>
              {effectiveProjects.map((project) => (
                <ContextMenu key={project.id}>
                  <ContextMenuTrigger asChild>
                    {viewMode === 'grid' ? (
                      <button
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer group transition-all duration-200',
                          'bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-sm',
                          'hover:bg-[var(--surface-secondary)] hover:border-[var(--brand-primary)]/30'
                        )}
                        onClick={() => setSelectedProject(project)}
                      >
                        <div className="w-8 h-8 flex-shrink-0 bg-[var(--brand-primary)]/10 rounded-md flex items-center justify-center group-hover:bg-[var(--brand-primary)]/20 transition-colors">
                          <Folder className="w-4 h-4 text-[var(--brand-primary)]" />
                        </div>
                        <div className="flex flex-col items-start min-w-0">
                          <span className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[140px]">
                            {project.title || project.name}
                          </span>
                          {project.organization?.name && (
                            <span className="text-xs text-[var(--text-tertiary)] truncate max-w-[140px]">
                              {project.organization.name}
                            </span>
                          )}
                        </div>
                      </button>
                    ) : (
                      <div
                        className="flex items-center gap-4 p-3 hover:bg-[var(--surface-secondary)] cursor-pointer rounded-md"
                        onClick={() => setSelectedProject(project)}
                      >
                        <div className="w-10 h-10 bg-[var(--brand-primary)]/10 rounded-lg flex items-center justify-center">
                          <Folder className="w-5 h-5 text-[var(--brand-primary)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{project.title || project.name}</p>
                          {project.organization?.name && (
                            <p className="text-xs text-[var(--text-tertiary)]">{project.organization.name}</p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
                      </div>
                    )}
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => setSelectedProject(project)}>
                      <FolderOpen className="mr-2 h-4 w-4" />
                      Open
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          </div>
        )
      ) : isLoading && files.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <UptradeSpinner size="lg" />
        </div>
      ) : displayFiles.length === 0 && getSubfolders().length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={currentFolder ? "This folder is empty" : "No files found"}
          description={
            searchTerm || selectedCategory 
              ? "No files match your current filters. Try adjusting your search criteria."
              : currentFolder
                ? "This folder doesn't contain any files yet."
                : "No files have been uploaded to this project yet."
          }
          actionLabel={canUpload && !searchTerm && !selectedCategory ? "Upload Files" : undefined}
          onAction={canUpload && !searchTerm && !selectedCategory ? (() => setIsUploadDialogOpen(true)) : undefined}
        />
      ) : displayFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-medium text-[var(--text-secondary)]">{displayFiles.length} Files</h3>
            {selectedFileIds.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-[var(--text-secondary)]">{selectedFileIds.length} selected</span>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Clear selection
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete {selectedFileIds.length} file{selectedFileIds.length !== 1 ? 's' : ''}
                </Button>
              </div>
            )}
          </div>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {displayFiles.map((file) => (
                <ContextMenu key={file.id}>
                  <ContextMenuTrigger asChild>
                    <Card
                      className={cn(
                        'group aspect-square w-full overflow-hidden rounded-lg transition-shadow cursor-context-menu p-0 gap-0',
                        'hover:shadow-lg hover:ring-2 hover:ring-[var(--brand-primary)]/30',
                        selectedFile?.id === file.id && 'ring-2 ring-[var(--brand-primary)]',
                        isFileSelected(file.id) && 'ring-2 ring-[var(--brand-primary)]'
                      )}
                      onClick={() => handleFileClick(file)}
                    >
                      <CardContent className="p-0 h-full min-h-0 relative flex-1 flex flex-col">
                        {/* Selection checkbox - z-20 and larger hit area so it sits above image and is easy to click */}
                        <div
                          className="absolute top-1.5 left-1.5 z-20 flex items-center justify-center w-8 h-8 rounded cursor-pointer hover:bg-black/20"
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleFileSelection(file.id, e) }}
                        >
                          <Checkbox
                            checked={isFileSelected(file.id)}
                            onCheckedChange={() => toggleFileSelection(file.id)}
                            className="bg-[var(--glass-bg)]/95 border-2 border-white shadow pointer-events-none"
                          />
                        </div>
                        {/* Used by site badge (managed image slots) */}
                        {file.usedInSlots?.length > 0 && (
                          <Badge
                            variant="secondary"
                            className="absolute top-1.5 right-1.5 z-10 text-[10px] px-1.5 py-0 bg-[var(--brand-primary)]/90 text-white border-0"
                            title={file.usedInSlots.join(', ')}
                          >
                            Used by site
                          </Badge>
                        )}
                        {/* Fill: image preview or icon - z-0 so checkbox stays on top */}
                        {isPreviewableImage(file) && getPreviewUrl(file) ? (
                          <div className="absolute inset-0 z-0 bg-[var(--surface-secondary)]">
                            <img
                              src={getPreviewUrl(file)}
                              alt={file.original_filename || file.filename || 'Preview'}
                              className="absolute inset-0 w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                e.target.style.display = 'none'
                                e.target.nextElementSibling?.classList.remove('hidden')
                              }}
                            />
                            <div className="hidden absolute inset-0 flex items-center justify-center bg-[var(--surface-secondary)] text-[var(--text-tertiary)]">
                              {getFileIcon(file.category)}
                            </div>
                          </div>
                        ) : (
                          <div className="absolute inset-0 z-0 bg-[var(--surface-secondary)] flex items-center justify-center text-[var(--text-tertiary)]">
                            <div className="opacity-60 scale-150">
                              {getFileIcon(file.category)}
                            </div>
                          </div>
                        )}

                        {/* 3-dot menu: top of tile, visible on hover */}
                        <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full shadow-md bg-[var(--glass-bg)]/95 hover:bg-[var(--glass-bg)] text-card-foreground border border-border">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownload(file) }}>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </DropdownMenuItem>
                              {isPreviewableImage(file) && getPreviewUrl(file) && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(getPreviewUrl(file), '_blank') }}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View full size
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyUrl(file) }}>
                                <Copy className="mr-2 h-4 w-4" />
                                Copy URL
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleShare(file) }}>
                                <Share2 className="mr-2 h-4 w-4" />
                                Share Link
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAskEcho(file) }}>
                                <MessageCircle className="mr-2 h-4 w-4" />
                                Ask Echo
                              </DropdownMenuItem>
                              {(file.uploaded_by === user?.id || file.uploaded_by == null || user?.role === 'admin' || user?.role === 'client_admin') && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleReplaceClick(file) }}>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Replace (keep URL)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => { e.stopPropagation(); setDeleteDialog({ open: true, file }) }}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Hover overlay: filename, size, category at bottom; Download / View at bottom of tile */}
                        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2">
                          <p className="text-white text-xs font-medium truncate drop-shadow" title={file.original_filename || file.filename || file.name}>
                            {file.original_filename || file.filename || file.name}
                          </p>
                          <p className="text-white/80 text-[10px] truncate">
                            {formatFileSize(file.file_size || file.fileSize || file.size)}
                            {file.category ? ` · ${file.category}` : ''}
                          </p>
                          <div className="flex gap-1 mt-1.5 flex-shrink-0">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-7 flex-1 text-xs bg-[var(--glass-bg)]/95 hover:bg-[var(--glass-bg)] text-card-foreground border border-border"
                              onClick={(e) => { e.stopPropagation(); handleDownload(file) }}
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                            {isPreviewableImage(file) && getPreviewUrl(file) && (
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-7 px-2 bg-[var(--glass-bg)]/95 hover:bg-[var(--glass-bg)] text-card-foreground border border-border"
                                onClick={(e) => { e.stopPropagation(); window.open(getPreviewUrl(file), '_blank') }}
                                title="View full size"
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => handleDownload(file)}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </ContextMenuItem>
                    {isPreviewableImage(file) && getPreviewUrl(file) && (
                      <ContextMenuItem onClick={() => window.open(getPreviewUrl(file), '_blank')}>
                        <Eye className="mr-2 h-4 w-4" />
                        View full size
                      </ContextMenuItem>
                    )}
                    <ContextMenuItem onClick={() => handleShare(file)}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share Link
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleAskEcho(file)}>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Ask Echo about this file
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => setCreateFolderDialog(true)}>
                      <FolderPlus className="mr-2 h-4 w-4" />
                      Add folder
                    </ContextMenuItem>
                    {(file.uploaded_by === user?.id || file.uploaded_by == null || user?.role === 'admin' || user?.role === 'client_admin') && (
                      <>
                        <ContextMenuSeparator />
                        <ContextMenuItem onClick={() => handleReplaceClick(file)}>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Replace (keep URL)
                        </ContextMenuItem>
                        <ContextMenuItem
                          onClick={() => setDeleteDialog({ open: true, file })}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </ContextMenuItem>
                      </>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="border rounded-lg divide-y">
              {/* Column headers - same layout as list rows for alignment */}
              <div className="flex items-center gap-4 p-3 border-b bg-[var(--surface-secondary)]/50 sticky top-0 z-10 rounded-t-lg text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                <div
                  className="w-8 flex-shrink-0 flex items-center justify-center cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); toggleSelectAll() }}
                >
                  <Checkbox
                    checked={displayFiles.length > 0 && selectedFileIds.length === displayFiles.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                    className="pointer-events-none"
                  />
                </div>
                <div className="w-10 flex-shrink-0" aria-hidden />
                <div className="flex-1 min-w-0">Name</div>
                <div className="text-sm hidden md:block w-16 text-right">Size</div>
                <div className="text-sm hidden lg:block w-24 text-right">Modified</div>
                <div className="w-8 flex-shrink-0" aria-hidden />
              </div>
              {displayFiles.map((file) => (
                <ContextMenu key={file.id}>
                  <ContextMenuTrigger>
                    <div 
                      className={cn(
                        'flex items-center gap-4 p-3 hover:bg-[var(--surface-secondary)] cursor-pointer',
                        selectedFile?.id === file.id && 'bg-[var(--brand-primary)]/10',
                        isFileSelected(file.id) && 'bg-[var(--brand-primary)]/10'
                      )}
                      onClick={() => handleFileClick(file)}
                    >
                      {/* Selection checkbox */}
                      <div
                        className="w-8 flex-shrink-0 flex items-center justify-center cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleFileSelection(file.id, e) }}
                      >
                        <Checkbox checked={isFileSelected(file.id)} className="pointer-events-none" />
                      </div>
                      {/* Thumbnail or Icon */}
                      {isPreviewableImage(file) && getPreviewUrl(file) ? (
                        <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                          <img 
                            src={getPreviewUrl(file)} 
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded bg-[var(--surface-tertiary)] flex items-center justify-center flex-shrink-0">
                          <div className="text-[var(--text-tertiary)]">
                            {getFileIcon(file.category)}
                          </div>
                        </div>
                      )}
                      
                      {/* File info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{file.original_filename || file.filename || file.name}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          {file.category}
                          {file.usedInSlots?.length > 0 && (
                            <span className="ml-1.5" title={file.usedInSlots.join(', ')}>
                              · <span className="text-[var(--brand-primary)]">Used by site</span> ({file.usedInSlots.join(', ')})
                            </span>
                          )}
                        </p>
                      </div>
                      
                      {/* Size - align with header */}
                      <div className="text-sm text-[var(--text-tertiary)] hidden md:block w-16 text-right">
                        {formatFileSize(file.file_size || file.fileSize || file.size)}
                      </div>
                      
                      {/* Modified - align with header */}
                      <div className="text-sm text-[var(--text-tertiary)] hidden lg:block w-24 text-right">
                        {new Date(file.created_at || file.uploadedAt || file.createdAt || Date.now()).toLocaleDateString()}
                      </div>
                      
                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDownload(file)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyUrl(file)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy URL
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShare(file)}>
                            <Share2 className="mr-2 h-4 w-4" />
                            Share Link
                          </DropdownMenuItem>
                          {(file.uploaded_by === user?.id || file.uploaded_by == null || user?.role === 'admin' || user?.role === 'client_admin') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleReplaceClick(file)}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Replace
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setDeleteDialog({ open: true, file })}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => handleDownload(file)}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleCopyUrl(file)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy URL
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleShare(file)}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share Link
                    </ContextMenuItem>
                    {(file.uploaded_by === user?.id || file.uploaded_by == null || user?.role === 'admin' || user?.role === 'client_admin') && (
                      <>
                        <ContextMenuSeparator />
                        <ContextMenuItem 
                          onClick={() => setDeleteDialog({ open: true, file })}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </ContextMenuItem>
                      </>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, file: null })}
        title="Delete File"
        description={`Are you sure you want to delete "${deleteDialog.file?.original_filename}"? This action cannot be undone.`}
        confirmText="Delete File"
        onConfirm={() => handleDelete(deleteDialog.file)}
      />

      {/* Confirm Bulk Delete Dialog */}
      <ConfirmDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title="Delete multiple files"
        description={`Are you sure you want to delete ${selectedFileIds.length} file${selectedFileIds.length !== 1 ? 's' : ''}? This action cannot be undone.`}
        confirmText={`Delete ${selectedFileIds.length} file${selectedFileIds.length !== 1 ? 's' : ''}`}
        onConfirm={handleBulkDelete}
      />

      {/* Create Folder Dialog */}
      <Dialog open={createFolderDialog} onOpenChange={setCreateFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for the new folder
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="My Folder"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateFolderDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                <FolderPlus className="mr-2 h-4 w-4" />
                Create Folder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden input for replace */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="*/*"
        className="hidden"
        onChange={handleReplaceFile}
      />

      {/* Image Preview Modal */}
      <Dialog open={!!imagePreviewFile} onOpenChange={(open) => !open && setImagePreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="truncate pr-8">
              {imagePreviewFile?.original_filename || imagePreviewFile?.filename || 'Image Preview'}
            </DialogTitle>
          </DialogHeader>
          <div className="relative flex items-center justify-center bg-black/5 p-4 min-h-[300px] max-h-[70vh]">
            {imagePreviewFile && (
              <img 
                src={getPreviewUrl(imagePreviewFile)} 
                alt={imagePreviewFile?.original_filename || imagePreviewFile?.filename || 'Preview'}
                className="max-w-full max-h-[65vh] object-contain rounded"
              />
            )}
          </div>
          <div className="p-4 pt-2 border-t border-[var(--glass-border)] flex items-center justify-between gap-2">
            <div className="text-sm text-[var(--text-secondary)]">
              {imagePreviewFile && formatFileSize(imagePreviewFile.file_size || imagePreviewFile.fileSize || imagePreviewFile.size)}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleCopyUrl(imagePreviewFile)}
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy URL
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => imagePreviewFile && handleDownload(imagePreviewFile)}
              >
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
              <Button 
                variant="default" 
                size="sm"
                onClick={() => window.open(getPreviewUrl(imagePreviewFile), '_blank')}
              >
                <Eye className="w-4 h-4 mr-1" />
                Open Full Size
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
        </div>
      </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => setCreateFolderDialog(true)}>
          <FolderPlus className="mr-2 h-4 w-4" />
          New Folder
        </ContextMenuItem>
        {canUpload && (
          <ContextMenuItem onClick={() => setIsUploadDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Files
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => refetchFiles()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export default Files
