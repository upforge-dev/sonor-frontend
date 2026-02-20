/**
 * EmailEditor - Universal visual email editor component
 * 
 * A Wix-like drag-and-drop email builder powered by GrapesJS.
 * Use this component for system emails, campaigns, templates, and automations.
 * 
 * @example
 * // Basic usage (system emails)
 * <EmailEditor
 *   title="Welcome Email"
 *   description="Sent to new users"
 *   initialSubject="Welcome to {{company}}!"
 *   initialHtml={htmlTemplate}
 *   variables={[{ name: '{{first_name}}', description: 'User first name' }]}
 *   onSave={({ subject, html }) => saveEmail(subject, html)}
 *   onBack={() => navigate(-1)}
 * />
 * 
 * @example
 * // Template mode with name/category editing
 * <EmailEditor
 *   mode="template"
 *   templateName="Newsletter Template"
 *   templateCategory="newsletter"
 *   onSave={({ name, category, subject, html }) => saveTemplate(data)}
 *   showGallery={true}
 *   showImageLibrary={true}
 * />
 */

import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import useAuthStore from '@/lib/auth-store'
import { useFiles, useUploadFile, filesKeys } from '@/lib/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Eye,
  Code,
  Check,
  Loader2,
  RefreshCw,
  Smartphone,
  Monitor,
  Layout,
  ArrowLeft,
  Maximize2,
  Minimize2,
  Layers,
  Palette,
  MousePointer,
  Undo,
  Redo,
  Trash2,
  Plus,
  ImageIcon,
  LayoutTemplate,
  ChevronDown,
  Type,
  Heading,
  RectangleHorizontal,
  Columns2,
  Columns3,
  SeparatorHorizontal,
  MoveVertical,
  Square,
  Variable,
  GripVertical,
  ExternalLink,
  List,
  Quote,
  Share2,
  Sparkles,
  PanelBottom,
  LayoutPanelLeft,
  MessageSquareQuote
} from 'lucide-react'

// Lazy load heavy components for code splitting
const ImageLibrary = lazy(() => import('./ImageLibrary'))
const TemplateGallery = lazy(() => import('./TemplateGallery'))

// GrapesJS custom styles for a clean, modern look
const GRAPESJS_CUSTOM_STYLES = `
  /* Block Manager */
  .gjs-blocks-c {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 8px !important;
    padding: 0 !important;
  }
  
  .gjs-block-category {
    border: none !important;
    background: transparent !important;
  }
  
  .gjs-block-category .gjs-title {
    background: transparent !important;
    border: none !important;
    padding: 12px 4px 6px !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.5px !important;
    color: hsl(var(--muted-foreground)) !important;
  }
  
  .gjs-block {
    width: 100% !important;
    min-height: 60px !important;
    border: 1px solid hsl(var(--border)) !important;
    border-radius: 8px !important;
    background: hsl(var(--background)) !important;
    box-shadow: none !important;
    padding: 10px 8px !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 4px !important;
    transition: all 0.15s ease !important;
  }
  
  .gjs-block:hover {
    border-color: hsl(var(--primary)) !important;
    background: hsl(var(--accent)) !important;
  }
  
  .gjs-block-label {
    font-size: 11px !important;
    font-weight: 500 !important;
    color: hsl(var(--foreground)) !important;
    text-align: center !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
  }
  
  .gjs-block svg {
    width: 20px !important;
    height: 20px !important;
    margin-bottom: 2px !important;
    opacity: 0.7 !important;
  }
  
  /* Style Manager */
  .gjs-sm-sector {
    border: none !important;
    background: transparent !important;
    margin-bottom: 8px !important;
  }
  
  .gjs-sm-sector .gjs-sm-sector-title {
    background: hsl(var(--muted)) !important;
    border: none !important;
    border-radius: 6px !important;
    padding: 8px 12px !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    color: hsl(var(--foreground)) !important;
  }
  
  .gjs-sm-sector .gjs-sm-properties {
    padding: 12px 8px !important;
    background: transparent !important;
    border: none !important;
  }
  
  .gjs-sm-property {
    margin-bottom: 12px !important;
  }
  
  .gjs-sm-label {
    font-size: 11px !important;
    font-weight: 500 !important;
    color: hsl(var(--muted-foreground)) !important;
    margin-bottom: 4px !important;
  }
  
  .gjs-field {
    background: hsl(var(--background)) !important;
    border: 1px solid hsl(var(--border)) !important;
    border-radius: 6px !important;
    padding: 6px 10px !important;
  }
  
  .gjs-field:focus-within {
    border-color: hsl(var(--primary)) !important;
    box-shadow: 0 0 0 2px hsl(var(--primary) / 0.1) !important;
  }
  
  .gjs-field input,
  .gjs-field select {
    background: transparent !important;
    border: none !important;
    color: hsl(var(--foreground)) !important;
    font-size: 13px !important;
  }
  
  .gjs-radio-items {
    display: flex !important;
    gap: 4px !important;
  }
  
  .gjs-radio-item {
    flex: 1 !important;
    padding: 6px !important;
    background: hsl(var(--background)) !important;
    border: 1px solid hsl(var(--border)) !important;
    border-radius: 6px !important;
    text-align: center !important;
  }
  
  .gjs-radio-item:hover,
  .gjs-radio-item.gjs-selected {
    background: hsl(var(--primary)) !important;
    border-color: hsl(var(--primary)) !important;
    color: white !important;
  }
  
  /* Color picker - enhanced */
  .gjs-field-color {
    border-radius: 6px !important;
    overflow: hidden !important;
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    background: hsl(var(--background)) !important;
    padding: 4px !important;
    border: 1px solid hsl(var(--border)) !important;
  }
  
  .gjs-field-colorp {
    width: 32px !important;
    height: 32px !important;
    border-radius: 6px !important;
    border: 2px solid hsl(var(--border)) !important;
    cursor: pointer !important;
    transition: transform 0.15s ease, box-shadow 0.15s ease !important;
    flex-shrink: 0 !important;
  }
  
  .gjs-field-colorp:hover {
    transform: scale(1.05) !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
  }
  
  .gjs-field-color-picker {
    flex: 1 !important;
    min-width: 80px !important;
  }
  
  .gjs-field-color-picker input {
    width: 100% !important;
    border: none !important;
    background: transparent !important;
    font-size: 12px !important;
    font-family: ui-monospace, monospace !important;
    color: hsl(var(--foreground)) !important;
  }
  
  /* Gradient picker - enhanced */
  .gjs-field-gradient {
    border-radius: 8px !important;
    overflow: hidden !important;
    padding: 8px !important;
    background: hsl(var(--muted)) !important;
  }
  
  .gjs-gradient-preview {
    height: 40px !important;
    border-radius: 6px !important;
    cursor: pointer !important;
    border: 2px solid hsl(var(--border)) !important;
    transition: box-shadow 0.15s ease !important;
  }
  
  .gjs-gradient-preview:hover {
    box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
  }
  
  .gjs-gradient-picker {
    margin-top: 8px !important;
  }
  
  /* Gradient type selector */
  .gjs-sm-property--gradient .gjs-radio-items {
    display: flex !important;
    gap: 4px !important;
    margin-bottom: 8px !important;
  }
  
  /* Slider styling */
  .gjs-field-range {
    display: flex !important;
    align-items: center !important;
    gap: 12px !important;
  }
  
  .gjs-field-range input[type="range"] {
    flex: 1 !important;
    -webkit-appearance: none !important;
    height: 6px !important;
    border-radius: 3px !important;
    background: hsl(var(--border)) !important;
  }
  
  .gjs-field-range input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none !important;
    width: 16px !important;
    height: 16px !important;
    border-radius: 50% !important;
    background: hsl(var(--primary)) !important;
    cursor: pointer !important;
    border: 2px solid white !important;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
  }
  
  .gjs-field-range .gjs-field-integer {
    width: 60px !important;
    text-align: center !important;
  }

  /* Layer Manager */
  .gjs-layers {
    background: transparent !important;
  }
  
  .gjs-layer {
    background: hsl(var(--background)) !important;
    border: 1px solid hsl(var(--border)) !important;
    border-radius: 6px !important;
    margin-bottom: 4px !important;
    padding: 8px !important;
  }
  
  .gjs-layer:hover {
    background: hsl(var(--accent)) !important;
  }
  
  .gjs-layer.gjs-selected {
    border-color: hsl(var(--primary)) !important;
    background: hsl(var(--primary) / 0.1) !important;
  }
  
  .gjs-layer-title {
    font-size: 12px !important;
    color: hsl(var(--foreground)) !important;
  }
  
  /* GrapesJS Editor Container */
  .gjs-editor {
    width: 100% !important;
    height: 100% !important;
  }
  
  .gjs-editor-cont {
    width: 100% !important;
    height: 100% !important;
  }
  
  /* Canvas styling */
  .gjs-cv-canvas {
    width: 100% !important;
    height: 100% !important;
    background: hsl(var(--muted) / 0.4) !important;
  }
  
  .dark .gjs-cv-canvas {
    background: hsl(240 6% 10%) !important;
  }
  
  /* Frame wrapper - the email preview card */
  .gjs-frame-wrapper {
    background: white !important;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12) !important;
    border-radius: 8px !important;
    overflow: hidden !important;
    max-width: 700px !important;
    margin: 32px auto !important;
  }
  
  .gjs-frame {
    background: white !important;
    min-height: 500px !important;
    width: 100% !important;
  }
  
  /* Mobile preview */
  .gjs-dvc-mobile .gjs-frame-wrapper {
    max-width: 375px !important;
  }

  /* Selected component highlight */
  .gjs-selected {
    outline: 2px solid hsl(var(--primary)) !important;
    outline-offset: -2px !important;
  }
  
  /* Toolbar */
  .gjs-toolbar {
    background: hsl(var(--card)) !important;
    border: 1px solid hsl(var(--border)) !important;
    border-radius: 8px !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
    transform: none !important;
    left: 0 !important;
  }
  
  .gjs-toolbar-item {
    padding: 6px 8px !important;
    color: hsl(var(--foreground)) !important;
  }
  
  .gjs-toolbar-item:hover {
    color: hsl(var(--primary)) !important;
  }
  
  /* Rich Text Editor */
  .gjs-rte-toolbar {
    background: hsl(var(--card)) !important;
    border: 1px solid hsl(var(--border)) !important;
    border-radius: 8px !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
  }
  
  .gjs-rte-action {
    color: hsl(var(--foreground)) !important;
    border-radius: 4px !important;
  }
  
  .gjs-rte-action:hover {
    background: hsl(var(--accent)) !important;
  }
  
  /* Resizer */
  .gjs-resizer-h {
    border: 2px solid hsl(var(--primary)) !important;
    background: white !important;
    border-radius: 2px !important;
  }

  /* Slider fields */
  .gjs-field-slider {
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
  }
  
  .gjs-field-slider input[type="range"] {
    flex: 1 !important;
    height: 6px !important;
    border-radius: 3px !important;
    background: hsl(var(--border)) !important;
    cursor: pointer !important;
    -webkit-appearance: none !important;
  }
  
  .gjs-field-slider input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none !important;
    width: 16px !important;
    height: 16px !important;
    border-radius: 50% !important;
    background: hsl(var(--primary)) !important;
    cursor: pointer !important;
    border: 2px solid white !important;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
  }
  
  /* Composite/Stack fields (like border-radius corners) */
  .gjs-sm-composite,
  .gjs-sm-stack {
    background: hsl(var(--muted)) !important;
    border-radius: 8px !important;
    padding: 12px !important;
    margin-top: 8px !important;
  }
  
  .gjs-sm-composite .gjs-sm-properties,
  .gjs-sm-stack .gjs-sm-properties {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 8px !important;
    padding: 0 !important;
  }
  
  .gjs-sm-composite .gjs-sm-property,
  .gjs-sm-stack .gjs-sm-property {
    margin-bottom: 0 !important;
  }

  /* Select dropdowns */
  .gjs-field select {
    width: 100% !important;
    padding: 6px 8px !important;
    cursor: pointer !important;
    appearance: none !important;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") !important;
    background-repeat: no-repeat !important;
    background-position: right 8px center !important;
    padding-right: 28px !important;
  }

  /* Number inputs with units */
  .gjs-field-units {
    display: flex !important;
    align-items: center !important;
  }
  
  .gjs-field-units select {
    max-width: 50px !important;
    font-size: 11px !important;
    padding: 4px !important;
    border-left: 1px solid hsl(var(--border)) !important;
    border-radius: 0 6px 6px 0 !important;
    background-position: right 4px center !important;
    padding-right: 18px !important;
  }

  /* Button-style actions */
  .gjs-sm-btn {
    background: hsl(var(--primary)) !important;
    color: white !important;
    border: none !important;
    border-radius: 6px !important;
    padding: 8px 16px !important;
    font-size: 12px !important;
    font-weight: 500 !important;
    cursor: pointer !important;
    transition: all 0.15s ease !important;
  }
  
  .gjs-sm-btn:hover {
    background: hsl(var(--primary) / 0.9) !important;
    transform: translateY(-1px) !important;
  }

  /* Canvas sizing */
  .gjs-cv-canvas .gjs-frame-wrapper {
    min-height: 100% !important;
  }
  
  .gjs-frame {
    height: 100% !important;
    min-height: 600px !important;
  }

  /* Better sector toggle animation */
  .gjs-sm-sector-title::before {
    transition: transform 0.2s ease !important;
  }
  
  .gjs-sm-sector.gjs-sm-open .gjs-sm-sector-title::before {
    transform: rotate(90deg) !important;
  }

  /* Active state for inputs */
  .gjs-field:focus-within {
    border-color: hsl(var(--primary)) !important;
    box-shadow: 0 0 0 3px hsl(var(--primary) / 0.15) !important;
  }
`

