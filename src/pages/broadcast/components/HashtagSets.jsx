// src/pages/broadcast/components/HashtagSets.jsx
import React, { useState } from 'react';
import {
  Hash,
  Plus,
  Copy,
  Trash2,
  Edit3,
  Check,
  X,
  Sparkles,
  TrendingUp,
  Loader2,
  Search,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/EmptyState';
import { 
  useBroadcastHashtagSets,
  useCreateBroadcastHashtagSet,
  useUpdateBroadcastHashtagSet,
  useDeleteBroadcastHashtagSet,
} from '@/lib/hooks';
import useAuthStore from '@/lib/auth-store';
import { PlatformIcon } from './PlatformIcon';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'realestate', label: 'Real Estate' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'retail', label: 'Retail' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'beauty', label: 'Beauty' },
  { value: 'tech', label: 'Technology' },
  { value: 'custom', label: 'Custom' },
];

const PLATFORM_RECOMMENDATIONS = [
  { id: 'instagram', label: 'Instagram', maxTags: 30 },
  { id: 'tiktok', label: 'TikTok', maxTags: 5 },
  { id: 'facebook', label: 'Facebook', maxTags: 10 },
  { id: 'linkedin', label: 'LinkedIn', maxTags: 5 },
  { id: 'gbp', label: 'Google Business', maxTags: 0 },
];

