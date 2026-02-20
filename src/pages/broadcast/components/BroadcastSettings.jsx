// src/pages/broadcast/components/BroadcastSettings.jsx
import React, { useState } from 'react';
import { 
  Plus, 
  RefreshCw, 
  Trash2, 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  Settings2,
  Key,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  useBroadcastConnections,
  useConnectBroadcastPlatform,
  useDisconnectBroadcastPlatform,
} from '@/lib/hooks';
import useAuthStore from '@/lib/auth-store';
import { PlatformIcon, PlatformBadge } from './PlatformIcon';

const PLATFORMS = [
  { 
    id: 'facebook', 
    name: 'Facebook', 
    description: 'Post to Facebook Pages and Groups',
    scopes: ['pages_read_engagement', 'pages_manage_posts'],
  },
  { 
    id: 'instagram', 
    name: 'Instagram', 
    description: 'Share photos and videos to Instagram Business',
    scopes: ['instagram_basic', 'instagram_content_publish'],
    note: 'Requires Facebook Business account connection',
  },
  { 
    id: 'linkedin', 
    name: 'LinkedIn', 
    description: 'Share updates on LinkedIn Company Pages',
    scopes: ['w_member_social', 'w_organization_social'],
  },
  { 
    id: 'gbp', 
    name: 'Google Business Profile', 
    description: 'Post updates to your Google Business listing',
    scopes: ['https://www.googleapis.com/auth/business.manage'],
  },
  { 
    id: 'tiktok', 
    name: 'TikTok', 
    description: 'Share videos to TikTok Business account',
    scopes: ['video.publish', 'user.info.basic'],
  },
  { 
    id: 'youtube', 
    name: 'YouTube', 
    description: 'Upload Shorts and videos to your channel',
    scopes: ['https://www.googleapis.com/auth/youtube.upload'],
  },
  { 
    id: 'snapchat', 
    name: 'Snapchat', 
    description: 'Share to Spotlight and Stories',
    scopes: ['snapchat-marketing-api'],
    note: 'Requires Snapchat Business account',
  },
];

const STATUS_STYLES = {
  active: { label: 'Connected', color: 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]', icon: CheckCircle },
  expired: { label: 'Expired', color: 'bg-yellow-500/20 text-yellow-500', icon: AlertCircle },
  revoked: { label: 'Revoked', color: 'bg-red-500/20 text-red-500', icon: XCircle },
  error: { label: 'Error', color: 'bg-red-500/20 text-red-500', icon: XCircle },
};

