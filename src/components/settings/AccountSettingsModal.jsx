// Account Settings modal: Avatar (Sync with Google, direct upload) + personal info (name, phone, email).
// Also handles personal Google Workspace connection for Gmail/Calendar/Contacts sync.
// Saves to contacts table via Portal API.
import { useState, useRef, useEffect } from 'react'
import { Loader2, Camera, RefreshCw, Mail, Calendar, Users, CheckCircle2, ExternalLink, Unlink, ImageIcon, X } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import ContactAvatar from '@/components/ui/ContactAvatar'
import { useAccountSettingsStore } from '@/lib/account-settings-store'
import useAuthStore from '@/lib/auth-store'
import { getSession } from '@/lib/supabase-auth'
import { authApi, contactsApi, portalApi } from '@/lib/portal-api'
import { uploadAvatarFileToStorage, uploadBackgroundFileToStorage, deleteBackgroundFromStorage } from '@/lib/avatar-utils'
import { openOAuthPopup } from '@/lib/oauth-popup'

const MAX_AVATAR_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_BACKGROUND_SIZE = 10 * 1024 * 1024 // 10MB
const PORTAL_API_URL = import.meta.env.VITE_PORTAL_API_URL || ''

export default function AccountSettingsModal() {
  const { open, closeModal } = useAccountSettingsStore()
  const { user, updateUser, currentProject } = useAuthStore()
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [saving, setSaving] = useState(false)
  const [syncingAvatar, setSyncingAvatar] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [error, setError] = useState(null)
  const avatarInputRef = useRef(null)
  const backgroundInputRef = useRef(null)
  
  // Google Workspace connection state
  const [workspaceConnection, setWorkspaceConnection] = useState(null)
  const [loadingConnection, setLoadingConnection] = useState(false)
  const [connectingWorkspace, setConnectingWorkspace] = useState(false)
  const [disconnectingWorkspace, setDisconnectingWorkspace] = useState(false)
  const [uploadingBackground, setUploadingBackground] = useState(false)
  
  // Fetch workspace connection when modal opens
  useEffect(() => {
    if (open && currentProject?.id) {
      fetchWorkspaceConnection()
    }
  }, [open, currentProject?.id])
  
  const fetchWorkspaceConnection = async () => {
    if (!currentProject?.id) return
    setLoadingConnection(true)
    try {
      const { data } = await portalApi.get(`/oauth/status/${currentProject.id}`)
      // Find Google workspace connection
      const googleWorkspace = data?.connections?.find(
        c => c.platform === 'google' && c.connection_type === 'workspace'
      )
      setWorkspaceConnection(googleWorkspace || null)
    } catch (err) {
      console.error('Failed to fetch workspace connection:', err)
    } finally {
      setLoadingConnection(false)
    }
  }
  
  const handleConnectWorkspace = async () => {
    if (!currentProject?.id) {
      toast.error('No project selected')
      return
    }
    setConnectingWorkspace(true)
    try {
      // Get OAuth URL with popup mode
      const { data } = await portalApi.get('/oauth/initiate/google', {
        params: {
          projectId: currentProject.id,
          modules: 'sync',
          connectionType: 'workspace',
          popupMode: 'true',
        }
      })
      
      // Open OAuth in popup
      const result = await openOAuthPopup(data.url, 'google-workspace-oauth')
      
      if (result.success) {
        toast.success('Google account connected!')
        await fetchWorkspaceConnection()
      } else if (result.error !== 'OAuth window was closed') {
        toast.error(result.error || 'Failed to connect Google account')
      }
    } catch (err) {
      console.error('Failed to initiate OAuth:', err)
      toast.error(err?.response?.data?.message || 'Failed to connect Google account')
    } finally {
      setConnectingWorkspace(false)
    }
  }
  
  const handleDisconnectWorkspace = async () => {
    if (!workspaceConnection?.id) return
    setDisconnectingWorkspace(true)
    try {
      await portalApi.delete(`/oauth/connections/${workspaceConnection.id}`)
      setWorkspaceConnection(null)
      toast.success('Google account disconnected')
    } catch (err) {
      console.error('Failed to disconnect:', err)
      toast.error('Failed to disconnect account')
    } finally {
      setDisconnectingWorkspace(false)
    }
  }

  useEffect(() => {
    if (open && user) {
      setName(user.name ?? '')
      setPhone(user.phone ?? '')
      setEmail(user.email ?? '')
      setError(null)
    }
  }, [open, user?.id, user?.name, user?.phone, user?.email])

  const handleOpenChange = (isOpen) => {
    if (isOpen) {
      setName(user?.name ?? '')
      setPhone(user?.phone ?? '')
      setEmail(user?.email ?? '')
      setError(null)
    } else {
      useAccountSettingsStore.getState().closeModal()
    }
  }

  const handleSyncWithGoogle = async () => {
    const { data: { session } } = await getSession()
    if (!session?.user) {
      setError('Not signed in with Google.')
      return
    }
    const googlePicture = session.user.user_metadata?.picture ?? session.user.user_metadata?.avatar_url
    if (!googlePicture) {
      setError('No Google profile photo found.')
      return
    }
    setSyncingAvatar(true)
    setError(null)
    try {
      const res = await authApi.syncGoogleAvatar({ pictureUrl: googlePicture })
      const avatarUrl = res.data?.avatarUrl
      if (avatarUrl) {
        updateUser({ avatar: avatarUrl })
      } else {
        setError('Failed to sync avatar from Google.')
      }
    } catch (e) {
      console.error('Sync with Google failed:', e)
      setError(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Failed to sync avatar.')
    } finally {
      setSyncingAvatar(false)
    }
  }

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG or GIF).')
      return
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setError('Image too large. Max 5MB.')
      return
    }
    const { data: { session } } = await getSession()
    if (!session?.user) {
      setError('Not authenticated.')
      return
    }
    setUploadingAvatar(true)
    setError(null)
    try {
      const avatarUrl = await uploadAvatarFileToStorage(file, session.user.id)
      if (!avatarUrl) {
        setError('Upload failed.')
        return
      }
      await contactsApi.patch(user.id, { avatar: avatarUrl })
      updateUser({ avatar: avatarUrl })
    } catch (err) {
      console.error('Avatar upload failed:', err)
      setError(err?.response?.data?.message ?? 'Upload failed.')
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const handleBackgroundFile = async (file) => {
    if (!file) return
    if (!file.type?.startsWith('image/')) {
      setError('Please select an image (JPG, PNG, WebP, AVIF or GIF).')
      toast.error('Please select an image file.')
      return
    }
    if (file.size > MAX_BACKGROUND_SIZE) {
      setError('Image too large. Max 10MB.')
      toast.error('Image too large. Max 10MB.')
      return
    }
    const { data: { session } } = await getSession()
    if (!session?.user) {
      setError('Not signed in.')
      toast.error('Not signed in.')
      return
    }
    setUploadingBackground(true)
    setError(null)
    const previousUrl = user?.background_image_url || null
    try {
      const url = await uploadBackgroundFileToStorage(file, session.user.id)
      if (!url) {
        const msg = 'Upload failed. Check the bucket exists and you have permission.'
        setError(msg)
        toast.error(msg)
        return
      }
      await contactsApi.patch(user.id, { backgroundImageUrl: url })
      updateUser({ background_image_url: url })
      if (previousUrl) await deleteBackgroundFromStorage(previousUrl)
      toast.success('Background updated')
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Upload failed.'
      setError(msg)
      toast.error(msg)
      console.error('Background upload failed:', err)
    } finally {
      setUploadingBackground(false)
    }
  }

  const handleBackgroundFileChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) handleBackgroundFile(file)
  }

  const handleRemoveBackground = async () => {
    if (!user?.id) return
    setError(null)
    const previousUrl = user?.background_image_url || null
    try {
      await contactsApi.patch(user.id, { backgroundImageUrl: null })
      updateUser({ background_image_url: null })
      if (previousUrl) await deleteBackgroundFromStorage(previousUrl)
      toast.success('Background reset to default')
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to remove.')
    }
  }

  const handleSavePersonalInfo = async (e) => {
    e.preventDefault()
    if (!user?.id) return
    setSaving(true)
    setError(null)
    try {
      const payload = { name: name.trim() || null, phone: phone.trim() || null }
      if (email.trim()) payload.email = email.trim()
      await contactsApi.patch(user.id, payload)
      updateUser(payload)
      closeModal()
    } catch (err) {
      console.error('Save account settings failed:', err)
      setError(err?.response?.data?.message ?? 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Account Settings</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 mb-4">{error}</p>
          )}
          
          {/* Two-column layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
            {/* Left Column: Profile */}
            <div className="space-y-6">
              {/* Avatar */}
              <div>
                <Label className="text-sm font-medium text-[var(--text-secondary)]">Avatar</Label>
                <div className="flex items-center gap-4 mt-2">
                  <ContactAvatar contact={user} size="xl" className="w-16 h-16" />
                  <div className="flex flex-col gap-2">
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSyncWithGoogle}
                      disabled={syncingAvatar || uploadingAvatar}
                      className="flex items-center gap-2"
                    >
                      {syncingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Sync with Google
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={syncingAvatar || uploadingAvatar}
                      className="flex items-center gap-2"
                    >
                      {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                      {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                    </Button>
                    <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max 5MB.</p>
                  </div>
                </div>
              </div>

              {/* Personal info */}
              <form onSubmit={handleSavePersonalInfo} className="space-y-4">
                <div>
                  <Label htmlFor="account-name" className="text-sm font-medium text-[var(--text-secondary)]">Name</Label>
                  <Input
                    id="account-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="account-phone" className="text-sm font-medium text-[var(--text-secondary)]">Phone</Label>
                  <Input
                    id="account-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone number"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="account-email" className="text-sm font-medium text-[var(--text-secondary)]">Email</Label>
                  <Input
                    id="account-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="mt-1"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={closeModal}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save
                  </Button>
                </div>
              </form>
            </div>

            {/* Right Column: Background & Connected Accounts */}
            <div className="space-y-6">
              {/* Google Workspace Connection */}
              <div>
                <Label className="text-sm font-medium text-[var(--text-secondary)]">Connected Accounts</Label>
                <p className="text-xs text-muted-foreground mt-1 mb-3">
                  Connect your personal Google account for email sync, calendar, and contacts.
                </p>
                
                {loadingConnection ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                ) : workspaceConnection ? (
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500 text-white">
                          <Mail className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Google Workspace</p>
                          <p className="text-xs text-muted-foreground">
                            {workspaceConnection.authorized_by_email || workspaceConnection.account_name}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">
                        <Mail className="h-3 w-3 mr-1" /> Gmail
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        <Calendar className="h-3 w-3 mr-1" /> Calendar
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        <Users className="h-3 w-3 mr-1" /> Contacts
                      </Badge>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDisconnectWorkspace}
                      disabled={disconnectingWorkspace}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      {disconnectingWorkspace ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Unlink className="h-4 w-4 mr-2" />
                      )}
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <div className="border border-dashed rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Google Workspace</p>
                        <p className="text-xs text-muted-foreground">
                          Email, Calendar & Contacts sync
                        </p>
                      </div>
                    </div>
                    
                    <Alert className="mb-3">
                      <AlertDescription className="text-xs">
                        Connect your personal Google account to sync emails, calendar events, and contacts.
                        This is separate from your company's SEO & Business Profile connection.
                      </AlertDescription>
                    </Alert>
                    
                    <Button
                      onClick={handleConnectWorkspace}
                      disabled={connectingWorkspace}
                      className="w-full"
                    >
                      {connectingWorkspace ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <ExternalLink className="h-4 w-4 mr-2" />
                      )}
                      Connect Google Account
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
