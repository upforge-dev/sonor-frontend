/**
 * RichTextSectionEditor - Editor for Rich Text section type.
 * Fields: content (PT).
 */
import { Label } from '@/components/ui/label'
import { PortableTextEditor } from '../editor/PortableTextEditor'

export default function RichTextSectionEditor({ data = {}, onChange }) {
  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground">Content</Label>
      <PortableTextEditor
        value={data.content || []}
        onChange={(blocks) => onChange({ ...data, content: blocks })}
        minHeight="200px"
      />
    </div>
  )
}
