/**
 * TestimonialsSectionEditor - Editor for Testimonials section type.
 * Fields: items[{ quote (PT), author, role, avatar }], layout.
 */
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { PortableTextEditor } from '../editor/PortableTextEditor'

export default function TestimonialsSectionEditor({ data = {}, onChange }) {
  const items = data.items || []

  const update = (field, value) => {
    onChange({ ...data, [field]: value })
  }

  const updateItem = (index, field, value) => {
    const next = [...items]
    next[index] = { ...next[index], [field]: value }
    update('items', next)
  }

  const addItem = () => {
    update('items', [...items, { quote: [], author: '', role: '' }])
  }

  const removeItem = (index) => {
    update('items', items.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-medium text-muted-foreground">Layout</Label>
        <Select value={data.layout || 'carousel'} onValueChange={(v) => update('layout', v)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="carousel">Carousel</SelectItem>
            <SelectItem value="grid">Grid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {items.map((item, i) => (
        <Card key={i}>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Testimonial {i + 1}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(i)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Quote</Label>
              <PortableTextEditor
                value={item.quote || []}
                onChange={(blocks) => updateItem(i, 'quote', blocks)}
                minHeight="60px"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Author</Label>
                <Input
                  value={item.author || ''}
                  onChange={(e) => updateItem(i, 'author', e.target.value)}
                  placeholder="Author name"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Role</Label>
                <Input
                  value={item.role || ''}
                  onChange={(e) => updateItem(i, 'role', e.target.value)}
                  placeholder="CEO, Founder, etc."
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" size="sm" onClick={addItem}>
        <Plus className="h-4 w-4 mr-1.5" />
        Add Testimonial
      </Button>
    </div>
  )
}
