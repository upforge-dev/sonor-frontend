/**
 * FaqSectionEditor - Editor for FAQ section type.
 * Fields: items[{ question, answer (PT) }].
 */
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { PortableTextEditor } from '../editor/PortableTextEditor'

export default function FaqSectionEditor({ data = {}, onChange }) {
  const items = data.items || []

  const updateItems = (next) => {
    onChange({ ...data, items: next })
  }

  const updateItem = (index, field, value) => {
    const next = [...items]
    next[index] = { ...next[index], [field]: value }
    updateItems(next)
  }

  const addItem = () => {
    updateItems([...items, { question: '', answer: [] }])
  }

  const removeItem = (index) => {
    updateItems(items.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <Card key={i}>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">FAQ {i + 1}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(i)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Question</Label>
              <Input
                value={item.question || ''}
                onChange={(e) => updateItem(i, 'question', e.target.value)}
                placeholder="Enter the question..."
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Answer</Label>
              <PortableTextEditor
                value={item.answer || []}
                onChange={(blocks) => updateItem(i, 'answer', blocks)}
                minHeight="80px"
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" size="sm" onClick={addItem}>
        <Plus className="h-4 w-4 mr-1.5" />
        Add FAQ
      </Button>
    </div>
  )
}
