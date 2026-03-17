/**
 * APIKeysManager - Manage project API keys for site-kit
 */
import { useState, useEffect } from 'react'
import { Copy, Key, Trash2, Plus, Eye, EyeOff, Check, AlertCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert'

import { portalApi } from '@/lib/portal-api'

export default function APIKeysManager({ projectId, isAdmin }) {
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showRevokeDialog, setShowRevokeDialog] = useState(false)
  const [keyToRevoke, setKeyToRevoke] = useState(null)
  const [newKeyName, setNewKeyName] = useState('')
  const [newlyCreatedKey, setNewlyCreatedKey] = useState(null)

  useEffect(() => {
    if (projectId) {
      loadKeys()
    }
  }, [projectId])

  async function loadKeys() {
    try {
      setLoading(true)
      const response = await portalApi.get(`/projects/${projectId}/api-keys`)
      setKeys(response.data || [])
    } catch (error) {
      console.error('Failed to load API keys:', error)
      toast.error('Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }

  async function createKey() {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key')
      return
    }

    try {
      setCreating(true)
      const response = await portalApi.post(`/projects/${projectId}/api-keys`, {
        name: newKeyName.trim()
      })
      
      setNewlyCreatedKey(response.data)
      setShowCreateDialog(false)
      setNewKeyName('')
      loadKeys()
      toast.success('API key created successfully')
    } catch (error) {
      console.error('Failed to create API key:', error)
      toast.error('Failed to create API key')
    } finally {
      setCreating(false)
    }
  }

  async function revokeKey() {
    if (!keyToRevoke) return

    try {
      setRevoking(true)
      await portalApi.delete(`/projects/${projectId}/api-keys/${keyToRevoke.id}`)
      toast.success('API key revoked')
      setShowRevokeDialog(false)
      setKeyToRevoke(null)
      loadKeys()
    } catch (error) {
      console.error('Failed to revoke API key:', error)
      toast.error('Failed to revoke API key')
    } finally {
      setRevoking(false)
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading API keys...</div>
  }

  return (
    <div className="space-y-4">
      {/* New key alert (shown after creation) */}
      {newlyCreatedKey && (
        <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200">
          <Key className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-sm space-y-2">
            <p className="font-medium text-green-900 dark:text-green-100">
              API Key Created Successfully
            </p>
            <p className="text-green-700 dark:text-green-300">
              Save this key now - it won't be shown again!
            </p>
            <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded border">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Add to your .env.local:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-xs break-all text-gray-600 dark:text-gray-400">
                  SONOR_API_KEY={newlyCreatedKey.key}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(`SONOR_API_KEY=${newlyCreatedKey.key}`)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => setNewlyCreatedKey(null)}
            >
              Done
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Info about keys not being viewable */}
      {keys.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            API keys are only shown once when created. If you've lost a key, revoke it and create a new one.
          </AlertDescription>
        </Alert>
      )}

      {/* Keys list */}
      <div className="space-y-2">
        {keys.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No API keys yet</p>
            <p className="text-xs mt-1">Create a key to integrate your site with Sonor</p>
          </div>
        ) : (
          keys.map(key => (
            <div 
              key={key.id} 
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                key.isActive ? "bg-card" : "bg-muted/50 opacity-60"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{key.name}</p>
                  {!key.isActive && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                      Revoked
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Created {new Date(key.createdAt).toLocaleDateString()}
                  {key.lastUsedAt && ` • Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                </p>
              </div>
              
              {key.isActive && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setKeyToRevoke(key)
                      setShowRevokeDialog(true)
                    }}
                    disabled={!isAdmin}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create button */}
      <Button
        onClick={() => setShowCreateDialog(true)}
        disabled={!isAdmin}
        variant="outline"
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Create New API Key
      </Button>

      {/* Create dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New API Key</DialogTitle>
            <DialogDescription>
              Generate a new API key for your site integration. This key will allow your site to submit forms and track analytics.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Key Name</Label>
              <Input
                id="key-name"
                placeholder="e.g. Production, Development, Staging"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !creating) {
                    createKey()
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Choose a descriptive name to identify where this key is used
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={createKey}
              disabled={creating || !newKeyName.trim()}
            >
              {creating ? 'Creating...' : 'Create Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation dialog */}
      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Revoke API Key
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke <strong>{keyToRevoke?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <Alert className="bg-red-50 dark:bg-red-950/20 border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-sm text-red-900 dark:text-red-100">
              This will immediately stop all sites using this key. This action cannot be undone.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRevokeDialog(false)
                setKeyToRevoke(null)
              }}
              disabled={revoking}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={revokeKey}
              disabled={revoking}
            >
              {revoking ? 'Revoking...' : 'Revoke Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
