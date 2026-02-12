// src/components/files/FilesModule.jsx
// Uses ModuleLayout: left sidebar (views), center (list), right panel (file details).
// MIGRATED TO REACT QUERY HOOKS - Jan 29, 2026
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FolderOpen,
  Upload,
  PanelRightClose,
  FileText,
  Copy,
  RefreshCw,
  ExternalLink,
  LayoutGrid,
  Megaphone,
  ShoppingBag,
  Globe,
  Newspaper,
  Palette,
  Folder,
  FilePlus,
  Presentation,
  Table2,
  ChevronDown,
  Settings,
  Sparkles,
  MessageCircle,
} from 'lucide-react'
import Files from '@/components/Files'
import { toast } from '@/lib/toast'
import { useFiles, useFolders, useUploadFile, useCreateFolder, filesKeys, driveKeys, useDriveFiles } from '@/lib/hooks'
import { useQueryClient } from '@tanstack/react-query'
import useAuthStore from '@/lib/auth-store'
import { oauthApi, filesApi, engageApi, workspaceIntegrationsApi } from '@/lib/portal-api'
import { ModuleLayout } from '@/components/ModuleLayout'
import { UptradeSpinner } from '@/components/UptradeLoading'
import { MODULE_ICONS } from '@/lib/module-icons'
import { broadcastApi } from '@/lib/api/broadcast'
import { DriveList, DriveUploadButton } from './DriveList'

const WEB_VIEW_FILTERS = [
  { id: 'all', label: 'All', icon: FolderOpen },
  { id: 'engage', label: 'Engage', icon: Megaphone },
  { id: 'proposal', label: 'Proposals', icon: FileText },
  { id: 'website', label: 'Website / SEO', icon: Globe },
  { id: 'commerce', label: 'Commerce', icon: ShoppingBag },
  { id: 'broadcast', label: 'Broadcast', icon: LayoutGrid },
  { id: 'blog', label: 'Blog', icon: Newspaper },
  { id: 'general', label: 'General', icon: Palette }
]

function getPreviewUrl(file) {
  if (!file) return null
  // Drive file
  if (file.webViewLink) return file.webViewLink
  if (file.downloadLink) return file.downloadLink
  // Supabase file
  return file.url || file.public_url || file.publicUrl || file.download_url || file.downloadUrl || null
}

function isPreviewableImage(file) {
  if (!file) return false
  const mimeType = (file.mime_type || file.mimeType || '').toLowerCase()
  const filename = file.original_filename || file.filename || file.name || ''
  const ext = filename.split('.').pop()?.toLowerCase()
  const imageMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp']
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']
  return imageMimeTypes.includes(mimeType) || imageExtensions.includes(ext)
}

function isDriveFile(file) {
  return file && (file.webViewLink != null || file.downloadLink != null || file.mimeType != null && !file.original_filename)
}

const FILES_DRIVE_MODULE = 'files_drive'

