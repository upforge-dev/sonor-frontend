/**
 * CtaSectionEditor - Editor for Call to Action section type.
 * Fields: headline (PT), description (PT), buttonText, buttonLink.
 */
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PortableTextEditor } from '../editor/PortableTextEditor'

export default function CtaSectionEditor({ data = {}, onChange }) {
  const update = (field, value) => {
    onChange({ ...data, [field]: value })
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-medium text-muted-foreground">Headline</Label>
        <PortableTextEditor
          value={data.headline || []}
          onChange={(blocks) => update('headline', blocks)}
          minHeight="60px"
        />
      </div>

      <div>
        <Label className="text-xs font-medium text-muted-foreground">Description</Label>
        <PortableTextEditor
          value={data.description || []}
          onChange={(blocks) => update('description', blocks)}
          minHeight="80px"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="cta-btn-text" className="text-xs font-medium text-muted-foreground">Button Text</Label>
          <Input
            id="cta-btn-text"
            value={data.buttonText || ''}
            onChange={(e) => update('buttonText', e.target.value)}
            placeholder="e.g. Learn More"
          />
        </div>
        <div>
          <Label htmlFor="cta-btn-link" className="text-xs font-medium text-muted-foreground">Button Link</Label>
          <Input
            id="cta-btn-link"
            value={data.buttonLink || ''}
            onChange={(e) => update('buttonLink', e.target.value)}
            placeholder="e.g. /pricing"
          />
        </div>
      </div>
    </div>
  )
}
