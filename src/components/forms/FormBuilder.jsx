/**
 * Form Builder - World-class visual form builder
 * 
 * Full-screen inline experience matching PostComposerPage
 * 3-column layout with drag-and-drop, multi-step support
 * Uses brand_primary and brand_primary exclusively
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { DndContext, closestCenter, DragOverlay, useSensor, useSensors, PointerSensor, KeyboardSensor, useDroppable, useDraggable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Type,
  Mail,
  Phone,
  Hash,
  AlignLeft,
  List,
  CircleDot,
  CheckSquare,
  Calendar,
  Clock,
  Upload,
  Star,
  Sliders,
  EyeOff,
  Heading,
  FileText,
  Plus,
  Trash2,
  Settings2,
  Settings,
  GripVertical,
  Eye,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Copy,
  Layers,
  Sparkles,
  Zap,
  Target,
  Users,
  MessageSquare,
  Send,
  AlertCircle,
  Check,
  Loader2,
  Wand2,
  Smartphone,
  Monitor,
  LayoutGrid,
  Palette,
  Code,
  Globe,
  ArrowRight,
  ArrowLeft,
  Workflow,
  Split,
  Maximize2,
  Minimize2,
  RotateCcw,
  Grid3X3,
  Undo2,
  Redo2,
  MousePointer,
  Image,
  ListOrdered,
  Layout,
  Shield,
  Wrench
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useCommerceOfferings } from '@/lib/hooks'
import portalApi, { engageApi } from '@/lib/portal-api'
import useAuthStore from '@/lib/auth-store'

// =============================================================================
// CONSTANTS
// =============================================================================

const FIELD_TYPES = [
  { type: 'text', label: 'Text Input', icon: Type, category: 'input', description: 'Single line text' },
  { type: 'email', label: 'Email', icon: Mail, category: 'input', description: 'Email address' },
  { type: 'phone', label: 'Phone', icon: Phone, category: 'input', description: 'Phone number' },
  { type: 'number', label: 'Number', icon: Hash, category: 'input', description: 'Numeric input' },
  { type: 'textarea', label: 'Text Area', icon: AlignLeft, category: 'input', description: 'Multi-line text' },
  { type: 'select', label: 'Dropdown', icon: List, category: 'choice', description: 'Single selection' },
  { type: 'radio', label: 'Radio Buttons', icon: CircleDot, category: 'choice', description: 'Single choice' },
  { type: 'checkbox', label: 'Checkboxes', icon: CheckSquare, category: 'choice', description: 'Multiple choices' },
  { type: 'date', label: 'Date', icon: Calendar, category: 'input', description: 'Date picker' },
  { type: 'time', label: 'Time', icon: Clock, category: 'input', description: 'Time picker' },
  { type: 'file', label: 'File Upload', icon: Upload, category: 'advanced', description: 'File attachment' },
  { type: 'image', label: 'Image Upload', icon: Image, category: 'advanced', description: 'Image with preview' },
  { type: 'rating', label: 'Rating', icon: Star, category: 'advanced', description: 'Star rating' },
  { type: 'slider', label: 'Slider', icon: Sliders, category: 'advanced', description: 'Range slider' },
  { type: 'hidden', label: 'Hidden Field', icon: EyeOff, category: 'layout', description: 'Hidden data' },
  { type: 'heading', label: 'Heading', icon: Heading, category: 'layout', description: 'Section title' },
  { type: 'paragraph', label: 'Paragraph', icon: FileText, category: 'layout', description: 'Description text' },
]

const FIELD_CATEGORIES = {
  input: { label: 'Input Fields', icon: Type, color: 'var(--brand-primary)' },
  choice: { label: 'Choice Fields', icon: List, color: 'var(--brand-primary)' },
  advanced: { label: 'Advanced', icon: Zap, color: '#FF9500' },
  layout: { label: 'Layout', icon: LayoutGrid, color: '#8E8E93' }
}

// Quick-add field groups (common combinations)
const FIELD_GROUPS = [
  {
    id: 'full-name',
    label: 'Full Name',
    icon: Users,
    description: 'First + Last name',
    fields: [
      { type: 'text', label: 'First Name', slug: 'first_name', width: 'half', required: true },
      { type: 'text', label: 'Last Name', slug: 'last_name', width: 'half', required: true }
    ]
  },
  {
    id: 'contact-info',
    label: 'Contact Info',
    icon: Phone,
    description: 'Email + Phone',
    fields: [
      { type: 'email', label: 'Email', slug: 'email', width: 'half', required: true },
      { type: 'phone', label: 'Phone', slug: 'phone', width: 'half' }
    ]
  },
  {
    id: 'address-block',
    label: 'Address',
    icon: Globe,
    description: 'Full address fields',
    fields: [
      { type: 'text', label: 'Street Address', slug: 'street_address', width: 'full' },
      { type: 'text', label: 'City', slug: 'city', width: 'third' },
      { type: 'text', label: 'State', slug: 'state', width: 'third' },
      { type: 'text', label: 'ZIP Code', slug: 'zip', width: 'third' }
    ]
  },
  {
    id: 'rating-feedback',
    label: 'Feedback',
    icon: Star,
    description: 'Rating + Comments',
    fields: [
      { type: 'rating', label: 'How would you rate us?', slug: 'rating', width: 'full', required: true },
      { type: 'textarea', label: 'Additional Comments', slug: 'comments', width: 'full' }
    ]
  }
]

const FORM_TYPES = {
  prospect: { label: 'Lead Capture', icon: Users, color: 'var(--brand-primary)', description: 'Capture leads for CRM' },
  contact: { label: 'Contact Form', icon: MessageSquare, color: 'var(--brand-primary)', description: 'General inquiries' },
  support: { label: 'Support Request', icon: AlertCircle, color: '#007AFF', description: 'Support tickets' },
  feedback: { label: 'Feedback', icon: Send, color: '#FF9500', description: 'Customer feedback' },
  newsletter: { label: 'Newsletter', icon: Mail, color: '#AF52DE', description: 'Email subscriptions' },
  custom: { label: 'Custom', icon: Zap, color: '#8E8E93', description: 'Custom routing' },
}

const FORM_TEMPLATES = [
  { 
    id: 'contact', 
    name: 'Contact Form', 
    description: 'Name, email, message',
    icon: MessageSquare,
    fields: ['name', 'email', 'message']
  },
  { 
    id: 'lead', 
    name: 'Lead Capture', 
    description: 'Full lead gen form',
    icon: Users,
    fields: ['name', 'email', 'phone', 'company', 'message']
  },
  { 
    id: 'newsletter', 
    name: 'Newsletter', 
    description: 'Email signup only',
    icon: Mail,
    fields: ['email']
  },
  { 
    id: 'feedback', 
    name: 'Feedback', 
    description: 'Rating + comments',
    icon: Star,
    fields: ['rating', 'message']
  },
  { 
    id: 'support', 
    name: 'Support Request', 
    description: 'Issue submission',
    icon: AlertCircle,
    fields: ['name', 'email', 'subject', 'priority', 'message']
  },
]

// =============================================================================
// LIVE FIELD INPUT - Renders actual form inputs for live preview
// =============================================================================

// Normalize field.options to an array of { label, value } (API may return object or non-array)
function getFieldOptions(field) {
  const raw = field?.options
  if (!raw) return []
  if (!Array.isArray(raw)) return []
  return raw.map(opt =>
    typeof opt === 'string'
      ? { label: opt, value: opt.toLowerCase().replace(/\s+/g, '_') }
      : { label: opt?.label ?? opt?.value ?? '', value: opt?.value ?? String(opt?.label ?? '').toLowerCase().replace(/\s+/g, '_') }
  )
}

function LiveFieldInput({ field, isPreview = true }) {
  // Use the label as placeholder when hide_label is true
  const effectivePlaceholder = field.hide_label 
    ? field.label 
    : (field.placeholder || `Enter ${field.label.toLowerCase()}...`)
  
  const baseInputClass = "w-full px-3 py-2.5 rounded-lg border border-[var(--input-border)] text-sm bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] transition-all placeholder:text-[var(--text-tertiary)]"
  
  switch (field.field_type) {
    case 'text':
    case 'number':
      return (
        <input 
          type={field.field_type}
          placeholder={effectivePlaceholder}
          className={baseInputClass}
          disabled={isPreview}
        />
      )
    
    case 'email':
      return (
        <input 
          type="email"
          placeholder={field.hide_label ? field.label : (field.placeholder || 'your@email.com')}
          className={baseInputClass}
          disabled={isPreview}
        />
      )
    
    case 'phone':
      return (
        <input 
          type="tel"
          placeholder={field.hide_label ? field.label : (field.placeholder || '(555) 123-4567')}
          className={baseInputClass}
          disabled={isPreview}
        />
      )
    
    case 'textarea':
      return (
        <textarea 
          placeholder={field.hide_label ? field.label : (field.placeholder || 'Enter your message...')}
          className={cn(baseInputClass, "min-h-[100px] resize-none")}
          disabled={isPreview}
        />
      )
    
    case 'select':
      return (
        <select className={cn(baseInputClass, "cursor-pointer")} disabled={isPreview}>
          <option value="">{field.hide_label ? field.label : (field.placeholder || 'Select an option...')}</option>
          {getFieldOptions(field).map((opt, i) => (
            <option key={i} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )
    
    case 'checkbox':
      return (
        <label className="flex items-center gap-3 cursor-pointer">
          <input 
            type="checkbox" 
            className="w-5 h-5 rounded border-[var(--input-border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]" 
            disabled={isPreview}
          />
          <span className="text-sm text-[var(--text-secondary)]">{field.placeholder || 'I agree to the terms'}</span>
        </label>
      )
    
    case 'radio': {
      const opts = getFieldOptions(field)
      return (
        <div className="space-y-2">
          {(opts.length > 0 ? opts : [{ label: 'Option 1', value: 'option_1' }]).map((opt, i) => (
            <label key={i} className="flex items-center gap-3 cursor-pointer">
              <input 
                type="radio" 
                name={field.slug} 
                className="w-5 h-5 border-[var(--input-border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]" 
                disabled={isPreview}
              />
              <span className="text-sm text-[var(--text-secondary)]">{opt.label}</span>
            </label>
          ))}
        </div>
      )
    }
    
    case 'date':
      return (
        <input 
          type="date"
          className={baseInputClass}
          disabled={isPreview}
        />
      )
    
    case 'time':
      return (
        <input 
          type="time"
          className={baseInputClass}
          disabled={isPreview}
        />
      )
    
    case 'file':
      return (
        <div className="flex items-center justify-center w-full h-24 border-2 border-dashed border-[var(--input-border)] rounded-lg bg-[var(--glass-bg)] hover:bg-[var(--surface-page)] transition-colors cursor-pointer">
          <div className="text-center">
            <Upload className="h-6 w-6 mx-auto text-[var(--text-tertiary)] mb-1" />
            <span className="text-sm text-[var(--text-secondary)]">Drop files here or click to upload</span>
          </div>
        </div>
      )
    
    case 'image':
      return (
        <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-[var(--input-border)] rounded-lg bg-[var(--glass-bg)] hover:bg-[var(--surface-page)] transition-colors cursor-pointer">
          <div className="text-center">
            <Image className="h-8 w-8 mx-auto text-[var(--text-tertiary)] mb-2" />
            <span className="text-sm text-[var(--text-secondary)]">Drop image or click to browse</span>
            <span className="block text-xs text-[var(--text-tertiary)] mt-1">PNG, JPG, GIF up to 10MB</span>
          </div>
        </div>
      )
    
    case 'rating':
      return (
        <div className="flex gap-1">
          {[1,2,3,4,5].map(star => (
            <Star key={star} className="h-6 w-6 text-[var(--text-tertiary)] hover:text-amber-400 cursor-pointer transition-colors" />
          ))}
        </div>
      )
    
    case 'heading':
      return (
        <h3 className="text-lg font-semibold text-[var(--text-primary)] border-b border-[var(--glass-border)] pb-2">
          {field.label}
        </h3>
      )
    
    case 'paragraph':
      return (
        <p className="text-sm text-[var(--text-secondary)]">
          {field.placeholder || 'Descriptive text appears here...'}
        </p>
      )
    
    default:
      return (
        <input 
          type="text"
          placeholder={field.placeholder || 'Enter value...'}
          className={baseInputClass}
          disabled={isPreview}
        />
      )
  }
}

// =============================================================================
// FIELD WITH DROP ZONES - Wraps field with left/right drop zones for side placement
// =============================================================================

function FieldWithDropZones({ field, fieldIndex, children, onSideDrop }) {
  const leftDropId = `drop-left-${field.id}`
  const rightDropId = `drop-right-${field.id}`
  
  const { setNodeRef: setLeftRef, isOver: isOverLeft } = useDroppable({
    id: leftDropId,
    data: { type: 'side-drop', side: 'left', targetFieldId: field.id, fieldIndex }
  })
  
  const { setNodeRef: setRightRef, isOver: isOverRight } = useDroppable({
    id: rightDropId,
    data: { type: 'side-drop', side: 'right', targetFieldId: field.id, fieldIndex }
  })
  
  return (
    <div className="relative group/dropzone">
      {/* Left Drop Zone */}
      <div
        ref={setLeftRef}
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1/2 z-10 transition-all duration-200 pointer-events-none",
          isOverLeft && "opacity-100 bg-[var(--brand-primary)]/10 border-2 border-dashed border-[var(--brand-primary)] rounded-l-xl"
        )}
      >
        {isOverLeft && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-[var(--brand-primary)] text-white text-xs px-2 py-1 rounded-lg shadow-lg">
              Drop here (left half)
            </div>
          </div>
        )}
      </div>
      
      {/* Right Drop Zone */}
      <div
        ref={setRightRef}
        className={cn(
          "absolute right-0 top-0 bottom-0 w-1/2 z-10 transition-all duration-200 pointer-events-none",
          isOverRight && "opacity-100 bg-[var(--brand-primary)]/10 border-2 border-dashed border-[var(--brand-primary)] rounded-r-xl"
        )}
      >
        {isOverRight && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-[var(--brand-primary)] text-white text-xs px-2 py-1 rounded-lg shadow-lg">
              Drop here (right half)
            </div>
          </div>
        )}
      </div>
      
      {/* The actual field */}
      {children}
    </div>
  )
}

