// Drive list view: folder breadcrumb (click to go back), folders + files, upload, new folder.
// Uses React Query hooks + local state for folder path.
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from '@/lib/toast'
import { useDriveFiles, useUploadDriveFile, useCreateDriveFolder, useDeleteDriveFile } from '@/lib/hooks'
import { driveApi } from '@/lib/portal-api'
import {
  FolderOpen,
  Folder,
  FileText,
  Upload,
  ChevronRight,
  Loader2,
  Download,
  Trash2,
  ExternalLink,
  FolderPlus,
  Image as ImageIcon,
  ChevronLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function formatFileSize(bytes) {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(file) {
  if (file.isFolder) return <Folder className="w-5 h-5 text-[var(--brand-primary)]" />
  const mime = (file.mimeType || '').toLowerCase()
  if (mime.includes('image')) return <ImageIcon className="w-5 h-5 text-[var(--text-secondary)]" />
  if (mime.includes('document') || mime.includes('pdf')) return <FileText className="w-5 h-5 text-[var(--text-secondary)]" />
  return <FileText className="w-5 h-5 text-[var(--text-tertiary)]" />
}

export function DriveUploadButton({ currentFolderId = null, onUploadComplete }) {
  const inputRef = useRef(null)
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadDriveFile()

  const handleChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await uploadFile({ file, folderId: currentFolderId })
      toast.success('Uploaded to Drive')
      onUploadComplete?.()
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Upload failed')
    }
    e.target.value = ''
  }

  return (
    <>
      <input ref={inputRef} type="file" className="hidden" onChange={handleChange} />
      <Button
        variant="glass-primary"
        size="sm"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Upload className="w-4 h-4 mr-2" />
        )}
        Upload
      </Button>
    </>
  )
}

export function DriveList({ selectedFile, onSelectFile, onCurrentFolderChange }) {
  const [folderPath, setFolderPath] = useState([])
  const currentFolderId = folderPath.length ? folderPath[folderPath.length - 1]?.id : null

  useEffect(() => {
    onCurrentFolderChange?.(currentFolderId)
  }, [currentFolderId, onCurrentFolderChange])

  const { data, isLoading, error, isError } = useDriveFiles(currentFolderId)
  const { mutateAsync: createFolderMutate } = useCreateDriveFolder()
  const { mutateAsync: deleteFileMutate } = useDeleteDriveFile()

  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)

  const files = data?.files ?? []
  const needsConfig = isError && (error?.response?.status === 403 || error?.response?.status === 404)

  const goToBreadcrumb = (index) => {
    if (index < 0) {
      setFolderPath([])
    } else {
      setFolderPath((prev) => prev.slice(0, index + 1))
    }
  }

  const handleNavigateIntoFolder = (folderId, folderName) => {
    setFolderPath((prev) => [...prev, { id: folderId, name: folderName }])
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    setCreatingFolder(true)
    try {
      await createFolderMutate({ name: newFolderName.trim(), parentId: currentFolderId ?? undefined })
      setNewFolderName('')
      toast.success('Folder created')
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to create folder')
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleDownload = async (file) => {
    try {
      const res = await driveApi.downloadFile(file.id)
      const data = res?.data ?? res
      if (data?.url) {
        window.open(data.url, '_blank')
      } else if (res?.data instanceof Blob) {
        const url = URL.createObjectURL(res.data)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name || 'download'
        a.click()
        URL.revokeObjectURL(url)
      }
      toast.success('Download started')
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Download failed')
    }
  }

  const handleDelete = async (file) => {
    if (!window.confirm(`Delete "${file.name}"?`)) return
    try {
      await deleteFileMutate({ fileId: file.id, folderId: currentFolderId })
      toast.success('Deleted')
      if (selectedFile?.id === file.id) onSelectFile(null)
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Delete failed')
    }
  }

  const folders = files.filter((f) => f.isFolder)
  const fileList = files.filter((f) => !f.isFolder)

  if (needsConfig && !files.length) {
    return (
      <div className="p-4 md:p-5 space-y-4">
        {/* Breadcrumb - always show when on Drive tab */}
        <nav className="flex items-center gap-2 text-sm flex-wrap py-2 px-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]" aria-label="Folder path">
          <span className="text-[var(--text-primary)] font-medium">Drive</span>
        </nav>
        <div className="p-6 flex flex-col items-center justify-center min-h-[280px] text-center">
          <FolderOpen className="w-12 h-12 text-[var(--text-tertiary)] mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">Drive not connected</h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-md">
            Connect your Google account via workspace integrations to access your Drive files. Use the Integrations section in the sidebar.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-5 space-y-4">
      {/* Breadcrumb: click any segment to go back to that folder */}
      <nav className="flex items-center gap-2 text-sm flex-wrap py-2 px-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]" aria-label="Folder path">
        <button
          type="button"
          onClick={() => goToBreadcrumb(-1)}
          className="text-[var(--text-secondary)] hover:text-[var(--brand-primary)] font-medium"
        >
          Drive
        </button>
        {folderPath.map((seg, i) => (
          <span key={seg.id ?? i} className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
            <button
              type="button"
              onClick={() => goToBreadcrumb(i)}
              className="text-[var(--text-secondary)] hover:text-[var(--brand-primary)] truncate max-w-[140px] text-left"
              title={seg.name}
            >
              {seg.name}
            </button>
          </span>
        ))}
        {folderPath.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-2 h-8 px-2 text-[var(--text-tertiary)] hover:text-[var(--brand-primary)]"
            onClick={() => goToBreadcrumb(folderPath.length - 2)}
            title="Go back to previous folder"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        )}
      </nav>

      {error && !needsConfig && (
        <div className="rounded-lg border border-[var(--accent-error)]/30 bg-[var(--accent-error)]/10 px-4 py-2 text-sm text-[var(--accent-error)]">
          {error?.response?.data?.message || error?.message || 'Something went wrong'}
        </div>
      )}

      {/* New folder */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="New folder name"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
          className="max-w-xs"
        />
        <Button variant="outline" size="sm" onClick={handleCreateFolder} disabled={!newFolderName.trim() || creatingFolder}>
          {creatingFolder ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4 mr-1" />}
          New folder
        </Button>
      </div>

      {isLoading && files.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-1">
            {folders.map((f) => (
              <div
                key={f.id}
                role="button"
                tabIndex={0}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--glass-bg)] cursor-pointer"
                onClick={() => handleNavigateIntoFolder(f.id, f.name)}
                onKeyDown={(e) => e.key === 'Enter' && handleNavigateIntoFolder(f.id, f.name)}
              >
                <Folder className="w-5 h-5 text-[var(--brand-primary)] shrink-0" />
                <span className="font-medium truncate">{f.name}</span>
              </div>
            ))}
            {fileList.map((file) => (
              <div
                key={file.id}
                role="button"
                tabIndex={0}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--glass-bg)] cursor-pointer',
                  selectedFile?.id === file.id && 'bg-[var(--brand-primary)]/10'
                )}
                onClick={() => onSelectFile?.(file)}
                onKeyDown={(e) => e.key === 'Enter' && onSelectFile?.(file)}
              >
                {getFileIcon(file)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {file.size != null ? formatFileSize(file.size) : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {file.webViewLink && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(file.webViewLink, '_blank')
                      }}
                      title="Open"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDownload(file)
                    }}
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[var(--accent-error)]"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(file)
                    }}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {files.length === 0 && !isLoading && (
            <div className="py-12 text-center text-[var(--text-tertiary)]">
              <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No files in this folder. Upload or create a subfolder.</p>
            </div>
          )}
        </ScrollArea>
      )}
    </div>
  )
}