export default function FilesModule() {
  const [showSidebar, setShowSidebar] = useState(true)
  const [viewFilter, setViewFilter] = useState('all')
  const [selectedFile, setSelectedFile] = useState(null)
  const [showRightPanel, setShowRightPanel] = useState(true)
  const [triggerUpload, setTriggerUpload] = useState(0)
  const [replacing, setReplacing] = useState(false)
  const [creating, setCreating] = useState(null) // 'doc' | 'slide' | 'sheet'
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generatePrompt, setGeneratePrompt] = useState('')
  const [generateStyle, setGenerateStyle] = useState('realistic')
  const [generateAspect, setGenerateAspect] = useState('1:1')
  const [generating, setGenerating] = useState(false)
  const [savingToFiles, setSavingToFiles] = useState(false)
  const [showSendToChatDialog, setShowSendToChatDialog] = useState(false)
  const [liveSessions, setLiveSessions] = useState([])
  const [sendToChatSessionId, setSendToChatSessionId] = useState('')
  const [sendingToChat, setSendingToChat] = useState(false)
  const [driveCurrentFolderId, setDriveCurrentFolderId] = useState(null)
  const [driveConnected, setDriveConnected] = useState(false)
  const [showIntegrationsModal, setShowIntegrationsModal] = useState(false)
  const [connectingGoogle, setConnectingGoogle] = useState(false)
  const replaceInputRef = useRef(null)
  const queryClient = useQueryClient()
  const { currentProject } = useAuthStore()

  // Check workspace integration status on mount
  useEffect(() => {
    workspaceIntegrationsApi.getGoogleStatus()
      .then(status => {
        setDriveConnected(status?.connected && status?.drive?.connected)
      })
      .catch(() => setDriveConnected(false))
  }, [])

  const refreshFiles = () => {
    if (projectId) queryClient.invalidateQueries({ queryKey: filesKeys.list(projectId, {}) })
    queryClient.invalidateQueries({ queryKey: filesKeys.all })
  }

  const projectId = currentProject?.id

  const pollImageStatus = async (imageId, maxWaitMs = 60000) => {
    const start = Date.now()
    while (Date.now() - start < maxWaitMs) {
      const res = await broadcastApi.getImageStatus(imageId)
      const data = res?.data ?? res
      if (data?.status === 'completed' && data?.imageUrl) return data.imageUrl
      if (data?.status === 'failed') throw new Error(data?.errorMessage || 'Generation failed')
      await new Promise((r) => setTimeout(r, 2000))
    }
    throw new Error('Generation timed out')
  }

  const handleGenerateAndSave = async () => {
    if (!projectId || !generatePrompt?.trim()) {
      toast.error('Select a project and enter a prompt')
      return
    }
    setGenerating(true)
    setSavingToFiles(false)
    try {
      const res = await broadcastApi.generateImage(projectId, generatePrompt.trim(), {
        count: 1,
        style: generateStyle,
        aspectRatio: generateAspect,
      })
      const images = res?.data ?? res
      const first = Array.isArray(images) ? images[0] : images
      if (!first?.id) {
        toast.error('No image ID returned')
        return
      }
      const imageUrl = await pollImageStatus(first.id)
      setGenerating(false)
      setSavingToFiles(true)
      await filesApi.registerFromAiImage(projectId, imageUrl)
      toast.success('Saved to Files')
      setShowGenerateModal(false)
      setGeneratePrompt('')
      refreshFiles()
    } catch (e) {
      setGenerating(false)
      setSavingToFiles(false)
      toast.error(e?.response?.data?.message || e?.message || 'Generate or save failed')
    }
  }

  const ensureDriveConnected = async () => {
    try {
      const status = await workspaceIntegrationsApi.getGoogleStatus()
      if (status?.connected && status?.drive?.connected) return true
      // Initiate workspace OAuth if not connected
      const returnUrl = `${window.location.origin}/files`
      const { authUrl } = await workspaceIntegrationsApi.connectGoogle(returnUrl)
      window.location.href = authUrl
      return false
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not check Google Drive connection')
      return false
    }
  }

  const handleCreateDoc = async () => {
    if (!(await ensureDriveConnected())) return
    setCreating('doc')
    try {
      const { editUrl } = await filesApi.createGoogleDoc(projectId, 'Untitled document')
      window.open(editUrl, '_blank')
      toast.success('Google Doc created')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create Doc')
    } finally {
      setCreating(null)
    }
  }

  const handleCreateSlide = async () => {
    if (!(await ensureDriveConnected())) return
    setCreating('slide')
    try {
      const { editUrl } = await filesApi.createGoogleSlide(projectId, 'Untitled presentation')
      window.open(editUrl, '_blank')
      toast.success('Google Slides created')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create Slides')
    } finally {
      setCreating(null)
    }
  }

  const handleCreateSheet = async () => {
    if (!(await ensureDriveConnected())) return
    setCreating('sheet')
    try {
      const { editUrl } = await filesApi.createGoogleSheet(projectId, 'Untitled spreadsheet')
      window.open(editUrl, '_blank')
      toast.success('Google Sheet created')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create Sheet')
    } finally {
      setCreating(null)
    }
  }

  const handleCopyUrl = async (file) => {
    const url = getPreviewUrl(file)
    if (url) {
      await navigator.clipboard.writeText(url)
      toast.success('URL copied to clipboard')
    } else {
      toast.error('No URL available for this file')
    }
  }

  const handleUseIn = (moduleName) => {
    if (!selectedFile) return
    const url = getPreviewUrl(selectedFile)
    if (url) {
      navigator.clipboard.writeText(url)
      toast.success(`URL copied. Use it in ${moduleName}.`)
    }
    const deepLinks = {
      engage: '/engage',
      proposal: '/proposals',
      commerce: '/commerce',
      blog: '/blog',
      broadcast: '/broadcast'
    }
    if (deepLinks[moduleName]) {
      window.location.href = deepLinks[moduleName]
    }
  }

  const handleReplaceClick = () => {
    if (!selectedFile) return
    replaceInputRef.current?.click()
  }

  const handleReplaceFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !selectedFile) return
    setReplacing(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await filesApi.replaceFile(selectedFile.id, formData)
      const data = res?.data ?? res
      if (data?.file) {
        toast.success('File replaced (URL unchanged)')
        setSelectedFile((prev) => (prev ? { ...prev, ...data.file } : null))
      } else if (data?.error) {
        toast.error(data.error)
      }
      refreshFiles()
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Replace failed')
    } finally {
      setReplacing(false)
      if (replaceInputRef.current) replaceInputRef.current.value = ''
    }
  }

  const openSendToChatDialog = async () => {
    if (!selectedFile || !getPreviewUrl(selectedFile)) return
    setShowSendToChatDialog(true)
    setSendToChatSessionId('')
    try {
      const res = await engageApi.getChatSessions({ projectId: projectId || undefined })
      const data = res?.data ?? res
      const list = Array.isArray(data) ? data : data?.data ?? []
      setLiveSessions(list.filter((s) => s.status !== 'closed'))
    } catch (e) {
      console.error('Failed to load Live sessions', e)
      toast.error('Could not load chat sessions')
      setLiveSessions([])
    }
  }

  const handleSendToChat = async () => {
    if (!selectedFile || !sendToChatSessionId) return
    const url = getPreviewUrl(selectedFile)
    if (!url) {
      toast.error('This file has no shareable URL')
      return
    }
    setSendingToChat(true)
    try {
      const name = selectedFile.original_filename || selectedFile.filename || selectedFile.name || 'file'
      const size = selectedFile.file_size ?? selectedFile.size ?? 0
      const mimeType = selectedFile.mime_type || selectedFile.mimeType || 'application/octet-stream'
      await engageApi.sendChatMessage(sendToChatSessionId, 'Shared a file', [{ name, url, size, mimeType }])
      toast.success('File sent to chat')
      setShowSendToChatDialog(false)
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to send to chat')
    } finally {
      setSendingToChat(false)
    }
  }

  const leftSidebarContent = (
    <div className="p-4 space-y-4">
      <p className="uppercase tracking-wider text-[var(--text-tertiary)]">Web assets</p>
      <div className="space-y-1">
        {WEB_VIEW_FILTERS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setViewFilter(id)
              if (id !== 'drive') setSelectedFile(null)
            }}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors',
              viewFilter === id
                ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                : 'hover:bg-[var(--glass-bg)] text-[var(--text-secondary)]'
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider pt-4">Private</p>
      <button
        onClick={() => {
          setViewFilter('drive')
          setSelectedFile(null)
        }}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
          viewFilter === 'drive'
            ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-medium'
            : 'hover:bg-[var(--glass-bg)] text-[var(--text-secondary)]'
        )}
      >
        <Folder className="h-4 w-4" />
        <span>Drive</span>
      </button>

      {/* Integrations */}
      <div className="mt-6">
        <div className="flex items-center justify-between px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
          Integrations
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-[var(--glass-bg-hover)]"
            onClick={() => setShowIntegrationsModal(true)}
          >
            <Settings className="h-3 w-3" />
          </Button>
        </div>
        <div className="px-3 py-3 bg-[var(--glass-bg-inset)] rounded-lg mx-1">
          <div className="flex items-center gap-2 text-xs">
            <div className={cn(
              "h-2 w-2 rounded-full",
              driveConnected ? "bg-[var(--accent-green)]" : "bg-[var(--text-tertiary)]"
            )} />
            <span className={driveConnected ? "text-[var(--text-secondary)]" : "text-[var(--text-tertiary)]"}>
              {driveConnected ? 'Google Drive connected' : 'Google Drive not connected'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  const rightSidebarContent = selectedFile ? (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-[var(--glass-border)] shrink-0">
        <span className="text-[var(--text-primary)]">Details</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedFile(null)}>
              <PanelRightClose className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Close panel</TooltipContent>
        </Tooltip>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
          {isPreviewableImage(selectedFile) && getPreviewUrl(selectedFile) ? (
            <div className="rounded-lg overflow-hidden border border-[var(--glass-border)] bg-[var(--surface-secondary)]">
              <img
                src={getPreviewUrl(selectedFile)}
                alt={selectedFile.original_filename || selectedFile.filename || 'Preview'}
                className="w-full aspect-video object-contain"
              />
            </div>
          ) : (
            <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--surface-secondary)] aspect-video flex items-center justify-center">
              <FileText className="w-12 h-12 text-[var(--text-tertiary)]" />
            </div>
          )}
          <div>
            <p className="text-[var(--text-tertiary)] mb-1">Name</p>
            <p className="text-[var(--text-primary)] truncate" title={selectedFile.original_filename || selectedFile.filename}>
              {selectedFile.original_filename || selectedFile.filename || selectedFile.name}
            </p>
          </div>
          {selectedFile.category && (
            <div>
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Category</p>
              <p className="text-sm text-[var(--text-secondary)] capitalize">{selectedFile.category}</p>
            </div>
          )}
          {(selectedFile.file_size != null || selectedFile.size != null) && (
            <div>
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Size</p>
              <p className="text-sm text-[var(--text-secondary)]">
                {(() => {
                  const bytes = selectedFile.file_size ?? selectedFile.size ?? 0
                  if (bytes < 1024) return `${bytes} B`
                  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
                  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
                })()}
              </p>
            </div>
          )}
          <input ref={replaceInputRef} type="file" accept="*/*" className="hidden" onChange={handleReplaceFile} />
          <div className="pt-2 space-y-2 border-t border-[var(--glass-border)]">
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => handleCopyUrl(selectedFile)}>
              <Copy className="w-4 h-4 mr-2" />
              Copy URL
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => window.open(getPreviewUrl(selectedFile), '_blank')}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in new tab
            </Button>
            {getPreviewUrl(selectedFile) && (
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={openSendToChatDialog}>
                <MessageCircle className="w-4 h-4 mr-2" />
                Send to chat
              </Button>
            )}
            {!isDriveFile(selectedFile) && (
              <>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={handleReplaceClick} disabled={replacing}>
                  {replacing ? (
                    <span className="flex items-center gap-2">
                      <UptradeSpinner size="sm" className="[&_p]:hidden [&_svg]:!h-4 [&_svg]:!w-4" />
                      Replacing...
                    </span>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Replace (keep URL)
                    </>
                  )}
                </Button>
                <p className="text-xs text-[var(--text-tertiary)] pt-2">Use in</p>
                <div className="flex flex-wrap gap-1">
                  {['Engage', 'Proposal', 'Commerce', 'Blog', 'Broadcast'].map((name) => (
                    <Button key={name} variant="ghost" size="sm" className="text-xs h-8" onClick={() => handleUseIn(name.toLowerCase())}>
                      {name}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        </ScrollArea>
      </div>
    </div>
  ) : (
    <div className="h-full flex items-center justify-center text-[var(--text-tertiary)] p-6">
      <p className="text-sm">Select a file to view details</p>
    </div>
  )

  const headerActions = (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="glass-primary" size="sm" disabled={!!creating}>
            {creating ? <UptradeSpinner size="sm" className="mr-2 [&_p]:hidden [&_svg]:!h-4 [&_svg]:!w-4" /> : <FilePlus className="w-4 h-4 mr-2" />}
            New
            <ChevronDown className="w-4 h-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleCreateDoc} disabled={!!creating}>
            <FileText className="w-4 h-4 mr-2" />
            New Doc
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCreateSlide} disabled={!!creating}>
            <Presentation className="w-4 h-4 mr-2" />
            New Slide
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCreateSheet} disabled={!!creating}>
            <Table2 className="w-4 h-4 mr-2" />
            New Sheet
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {viewFilter !== 'drive' && (
        <Button variant="outline" size="sm" onClick={() => setShowGenerateModal(true)} disabled={!projectId || generating}>
          {generating || savingToFiles ? <UptradeSpinner size="sm" className="mr-2 [&_p]:hidden [&_svg]:!h-4 [&_svg]:!w-4" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Generate with Signal
        </Button>
      )}
      {viewFilter === 'drive' ? (
        <DriveUploadButton currentFolderId={driveCurrentFolderId} onUploadComplete={() => setSelectedFile(null)} />
      ) : (
        <Button variant="glass-primary" size="sm" onClick={() => setTriggerUpload((n) => n + 1)}>
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </Button>
      )}
    </div>
  )

  return (
    <TooltipProvider>
      <ModuleLayout
        ariaLabel="Files"
        leftSidebar={leftSidebarContent}
        rightSidebar={rightSidebarContent}
        leftSidebarOpen={showSidebar}
        rightSidebarOpen={showRightPanel}
        onLeftSidebarOpenChange={setShowSidebar}
        onRightSidebarOpenChange={setShowRightPanel}
        leftSidebarTitle="Views"
        rightSidebarTitle="Details"
        leftSidebarWidth={240}
        rightSidebarWidth={300}
      >
        <ModuleLayout.Header title="Files" icon={MODULE_ICONS.files} actions={headerActions} />
        <ModuleLayout.Content noPadding>
          {/* Generate with Signal modal */}
          <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Generate image with Signal</DialogTitle>
              <DialogDescription>
                Describe the image you want. It will be generated and saved to Files.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt</Label>
                <Input
                  id="prompt"
                  placeholder="e.g. Modern office workspace with natural light"
                  value={generatePrompt}
                  onChange={(e) => setGeneratePrompt(e.target.value)}
                  disabled={generating || savingToFiles}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Style</Label>
                  <Select
                    value={generateStyle}
                    onValueChange={setGenerateStyle}
                    disabled={generating || savingToFiles}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realistic">Realistic</SelectItem>
                      <SelectItem value="artistic">Artistic</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                      <SelectItem value="vibrant">Vibrant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Aspect ratio</Label>
                  <Select
                    value={generateAspect}
                    onValueChange={setGenerateAspect}
                    disabled={generating || savingToFiles}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1:1">1:1</SelectItem>
                      <SelectItem value="16:9">16:9</SelectItem>
                      <SelectItem value="9:16">9:16</SelectItem>
                      <SelectItem value="4:5">4:5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowGenerateModal(false)}
                disabled={generating || savingToFiles}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateAndSave}
                disabled={!generatePrompt?.trim() || generating || savingToFiles}
              >
                {generating ? (
                  <>Generating…</>
                ) : savingToFiles ? (
                  <>Saving to Files…</>
                ) : (
                  <>Generate & save to Files</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="flex-1 overflow-auto min-w-0">
          {viewFilter === 'drive' ? (
            <DriveList selectedFile={selectedFile} onSelectFile={setSelectedFile} onCurrentFolderChange={setDriveCurrentFolderId} />
          ) : (
            <Files
              embedded
              viewFilter={viewFilter}
              onViewFilterChange={setViewFilter}
              selectedFile={selectedFile}
              onSelectFile={setSelectedFile}
              triggerUpload={triggerUpload}
              onClearTriggerUpload={() => setTriggerUpload(0)}
            />
          )}
        </div>
        </ModuleLayout.Content>
      </ModuleLayout>

      {/* Integrations modal */}
      <Dialog open={showIntegrationsModal} onOpenChange={setShowIntegrationsModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Workspace Integrations</DialogTitle>
            <DialogDescription>
              Connect your Google account to access Drive files, Gmail, and Calendar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)]">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-3 w-3 rounded-full",
                  driveConnected ? "bg-[var(--accent-green)]" : "bg-[var(--text-tertiary)]"
                )} />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Google Drive</p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {driveConnected ? 'Connected — your Drive files are accessible' : 'Not connected'}
                  </p>
                </div>
              </div>
              {driveConnected ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      await workspaceIntegrationsApi.disconnectGoogle()
                      setDriveConnected(false)
                      toast.success('Google disconnected')
                    } catch (e) {
                      toast.error('Failed to disconnect')
                    }
                  }}
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  variant="glass-primary"
                  size="sm"
                  disabled={connectingGoogle}
                  onClick={async () => {
                    setConnectingGoogle(true)
                    try {
                      const returnUrl = `${window.location.origin}/files`
                      const { authUrl } = await workspaceIntegrationsApi.connectGoogle(returnUrl)
                      window.open(authUrl, '_blank', 'width=500,height=700')
                    } catch (e) {
                      toast.error(e?.response?.data?.message || 'Failed to start connection')
                    } finally {
                      setConnectingGoogle(false)
                    }
                  }}
                >
                  Connect
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send to chat dialog */}
        <Dialog open={showSendToChatDialog} onOpenChange={setShowSendToChatDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Send to chat</DialogTitle>
              <DialogDescription>
                Send this file to a Live chat session. The recipient will see a link to the file.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Live chat session</Label>
                <Select value={sendToChatSessionId} onValueChange={setSendToChatSessionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a session…" />
                  </SelectTrigger>
                  <SelectContent>
                    {liveSessions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.visitor_name || s.visitor_email || 'Visitor'} · {s.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {liveSessions.length === 0 && (
                  <p className="text-xs text-[var(--text-tertiary)]">No active Live chat sessions. Open Messages → Live to start one.</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSendToChatDialog(false)}>Cancel</Button>
              <Button onClick={handleSendToChat} disabled={!sendToChatSessionId || sendingToChat}>
                {sendingToChat ? <UptradeSpinner size="sm" className="mr-2 [&_p]:hidden [&_svg]:!h-4 [&_svg]:!w-4" /> : <MessageCircle className="w-4 h-4 mr-2" />}
                Send
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </TooltipProvider>
  )
}
