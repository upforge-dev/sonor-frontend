import { useEffect, useRef, useState, useCallback } from 'react'
// GrapesJS loaded dynamically to reduce bundle size
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
import { ArrowLeft, Save, Eye, Code, Smartphone, Monitor, Tablet, ImageIcon, Layout, Undo, Redo, Trash2 } from 'lucide-react'
import ImageLibrary from './ImageLibrary'
import TemplateGallery from './TemplateGallery'

// Custom email blocks configuration
const emailBlocks = [
  {
    id: 'email-header',
    label: 'Header',
    category: 'Layout',
    content: `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #3b82f6;">
        <tr>
          <td style="padding: 20px; text-align: center;">
            <img src="https://via.placeholder.com/150x50?text=Logo" alt="Logo" style="max-width: 150px; height: auto;" />
          </td>
        </tr>
      </table>
    `,
    attributes: { class: 'gjs-block-header' }
  },
  {
    id: 'email-text',
    label: 'Text Section',
    category: 'Content',
    content: `
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 20px 40px; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333;">
            <p style="margin: 0 0 16px 0;">Hello {{first_name}},</p>
            <p style="margin: 0;">This is your email content. Edit this text to add your message.</p>
          </td>
        </tr>
      </table>
    `,
    attributes: { class: 'gjs-block-text' }
  },
  {
    id: 'email-heading',
    label: 'Heading',
    category: 'Content',
    content: `
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 20px 40px;">
            <h1 style="margin: 0; font-family: Arial, sans-serif; font-size: 28px; font-weight: bold; color: #1a1a1a;">
              Your Headline Here
            </h1>
          </td>
        </tr>
      </table>
    `,
    attributes: { class: 'gjs-block-heading' }
  },
  {
    id: 'email-button',
    label: 'Button',
    category: 'Content',
    content: `
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 20px 40px; text-align: center;">
            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
              <tr>
                <td style="background-color: #3b82f6; border-radius: 6px;">
                  <a href="#" style="display: inline-block; padding: 14px 32px; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; color: #ffffff; text-decoration: none;">
                    Click Here
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `,
    attributes: { class: 'gjs-block-button' }
  },
  {
    id: 'email-image',
    label: 'Image',
    category: 'Content',
    content: `
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 20px 40px; text-align: center;">
            <img src="https://via.placeholder.com/560x300?text=Your+Image" alt="Image" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" />
          </td>
        </tr>
      </table>
    `,
    attributes: { class: 'gjs-block-image' }
  },
  {
    id: 'email-divider',
    label: 'Divider',
    category: 'Layout',
    content: `
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 20px 40px;">
            <hr style="border: 0; border-top: 1px solid #e5e5e5; margin: 0;" />
          </td>
        </tr>
      </table>
    `,
    attributes: { class: 'gjs-block-divider' }
  },
  {
    id: 'email-spacer',
    label: 'Spacer',
    category: 'Layout',
    content: `
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="height: 40px;"></td>
        </tr>
      </table>
    `,
    attributes: { class: 'gjs-block-spacer' }
  },
  {
    id: 'email-two-columns',
    label: '2 Columns',
    category: 'Layout',
    content: `
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 20px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="48%" valign="top" style="padding-right: 2%;">
                  <p style="margin: 0; font-family: Arial, sans-serif; font-size: 14px; color: #333333;">
                    Left column content goes here.
                  </p>
                </td>
                <td width="48%" valign="top" style="padding-left: 2%;">
                  <p style="margin: 0; font-family: Arial, sans-serif; font-size: 14px; color: #333333;">
                    Right column content goes here.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `,
    attributes: { class: 'gjs-block-columns' }
  },
  {
    id: 'email-three-columns',
    label: '3 Columns',
    category: 'Layout',
    content: `
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 20px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="32%" valign="top" style="padding-right: 1%;">
                  <p style="margin: 0; font-family: Arial, sans-serif; font-size: 14px; color: #333333;">
                    Column 1
                  </p>
                </td>
                <td width="32%" valign="top" style="padding: 0 1%;">
                  <p style="margin: 0; font-family: Arial, sans-serif; font-size: 14px; color: #333333;">
                    Column 2
                  </p>
                </td>
                <td width="32%" valign="top" style="padding-left: 1%;">
                  <p style="margin: 0; font-family: Arial, sans-serif; font-size: 14px; color: #333333;">
                    Column 3
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `,
    attributes: { class: 'gjs-block-columns-3' }
  },
  {
    id: 'email-social',
    label: 'Social Links',
    category: 'Content',
    content: `
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 20px 40px; text-align: center;">
            <a href="#" style="display: inline-block; margin: 0 8px;">
              <img src="https://via.placeholder.com/32x32?text=f" alt="Facebook" width="32" height="32" style="display: block;" />
            </a>
            <a href="#" style="display: inline-block; margin: 0 8px;">
              <img src="https://via.placeholder.com/32x32?text=t" alt="Twitter" width="32" height="32" style="display: block;" />
            </a>
            <a href="#" style="display: inline-block; margin: 0 8px;">
              <img src="https://via.placeholder.com/32x32?text=in" alt="LinkedIn" width="32" height="32" style="display: block;" />
            </a>
            <a href="#" style="display: inline-block; margin: 0 8px;">
              <img src="https://via.placeholder.com/32x32?text=ig" alt="Instagram" width="32" height="32" style="display: block;" />
            </a>
          </td>
        </tr>
      </table>
    `,
    attributes: { class: 'gjs-block-social' }
  },
  {
    id: 'email-footer',
    label: 'Footer',
    category: 'Layout',
    content: `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5;">
        <tr>
          <td style="padding: 30px 40px; text-align: center; font-family: Arial, sans-serif; font-size: 12px; color: #666666;">
            <p style="margin: 0 0 8px 0;">
              © 2025 Your Company Name. All rights reserved.
            </p>
            <p style="margin: 0 0 8px 0;">
              123 Main Street, City, State 12345
            </p>
            <p style="margin: 0;">
              <a href="{{unsubscribe_url}}" style="color: #3b82f6; text-decoration: underline;">Unsubscribe</a>
              &nbsp;|&nbsp;
              <a href="#" style="color: #3b82f6; text-decoration: underline;">View in browser</a>
            </p>
          </td>
        </tr>
      </table>
    `,
    attributes: { class: 'gjs-block-footer' }
  },
  {
    id: 'email-hero',
    label: 'Hero Section',
    category: 'Sections',
    content: `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #3b82f6;">
        <tr>
          <td style="padding: 60px 40px; text-align: center;">
            <h1 style="margin: 0 0 16px 0; font-family: Arial, sans-serif; font-size: 36px; font-weight: bold; color: #ffffff;">
              Your Hero Headline
            </h1>
            <p style="margin: 0 0 24px 0; font-family: Arial, sans-serif; font-size: 18px; color: #ffffff; opacity: 0.9;">
              A compelling subheadline that explains your offer
            </p>
            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
              <tr>
                <td style="background-color: #ffffff; border-radius: 6px;">
                  <a href="#" style="display: inline-block; padding: 14px 32px; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; color: #3b82f6; text-decoration: none;">
                    Get Started
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `,
    attributes: { class: 'gjs-block-hero' }
  },
  {
    id: 'email-feature',
    label: 'Feature Box',
    category: 'Sections',
    content: `
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 30px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border-radius: 8px;">
              <tr>
                <td style="padding: 30px; text-align: center;">
                  <div style="width: 60px; height: 60px; background-color: #3b82f6; border-radius: 50%; margin: 0 auto 16px; line-height: 60px; font-size: 24px; color: #ffffff;">
                    ★
                  </div>
                  <h3 style="margin: 0 0 12px 0; font-family: Arial, sans-serif; font-size: 20px; font-weight: bold; color: #1a1a1a;">
                    Feature Title
                  </h3>
                  <p style="margin: 0; font-family: Arial, sans-serif; font-size: 14px; color: #666666; line-height: 1.5;">
                    Describe your feature or benefit here. Keep it concise and compelling.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `,
    attributes: { class: 'gjs-block-feature' }
  },
  {
    id: 'email-testimonial',
    label: 'Testimonial',
    category: 'Sections',
    content: `
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 30px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border-left: 4px solid #3b82f6;">
              <tr>
                <td style="padding: 24px;">
                  <p style="margin: 0 0 16px 0; font-family: Georgia, serif; font-size: 18px; font-style: italic; color: #333333; line-height: 1.6;">
                    "This is an amazing testimonial from a satisfied customer. It really helped build trust and credibility."
                  </p>
                  <p style="margin: 0; font-family: Arial, sans-serif; font-size: 14px; color: #666666;">
                    <strong>John Doe</strong><br/>
                    CEO, Example Company
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `,
    attributes: { class: 'gjs-block-testimonial' }
  }
]