// Template categories for template mode
const TEMPLATE_CATEGORIES = [
  { value: 'transactional', label: '🔔 Transactional', description: 'Automated emails (form confirmations, receipts, etc.)' },
  { value: 'welcome', label: '👋 Welcome', description: 'Welcome series and onboarding' },
  { value: 'newsletter', label: '📰 Newsletter', description: 'Regular newsletters and updates' },
  { value: 'promotional', label: '🎁 Promotional', description: 'Sales, offers, and promotions' },
  { value: 'announcement', label: '📢 Announcement', description: 'Company news and updates' },
  { value: 'marketing', label: '📈 Marketing', description: 'General marketing emails' },
  { value: 'custom', label: '⚙️ Custom', description: 'Custom category' }
]

/**
 * EmailEditor Component
 * 
 * @param {Object} props
 * @param {string} props.title - Email title/name displayed in header
 * @param {string} props.description - Email description displayed in header
 * @param {string} props.initialSubject - Initial email subject line
 * @param {string} props.initialHtml - Initial HTML content
 * @param {Array<{name: string, description: string}>} props.variables - Available template variables
 * @param {Function} props.onSave - Callback when save is clicked: ({ subject, html, name?, category? }) => void
 * @param {Function} props.onBack - Callback when back button is clicked
 * @param {Function} props.onReset - Optional callback to reset to default template
 * @param {boolean} props.showReset - Whether to show the reset button
 * @param {boolean} props.loading - Loading state for save button
 * @param {string} props.saveLabel - Custom label for save button (default: "Save")
 * @param {string} props.height - Container height (default: "calc(100vh-180px)")
 * @param {'email'|'template'} props.mode - Editor mode: 'email' for simple, 'template' for full features
 * @param {string} props.templateName - Initial template name (template mode)
 * @param {string} props.templateCategory - Initial template category (template mode)
 * @param {boolean} props.showGallery - Show template gallery button (template mode)
 * @param {boolean} props.showImageLibrary - Show image library button
 * @param {boolean} props.isNew - Whether this is a new template (shows gallery on open)
 */
