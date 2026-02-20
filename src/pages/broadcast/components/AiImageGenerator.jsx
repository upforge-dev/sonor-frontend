// src/pages/broadcast/components/AiImageGenerator.jsx
import React, { useState } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Download,
  Check,
  RefreshCw,
  X,
  Loader2,
  Palette,
  Square,
  RectangleHorizontal,
  RectangleVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import { useBroadcastStore } from '@/stores/broadcastStore';
import useAuthStore from '@/lib/auth-store';

const STYLES = [
  { id: 'realistic', label: 'Photorealistic', description: 'Professional photography style' },
  { id: 'illustration', label: 'Illustration', description: 'Modern digital illustration' },
  { id: 'flat', label: 'Flat Design', description: 'Vector art, bold colors' },
  { id: 'minimal', label: 'Minimalist', description: 'Clean, simple design' },
  { id: 'artistic', label: 'Artistic', description: 'Creative, expressive style' },
  { id: 'vibrant', label: 'Vibrant', description: 'Bright, colorful imagery' },
];

const ASPECT_RATIOS = [
  { id: '1:1', label: 'Square', description: '1:1', icon: Square },
  { id: '16:9', label: 'Landscape', description: '16:9', icon: RectangleHorizontal },
  { id: '9:16', label: 'Portrait', description: '9:16', icon: RectangleVertical },
  { id: '4:5', label: 'Instagram', description: '4:5', icon: RectangleVertical },
];

export function AiImageGenerator({ 
  open, 
  onClose, 
  onSelectImage,
  defaultPrompt = '',
}) {
  const { currentProject } = useAuthStore();
  const projectId = currentProject?.id;
  
  const { generateImages, aiImagesLoading } = useBroadcastStore();

  const [prompt, setPrompt] = useState(defaultPrompt);
  const [style, setStyle] = useState('realistic');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [generatedImages, setGeneratedImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || !projectId) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedImages([]);
    setSelectedImage(null);

    try {
      const images = await generateImages(projectId, prompt, {
        aspectRatio,
        style,
        count: 4,
      });
      setGeneratedImages(images || []);
    } catch (err) {
      setError(err.message || 'Failed to generate images');
      // Generate placeholder images for demo
      setGeneratedImages([
        { id: '1', imageUrl: `https://picsum.photos/seed/${Date.now()}/400/400`, prompt },
        { id: '2', imageUrl: `https://picsum.photos/seed/${Date.now() + 1}/400/400`, prompt },
        { id: '3', imageUrl: `https://picsum.photos/seed/${Date.now() + 2}/400/400`, prompt },
        { id: '4', imageUrl: `https://picsum.photos/seed/${Date.now() + 3}/400/400`, prompt },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectAndUse = () => {
    if (selectedImage) {
      onSelectImage?.(selectedImage);
      onClose();
    }
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto bg-[var(--glass-bg)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[var(--text-primary)]">
            <Sparkles className="h-5 w-5 text-[var(--brand-primary)]" />
            Generate Image with AI
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Left side - Options */}
          <div className="space-y-4">
            {/* Prompt */}
            <div className="space-y-2">
              <Label>Describe your image</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A vibrant, modern illustration of a rocket launching with digital marketing icons trailing behind it..."
                className="min-h-[100px] resize-none"
              />
              <p className="text-xs text-[var(--text-tertiary)]">
                Be specific about style, colors, mood, and subject matter for best results.
              </p>
            </div>

            {/* Style */}
            <div className="space-y-2">
              <Label>Style</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger>
                  <SelectValue placeholder="Select style" />
                </SelectTrigger>
                <SelectContent>
                  {STYLES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex flex-col">
                        <span>{s.label}</span>
                        <span className="text-xs text-[var(--text-tertiary)]">{s.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2">
              <Label>Aspect Ratio</Label>
              <RadioGroup
                value={aspectRatio}
                onValueChange={setAspectRatio}
                className="flex flex-wrap gap-2"
              >
                {ASPECT_RATIOS.map((ar) => {
                  const Icon = ar.icon;
                  return (
                    <Label
                      key={ar.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-colors',
                        aspectRatio === ar.id
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                          : 'border-[var(--glass-border)] hover:bg-[var(--surface-secondary)]'
                      )}
                    >
                      <RadioGroupItem value={ar.id} className="sr-only" />
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{ar.label}</span>
                    </Label>
                  );
                })}
              </RadioGroup>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="w-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white hover:opacity-90"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate 4 Variations
                </>
              )}
            </Button>
          </div>

          {/* Right side - Generated Images */}
          <div className="space-y-4">
            <Label>Generated Images</Label>
            
            {generatedImages.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-[var(--glass-border)] bg-[var(--surface-secondary)]/50">
                <div className="text-center text-[var(--text-tertiary)]">
                  <ImageIcon className="mx-auto mb-2 h-8 w-8 text-[var(--text-tertiary)]" />
                  <p className="text-sm">Your generated images will appear here</p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {generatedImages.map((image) => (
                    <button
                      key={image.id}
                      onClick={() => setSelectedImage(image)}
                      className={cn(
                        'group relative aspect-square overflow-hidden rounded-lg border-2 transition-all',
                        selectedImage?.id === image.id
                          ? 'border-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)] ring-offset-2 ring-offset-[var(--glass-bg)]'
                          : 'border-transparent hover:border-[var(--glass-border)]'
                      )}
                    >
                      <img
                        src={image.imageUrl || image.url}
                        alt={image.prompt}
                        className="h-full w-full object-cover"
                      />
                      {selectedImage?.id === image.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[var(--brand-primary)]/20">
                          <div className="rounded-full bg-[var(--brand-primary)] p-2">
                            <Check className="h-5 w-5 text-white" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={isGenerating}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate
                  </Button>
                </div>
              </>
            )}

            {error && (
              <p className="text-sm text-amber-600">
                Note: Using placeholder images. {error}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSelectAndUse}
            disabled={!selectedImage}
            className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white hover:opacity-90"
          >
            <Check className="mr-2 h-4 w-4" />
            Use Selected Image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AiImageGenerator;