// =============================================================================
// SORTABLE FIELD ITEM - Live preview with drag handle
// =============================================================================

function SortableFieldItem({ field, isSelected, isMultiSelected, onSelect, onDelete, onDuplicate, onWidthChange }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const fieldType = FIELD_TYPES.find(f => f.type === field.field_type)
  const isLayoutField = field.field_type === 'heading' || field.field_type === 'paragraph'
  const highlighted = isSelected || isMultiSelected

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-xl transition-all duration-200",
        isDragging && "opacity-50 scale-[1.02] shadow-2xl z-50",
        highlighted 
          ? "ring-2 ring-[var(--brand-primary)] ring-offset-2 ring-offset-[var(--surface-page)]" 
          : "hover:ring-2 hover:ring-[var(--brand-primary)]/30 hover:ring-offset-2 hover:ring-offset-[var(--surface-page)]"
      )}
      onClick={(e) => onSelect(field, e)}
    >
      {/* Live Form Field Preview */}
      <div className={cn(
        "bg-[var(--glass-bg)] rounded-xl p-4 border border-[var(--glass-border)] shadow-sm",
        isSelected && "border-transparent"
      )}>
        {/* Label Row with Drag Handle - only show if not hiding label */}
        {!isLayoutField && !field.hide_label && (
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1">
              {field.label}
              {field.is_required && <span className="text-red-500">*</span>}
            </label>
            
            {/* Drag handle - always visible on hover */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-[var(--surface-page)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        
        {/* When label is hidden, show drag handle on the right */}
        {!isLayoutField && field.hide_label && (
          <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-[var(--surface-page)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          </div>
        )}
        
        {/* Layout fields get drag handle inline */}
        {isLayoutField && (
          <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-[var(--surface-page)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          </div>
        )}
        
        {/* The actual live input */}
        <LiveFieldInput field={field} isPreview={true} />
        
        {/* Help text */}
        {field.help_text && (
          <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">{field.help_text}</p>
        )}
      </div>
      
      {/* Multi-select indicator */}
      {isMultiSelected && (
        <div className="absolute -top-2 left-3 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-primary)] shadow-lg z-10">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}
      
      {/* Floating Action Bar - appears on single selection */}
      {isSelected && !isMultiSelected && (
        <div className="absolute -top-3 right-4 flex items-center gap-1 bg-[var(--brand-primary)] rounded-lg px-2 py-1 shadow-lg z-10">
          {/* Width controls */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-medium transition-colors",
                  field.width === 'full' ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                )}
                onClick={(e) => { e.stopPropagation(); onWidthChange?.(field.id, 'full') }}
              >
                Full
              </button>
            </TooltipTrigger>
            <TooltipContent>Full width</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-medium transition-colors",
                  field.width === 'half' ? "bg-white/20 text-white" : "text-white/70 hover:text-white"
                )}
                onClick={(e) => { e.stopPropagation(); onWidthChange?.(field.id, 'half') }}
              >
                ½
              </button>
            </TooltipTrigger>
            <TooltipContent>Half width</TooltipContent>
          </Tooltip>
          
          <div className="w-px h-4 bg-white/30 mx-1" />
          
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="p-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                onClick={(e) => { e.stopPropagation(); onDuplicate?.(field) }}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Duplicate</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="p-1 rounded text-white/70 hover:text-red-300 hover:bg-white/10 transition-colors"
                onClick={(e) => { e.stopPropagation(); onDelete(field.id) }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// DRAGGABLE PALETTE ITEM - For drag-from-palette functionality
// =============================================================================

function DraggablePaletteItem({ field, categoryColor, onClick }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${field.type}`,
    data: { type: 'palette', fieldType: field.type }
  })
  
  const style = transform ? {
    transform: `translate(${transform.x}px, ${transform.y}px)`,
    zIndex: 1000,
  } : undefined
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 cursor-grab active:cursor-grabbing",
        "border-2 border-transparent",
        "bg-[var(--surface-page)] hover:bg-[var(--glass-bg)]",
        "hover:border-[var(--brand-primary)]/30 hover:shadow-md",
        "group",
        isDragging && "opacity-50 shadow-2xl scale-105"
      )}
    >
      <div 
        className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 transition-transform group-hover:scale-110"
        style={{ backgroundColor: `color-mix(in srgb, ${categoryColor} 15%, transparent)` }}
      >
        <field.icon className="h-4 w-4" style={{ color: categoryColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-[var(--text-primary)]">{field.label}</div>
        <div className="text-xs text-[var(--text-tertiary)]">{field.description}</div>
      </div>
      <GripVertical className="h-4 w-4 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}

// =============================================================================
// FIELD PALETTE - Left sidebar with draggable field types
// =============================================================================

function FieldPalette({ onAddField, onAddFieldGroup, onAISuggest, isCollapsed, onToggleCollapse }) {
  const [expandedCategory, setExpandedCategory] = useState('input')
  const [showQuickAdd, setShowQuickAdd] = useState(true)

  const groupedFields = useMemo(() => {
    return FIELD_TYPES.reduce((acc, field) => {
      if (!acc[field.category]) acc[field.category] = []
      acc[field.category].push(field)
      return acc
    }, {})
  }, [])

  if (isCollapsed) {
    return (
      <div className="w-16 shrink-0 border-r border-[var(--glass-border)] bg-[var(--glass-bg)] p-2 flex flex-col items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="mb-2"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        {Object.entries(FIELD_CATEGORIES).map(([key, cat]) => (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                style={{ color: cat.color }}
                onClick={() => {
                  onToggleCollapse()
                  setExpandedCategory(key)
                }}
              >
                <cat.icon className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{cat.label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    )
  }

  return (
    <div className="w-72 shrink-0 border-r border-[var(--glass-border)] bg-[var(--glass-bg)] flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[var(--glass-border)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--brand-primary)]/20 to-[var(--brand-primary)]/20">
            <Plus className="h-4 w-4 text-[var(--brand-primary)]" />
          </div>
          <span className="font-semibold text-[var(--text-primary)]">Add Fields</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Field Categories */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-2">
          {/* Quick Add Groups */}
          <div className="space-y-1">
            <button
              onClick={() => setShowQuickAdd(!showQuickAdd)}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[var(--surface-page)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-[var(--brand-primary)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">Quick Add</span>
                <Badge className="h-5 text-[10px] bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border-0">
                  Fast
                </Badge>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-[var(--text-tertiary)] transition-transform",
                showQuickAdd && "rotate-180"
              )} />
            </button>
            
            {showQuickAdd && (
              <div className="grid grid-cols-1 gap-1 pl-2">
                {FIELD_GROUPS.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => onAddFieldGroup(group)}
                    className="flex items-center gap-3 p-2.5 rounded-lg text-left hover:bg-[var(--surface-page)] transition-all group border border-transparent hover:border-[var(--brand-primary)]/30"
                  >
                    <div 
                      className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                      style={{ backgroundColor: 'var(--brand-primary)' + '15' }}
                    >
                      <group.icon className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">
                        {group.label}
                      </div>
                      <div className="text-xs text-[var(--text-tertiary)] truncate">
                        {group.description}
                      </div>
                    </div>
                    <Plus className="h-4 w-4 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="h-px bg-[var(--glass-border)] my-2" />
          
          {Object.entries(FIELD_CATEGORIES).map(([category, catConfig]) => (
            <div key={category} className="space-y-1">
              <button
                onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[var(--surface-page)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <catConfig.icon className="h-4 w-4" style={{ color: catConfig.color }} />
                  <span className="text-sm font-medium text-[var(--text-primary)]">{catConfig.label}</span>
                  <Badge variant="outline" className="h-5 text-[10px] border-[var(--glass-border)]">
                    {groupedFields[category]?.length}
                  </Badge>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 text-[var(--text-tertiary)] transition-transform",
                  expandedCategory === category && "rotate-180"
                )} />
              </button>
              
              {expandedCategory === category && (
                <div className="grid grid-cols-1 gap-1 pl-2">
                  {groupedFields[category]?.map((field) => (
                    <DraggablePaletteItem
                      key={field.type}
                      field={field}
                      categoryColor={catConfig.color}
                      onClick={() => onAddField(field.type)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* AI Suggestion */}
      <div className="p-3 border-t border-[var(--glass-border)] shrink-0">
        <button 
          onClick={onAISuggest}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-[var(--brand-primary)]/10 to-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 hover:border-[var(--brand-primary)]/40 transition-colors group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)] group-hover:scale-105 transition-transform">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-medium text-sm text-[var(--text-primary)]">Signal Optimize</div>
            <div className="text-xs text-[var(--text-tertiary)]">AI-powered form design</div>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)] group-hover:text-[var(--brand-primary)] transition-colors" />
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// AI SUGGEST PANEL - Signal-powered form design conversation
// =============================================================================

// Valid form types for Signal API
const VALID_FORM_TYPES = ['prospect', 'contact', 'support', 'feedback', 'newsletter', 'custom']

function AISuggestPanel({ 
  isOpen, 
  onClose, 
  formType, 
  currentFields, 
  onApplySuggestions,
  form 
}) {
  const [message, setMessage] = useState('')
  const [conversation, setConversation] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [suggestion, setSuggestion] = useState(null)
  const messagesEndRef = useRef(null)
  
  // Normalize formType - API requires one of the valid types
  const safeFormType = formType && VALID_FORM_TYPES.includes(formType) ? formType : 'contact'
  
  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation])
  
  // Initial prompt when opening
  useEffect(() => {
    if (isOpen && conversation.length === 0) {
      const initialPrompt = currentFields.length > 0
        ? `I have a ${safeFormType} form with ${currentFields.length} fields. How can I improve it?`
        : `Help me design a ${safeFormType} form for: ${form?.name || 'my business'}`
      
      handleSend(initialPrompt, true)
    }
  }, [isOpen])
  
  const handleSend = async (text, isInitial = false) => {
    if (!text.trim() && !isInitial) return
    
    const userMessage = text.trim()
    if (!isInitial) {
      setConversation(prev => [...prev, { role: 'user', content: userMessage }])
    }
    setMessage('')
    setIsLoading(true)
    
    try {
      // Import API dynamically to avoid circular deps
      const { formsAiApi } = await import('@/lib/signal-api')
      
      if (conversation.length === 0 || isInitial) {
        // First message - get full field suggestions
        const raw = await formsAiApi.suggestFields({
          formPurpose: userMessage,
          formType: safeFormType,
          existingFields: currentFields.map(f => ({
            type: f.field_type,
            label: f.label,
            slug: f.slug,
            isRequired: f.is_required,
            width: f.width,
          })),
          conversationHistory: [],
        })
        const result = raw?.data ?? raw
        
        setSuggestion(result)
        setConversation(prev => [
          ...prev,
          { 
            role: 'assistant', 
            content: result?.reasoning ?? 'Here are suggested fields for your form.',
            suggestion: result,
          }
        ])
      } else {
        // Continuing conversation
        const raw = await formsAiApi.continueDesign({
          message: userMessage,
          conversationHistory: conversation.map(m => ({
            role: m.role,
            content: m.content,
          })),
          currentFields: currentFields.map(f => ({
            type: f.field_type,
            label: f.label,
            slug: f.slug,
            isRequired: f.is_required,
            width: f.width,
          })),
          formType: safeFormType,
        })
        const result = raw?.data ?? raw
        
        if (result?.fieldUpdates) {
          setSuggestion(prev => ({
            ...prev,
            fields: result.action === 'replace' 
              ? result.fieldUpdates 
              : result.action === 'add'
                ? [...(prev?.fields || []), ...result.fieldUpdates]
                : prev?.fields,
          }))
        }
        
        setConversation(prev => [
          ...prev,
          { 
            role: 'assistant', 
            content: result.response,
            fieldUpdates: result.fieldUpdates,
            action: result.action,
          }
        ])
      }
    } catch (error) {
      console.error('[Signal Optimize] Error:', error)
      const data = error?.response?.data
      const errMsg = (typeof data === 'string' ? data : null)
        || data?.message 
        || data?.error 
        || error?.message 
        || 'Unknown error'
      const isNetwork = error?.code === 'ERR_NETWORK' || error?.message?.includes('Network Error')
      const isAuth = error?.response?.status === 401
      let userMessage = 'Sorry, I encountered an error. Please try again.'
      if (isNetwork) {
        userMessage = 'Signal API is unreachable. Ensure the Signal API is running (e.g. localhost:3001 in dev) and CORS allows this origin.'
      } else if (isAuth) {
        userMessage = 'Authentication expired. Please refresh the page and try again.'
      } else if (errMsg && errMsg !== 'Unknown error') {
        userMessage = `Error: ${errMsg}`
      }
      setConversation(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: userMessage,
          isError: true,
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleApply = () => {
    if (suggestion?.fields) {
      // Convert suggestion fields to form fields format
      const newFields = suggestion.fields.map(f => ({
        id: crypto.randomUUID(),
        field_type: f.type,
        label: f.label,
        slug: f.slug + '_' + Date.now().toString(36),
        placeholder: f.placeholder || '',
        help_text: f.helpText || '',
        is_required: f.isRequired || false,
        width: f.width || 'full',
        options: f.options,
        validation: f.validation || {},
      }))
      
      onApplySuggestions(newFields, suggestion.steps)
      onClose()
    }
  }
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(message)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="absolute right-0 top-0 bottom-0 w-96 bg-[var(--surface-card)] border-l border-[var(--glass-border)] flex flex-col shadow-2xl z-50">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-[var(--glass-border)] bg-gradient-to-r from-[var(--brand-primary)]/10 to-[var(--brand-primary)]/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)]">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">Signal Optimize</h3>
              <p className="text-xs text-[var(--text-tertiary)]">AI-powered form design</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Conversation */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {conversation.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-3",
                msg.role === 'user' && "justify-end"
              )}
            >
              {msg.role === 'assistant' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)]">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
              )}
              <div
                className={cn(
                  "rounded-2xl px-4 py-2.5 max-w-[85%]",
                  msg.role === 'user' 
                    ? "bg-[var(--brand-primary)] text-white rounded-br-md" 
                    : "bg-[var(--glass-bg)] text-[var(--text-primary)] rounded-bl-md",
                  msg.isError && "bg-red-500/10 border border-red-500/30"
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                
                {/* Show suggestion preview */}
                {msg.suggestion?.fields && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs opacity-70 mb-2">
                      Suggested {msg.suggestion.fields.length} fields:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {msg.suggestion.fields.slice(0, 5).map((f, j) => (
                        <Badge 
                          key={j}
                          variant="outline" 
                          className="text-[10px] bg-white/10 border-white/20"
                        >
                          {f.label}
                        </Badge>
                      ))}
                      {msg.suggestion.fields.length > 5 && (
                        <Badge variant="outline" className="text-[10px] bg-white/10 border-white/20">
                          +{msg.suggestion.fields.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Conversion tips */}
                {msg.suggestion?.conversionTips?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[var(--glass-border)]">
                    <p className="text-xs font-medium mb-1.5 flex items-center gap-1">
                      <Zap className="h-3 w-3" /> Conversion Tips
                    </p>
                    <ul className="text-xs opacity-80 space-y-1">
                      {msg.suggestion.conversionTips.map((tip, j) => (
                        <li key={j}>• {tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)]">
                <Loader2 className="h-4 w-4 text-white animate-spin" />
              </div>
              <div className="rounded-2xl rounded-bl-md bg-[var(--glass-bg)] px-4 py-2.5">
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <span>Thinking</span>
                  <span className="animate-pulse">...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Input */}
      <div className="shrink-0 p-4 border-t border-[var(--glass-border)]">
        {/* Apply Button */}
        {suggestion?.fields?.length > 0 && (
          <Button
            onClick={handleApply}
            className="w-full mb-3 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] hover:opacity-90"
          >
            <Check className="h-4 w-4 mr-2" />
            Apply {suggestion.fields.length} Fields
          </Button>
        )}
        
        <div className="relative">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you need..."
            className="pr-12 min-h-[80px] resize-none bg-[var(--surface-page)] border-[var(--glass-border)]"
            disabled={isLoading}
          />
          <Button
            size="icon"
            onClick={() => handleSend(message)}
            disabled={!message.trim() || isLoading}
            className="absolute right-2 bottom-2 h-8 w-8 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-[10px] text-[var(--text-tertiary)] mt-2 text-center">
          Signal uses your business knowledge to suggest optimal fields
        </p>
      </div>
    </div>
  )
}

// =============================================================================
// FIELD PROPERTY EDITOR - Right sidebar for editing selected field
// =============================================================================

function OptionsEditor({ options, onChange }) {
  const [newOption, setNewOption] = useState('')
  
  const addOption = () => {
    if (!newOption.trim()) return
    const value = newOption.toLowerCase().replace(/\s+/g, '_')
    onChange([...options, { label: newOption.trim(), value }])
    setNewOption('')
  }
  
  const removeOption = (index) => {
    onChange(options.filter((_, i) => i !== index))
  }
  
  const updateOption = (index, field, val) => {
    const newOptions = [...options]
    newOptions[index] = { ...newOptions[index], [field]: val }
    onChange(newOptions)
  }
  
  return (
    <div className="space-y-3">
      <Label className="text-[var(--text-primary)]">Options</Label>
      <div className="space-y-2">
        {options.map((opt, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--glass-bg)] text-xs text-[var(--text-tertiary)] font-mono">
              {index + 1}
            </div>
            <Input
              value={opt.label}
              onChange={(e) => updateOption(index, 'label', e.target.value)}
              className="flex-1 h-9 bg-[var(--glass-bg)] border-[var(--glass-border)]"
              placeholder="Label"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 hover:bg-red-500/10 hover:text-red-500"
              onClick={() => removeOption(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          placeholder="Add new option..."
          className="flex-1 h-9 bg-[var(--glass-bg)] border-[var(--glass-border)]"
          onKeyDown={(e) => e.key === 'Enter' && addOption()}
        />
        <Button
          size="sm"
          onClick={addOption}
          className="h-9 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function FieldPropertyEditor({ field, onUpdate, onClose }) {
  if (!field) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand-primary)]/10 to-[var(--brand-primary)]/10 mb-4">
          <MousePointer className="h-8 w-8 text-[var(--brand-primary)]" />
        </div>
        <h3 className="font-semibold text-[var(--text-primary)] mb-1">No Field Selected</h3>
        <p className="text-sm text-[var(--text-tertiary)]">Click on a field to edit its properties</p>
      </div>
    )
  }
  
  const fieldType = FIELD_TYPES.find(f => f.type === field.field_type)
  const Icon = fieldType?.icon || Type
  const categoryColor = FIELD_CATEGORIES[fieldType?.category]?.color || 'var(--text-tertiary)'
  
  const hasOptions = ['select', 'multi_select', 'multiselect', 'radio', 'checkbox_group', 'checkbox'].includes(field.field_type)
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[var(--glass-border)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: `color-mix(in srgb, ${categoryColor} 15%, transparent)` }}
          >
            <Icon className="h-5 w-5" style={{ color: categoryColor }} />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">{fieldType?.label}</h3>
            <p className="text-xs text-[var(--text-tertiary)]">Edit field properties</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Properties */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--glass-border)]">
              <Settings2 className="h-4 w-4 text-[var(--brand-primary)]" />
              <span className="font-medium text-sm text-[var(--text-primary)]">Basic</span>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[var(--text-primary)]">Label</Label>
              <Input
                value={field.label}
                onChange={(e) => onUpdate({ ...field, label: e.target.value })}
                className="bg-[var(--glass-bg)] border-[var(--glass-border)]"
              />
            </div>
            
            {/* Hide Label Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
              <div>
                <span className="text-sm text-[var(--text-primary)]">Hide label</span>
                <p className="text-xs text-[var(--text-tertiary)]">Use label as placeholder instead</p>
              </div>
              <Switch
                checked={field.hide_label || false}
                onCheckedChange={(checked) => onUpdate({ ...field, hide_label: checked })}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-[var(--text-primary)]">Field ID (slug)</Label>
              <Input
                value={field.slug}
                onChange={(e) => onUpdate({ ...field, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                className="bg-[var(--glass-bg)] border-[var(--glass-border)] font-mono text-sm"
              />
            </div>
            
            {/* Only show placeholder if label is not hidden */}
            {!field.hide_label && (
              <div className="space-y-2">
                <Label className="text-[var(--text-primary)]">Placeholder</Label>
                <Input
                  value={field.placeholder || ''}
                  onChange={(e) => onUpdate({ ...field, placeholder: e.target.value })}
                  placeholder="Enter placeholder text..."
                  className="bg-[var(--glass-bg)] border-[var(--glass-border)]"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label className="text-[var(--text-primary)]">Helper Text</Label>
              <Textarea
                value={field.help_text || ''}
                onChange={(e) => onUpdate({ ...field, help_text: e.target.value })}
                placeholder="Help text shown below field..."
                className="bg-[var(--glass-bg)] border-[var(--glass-border)] min-h-[60px] resize-none"
              />
            </div>
          </div>
          
          {/* Field Type Selector (for choice fields) */}
          {hasOptions && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--glass-border)]">
                <List className="h-4 w-4 text-[var(--brand-primary)]" />
                <span className="font-medium text-sm text-[var(--text-primary)]">Choice Type</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: 'select', label: 'Dropdown', icon: List },
                  { type: 'radio', label: 'Radio', icon: CircleDot },
                  { type: 'checkbox', label: 'Checkboxes', icon: CheckSquare },
                ].map(({ type, label, icon: ChoiceIcon }) => (
                  <button
                    key={type}
                    onClick={() => onUpdate({ ...field, field_type: type })}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-xs",
                      field.field_type === type
                        ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                        : "border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/50"
                    )}
                  >
                    <ChoiceIcon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Options (for select/radio/checkbox) */}
          {hasOptions && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--glass-border)]">
                <ListOrdered className="h-4 w-4 text-[var(--brand-primary)]" />
                <span className="font-medium text-sm text-[var(--text-primary)]">Choices</span>
              </div>
              <OptionsEditor
                options={getFieldOptions(field)}
                onChange={(options) => onUpdate({ ...field, options })}
              />
            </div>
          )}
          
          {/* Layout */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--glass-border)]">
              <Layout className="h-4 w-4 text-purple-500" />
              <span className="font-medium text-sm text-[var(--text-primary)]">Layout</span>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[var(--text-primary)]">Field Width</Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'full', label: 'Full', visual: '████' },
                  { value: 'half', label: '½', visual: '██' },
                  { value: 'third', label: '⅓', visual: '█' },
                  { value: 'quarter', label: '¼', visual: '▌' }
                ].map(w => (
                  <button
                    key={w.value}
                    onClick={() => onUpdate({ ...field, width: w.value })}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
                      field.width === w.value
                        ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10"
                        : "border-[var(--glass-border)] hover:border-[var(--brand-primary)]/50"
                    )}
                  >
                    <span className="text-xs font-mono text-[var(--text-tertiary)]">{w.visual}</span>
                    <span className="text-xs font-medium text-[var(--text-primary)]">{w.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Validation */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--glass-border)]">
              <Shield className="h-4 w-4 text-emerald-500" />
              <span className="font-medium text-sm text-[var(--text-primary)]">Validation</span>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--text-primary)]">Required field</span>
              </div>
              <Switch
                checked={field.is_required}
                onCheckedChange={(checked) => onUpdate({ ...field, is_required: checked })}
              />
            </div>
            
            {field.field_type === 'email' && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[var(--text-primary)]">Validate email format</span>
                </div>
                <Switch
                  checked={field.validation?.email !== false}
                  onCheckedChange={(checked) => onUpdate({ 
                    ...field, 
                    validation: { ...field.validation, email: checked } 
                  })}
                />
              </div>
            )}
            
            {['text', 'textarea'].includes(field.field_type) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[var(--text-primary)] text-xs">Min Length</Label>
                  <Input
                    type="number"
                    min="0"
                    value={field.validation?.min_length || ''}
                    onChange={(e) => onUpdate({
                      ...field,
                      validation: { ...field.validation, min_length: parseInt(e.target.value) || undefined }
                    })}
                    className="h-9 bg-[var(--glass-bg)] border-[var(--glass-border)]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[var(--text-primary)] text-xs">Max Length</Label>
                  <Input
                    type="number"
                    min="0"
                    value={field.validation?.max_length || ''}
                    onChange={(e) => onUpdate({
                      ...field,
                      validation: { ...field.validation, max_length: parseInt(e.target.value) || undefined }
                    })}
                    className="h-9 bg-[var(--glass-bg)] border-[var(--glass-border)]"
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Conditional Logic */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--glass-border)]">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="font-medium text-sm text-[var(--text-primary)]">Conditional Logic</span>
              <Badge variant="outline" className="text-[10px] border-[var(--brand-primary)] text-[var(--brand-primary)]">Pro</Badge>
            </div>
            
            <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-[var(--glass-border)] hover:border-[var(--brand-primary)]/50 hover:bg-[var(--glass-bg)] transition-colors text-left">
              <Plus className="h-4 w-4 text-[var(--text-tertiary)]" />
              <span className="text-sm text-[var(--text-secondary)]">Add conditional visibility rule</span>
            </button>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

// =============================================================================
// FORM CANVAS - Live preview form builder
// =============================================================================

function FormCanvas({ form, fields, selectedField, selectedFieldIds, onSelect, onDelete, onDuplicate, onWidthChange, currentStep, totalSteps, previewMode, onPreviewModeChange, canUndo, canRedo, onUndo, onRedo, onFormUpdate, steps, onMoveFieldsToStep, onClearSelection }) {
  // Droppable area for palette items
  const { setNodeRef, isOver } = useDroppable({
    id: 'form-canvas-drop'
  })
  
  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-[var(--surface-page)]">
      {/* Canvas Header */}
      <div className="shrink-0 px-6 py-3 border-b border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Undo/Redo */}
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={onUndo}
                      disabled={!canUndo}
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Undo (⌘Z)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={onRedo}
                      disabled={!canRedo}
                    >
                      <Redo2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Redo (⌘⇧Z)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="h-4 w-px bg-[var(--glass-border)]" />
            
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <Eye className="h-4 w-4" />
              <span>Live Preview</span>
            </div>
            {totalSteps > 1 && (
              <Badge variant="outline" className="text-xs">
                Step {currentStep} of {totalSteps}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Preview Mode Toggle */}
            <div className="flex items-center gap-1 bg-[var(--surface-page)] rounded-lg p-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={previewMode === 'desktop' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => onPreviewModeChange('desktop')}
                    >
                      <Monitor className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Desktop Preview</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={previewMode === 'mobile' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => onPreviewModeChange('mobile')}
                    >
                      <Smartphone className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mobile Preview</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Keyboard Shortcuts Help */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">
                    <span className="font-mono bg-[var(--surface-page)] px-1.5 py-0.5 rounded text-[10px]">⌘</span>
                    <span>Shortcuts</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="p-3 max-w-xs">
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between gap-4">
                      <span>Save form</span>
                      <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded">⌘S</kbd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Delete field</span>
                      <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded">Delete</kbd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Duplicate field</span>
                      <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded">⌘D</kbd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Select all</span>
                      <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded">⌘A</kbd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Multi-select</span>
                      <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded">⇧ Click</kbd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Undo</span>
                      <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded">⌘Z</kbd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Redo</span>
                      <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded">⌘⇧Z</kbd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Deselect</span>
                      <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded">Esc</kbd>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <div className="h-4 w-px bg-[var(--glass-border)]" />
            
            <div className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
              <span>{fields.length} field{fields.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Live Form Preview Canvas */}
      <div className="flex-1 overflow-y-auto">
        <div 
          ref={setNodeRef}
          className={cn(
            "p-8 min-h-full flex items-start justify-center transition-colors",
            isOver && "bg-[var(--brand-primary)]/5"
          )}
        >
          {/* Form Container - Looks like actual form */}
          <div className={cn(
            "w-full transition-all duration-300",
            previewMode === 'mobile' ? 'max-w-sm' : 'max-w-3xl'
          )}>
            {/* Mobile Frame (when in mobile mode) */}
            {previewMode === 'mobile' && (
              <div className="flex justify-center mb-2">
                <div className="w-20 h-1.5 bg-[var(--glass-border)] rounded-full" />
              </div>
            )}
            
            {/* Form Header */}
            <div 
              className={cn(
                "p-6 text-white",
                previewMode === 'mobile' ? 'rounded-t-3xl' : 'rounded-t-2xl'
              )}
              style={{ background: `linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary) 100%)` }}
            >
              <h2 className={cn(
                "font-bold",
                previewMode === 'mobile' ? 'text-lg' : 'text-xl'
              )}>{form?.name || 'Untitled Form'}</h2>
              {form?.description && (
                <p className={cn(
                  "text-white/80 mt-1",
                  previewMode === 'mobile' ? 'text-xs' : 'text-sm'
                )}>{form.description}</p>
              )}
            </div>
            
            {/* Form Body */}
            <div className={cn(
              "bg-[var(--surface-card)] shadow-xl border border-[var(--glass-border)] border-t-0",
              previewMode === 'mobile' ? 'rounded-b-3xl' : 'rounded-b-2xl'
            )}>
              {fields.length === 0 ? (
                /* Empty State */
                <div className={cn(
                  "flex flex-col items-center justify-center py-16 px-6 transition-all",
                  isOver && "ring-2 ring-[var(--brand-primary)] ring-inset rounded-b-2xl bg-[var(--brand-primary)]/5"
                )}>
                  <div className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-2xl mb-4 transition-all",
                    isOver 
                      ? "bg-[var(--brand-primary)]/20 scale-110" 
                      : "bg-[var(--glass-bg)]"
                  )}>
                    <Plus className={cn(
                      "h-8 w-8 transition-colors",
                      isOver ? "text-[var(--brand-primary)]" : "text-[var(--text-tertiary)]"
                    )} />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                    {isOver ? 'Drop to Add Field' : 'Add Your First Field'}
                  </h3>
                  <p className="text-[var(--text-secondary)] text-center text-sm max-w-xs">
                    {isOver 
                      ? 'Release to add this field to your form'
                      : 'Drag fields from the left panel or click to add them to your form'
                    }
                  </p>
                </div>
              ) : (
                /* Fields as Live Form */
                <SortableContext
                  items={fields.map(f => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="p-6 space-y-4">
                    {fields.map((field, index) => (
                      <div 
                        key={field.id}
                        className={cn(
                          field.width === 'half' && "inline-block w-[calc(50%-0.5rem)] align-top",
                          field.width === 'third' && "inline-block w-[calc(33.33%-0.5rem)] align-top",
                          field.width === 'quarter' && "inline-block w-[calc(25%-0.5rem)] align-top",
                          field.width === 'full' && "block w-full",
                          !field.width && "block w-full",
                          field.width === 'half' || field.width === 'third' || field.width === 'quarter' ? "mr-2 mb-4" : "mb-0"
                        )}
                      >
                        <FieldWithDropZones field={field} fieldIndex={index}>
                          <SortableFieldItem
                            field={field}
                            isSelected={selectedField?.id === field.id && selectedFieldIds.size === 0}
                            isMultiSelected={selectedFieldIds.has(field.id)}
                            onSelect={onSelect}
                            onDelete={onDelete}
                            onDuplicate={onDuplicate}
                            onWidthChange={onWidthChange}
                          />
                        </FieldWithDropZones>
                      </div>
                    ))}
                  </div>
                </SortableContext>
              )}
              
              {/* Multi-select Bulk Action Bar */}
              {selectedFieldIds.size > 0 && steps.length > 1 && (
                <div className="mx-6 mb-4 p-3 rounded-xl bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white text-xs font-bold">
                        {selectedFieldIds.size}
                      </div>
                      <span className="text-sm font-medium text-[var(--text-primary)]">field{selectedFieldIds.size > 1 ? 's' : ''} selected</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      onClick={onClearSelection}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-secondary)] shrink-0">Move to:</span>
                    {steps.map((step, idx) => (
                      idx !== currentStep - 1 && (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs border-[var(--brand-primary)]/30 hover:bg-[var(--brand-primary)]/20 hover:border-[var(--brand-primary)] text-[var(--text-primary)]"
                          onClick={() => onMoveFieldsToStep(idx)}
                        >
                          <ArrowRight className="h-3 w-3 mr-1" />
                          {step.name}
                        </Button>
                      )
                    ))}
                  </div>
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-2">Shift+Click to select multiple fields · ⌘A to select all</p>
                </div>
              )}
              
              {/* Submit Button Preview */}
              {fields.length > 0 && (
                <div className="px-6 pb-6">
                  <div className="space-y-2">
                    <Label className="text-xs text-[var(--text-secondary)]">Submit Button Text</Label>
                    <Input
                      value={form?.submit_text || 'Submit'}
                      onChange={(e) => onFormUpdate({ submit_text: e.target.value })}
                      placeholder="Enter button text..."
                      className="bg-[var(--surface-page)] border-[var(--glass-border)] text-sm"
                    />
                    <button 
                      className="w-full py-3 rounded-xl text-white font-semibold text-sm shadow-lg hover:opacity-90 transition-opacity mt-2"
                      style={{ background: `linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary) 100%)` }}
                      disabled
                    >
                      {form?.submit_text || 'Submit'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// STEP MANAGER - Multi-step form navigation
// =============================================================================

function StepManager({ steps, currentStep, onStepChange, onAddStep, onRemoveStep, onRenameStep, selectedFieldCount, onMoveFieldsToStep }) {
  const [editingStep, setEditingStep] = useState(null)
  const [stepName, setStepName] = useState('')
  
  const startEditing = (index, name) => {
    setEditingStep(index)
    setStepName(name)
  }
  
  const finishEditing = () => {
    if (editingStep !== null && stepName.trim()) {
      onRenameStep(editingStep, stepName.trim())
    }
    setEditingStep(null)
    setStepName('')
  }
  
  return (
    <div className="p-4 border-b border-[var(--glass-border)] bg-[var(--glass-bg)]">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="h-4 w-4 text-[var(--brand-primary)]" />
        <span className="font-medium text-sm text-[var(--text-primary)]">Form Steps</span>
        <Badge variant="outline" className="text-[10px] border-[var(--glass-border)]">
          {steps.length}
        </Badge>
      </div>
      
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg transition-all cursor-pointer group",
              currentStep === index
                ? "bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/30"
                : "hover:bg-[var(--surface-page)]"
            )}
            onClick={() => onStepChange(index)}
          >
            <div className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium shrink-0",
              currentStep === index
                ? "bg-[var(--brand-primary)] text-white"
                : "bg-[var(--glass-bg)] text-[var(--text-tertiary)] border border-[var(--glass-border)]"
            )}>
              {index + 1}
            </div>
            
            {editingStep === index ? (
              <Input
                value={stepName}
                onChange={(e) => setStepName(e.target.value)}
                onBlur={finishEditing}
                onKeyDown={(e) => e.key === 'Enter' && finishEditing()}
                className="h-7 text-sm flex-1 bg-white"
                autoFocus
              />
            ) : (
              <span 
                className={cn(
                  "flex-1 text-sm truncate",
                  currentStep === index ? "text-[var(--brand-primary)] font-medium" : "text-[var(--text-secondary)]"
                )}
                onDoubleClick={() => startEditing(index, step.name)}
              >
                {step.name}
              </span>
            )}
            
            {selectedFieldCount > 0 && currentStep !== index ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] font-medium bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20 rounded-md"
                onClick={(e) => {
                  e.stopPropagation()
                  onMoveFieldsToStep(index)
                }}
              >
                <ArrowRight className="h-3 w-3 mr-0.5" />
                Move
              </Button>
            ) : steps.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveStep(index)
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        className="w-full mt-2 text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
        onClick={onAddStep}
      >
        <Plus className="h-4 w-4 mr-1" />
        Add Step
      </Button>
    </div>
  )
}

// =============================================================================
// MAIN FORM BUILDER COMPONENT
// =============================================================================

export default function FormBuilder({ formId, projectId, initialData, onSave, onCancel }) {
  const { currentOrg, isSuperAdmin, accessLevel } = useAuthStore()
  
  // Can the user promote forms to org templates?
  const canManageOrgTemplates = isSuperAdmin || 
    accessLevel === 'organization' || 
    currentOrg?.org_type === 'agency'
  
  // Initialize form from initialData or defaults
  const [form, setForm] = useState(() => {
    if (initialData) {
      return {
        name: initialData.name || 'Untitled Form',
        slug: initialData.slug || '',
        description: initialData.description || '',
        form_type: initialData.formType || initialData.form_type || 'prospect',
        submit_text: initialData.submitButtonText || initialData.submit_text || 'Submit',
        success_message: initialData.successMessage || initialData.success_message || 'Thank you for your submission!',
        success_action: initialData.success_action || 'message',
        success_engage_element_id: initialData.success_engage_element_id || null,
        is_active: initialData.isActive ?? initialData.is_active ?? true,
        project_id: initialData.projectId || initialData.project_id || projectId,
        offering_id: initialData.offering_id || null,
        page_paths: initialData.page_paths || [],
        id: initialData.id
      }
    }
    return {
      name: 'Untitled Form',
      slug: '',
      description: '',
      form_type: 'prospect',
      submit_text: 'Submit',
      success_message: 'Thank you for your submission!',
      success_action: 'message',
      success_engage_element_id: null,
      is_active: true,
      project_id: projectId,
      offering_id: null,
      page_paths: []
    }
  })

  // Load services for linking
  const { data: offerings = [] } = useCommerceOfferings(projectId, { type: 'service' })
  const services = offerings.filter(o => o.type === 'service')
  
  // Load engage elements for post-submit popup
  const [engageElements, setEngageElements] = useState([])
  const [loadingEngageElements, setLoadingEngageElements] = useState(false)
  
  // Fetch engage elements on mount
  useEffect(() => {
    if (projectId) {
      // Load engage elements (popups, nudges, etc.)
      setLoadingEngageElements(true)
      engageApi.getElements({ projectId })
        .then(response => {
          const data = response?.data || response || []
          // Filter to active popups/nudges suitable for post-form display
          const elements = (Array.isArray(data) ? data : []).filter(e => 
            e.is_active && ['popup', 'nudge', 'toast', 'slide-in'].includes(e.element_type)
          )
          setEngageElements(elements)
        })
        .catch(err => console.error('Failed to load engage elements:', err))
        .finally(() => setLoadingEngageElements(false))
    }
  }, [projectId])
  
  // Normalize field type from various sources (HTML types, scanner, etc.) to FormBuilder types
  function normalizeFieldType(type) {
    if (!type) return 'text'
    const typeMap = {
      // HTML input types → FormBuilder types
      'tel': 'phone',
      'password': 'text',
      'url': 'text',
      'search': 'text',
      // 'image' is now a dedicated type - don't normalize
      'datetime-local': 'date',
      'month': 'date',
      'week': 'date',
      'color': 'text',
      'range': 'slider',
      // Common aliases
      'dropdown': 'select',
      'multi_select': 'select', // We'll handle multi via options
      'multiselect': 'select',
      'checkbox_group': 'checkbox',
    }
    return typeMap[type] || type
  }
  
  // Initialize steps from initialData.fields (API returns flat fields array)
  // or initialData.steps if multi-step form
  const [steps, setSteps] = useState(() => {
    if (initialData?.steps?.length > 0 && initialData.steps[0]?.fields?.length > 0) {
      // Multi-step form with step structure
      return initialData.steps
    }
    if (initialData?.fields?.length > 0) {
      // Single step form with fields array
      // Map API field format to FormBuilder format (uses snake_case internally)
      const mappedFields = initialData.fields.map((f, idx) => ({
        id: f.id || `field-${idx}`,
        field_type: normalizeFieldType(f.fieldType || f.field_type || 'text'),
        label: f.label || f.slug,
        slug: f.slug,
        placeholder: f.placeholder || '',
        is_required: f.isRequired ?? f.is_required ?? false,
        width: f.width || 'full',
        help_text: f.helpText || f.help_text || '',
        hide_label: f.hideLabel ?? f.hide_label ?? false,
        options: parseOptions(f.options),
        validation: f.validation || {},
        conditional: f.conditional || null,
        sortOrder: f.sortOrder ?? f.sort_order ?? idx
      })).sort((a, b) => a.sortOrder - b.sortOrder)
      
      return [{ name: 'Step 1', fields: mappedFields }]
    }
    return [{ name: 'Step 1', fields: [] }]
  })
  
  // Helper to parse options from various formats
  function parseOptions(options) {
    if (!options) return []
    if (typeof options === 'string') {
      try {
        const parsed = JSON.parse(options)
        // Handle array of strings
        if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
          return parsed.map(opt => ({ label: opt, value: opt.toLowerCase().replace(/\s+/g, '_') }))
        }
        return parsed
      } catch {
        return []
      }
    }
    if (Array.isArray(options)) {
      // Handle array of strings vs array of objects
      if (typeof options[0] === 'string') {
        return options.map(opt => ({ label: opt, value: opt.toLowerCase().replace(/\s+/g, '_') }))
      }
      return options
    }
    return []
  }
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedField, setSelectedField] = useState(null)
  const [selectedFieldIds, setSelectedFieldIds] = useState(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [paletteCollapsed, setPaletteCollapsed] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showAISuggest, setShowAISuggest] = useState(false)
  
  // Preview mode (desktop/mobile)
  const [previewMode, setPreviewMode] = useState('desktop')
  
  // Track unsaved changes
  const [hasChanges, setHasChanges] = useState(false)
  const initialFormRef = useRef(null)
  
  // Mark as changed whenever steps or form changes
  useEffect(() => {
    if (initialFormRef.current === null) {
      initialFormRef.current = JSON.stringify({ form, steps })
    } else {
      const current = JSON.stringify({ form, steps })
      setHasChanges(current !== initialFormRef.current)
    }
  }, [form, steps])
  
  // Undo/Redo history
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const isUndoRedoAction = useRef(false)
  
  // Track steps changes for undo/redo
  useEffect(() => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false
      return
    }
    // Add current state to history (limit to 50 entries)
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(JSON.stringify(steps))
      return newHistory.slice(-50)
    })
    setHistoryIndex(prev => Math.min(prev + 1, 49))
  }, [steps])
  
  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1
  
  const undo = useCallback(() => {
    if (!canUndo) return
    isUndoRedoAction.current = true
    const newIndex = historyIndex - 1
    setSteps(JSON.parse(history[newIndex]))
    setHistoryIndex(newIndex)
    setSelectedField(null)
    setSelectedFieldIds(new Set())
  }, [canUndo, history, historyIndex])
  
  const redo = useCallback(() => {
    if (!canRedo) return
    isUndoRedoAction.current = true
    const newIndex = historyIndex + 1
    setSteps(JSON.parse(history[newIndex]))
    setHistoryIndex(newIndex)
    setSelectedField(null)
    setSelectedFieldIds(new Set())
  }, [canRedo, history, historyIndex])
  
  // Get current step fields
  const currentFields = steps[currentStep]?.fields || []
  
  // Multi-select field handler: Shift+Click toggles multi-selection, regular click selects one
  const handleFieldSelect = useCallback((field, event) => {
    if (event?.shiftKey) {
      // Shift+Click: toggle field in multi-selection
      setSelectedFieldIds(prev => {
        const next = new Set(prev)
        // If we had a single selectedField, start multi-select from it
        if (selectedField && next.size === 0) {
          next.add(selectedField.id)
        }
        if (next.has(field.id)) {
          next.delete(field.id)
        } else {
          next.add(field.id)
        }
        return next
      })
      // Keep selectedField for property editor (last clicked)
      setSelectedField(field)
    } else {
      // Regular click: single select, clear multi-selection
      setSelectedFieldIds(new Set())
      setSelectedField(field)
    }
  }, [selectedField])
  
  // Move selected fields to a different step
  const moveFieldsToStep = useCallback((targetStepIndex) => {
    if (selectedFieldIds.size === 0) return
    
    setSteps(prev => {
      const newSteps = prev.map(s => ({ ...s, fields: [...s.fields] }))
      const idsToMove = selectedFieldIds
      
      // Extract fields from current step
      const fieldsToMove = newSteps[currentStep].fields.filter(f => idsToMove.has(f.id))
      newSteps[currentStep] = {
        ...newSteps[currentStep],
        fields: newSteps[currentStep].fields.filter(f => !idsToMove.has(f.id))
      }
      
      // Add to target step
      newSteps[targetStepIndex] = {
        ...newSteps[targetStepIndex],
        fields: [...newSteps[targetStepIndex].fields, ...fieldsToMove]
      }
      
      return newSteps
    })
    
    const count = selectedFieldIds.size
    setSelectedFieldIds(new Set())
    setSelectedField(null)
    toast.success(`Moved ${count} field${count > 1 ? 's' : ''} to ${steps[targetStepIndex]?.name}`)
  }, [selectedFieldIds, currentStep, steps])
  
  const clearSelection = useCallback(() => {
    setSelectedFieldIds(new Set())
    setSelectedField(null)
  }, [])
  
  // Add field to current step
  const addField = useCallback((fieldType) => {
    const fieldConfig = FIELD_TYPES.find(f => f.type === fieldType)
    if (!fieldConfig) return
    
    const newField = {
      id: crypto.randomUUID(),
      field_type: fieldType,
      label: fieldConfig.label,
      slug: fieldConfig.label.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now().toString(36),
      placeholder: '',
      help_text: '',
      is_required: false,
      width: 'full',
      options: fieldConfig.hasOptions ? [{ label: 'Option 1', value: 'option_1' }] : undefined,
      validation: {}
    }
    
    setSteps(prev => {
      const newSteps = [...prev]
      newSteps[currentStep] = {
        ...newSteps[currentStep],
        fields: [...newSteps[currentStep].fields, newField]
      }
      return newSteps
    })
    
    setSelectedField(newField)
  }, [currentStep])
  
  // Add field group (multiple related fields at once)
  const addFieldGroup = useCallback((group) => {
    const newFields = group.fields.map(fieldDef => ({
      id: crypto.randomUUID(),
      field_type: fieldDef.type,
      label: fieldDef.label,
      slug: fieldDef.slug + '_' + Date.now().toString(36),
      placeholder: '',
      help_text: '',
      is_required: fieldDef.required || false,
      width: fieldDef.width || 'full',
      options: FIELD_TYPES.find(f => f.type === fieldDef.type)?.hasOptions 
        ? [{ label: 'Option 1', value: 'option_1' }] 
        : undefined,
      validation: {}
    }))
    
    setSteps(prev => {
      const newSteps = [...prev]
      newSteps[currentStep] = {
        ...newSteps[currentStep],
        fields: [...newSteps[currentStep].fields, ...newFields]
      }
      return newSteps
    })
    
    // Select the first field of the group
    setSelectedField(newFields[0])
  }, [currentStep])
  
  // Apply AI-suggested fields
  const applyAISuggestions = useCallback((suggestedFields, suggestedSteps) => {
    if (suggestedSteps?.length > 1) {
      // Multi-step form
      const newSteps = suggestedSteps.map((step, stepIndex) => ({
        name: step.name || `Step ${stepIndex + 1}`,
        fields: suggestedFields.filter(f => (f.step || 0) === stepIndex)
      }))
      setSteps(newSteps)
      setCurrentStep(0)
    } else {
      // Single step - add to current step
      setSteps(prev => {
        const newSteps = [...prev]
        newSteps[currentStep] = {
          ...newSteps[currentStep],
          fields: [...newSteps[currentStep].fields, ...suggestedFields]
        }
        return newSteps
      })
    }
    
    // Select the first new field
    if (suggestedFields.length > 0) {
      setSelectedField(suggestedFields[0])
    }
  }, [currentStep])
  
  // Update field
  const updateField = useCallback((updatedField) => {
    setSteps(prev => {
      const newSteps = [...prev]
      newSteps[currentStep] = {
        ...newSteps[currentStep],
        fields: newSteps[currentStep].fields.map(f => 
          f.id === updatedField.id ? updatedField : f
        )
      }
      return newSteps
    })
    setSelectedField(updatedField)
  }, [currentStep])
  
  // Delete field
  const deleteField = useCallback((fieldId) => {
    setSteps(prev => {
      const newSteps = [...prev]
      newSteps[currentStep] = {
        ...newSteps[currentStep],
        fields: newSteps[currentStep].fields.filter(f => f.id !== fieldId)
      }
      return newSteps
    })
    if (selectedField?.id === fieldId) {
      setSelectedField(null)
    }
  }, [currentStep, selectedField])
  
  // Duplicate field
  const duplicateField = useCallback((field) => {
    const newField = {
      ...field,
      id: crypto.randomUUID(),
      label: field.label + ' (copy)',
      slug: field.slug + '_copy_' + Date.now().toString(36)
    }
    
    setSteps(prev => {
      const newSteps = [...prev]
      const fieldIndex = newSteps[currentStep].fields.findIndex(f => f.id === field.id)
      newSteps[currentStep] = {
        ...newSteps[currentStep],
        fields: [
          ...newSteps[currentStep].fields.slice(0, fieldIndex + 1),
          newField,
          ...newSteps[currentStep].fields.slice(fieldIndex + 1)
        ]
      }
      return newSteps
    })
    
    setSelectedField(newField)
  }, [currentStep])
  
  // Reorder fields
  const reorderFields = useCallback((newFields) => {
    setSteps(prev => {
      const newSteps = [...prev]
      newSteps[currentStep] = {
        ...newSteps[currentStep],
        fields: newFields
      }
      return newSteps
    })
  }, [currentStep])
  
  // Change field width
  const changeFieldWidth = useCallback((fieldId, width) => {
    setSteps(prev => {
      const newSteps = [...prev]
      newSteps[currentStep] = {
        ...newSteps[currentStep],
        fields: newSteps[currentStep].fields.map(f => 
          f.id === fieldId ? { ...f, width } : f
        )
      }
      return newSteps
    })
    // Update selected field if it's the one being changed
    if (selectedField?.id === fieldId) {
      setSelectedField(prev => prev ? { ...prev, width } : null)
    }
  }, [currentStep, selectedField])
  
  // Insert field side-by-side (splits existing field into two columns)
  const insertFieldSideBySide = useCallback((fieldType, targetFieldId, side) => {
    const fieldConfig = FIELD_TYPES.find(f => f.type === fieldType)
    if (!fieldConfig) return
    
    const newField = {
      id: crypto.randomUUID(),
      field_type: fieldType,
      label: fieldConfig.label,
      slug: fieldConfig.label.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now().toString(36),
      placeholder: '',
      help_text: '',
      is_required: false,
      width: 'half', // New field is half width
      options: fieldConfig.hasOptions ? [{ label: 'Option 1', value: 'option_1' }] : undefined,
      validation: {}
    }
    
    setSteps(prev => {
      const newSteps = [...prev]
      const targetIndex = newSteps[currentStep].fields.findIndex(f => f.id === targetFieldId)
      if (targetIndex === -1) return prev
      
      // Make target field half width too
      const updatedFields = newSteps[currentStep].fields.map(f => 
        f.id === targetFieldId ? { ...f, width: 'half' } : f
      )
      
      // Insert new field at correct position
      const insertIndex = side === 'left' ? targetIndex : targetIndex + 1
      newSteps[currentStep] = {
        ...newSteps[currentStep],
        fields: [
          ...updatedFields.slice(0, insertIndex),
          newField,
          ...updatedFields.slice(insertIndex)
        ]
      }
      return newSteps
    })
    
    setSelectedField(newField)
  }, [currentStep])
  
  // Step management
  const addStep = useCallback(() => {
    setSteps(prev => [...prev, { name: `Step ${prev.length + 1}`, fields: [] }])
  }, [])
  
  const removeStep = useCallback((index) => {
    if (steps.length <= 1) return
    setSteps(prev => prev.filter((_, i) => i !== index))
    if (currentStep >= index && currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [steps.length, currentStep])
  
  const renameStep = useCallback((index, name) => {
    setSteps(prev => {
      const newSteps = [...prev]
      newSteps[index] = { ...newSteps[index], name }
      return newSteps
    })
  }, [])
  
  // Save form
  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Flatten all fields with step info
      const allFields = steps.flatMap((step, stepIndex) => 
        step.fields.map((field, fieldIndex) => ({
          ...field,
          step: stepIndex,
          sortOrder: fieldIndex,
          fieldType: field.field_type,
          isRequired: field.is_required,
          helpText: field.help_text,
          defaultValue: field.default_value,
        }))
      )
      
      // Format steps with stepNumber (required by API)
      const formattedSteps = steps.map((step, index) => ({
        stepNumber: index + 1,
        title: step.name,
        description: step.description || '',
      }))
      
      await onSave?.({
        ...form,
        id: formId,
        projectId: projectId,
        fields: allFields,
        steps: formattedSteps,
        // Map form properties to camelCase for API
        formType: form.form_type,
        successMessage: form.success_message,
        submitButtonText: form.submit_text,
        isActive: form.is_active,
      })
      
      // Reset change tracking after successful save
      initialFormRef.current = JSON.stringify({ form, steps })
      setHasChanges(false)
    } finally {
      setIsSaving(false)
    }
  }
  
  // Handle cancel with unsaved changes warning
  const handleCancel = useCallback(() => {
    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onCancel?.()
      }
    } else {
      onCancel?.()
    }
  }, [hasChanges, onCancel])
  
  // Update save ref for keyboard shortcut
  useEffect(() => {
    handleSaveRef.current = handleSave
  })
  
  // Calculate totals
  const totalFields = steps.reduce((sum, step) => sum + step.fields.length, 0)
  const requiredFields = steps.reduce((sum, step) => 
    sum + step.fields.filter(f => f.is_required).length, 0
  )
  
  // Keyboard shortcuts
  const handleSaveRef = useRef(null)
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Save (Cmd/Ctrl + S) - works even in inputs
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSaveRef.current?.()
        return
      }
      
      // Don't trigger other shortcuts if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      
      // Select all fields (Cmd/Ctrl + A)
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault()
        const allIds = new Set(currentFields.map(f => f.id))
        setSelectedFieldIds(allIds)
        return
      }
      
      // Delete selected field(s)
      if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedField || selectedFieldIds.size > 0)) {
        e.preventDefault()
        if (selectedFieldIds.size > 0) {
          // Delete all multi-selected fields
          selectedFieldIds.forEach(id => deleteField(id))
          setSelectedFieldIds(new Set())
          setSelectedField(null)
        } else if (selectedField) {
          deleteField(selectedField.id)
        }
      }
      
      // Duplicate (Cmd/Ctrl + D)
      if ((e.metaKey || e.ctrlKey) && e.key === 'd' && selectedField && selectedFieldIds.size === 0) {
        e.preventDefault()
        duplicateField(selectedField)
      }
      
      // Undo (Cmd/Ctrl + Z)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      
      // Redo (Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y)
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }
      
      // Escape to deselect
      if (e.key === 'Escape') {
        if (selectedFieldIds.size > 0) {
          setSelectedFieldIds(new Set())
        }
        setSelectedField(null)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedField, selectedFieldIds, currentFields, undo, redo, deleteField, duplicateField])
  
  // DnD sensors for palette + canvas
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  
  // Handle drag end - from palette or reordering
  const handleDragEnd = useCallback((event) => {
    const { active, over } = event
    
    if (!over) return
    
    // Check if it's a palette item being dropped
    if (active.data?.current?.type === 'palette') {
      const fieldType = active.data.current.fieldType
      
      // Check if dropped on a side zone (for side-by-side placement)
      if (over.data?.current?.type === 'side-drop') {
        const { side, targetFieldId } = over.data.current
        insertFieldSideBySide(fieldType, targetFieldId, side)
        return
      }
      
      // Regular drop - add to end
      addField(fieldType)
      return
    }
    
    // Check if an existing field is being dropped on a side zone
    if (over.data?.current?.type === 'side-drop') {
      const { side, targetFieldId } = over.data.current
      const draggedFieldId = active.id
      
      // Don't drop field onto itself
      if (draggedFieldId === targetFieldId) return
      
      // Make both fields half width and position them together
      setSteps(prev => {
        const newSteps = [...prev]
        const fields = [...newSteps[currentStep].fields]
        
        const draggedIndex = fields.findIndex(f => f.id === draggedFieldId)
        const targetIndex = fields.findIndex(f => f.id === targetFieldId)
        
        if (draggedIndex === -1 || targetIndex === -1) return prev
        
        // Remove the dragged field from its current position
        const [draggedField] = fields.splice(draggedIndex, 1)
        
        // Update target index after removal
        const newTargetIndex = fields.findIndex(f => f.id === targetFieldId)
        
        // Update both fields to half width
        const updatedDraggedField = { ...draggedField, width: 'half' }
        fields[newTargetIndex] = { ...fields[newTargetIndex], width: 'half' }
        
        // Insert dragged field next to target
        const insertIndex = side === 'left' ? newTargetIndex : newTargetIndex + 1
        fields.splice(insertIndex, 0, updatedDraggedField)
        
        newSteps[currentStep] = { ...newSteps[currentStep], fields }
        return newSteps
      })
      return
    }
    
    // Otherwise it's a reorder within the canvas
    if (active.id !== over?.id) {
      const oldIndex = currentFields.findIndex(f => f.id === active.id)
      const newIndex = currentFields.findIndex(f => f.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderFields(arrayMove(currentFields, oldIndex, newIndex))
      }
    }
  }, [addField, insertFieldSideBySide, currentFields, reorderFields, currentStep])
  
  // Drag overlay for visual feedback
  const [activeId, setActiveId] = useState(null)
  const [activePaletteType, setActivePaletteType] = useState(null)
  
  const handleDragStart = useCallback((event) => {
    if (event.active.data?.current?.type === 'palette') {
      setActivePaletteType(event.active.data.current.fieldType)
    } else {
      setActiveId(event.active.id)
    }
  }, [])
  
  const handleDragCancel = useCallback(() => {
    setActiveId(null)
    setActivePaletteType(null)
  }, [])
  
  return (
    <TooltipProvider>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={(e) => { handleDragEnd(e); setActiveId(null); setActivePaletteType(null) }}
        onDragCancel={handleDragCancel}
      >
        {/* Positioned wrapper to anchor the inset container */}
        <div className="relative flex-1 min-h-0 w-full h-full">
        {/* Full-screen inline container - fills parent with inset spacing */}
        <div className="absolute inset-4 flex flex-col bg-[var(--surface-page)] overflow-hidden rounded-2xl border border-[var(--glass-border)]">
        {/* Top Header Bar */}
        <div className="shrink-0 border-b border-[var(--glass-border)] bg-[var(--glass-bg)] dark:bg-[var(--glass-bg-dark)] backdrop-blur-xl rounded-t-2xl">
          <div className="flex items-center justify-between px-6 py-4">
            {/* Left: Back & Title */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                className="h-10 w-10 rounded-xl hover:bg-[var(--surface-page)]"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)] shadow-lg">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    className="h-8 text-lg font-semibold border-0 bg-transparent p-0 focus-visible:ring-0 text-[var(--text-primary)]"
                    placeholder="Form name..."
                  />
                  <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                    <span>{totalFields} field{totalFields !== 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span>{requiredFields} required</span>
                    <span>•</span>
                    <span>{steps.length} step{steps.length !== 1 ? 's' : ''}</span>
                    {hasChanges && (
                      <>
                        <span>•</span>
                        <span className="text-amber-500 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Unsaved
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Center: Form Type Selector */}
            <div className="flex items-center gap-1">
              {Object.entries(FORM_TYPES).map(([key, config]) => {
                const isSelected = form.form_type === key
                return (
                  <Tooltip key={key}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setForm(prev => ({ ...prev, form_type: key }))}
                        className={cn(
                          "flex items-center gap-2 py-2 rounded-xl transition-all border-2",
                          isSelected
                            ? "px-4 border-[var(--brand-primary)] bg-[var(--brand-primary)]/10"
                            : "px-2.5 border-transparent hover:bg-[var(--surface-page)]"
                        )}
                      >
                        <config.icon 
                          className="h-4 w-4 shrink-0" 
                          style={{ color: isSelected ? 'var(--brand-primary)' : 'var(--text-tertiary)' }}
                        />
                        {isSelected && (
                          <span className="text-sm font-medium text-[var(--brand-primary)] whitespace-nowrap">
                            {config.label}
                          </span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{isSelected ? config.description : config.label}</TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
            
            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(true)}
                className="h-10 w-10 rounded-xl"
              >
                <Settings className="h-5 w-5" />
              </Button>
              
              <Button
                variant="outline"
                onClick={handleCancel}
                className="h-10 px-4 rounded-xl border-[var(--glass-border)]"
              >
                Cancel
              </Button>
              
              {canManageOrgTemplates ? (
                <DropdownMenu>
                  <div className="flex items-center rounded-xl overflow-hidden" style={{ background: 'linear-gradient(to right, var(--brand-primary), var(--brand-primary))' }}>
                    <button
                      onClick={handleSave}
                      disabled={isSaving || totalFields === 0}
                      className="h-10 px-5 flex items-center gap-2 text-white text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {isSaving ? 'Saving...' : 'Save Form'}
                    </button>
                    <div className="w-px h-5 bg-white/25" />
                    <DropdownMenuTrigger asChild>
                      <button
                        disabled={isSaving || totalFields === 0}
                        className="h-10 px-2.5 flex items-center text-white hover:brightness-110 transition-all disabled:opacity-50 disabled:pointer-events-none"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                  </div>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel className="text-xs text-[var(--text-tertiary)]">
                      Organization
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={async () => {
                        if (!currentOrg?.id) return
                        try {
                          await portalApi.post('/forms/templates', {
                            orgId: currentOrg.id,
                            slug: form.slug,
                            name: form.name,
                            description: form.description || null,
                            formType: form.form_type || 'custom',
                            successMessage: form.success_message,
                            submitButtonText: form.submit_button_text || 'Submit',
                            layout: form.layout || 'stacked',
                            isActive: true,
                            fields: (fields || []).filter(f => f.label).map(f => ({
                              slug: f.slug,
                              label: f.label,
                              fieldType: f.field_type,
                              placeholder: f.placeholder,
                              helpText: f.help_text,
                              isRequired: f.is_required,
                              validation: f.validation,
                              options: f.options,
                              conditional: f.conditional,
                              width: f.width || 'full',
                              sortOrder: f.sort_order,
                            })),
                          })
                          toast.success('Promoted to org template — auto-clones to new projects')
                        } catch (err) {
                          console.error('Failed to promote to org template:', err)
                          if (err?.response?.status === 409 || err?.response?.data?.message?.includes('duplicate')) {
                            toast.error('An org template with this slug already exists')
                          } else {
                            toast.error('Failed to create org template')
                          }
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <Globe className="h-4 w-4 mr-2 text-[var(--brand-primary)]" />
                      <div>
                        <p className="font-medium">Promote to Org Template</p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          Auto-clone to all {currentOrg?.name || 'org'} projects
                        </p>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  onClick={handleSave}
                  disabled={isSaving || totalFields === 0}
                  className="h-10 px-6 rounded-xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] hover:opacity-90 text-white"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Form
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Main Content - 3 Column Layout */}
        <div className="flex-1 flex min-h-0">
          {/* Left Panel: Field Palette + Steps */}
          <div className="flex flex-col border-r border-[var(--glass-border)] bg-[var(--glass-bg)] min-h-0 overflow-hidden">
            {/* Steps (if multi-step) */}
            {steps.length > 1 && (
              <StepManager
                steps={steps}
                currentStep={currentStep}
                onStepChange={(idx) => { setCurrentStep(idx); setSelectedFieldIds(new Set()); setSelectedField(null); }}
                onAddStep={addStep}
                onRemoveStep={removeStep}
                onRenameStep={renameStep}
                selectedFieldCount={selectedFieldIds.size}
                onMoveFieldsToStep={moveFieldsToStep}
              />
            )}
            
            {/* Field Palette */}
            <div className="flex-1 min-h-0 h-full overflow-hidden">
              <FieldPalette
                onAddField={addField}
                onAddFieldGroup={addFieldGroup}
                onAISuggest={() => setShowAISuggest(true)}
                isCollapsed={paletteCollapsed}
                onToggleCollapse={() => setPaletteCollapsed(prev => !prev)}
              />
            </div>
            
            {/* Add Step Button (if single step) */}
            {steps.length === 1 && (
              <div className="p-3 border-t border-[var(--glass-border)]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
                  onClick={addStep}
                >
                  <Layers className="h-4 w-4 mr-2" />
                  Add Form Step
                </Button>
              </div>
            )}
          </div>
          
          {/* Center: Live Form Canvas */}
          <FormCanvas
            form={form}
            fields={currentFields}
            selectedField={selectedField}
            selectedFieldIds={selectedFieldIds}
            onSelect={handleFieldSelect}
            onDelete={deleteField}
            onDuplicate={duplicateField}
            onWidthChange={changeFieldWidth}
            currentStep={currentStep + 1}
            totalSteps={steps.length}
            previewMode={previewMode}
            onPreviewModeChange={setPreviewMode}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            onFormUpdate={(updates) => setForm(prev => ({ ...prev, ...updates }))}
            steps={steps}
            onMoveFieldsToStep={moveFieldsToStep}
            onClearSelection={clearSelection}
          />
          
          {/* Right Panel: Properties Editor or Form Settings */}
          <div className="w-80 shrink-0 border-l border-[var(--glass-border)] bg-[var(--glass-bg)] relative overflow-hidden">
            {showSettings ? (
              /* Form Settings Panel — inline in the right sidebar */
              <div className="absolute inset-0 flex flex-col overflow-hidden">
                {/* Settings Header */}
                <div className="px-4 py-3 border-b border-[var(--glass-border)] flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-[var(--brand-primary)]" />
                    <h3 className="font-semibold text-sm text-[var(--text-primary)]">Form Settings</h3>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSettings(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Scrollable Settings Content */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  <div className="px-4 py-4 space-y-5">
                    <div className="space-y-2">
                      <Label className="text-[var(--text-primary)] text-xs">Form Name</Label>
                      <Input
                        value={form.name}
                        onChange={(e) => {
                          const newName = e.target.value
                          setForm(prev => ({
                            ...prev,
                            name: newName,
                            slug: !prev.slug || prev.slug === prev.name?.toLowerCase().replace(/\s+/g, '-') || prev.slug === 'form'
                              ? newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
                              : prev.slug
                          }))
                        }}
                        className="bg-[var(--surface-page)] border-[var(--glass-border)]"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-[var(--text-primary)] text-xs flex items-center gap-2">
                        <span>Slug</span>
                        <span className="text-[var(--text-tertiary)] font-normal">(URL identifier)</span>
                      </Label>
                      <Input
                        value={form.slug || ''}
                        onChange={(e) => {
                          const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                          setForm(prev => ({ ...prev, slug }))
                        }}
                        placeholder="contact-form"
                        className="bg-[var(--surface-page)] border-[var(--glass-border)] font-mono text-sm"
                      />
                      <p className="text-[11px] text-[var(--text-tertiary)]">
                        Used to embed the form. Only lowercase letters, numbers, and hyphens.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-[var(--text-primary)] text-xs">Description</Label>
                      <Textarea
                        value={form.description || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Optional form description..."
                        className="bg-[var(--surface-page)] border-[var(--glass-border)] min-h-[60px]"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-[var(--text-primary)] text-xs">Instructions</Label>
                      <Textarea
                        value={form.instructions || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, instructions: e.target.value }))}
                        placeholder="Detailed instructions or notes shown before the form..."
                        className="bg-[var(--surface-page)] border-[var(--glass-border)] min-h-[80px]"
                      />
                      <p className="text-[11px] text-[var(--text-tertiary)]">
                        This text appears above the form. Use it for longer instructions, requirements, or important notes.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-[var(--text-primary)] text-xs">Submit Button Text</Label>
                      <Input
                        value={form.submit_text || 'Submit'}
                        onChange={(e) => setForm(prev => ({ ...prev, submit_text: e.target.value }))}
                        className="bg-[var(--surface-page)] border-[var(--glass-border)]"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-[var(--text-primary)] text-xs">Success Message</Label>
                      <Textarea
                        value={form.success_message || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, success_message: e.target.value }))}
                        placeholder="Message shown after successful submission..."
                        className="bg-[var(--surface-page)] border-[var(--glass-border)] min-h-[60px]"
                      />
                    </div>
                    
                    {/* Post-Submit Action Section */}
                    <div className="space-y-3 p-3 rounded-lg bg-[var(--surface-page)] border border-[var(--glass-border)]">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-[var(--brand-primary)]" />
                        <Label className="text-[var(--text-primary)] text-xs font-medium">Post-Submit Action</Label>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-[11px] text-[var(--text-secondary)]">What happens after submission?</Label>
                        <Select
                          value={form.success_action || 'message'}
                          onValueChange={(v) => setForm(prev => ({ 
                            ...prev, 
                            success_action: v,
                            success_engage_element_id: v === 'engage_element' || v === 'both' ? prev.success_engage_element_id : null
                          }))}
                        >
                          <SelectTrigger className="bg-[var(--surface-secondary)] border-[var(--glass-border)]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="message">Show success message</SelectItem>
                            <SelectItem value="redirect">Redirect to URL</SelectItem>
                            <SelectItem value="engage_element">Show popup/nudge</SelectItem>
                            <SelectItem value="both">Message + popup/nudge</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {(form.success_action === 'engage_element' || form.success_action === 'both') && (
                        <div className="space-y-2">
                          <Label className="text-[11px] text-[var(--text-secondary)]">Select Engage Element</Label>
                          <Select
                            value={form.success_engage_element_id || 'none'}
                            onValueChange={(v) => setForm(prev => ({ 
                              ...prev, 
                              success_engage_element_id: v === 'none' ? null : v 
                            }))}
                            disabled={loadingEngageElements}
                          >
                            <SelectTrigger className="bg-[var(--surface-secondary)] border-[var(--glass-border)]">
                              <SelectValue placeholder={loadingEngageElements ? 'Loading...' : 'Select popup or nudge...'} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None selected</SelectItem>
                              {engageElements.length === 0 && !loadingEngageElements && (
                                <div className="px-2 py-3 text-xs text-[var(--text-tertiary)] text-center">
                                  No active popups or nudges found.
                                  <br />
                                  <a href="/engage" className="text-[var(--brand-primary)] hover:underline">
                                    Create one in Engage →
                                  </a>
                                </div>
                              )}
                              {engageElements.map(element => (
                                <SelectItem key={element.id} value={element.id}>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px] px-1">
                                      {element.element_type}
                                    </Badge>
                                    {element.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-[11px] text-[var(--text-tertiary)]">
                            The selected popup or nudge will be shown after form submission
                          </p>
                        </div>
                      )}
                      
                      {form.success_action === 'redirect' && (
                        <div className="space-y-2">
                          <Label className="text-[11px] text-[var(--text-secondary)]">Redirect URL</Label>
                          <Input
                            value={form.redirect_url || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, redirect_url: e.target.value }))}
                            placeholder="https://example.com/thank-you"
                            className="bg-[var(--surface-secondary)] border-[var(--glass-border)]"
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-page)] border border-[var(--glass-border)]">
                      <div>
                        <span className="text-sm text-[var(--text-primary)]">Form Active</span>
                        <p className="text-[11px] text-[var(--text-tertiary)]">Accept new submissions</p>
                      </div>
                      <Switch
                        checked={form.is_active !== false}
                        onCheckedChange={(checked) => setForm(prev => ({ ...prev, is_active: checked }))}
                      />
                    </div>
                    
                    {/* Confirmation Email Section */}
                    <div className="space-y-3 p-3 rounded-lg bg-[var(--surface-page)] border border-[var(--glass-border)]">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-[var(--brand-primary)]" />
                        <Label className="text-[var(--text-primary)] text-xs font-medium">Confirmation Email</Label>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-[var(--text-primary)]">Send Confirmation</span>
                          <p className="text-[11px] text-[var(--text-tertiary)]">Email submitter a confirmation</p>
                        </div>
                        <Switch
                          checked={form.send_confirmation !== false}
                          onCheckedChange={(checked) => setForm(prev => ({ ...prev, send_confirmation: checked }))}
                        />
                      </div>
                      
                      {form.send_confirmation !== false && (
                        <div className="space-y-3 pt-2 border-t border-[var(--glass-border)]">
                          <p className="text-[11px] text-[var(--text-tertiary)]">
                            Using default "Form Confirmation" template. 
                            <a 
                              href="/email/templates" 
                              className="text-[var(--brand-primary)] hover:underline ml-1"
                              target="_blank"
                            >
                              Customize template →
                            </a>
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full gap-2 text-xs"
                            onClick={() => {
                              window.open(`/email/templates?action=copy-for-form&formId=${formId}&formName=${encodeURIComponent(form.name)}`, '_blank')
                            }}
                          >
                            <Copy className="h-3 w-3" />
                            Create Custom Template
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {/* Service Association */}
                    <div className="space-y-2">
                      <Label className="text-[var(--text-primary)] text-xs flex items-center gap-2">
                        <Wrench className="h-3.5 w-3.5" />
                        Linked Service
                      </Label>
                      <Select
                        value={form.offering_id || 'none'}
                        onValueChange={(v) => setForm(prev => ({ ...prev, offering_id: v === 'none' ? null : v }))}
                      >
                        <SelectTrigger className="bg-[var(--surface-page)] border-[var(--glass-border)]">
                          <SelectValue placeholder="Select a service..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No linked service</SelectItem>
                          {services.map(service => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-[var(--text-tertiary)]">
                        Link this form to a service for intent categorization and Signal optimization
                      </p>
                    </div>

                    {/* Page Association - Unified Logic */}
                    <div className="space-y-2">
                      <Label className="text-[var(--text-primary)] text-xs flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5" />
                        Website Page
                      </Label>
                      {form.offering_id ? (
                        (() => {
                          const linkedService = services.find(s => s.id === form.offering_id)
                          return (
                            <div className="p-2.5 rounded-lg bg-muted/50 border border-[var(--glass-border)]">
                              <p className="text-sm text-[var(--text-primary)] font-medium">
                                {linkedService?.page_path || 'No page set on service'}
                              </p>
                              <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                                Inherited from "{linkedService?.name}". Change the page in the service settings.
                              </p>
                            </div>
                          )
                        })()
                      ) : (
                        <div className="p-2.5 rounded-lg bg-muted/50 border border-dashed border-[var(--glass-border)]">
                          <p className="text-[11px] text-[var(--text-tertiary)]">
                            Page tracking: Link to a service above, or use `page_paths[]` field in advanced settings for standalone forms appearing on multiple pages.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Default: Field Properties Editor */
              <>
                <FieldPropertyEditor
                  field={selectedFieldIds.size > 0 ? null : selectedField}
                  onUpdate={updateField}
                  onClose={() => { setSelectedField(null); setSelectedFieldIds(new Set()) }}
                />
                
                {/* AI Suggest Panel (slides over properties) */}
                <AISuggestPanel
                  isOpen={showAISuggest}
                  onClose={() => setShowAISuggest(false)}
                  formType={form.form_type}
                  currentFields={currentFields}
                  form={form}
                  onApplySuggestions={applyAISuggestions}
                />
              </>
            )}
          </div>
        </div>
        
        {/* Drag Overlay */}
        <DragOverlay>
          {activePaletteType && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-card)] border-2 border-[var(--brand-primary)] shadow-2xl opacity-90">
              {(() => {
                const field = FIELD_TYPES.find(f => f.type === activePaletteType)
                const Icon = field?.icon || Type
                return (
                  <>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-primary)]/20">
                      <Icon className="h-4 w-4 text-[var(--brand-primary)]" />
                    </div>
                    <span className="font-medium text-sm text-[var(--text-primary)]">{field?.label}</span>
                  </>
                )
              })()}
            </div>
          )}
        </DragOverlay>
        </div>
        </div>
      </DndContext>
    </TooltipProvider>
  )
}
