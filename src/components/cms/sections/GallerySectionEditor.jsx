/**
 * GallerySectionEditor - Editor for Gallery section type.
 * Fields: images (array), layout (grid|masonry|carousel), caption (PT).
 */
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PortableTextEditor } from '../editor/PortableTextEditor'
import { CmsImagePicker } from '../editor/CmsImagePicker'

export default function GallerySectionEditor({ data = {}, onChange }) {
  const update = (field, value) => {
    onChange({ ...data, [field]: value })
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-medium text-muted-foreground">Layout</Label>
        <Select value={data.layout || 'grid'} onValueChange={(v) => update('layout', v)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="grid">Grid</SelectItem>
            <SelectItem value="masonry">Masonry</SelectItem>
            <SelectItem value="carousel">Carousel</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">
          Images ({(data.images || []).length})
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {(data.images || []).map((img, i) => (
            <div key={i} className="relative">
              <CmsImagePicker
                label={`Image ${i + 1}`}
                value={img}
                onChange={(newImg) => {
                  if (newImg) {
                    const next = [...(data.images || [])]
                    next[i] = newImg
                    update('images', next)
                  } else {
                    update('images', (data.images || []).filter((_, j) => j !== i))
                  }
                }}
              />
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => update('images', [...(data.images || []), null])}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Image
        </Button>
      </div>

      <div>
        <Label className="text-xs font-medium text-muted-foreground">Caption</Label>
        <PortableTextEditor
          value={data.caption || []}
          onChange={(blocks) => update('caption', blocks)}
          minHeight="60px"
        />
      </div>
    </div>
  )
}