function HashtagSetEditor({ set, onSave, onCancel, isCreating }) {
  const [name, setName] = useState(set?.name || '');
  const [category, setCategory] = useState(set?.category || 'custom');
  const [hashtags, setHashtags] = useState(set?.hashtags?.join(' ') || '');
  const [bestFor, setBestFor] = useState(set?.bestFor || ['instagram']);
  const [isSaving, setIsSaving] = useState(false);

  const parsedHashtags = hashtags
    .split(/[\s,#]+/)
    .filter(Boolean)
    .map((t) => t.replace(/^#/, ''));

  const handleSave = async () => {
    if (!name.trim() || parsedHashtags.length === 0) {
      toast.error('Name and at least one hashtag are required');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        category,
        hashtags: parsedHashtags,
        bestFor,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const togglePlatform = (platformId) => {
    setBestFor((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId]
    );
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-lg bg-[var(--glass-bg)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[var(--text-primary)]">
            <Hash className="h-5 w-5 text-[var(--brand-primary)]" />
            {isCreating ? 'Create Hashtag Set' : 'Edit Hashtag Set'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label className="text-[var(--text-primary)]">Set Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Marketing General"
              className="bg-[var(--surface-secondary)] border-[var(--glass-border)]"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-[var(--text-primary)]">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-[var(--surface-secondary)] border-[var(--glass-border)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.filter((c) => c.value !== 'all').map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Hashtags */}
          <div className="space-y-2">
            <Label className="text-[var(--text-primary)]">
              Hashtags ({parsedHashtags.length})
            </Label>
            <textarea
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="marketing digitalmarketing socialmedia branding smallbusiness..."
              className="min-h-[100px] w-full rounded-lg border border-[var(--glass-border)] bg-[var(--surface-secondary)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50"
            />
            <p className="text-xs text-[var(--text-tertiary)]">
              Separate with spaces, commas, or # symbols
            </p>
          </div>

          {/* Preview */}
          {parsedHashtags.length > 0 && (
            <div className="space-y-2">
              <Label className="text-[var(--text-primary)]">Preview</Label>
              <div className="flex flex-wrap gap-1.5 rounded-lg border border-[var(--glass-border)] bg-[var(--surface-secondary)] p-3">
                {parsedHashtags.slice(0, 15).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                  >
                    #{tag}
                  </Badge>
                ))}
                {parsedHashtags.length > 15 && (
                  <Badge variant="outline" className="border-[var(--glass-border)] text-[var(--text-tertiary)]">
                    +{parsedHashtags.length - 15} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Best For Platforms */}
          <div className="space-y-2">
            <Label className="text-[var(--text-primary)]">Best For</Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_RECOMMENDATIONS.map((platform) => (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => togglePlatform(platform.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                    bestFor.includes(platform.id)
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                      : 'border-[var(--glass-border)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]'
                  )}
                >
                  <PlatformIcon platform={platform.id} size={14} />
                  {platform.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim() || parsedHashtags.length === 0}
            className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white hover:opacity-90"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                {isCreating ? 'Create Set' : 'Save Changes'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HashtagSetCard({ set, onEdit, onDelete, onCopy }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCopy = () => {
    const hashtagString = set.hashtags.map((t) => `#${t}`).join(' ');
    navigator.clipboard.writeText(hashtagString);
    toast.success('Hashtags copied to clipboard!');
    onCopy?.(set);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(set.id);
      toast.success('Hashtag set deleted');
    } catch (error) {
      toast.error('Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="group bg-[var(--glass-bg)] transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-[var(--text-primary)]">{set.name}</h3>
              <Badge
                variant="outline"
                className="text-xs capitalize border-[var(--glass-border)] text-[var(--text-tertiary)]"
              >
                {set.category || 'custom'}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-[var(--text-tertiary)]">
              {set.hashtags?.length || 0} hashtags
              {set.timesUsed > 0 && ` · Used ${set.timesUsed} times`}
            </p>
          </div>

          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[var(--text-tertiary)] hover:text-[var(--brand-primary)]"
              onClick={handleCopy}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              onClick={() => onEdit(set)}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[var(--text-tertiary)] hover:text-red-500"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Hashtag Preview */}
        <div className="mt-3 flex flex-wrap gap-1">
          {set.hashtags?.slice(0, 8).map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-xs border-[var(--glass-border)] text-[var(--text-secondary)]"
            >
              #{tag}
            </Badge>
          ))}
          {(set.hashtags?.length || 0) > 8 && (
            <Badge variant="outline" className="text-xs border-[var(--glass-border)] text-[var(--text-tertiary)]">
              +{set.hashtags.length - 8}
            </Badge>
          )}
        </div>

        {/* Best For Platforms */}
        {set.bestFor?.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5">
            <span className="text-xs text-[var(--text-tertiary)]">Best for:</span>
            {set.bestFor.map((platform) => (
              <PlatformIcon key={platform} platform={platform} size={14} />
            ))}
          </div>
        )}

        {/* Quick Copy Button */}
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
          onClick={handleCopy}
        >
          <Copy className="mr-2 h-3.5 w-3.5" />
          Copy to Clipboard
        </Button>
      </CardContent>
    </Card>
  );
}

export function HashtagSets({ onSelectHashtags }) {
  const { currentProject } = useAuthStore();
  const projectId = currentProject?.id;

  const { data: hashtagSets = [], isLoading: hashtagSetsLoading } = useBroadcastHashtagSets(projectId);
  const createHashtagSetMutation = useCreateBroadcastHashtagSet();
  const updateHashtagSetMutation = useUpdateBroadcastHashtagSet();
  const deleteHashtagSetMutation = useDeleteBroadcastHashtagSet();

  const [showEditor, setShowEditor] = useState(false);
  const [editingSet, setEditingSet] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const handleCreate = () => {
    setEditingSet(null);
    setShowEditor(true);
  };

  const handleEdit = (set) => {
    setEditingSet(set);
    setShowEditor(true);
  };

  const handleSave = async (data) => {
    if (editingSet) {
      await updateHashtagSetMutation.mutateAsync({ id: editingSet.id, projectId, data });
      toast.success('Hashtag set updated!');
    } else {
      await createHashtagSetMutation.mutateAsync({ projectId, data });
      toast.success('Hashtag set created!');
    }
    setShowEditor(false);
    setEditingSet(null);
  };

  const handleDelete = async (setId) => {
    await deleteHashtagSetMutation.mutateAsync({ id: setId, projectId });
  };

  const handleCopy = (set) => {
    onSelectHashtags?.(set.hashtags);
  };

  const filteredSets = hashtagSets.filter((set) => {
    const matchesSearch =
      !searchQuery ||
      set.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      set.hashtags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      selectedCategory === 'all' || set.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Hashtag Sets</h3>
          <p className="text-sm text-[var(--text-tertiary)]">
            Save and reuse hashtag collections
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white hover:opacity-90"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Set
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search hashtag sets..."
            className="pl-10 bg-[var(--surface-secondary)] border-[var(--glass-border)]"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px] bg-[var(--surface-secondary)] border-[var(--glass-border)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {hashtagSetsLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-primary)]" />
        </div>
      ) : filteredSets.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No hashtag sets yet"
          description="Create reusable hashtag collections for quick access"
          actionLabel="Create Your First Set"
          onAction={handleCreate}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSets.map((set) => (
            <HashtagSetCard
              key={set.id}
              set={set}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onCopy={handleCopy}
            />
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <HashtagSetEditor
          set={editingSet}
          isCreating={!editingSet}
          onSave={handleSave}
          onCancel={() => {
            setShowEditor(false);
            setEditingSet(null);
          }}
        />
      )}
    </div>
  );
}

export default HashtagSets;
