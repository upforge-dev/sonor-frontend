// src/pages/broadcast/components/MediaLibrary.jsx
import React, { useState, useEffect } from 'react';
import {
  Palette,
  Hash,
  Music,
  Image,
  Video,
  Folder,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  Upload,
  MoreHorizontal,
  Trash2,
  Edit2,
  Copy,
  Download,
  Clock,
  FileImage,
  FileVideo,
  File,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useBroadcastStore } from '@/stores/broadcastStore';
import useAuthStore from '@/lib/auth-store';
import { filesApi } from '@/lib/sonor-api';
import { TemplatesGrid } from './TemplatesGrid';
import { HashtagSets } from './HashtagSets';
import { toast } from 'sonner';

const FOLDERS = [
  { id: 'all', name: 'All Media', count: 24 },
  { id: 'products', name: 'Products', count: 12 },
  { id: 'team', name: 'Team', count: 5 },
  { id: 'videos', name: 'Videos', count: 4 },
  { id: 'stories', name: 'Story Assets', count: 3 },
];

function formatFileSize(bytes) {
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return bytes + ' B';
}

function MediaCard({ asset, onSelect, onDelete }) {
  const Icon = asset.type === 'image' ? FileImage : asset.type === 'video' ? FileVideo : File;
  
  return (
    <Card className="group relative overflow-hidden border-[var(--glass-border)] bg-[var(--glass-bg)] transition-all hover:shadow-md">
      <div className="aspect-square overflow-hidden bg-[var(--surface-secondary)]">
        {asset.type === 'image' ? (
          <img
            src={asset.thumbnail}
            alt={asset.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : asset.type === 'video' ? (
          <div className="relative h-full w-full">
            <img
              src={asset.thumbnail}
              alt={asset.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Video className="h-8 w-8 text-white" />
            </div>
            {asset.duration && (
              <Badge className="absolute bottom-2 right-2 bg-black/70 text-white">
                {Math.floor(asset.duration / 60)}:{String(asset.duration % 60).padStart(2, '0')}
              </Badge>
            )}
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon className="h-12 w-12 text-[var(--text-tertiary)]" />
          </div>
        )}
        
        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            size="sm"
            onClick={() => onSelect?.(asset)}
            className="bg-white text-[var(--brand-primary)] hover:bg-gray-100"
          >
            <Plus className="mr-1 h-4 w-4" />
            Use
          </Button>
        </div>
      </div>
      
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">
              {asset.name}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              {asset.dimensions} • {formatFileSize(asset.size)}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-[var(--text-tertiary)]"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Copy className="mr-2 h-4 w-4" />
                Copy URL
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit2 className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 dark:text-red-400"
                onClick={() => onDelete?.(asset)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

function MediaGrid({ searchQuery, onSelectMedia }) {
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [isDragging, setIsDragging] = useState(false);
  const [media, setMedia] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { activeProjectId } = useAuthStore();

  // Fetch media from files API
  useEffect(() => {
    async function fetchMedia() {
      if (!activeProjectId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await filesApi.listFiles({
          project_id: activeProjectId,
          content_type: 'image,video', // Only images and videos for media library
          folder_path: selectedFolder === 'all' ? undefined : selectedFolder,
        });
        
        // Transform API response to expected format
        const files = response?.data?.files || response?.files || [];
        const transformedMedia = files.map(file => ({
          id: file.id,
          name: file.name || file.file_name,
          type: file.content_type?.startsWith('video/') ? 'video' : 'image',
          url: file.url || file.public_url,
          thumbnail: file.thumbnail_url || file.url || file.public_url,
          size: file.size || file.file_size || 0,
          dimensions: file.metadata?.dimensions || 'Unknown',
          duration: file.metadata?.duration,
          createdAt: new Date(file.created_at),
          folder: file.folder_path || 'root',
        }));
        
        setMedia(transformedMedia);
      } catch (error) {
        console.error('Error fetching media:', error);
        toast.error('Failed to load media files');
      } finally {
        setIsLoading(false);
      }
    }

    fetchMedia();
  }, [activeProjectId, selectedFolder]);

  const filteredMedia = media.filter((asset) => {
    const matchesSearch = !searchQuery ||
      asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = selectedFolder === 'all' || asset.folder === selectedFolder;
    return matchesSearch && matchesFolder;
  });

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    // Handle file upload
    const files = Array.from(e.dataTransfer.files);
    toast.success(`Uploading ${files.length} file(s)...`);
  };

  return (
    <div className="flex gap-6">
      {/* Folder Sidebar */}
      <div className="w-48 flex-shrink-0 space-y-1">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          Folders
        </p>
        {FOLDERS.map((folder) => (
          <button
            key={folder.id}
            onClick={() => setSelectedFolder(folder.id)}
            className={cn(
              'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
              selectedFolder === folder.id
                ? 'bg-[var(--brand-primary)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]'
            )}
          >
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4" />
              {folder.name}
            </div>
            <span className="text-xs opacity-70">{folder.count}</span>
          </button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 w-full justify-start text-[var(--text-tertiary)]"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Folder
        </Button>
      </div>

      {/* Media Grid */}
      <div className="flex-1">
        {/* Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'mb-6 flex items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
            isDragging
              ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
              : 'border-[var(--glass-border)] bg-[var(--surface-secondary)]/30'
          )}
        >
          <div className="text-center">
            <Upload className="mx-auto mb-2 h-8 w-8 text-[var(--text-tertiary)]" />
            <p className="text-sm text-[var(--text-primary)]">
              Drop files here or{' '}
              <label className="cursor-pointer text-[var(--brand-primary)] hover:underline">
                browse
                <input type="file" multiple className="hidden" />
              </label>
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              Supports: JPG, PNG, GIF, MP4, MOV up to 100MB
            </p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex h-40 flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Loading media...</p>
          </div>
        )}

        {/* Grid */}
        {!isLoading && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filteredMedia.map((asset) => (
              <MediaCard
                key={asset.id}
                asset={asset}
                onSelect={onSelectMedia}
                onDelete={(asset) => toast.success(`Deleted ${asset.name}`)}
              />
            ))}
          </div>
        )}

        {!isLoading && filteredMedia.length === 0 && (
          <div className="flex h-40 flex-col items-center justify-center text-center">
            <Image className="mb-3 h-12 w-12 text-[var(--text-tertiary)]" />
            <p className="text-[var(--text-secondary)]">No media found</p>
            <p className="text-sm text-[var(--text-tertiary)]">
              Upload some files to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function MediaLibrary({ searchQuery, onUseTemplate, onSelectMedia }) {
  const [activeTab, setActiveTab] = useState('templates');

  return (
    <div className="space-y-6">
      {/* Library Sub-Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList className="bg-[var(--surface-secondary)] p-1">
            <TabsTrigger value="templates" className="gap-2 data-[state=active]:bg-[var(--glass-bg)]">
              <Palette className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="media" className="gap-2 data-[state=active]:bg-[var(--glass-bg)]">
              <Image className="h-4 w-4" />
              Media
            </TabsTrigger>
            <TabsTrigger value="hashtags" className="gap-2 data-[state=active]:bg-[var(--glass-bg)]">
              <Hash className="h-4 w-4" />
              Hashtag Sets
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="templates" className="mt-6">
          <TemplatesGrid
            searchQuery={searchQuery}
            onUseTemplate={onUseTemplate}
          />
        </TabsContent>

        <TabsContent value="media" className="mt-6">
          <MediaGrid
            searchQuery={searchQuery}
            onSelectMedia={onSelectMedia}
          />
        </TabsContent>

        <TabsContent value="hashtags" className="mt-6">
          <HashtagSets />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MediaLibrary;
