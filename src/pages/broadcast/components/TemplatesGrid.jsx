// src/pages/broadcast/components/TemplatesGrid.jsx
import React, { useState, useEffect } from 'react';
import { Plus, MoreHorizontal, Edit, Copy, Trash2, Sparkles, FileText, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { 
  useBroadcastTemplates,
  useBroadcastConnections,
  useCreateBroadcastTemplate,
  useUpdateBroadcastTemplate,
  useDeleteBroadcastTemplate,
} from '@/lib/hooks';
import useAuthStore from '@/lib/auth-store';
import { EmptyState } from '@/components/EmptyState';
import { PlatformIcon, PlatformSelector } from './PlatformIcon';

const TEMPLATE_CATEGORIES = [
  { id: 'all', label: 'All Templates' },
  { id: 'promotional', label: 'Promotional' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'announcement', label: 'Announcements' },
  { id: 'holiday', label: 'Holiday' },
  { id: 'custom', label: 'Custom' },
];

function TemplateEditor({ 
  open, 
  onClose, 
  template = null,
}) {
  const { currentProject } = useAuthStore();
  const selectedProjectId = currentProject?.id;
  
  const { data: connections = [] } = useBroadcastConnections(selectedProjectId);
  const createTemplateMutation = useCreateBroadcastTemplate();
  const updateTemplateMutation = useUpdateBroadcastTemplate();
  
  // Memoize connected platforms to prevent infinite re-renders
  const connectedPlatforms = React.useMemo(() => 
    connections.filter((c) => c.status === 'active').map((c) => c.platform),
    [connections]
  );

  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [platforms, setPlatforms] = useState([]);
  const [category, setCategory] = useState('custom');
  const [hashtags, setHashtags] = useState([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Only update state when dialog opens with a template
  useEffect(() => {
    if (!open) return;
    
    if (template) {
      setName(template.name || '');
      setContent(template.content || '');
      setPlatforms(template.platforms || []);
      setCategory(template.category || 'custom');
      setHashtags(template.suggestedHashtags || template.hashtags || []);
    } else {
      setName('');
      setContent('');
      setPlatforms([]);
      setCategory('custom');
      setHashtags([]);
    }
  }, [open, template?.id]);

  const handleHashtagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = hashtagInput.trim().replace(/^#/, '');
      if (tag && !hashtags.includes(tag)) {
        setHashtags([...hashtags, tag]);
        setHashtagInput('');
      }
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      const data = {
        name: name.trim(),
        content: content.trim(),
        platforms,
        category,
        hashtags,
      };

      if (template) {
        await updateTemplateMutation.mutateAsync({ id: template.id, projectId: selectedProjectId, data });
      } else {
        await createTemplateMutation.mutateAsync({ projectId: selectedProjectId, data });
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit Template' : 'Create Template'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Template Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Weekly Promotion"
            />
          </div>

          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your template content here... Use {{variable}} for dynamic content"
              className="min-h-[120px]"
            />
            <p className="text-xs text-[var(--text-tertiary)]">
              Tip: Use {"{{business_name}}"}, {"{{date}}"}, {"{{offer}}"} for dynamic content
            </p>
          </div>

          <div className="space-y-2">
            <Label>Platforms</Label>
            <PlatformSelector
              platforms={connectedPlatforms.length ? connectedPlatforms : ['facebook', 'instagram', 'linkedin', 'gbp', 'tiktok']}
              selected={platforms}
              onChange={setPlatforms}
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_CATEGORIES.slice(1).map((cat) => (
                <Button
                  key={cat.id}
                  type="button"
                  variant={category === cat.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategory(cat.id)}
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Default Hashtags</Label>
            <div className="flex flex-wrap gap-1.5 rounded-lg border p-2">
              {hashtags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  #{tag}
                  <button
                    type="button"
                    onClick={() => setHashtags(hashtags.filter((t) => t !== tag))}
                    className="ml-0.5 hover:text-red-500"
                  >
                    ×
                  </button>
                </Badge>
              ))}
              <Input
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyDown={handleHashtagKeyDown}
                placeholder="Add hashtag..."
                className="h-6 flex-1 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim() || !content.trim()}
          >
            {isSubmitting ? 'Saving...' : template ? 'Save Changes' : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplateCard({ template, onEdit, onUse }) {
  const { currentProject } = useAuthStore();
  const projectId = currentProject?.id;
  
  const deleteTemplateMutation = useDeleteBroadcastTemplate();
  const createTemplateMutation = useCreateBroadcastTemplate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = async () => {
    deleteTemplateMutation.mutate({ id: template.id, projectId }, {
      onSuccess: () => setShowDeleteDialog(false),
    });
  };

  const handleDuplicate = async () => {
    createTemplateMutation.mutate({ 
      projectId, 
      data: {
        name: `${template.name} (Copy)`,
        content: template.content,
        platforms: template.platforms,
        category: template.category,
        hashtags: template.hashtags,
      }
    });
  };

  const isLoading = deleteTemplateMutation.isPending;

  return (
    <>
      <Card className="group bg-[var(--glass-bg)] transition-shadow hover:shadow-md">
        <CardContent className="p-4">
          {/* Header */}
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h3 className="font-medium text-[var(--text-primary)]">{template.name}</h3>
              <Badge variant="outline" className="mt-1 text-xs capitalize border-[var(--glass-border)]">
                {template.category || 'custom'}
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(template)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Content preview */}
          <p className="mb-3 line-clamp-3 text-sm text-[var(--text-secondary)]">
            {template.content}
          </p>

          {/* Platforms */}
          {template.platforms?.length > 0 && (
            <div className="mb-3 flex items-center gap-1">
              {template.platforms.map((platform) => (
                <PlatformIcon key={platform} platform={platform} size={16} />
              ))}
            </div>
          )}

          {/* Hashtags */}
          {template.hashtags?.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1">
              {template.hashtags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs border-[var(--glass-border)] text-[var(--text-secondary)]">
                  #{tag}
                </Badge>
              ))}
              {template.hashtags.length > 3 && (
                <Badge variant="outline" className="text-xs border-[var(--glass-border)] text-[var(--text-tertiary)]">
                  +{template.hashtags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[var(--glass-border)] pt-3">
            <span className="text-xs text-[var(--text-tertiary)]">
              Used {template.useCount || 0} times
            </span>
            <Button size="sm" className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white hover:opacity-90" onClick={() => onUse(template)}>
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Use Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{template.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function TemplatesGrid({ searchQuery = '', onUseTemplate }) {
  const { currentProject } = useAuthStore();
  const selectedProjectId = currentProject?.id;
  
  const { data: templates = [] } = useBroadcastTemplates(selectedProjectId);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = !searchQuery || 
      template.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.content?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || 
      template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setEditingTemplate(null);
  };

  return (
    <div className="space-y-6">
      {/* Category tabs + Create button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {TEMPLATE_CATEGORIES.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label}
            </Button>
          ))}
        </div>
        <Button onClick={() => setShowEditor(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Templates grid */}
      {filteredTemplates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No templates yet"
          description="Create reusable templates to speed up your workflow"
          actionLabel="Create Template"
          onAction={() => setShowEditor(true)}
          echoPrompt="Help me create a reusable post template"
          echoActions={[
            { label: 'Write a template', prompt: 'Help me write a reusable social media post template for my business' },
            { label: 'Template ideas', prompt: 'What types of post templates should every business have?' },
            { label: 'Engagement tips', prompt: 'What makes a social media post template high-performing?' },
          ]}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={handleEdit}
              onUse={onUseTemplate}
            />
          ))}
        </div>
      )}

      {/* Template editor dialog */}
      <TemplateEditor
        open={showEditor}
        onClose={handleCloseEditor}
        template={editingTemplate}
      />
    </div>
  );
}

export default TemplatesGrid;
