/**
 * CustomSectionEditor - Editor for Custom section type.
 * Fields: componentName, props (JSON).
 */
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export default function CustomSectionEditor({ data = {}, onChange }) {
  const [propsJson, setPropsJson] = useState(() =>
    data.props ? JSON.stringify(data.props, null, 2) : '{}'
  )

  const update = (field, value) => {
    onChange({ ...data, [field]: value })
  }

  const handlePropsChange = (raw) => {
    setPropsJson(raw)
    try {
      const parsed = JSON.parse(raw)
      update('props', parsed)
    } catch {
      // Don't update on invalid JSON — user is still typing
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="custom-name" className="text-xs font-medium text-muted-foreground">Component Name</Label>
        <Input
          id="custom-name"
          value={data.componentName || ''}
          onChange={(e) => update('componentName', e.target.value)}
          placeholder="e.g. PricingTable"
        />
        <p className="text-xs text-muted-foreground mt-1">
          The name of the component to render in the site. Must be registered in the site's custom section map.
        </p>
      </div>

      <div>
        <Label htmlFor="custom-props" className="text-xs font-medium text-muted-foreground">Props (JSON)</Label>
        <Textarea
          id="custom-props"
          value={propsJson}
          onChange={(e) => handlePropsChange(e.target.value)}
          className="font-mono text-xs"
          rows={8}
          placeholder='{ "columns": 3, "showPrices": true }'
        />
      </div>
    </div>
  )
}