export function EmailEditor({
  title = 'Email Editor',
  description = '',
  initialSubject = '',
  initialHtml = '',
  variables = [],
  onSave,
  onBack,
  onReset,
  showReset = false,
  loading = false,
  saveLabel = 'Save',
  height = 'calc(100vh - 180px)',
  mode = 'email',
  templateName: initialTemplateName = '',
  templateCategory: initialTemplateCategory = 'marketing',
  showGallery = false,
  showImageLibrary = false,
  isNew = false
}) {
  const [subject, setSubject] = useState(initialSubject)
  const [htmlContent, setHtmlContent] = useState(() => {
    // Replace brand color placeholders with actual values on initial load
    let html = initialHtml || ''
    if (html && html.includes('{{brand_primary}}')) {
      const brandPrimary = currentProject?.brand_primary || '#4bbf39'
      html = html.replace(/\{\{brand_primary\}\}/g, brandPrimary)
    }
    return html
  })
  const [activeTab, setActiveTab] = useState('visual')
  const [previewDevice, setPreviewDevice] = useState('desktop')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedElement, setSelectedElement] = useState(null)
  const [isTextElement, setIsTextElement] = useState(false)
  const [isImageElement, setIsImageElement] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')
  const [leftPanelTab, setLeftPanelTab] = useState('add')
  const [copiedVariable, setCopiedVariable] = useState(null)
  const editorRef = useRef(null)
  const editorInstanceRef = useRef(null)
  const editorIdRef = useRef(`email-editor-${Date.now()}`)
  const imageFileInputRef = useRef(null)
  const { currentProject, currentOrg } = useAuthStore()
  
  // Get brand color from project (with fallback to Uptrade default)
  const brandPrimary = currentProject?.brand_primary || '#4bbf39'
  
  // Schedule Consultation block is Uptrade Media only
  const isUptradeMedia = currentOrg?.slug === 'uptrade-media' || 
                         currentOrg?.domain === 'uptrademedia.com' || 
                         currentOrg?.org_type === 'agency'
  const projectId = currentProject?.id
  const { data: filesData, isLoading: filesLoading } = useFiles(projectId, { category: 'email' })
  const projectFiles = filesData?.files || []
  const uploadFileMutation = useUploadFile()
  const uploadProgress = uploadFileMutation.isPending ? 50 : 0
  
  // Background state
  const [backgroundMode, setBackgroundMode] = useState('color') // 'color' | 'gradient' | 'image'
  const [backgroundColor, setBackgroundColor] = useState('#ffffff')
  const [gradientColor1, setGradientColor1] = useState(brandPrimary)
  const [gradientColor2, setGradientColor2] = useState(brandPrimary)
  const [gradientAngle, setGradientAngle] = useState(135)
  const [backgroundImage, setBackgroundImage] = useState('')
  
  // Dimensions state
  const [dimensions, setDimensions] = useState({ width: '', height: '', maxWidth: '' })
  
  // Spacing state
  const [padding, setPadding] = useState({ top: '', right: '', bottom: '', left: '' })
  const [margin, setMargin] = useState({ top: '', right: '', bottom: '', left: '' })
  
  // Border state (with individual corner radii)
  const [border, setBorder] = useState({ 
    width: '0', 
    style: 'none', 
    color: '#000000', 
    radiusTL: '0',  // top-left
    radiusTR: '0',  // top-right
    radiusBR: '0',  // bottom-right
    radiusBL: '0'   // bottom-left
  })
  
  // Effects state
  const [opacity, setOpacity] = useState(1)
  
  // Typography state (for text elements)
  const [typography, setTypography] = useState({
    fontFamily: 'Arial, sans-serif',
    fontSize: '16',
    fontWeight: '400',
    color: '#333333',
    lineHeight: '1.5',
    textAlign: 'left'
  })
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState(['background'])
  
  const toggleSection = (section) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }
  
  // Template mode state
  const [templateNameValue, setTemplateNameValue] = useState(initialTemplateName)
  const [templateCategoryValue, setTemplateCategoryValue] = useState(initialTemplateCategory)
  const [showImageLibraryModal, setShowImageLibraryModal] = useState(false)
  const [showTemplateGallery, setShowTemplateGallery] = useState(isNew && showGallery)
  const [pendingImageCallback, setPendingImageCallback] = useState(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const hasChanges = mode === 'template' 
    ? (templateNameValue !== initialTemplateName || templateCategoryValue !== initialTemplateCategory || subject !== initialSubject || htmlContent !== initialHtml)
    : (subject !== initialSubject || htmlContent !== initialHtml)

  // Initialize GrapesJS when visual tab is active
  useEffect(() => {
    if (activeTab === 'visual' && editorRef.current && !editorInstanceRef.current) {
      initializeEditor()
    }
    
    return () => {
      if (editorInstanceRef.current) {
        // CRITICAL: Sync HTML content BEFORE destroying the editor
        try {
          const html = editorInstanceRef.current.getHtml()
          const css = editorInstanceRef.current.getCss()
          // Check if there's actual content (not just empty body tags)
          const bodyContent = html ? html.replace(/<body[^>]*>|<\/body>/gi, '').trim() : ''
          if (bodyContent) {
            const fullHtml = css ? `<style>${css}</style>${html}` : html
            setHtmlContent(fullHtml)
            console.log('Synced before destroy:', fullHtml.substring(0, 100))
          }
        } catch (e) {
          console.error('Failed to sync HTML before destroy:', e)
        }
        
        editorInstanceRef.current.destroy()
        editorInstanceRef.current = null
        
        // Clear containers on cleanup
        const editorId = editorIdRef.current
        const stylesContainer = document.getElementById(`${editorId}-styles`)
        const blocksContainer = document.getElementById(`${editorId}-blocks`)
        const layersContainer = document.getElementById(`${editorId}-layers`)
        if (stylesContainer) stylesContainer.innerHTML = ''
        if (blocksContainer) blocksContainer.innerHTML = ''
        if (layersContainer) layersContainer.innerHTML = ''
      }
    }
  }, [activeTab])

  // Sync HTML content from GrapesJS when switching away from visual tab
  const syncHtmlFromEditor = () => {
    const editor = editorInstanceRef.current
    if (editor) {
      try {
        const html = editor.getHtml()
        const css = editor.getCss()
        if (html) {
          setHtmlContent(css ? `<style>${css}</style>${html}` : html)
        }
      } catch (e) {
        console.error('Failed to sync HTML from editor:', e)
      }
    }
  }

  // Handle tab changes with HTML sync
  const handleTabChange = (newTab) => {
    // Sync HTML before leaving visual tab
    if (activeTab === 'visual' && newTab !== 'visual') {
      syncHtmlFromEditor()
    }
    setActiveTab(newTab)
  }

  // Handle ESC to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen])

  const handleCopyVariable = (varName) => {
    navigator.clipboard.writeText(varName)
    setCopiedVariable(varName)
    setTimeout(() => setCopiedVariable(null), 2000)
  }

  // Convert rgb/rgba to hex
  const rgbToHex = (color) => {
    if (!color) return '#ffffff'
    if (color.startsWith('#')) return color
    
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, '0')
      const g = parseInt(match[2]).toString(16).padStart(2, '0')
      const b = parseInt(match[3]).toString(16).padStart(2, '0')
      return `#${r}${g}${b}`
    }
    return color
  }
  
  // Get display-friendly hex value
  const getHexDisplay = (color) => {
    return rgbToHex(color).toUpperCase()
  }

  // Intelligently infer sample values from variable names
  const inferSampleValue = (varName) => {
    const name = varName.toLowerCase().trim()
    
    // Names
    if (name.includes('first_name') || name === 'fname') return 'Sarah'
    if (name.includes('last_name') || name === 'lname') return 'Johnson'
    if (name.includes('full_name') || name === 'name') return 'Sarah Johnson'
    
    // Contact
    if (name.includes('email')) return 'sarah@example.com'
    if (name.includes('phone')) return '(555) 123-4567'
    
    // Company/Org
    if (name.includes('company') || name.includes('org_name') || name.includes('business')) return 'Acme Corp'
    if (name.includes('project')) return 'Marketing Campaign'
    
    // URLs
    if (name.includes('url') || name.includes('link')) return 'example.com'
    if (name.includes('target_url') || name.includes('website')) return 'acmecorp.com'
    
    // Scores (numeric patterns)
    if (name.includes('score')) {
      if (name.includes('performance')) return '92'
      if (name.includes('seo')) return '87'
      if (name.includes('accessibility')) return '95'
      if (name.includes('best_practices') || name.includes('practices')) return '89'
      return '85' // Generic score
    }
    
    // Grades
    if (name.includes('grade')) return 'A'
    if (name.includes('rating')) return '4.8'
    
    // Counts/Numbers
    if (name.includes('count') || name.includes('total') || name.includes('number')) return '24'
    if (name.includes('percent') || name.includes('pct')) return '78%'
    
    // Money
    if (name.includes('amount') || name.includes('price') || name.includes('cost') || name.includes('total')) return '$1,250.00'
    if (name.includes('discount')) return '20%'
    
    // Dates/Times
    if (name.includes('date')) return 'January 7, 2026'
    if (name.includes('time')) return '10:30 AM'
    if (name.includes('deadline') || name.includes('due')) return 'January 15, 2026'
    
    // Location
    if (name.includes('address')) return '123 Main Street'
    if (name.includes('city')) return 'Austin'
    if (name.includes('state')) return 'TX'
    if (name.includes('zip') || name.includes('postal')) return '78701'
    
    // Content
    if (name.includes('title') || name.includes('headline')) return 'Your Report is Ready'
    if (name.includes('subject')) return 'Important Update'
    if (name.includes('message') || name.includes('body')) return 'Thanks for your interest!'
    if (name.includes('description') || name.includes('summary')) return 'A comprehensive analysis of your results.'
    
    // Status
    if (name.includes('status')) return 'Active'
    
    // Default: humanize the variable name
    return varName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  // Transform HTML for preview - replace variables with styled sample values
  const getPreviewHtml = (html) => {
    if (!html) return '<p class="p-8 text-center text-gray-500">No template content yet</p>'
    
    let previewHtml = html
    
    // Find all variables - handles {{var}}, {{ var }}, {{var_name}}
    const variablePattern = /\{\{\s*([^}]+?)\s*\}\}/g
    
    previewHtml = previewHtml.replace(variablePattern, (match, varName) => {
      const cleanName = varName.trim()
      
      // Check if variable has a custom sample from props first
      const customVar = variables.find(v => 
        v.name.replace(/[{}\s]/g, '').toLowerCase() === cleanName.toLowerCase().replace(/[^a-z0-9_]/g, '')
      )
      const sampleValue = customVar?.sample || inferSampleValue(cleanName)
      
      // Return styled span that shows it's a variable
      return `<span style="background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%); padding: 2px 6px; border-radius: 4px; border-bottom: 2px dashed #3b82f6; color: #1e40af; font-weight: 500;" title="Variable: ${match}">${sampleValue}</span>`
    })
    
    return previewHtml
  }

  // Block item component for the left panel with drag support
  const BlockItem = ({ icon, label, blockId, onClick, className = '', description = '' }) => {
    const handleDragStart = (e) => {
      const editor = editorInstanceRef.current
      if (!editor) return
      
      const bm = editor.BlockManager
      const block = bm.get(blockId)
      if (!block) return
      
      // Get the content
      const content = block.get('content')
      const contentStr = typeof content === 'string' ? content : JSON.stringify(content)
      
      // Set data for GrapesJS - it expects 'text/html' for drag/drop
      e.dataTransfer.setData('text/html', contentStr)
      e.dataTransfer.setData('text/plain', blockId)
      e.dataTransfer.effectAllowed = 'copy'
      
      // Create a visual drag image
      const dragImage = document.createElement('div')
      dragImage.className = 'fixed bg-primary text-primary-foreground px-3 py-2 rounded-lg shadow-lg text-sm font-medium pointer-events-none'
      dragImage.textContent = label
      dragImage.style.cssText = 'position: absolute; top: -1000px; left: -1000px;'
      document.body.appendChild(dragImage)
      e.dataTransfer.setDragImage(dragImage, 50, 20)
      
      // Clean up drag image after drag
      setTimeout(() => dragImage.remove(), 0)
    }
    
    return (
      <div
        draggable
        onDragStart={handleDragStart}
        onClick={onClick}
        className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border bg-background hover:bg-muted/50 hover:border-primary/30 hover:shadow-sm transition-all group cursor-grab active:cursor-grabbing ${className}`}
        title={description || `Drag to canvas or click to add ${label}`}
      >
        <div className="text-muted-foreground group-hover:text-primary transition-colors">
          {icon}
        </div>
        <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
      </div>
    )
  }

  // Add a block to the canvas
  const addBlock = (blockId) => {
    const editor = editorInstanceRef.current
    if (!editor) {
      console.warn('Editor not initialized')
      return
    }

    const bm = editor.BlockManager
    const block = bm.get(blockId)
    if (!block) {
      console.warn('Block not found:', blockId, 'Available blocks:', bm.getAll().map(b => b.get('id')))
      return
    }

    // Get the block content
    const content = block.get('content')
    console.log('Adding block:', blockId, 'Content type:', typeof content)
    
    try {
      const selected = editor.getSelected()
      
      if (selected) {
        // If something is selected, add after it
        const parent = selected.parent()
        if (parent) {
          const index = parent.components().indexOf(selected)
          parent.append(content, { at: index + 1 })
          // Select the newly added component
          const newComponent = parent.components().at(index + 1)
          if (newComponent) {
            editor.select(newComponent)
          }
        } else {
          // Selected is root, append to it
          selected.append(content)
          const children = selected.components()
          editor.select(children.at(children.length - 1))
        }
      } else {
        // Nothing selected, add to wrapper
        const wrapper = editor.getWrapper()
        if (wrapper) {
          wrapper.append(content)
          const children = wrapper.components()
          const lastChild = children.at(children.length - 1)
          if (lastChild) {
            editor.select(lastChild)
          }
        }
      }
    } catch (e) {
      console.error('Failed to add component:', e)
    }
  }

  // Apply src/alt to the currently selected image
  const applyImageAttributes = (src, altText = '') => {
    const editor = editorInstanceRef.current
    if (!editor || !src) return

    const selected = editor.getSelected()
    if (selected && (selected.get('tagName')?.toLowerCase() === 'img' || selected.get('type') === 'image')) {
      selected.addAttributes({ src, alt: altText })
      selected.set('src', src)
    }
  }

  // Apply gradient to selected element
  const applyGradient = () => {
    const editor = editorInstanceRef.current
    if (!editor) return
    
    const selected = editor.getSelected()
    if (!selected) return
    
    const gradientValue = `linear-gradient(${gradientAngle}deg, ${gradientColor1}, ${gradientColor2})`
    selected.addStyle({ 'background-image': gradientValue })
    selected.removeStyle('background-color') // Clear solid color when using gradient
  }
  
  // Apply solid background color
  const applyBackgroundColor = (color) => {
    const editor = editorInstanceRef.current
    if (!editor) return
    
    const selected = editor.getSelected()
    if (!selected) return
    
    setBackgroundColor(color)
    selected.addStyle({ 'background-color': color })
    selected.removeStyle('background-image') // Clear gradient when using solid color
  }
  
  // Remove all background from selected element
  const clearBackground = () => {
    const editor = editorInstanceRef.current
    if (!editor) return
    
    const selected = editor.getSelected()
    if (!selected) return
    
    selected.removeStyle('background-color')
    selected.removeStyle('background-image')
  }
  
  // Apply dimensions to selected element
  const applyDimensions = () => {
    const editor = editorInstanceRef.current
    if (!editor) return
    const selected = editor.getSelected()
    if (!selected) return
    
    if (dimensions.width) selected.addStyle({ 'width': dimensions.width + 'px' })
    if (dimensions.height) selected.addStyle({ 'height': dimensions.height + 'px' })
    if (dimensions.maxWidth) selected.addStyle({ 'max-width': dimensions.maxWidth + 'px' })
  }
  
  // Apply spacing to selected element
  const applySpacing = () => {
    const editor = editorInstanceRef.current
    if (!editor) return
    const selected = editor.getSelected()
    if (!selected) return
    
    if (padding.top) selected.addStyle({ 'padding-top': padding.top + 'px' })
    if (padding.right) selected.addStyle({ 'padding-right': padding.right + 'px' })
    if (padding.bottom) selected.addStyle({ 'padding-bottom': padding.bottom + 'px' })
    if (padding.left) selected.addStyle({ 'padding-left': padding.left + 'px' })
    if (margin.top) selected.addStyle({ 'margin-top': margin.top + 'px' })
    if (margin.right) selected.addStyle({ 'margin-right': margin.right + 'px' })
    if (margin.bottom) selected.addStyle({ 'margin-bottom': margin.bottom + 'px' })
    if (margin.left) selected.addStyle({ 'margin-left': margin.left + 'px' })
  }
  
  // Apply border to selected element
  const applyBorder = () => {
    const editor = editorInstanceRef.current
    if (!editor) return
    const selected = editor.getSelected()
    if (!selected) return
    
    selected.addStyle({
      'border-width': border.width + 'px',
      'border-style': border.style,
      'border-color': border.color,
      'border-top-left-radius': border.radiusTL + 'px',
      'border-top-right-radius': border.radiusTR + 'px',
      'border-bottom-right-radius': border.radiusBR + 'px',
      'border-bottom-left-radius': border.radiusBL + 'px'
    })
  }
  
  // Apply opacity to selected element
  const applyOpacity = (value) => {
    const editor = editorInstanceRef.current
    if (!editor) return
    const selected = editor.getSelected()
    if (!selected) return
    
    setOpacity(value)
    selected.addStyle({ 'opacity': value })
  }
  
  // Apply typography to selected element
  const applyTypography = () => {
    const editor = editorInstanceRef.current
    if (!editor) return
    const selected = editor.getSelected()
    if (!selected) return
    
    selected.addStyle({
      'font-family': typography.fontFamily,
      'font-size': typography.fontSize + 'px',
      'font-weight': typography.fontWeight,
      'color': typography.color,
      'line-height': typography.lineHeight,
      'text-align': typography.textAlign
    })
  }
  
  // Parse numeric value from CSS (e.g., "16px" -> 16)
  const parseNumeric = (value) => {
    if (!value) return ''
    const num = parseInt(value)
    return isNaN(num) ? '' : num.toString()
  }

  const initializeEditor = async () => {
    const grapesjs = (await import('grapesjs')).default
    await import('grapesjs/dist/css/grapes.min.css')
    
    // Import Font Awesome for GrapesJS icons
    if (!document.getElementById('font-awesome-css')) {
      const faLink = document.createElement('link')
      faLink.id = 'font-awesome-css'
      faLink.rel = 'stylesheet'
      faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
      document.head.appendChild(faLink)
    }
    
    const editorId = editorIdRef.current
    
    // Clear any existing content in containers to prevent duplicates
    const stylesContainer = document.getElementById(`${editorId}-styles`)
    const blocksContainer = document.getElementById(`${editorId}-blocks`)
    const layersContainer = document.getElementById(`${editorId}-layers`)
    if (stylesContainer) stylesContainer.innerHTML = ''
    if (blocksContainer) blocksContainer.innerHTML = ''
    if (layersContainer) layersContainer.innerHTML = ''
    
    // Inject custom styles
    const styleId = 'grapesjs-custom-styles'
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style')
      styleEl.id = styleId
      styleEl.textContent = GRAPESJS_CUSTOM_STYLES
      document.head.appendChild(styleEl)
    }
    
    const editor = grapesjs.init({
      container: editorRef.current,
      height: '100%',
      width: '100%',
      fromElement: false,
      storageManager: false,
      
      // CRITICAL: Use inline styles for email compatibility
      // This makes StyleManager write to element style attribute directly
      avoidInlineStyle: false,
      
      // Remove default panels - we build our own
      panels: { defaults: [] },
      
      // Block manager - external container
      blockManager: {
        appendTo: `#${editorId}-blocks`,
        blocks: []
      },
      
      // Style manager - external container for property editing  
      styleManager: {
        appendTo: `#${editorId}-styles`,
        // Clear any default sectors by providing our own complete set
        clearProperties: true,
        sectors: [
          {
            id: 'typography',
            name: 'Typography',
            open: true,
            properties: [
              { name: 'Font', property: 'font-family', type: 'select', 
                options: [
                  { value: 'Arial, sans-serif', name: 'Arial' },
                  { value: 'Georgia, serif', name: 'Georgia' },
                  { value: 'Helvetica, sans-serif', name: 'Helvetica' },
                  { value: 'Times New Roman, serif', name: 'Times New Roman' },
                  { value: 'Verdana, sans-serif', name: 'Verdana' },
                  { value: 'Trebuchet MS, sans-serif', name: 'Trebuchet MS' },
                  { value: 'Courier New, monospace', name: 'Courier New' },
                  { value: 'system-ui, sans-serif', name: 'System UI' }
                ]
              },
              { name: 'Size', property: 'font-size', type: 'slider', min: 10, max: 72, step: 1, units: ['px'] },
              { name: 'Weight', property: 'font-weight', type: 'select',
                options: [
                  { value: '300', name: 'Light' },
                  { value: '400', name: 'Normal' },
                  { value: '500', name: 'Medium' },
                  { value: '600', name: 'Semibold' },
                  { value: '700', name: 'Bold' },
                  { value: '800', name: 'Extra Bold' }
                ]
              },
              { name: 'Color', property: 'color', type: 'color' },
              { name: 'Line Height', property: 'line-height', type: 'slider', min: 1, max: 3, step: 0.1 },
              { name: 'Letter Spacing', property: 'letter-spacing', type: 'slider', min: -2, max: 10, step: 0.5, units: ['px'] },
              { name: 'Align', property: 'text-align', type: 'radio',
                options: [
                  { value: 'left', title: 'Left', className: 'fa fa-align-left' },
                  { value: 'center', title: 'Center', className: 'fa fa-align-center' },
                  { value: 'right', title: 'Right', className: 'fa fa-align-right' },
                  { value: 'justify', title: 'Justify', className: 'fa fa-align-justify' }
                ]
              },
              { name: 'Text Transform', property: 'text-transform', type: 'select',
                options: [
                  { value: 'none', name: 'None' },
                  { value: 'uppercase', name: 'UPPERCASE' },
                  { value: 'lowercase', name: 'lowercase' },
                  { value: 'capitalize', name: 'Capitalize' }
                ]
              },
              { name: 'Text Decoration', property: 'text-decoration', type: 'select',
                options: [
                  { value: 'none', name: 'None' },
                  { value: 'underline', name: 'Underline' },
                  { value: 'line-through', name: 'Strikethrough' }
                ]
              }
            ]
          },
          // Background is handled by our custom React UI for better UX
          {
            id: 'layout',
            name: 'Layout & Alignment',
            open: false,
            properties: [
              { name: 'Display', property: 'display', type: 'select',
                options: [
                  { value: 'block', name: 'Block' },
                  { value: 'inline-block', name: 'Inline Block' },
                  { value: 'inline', name: 'Inline' },
                  { value: 'table', name: 'Table' }
                ]
              },
              { name: 'Horizontal Align', property: 'margin-left', type: 'radio',
                options: [
                  { value: '0', title: 'Left', className: 'fa fa-align-left' },
                  { value: 'auto', title: 'Center', className: 'fa fa-align-center' },
                  { value: 'auto', title: 'Right', className: 'fa fa-align-right' }
                ],
                onChange: (prop, value) => {
                  const selected = editor.getSelected()
                  if (selected) {
                    if (value === 'auto') {
                      // Center: set both margins to auto
                      selected.setStyle({ 'margin-left': 'auto', 'margin-right': 'auto' })
                    } else {
                      // Left or Right
                      selected.setStyle({ 'margin-left': '0', 'margin-right': '0' })
                    }
                  }
                }
              }
            ]
          },
          {
            id: 'dimensions',
            name: 'Dimensions',
            open: false,
            properties: [
              { name: 'Width', property: 'width', type: 'integer', units: ['px', '%', 'auto'] },
              { name: 'Height', property: 'height', type: 'integer', units: ['px', '%', 'auto'] },
              { name: 'Max Width', property: 'max-width', type: 'integer', units: ['px', '%'] }
            ]
          },
          {
            id: 'spacing',
            name: 'Spacing',
            open: false,
            properties: [
              { name: 'Padding', property: 'padding', type: 'composite',
                properties: [
                  { name: 'Top', property: 'padding-top', type: 'integer', units: ['px'] },
                  { name: 'Right', property: 'padding-right', type: 'integer', units: ['px'] },
                  { name: 'Bottom', property: 'padding-bottom', type: 'integer', units: ['px'] },
                  { name: 'Left', property: 'padding-left', type: 'integer', units: ['px'] }
                ]
              },
              { name: 'Margin', property: 'margin', type: 'composite',
                properties: [
                  { name: 'Top', property: 'margin-top', type: 'integer', units: ['px', 'auto'] },
                  { name: 'Right', property: 'margin-right', type: 'integer', units: ['px', 'auto'] },
                  { name: 'Bottom', property: 'margin-bottom', type: 'integer', units: ['px', 'auto'] },
                  { name: 'Left', property: 'margin-left', type: 'integer', units: ['px', 'auto'] }
                ]
              }
            ]
          },
          {
            id: 'border',
            name: 'Border',
            open: false,
            properties: [
              { name: 'Width', property: 'border-width', type: 'slider', min: 0, max: 10, step: 1, units: ['px'] },
              { name: 'Style', property: 'border-style', type: 'select',
                options: [
                  { value: 'none', name: 'None' },
                  { value: 'solid', name: 'Solid' },
                  { value: 'dashed', name: 'Dashed' },
                  { value: 'dotted', name: 'Dotted' }
                ]
              },
              { name: 'Color', property: 'border-color', type: 'color' },
              { name: 'Radius', property: 'border-radius', type: 'integer', units: ['px'], min: 0, max: 50 }
            ]
          },
          {
            id: 'effects',
            name: 'Effects',
            open: false,
            properties: [
              { name: 'Opacity', property: 'opacity', type: 'slider', min: 0, max: 1, step: 0.05, default: 1 }
            ]
          }
        ]
      },
      
      // Layer manager - external container
      layerManager: {
        appendTo: `#${editorId}-layers`
      },
      
      // Canvas settings
      canvas: {
        styles: [
          'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
        ]
      },
      
      // Device presets
      deviceManager: {
        devices: [
          { name: 'Desktop', width: '' },
          { name: 'Mobile', width: '375px', widthMedia: '480px' }
        ]
      },
      
      // Component defaults
      domComponents: {
        storeWrapper: 1
      }
    })

    // Set up drag-and-drop from custom blocks panel to canvas
    // NOTE: GrapesJS handles drag/drop natively through BlockManager
    // We only need custom handling if blocks are not in the native BlockManager
    const setupCanvasDragDrop = () => {
      // GrapesJS native blocks already work with drag/drop
      // This is only needed for completely custom external drag sources
      // For now, let GrapesJS handle it natively
    }
    
    // Set up drag-drop after editor loads
    editor.on('load', () => {
      setTimeout(setupCanvasDragDrop, 200)
    })

    // Refresh style manager when component is selected
    editor.on('component:selected', (component) => {
      if (component) {
        const tagName = component.get('tagName')?.toLowerCase() || ''
        const type = component.get('type') || ''
        setSelectedElement(tagName || type || 'element')
        
        // Determine if this is a text-oriented element
        const textElements = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'a', 'li', 'label', 'text', 'textnode']
        const isText = textElements.includes(tagName) || type === 'text'
        setIsTextElement(isText)
        
        // Determine if this is an image element
        const isImage = tagName === 'img' || type === 'image'
        setIsImageElement(isImage)
        
        // If image, get current src and alt
        if (isImage) {
          const attrs = component.getAttributes()
          setImageUrl(attrs.src || '')
          setImageAlt(attrs.alt || '')
        }
        
        // GrapesJS StyleManager - control sector visibility
        const sm = editor.StyleManager
        
        // Force re-render by selecting the component's style target
        const target = sm.getModelToStyle(component)
        if (target) {
          sm.select(target)
        } else {
          sm.select(component)
        }
        
        // Show/hide Typography sector based on element type and render all sectors
        setTimeout(() => {
          const sm = editor.StyleManager
          const sectors = sm.getSectors()
          
          sectors.forEach(sector => {
            const sectorId = sector.get('id')
            if (sectorId === 'typography') {
              // Hide typography for non-text elements
              sector.set('visible', isText)
            } else {
              // Ensure other sectors are visible
              sector.set('visible', true)
            }
          })
          
          // Force StyleManager to re-render
          sm.render()
          
          // Open the first visible sector
          const firstVisibleSector = sectors.find(s => s.get('visible') !== false)
          if (firstVisibleSector) {
            firstVisibleSector.setOpen(true)
          }
        }, 100)
        
        // Parse existing background styles from the component
        // GrapesJS stores styles in different ways - try multiple approaches
        const styleObj = component.getStyle() || {}
        const el = component.getEl()
        
        // Get computed/inline styles from the actual DOM element if available
        let bgImage = styleObj['background-image'] || styleObj['background'] || ''
        let bgColor = styleObj['background-color'] || ''
        
        // If not in style manager, check inline style attribute from the element
        if (!bgImage && !bgColor && el) {
          // GrapesJS renders in an iframe - get the actual inline style
          const inlineStyle = el.getAttribute('style') || ''
          
          // Also try computed style from the iframe's window
          try {
            const iframeWin = el.ownerDocument?.defaultView
            if (iframeWin) {
              const computed = iframeWin.getComputedStyle(el)
              if (!bgImage && computed.backgroundImage && computed.backgroundImage !== 'none') {
                bgImage = computed.backgroundImage
              }
              if (!bgColor && computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                bgColor = computed.backgroundColor
              }
            }
          } catch (e) {
            // Fallback to inline style parsing
          }
          
          // Parse inline style string as fallback
          if (!bgImage && !bgColor) {
            const bgImageMatch = inlineStyle.match(/background-image:\s*([^;]+)/)
            const bgColorMatch = inlineStyle.match(/background-color:\s*([^;]+)/)
            const bgMatch = inlineStyle.match(/background:\s*([^;]+)/)
            
            if (bgImageMatch) bgImage = bgImageMatch[1].trim()
            if (bgColorMatch) bgColor = bgColorMatch[1].trim()
            
            // Handle shorthand 'background' property which might contain gradient
            if (!bgImage && bgMatch) {
              const bgValue = bgMatch[1]
              if (bgValue.includes('linear-gradient')) {
                bgImage = bgValue
              } else if (!bgColor) {
                bgColor = bgValue.trim()
              }
            }
          }
        }
        
        // Also check component attributes for style
        if (!bgImage && !bgColor) {
          const attrs = component.getAttributes()
          if (attrs.style) {
            const styleAttr = attrs.style
            if (styleAttr.includes('linear-gradient')) {
              const gradMatch = styleAttr.match(/(linear-gradient\([^)]+\))/)
              if (gradMatch) bgImage = gradMatch[1]
            } else {
              const colorMatch = styleAttr.match(/background(?:-color)?:\s*([^;]+)/)
              if (colorMatch) bgColor = colorMatch[1].trim()
            }
          }
        }
        
        console.log('Background detection:', { bgImage, bgColor, styleObj, hasEl: !!el, elStyle: el?.getAttribute?.('style') })
        
        if (bgImage && bgImage.includes('linear-gradient')) {
          // Element has gradient - parse it
          setBackgroundMode('gradient')
          
          // More flexible regex to handle various gradient formats
          const angleMatch = bgImage.match(/linear-gradient\((\d+)deg/)
          const colorMatches = bgImage.match(/#[a-fA-F0-9]{3,8}|rgba?\([^)]+\)|rgb\([^)]+\)/g)
          
          if (angleMatch) {
            setGradientAngle(parseInt(angleMatch[1]) || 135)
          }
          
          if (colorMatches && colorMatches.length >= 2) {
            setGradientColor1(colorMatches[0])
            setGradientColor2(colorMatches[1])
          }
        } else if (bgColor && bgColor !== 'transparent' && bgColor !== 'none') {
          // Element has solid color
          setBackgroundMode('color')
          setBackgroundColor(bgColor)
        } else {
          // No background - default to color mode
          setBackgroundMode('color')
          setBackgroundColor('#ffffff')
        }
        
        // Parse all other styles from the element
        let computed = null
        try {
          const iframeWin = el?.ownerDocument?.defaultView
          if (iframeWin) {
            computed = iframeWin.getComputedStyle(el)
          }
        } catch (e) {}
        
        // Helper to get style value
        const getStyleValue = (prop) => {
          return styleObj[prop] || (computed && computed[prop]) || ''
        }
        
        // Parse dimensions
        setDimensions({
          width: parseNumeric(getStyleValue('width')),
          height: parseNumeric(getStyleValue('height')),
          maxWidth: parseNumeric(getStyleValue('max-width'))
        })
        
        // Parse spacing
        setPadding({
          top: parseNumeric(getStyleValue('padding-top')),
          right: parseNumeric(getStyleValue('padding-right')),
          bottom: parseNumeric(getStyleValue('padding-bottom')),
          left: parseNumeric(getStyleValue('padding-left'))
        })
        setMargin({
          top: parseNumeric(getStyleValue('margin-top')),
          right: parseNumeric(getStyleValue('margin-right')),
          bottom: parseNumeric(getStyleValue('margin-bottom')),
          left: parseNumeric(getStyleValue('margin-left'))
        })
        
        // Parse border (including individual corner radii)
        setBorder({
          width: parseNumeric(getStyleValue('border-width')) || '0',
          style: getStyleValue('border-style') || 'none',
          color: rgbToHex(getStyleValue('border-color')) || '#000000',
          radiusTL: parseNumeric(getStyleValue('border-top-left-radius')) || '0',
          radiusTR: parseNumeric(getStyleValue('border-top-right-radius')) || '0',
          radiusBR: parseNumeric(getStyleValue('border-bottom-right-radius')) || '0',
          radiusBL: parseNumeric(getStyleValue('border-bottom-left-radius')) || '0'
        })
        
        // Parse opacity
        const opacityVal = getStyleValue('opacity')
        setOpacity(opacityVal ? parseFloat(opacityVal) : 1)
        
        // Parse typography (for text elements)
        if (isText) {
          setTypography({
            fontFamily: getStyleValue('font-family') || 'Arial, sans-serif',
            fontSize: parseNumeric(getStyleValue('font-size')) || '16',
            fontWeight: getStyleValue('font-weight') || '400',
            color: rgbToHex(getStyleValue('color')) || '#333333',
            lineHeight: getStyleValue('line-height') || '1.5',
            textAlign: getStyleValue('text-align') || 'left'
          })
        }
        
        // Open appropriate section based on element type
        if (isImage) {
          setExpandedSections(['image'])
        } else if (isText) {
          setExpandedSections(['typography'])
        } else {
          setExpandedSections(['background'])
        }
      } else {
        setSelectedElement(null)
        setIsTextElement(false)
        setIsImageElement(false)
      }
    })

    editor.on('component:deselected', () => {
      setSelectedElement(null)
      setIsTextElement(false)
      setIsImageElement(false)
    })

    // Add custom email blocks
    const bm = editor.BlockManager
    
    // Content blocks
    bm.add('text', {
      label: `<div class="gjs-block-label"><svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/></svg>Text</div>`,
      category: 'Content',
      content: '<p style="margin: 0 0 16px 0; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333;">Add your text here. Click to edit.</p>'
    })
    
    bm.add('heading', {
      label: `<div class="gjs-block-label"><svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16"/></svg>Heading</div>`,
      category: 'Content',
      content: '<h1 style="margin: 0 0 16px 0; font-family: Arial, sans-serif; font-size: 28px; font-weight: 700; color: #1a1a1a;">Your Heading</h1>'
    })
    
    bm.add('button', {
      label: `<div class="gjs-block-label"><svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="8" rx="2" stroke-width="2"/></svg>Button</div>`,
      category: 'Content',
      content: `<table cellpadding="0" cellspacing="0" border="0" style="margin: 20px auto; text-align: center;"><tr><td style="background-color: ${brandPrimary}; border-radius: 8px;"><a href="#" style="display: inline-block; padding: 14px 32px; font-family: Arial, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">Click Here</a></td></tr></table>`
    })
    
    bm.add('logo', {
      label: `<div class="gjs-block-label"><svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10M12 21V3m0 0l-3 3m3-3l3 3"/></svg>Logo</div>`,
      category: 'Content',
      content: `<div style="text-align: center; padding: 24px;">${currentProject?.logo_url ? `<img src="${currentProject.logo_url}" alt="${currentProject?.title || 'Logo'}" style="max-width: 200px; height: auto; display: inline-block;" />` : '<p style="margin: 0; padding: 20px; background: #f3f4f6; border: 2px dashed #d1d5db; border-radius: 8px; color: #6b7280; font-family: Arial, sans-serif;">Logo will appear here. Add one in Project Settings.</p>'}</div>`
    })
    
    bm.add('image', {
      label: `<div class="gjs-block-label"><svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><path d="M21 15l-5-5L5 21" stroke-width="2"/></svg>Image</div>`,
      category: 'Content',
      content: '<div style="padding: 12px; background-color: #f6f7f9; border: 1px dashed #cdd2d7; text-align: center;"><img src="https://dummyimage.com/640x360/e5e7eb/9ca3af.png&text=Drop+or+upload+an+image" alt="Email image placeholder" style="max-width: 100%; height: auto; display: inline-block;" /></div>'
    })
    
    // Layout blocks
    bm.add('section', {
      label: `<div class="gjs-block-label"><svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2"/></svg>Section</div>`,
      category: 'Layout',
      content: '<div style="padding: 40px 20px; background-color: #ffffff;"></div>'
    })
    
    bm.add('container', {
      label: `<div class="gjs-block-label"><svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" stroke-width="2" stroke-dasharray="4 2"/></svg>Container</div>`,
      category: 'Layout',
      content: '<div style="max-width: 600px; margin: 0 auto; padding: 20px;"></div>'
    })
    
    bm.add('divider', {
      label: `<div class="gjs-block-label"><svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12" stroke-width="2"/></svg>Divider</div>`,
      category: 'Layout',
      content: '<hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />'
    })
    
    bm.add('spacer', {
      label: `<div class="gjs-block-label"><svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 5v14M5 12h2M17 12h2" stroke-width="2"/></svg>Spacer</div>`,
      category: 'Layout',
      content: '<div style="height: 40px;"></div>'
    })
    
    bm.add('columns-2', {
      label: `<div class="gjs-block-label"><svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="18" rx="1" stroke-width="2"/><rect x="13" y="3" width="8" height="18" rx="1" stroke-width="2"/></svg>2 Columns</div>`,
      category: 'Layout',
      content: `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="50%" style="padding: 10px; vertical-align: top;"><p style="margin: 0;">Column 1</p></td><td width="50%" style="padding: 10px; vertical-align: top;"><p style="margin: 0;">Column 2</p></td></tr></table>`
    })
    
    bm.add('columns-3', {
      label: `<div class="gjs-block-label"><svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="3" width="5" height="18" rx="1" stroke-width="2"/><rect x="9.5" y="3" width="5" height="18" rx="1" stroke-width="2"/><rect x="17" y="3" width="5" height="18" rx="1" stroke-width="2"/></svg>3 Columns</div>`,
      category: 'Layout',
      content: `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
        <tr>
          <td width="33.33%" style="padding: 10px; vertical-align: top; border: 1px dashed #ddd;">
            <p style="margin: 0; font-family: Arial, sans-serif; font-size: 14px;">Column 1</p>
          </td>
          <td width="33.33%" style="padding: 10px; vertical-align: top; border: 1px dashed #ddd;">
            <p style="margin: 0; font-family: Arial, sans-serif; font-size: 14px;">Column 2</p>
          </td>
          <td width="33.33%" style="padding: 10px; vertical-align: top; border: 1px dashed #ddd;">
            <p style="margin: 0; font-family: Arial, sans-serif; font-size: 14px;">Column 3</p>
          </td>
        </tr>
      </table>`
    })
    
    // Additional Content blocks
    bm.add('link', {
      label: `<div class="gjs-block-label">Link</div>`,
      category: 'Content',
      content: `<a href="#" style="color: ${brandPrimary}; text-decoration: underline; font-family: Arial, sans-serif;">Click here</a>`
    })
    
    bm.add('list', {
      label: `<div class="gjs-block-label">List</div>`,
      category: 'Content',
      content: `<ul style="margin: 0 0 16px 0; padding-left: 24px; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.8; color: #333333;"><li>First item</li><li>Second item</li><li>Third item</li></ul>`
    })
    
    bm.add('quote', {
      label: `<div class="gjs-block-label">Quote</div>`,
      category: 'Content',
      content: `<blockquote style="margin: 24px 0; padding: 16px 24px; border-left: 4px solid ${brandPrimary}; background-color: #f9fafb; font-family: Georgia, serif; font-size: 18px; font-style: italic; color: #555555;">"This is a powerful quote that captures attention."</blockquote>`
    })
    
    // Pre-built sections - using simpler HTML structure for better GrapesJS compatibility
    bm.add('hero', {
      label: `<div class="gjs-block-label">Hero</div>`,
      category: 'Sections',
      content: {
        type: 'default',
        tagName: 'div',
        style: { 
          padding: '60px 40px', 
          background: `linear-gradient(135deg, ${brandPrimary} 0%, ${brandPrimary} 100%)`, 
          'text-align': 'center' 
        },
        components: [
          { tagName: 'h1', content: 'Welcome to Our Newsletter', style: { margin: '0 0 16px 0', 'font-family': 'Arial, sans-serif', 'font-size': '36px', 'font-weight': '700', color: '#ffffff' }},
          { tagName: 'p', content: 'Stay updated with our latest news and offers', style: { margin: '0 0 24px 0', 'font-family': 'Arial, sans-serif', 'font-size': '18px', color: 'rgba(255,255,255,0.9)' }},
          { tagName: 'a', attributes: { href: '#' }, content: 'Get Started', style: { display: 'inline-block', padding: '14px 32px', 'font-family': 'Arial, sans-serif', 'font-size': '16px', 'font-weight': '600', color: brandPrimary, 'text-decoration': 'none', 'background-color': '#ffffff', 'border-radius': '8px' }}
        ]
      }
    })
    
    bm.add('footer', {
      label: `<div class="gjs-block-label">Footer</div>`,
      category: 'Sections',
      content: {
        type: 'default',
        tagName: 'div',
        style: { padding: '32px 20px', 'background-color': '#1a1a1a', 'text-align': 'center' },
        components: [
          { tagName: 'p', content: '© 2026 Your Company. All rights reserved.', style: { margin: '0 0 12px 0', 'font-family': 'Arial, sans-serif', 'font-size': '14px', color: '#999999' }},
          { tagName: 'p', style: { margin: '0', 'font-family': 'Arial, sans-serif', 'font-size': '12px', color: '#666666' }, components: [
            { tagName: 'a', attributes: { href: '#' }, content: 'Unsubscribe', style: { color: '#888888', 'text-decoration': 'underline' }},
            { type: 'textnode', content: ' · ' },
            { tagName: 'a', attributes: { href: '#' }, content: 'Privacy Policy', style: { color: '#888888', 'text-decoration': 'underline' }}
          ]}
        ]
      }
    })
    
    bm.add('cta-section', {
      label: `<div class="gjs-block-label">CTA Box</div>`,
      category: 'Sections',
      content: {
        type: 'default',
        tagName: 'div',
        style: { padding: '40px 30px', 'background-color': '#f3f4f6', 'border-radius': '12px', 'text-align': 'center', margin: '20px' },
        components: [
          { tagName: 'h2', content: 'Ready to get started?', style: { margin: '0 0 12px 0', 'font-family': 'Arial, sans-serif', 'font-size': '24px', 'font-weight': '700', color: '#1a1a1a' }},
          { tagName: 'p', content: 'Join thousands of happy customers today.', style: { margin: '0 0 20px 0', 'font-family': 'Arial, sans-serif', 'font-size': '16px', color: '#666666' }},
          { tagName: 'a', attributes: { href: '#' }, content: 'Sign Up Now', style: { display: 'inline-block', padding: '14px 32px', 'font-family': 'Arial, sans-serif', 'font-size': '16px', 'font-weight': '600', color: '#ffffff', 'text-decoration': 'none', 'background-color': brandPrimary, 'border-radius': '8px' }}
        ]
      }
    })
    
    // Schedule Consultation CTA block - Uptrade Media only
    if (isUptradeMedia) {
      bm.add('schedule-consultation', {
        label: `<div class="gjs-block-label">📅 Schedule Call</div>`,
        category: 'Sections',
        content: {
          type: 'default',
          tagName: 'div',
          style: { padding: '32px 24px', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', 'border-radius': '12px', 'text-align': 'center', margin: '24px 0' },
          components: [
            { tagName: 'p', content: '📅 Ready to chat?', style: { margin: '0 0 8px 0', 'font-family': 'Arial, sans-serif', 'font-size': '18px', 'font-weight': '600', color: '#ffffff' }},
            { tagName: 'p', content: 'Book a time that works best for you', style: { margin: '0 0 20px 0', 'font-family': 'Arial, sans-serif', 'font-size': '14px', color: 'rgba(255,255,255,0.9)' }},
            { tagName: 'a', attributes: { href: '{{scheduling_link}}' }, content: 'Schedule a Call →', style: { display: 'inline-block', padding: '14px 32px', 'font-family': 'Arial, sans-serif', 'font-size': '16px', 'font-weight': '600', color: '#6366f1', 'text-decoration': 'none', 'background-color': '#ffffff', 'border-radius': '8px' }}
          ]
        }
      })
    }
    
    bm.add('image-text', {
      label: `<div class="gjs-block-label">Image + Text</div>`,
      category: 'Sections',
      content: `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="40%" style="padding: 20px; vertical-align: middle;"><img src="https://placehold.co/300x200/e5e5e5/666666?text=Image" style="max-width: 100%; height: auto; border-radius: 8px;" /></td><td width="60%" style="padding: 20px; vertical-align: middle;"><h3 style="margin: 0 0 12px 0; font-family: Arial, sans-serif; font-size: 20px; font-weight: 600; color: #1a1a1a;">Feature Title</h3><p style="margin: 0; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #555555;">Add a description here.</p></td></tr></table>`
    })
    
    bm.add('social-icons', {
      label: `<div class="gjs-block-label">Social Icons</div>`,
      category: 'Content',
      content: `<table cellpadding="0" cellspacing="0" border="0" style="margin: 20px auto;"><tr><td style="padding: 0 8px;"><a href="#" style="display: inline-block; width: 36px; height: 36px; background-color: #1877f2; border-radius: 50%; text-align: center; line-height: 36px; color: #ffffff; text-decoration: none; font-weight: bold;">f</a></td><td style="padding: 0 8px;"><a href="#" style="display: inline-block; width: 36px; height: 36px; background-color: #1da1f2; border-radius: 50%; text-align: center; line-height: 36px; color: #ffffff; text-decoration: none; font-weight: bold;">X</a></td><td style="padding: 0 8px;"><a href="#" style="display: inline-block; width: 36px; height: 36px; background-color: #0077b5; border-radius: 50%; text-align: center; line-height: 36px; color: #ffffff; text-decoration: none; font-weight: bold;">in</a></td></tr></table>`
    })
    
    bm.add('testimonial', {
      label: `<div class="gjs-block-label">Testimonial</div>`,
      category: 'Sections',
      content: {
        type: 'default',
        tagName: 'div',
        style: { padding: '30px', 'background-color': '#ffffff', border: '1px solid #e5e5e5', 'border-radius': '12px', margin: '20px' },
        components: [
          { tagName: 'p', content: '"This product changed my life! I can\'t recommend it enough."', style: { margin: '0 0 16px 0', 'font-family': 'Georgia, serif', 'font-size': '18px', 'font-style': 'italic', color: '#555555', 'line-height': '1.6' }},
          { tagName: 'p', content: '— Jane Smith, Marketing Director', style: { margin: '0', 'font-family': 'Arial, sans-serif', 'font-size': '14px', 'font-weight': '600', color: '#1a1a1a' }}
        ]
      }
    })
    
    // Variable blocks
    variables.forEach(v => {
      bm.add(`var-${v.name}`, {
        label: `<div class="gjs-block-label text-xs">${v.name.replace(/[{}]/g, '')}</div>`,
        category: 'Variables',
        content: `<span style="font-family: inherit; color: inherit;">${v.name}</span>`
      })
    })

    // Store editor instance first
    editorInstanceRef.current = editor

    // Load existing content - use htmlContent state as it has brand colors replaced
    const contentToLoad = htmlContent || initialHtml
    console.log('Loading content:', contentToLoad ? contentToLoad.substring(0, 100) + '...' : 'empty')
    
    // Helper to sync HTML from editor to state
    const syncEditorToState = () => {
      try {
        const html = editor.getHtml()
        const css = editor.getCss()
        // Only sync if there's actual content (not just empty body)
        if (html && html.replace(/<body[^>]*>|<\/body>/gi, '').trim()) {
          const fullHtml = css ? `<style>${css}</style>${html}` : html
          setHtmlContent(fullHtml)
          console.log('Synced HTML:', fullHtml.substring(0, 100))
        }
      } catch (e) {
        console.error('Failed to sync HTML:', e)
      }
    }
    
    if (contentToLoad) {
      // Extract just the body content if it's a full HTML document
      let bodyContent = contentToLoad
      
      // If content has style tags, extract them separately
      const styleMatch = contentToLoad.match(/<style[^>]*>([\s\S]*?)<\/style>/i)
      const existingCss = styleMatch ? styleMatch[1] : ''
      
      // Extract body content (everything between body tags, or the whole thing if no body tags)
      const bodyMatch = contentToLoad.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
      if (bodyMatch) {
        bodyContent = bodyMatch[1]
      } else {
        // Remove style tags from content if no body tags
        bodyContent = contentToLoad.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      }
      
      console.log('Body content to load:', bodyContent.substring(0, 200))
      
      // Wait for editor to be fully ready
      editor.on('load', () => {
        try {
          // Add CSS if we extracted any
          if (existingCss) {
            editor.setStyle(existingCss)
          }
          // Set the body content as components
          editor.setComponents(bodyContent)
          editor.refresh()
          // Sync after a short delay to ensure render is complete
          setTimeout(syncEditorToState, 200)
        } catch (e) {
          console.error('setComponents on load failed:', e)
        }
      })
      
      // Also try immediately in case load already fired
      try {
        if (existingCss) {
          editor.setStyle(existingCss)
        }
        editor.setComponents(bodyContent)
        setTimeout(syncEditorToState, 300)
      } catch (e) {
        console.error('setComponents immediate failed:', e)
      }
    }

    editor.on('component:deselected', () => {
      setSelectedElement(null)
    })

    // Update HTML content when editor changes
    editor.on('component:update', syncEditorToState)
    editor.on('component:add', syncEditorToState)
    editor.on('component:remove', syncEditorToState)
    editor.on('component:clone', syncEditorToState)
    editor.on('component:drag:end', syncEditorToState)
  }

  const handleUndo = () => {
    editorInstanceRef.current?.UndoManager.undo()
  }
  
  const handleRedo = () => {
    editorInstanceRef.current?.UndoManager.redo()
  }
  
  const handleDeleteSelected = () => {
    const selected = editorInstanceRef.current?.getSelected()
    if (selected) {
      selected.remove()
    }
  }
  
  const handleDeviceChange = (device) => {
    setPreviewDevice(device)
    editorInstanceRef.current?.setDevice(device === 'mobile' ? 'Mobile' : 'Desktop')
  }

  const handleSave = () => {
    if (onSave) {
      if (mode === 'template') {
        onSave({ 
          name: templateNameValue, 
          category: templateCategoryValue, 
          subject, 
          html: htmlContent 
        })
      } else {
        onSave({ subject, html: htmlContent })
      }
    }
  }

  const handleApplyImageUrl = () => {
    if (!imageUrl) return
    applyImageAttributes(imageUrl, imageAlt || 'Image')
  }

  const handleImageUpload = async (file) => {
    if (!file) return
    if (!currentProject?.id) {
      toast.error('Select a project before uploading images')
      return
    }

    setIsUploadingImage(true)
    try {
      const result = await uploadFileMutation.mutateAsync({ projectId: currentProject.id, file, category: 'email', isPublic: true })
      const uploadedUrl = result?.url || result?.public_url || result?.publicUrl
      if (uploadedUrl) {
        setImageUrl(uploadedUrl)
        applyImageAttributes(uploadedUrl, imageAlt || file.name)
      }
      toast.success('Image uploaded')
    } catch (err) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (file) {
      await handleImageUpload(file)
    }
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = ''
    }
  }

  // Image library handlers
  const handleImageSelect = (image) => {
    if (pendingImageCallback) {
      pendingImageCallback(image.url)
      setPendingImageCallback(null)
    } else if (editorInstanceRef.current) {
      const editor = editorInstanceRef.current
      const selected = editor.getSelected()
      
      if (selected && selected.get('type') === 'image') {
        selected.set('src', image.url)
        selected.addAttributes({ src: image.url })
      } else {
        editor.addComponents(`
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding: 20px 40px; text-align: center;">
                <img src="${image.url}" alt="${image.name || 'Image'}" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" />
              </td>
            </tr>
          </table>
        `)
      }
    }
    setShowImageLibraryModal(false)
  }

  const handleOpenImageLibrary = async () => {
    if (!showImageLibrary) return
    if (!currentProject?.id) {
      toast.error('Select a project to browse images')
      return
    }
    queryClient.invalidateQueries({ queryKey: filesKeys.list(currentProject.id, {}) })
    setShowImageLibraryModal(true)
  }

  // Handler for uploading from ImageLibrary
  const handleImageLibraryUpload = async (file) => {
    if (!currentProject?.id) {
      toast.error('Select a project to upload images')
      return
    }
    try {
      const result = await uploadFileMutation.mutateAsync({ 
        projectId: currentProject.id, 
        file, 
        category: 'email', 
        isPublic: true,
        folderPath: 'emails'
      })
      toast.success('Image uploaded!')
      return { success: true, data: result }
    } catch (err) {
      toast.error(err.message || 'Upload failed')
      return { success: false, error: err.message }
    }
  }

  // Template gallery handler
  const handleTemplateSelect = (selectedTemplate) => {
    if (editorInstanceRef.current && selectedTemplate) {
      // Replace brand color placeholders with actual values
      let html = selectedTemplate.html
      if (html && html.includes('{{brand_primary}}')) {
        html = html.replace(/\{\{brand_primary\}\}/g, brandPrimary)
      }
      editorInstanceRef.current.setComponents(html)
      setHtmlContent(html)
      if (!templateNameValue && selectedTemplate.name) {
        setTemplateNameValue(selectedTemplate.name)
      }
    }
    setShowTemplateGallery(false)
  }

  const editorId = editorIdRef.current

  return (
    <div className={`flex flex-col bg-background overflow-hidden rounded-xl ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'border border-border'}`} style={{ height: isFullscreen ? '100vh' : height }}>
      <input
        type="file"
        accept="image/*"
        ref={imageFileInputRef}
        className="hidden"
        onChange={handleImageFileChange}
      />
      {/* Top Toolbar */}
      <div 
        className="flex items-center justify-between px-4 py-2 border-b shrink-0 rounded-t-xl"
        style={{ background: `linear-gradient(135deg, ${brandPrimary} 0%, ${brandPrimary} 100%)` }}
      >
        <div className="flex items-center gap-3">
          {!isFullscreen && onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="text-white hover:bg-white/20">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          {isFullscreen && (
            <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(false)} className="text-white hover:bg-white/20">
              <Minimize2 className="h-4 w-4 mr-2" />
              Exit Fullscreen
            </Button>
          )}
          <div className="h-5 w-px bg-white/30" />
          
          {/* Template mode: name + category inputs */}
          {mode === 'template' ? (
            <div className="flex items-center gap-3">
              <Input
                value={templateNameValue}
                onChange={(e) => setTemplateNameValue(e.target.value)}
                placeholder="Template name..."
                className="h-8 w-48 bg-white/90 border-white/30 text-foreground placeholder:text-muted-foreground"
              />
              <Select value={templateCategoryValue} onValueChange={setTemplateCategoryValue}>
                <SelectTrigger className="h-8 w-36 bg-white/90 border-white/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <h2 className="text-sm font-semibold text-white">{title}</h2>
              {description && <p className="text-xs text-white/80">{description}</p>}
            </div>
          )}
        </div>
        
        {/* Center - Device + Undo/Redo */}
        <div className="flex items-center gap-1">
          <div className="flex items-center border border-white/30 rounded-lg p-0.5 bg-white/10">
            <Button 
              variant={previewDevice === 'desktop' ? 'secondary' : 'ghost'} 
              size="sm" 
              className={`h-7 px-2 ${previewDevice === 'desktop' ? 'bg-white/90 text-foreground' : 'text-white hover:bg-white/20'}`}
              onClick={() => handleDeviceChange('desktop')}
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button 
              variant={previewDevice === 'mobile' ? 'secondary' : 'ghost'} 
              size="sm" 
              className={`h-7 px-2 ${previewDevice === 'mobile' ? 'bg-white/90 text-foreground' : 'text-white hover:bg-white/20'}`}
              onClick={() => handleDeviceChange('mobile')}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
          <div className="h-5 w-px bg-white/30 mx-2" />
          <Button variant="ghost" size="sm" className="h-7 px-2 text-white hover:bg-white/20" onClick={handleUndo}>
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-white hover:bg-white/20" onClick={handleRedo}>
            <Redo className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-red-200 hover:text-red-100 hover:bg-white/20" onClick={handleDeleteSelected}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-2">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="h-8">
            <TabsList className="h-8 bg-white/10 border-white/30">
              <TabsTrigger value="visual" className="h-7 px-3 text-xs text-white data-[state=active]:bg-white/90 data-[state=active]:text-foreground">
                <Layout className="h-3.5 w-3.5 mr-1.5" />
                Design
              </TabsTrigger>
              <TabsTrigger value="html" className="h-7 px-3 text-xs text-white data-[state=active]:bg-white/90 data-[state=active]:text-foreground">
                <Code className="h-3.5 w-3.5 mr-1.5" />
                Code
              </TabsTrigger>
              <TabsTrigger value="preview" className="h-7 px-3 text-xs text-white data-[state=active]:bg-white/90 data-[state=active]:text-foreground">
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                Preview
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="h-5 w-px bg-white/30" />
          
          {/* Template mode buttons */}
          {showGallery && (
            <Button variant="outline" size="sm" className="h-7 bg-white/90 border-white/30 hover:bg-white" onClick={() => setShowTemplateGallery(true)}>
              <LayoutTemplate className="h-3.5 w-3.5 mr-1.5" />
              Templates
            </Button>
          )}
          {showImageLibrary && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 bg-white/90 border-white/30 hover:bg-white"
              onClick={handleOpenImageLibrary}
              disabled={!currentProject?.id}
            >
              <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
              Images
            </Button>
          )}
          
          {!isFullscreen && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-white hover:bg-white/20" onClick={() => setIsFullscreen(true)}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
          {showReset && onReset && (
            <Button variant="outline" size="sm" className="h-7 bg-white/90 border-white/30 hover:bg-white" onClick={onReset} disabled={loading}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Reset
            </Button>
          )}
          <Button size="sm" className="h-7 bg-white text-foreground hover:bg-white/90" onClick={handleSave} disabled={loading || (mode === 'template' ? !templateNameValue : !hasChanges)}>
            {loading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
            {saveLabel}
          </Button>
        </div>
      </div>

      {/* Subject Line Bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/30 shrink-0">
        <Label className="text-xs font-medium text-muted-foreground shrink-0">Subject:</Label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Email subject line..."
          className="h-7 text-sm max-w-xl"
        />
        {variables.length > 0 && (
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-xs text-muted-foreground">Variables:</span>
            {variables.slice(0, 4).map(v => (
              <Button
                key={v.name}
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs font-mono"
                onClick={() => handleCopyVariable(v.name)}
              >
                {v.name}
                {copiedVariable === v.name && <Check className="h-3 w-3 ml-1 text-green-500" />}
              </Button>
            ))}
            {variables.length > 4 && (
              <span className="text-xs text-muted-foreground">+{variables.length - 4} more</span>
            )}
          </div>
        )}
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex min-h-0">
        {activeTab === 'visual' && (
          <>
            {/* Left Panel - Add Elements / Layers */}
            <div className="w-80 border-r bg-card flex flex-col shrink-0 overflow-hidden">
              {/* Panel Tabs */}
              <div className="flex border-b shrink-0">
                <button
                  onClick={() => setLeftPanelTab('add')}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${
                    leftPanelTab === 'add' 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
                <button
                  onClick={() => setLeftPanelTab('layers')}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${
                    leftPanelTab === 'layers' 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Layers className="h-4 w-4" />
                  Layers
                </button>
              </div>
              
              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto">
                {leftPanelTab === 'add' ? (
                  <div className="p-3 space-y-4">
                    {/* Content Blocks */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">Content</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <BlockItem 
                          icon={<Type className="h-5 w-5" />}
                          label="Text"
                          blockId="text"
                          onClick={() => addBlock('text')}
                          description="Paragraph text block"
                        />
                        <BlockItem 
                          icon={<Heading className="h-5 w-5" />}
                          label="Heading"
                          blockId="heading"
                          onClick={() => addBlock('heading')}
                          description="Title or heading"
                        />
                        <BlockItem 
                          icon={<RectangleHorizontal className="h-5 w-5" />}
                          label="Button"
                          blockId="button"
                          onClick={() => addBlock('button')}
                          description="Call-to-action button"
                        />
                        <BlockItem 
                          icon={<ImageIcon className="h-5 w-5" />}
                          label="Image"
                          blockId="image"
                          onClick={() => addBlock('image')}
                          description="Image placeholder"
                        />
                        <BlockItem 
                          icon={<ExternalLink className="h-5 w-5" />}
                          label="Link"
                          blockId="link"
                          onClick={() => addBlock('link')}
                          description="Inline text link"
                        />
                        <BlockItem 
                          icon={<List className="h-5 w-5" />}
                          label="List"
                          blockId="list"
                          onClick={() => addBlock('list')}
                          description="Bullet point list"
                        />
                        <BlockItem 
                          icon={<Quote className="h-5 w-5" />}
                          label="Quote"
                          blockId="quote"
                          onClick={() => addBlock('quote')}
                          description="Blockquote with styling"
                        />
                        <BlockItem 
                          icon={<Share2 className="h-5 w-5" />}
                          label="Social"
                          blockId="social-icons"
                          onClick={() => addBlock('social-icons')}
                          description="Social media icons"
                        />
                      </div>
                    </div>

                    {/* Layout Blocks */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">Layout</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <BlockItem 
                          icon={<Square className="h-5 w-5" />}
                          label="Section"
                          blockId="section"
                          onClick={() => addBlock('section')}
                          description="Full-width section"
                        />
                        <BlockItem 
                          icon={<Layout className="h-5 w-5" />}
                          label="Container"
                          blockId="container"
                          onClick={() => addBlock('container')}
                          description="Centered container"
                        />
                        <BlockItem 
                          icon={<SeparatorHorizontal className="h-5 w-5" />}
                          label="Divider"
                          blockId="divider"
                          onClick={() => addBlock('divider')}
                          description="Horizontal line"
                        />
                        <BlockItem 
                          icon={<MoveVertical className="h-5 w-5" />}
                          label="Spacer"
                          blockId="spacer"
                          onClick={() => addBlock('spacer')}
                          description="Vertical spacing"
                        />
                        <BlockItem 
                          icon={<Columns2 className="h-5 w-5" />}
                          label="2 Columns"
                          blockId="columns-2"
                          onClick={() => addBlock('columns-2')}
                          description="Two-column layout"
                        />
                        <BlockItem 
                          icon={<Columns3 className="h-5 w-5" />}
                          label="3 Columns"
                          blockId="columns-3"
                          onClick={() => addBlock('columns-3')}
                          description="Three-column layout"
                        />
                      </div>
                    </div>

                    {/* Pre-built Sections */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">Sections</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <BlockItem 
                          icon={<Sparkles className="h-5 w-5" />}
                          label="Hero"
                          blockId="hero"
                          onClick={() => addBlock('hero')}
                          description="Hero banner with CTA"
                        />
                        <BlockItem 
                          icon={<PanelBottom className="h-5 w-5" />}
                          label="Footer"
                          blockId="footer"
                          onClick={() => addBlock('footer')}
                          description="Email footer"
                        />
                        <BlockItem 
                          icon={<MousePointer className="h-5 w-5" />}
                          label="CTA Box"
                          blockId="cta-section"
                          onClick={() => addBlock('cta-section')}
                          description="Call-to-action section"
                        />
                        <BlockItem 
                          icon={<LayoutPanelLeft className="h-5 w-5" />}
                          label="Image+Text"
                          blockId="image-text"
                          onClick={() => addBlock('image-text')}
                          description="Side-by-side layout"
                        />
                        <BlockItem 
                          icon={<MessageSquareQuote className="h-5 w-5" />}
                          label="Testimonial"
                          blockId="testimonial"
                          onClick={() => addBlock('testimonial')}
                          className="col-span-2"
                          description="Customer testimonial card"
                        />
                      </div>
                    </div>

                    {/* Variables */}
                    {variables.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">Variables</h4>
                        <div className="space-y-1.5">
                          {variables.map((v, i) => (
                            <div
                              key={i}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', `var-${v.name}`)
                                e.dataTransfer.effectAllowed = 'copy'
                              }}
                              onClick={() => addBlock(`var-${v.name}`)}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border bg-gradient-to-r from-primary/5 to-transparent hover:from-primary/10 hover:border-primary/30 transition-all text-left group cursor-grab active:cursor-grabbing"
                            >
                              <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                                <Variable className="h-3.5 w-3.5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-mono text-foreground truncate">{v.name}</div>
                                {v.description && (
                                  <div className="text-[10px] text-muted-foreground truncate">{v.description}</div>
                                )}
                              </div>
                              <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Drag Hint */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-dashed">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Click to add or drag to canvas</span>
                    </div>
                  </div>
                ) : null}
                
                {/* Layers Panel - conditionally visible but always in DOM for GrapesJS */}
                <div 
                  id={`${editorId}-layers`} 
                  className={`p-2 ${leftPanelTab === 'layers' ? '' : 'hidden'}`} 
                />
              </div>

              {/* Hidden containers for GrapesJS */}
              <div id={`${editorId}-blocks`} className="hidden" />
            </div>

            {/* Canvas - GrapesJS editor container */}
            <div 
              ref={editorRef} 
              className="flex-1 min-h-0 overflow-hidden"
            />

            {/* Right Panel - Style Properties */}
            <div className="w-80 border-l bg-card flex flex-col shrink-0 overflow-hidden">
              <div className="px-4 py-3 border-b shrink-0">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  {selectedElement ? (
                    <>
                      <span className="capitalize">{selectedElement.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="text-xs font-normal text-muted-foreground">Selected</span>
                    </>
                  ) : (
                    'Properties'
                  )}
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                {/* Custom Background Section */}
                {selectedElement && (
                  <div className="border-b">
                    <div className="w-full flex items-center justify-between p-3">
                      <button
                        onClick={() => toggleSection('background')}
                        className="flex-1 flex items-center gap-2 hover:opacity-80 transition-opacity text-left"
                      >
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Background</span>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedSections.includes('background') ? 'rotate-180' : ''}`} />
                      </button>
                      <button
                        onClick={clearBackground}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2"
                      >
                        Clear
                      </button>
                    </div>
                    {expandedSections.includes('background') && (
                      <div className="px-3 pb-3">
                        {/* Color / Gradient / Image Toggle */}
                        <div className="flex rounded-lg border p-1 mb-3 bg-muted/30">
                          <button
                            onClick={() => setBackgroundMode('color')}
                            className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all ${
                              backgroundMode === 'color' 
                                ? 'bg-background shadow-sm text-foreground' 
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            Color
                          </button>
                          <button
                            onClick={() => setBackgroundMode('gradient')}
                            className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all ${
                              backgroundMode === 'gradient' 
                                ? 'bg-background shadow-sm text-foreground' 
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            Gradient
                          </button>
                          <button
                            onClick={() => setBackgroundMode('image')}
                            className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all ${
                              backgroundMode === 'image' 
                                ? 'bg-background shadow-sm text-foreground' 
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            Image
                          </button>
                        </div>
                    
                        {backgroundMode === 'color' ? (
                      /* Solid Color Mode */
                      <div>
                        <div className="flex gap-3 items-start mb-3">
                          <div 
                            className="w-12 h-12 rounded-lg border cursor-pointer relative overflow-hidden shrink-0"
                            style={{ backgroundColor }}
                            onClick={() => document.getElementById('bg-color-picker')?.click()}
                          >
                            <input
                              id="bg-color-picker"
                              type="color"
                              value={rgbToHex(backgroundColor)}
                              onChange={(e) => setBackgroundColor(e.target.value)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                          </div>
                          <div className="flex-1">
                            <input
                              type="text"
                              value={getHexDisplay(backgroundColor)}
                              onChange={(e) => setBackgroundColor(e.target.value)}
                              className="w-full text-xs px-2 py-1.5 rounded border bg-background font-mono"
                              placeholder="#ffffff"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Click swatch or enter hex</p>
                          </div>
                        </div>
                        <button
                          onClick={() => applyBackgroundColor(backgroundColor)}
                          className="w-full py-2 px-3 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          Apply Color
                        </button>
                      </div>
                    ) : backgroundMode === 'gradient' ? (
                      /* Gradient Mode */
                      <div>
                        {/* Gradient Preview */}
                        <div 
                          className="h-12 rounded-lg mb-3 border cursor-pointer shadow-inner"
                          style={{ 
                            background: `linear-gradient(${gradientAngle}deg, ${gradientColor1}, ${gradientColor2})` 
                          }}
                          onClick={applyGradient}
                          title="Click to apply gradient"
                        />
                        
                        {/* Color Pickers - stacked layout */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1.5 block">Start</label>
                            <div 
                              className="w-full h-10 rounded-lg border cursor-pointer relative overflow-hidden"
                              style={{ backgroundColor: gradientColor1 }}
                              onClick={() => document.getElementById('gradient-color-1')?.click()}
                            >
                              <input
                                id="gradient-color-1"
                                type="color"
                                value={rgbToHex(gradientColor1)}
                                onChange={(e) => setGradientColor1(e.target.value)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                            </div>
                            <input
                              type="text"
                              value={getHexDisplay(gradientColor1)}
                              onChange={(e) => setGradientColor1(e.target.value)}
                              className="w-full mt-1.5 text-xs px-2 py-1.5 rounded border bg-background font-mono text-center"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1.5 block">End</label>
                            <div 
                              className="w-full h-10 rounded-lg border cursor-pointer relative overflow-hidden"
                              style={{ backgroundColor: gradientColor2 }}
                              onClick={() => document.getElementById('gradient-color-2')?.click()}
                            >
                              <input
                                id="gradient-color-2"
                                type="color"
                                value={rgbToHex(gradientColor2)}
                                onChange={(e) => setGradientColor2(e.target.value)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                            </div>
                            <input
                              type="text"
                              value={getHexDisplay(gradientColor2)}
                              onChange={(e) => setGradientColor2(e.target.value)}
                              className="w-full mt-1.5 text-xs px-2 py-1.5 rounded border bg-background font-mono text-center"
                            />
                          </div>
                        </div>
                        
                        {/* Angle Slider */}
                        <div className="mb-3">
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-xs text-muted-foreground">Angle</label>
                            <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{gradientAngle}°</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="360"
                            value={gradientAngle}
                            onChange={(e) => setGradientAngle(parseInt(e.target.value))}
                            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-border"
                          />
                        </div>
                        
                        {/* Apply Button */}
                        <button
                          onClick={applyGradient}
                          className="w-full py-2 px-3 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          Apply Gradient
                        </button>
                      </div>
                    ) : (
                      /* Image Mode */
                      <div>
                        {/* Image Preview */}
                        {backgroundImage && (
                          <div 
                            className="h-20 rounded-lg mb-3 border bg-muted/30 bg-cover bg-center bg-no-repeat"
                            style={{ backgroundImage: `url(${backgroundImage})` }}
                          />
                        )}
                        
                        {/* Image URL Input */}
                        <div className="mb-3">
                          <label className="text-xs text-muted-foreground mb-1.5 block">Image URL</label>
                          <input
                            type="text"
                            value={backgroundImage}
                            onChange={(e) => setBackgroundImage(e.target.value)}
                            placeholder="https://example.com/image.jpg"
                            className="w-full text-xs px-2 py-2 rounded border bg-background"
                          />
                        </div>
                        
                        {/* Size & Position */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Size</label>
                            <select
                              id="bg-image-size"
                              defaultValue="cover"
                              className="w-full text-xs px-2 py-1.5 rounded border bg-background"
                            >
                              <option value="cover">Cover</option>
                              <option value="contain">Contain</option>
                              <option value="auto">Auto</option>
                              <option value="100% 100%">Stretch</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Position</label>
                            <select
                              id="bg-image-position"
                              defaultValue="center"
                              className="w-full text-xs px-2 py-1.5 rounded border bg-background"
                            >
                              <option value="center">Center</option>
                              <option value="top">Top</option>
                              <option value="bottom">Bottom</option>
                              <option value="left">Left</option>
                              <option value="right">Right</option>
                            </select>
                          </div>
                        </div>
                        
                        {/* Apply Button */}
                        <button
                          onClick={() => {
                            if (!selectedElement || !backgroundImage) return
                            const size = document.getElementById('bg-image-size')?.value || 'cover'
                            const position = document.getElementById('bg-image-position')?.value || 'center'
                            selectedElement.addStyle({ 
                              'background-image': `url(${backgroundImage})`,
                              'background-size': size,
                              'background-position': position,
                              'background-repeat': 'no-repeat'
                            })
                          }}
                          disabled={!backgroundImage}
                          className="w-full py-2 px-3 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Apply Image
                        </button>
                      </div>
                    )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Typography Section - Text elements only */}
                {selectedElement && isImageElement && (
                  <div className="border-b">
                    <button
                      onClick={() => toggleSection('image')}
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Image</span>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedSections.includes('image') ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedSections.includes('image') && (
                      <div className="px-3 pb-3 space-y-3">
                        <div className="flex gap-3">
                          <div className="w-20 h-20 rounded-md border bg-muted/50 flex items-center justify-center overflow-hidden">
                            {imageUrl ? (
                              <img src={imageUrl} alt={imageAlt || 'Selected image'} className="w-full h-full object-contain" />
                            ) : (
                              <div className="text-[10px] text-muted-foreground text-center px-2">No image</div>
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Image URL</label>
                              <input
                                type="text"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                placeholder="https://..."
                                className="w-full text-xs px-2 py-1.5 rounded border bg-background"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Alt Text</label>
                              <input
                                type="text"
                                value={imageAlt}
                                onChange={(e) => setImageAlt(e.target.value)}
                                placeholder="Describe the image"
                                className="w-full text-xs px-2 py-1.5 rounded border bg-background"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={handleApplyImageUrl}
                            disabled={!imageUrl}
                          >
                            Apply URL
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => imageFileInputRef.current?.click()}
                            disabled={isUploadingImage || !currentProject?.id}
                          >
                            {isUploadingImage ? (
                              <span className="flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin" />Uploading…</span>
                            ) : (
                              'Upload'
                            )}
                          </Button>
                          {showImageLibrary && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleOpenImageLibrary}
                              disabled={!currentProject?.id || filesLoading}
                            >
                              Browse Library
                            </Button>
                          )}
                        </div>
                        {isUploadingImage && (
                          <div className="text-[11px] text-muted-foreground">Uploading {uploadProgress}%</div>
                        )}
                        {!currentProject?.id && (
                          <div className="text-[11px] text-muted-foreground">Choose a project to store email images.</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {selectedElement && isTextElement && (
                  <div className="border-b">
                    <button
                      onClick={() => toggleSection('typography')}
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Typography</span>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedSections.includes('typography') ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedSections.includes('typography') && (
                      <div className="px-3 pb-3 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Font</label>
                            <select
                              value={typography.fontFamily}
                              onChange={(e) => setTypography(t => ({ ...t, fontFamily: e.target.value }))}
                              className="w-full text-xs px-2 py-1.5 rounded border bg-background"
                            >
                              <option value="Arial, sans-serif">Arial</option>
                              <option value="Helvetica, sans-serif">Helvetica</option>
                              <option value="Georgia, serif">Georgia</option>
                              <option value="Times New Roman, serif">Times New Roman</option>
                              <option value="Verdana, sans-serif">Verdana</option>
                              <option value="Courier New, monospace">Courier New</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Size</label>
                            <div className="flex">
                              <input
                                type="number"
                                value={typography.fontSize}
                                onChange={(e) => setTypography(t => ({ ...t, fontSize: e.target.value }))}
                                className="w-full text-xs px-2 py-1.5 rounded-l border bg-background"
                                min="8"
                                max="72"
                              />
                              <span className="px-2 py-1.5 text-xs bg-muted border border-l-0 rounded-r text-muted-foreground">px</span>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Weight</label>
                            <select
                              value={typography.fontWeight}
                              onChange={(e) => setTypography(t => ({ ...t, fontWeight: e.target.value }))}
                              className="w-full text-xs px-2 py-1.5 rounded border bg-background"
                            >
                              <option value="300">Light</option>
                              <option value="400">Normal</option>
                              <option value="500">Medium</option>
                              <option value="600">Semibold</option>
                              <option value="700">Bold</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Line Height</label>
                            <input
                              type="text"
                              value={typography.lineHeight}
                              onChange={(e) => setTypography(t => ({ ...t, lineHeight: e.target.value }))}
                              className="w-full text-xs px-2 py-1.5 rounded border bg-background"
                              placeholder="1.5"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Text Color</label>
                          <div className="flex gap-2">
                            <div 
                              className="w-10 h-8 rounded border cursor-pointer relative overflow-hidden shrink-0"
                              style={{ backgroundColor: typography.color }}
                              onClick={() => document.getElementById('text-color-picker')?.click()}
                            >
                              <input
                                id="text-color-picker"
                                type="color"
                                value={rgbToHex(typography.color)}
                                onChange={(e) => setTypography(t => ({ ...t, color: e.target.value }))}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                            </div>
                            <input
                              type="text"
                              value={getHexDisplay(typography.color)}
                              onChange={(e) => setTypography(t => ({ ...t, color: e.target.value }))}
                              className="flex-1 text-xs px-2 py-1.5 rounded border bg-background font-mono"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Alignment</label>
                          <div className="flex rounded-lg border p-1 bg-muted/30">
                            {['left', 'center', 'right', 'justify'].map(align => (
                              <button
                                key={align}
                                onClick={() => setTypography(t => ({ ...t, textAlign: align }))}
                                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded transition-all ${
                                  typography.textAlign === align 
                                    ? 'bg-background shadow-sm text-foreground' 
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                {align.charAt(0).toUpperCase() + align.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={applyTypography}
                          className="w-full py-2 px-3 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          Apply Typography
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Dimensions Section */}
                {selectedElement && (
                  <div className="border-b">
                    <button
                      onClick={() => toggleSection('dimensions')}
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dimensions</span>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedSections.includes('dimensions') ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedSections.includes('dimensions') && (
                      <div className="px-3 pb-3 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Width</label>
                            <div className="flex">
                              <input
                                type="text"
                                value={dimensions.width}
                                onChange={(e) => setDimensions(d => ({ ...d, width: e.target.value }))}
                                className="w-full text-xs px-2 py-1.5 rounded-l border bg-background"
                                placeholder="auto"
                              />
                              <span className="px-2 py-1.5 text-xs bg-muted border border-l-0 rounded-r text-muted-foreground">px</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Height</label>
                            <div className="flex">
                              <input
                                type="text"
                                value={dimensions.height}
                                onChange={(e) => setDimensions(d => ({ ...d, height: e.target.value }))}
                                className="w-full text-xs px-2 py-1.5 rounded-l border bg-background"
                                placeholder="auto"
                              />
                              <span className="px-2 py-1.5 text-xs bg-muted border border-l-0 rounded-r text-muted-foreground">px</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Max Width</label>
                          <div className="flex">
                            <input
                              type="text"
                              value={dimensions.maxWidth}
                              onChange={(e) => setDimensions(d => ({ ...d, maxWidth: e.target.value }))}
                              className="w-full text-xs px-2 py-1.5 rounded-l border bg-background"
                              placeholder="none"
                            />
                            <span className="px-2 py-1.5 text-xs bg-muted border border-l-0 rounded-r text-muted-foreground">px</span>
                          </div>
                        </div>
                        <button
                          onClick={applyDimensions}
                          className="w-full py-2 px-3 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          Apply Dimensions
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Spacing Section */}
                {selectedElement && (
                  <div className="border-b">
                    <button
                      onClick={() => toggleSection('spacing')}
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Spacing</span>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedSections.includes('spacing') ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedSections.includes('spacing') && (
                      <div className="px-3 pb-3 space-y-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Padding</label>
                          <div className="grid grid-cols-4 gap-1">
                            <div>
                              <input
                                type="text"
                                value={padding.top}
                                onChange={(e) => setPadding(p => ({ ...p, top: e.target.value }))}
                                className="w-full text-xs px-2 py-1.5 rounded border bg-background text-center"
                                placeholder="0"
                              />
                              <span className="text-[10px] text-muted-foreground text-center block mt-0.5">Top</span>
                            </div>
                            <div>
                              <input
                                type="text"
                                value={padding.right}
                                onChange={(e) => setPadding(p => ({ ...p, right: e.target.value }))}
                                className="w-full text-xs px-2 py-1.5 rounded border bg-background text-center"
                                placeholder="0"
                              />
                              <span className="text-[10px] text-muted-foreground text-center block mt-0.5">Right</span>
                            </div>
                            <div>
                              <input
                                type="text"
                                value={padding.bottom}
                                onChange={(e) => setPadding(p => ({ ...p, bottom: e.target.value }))}
                                className="w-full text-xs px-2 py-1.5 rounded border bg-background text-center"
                                placeholder="0"
                              />
                              <span className="text-[10px] text-muted-foreground text-center block mt-0.5">Bottom</span>
                            </div>
                            <div>
                              <input
                                type="text"
                                value={padding.left}
                                onChange={(e) => setPadding(p => ({ ...p, left: e.target.value }))}
                                className="w-full text-xs px-2 py-1.5 rounded border bg-background text-center"
                                placeholder="0"
                              />
                              <span className="text-[10px] text-muted-foreground text-center block mt-0.5">Left</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Margin</label>
                          <div className="grid grid-cols-4 gap-1">
                            <div>
                              <input
                                type="text"
                                value={margin.top}
                                onChange={(e) => setMargin(m => ({ ...m, top: e.target.value }))}
                                className="w-full text-xs px-2 py-1.5 rounded border bg-background text-center"
                                placeholder="0"
                              />
                              <span className="text-[10px] text-muted-foreground text-center block mt-0.5">Top</span>
                            </div>
                            <div>
                              <input
                                type="text"
                                value={margin.right}
                                onChange={(e) => setMargin(m => ({ ...m, right: e.target.value }))}
                                className="w-full text-xs px-2 py-1.5 rounded border bg-background text-center"
                                placeholder="0"
                              />
                              <span className="text-[10px] text-muted-foreground text-center block mt-0.5">Right</span>
                            </div>
                            <div>
                              <input
                                type="text"
                                value={margin.bottom}
                                onChange={(e) => setMargin(m => ({ ...m, bottom: e.target.value }))}
                                className="w-full text-xs px-2 py-1.5 rounded border bg-background text-center"
                                placeholder="0"
                              />
                              <span className="text-[10px] text-muted-foreground text-center block mt-0.5">Bottom</span>
                            </div>
                            <div>
                              <input
                                type="text"
                                value={margin.left}
                                onChange={(e) => setMargin(m => ({ ...m, left: e.target.value }))}
                                className="w-full text-xs px-2 py-1.5 rounded border bg-background text-center"
                                placeholder="0"
                              />
                              <span className="text-[10px] text-muted-foreground text-center block mt-0.5">Left</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={applySpacing}
                          className="w-full py-2 px-3 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          Apply Spacing
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Border Section */}
                {selectedElement && (
                  <div className="border-b">
                    <button
                      onClick={() => toggleSection('border')}
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Border</span>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedSections.includes('border') ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedSections.includes('border') && (
                      <div className="px-3 pb-3 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Width</label>
                            <div className="flex">
                              <input
                                type="text"
                                value={border.width}
                                onChange={(e) => setBorder(b => ({ ...b, width: e.target.value }))}
                                className="w-full text-xs px-2 py-1.5 rounded-l border bg-background"
                                placeholder="0"
                              />
                              <span className="px-2 py-1.5 text-xs bg-muted border border-l-0 rounded-r text-muted-foreground">px</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Style</label>
                            <select
                              value={border.style}
                              onChange={(e) => setBorder(b => ({ ...b, style: e.target.value }))}
                              className="w-full text-xs px-2 py-1.5 rounded border bg-background"
                            >
                              <option value="none">None</option>
                              <option value="solid">Solid</option>
                              <option value="dashed">Dashed</option>
                              <option value="dotted">Dotted</option>
                              <option value="double">Double</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Color</label>
                            <div className="flex gap-1">
                              <div 
                                className="w-8 h-8 rounded border cursor-pointer relative overflow-hidden shrink-0"
                                style={{ backgroundColor: border.color }}
                                onClick={() => document.getElementById('border-color-picker')?.click()}
                              >
                                <input
                                  id="border-color-picker"
                                  type="color"
                                  value={rgbToHex(border.color)}
                                  onChange={(e) => setBorder(b => ({ ...b, color: e.target.value }))}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                              </div>
                              <input
                                type="text"
                                value={getHexDisplay(border.color)}
                                onChange={(e) => setBorder(b => ({ ...b, color: e.target.value }))}
                                className="flex-1 text-xs px-2 py-1.5 rounded border bg-background font-mono"
                              />
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Corner Radius</label>
                          <div className="grid grid-cols-4 gap-1">
                            <div>
                              <input
                                type="text"
                                value={border.radiusTL}
                                onChange={(e) => setBorder(b => ({ ...b, radiusTL: e.target.value }))}
                                className="w-full text-xs px-2 py-1.5 rounded border bg-background text-center"
                                placeholder="0"
                              />
                              <span className="text-[10px] text-muted-foreground text-center block mt-0.5">TL</span>
                            </div>
                            <div>
                              <input
                                type="text"
                                value={border.radiusTR}
                                onChange={(e) => setBorder(b => ({ ...b, radiusTR: e.target.value }))}
                                className="w-full text-xs px-2 py-1.5 rounded border bg-background text-center"
                                placeholder="0"
                              />
                              <span className="text-[10px] text-muted-foreground text-center block mt-0.5">TR</span>
                            </div>
                            <div>
                              <input
                                type="text"
                                value={border.radiusBR}
                                onChange={(e) => setBorder(b => ({ ...b, radiusBR: e.target.value }))}
                                className="w-full text-xs px-2 py-1.5 rounded border bg-background text-center"
                                placeholder="0"
                              />
                              <span className="text-[10px] text-muted-foreground text-center block mt-0.5">BR</span>
                            </div>
                            <div>
                              <input
                                type="text"
                                value={border.radiusBL}
                                onChange={(e) => setBorder(b => ({ ...b, radiusBL: e.target.value }))}
                                className="w-full text-xs px-2 py-1.5 rounded border bg-background text-center"
                                placeholder="0"
                              />
                              <span className="text-[10px] text-muted-foreground text-center block mt-0.5">BL</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={applyBorder}
                          className="w-full py-2 px-3 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          Apply Border
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Effects Section */}
                {selectedElement && (
                  <div className="border-b">
                    <button
                      onClick={() => toggleSection('effects')}
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Effects</span>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedSections.includes('effects') ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedSections.includes('effects') && (
                      <div className="px-3 pb-3 space-y-3">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-xs text-muted-foreground">Opacity</label>
                            <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{Math.round(opacity * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={opacity}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value)
                              setOpacity(val)
                              applyOpacity(val)
                            }}
                            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-border"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Hidden GrapesJS StyleManager container - needed for initialization */}
                <div id={`${editorId}-styles`} className="hidden" />
                
                {!selectedElement && (
                  <div className="p-6 text-center text-muted-foreground">
                    <MousePointer className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium">No element selected</p>
                    <p className="text-xs mt-1">Click on an element in the canvas to edit its properties</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'html' && (
          <div className="flex-1 flex flex-col p-4">
            <Textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              placeholder="Paste or write your HTML email template here..."
              className="font-mono text-sm flex-1 resize-none"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Use inline styles for best email client compatibility. Variables like {'{{first_name}}'} will be replaced when sent.
            </p>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="flex-1 flex flex-col items-center justify-start p-6 bg-muted/30 overflow-auto">
            <div 
              className={`bg-white shadow-xl rounded-lg overflow-hidden ${
                previewDevice === 'mobile' ? 'w-[375px]' : 'w-full max-w-[700px]'
              }`}
            >
              <div className="bg-gray-100 px-4 py-2 border-b flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 text-center text-xs text-muted-foreground truncate">
                  {subject || 'No subject'}
                </div>
              </div>
              <div 
                className="p-0"
                dangerouslySetInnerHTML={{ 
                  __html: getPreviewHtml(htmlContent)
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Image Library Modal - lazy loaded */}
      {showImageLibrary && showImageLibraryModal && (
        <Suspense fallback={null}>
          <ImageLibrary
            open={showImageLibraryModal}
            onOpenChange={setShowImageLibraryModal}
            onSelect={handleImageSelect}
            onUpload={handleImageLibraryUpload}
            images={projectFiles}
            loading={filesLoading}
            uploadProgress={uploadProgress}
          />
        </Suspense>
      )}

      {/* Template Gallery Modal - lazy loaded */}
      {showGallery && showTemplateGallery && (
        <Suspense fallback={null}>
          <TemplateGallery
            open={showTemplateGallery}
            onOpenChange={setShowTemplateGallery}
            onSelect={handleTemplateSelect}
          />
        </Suspense>
      )}
    </div>
  )
}

export default EmailEditor