function ConnectionCard({ connection, onRefresh, onDisconnect }) {
  const status = STATUS_STYLES[connection.status] || STATUS_STYLES.error;
  const StatusIcon = status.icon;

  return (
    <Card className="bg-[var(--glass-bg)]">
      <CardContent className="flex items-center gap-4 p-4">
        <PlatformIcon platform={connection.platform} size={32} withBackground />
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--text-primary)]">{connection.accountName || connection.platform}</span>
            <Badge className={cn('gap-1', status.color)}>
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
          </div>
          <div className="mt-1 text-sm text-[var(--text-tertiary)]">
            {connection.expiresAt ? (
              <>
                {connection.status === 'expired' ? 'Expired ' : 'Expires '}
                {formatDistanceToNow(new Date(connection.expiresAt))} ago
              </>
            ) : (
              <>Connected {formatDistanceToNow(new Date(connection.createdAt))} ago</>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {connection.status === 'expired' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onRefresh(connection)}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onDisconnect(connection)}
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PlatformCard({ platform, connections, onConnect }) {
  const platformConnections = connections.filter((c) => c.platform === platform.id);
  const isConnected = platformConnections.some((c) => c.status === 'active');

  return (
    <Card className={cn(
      'transition-shadow hover:shadow-md bg-[var(--glass-bg)]',
      isConnected && 'border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/5'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <PlatformIcon platform={platform.id} size={40} withBackground />
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-[var(--text-primary)]">{platform.name}</h3>
              {isConnected ? (
                <Badge className="bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Connected
                </Badge>
              ) : (
                <Button size="sm" className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white hover:opacity-90" onClick={() => onConnect(platform.id)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Connect
                </Button>
              )}
            </div>
            <p className="mt-1 text-sm text-[var(--text-tertiary)]">{platform.description}</p>
            {platform.note && (
              <p className="mt-1 text-xs text-amber-600">{platform.note}</p>
            )}
          </div>
        </div>

        {/* Connected accounts */}
        {platformConnections.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-[var(--glass-border)] pt-4">
            {platformConnections.map((conn) => (
              <div 
                key={conn.id}
                className="flex items-center justify-between rounded-lg bg-[var(--surface-secondary)] p-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--text-primary)]">{conn.accountName}</span>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      'text-xs',
                      STATUS_STYLES[conn.status]?.color
                    )}
                  >
                    {STATUS_STYLES[conn.status]?.label}
                  </Badge>
                </div>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {conn.accountId?.slice(0, 8)}...
                </span>
              </div>
            ))}
            {isConnected && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => onConnect(platform.id)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Another Account
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CredentialsCard({ platform, credentials, onSave }) {
  const [clientId, setClientId] = useState(credentials?.clientId || '');
  const [clientSecret, setClientSecret] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(platform.id, { clientId, clientSecret });
      setIsEditing(false);
      setClientSecret('');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-[var(--glass-bg)]">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <PlatformIcon platform={platform.id} size={32} withBackground />
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-[var(--text-primary)]">{platform.name}</h3>
              {credentials ? (
                <Badge className="bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]">
                  <Key className="mr-1 h-3 w-3" />
                  Configured
                </Badge>
              ) : (
                <Badge variant="outline" className="border-[var(--glass-border)]">Not Configured</Badge>
              )}
            </div>
            
            {isEditing ? (
              <div className="mt-3 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Client ID / App ID</Label>
                  <Input
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Enter client ID"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Client Secret</Label>
                  <Input
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="Enter client secret"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white hover:opacity-90" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-2">
                {credentials ? (
                  <p className="text-sm text-[var(--text-tertiary)]">
                    Client ID: {credentials.clientId?.slice(0, 12)}...
                  </p>
                ) : (
                  <p className="text-sm text-[var(--text-tertiary)]">
                    Add your own API credentials to connect accounts
                  </p>
                )}
                <Button 
                  variant="link" 
                  size="sm" 
                  className="h-auto p-0"
                  onClick={() => setIsEditing(true)}
                >
                  {credentials ? 'Update Credentials' : 'Add Credentials'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BroadcastSettings({ open, onOpenChange }) {
  const { currentProject, currentOrg } = useAuthStore();
  const selectedProjectId = currentProject?.id;
  const selectedOrgId = currentOrg?.id;
  
  const { data: connections = [], isLoading: connectionsLoading } = useBroadcastConnections(selectedProjectId, {
    enabled: !!selectedProjectId && open,
  });
  const connectPlatformMutation = useConnectBroadcastPlatform();
  const disconnectPlatformMutation = useDisconnectBroadcastPlatform();

  const [activeTab, setActiveTab] = useState('connections');
  const [disconnectDialog, setDisconnectDialog] = useState(null);
  const [credentials, setCredentials] = useState({});
  
  const isLoading = connectPlatformMutation.isPending || disconnectPlatformMutation.isPending;

  const handleConnect = async (platform) => {
    // For OAuth, we'd typically redirect to an OAuth flow
    // This is a placeholder that would initiate the OAuth dance
    connectPlatformMutation.mutate({ projectId: selectedProjectId, platform, data: {} });
  };

  const handleRefresh = async (connection) => {
    // Refresh would re-initiate OAuth or refresh the token
    connectPlatformMutation.mutate({ projectId: selectedProjectId, platform: connection.platform, data: { refresh: true } });
  };

  const handleDisconnect = async () => {
    if (!disconnectDialog) return;
    disconnectPlatformMutation.mutate(
      { projectId: selectedProjectId, connectionId: disconnectDialog.id },
      { onSuccess: () => setDisconnectDialog(null) }
    );
  };

  const handleSaveCredentials = async (platform, creds) => {
    // This would call an API to save org-level credentials
    setCredentials((prev) => ({
      ...prev,
      [platform]: { clientId: creds.clientId },
    }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
        <SheetHeader className="px-1">
          <SheetTitle>Broadcast Settings</SheetTitle>
          <SheetDescription>
            Manage your social media connections and preferences
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="connections">Connections</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
              </TabsList>

              <TabsContent value="connections" className="space-y-6 mt-4">
                {/* Info about master account model */}
                <Card className="bg-[var(--glass-bg)]">
                  <CardContent className="flex items-start gap-3 p-4">
                    <CheckCircle className="mt-0.5 h-5 w-5 text-[var(--brand-primary)] shrink-0" />
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">Simple One-Click Connection</p>
                      <p className="text-sm text-[var(--text-tertiary)]">
                        Click "Connect" and authorize access to your social accounts. 
                        No developer setup required - Uptrade handles all the technical details.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Platform cards */}
                <div className="grid gap-4 px-1">
                  {PLATFORMS.map((platform) => (
                    <PlatformCard
                      key={platform.id}
                      platform={platform}
                      connections={connections}
                      onConnect={handleConnect}
                    />
                  ))}
                </div>

                {/* Active connections list */}
                {connections.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-medium text-[var(--text-primary)]">Active Connections</h3>
                    <div className="space-y-2">
                      {connections.map((connection) => (
                        <ConnectionCard
                          key={connection.id}
                          connection={connection}
                          onRefresh={handleRefresh}
                          onDisconnect={setDisconnectDialog}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="preferences" className="space-y-6 mt-4">
                <Card className="bg-[var(--glass-bg)]">
                  <CardHeader>
                    <CardTitle className="text-[var(--text-primary)]">Publishing Preferences</CardTitle>
                    <CardDescription className="text-[var(--text-tertiary)]">
                      Configure default behaviors for publishing posts
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-[var(--text-primary)]">Require Approval</Label>
                        <p className="text-sm text-[var(--text-tertiary)]">
                          Posts must be approved before publishing
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <Separator className="bg-[var(--glass-border)]" />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-[var(--text-primary)]">Auto-Schedule Posts</Label>
                        <p className="text-sm text-[var(--text-tertiary)]">
                          Automatically pick optimal times when not specified
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <Separator className="bg-[var(--glass-border)]" />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-[var(--text-primary)]">Cross-Post by Default</Label>
                        <p className="text-sm text-[var(--text-tertiary)]">
                          Select all connected platforms by default when creating posts
                        </p>
                      </div>
                      <Switch />
                    </div>
                    
                    <Separator className="bg-[var(--glass-border)]" />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-[var(--text-primary)]">Retry Failed Posts</Label>
                        <p className="text-sm text-[var(--text-tertiary)]">
                          Automatically retry failed platform publishes
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[var(--glass-bg)]">
                  <CardHeader>
                    <CardTitle className="text-[var(--text-primary)]">Notification Settings</CardTitle>
                    <CardDescription className="text-[var(--text-tertiary)]">
                      Control when you receive notifications about broadcasts
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-[var(--text-primary)]">Publish Success</Label>
                        <p className="text-sm text-[var(--text-tertiary)]">
                          Notify when posts are successfully published
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <Separator className="bg-[var(--glass-border)]" />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-[var(--text-primary)]">Publish Failures</Label>
                        <p className="text-sm text-[var(--text-tertiary)]">
                          Notify when posts fail to publish
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <Separator className="bg-[var(--glass-border)]" />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-[var(--text-primary)]">Token Expiration</Label>
                        <p className="text-sm text-[var(--text-tertiary)]">
                          Notify when platform tokens are about to expire
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        {/* Disconnect confirmation dialog */}
        <AlertDialog 
          open={!!disconnectDialog} 
          onOpenChange={() => setDisconnectDialog(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect Account</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to disconnect {disconnectDialog?.accountName}? 
                You won't be able to publish to this account until you reconnect.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDisconnect}
                className="bg-red-600 hover:bg-red-700"
                disabled={isLoading}
              >
                {isLoading ? 'Disconnecting...' : 'Disconnect'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}

export default BroadcastSettings;
