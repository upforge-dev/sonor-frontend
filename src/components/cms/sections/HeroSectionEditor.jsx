/**
 * HeroSectionEditor - Editor for Hero section type.
 * Fields: headline (PT), subheadline (PT), ctaText, ctaLink, backgroundImage.
 */
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PortableTextEditor } from '../editor/PortableTextEditor'
import { CmsImagePicker } from '../editor/CmsImagePicker'

export default function HeroSectionEditor({ data = {}, onChange }) {
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
          minHeight="80px"
        />
      </div>

      <div>
        <Label className="text-xs font-medium text-muted-foreground">Subheadline</Label>
        <PortableTextEditor
          value={data.subheadline || []}
          onChange={(blocks) => update('subheadline', blocks)}
          minHeight="60px"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="hero-cta-text" className="text-xs font-medium text-muted-foreground">CTA Text</Label>
          <Input
            id="hero-cta-text"
            value={data.ctaText || ''}
            onChange={(e) => update('ctaText', e.target.value)}
            placeholder="e.g. Get Started"
          />
        </div>
        <div>
          <Label htmlFor="hero-cta-link" className="text-xs font-medium text-muted-foreground">CTA Link</Label>
          <Input
            id="hero-cta-link"
            value={data.ctaLink || ''}
            onChange={(e) => update('ctaLink', e.target.value)}
            placeholder="e.g. /contact"
          />
        </div>
      </div>

      <CmsImagePicker
        label="Background Image"
        value={data.backgroundImage || null}
        onChange={(img) => update('backgroundImage', img)}
      />
    </div>
  )
}
