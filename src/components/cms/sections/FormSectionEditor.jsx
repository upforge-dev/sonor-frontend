/**
 * FormSectionEditor - Editor for Form section type.
 * Fields: formSlug, heading (PT).
 */
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PortableTextEditor } from '../editor/PortableTextEditor'

export default function FormSectionEditor({ data = {}, onChange }) {
  const update = (field, value) => {
    onChange({ ...data, [field]: value })
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="form-slug" className="text-xs font-medium text-muted-foreground">Form Slug</Label>
        <Input
          id="form-slug"
          value={data.formSlug || ''}
          onChange={(e) => update('formSlug', e.target.value)}
          placeholder="e.g. contact-form"
        />
        <p className="text-xs text-muted-foreground mt-1">
          The slug of the form created in the Forms module.
        </p>
      </div>

      <div>
        <Label className="text-xs font-medium text-muted-foreground">Heading</Label>
        <PortableTextEditor
          value={data.heading || []}
          onChange={(blocks) => update('heading', blocks)}
          minHeight="60px"
        />
      </div>
    </div>
  )
}