// Default email template wrapper
const defaultEmailWrapper = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    td { padding: 0; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; max-width: 600px;">
          <tr>
            <td>
              <!-- Email content goes here -->
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

export default function EmailTemplateEditor({ template, onSave, onBack }) {
  const editorRef = useRef(null)
  const editorInstance = useRef(null)
  const [templateName, setTemplateName] = useState(template?.name || '')
  const [templateCategory, setTemplateCategory] = useState(template?.category || 'marketing')
  const [deviceMode, setDeviceMode] = useState('desktop')
  const [viewMode, setViewMode] = useState('editor') // editor, preview, code
  const [isSaving, setIsSaving] = useState(false)
  const [showImageLibrary, setShowImageLibrary] = useState(false)
  const [showTemplateGallery, setShowTemplateGallery] = useState(!template) // Show on new template
  const [pendingImageCallback, setPendingImageCallback] = useState(null)

  // Handle template selection from gallery
  const handleTemplateSelect = (selectedTemplate) => {
    if (editorInstance.current && selectedTemplate) {
      // Load the selected template HTML into the editor
      editorInstance.current.setComponents(selectedTemplate.html)
      
      // Set the template name if not already set
      if (!templateName) {
        setTemplateName(selectedTemplate.name)
      }
    }
  }

  // Handle image selection from library
  const handleImageSelect = (image) => {
    if (pendingImageCallback) {
      pendingImageCallback(image.url)
      setPendingImageCallback(null)
    } else if (editorInstance.current) {
      // Insert image at cursor or as new component
      const editor = editorInstance.current
      const selected = editor.getSelected()
      
      if (selected && selected.get('type') === 'image') {
        // Update existing image
        selected.set('src', image.url)
        selected.addAttributes({ src: image.url })
      } else {
        // Add new image block
        editor.addComponents(`
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding: 20px 40px; text-align: center;">
                <img src="${image.url}" alt="${image.name}" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" />
              </td>
            </tr>
          </table>
        `)
      }
    }
    setShowImageLibrary(false)
  }

  useEffect(() => {
    if (!editorRef.current || editorInstance.current) return

    // Dynamically load GrapesJS to reduce bundle size
    const initEditor = async () => {
      const grapesjs = (await import('grapesjs')).default
      await import('grapesjs/dist/css/grapes.min.css')
      
      // Initialize GrapesJS
      const editor = grapesjs.init({
      container: editorRef.current,
      height: '100%',
      width: 'auto',
      fromElement: false,
      storageManager: false,
      
      // Canvas configuration for email
      canvas: {
        styles: [
          'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
        ]
      },
      
      // Device manager for responsive preview
      deviceManager: {
        devices: [
          { name: 'Desktop', width: '600px' },
          { name: 'Tablet', width: '480px', widthMedia: '480px' },
          { name: 'Mobile', width: '320px', widthMedia: '320px' }
        ]
      },
      
      // Panels configuration
      panels: {
        defaults: []
      },
      
      // Block manager configuration
      blockManager: {
        appendTo: '.blocks-container',
        blocks: []
      },
      
      // Style manager configuration for email
      styleManager: {
        appendTo: '.styles-container',
        sectors: [
          {
            name: 'Dimension',
            open: true,
            buildProps: ['width', 'height', 'max-width', 'min-height', 'padding', 'margin']
          },
          {
            name: 'Typography',
            open: true,
            buildProps: ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'color', 'line-height', 'text-align', 'text-decoration']
          },
          {
            name: 'Background',
            open: true,
            buildProps: ['background-color', 'background-image']
          },
          {
            name: 'Border',
            open: false,
            buildProps: ['border-radius', 'border']
          }
        ]
      },
      
      // Trait manager configuration
      traitManager: {
        appendTo: '.traits-container'
      },
      
      // Layer manager configuration
      layerManager: {
        appendTo: '.layers-container'
      }
    })

    // Add custom blocks
    const blockManager = editor.BlockManager
    emailBlocks.forEach(block => {
      blockManager.add(block.id, {
        label: block.label,
        category: block.category,
        content: block.content,
        attributes: block.attributes
      })
    })

    // Load existing template content or default
    if (template?.html_content) {
      editor.setComponents(template.html_content)
    } else {
      // Set a starter template
      editor.setComponents(`
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #3b82f6;">
          <tr>
            <td style="padding: 20px; text-align: center;">
              <img src="https://via.placeholder.com/150x50?text=Logo" alt="Logo" style="max-width: 150px; height: auto;" />
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding: 40px; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333;">
              <h1 style="margin: 0 0 20px 0; font-size: 28px; color: #1a1a1a;">Welcome to Your Newsletter</h1>
              <p style="margin: 0 0 16px 0;">Hello {{first_name}},</p>
              <p style="margin: 0 0 16px 0;">Start editing this template by dragging blocks from the sidebar.</p>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5;">
          <tr>
            <td style="padding: 30px 40px; text-align: center; font-family: Arial, sans-serif; font-size: 12px; color: #666666;">
              <p style="margin: 0 0 8px 0;">© 2025 Your Company. All rights reserved.</p>
              <p style="margin: 0;"><a href="{{unsubscribe_url}}" style="color: #3b82f6;">Unsubscribe</a></p>
            </td>
          </tr>
        </table>
      `)
    }

    editorInstance.current = editor
    }
    
    initEditor()

    return () => {
      if (editorInstance.current) {
        editorInstance.current.destroy()
        editorInstance.current = null
      }
    }
  }, [template])

  // Handle device mode changes
  useEffect(() => {
    if (!editorInstance.current) return
    
    const deviceMap = {
      desktop: 'Desktop',
      tablet: 'Tablet',
      mobile: 'Mobile'
    }
    
    editorInstance.current.setDevice(deviceMap[deviceMode])
  }, [deviceMode])

  const handleSave = async () => {
    if (!editorInstance.current) return
    
    setIsSaving(true)
    
    try {
      const html = editorInstance.current.getHtml()
      const css = editorInstance.current.getCss()
      
      // Wrap in email-safe HTML
      const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${templateName || 'Email'}</title>
  <style>
    ${css}
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; max-width: 600px; width: 100%;">
          <tr>
            <td>
              ${html}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim()
      
      await onSave({
        id: template?.id,
        name: templateName,
        category: templateCategory,
        html_content: fullHtml,
        json_content: JSON.stringify(editorInstance.current.getProjectData())
      })
    } finally {
      setIsSaving(false)
    }
  }

  const getCodePreview = () => {
    if (!editorInstance.current) return ''
    return editorInstance.current.getHtml()
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-[var(--glass-bg)]">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center gap-2">
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name..."
              className="w-64"
            />
            <Select value={templateCategory} onValueChange={setTemplateCategory}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="newsletter">Newsletter</SelectItem>
                <SelectItem value="transactional">Transactional</SelectItem>
                <SelectItem value="announcement">Announcement</SelectItem>
                <SelectItem value="welcome">Welcome</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editorInstance.current?.UndoManager?.undo()}
              title="Undo (Ctrl+Z)"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editorInstance.current?.UndoManager?.redo()}
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>

          {/* Device Toggle */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={deviceMode === 'desktop' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setDeviceMode('desktop')}
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant={deviceMode === 'tablet' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setDeviceMode('tablet')}
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button
              variant={deviceMode === 'mobile' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setDeviceMode('mobile')}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>

          {/* Template Gallery Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTemplateGallery(true)}
          >
            <Layout className="h-4 w-4 mr-2" />
            Templates
          </Button>

          {/* Image Library Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImageLibrary(true)}
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Images
          </Button>
          
          {/* Clear Canvas */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm('Clear all content? This cannot be undone.')) {
                editorInstance.current?.setComponents('')
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'editor' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('editor')}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'code' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('code')}
            >
              <Code className="h-4 w-4" />
            </Button>
          </div>
          
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>
      
      {/* Main Editor Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Blocks */}
        <div className="w-64 border-r bg-muted/30 overflow-y-auto">
          <div className="p-4">
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
              Drag & Drop Blocks
            </h3>
            <div className="blocks-container"></div>
          </div>
        </div>
        
        {/* Center - Canvas with Quick Insert */}
        <div className="flex-1 flex flex-col overflow-hidden bg-muted/50">
          {/* Quick Insert Toolbar */}
          {viewMode === 'editor' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-background/80 backdrop-blur-sm border-b border-border">
              <span className="text-xs font-medium text-muted-foreground mr-2">Quick Insert:</span>
              {[
                { label: 'Text', icon: '📝', html: emailBlocks.find(b => b.id === 'email-text')?.content },
                { label: 'Heading', icon: '📌', html: emailBlocks.find(b => b.id === 'email-heading')?.content },
                { label: 'Button', icon: '🔘', html: emailBlocks.find(b => b.id === 'email-button')?.content },
                { label: 'Image', icon: '🖼️', html: emailBlocks.find(b => b.id === 'email-image')?.content },
                { label: 'Divider', icon: '➖', html: emailBlocks.find(b => b.id === 'email-divider')?.content },
                { label: 'Columns', icon: '⬜⬜', html: emailBlocks.find(b => b.id === 'email-two-column')?.content },
              ].map((item) => (
                <Button
                  key={item.label}
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs hover:bg-primary/10 hover:text-primary"
                  onClick={() => {
                    if (editorInstance.current && item.html) {
                      editorInstance.current.addComponents(item.html)
                    }
                  }}
                >
                  <span className="mr-1.5">{item.icon}</span>
                  {item.label}
                </Button>
              ))}
            </div>
          )}
          
          {viewMode === 'editor' ? (
            <div ref={editorRef} className="flex-1 h-full" />
          ) : viewMode === 'code' ? (
            <div className="h-full p-4 overflow-auto">
              <pre className="bg-[var(--glass-bg)] p-4 rounded-lg text-sm overflow-auto h-full">
                <code>{getCodePreview()}</code>
              </pre>
            </div>
          ) : null}
        </div>
        
        {/* Right Sidebar - Styles/Traits */}
        <div className="w-72 border-l bg-muted/30 overflow-y-auto">
          <div className="p-4">
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
              Layers
            </h3>
            <div className="layers-container mb-6"></div>
            
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
              Settings
            </h3>
            <div className="traits-container mb-6"></div>
            
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
              Styles
            </h3>
            <div className="styles-container"></div>
          </div>
        </div>
      </div>
      
      {/* Custom GrapesJS Styles - Enhanced Glass Design */}
      <style>{`
        /* ===== GrapesJS Core Overrides ===== */
        .gjs-one-bg {
          background-color: hsl(var(--card));
        }
        
        .gjs-two-color {
          color: hsl(var(--foreground));
        }
        
        .gjs-three-bg {
          background-color: hsl(var(--muted));
        }
        
        .gjs-four-color, .gjs-four-color-h:hover {
          color: hsl(var(--primary));
        }

        /* ===== Enhanced Block Styles ===== */
        .gjs-block {
          padding: 12px;
          margin: 6px;
          border-radius: 10px;
          background: linear-gradient(
            135deg,
            hsl(var(--card)) 0%,
            hsl(var(--background)) 100%
          );
          border: 1px solid hsl(var(--border));
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: grab;
          position: relative;
          overflow: hidden;
        }
        
        .gjs-block::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(255,255,255,0.1) 0%,
            transparent 50%
          );
          opacity: 0;
          transition: opacity 0.25s;
        }
        
        .gjs-block:hover {
          border-color: hsl(var(--primary) / 0.5);
          background: linear-gradient(
            135deg,
            hsl(var(--primary) / 0.08) 0%,
            hsl(var(--card)) 100%
          );
          box-shadow: 
            0 4px 12px rgba(0,0,0,0.08),
            0 0 0 1px hsl(var(--primary) / 0.2);
          transform: translateY(-2px);
        }
        
        .gjs-block:hover::before {
          opacity: 1;
        }
        
        .gjs-block:active {
          cursor: grabbing;
          transform: scale(0.98);
        }
        
        .gjs-block-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: hsl(var(--foreground));
          margin-top: 6px;
        }
        
        .gjs-block svg {
          width: 24px;
          height: 24px;
          stroke: hsl(var(--muted-foreground));
          transition: stroke 0.2s;
        }
        
        .gjs-block:hover svg {
          stroke: hsl(var(--primary));
        }
        
        /* ===== Category Styles ===== */
        .gjs-block-category {
          border-bottom: 1px solid hsl(var(--border));
          margin-bottom: 4px;
        }
        
        .gjs-block-category .gjs-title {
          background: transparent;
          padding: 12px 8px 8px;
          font-weight: 700;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: hsl(var(--muted-foreground));
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .gjs-block-category .gjs-title::before {
          content: '';
          display: inline-block;
          width: 4px;
          height: 4px;
          background: hsl(var(--primary));
          border-radius: 50%;
        }
        
        .gjs-block-categories {
          background-color: transparent;
        }
        
        .gjs-blocks-c {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          padding: 8px;
        }
        
        /* ===== Layer Styles ===== */
        .gjs-layer {
          background: hsl(var(--card));
          border-radius: 6px;
          margin: 3px 0;
          border: 1px solid transparent;
          transition: all 0.2s;
        }
        
        .gjs-layer:hover {
          background: hsl(var(--accent));
          border-color: hsl(var(--border));
        }
        
        .gjs-layer.gjs-selected {
          background: hsl(var(--primary) / 0.1);
          border-color: hsl(var(--primary) / 0.3);
        }
        
        .gjs-layer-title {
          padding: 8px 10px;
          font-size: 12px;
        }
        
        .gjs-layer-name {
          color: hsl(var(--foreground));
          font-weight: 500;
        }
        
        /* ===== Trait Styles ===== */
        .gjs-trt-trait {
          padding: 10px 0;
          border-bottom: 1px solid hsl(var(--border) / 0.5);
        }
        
        .gjs-trt-trait:last-child {
          border-bottom: none;
        }
        
        .gjs-trt-trait__wrp-title {
          font-size: 11px;
          font-weight: 600;
          color: hsl(var(--foreground));
          margin-bottom: 6px;
        }
        
        .gjs-field {
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          border-radius: 6px;
          transition: all 0.2s;
        }
        
        .gjs-field:focus-within {
          border-color: hsl(var(--primary));
          box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1);
        }
        
        .gjs-field input,
        .gjs-field select,
        .gjs-field textarea {
          color: hsl(var(--foreground));
          background: transparent;
          padding: 8px 10px;
          font-size: 13px;
        }
        
        .gjs-field input::placeholder {
          color: hsl(var(--muted-foreground));
        }
        
        /* ===== Style Manager ===== */
        .gjs-sm-sector {
          border-bottom: 1px solid hsl(var(--border));
          margin-bottom: 4px;
        }
        
        .gjs-sm-sector-title {
          background: transparent;
          padding: 12px 8px 8px;
          font-weight: 700;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: hsl(var(--muted-foreground));
          cursor: pointer;
        }
        
        .gjs-sm-properties {
          padding: 8px;
        }
        
        .gjs-sm-property {
          margin-bottom: 12px;
        }
        
        .gjs-sm-property__label {
          font-size: 11px;
          font-weight: 500;
          color: hsl(var(--muted-foreground));
          margin-bottom: 4px;
        }
        
        .gjs-sm-property .gjs-field {
          background: hsl(var(--background));
        }
        
        /* Color picker enhancement */
        .gjs-field-color-picker {
          border-radius: 4px;
          overflow: hidden;
        }
        
        /* ===== Canvas & Frame ===== */
        .gjs-frame-wrapper {
          background: linear-gradient(
            135deg,
            hsl(var(--muted)) 0%,
            hsl(var(--muted) / 0.8) 100%
          );
        }
        
        .gjs-cv-canvas {
          background: hsl(var(--muted));
        }
        
        .gjs-frame {
          background: white;
          border-radius: 8px;
          box-shadow: 
            0 4px 24px rgba(0,0,0,0.08),
            0 1px 2px rgba(0,0,0,0.04);
        }
        
        /* ===== Selected Component ===== */
        .gjs-selected {
          outline: 2px solid hsl(var(--primary)) !important;
          outline-offset: 1px;
        }
        
        .gjs-hovered {
          outline: 2px dashed hsl(var(--primary) / 0.5) !important;
        }
        
        /* ===== Toolbar ===== */
        .gjs-toolbar {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 8px;
          padding: 4px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          gap: 2px;
        }
        
        .gjs-toolbar-item {
          color: hsl(var(--muted-foreground));
          padding: 6px;
          border-radius: 4px;
          transition: all 0.15s;
        }
        
        .gjs-toolbar-item:hover {
          color: hsl(var(--foreground));
          background: hsl(var(--accent));
        }
        
        /* Delete button red on hover */
        .gjs-toolbar-item[data-gjs-command="core:component-delete"]:hover {
          color: hsl(0 72% 51%);
          background: hsl(0 72% 51% / 0.1);
        }
        
        /* ===== Rich Text Editor ===== */
        .gjs-rte-toolbar {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 8px;
          padding: 4px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .gjs-rte-action {
          color: hsl(var(--foreground));
          border-radius: 4px;
          padding: 6px 8px;
        }
        
        .gjs-rte-action:hover {
          background: hsl(var(--accent));
        }
        
        .gjs-rte-active {
          background: hsl(var(--primary) / 0.1);
          color: hsl(var(--primary));
        }
        
        /* ===== Scrollbar Styling ===== */
        .blocks-container::-webkit-scrollbar,
        .layers-container::-webkit-scrollbar,
        .traits-container::-webkit-scrollbar,
        .styles-container::-webkit-scrollbar {
          width: 6px;
        }
        
        .blocks-container::-webkit-scrollbar-track,
        .layers-container::-webkit-scrollbar-track,
        .traits-container::-webkit-scrollbar-track,
        .styles-container::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .blocks-container::-webkit-scrollbar-thumb,
        .layers-container::-webkit-scrollbar-thumb,
        .traits-container::-webkit-scrollbar-thumb,
        .styles-container::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
          border-radius: 3px;
        }
        
        .blocks-container::-webkit-scrollbar-thumb:hover,
        .layers-container::-webkit-scrollbar-thumb:hover,
        .traits-container::-webkit-scrollbar-thumb:hover,
        .styles-container::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.5);
        }
        
        /* ===== Drag & Drop Indicators ===== */
        .gjs-highlighter {
          outline: 2px dashed hsl(var(--primary));
          outline-offset: 2px;
        }
        
        .gjs-placeholder {
          border: 2px dashed hsl(var(--primary) / 0.5);
          background: hsl(var(--primary) / 0.05);
        }
        
        /* ===== Badge Styling ===== */
        .gjs-badge {
          background: hsl(var(--primary));
          color: white;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
        }
        
        /* ===== Resizer Handles ===== */
        .gjs-resizer-h {
          background: hsl(var(--primary));
          border-radius: 2px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>

      {/* Image Library Modal */}
      <ImageLibrary
        open={showImageLibrary}
        onOpenChange={setShowImageLibrary}
        onSelect={handleImageSelect}
      />

      {/* Template Gallery Modal */}
      <TemplateGallery
        open={showTemplateGallery}
        onOpenChange={setShowTemplateGallery}
        onSelectTemplate={handleTemplateSelect}
      />
    </div>
  )
}
