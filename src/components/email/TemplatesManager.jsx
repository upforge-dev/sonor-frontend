import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Trash2, Edit, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import { toast } from 'sonner'

export default function TemplatesManager() {
  const [templates, setTemplates] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    html: '',
    text: '',
  })

  const handleSave = async () => {
    if (!formData.name || !formData.subject || !formData.html) {
      toast.error('Fill in name, subject, and HTML')
      return
    }

    setIsLoading(true)
    try {
      if (editingId) {
        toast.success('Template updated')
      } else {
        toast.success('Template created')
      }
      setFormData({ name: '', subject: '', html: '', text: '' })
      setEditingId(null)
      setShowDialog(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save template')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id) => {
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Email Templates</h2>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Template' : 'Create Template'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Welcome Series"
                />
              </div>
              <div>
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Subject line"
                />
              </div>
              <div>
                <Label htmlFor="html">HTML Content</Label>
                <Textarea
                  id="html"
                  value={formData.html}
                  onChange={(e) => setFormData({ ...formData, html: e.target.value })}
                  className="font-mono min-h-48"
                  placeholder="HTML email content"
                />
              </div>
              <div>
                <Label htmlFor="text">Plain Text (optional)</Label>
                <Textarea
                  id="text"
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  className="min-h-20"
                  placeholder="Plain text alternative"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-[var(--text-secondary)]">No templates yet. Create your first one!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{template.name}</CardTitle>
                    <CardDescription>{template.subject}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingId(template.id)
                        setFormData(template)
                        setShowDialog(true)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
