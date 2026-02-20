// ============================================================================
// ENGAGE DESIGN STUDIO - Visual React Component Builder
// ============================================================================
// Build Plan: 8 Chunks (see docs/ENGAGE-DESIGN-STUDIO.md) ✓ ALL COMPLETE
// Chunk 1: Shell + Layout ✓
// Chunk 2: Header + Element Switcher ✓
// Chunk 3: Component Tree (Left Panel) ✓
// Chunk 4: Canvas (Center) ✓
// Chunk 5: Properties Panel (Right) ✓ ENHANCED
//   - ColorPicker with brand colors, gradients, custom builder
//   - SpacingInput, RadiusInput, ShadowInput, FontSizeInput presets
//   - Button Styles, Input Styles, Label Styles sections
// Chunk 6: Left Panel Tabs ✓ ENHANCED
//   - addNode store method for inserting components
//   - COMMERCE_COMPONENTS definitions (ProductCard, EventCard, BuyNow, RSVP, etc.)
//   - FORM_COMPONENTS definitions (FormEmbed, FormInline, FormField, FormSubmit)
//   - AssetsPanel with folder navigation and drag-to-insert
//   - CommercePanel with Products/Events tabs
//   - FormsPanel with managed forms integration
//   - BookingPanel with Sync API integration
// Chunk 7: Echo AI Panel ✓
//   - Signal API integration with SSE streaming
//   - Quick actions (add product, add form, make responsive, add animation)
//   - Pending changes apply/dismiss
//   - Message feedback (thumbs up/down)
// Chunk 8: Polish ✓
//   - Keyboard shortcuts (⌘S, ⌘Z, ⌘⇧Z, ⌘N, ⌘D, ⌘[], 1/2/3, Esc, Delete)
//   - Auto-save after 30s idle
//   - Browser unload warning for unsaved changes
//   - Keyboard shortcuts help tooltip
// ============================================================================

import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  Layers,
  Component,
  Image,
  ShoppingBag,
  FileText,
  Sparkles,
  Monitor,
  Tablet,
  Smartphone,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Play,
  Settings,
  MoreHorizontal,
  Code,
  Eye,
  EyeOff,
  HelpCircle,
  X,
  Plus,
  Search,
  Target,
  Bell,
  MessageSquare,
  Megaphone,
  ArrowUpRight,
  Check,
  Copy,
  Loader2,
  Save,
  Lock,
  Unlock,
  GripVertical,
  Type,
  Square,
  MousePointer2,
  Trash2,
  CornerDownRight,
  Calendar,
  Clock,
  Blend,
  Send,
  Wand2,
  RotateCcw,
  User,
  Bot,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Keyboard
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { engageApi, commerceApi, syncApi, formsApi, filesApi, screenshotsApi } from '@/lib/portal-api'
import { echoApi } from '@/lib/signal-api'
import useAuthStore from '@/lib/auth-store'
import { supabase } from '@/lib/supabase-auth'

// ============================================================================
// ZUSTAND STORE
// ============================================================================

const useStudioStore = create(
  immer((set, get) => ({
    // Current element being edited
    elementId: null,
    element: null,
    
    // All elements for switcher
    elements: [],
    elementsLoading: false,
    
    // Design state (the component JSON)
    design: null,
    isDirty: false, // Unsaved changes
    isSaving: false,
    
    // Selection state
    selectedNodeId: null,
    hoveredNodeId: null,
    
    // History for undo/redo
    history: [],
    historyIndex: -1,
    
    // UI state
    leftPanelWidth: 280,
    rightPanelWidth: 320,
    leftPanelCollapsed: false,
    rightPanelCollapsed: false,
    leftPanelTab: 'layers', // layers | components | assets | commerce | forms | echo
    rightPanelTab: 'design', // design | layout | interactions | data
    
    // Canvas state
    device: 'desktop', // desktop | tablet | mobile
    zoom: 100,
    showSitePreview: false, // Show site screenshot background
    siteScreenshotUrl: null, // Cached screenshot URL (for current device)
    siteScreenshots: null, // { desktop, tablet, mobile, captured_at }
    siteScreenshotLoading: false,
    
    // Drag state
    draggedComponent: null, // Component being dragged from panels
    dropTargetId: null, // Node ID being hovered during drag
    
    setDraggedComponent: (component) => set((state) => {
      state.draggedComponent = component
    }),
    
    setDropTargetId: (id) => set((state) => {
      state.dropTargetId = id
    }),
    
    // Actions
    setElements: (elements) => set((state) => {
      state.elements = elements
    }),
    
    setElementsLoading: (loading) => set((state) => {
      state.elementsLoading = loading
    }),
    
    setElement: (element) => set((state) => {
      state.elementId = element?.id
      state.element = element
      state.design = element?.design_json || createDefaultDesign(element?.element_type)
      state.isDirty = false
      state.history = []
      state.historyIndex = -1
    }),
    
    setDesign: (design) => set((state) => {
      // Push to history for undo
      const currentDesign = state.design
      if (currentDesign) {
        state.history = [...state.history.slice(0, state.historyIndex + 1), JSON.stringify(currentDesign)]
        state.historyIndex = state.history.length - 1
      }
      state.design = design
      state.isDirty = true
    }),
    
    setIsDirty: (dirty) => set((state) => {
      state.isDirty = dirty
    }),
    
    setIsSaving: (saving) => set((state) => {
      state.isSaving = saving
    }),
    
    setSelectedNodeId: (id) => set((state) => {
      state.selectedNodeId = id
    }),
    
    setHoveredNodeId: (id) => set((state) => {
      state.hoveredNodeId = id
    }),
    
    setDevice: (device) => set((state) => {
      state.device = device
      // Update siteScreenshotUrl to match the new device
      if (state.siteScreenshots) {
        state.siteScreenshotUrl = state.siteScreenshots[device] || state.siteScreenshots.desktop || null
      }
    }),
    
    setZoom: (zoom) => set((state) => {
      state.zoom = Math.max(25, Math.min(200, zoom))
    }),
    
    setShowSitePreview: (show) => set((state) => {
      state.showSitePreview = show
    }),
    
    setSiteScreenshotUrl: (url) => set((state) => {
      state.siteScreenshotUrl = url
    }),
    
    setSiteScreenshots: (screenshots) => set((state) => {
      state.siteScreenshots = screenshots
      // Also update siteScreenshotUrl based on current device
      if (screenshots) {
        state.siteScreenshotUrl = screenshots[state.device] || screenshots.desktop || null
      }
    }),
    
    setSiteScreenshotLoading: (loading) => set((state) => {
      state.siteScreenshotLoading = loading
    }),
    
    setLeftPanelWidth: (width) => set((state) => {
      state.leftPanelWidth = Math.max(200, Math.min(400, width))
    }),
    
    setRightPanelWidth: (width) => set((state) => {
      state.rightPanelWidth = Math.max(200, Math.min(450, width))
    }),
    
    toggleLeftPanel: () => set((state) => {
      state.leftPanelCollapsed = !state.leftPanelCollapsed
    }),
    
    toggleRightPanel: () => set((state) => {
      state.rightPanelCollapsed = !state.rightPanelCollapsed
    }),
    
    setLeftPanelTab: (tab) => set((state) => {
      state.leftPanelTab = tab
      if (state.leftPanelCollapsed) state.leftPanelCollapsed = false
    }),
    
    setRightPanelTab: (tab) => set((state) => {
      state.rightPanelTab = tab
      if (state.rightPanelCollapsed) state.rightPanelCollapsed = false
    }),
    
    undo: () => set((state) => {
      if (state.historyIndex > 0) {
        state.historyIndex--
        state.design = JSON.parse(state.history[state.historyIndex])
      }
    }),
    
    redo: () => set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++
        state.design = JSON.parse(state.history[state.historyIndex])
      }
    }),
    
    // Tree operations
    expandedNodes: new Set(['root']),
    hiddenNodes: new Set(),
    lockedNodes: new Set(),
    
    toggleNodeExpanded: (nodeId) => set((state) => {
      const expanded = new Set(state.expandedNodes)
      if (expanded.has(nodeId)) {
        expanded.delete(nodeId)
      } else {
        expanded.add(nodeId)
      }
      state.expandedNodes = expanded
    }),
    
    toggleNodeVisibility: (nodeId) => set((state) => {
      const hidden = new Set(state.hiddenNodes)
      if (hidden.has(nodeId)) {
        hidden.delete(nodeId)
      } else {
        hidden.add(nodeId)
      }
      state.hiddenNodes = hidden
      state.isDirty = true
    }),
    
    toggleNodeLock: (nodeId) => set((state) => {
      const locked = new Set(state.lockedNodes)
      if (locked.has(nodeId)) {
        locked.delete(nodeId)
      } else {
        locked.add(nodeId)
      }
      state.lockedNodes = locked
    }),
    
    deleteNode: (nodeId) => set((state) => {
      if (nodeId === 'root') return // Can't delete root
      
      const deleteFromTree = (node) => {
        if (!node.children) return node
        return {
          ...node,
          children: node.children
            .filter(child => child.id !== nodeId)
            .map(deleteFromTree)
        }
      }
      
      state.design = deleteFromTree(state.design)
      if (state.selectedNodeId === nodeId) {
        state.selectedNodeId = null
      }
      state.isDirty = true
    }),
    
    duplicateNode: (nodeId) => set((state) => {
      if (nodeId === 'root') return
      
      const findAndDuplicate = (node) => {
        if (!node.children) return node
        
        const newChildren = []
        for (const child of node.children) {
          newChildren.push(findAndDuplicate(child))
          if (child.id === nodeId) {
            // Clone the node with new IDs
            const cloneWithNewIds = (n) => ({
              ...n,
              id: `${n.id}_copy_${Date.now()}`,
              name: `${n.name} (copy)`,
              children: n.children?.map(cloneWithNewIds) || []
            })
            newChildren.push(cloneWithNewIds(child))
          }
        }
        return { ...node, children: newChildren }
      }
      
      state.design = findAndDuplicate(state.design)
      state.isDirty = true
    }),
    
    // Update node style property
    updateNodeStyle: (nodeId, styleKey, value) => set((state) => {
      const updateInTree = (node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            style: { ...node.style, [styleKey]: value }
          }
        }
        if (node.children) {
          return { ...node, children: node.children.map(updateInTree) }
        }
        return node
      }
      state.design = updateInTree(state.design)
      state.isDirty = true
    }),
    
    // Update node props
    updateNodeProps: (nodeId, propKey, value) => set((state) => {
      const updateInTree = (node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            props: { ...node.props, [propKey]: value }
          }
        }
        if (node.children) {
          return { ...node, children: node.children.map(updateInTree) }
        }
        return node
      }
      state.design = updateInTree(state.design)
      state.isDirty = true
    }),
    
    // Update node name
    updateNodeName: (nodeId, name) => set((state) => {
      const updateInTree = (node) => {
        if (node.id === nodeId) {
          return { ...node, name }
        }
        if (node.children) {
          return { ...node, children: node.children.map(updateInTree) }
        }
        return node
      }
      state.design = updateInTree(state.design)
      state.isDirty = true
    }),
    
    // Get selected node
    getSelectedNode: () => {
      const state = get()
      if (!state.selectedNodeId || !state.design) return null
      
      const findNode = (node) => {
        if (node.id === state.selectedNodeId) return node
        if (node.children) {
          for (const child of node.children) {
            const found = findNode(child)
            if (found) return found
          }
        }
        return null
      }
      return findNode(state.design)
    },
    
    // Add a new node to the tree
    addNode: (newNode, parentId = null) => set((state) => {
      const targetParent = parentId || state.selectedNodeId || 'root'
      
      const addToTree = (node) => {
        if (node.id === targetParent) {
          return {
            ...node,
            children: [...(node.children || []), newNode]
          }
        }
        if (node.children) {
          return { ...node, children: node.children.map(addToTree) }
        }
        return node
      }
      
      state.design = addToTree(state.design)
      state.selectedNodeId = newNode.id
      state.isDirty = true
      
      // Expand parent to show new node
      const expanded = new Set(state.expandedNodes)
      expanded.add(targetParent)
      state.expandedNodes = expanded
    }),
    
    // Move a node to a new parent or reorder within same parent
    moveNode: (nodeId, targetParentId, insertIndex = -1) => set((state) => {
      if (nodeId === 'root' || nodeId === targetParentId) return
      
      // First, find the node and its current position
      let movedNode = null
      let originalParentId = null
      let originalIndex = -1
      
      const findNode = (node, parentId = null) => {
        if (node.children) {
          for (let i = 0; i < node.children.length; i++) {
            if (node.children[i].id === nodeId) {
              movedNode = node.children[i]
              originalParentId = node.id
              originalIndex = i
              return true
            }
            if (findNode(node.children[i], node.id)) return true
          }
        }
        return false
      }
      findNode(state.design)
      
      if (!movedNode) return // Node not found
      
      // Adjust insertIndex if moving within the same parent and moving to a later position
      let adjustedInsertIndex = insertIndex
      if (originalParentId === targetParentId && insertIndex > originalIndex && insertIndex >= 0) {
        // Since we remove the node first, positions after original shift down by 1
        adjustedInsertIndex = insertIndex - 1
      }
      
      // Remove the node from its current position
      const removeFromTree = (node) => {
        if (!node.children) return node
        return {
          ...node,
          children: node.children
            .filter(child => child.id !== nodeId)
            .map(removeFromTree)
        }
      }
      
      let newDesign = removeFromTree(state.design)
      
      // Then insert into the target parent at the adjusted index
      const insertIntoTree = (node) => {
        if (node.id === targetParentId) {
          const children = [...(node.children || [])]
          if (adjustedInsertIndex >= 0 && adjustedInsertIndex <= children.length) {
            children.splice(adjustedInsertIndex, 0, movedNode)
          } else {
            children.push(movedNode)
          }
          return { ...node, children }
        }
        if (node.children) {
          return { ...node, children: node.children.map(insertIntoTree) }
        }
        return node
      }
      
      state.design = insertIntoTree(newDesign)
      state.isDirty = true
      
      // Expand parent to show moved node
      const expanded = new Set(state.expandedNodes)
      expanded.add(targetParentId)
      state.expandedNodes = expanded
    }),
    
    // Update node position (for canvas dragging)
    updateNodePosition: (nodeId, x, y) => set((state) => {
      const updateInTree = (node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            style: {
              ...node.style,
              position: 'absolute',
              left: `${x}px`,
              top: `${y}px`,
            }
          }
        }
        if (node.children) {
          return { ...node, children: node.children.map(updateInTree) }
        }
        return node
      }
      state.design = updateInTree(state.design)
      state.isDirty = true
    }),
  }))
)

// ============================================================================
// HELPER: Default Design for New Elements
// ============================================================================

function createDefaultDesign(elementType = 'popup') {
  return {
    id: 'root',
    type: 'Box',
    name: 'Root',
    props: {},
    style: {
      padding: '24px',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    },
    children: [
      {
        id: 'heading',
        type: 'Heading',
        name: 'Title',
        props: { level: 2, text: 'Welcome!' },
        style: { marginBottom: '8px' },
        children: [],
      },
      {
        id: 'text',
        type: 'Text',
        name: 'Description',
        props: { text: 'This is your new element. Start editing!' },
        style: { color: '#666666', marginBottom: '16px' },
        children: [],
      },
      {
        id: 'button',
        type: 'Button',
        name: 'CTA Button',
        props: { text: 'Get Started', variant: 'primary' },
        style: {},
        children: [],
      },
    ],
  }
}

// ============================================================================
// ELEMENT TYPE CONFIG
// ============================================================================

const ELEMENT_TYPES = {
  popup: { icon: Target, label: 'Popup', color: 'text-blue-500' },
  banner: { icon: Megaphone, label: 'Banner', color: 'text-orange-500' },
  nudge: { icon: MessageSquare, label: 'Nudge', color: 'text-green-500' },
  toast: { icon: Bell, label: 'Toast', color: 'text-purple-500' },
  'slide-in': { icon: ArrowUpRight, label: 'Slide-in', color: 'text-pink-500' },
}

// ============================================================================
// NODE TYPE ICONS (for tree view)
// ============================================================================

const NODE_TYPE_ICONS = {
  Box: Square,
  Flex: Layers,
  Heading: Type,
  Text: Type,
  Button: MousePointer2,
  Image: Image,
  Form: FileText,
  Input: Code,
  default: Component,
}

// ============================================================================
// COMPONENT TREE (Chunk 3)
// ============================================================================

function TreeNode({ 
  node, 
  depth = 0, 
  index = 0,
  parentId = null,
  onSelect, 
  selectedNodeId, 
  hoveredNodeId,
  onHover,
  expandedNodes,
  hiddenNodes,
  lockedNodes,
  onToggleExpanded,
  onToggleVisibility,
  onToggleLock,
  onDelete,
  onDuplicate,
  onDrop,
  onMove,
}) {
  const hasChildren = node.children && node.children.length > 0
  const isExpanded = expandedNodes.has(node.id)
  const isHidden = hiddenNodes.has(node.id)
  const isLocked = lockedNodes.has(node.id)
  const isSelected = selectedNodeId === node.id
  const isHovered = hoveredNodeId === node.id
  const Icon = NODE_TYPE_ICONS[node.type] || NODE_TYPE_ICONS.default
  const [isDropTarget, setIsDropTarget] = useState(false)
  const [dropPosition, setDropPosition] = useState(null) // 'before', 'inside', 'after'
  const [isDragging, setIsDragging] = useState(false)
  
  // Container types that can accept children
  const canAcceptChildren = ['Box', 'Flex', 'Root'].includes(node.type) || node.id === 'root'
  const isRoot = node.id === 'root'
  
  // Handle drag start for reordering
  const handleDragStart = (e) => {
    if (isRoot) {
      e.preventDefault()
      return
    }
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/x-tree-node', JSON.stringify({
      nodeId: node.id,
      parentId: parentId,
      index: index,
    }))
  }
  
  const handleDragEnd = () => {
    setIsDragging(false)
  }
  
  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Determine drop position based on mouse position within element
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const height = rect.height
    
    // Check if this is a tree node being moved or a component being added
    const isTreeMove = e.dataTransfer.types.includes('application/x-tree-node')
    
    if (isTreeMove) {
      // For tree reordering, show before/inside/after indicators
      if (y < height * 0.25) {
        setDropPosition('before')
        e.dataTransfer.dropEffect = 'move'
      } else if (y > height * 0.75 || !canAcceptChildren) {
        setDropPosition('after')
        e.dataTransfer.dropEffect = 'move'
      } else if (canAcceptChildren) {
        setDropPosition('inside')
        e.dataTransfer.dropEffect = 'move'
      }
    } else {
      // For component drops, only allow inside containers
      if (canAcceptChildren) {
        setDropPosition('inside')
        e.dataTransfer.dropEffect = 'copy'
      }
    }
    
    setIsDropTarget(true)
  }
  
  const handleDragLeave = (e) => {
    e.stopPropagation()
    setIsDropTarget(false)
    setDropPosition(null)
  }
  
  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDropTarget(false)
    setDropPosition(null)
    
    // Check if this is a tree node move
    const treeData = e.dataTransfer.getData('application/x-tree-node')
    if (treeData) {
      try {
        const { nodeId: draggedNodeId } = JSON.parse(treeData)
        
        // Don't drop on self or children
        if (draggedNodeId === node.id) return
        
        if (dropPosition === 'before') {
          onMove(draggedNodeId, parentId || 'root', index)
        } else if (dropPosition === 'after') {
          onMove(draggedNodeId, parentId || 'root', index + 1)
        } else if (dropPosition === 'inside' && canAcceptChildren) {
          onMove(draggedNodeId, node.id, -1) // Append to end
        }
      } catch (err) {
        console.error('Tree drop failed:', err)
      }
      return
    }
    
    // Handle component drops from panels
    if (!canAcceptChildren) return
    
    try {
      const data = e.dataTransfer.getData('application/json')
      if (data) {
        const { component, extraProps } = JSON.parse(data)
        onDrop(component, extraProps, node.id)
      }
    } catch (err) {
      console.error('Drop on tree failed:', err)
    }
  }
  
  return (
    <div className={cn("select-none relative", isDragging && "opacity-50")}>
      {/* Drop indicator: before */}
      {isDropTarget && dropPosition === 'before' && (
        <div 
          className="absolute left-0 right-0 h-0.5 bg-primary z-10"
          style={{ top: 0, marginLeft: depth * 12 + 4 }}
        />
      )}
      
      {/* Node Row */}
      <div 
        className={cn(
          'group flex items-center gap-1 h-7 px-1 rounded cursor-pointer transition-colors',
          isSelected && 'bg-primary/10 text-primary',
          !isSelected && isHovered && 'bg-muted',
          isHidden && 'opacity-50',
          isDropTarget && dropPosition === 'inside' && 'ring-2 ring-primary bg-primary/20',
          !isRoot && 'cursor-grab active:cursor-grabbing'
        )}
        style={{ paddingLeft: depth * 12 + 4 }}
        draggable={!isRoot}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={() => onSelect(node.id)}
        onMouseEnter={() => onHover(node.id)}
        onMouseLeave={() => onHover(null)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag Handle */}
        {!isRoot && (
          <GripVertical className="h-3 w-3 text-muted-foreground/50 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
        
        {/* Expand/Collapse Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-5 w-5 p-0',
            !hasChildren && 'invisible'
          )}
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpanded(node.id)
          }}
        >
          <ChevronRight 
            className={cn(
              'h-3 w-3 transition-transform',
              isExpanded && 'rotate-90'
            )} 
          />
        </Button>
        
        {/* Type Icon */}
        <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        
        {/* Name */}
        <span className="flex-1 truncate text-sm">
          {node.name || node.type}
        </span>
        
        {/* Quick Actions (show on hover) */}
        <div className={cn(
          'flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity',
          isSelected && 'opacity-100'
        )}>
          {/* Visibility Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 p-0"
            onClick={(e) => {
              e.stopPropagation()
              onToggleVisibility(node.id)
            }}
            title={isHidden ? 'Show' : 'Hide'}
          >
            {isHidden ? (
              <EyeOff className="h-3 w-3 text-muted-foreground" />
            ) : (
              <Eye className="h-3 w-3 text-muted-foreground" />
            )}
          </Button>
          
          {/* Lock Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 p-0"
            onClick={(e) => {
              e.stopPropagation()
              onToggleLock(node.id)
            }}
            title={isLocked ? 'Unlock' : 'Lock'}
          >
            {isLocked ? (
              <Lock className="h-3 w-3 text-muted-foreground" />
            ) : (
              <Unlock className="h-3 w-3 text-muted-foreground" />
            )}
          </Button>
          
          {/* Delete (not for root) */}
          {node.id !== 'root' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(node.id)
              }}
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Drop indicator: after (only show on last child or when dropping after this node) */}
      {isDropTarget && dropPosition === 'after' && (
        <div 
          className="absolute left-0 right-0 h-0.5 bg-primary z-10"
          style={{ bottom: 0, marginLeft: depth * 12 + 4 }}
        />
      )}
      
      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child, idx) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              index={idx}
              parentId={node.id}
              onSelect={onSelect}
              selectedNodeId={selectedNodeId}
              hoveredNodeId={hoveredNodeId}
              onHover={onHover}
              expandedNodes={expandedNodes}
              hiddenNodes={hiddenNodes}
              lockedNodes={lockedNodes}
              onToggleExpanded={onToggleExpanded}
              onToggleVisibility={onToggleVisibility}
              onToggleLock={onToggleLock}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onDrop={onDrop}
              onMove={onMove}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ComponentTree() {
  const { 
    design, 
    selectedNodeId, 
    hoveredNodeId,
    expandedNodes,
    hiddenNodes,
    lockedNodes,
    setSelectedNodeId,
    setHoveredNodeId,
    toggleNodeExpanded,
    toggleNodeVisibility,
    toggleNodeLock,
    deleteNode,
    duplicateNode,
    addNode,
    moveNode,
  } = useStudioStore()
  
  const [searchQuery, setSearchQuery] = useState('')
  
  // Handle drop on a tree node
  const handleTreeDrop = useCallback((component, extraProps, parentId) => {
    const newNode = createNodeFromComponent(component, extraProps || {})
    if (extraProps?.alt) newNode.name = extraProps.alt
    addNode(newNode, parentId)
  }, [addNode])
  
  // Handle move for drag-to-reorder
  const handleTreeMove = useCallback((nodeId, targetParentId, insertIndex) => {
    moveNode(nodeId, targetParentId, insertIndex)
  }, [moveNode])
  
  if (!design) {
    return (
      <div className="p-3 text-sm text-muted-foreground text-center">
        No component loaded
      </div>
    )
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search layers..."
            className="h-7 pl-7 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {/* Tree */}
      <div className="flex-1 overflow-auto p-1">
        <TreeNode
          node={design}
          onSelect={setSelectedNodeId}
          selectedNodeId={selectedNodeId}
          hoveredNodeId={hoveredNodeId}
          onHover={setHoveredNodeId}
          expandedNodes={expandedNodes}
          hiddenNodes={hiddenNodes}
          lockedNodes={lockedNodes}
          onToggleExpanded={toggleNodeExpanded}
          onToggleVisibility={toggleNodeVisibility}
          onToggleLock={toggleNodeLock}
          onDelete={deleteNode}
          onDuplicate={duplicateNode}
          onDrop={handleTreeDrop}
          onMove={handleTreeMove}
        />
      </div>
      
      {/* Footer Actions */}
      <div className="p-2 border-t flex gap-1">
        <Button variant="outline" size="sm" className="flex-1 h-7 text-xs gap-1">
          <Plus className="h-3 w-3" />
          Add
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 text-xs gap-1"
          disabled={!selectedNodeId || selectedNodeId === 'root'}
          onClick={() => duplicateNode(selectedNodeId)}
        >
          <Copy className="h-3 w-3" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
          disabled={!selectedNodeId || selectedNodeId === 'root'}
          onClick={() => deleteNode(selectedNodeId)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// CANVAS RENDERER (Chunk 4)
// ============================================================================

// Render a single design node as React
function CanvasNode({ 
  node, 
  selectedNodeId, 
  hoveredNodeId, 
  hiddenNodes,
  lockedNodes,
  onSelect, 
  onHover,
  onMove,
  nodeRefs,
  isRoot = false,
  parentId = null,
  index = 0,
}) {
  const isHidden = hiddenNodes.has(node.id)
  if (isHidden) return null
  
  const isSelected = selectedNodeId === node.id
  const isHovered = hoveredNodeId === node.id
  const isLocked = lockedNodes?.has(node.id)
  const [isDragging, setIsDragging] = useState(false)
  const [dropPosition, setDropPosition] = useState(null) // 'before', 'after'
  
  // Store ref for selection overlay positioning
  const nodeRef = useCallback((el) => {
    if (el) {
      nodeRefs.current[node.id] = el
    }
  }, [node.id, nodeRefs])
  
  // Determine if this container can accept drops
  const canAcceptChildren = ['Box', 'Flex', 'Root'].includes(node.type) || node.id === 'root'
  
  // Base styles from node
  const style = {
    ...node.style,
    position: node.style?.position || 'relative',
    outline: isSelected ? '2px solid var(--primary)' : isHovered ? '2px solid var(--primary-50)' : 'none',
    outlineOffset: '-2px',
    cursor: isLocked ? 'not-allowed' : 'grab',
    opacity: isDragging ? 0.5 : 1,
    // Root node should fill its container
    ...(isRoot && {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
    }),
  }
  
  // Drag handlers
  const handleDragStart = (e) => {
    if (isRoot || isLocked) {
      e.preventDefault()
      return
    }
    setIsDragging(true)
    e.stopPropagation()
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/x-canvas-node', JSON.stringify({
      nodeId: node.id,
      parentId: parentId,
      index: index,
    }))
  }
  
  const handleDragEnd = () => {
    setIsDragging(false)
  }
  
  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Determine drop position based on mouse position
    const rect = e.currentTarget.getBoundingClientRect()
    const isVertical = node.props?.direction !== 'row'
    const pos = isVertical 
      ? (e.clientY - rect.top) / rect.height
      : (e.clientX - rect.left) / rect.width
    
    const isCanvasMove = e.dataTransfer.types.includes('application/x-canvas-node')
    
    if (isCanvasMove) {
      // For root container or non-root, calculate position based on drop location
      if (isRoot && canAcceptChildren) {
        // Root container: calculate insert index based on Y position among children
        // Store the mouse Y position for use in handleDrop
        e.currentTarget.dataset.dropY = e.clientY
        setDropPosition('inside-at-position')
        e.dataTransfer.dropEffect = 'move'
      } else {
        setDropPosition(pos < 0.5 ? 'before' : 'after')
        e.dataTransfer.dropEffect = 'move'
      }
    } else if (canAcceptChildren) {
      setDropPosition('inside')
      e.dataTransfer.dropEffect = 'copy'
    }
  }
  
  const handleDragLeave = (e) => {
    e.stopPropagation()
    setDropPosition(null)
  }
  
  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    const currentDropPosition = dropPosition
    setDropPosition(null)
    
    // Handle canvas node moves
    const canvasData = e.dataTransfer.getData('application/x-canvas-node')
    if (canvasData && onMove) {
      try {
        const { nodeId: draggedNodeId } = JSON.parse(canvasData)
        if (draggedNodeId === node.id) return // Can't drop on self
        
        if (currentDropPosition === 'before') {
          onMove(draggedNodeId, parentId || 'root', index)
        } else if (currentDropPosition === 'after') {
          onMove(draggedNodeId, parentId || 'root', index + 1)
        } else if (currentDropPosition === 'inside-at-position' && canAcceptChildren) {
          // Calculate insert index based on drop Y position relative to children
          const children = node.children || []
          const rect = e.currentTarget.getBoundingClientRect()
          const dropY = e.clientY - rect.top
          
          // Find which child position we're closest to
          let insertIndex = children.length // Default to end
          let draggedCurrentIndex = -1
          
          // Find the current index of the dragged element
          for (let i = 0; i < children.length; i++) {
            if (children[i].id === draggedNodeId) {
              draggedCurrentIndex = i
              break
            }
          }
          
          for (let i = 0; i < children.length; i++) {
            const childEl = e.currentTarget.querySelector(`[data-node-id="${children[i].id}"]`)
            if (childEl) {
              const childRect = childEl.getBoundingClientRect()
              const childTop = childRect.top - rect.top
              const childMiddle = childTop + childRect.height / 2
              
              if (dropY < childMiddle) {
                insertIndex = i
                break
              }
            }
          }
          
          // Don't move if dropping in the same position
          if (draggedCurrentIndex === insertIndex) return
          // Also check if dropping right after itself (which is effectively same position)
          if (draggedCurrentIndex >= 0 && insertIndex === draggedCurrentIndex + 1) return
          
          onMove(draggedNodeId, node.id, insertIndex)
        } else if (currentDropPosition === 'inside' && canAcceptChildren) {
          onMove(draggedNodeId, node.id, -1)
        }
      } catch (err) {
        console.error('Canvas drop failed:', err)
      }
    }
  }
  
  // Click handler
  const handleClick = (e) => {
    e.stopPropagation()
    onSelect(node.id)
  }
  
  const handleMouseEnter = () => onHover(node.id)
  const handleMouseLeave = () => onHover(null)
  
  // Common drag/drop props for all elements
  const dragProps = {
    draggable: !isRoot && !isLocked,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  }
  
  // Drop indicator component
  const DropIndicator = ({ position }) => {
    if (!dropPosition || dropPosition !== position) return null
    const isVertical = node.props?.direction !== 'row'
    return (
      <div 
        className={cn(
          "absolute bg-primary z-50 pointer-events-none",
          isVertical ? "left-0 right-0 h-0.5" : "top-0 bottom-0 w-0.5",
          position === 'before' && (isVertical ? "-top-0.5" : "-left-0.5"),
          position === 'after' && (isVertical ? "-bottom-0.5" : "-right-0.5"),
        )}
      />
    )
  }
  
  // Render children with additional props
  const children = node.children?.map((child, idx) => (
    <CanvasNode
      key={child.id}
      node={child}
      selectedNodeId={selectedNodeId}
      hoveredNodeId={hoveredNodeId}
      hiddenNodes={hiddenNodes}
      lockedNodes={lockedNodes}
      onSelect={onSelect}
      onHover={onHover}
      onMove={onMove}
      nodeRefs={nodeRefs}
      parentId={node.id}
      index={idx}
    />
  ))
  
  // Render based on node type
  switch (node.type) {
    case 'Box':
    case 'Flex':
      return (
        <div
          ref={nodeRef}
          style={{
            ...style,
            display: node.type === 'Flex' ? 'flex' : 'block',
            flexDirection: node.props?.direction || 'column',
            gap: node.props?.gap || undefined,
            alignItems: node.props?.align || undefined,
            justifyContent: node.props?.justify || undefined,
          }}
          {...dragProps}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          data-node-id={node.id}
        >
          <DropIndicator position="before" />
          {children}
          {(dropPosition === 'inside' || dropPosition === 'inside-at-position') && (
            <div className="border-2 border-dashed border-primary/50 rounded p-2 text-center text-xs text-primary/70">
              Drop here
            </div>
          )}
          <DropIndicator position="after" />
        </div>
      )
    
    case 'Heading':
      const HeadingTag = `h${node.props?.level || 2}`
      return (
        <div className="relative">
          <DropIndicator position="before" />
          <HeadingTag
            ref={nodeRef}
            style={style}
            {...dragProps}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            data-node-id={node.id}
          >
            {node.props?.text || 'Heading'}
          </HeadingTag>
          <DropIndicator position="after" />
        </div>
      )
    
    case 'Text':
      return (
        <div className="relative">
          <DropIndicator position="before" />
          <p
            ref={nodeRef}
            style={style}
            {...dragProps}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            data-node-id={node.id}
          >
            {node.props?.text || 'Text content'}
          </p>
          <DropIndicator position="after" />
        </div>
      )
    
    case 'Button':
      return (
        <div className="relative">
          <DropIndicator position="before" />
          <button
            ref={nodeRef}
            style={{
              ...style,
              padding: style.padding || '8px 16px',
              backgroundColor: node.props?.variant === 'primary' ? 'var(--brand-primary, #22c55e)' : 'transparent',
              color: node.props?.variant === 'primary' ? 'white' : 'inherit',
              border: node.props?.variant === 'primary' ? 'none' : '1px solid currentColor',
              borderRadius: style.borderRadius || '6px',
              cursor: isLocked ? 'not-allowed' : 'grab',
              fontWeight: 500,
            }}
            {...dragProps}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            data-node-id={node.id}
          >
            {node.props?.text || 'Button'}
          </button>
          <DropIndicator position="after" />
        </div>
      )
    
    case 'Image':
      return (
        <div className="relative">
          <DropIndicator position="before" />
          <div
            ref={nodeRef}
            style={{
              ...style,
              width: style.width || '100%',
              height: style.height || '150px',
              backgroundColor: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            {...dragProps}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            data-node-id={node.id}
          >
            <Image className="h-8 w-8 text-muted-foreground" />
          </div>
          <DropIndicator position="after" />
        </div>
      )
    
    default:
      return (
        <div className="relative">
          <DropIndicator position="before" />
          <div
            ref={nodeRef}
            style={style}
            {...dragProps}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            data-node-id={node.id}
          >
            {children || <span className="text-muted-foreground text-xs">{node.type}</span>}
          </div>
          <DropIndicator position="after" />
        </div>
      )
  }
}

// Position configurations for each element type
const ELEMENT_POSITION_CONFIG = {
  popup: { 
    position: 'absolute', 
    inset: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  'banner-top': { 
    position: 'absolute', 
    top: '0',
    left: '0',
    right: '0',
  },
  'banner-bottom': { 
    position: 'absolute', 
    bottom: '0',
    left: '0',
    right: '0',
  },
  nudge: { 
    position: 'absolute', 
    bottom: '16px',
    right: '16px',
  },
  toast: { 
    position: 'absolute', 
    top: '16px',
    right: '16px',
  },
  'slide-in': { 
    position: 'absolute', 
    bottom: '16px',
    right: '16px',
  },
}

// Helper to get position config key based on element type and position
function getPositionConfigKey(elementType, elementPosition) {
  if (elementType === 'banner') {
    // Position can be 'top', 'bottom', or default to 'top'
    const pos = elementPosition === 'bottom' ? 'bottom' : 'top'
    return `banner-${pos}`
  }
  return elementType
}

// Canvas container that renders the entire design
function Canvas() {
  const { 
    design, 
    element,
    selectedNodeId, 
    hoveredNodeId, 
    hiddenNodes,
    lockedNodes,
    device,
    zoom,
    showSitePreview,
    siteScreenshotUrl,
    siteScreenshotLoading,
    setSelectedNodeId,
    setHoveredNodeId,
    addNode,
    moveNode,
    draggedComponent,
    setDraggedComponent,
    setDesign,
  } = useStudioStore()
  
  const nodeRefs = useRef({})
  const containerRef = useRef(null)
  const [isDragOver, setIsDragOver] = useState(false)
  
  // Resize state
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState(null) // 'e', 'w', 's', 'n', 'se', 'sw', 'ne', 'nw'
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 })
  const [initialPos, setInitialPos] = useState({ x: 0, y: 0 })
  
  // Get element type for positioning
  const elementType = element?.element_type || 'popup'
  const elementPosition = element?.position || 'center'
  const positionConfigKey = getPositionConfigKey(elementType, elementPosition)
  const positionConfig = ELEMENT_POSITION_CONFIG[positionConfigKey] || ELEMENT_POSITION_CONFIG.popup
  
  // Determine which resize handles to show for banners
  const bannerPosition = elementType === 'banner' ? (elementPosition === 'bottom' ? 'bottom' : 'top') : null
  
  // Device dimensions
  const deviceSizes = {
    desktop: { width: '100%', maxWidth: '800px', height: '600px' },
    tablet: { width: '768px', height: '1024px' },
    mobile: { width: '375px', height: '667px' },
  }
  
  const size = deviceSizes[device] || deviceSizes.desktop
  
  // Resize handlers
  const startResize = useCallback((e, handle) => {
    e.stopPropagation()
    e.preventDefault()
    setIsResizing(true)
    setResizeHandle(handle)
    setInitialPos({ x: e.clientX, y: e.clientY })
    
    // Get current design dimensions
    const rootStyles = design?.styles || {}
    setInitialSize({
      width: parseInt(rootStyles.width) || 400,
      height: parseInt(rootStyles.height) || 300,
    })
  }, [design])
  
  const handleMouseMove = useCallback((e) => {
    if (!isResizing || !resizeHandle) return
    
    const deltaX = e.clientX - initialPos.x
    const deltaY = e.clientY - initialPos.y
    
    let newWidth = initialSize.width
    let newHeight = initialSize.height
    
    // Calculate new dimensions based on handle
    if (resizeHandle.includes('e')) newWidth = Math.max(200, initialSize.width + deltaX)
    if (resizeHandle.includes('w')) newWidth = Math.max(200, initialSize.width - deltaX)
    if (resizeHandle.includes('s')) newHeight = Math.max(100, initialSize.height + deltaY)
    if (resizeHandle.includes('n')) newHeight = Math.max(100, initialSize.height - deltaY)
    
    // Update design with new dimensions
    setDesign({
      ...design,
      styles: {
        ...design.styles,
        width: `${newWidth}px`,
        height: `${newHeight}px`,
      }
    })
  }, [isResizing, resizeHandle, initialPos, initialSize, design, setDesign])
  
  const stopResize = useCallback(() => {
    setIsResizing(false)
    setResizeHandle(null)
  }, [])
  
  // Attach mouse move/up listeners when resizing
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', stopResize)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', stopResize)
      }
    }
  }, [isResizing, handleMouseMove, stopResize])
  
  // Click on empty canvas to deselect
  const handleCanvasClick = (e) => {
    if (e.target === e.currentTarget) {
      setSelectedNodeId(null)
    }
  }
  
  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragOver(true)
  }
  
  const handleDragLeave = (e) => {
    // Only set false if leaving the canvas entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false)
    }
  }
  
  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    
    try {
      const data = e.dataTransfer.getData('application/json')
      if (data) {
        const { component, extraProps } = JSON.parse(data)
        const newNode = createNodeFromComponent(component, extraProps || {})
        // If we have a name override from extraProps, use it
        if (extraProps?.alt) newNode.name = extraProps.alt
        addNode(newNode)
      }
    } catch (err) {
      console.error('Drop failed:', err)
    }
    setDraggedComponent(null)
  }
  
  if (!design) {
    return (
      <div 
        className={cn(
          "flex-1 flex items-center justify-center text-muted-foreground transition-colors",
          isDragOver && "bg-primary/10 ring-2 ring-inset ring-primary/50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-center">
          <Component className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No design loaded</p>
          <p className="text-sm">Create or select an element to start</p>
          {draggedComponent && (
            <p className="text-sm text-primary mt-2">Drop here to create</p>
          )}
        </div>
      </div>
    )
  }
  
  return (
    <div 
      className={cn(
        "flex-1 flex items-center justify-center overflow-auto p-8 bg-[#1a1a1a] transition-colors",
        isDragOver && "bg-primary/10",
        isResizing && "cursor-nwse-resize select-none"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Device Frame */}
      <div 
        className={cn(
          "bg-background rounded-lg shadow-2xl border overflow-hidden transition-all duration-200 relative",
          isDragOver && "ring-2 ring-primary"
        )}
        style={{ 
          width: size.width,
          maxWidth: size.maxWidth,
          height: size.height,
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'center',
        }}
      >
        {/* Site Screenshot Background - show when preview enabled or screenshot exists */}
        <div className="absolute inset-0 z-0">
          {siteScreenshotLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <div className="text-center text-muted-foreground">
                <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm">Loading site preview...</p>
              </div>
            </div>
          ) : siteScreenshotUrl ? (
            <>
              <img 
                src={siteScreenshotUrl} 
                alt="Site preview" 
                className="w-full h-full object-cover object-top"
              />
              {/* Backdrop overlay for popup elements */}
              {elementType === 'popup' && (
                <div className="absolute inset-0 bg-black/40" />
              )}
            </>
          ) : (
            // Fallback gradient when no screenshot available
            <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
              {/* Website mockup placeholder */}
              <div className="absolute inset-x-4 top-4 h-12 bg-white/60 dark:bg-slate-700/60 rounded-lg shadow-sm flex items-center px-4 gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
                  <div className="w-3 h-3 rounded-full bg-green-400/70" />
                </div>
                <div className="flex-1 h-6 bg-slate-200/70 dark:bg-slate-600/70 rounded-md" />
              </div>
              <div className="absolute inset-x-4 top-20 bottom-4 grid grid-cols-3 gap-3 opacity-40">
                <div className="col-span-2 space-y-3">
                  <div className="h-32 bg-slate-300/50 dark:bg-slate-600/50 rounded-lg" />
                  <div className="h-4 bg-slate-300/50 dark:bg-slate-600/50 rounded w-3/4" />
                  <div className="h-4 bg-slate-300/50 dark:bg-slate-600/50 rounded w-1/2" />
                </div>
                <div className="space-y-3">
                  <div className="h-24 bg-slate-300/50 dark:bg-slate-600/50 rounded-lg" />
                  <div className="h-24 bg-slate-300/50 dark:bg-slate-600/50 rounded-lg" />
                </div>
              </div>
              {/* Backdrop overlay for popup elements */}
              {elementType === 'popup' && (
                <div className="absolute inset-0 bg-black/30" />
              )}
            </div>
          )}
        </div>
        
        {/* Canvas Content - positioned based on element type */}
        <div 
          className="absolute inset-0 z-10 pointer-events-none"
          onClick={handleCanvasClick}
        >
          {/* Positioned element container */}
          <div
            ref={containerRef}
            className={cn(
              "pointer-events-auto",
              isResizing && "transition-none"
            )}
            style={positionConfig}
          >
            {/* Resizable design wrapper */}
            <div 
              className={cn(
                "relative bg-background rounded-lg shadow-xl overflow-hidden group flex flex-col",
                selectedNodeId === 'root' && "ring-2 ring-primary"
              )}
              style={{
                width: design?.styles?.width || (elementType === 'banner' ? '100%' : '400px'),
                height: design?.styles?.height || (elementType === 'banner' ? 'auto' : '300px'),
                minWidth: elementType === 'banner' ? '100%' : '200px',
                minHeight: '80px',
              }}
            >
              {/* Content wrapper that fills the design area */}
              <div className="flex-1 flex flex-col h-full">
                <CanvasNode
                  node={design}
                  selectedNodeId={selectedNodeId}
                  hoveredNodeId={hoveredNodeId}
                  hiddenNodes={hiddenNodes}
                  lockedNodes={lockedNodes}
                  onSelect={setSelectedNodeId}
                  onHover={setHoveredNodeId}
                  onMove={moveNode}
                  nodeRefs={nodeRefs}
                  isRoot={true}
                />
              </div>
              
              {/* Resize Handles */}
              {/* For banners: only show the edge opposite to their fixed position */}
              {elementType === 'banner' && (
                <>
                  {/* Top banner: show bottom edge handle only */}
                  {bannerPosition === 'top' && (
                    <div 
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-16 h-3 bg-white border-2 border-primary rounded-full cursor-s-resize opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center justify-center"
                      onMouseDown={(e) => startResize(e, 's')}
                    >
                      <div className="w-8 h-0.5 bg-primary/40 rounded-full" />
                    </div>
                  )}
                  {/* Bottom banner: show top edge handle only */}
                  {bannerPosition === 'bottom' && (
                    <div 
                      className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-3 bg-white border-2 border-primary rounded-full cursor-n-resize opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center justify-center"
                      onMouseDown={(e) => startResize(e, 'n')}
                    >
                      <div className="w-8 h-0.5 bg-primary/40 rounded-full" />
                    </div>
                  )}
                </>
              )}
              
              {/* For non-banner types: show all resize handles */}
              {elementType !== 'banner' && (
                <>
                  {/* Edge handles */}
                  <div 
                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-primary rounded-full cursor-n-resize opacity-0 group-hover:opacity-100 transition-opacity z-50"
                    onMouseDown={(e) => startResize(e, 'n')}
                  />
                  <div 
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-white border-2 border-primary rounded-full cursor-s-resize opacity-0 group-hover:opacity-100 transition-opacity z-50"
                    onMouseDown={(e) => startResize(e, 's')}
                  />
                  <div 
                    className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-primary rounded-full cursor-w-resize opacity-0 group-hover:opacity-100 transition-opacity z-50"
                    onMouseDown={(e) => startResize(e, 'w')}
                  />
                  <div 
                    className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-primary rounded-full cursor-e-resize opacity-0 group-hover:opacity-100 transition-opacity z-50"
                    onMouseDown={(e) => startResize(e, 'e')}
                  />
                  
                  {/* Corner handles */}
                  <div 
                    className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-primary rounded-full cursor-nw-resize opacity-0 group-hover:opacity-100 transition-opacity z-50"
                    onMouseDown={(e) => startResize(e, 'nw')}
                  />
                  <div 
                    className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-primary rounded-full cursor-ne-resize opacity-0 group-hover:opacity-100 transition-opacity z-50"
                    onMouseDown={(e) => startResize(e, 'ne')}
                  />
                  <div 
                    className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-white border-2 border-primary rounded-full cursor-sw-resize opacity-0 group-hover:opacity-100 transition-opacity z-50"
                    onMouseDown={(e) => startResize(e, 'sw')}
                  />
                  <div 
                    className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-3 h-3 bg-white border-2 border-primary rounded-full cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity z-50"
                    onMouseDown={(e) => startResize(e, 'se')}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Drop indicator */}
      {isDragOver && draggedComponent && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-sm font-medium shadow-lg">
          Drop to add {draggedComponent.component?.name || 'component'}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// PROPERTIES PANEL (Chunk 5)
// ============================================================================

// Brand color constants
const BRAND_COLORS = [
  { id: 'primary', label: 'Primary', value: 'var(--brand-primary)' },
  { id: 'secondary', label: 'Secondary', value: 'var(--brand-primary)' },
  { id: 'primary-light', label: 'Primary 15%', value: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' },
  { id: 'secondary-light', label: 'Secondary 15%', value: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' },
]

const GRADIENT_PRESETS = [
  { id: 'brand', label: 'Brand', value: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary))' },
  { id: 'brand-reverse', label: 'Brand Rev', value: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary))' },
  { id: 'primary-fade', label: 'Primary Fade', value: 'linear-gradient(180deg, var(--brand-primary), transparent)' },
  { id: 'secondary-fade', label: 'Secondary Fade', value: 'linear-gradient(180deg, var(--brand-primary), transparent)' },
]

// Reusable color picker with brand swatches and gradient support
function ColorPicker({ value, onChange, label, showGradients = true }) {
  const [expanded, setExpanded] = useState(false)
  const [customGradient, setCustomGradient] = useState(false)
  const [gType, setGType] = useState('linear')
  const [gAngle, setGAngle] = useState('135')
  const [gStart, setGStart] = useState('var(--brand-primary)')
  const [gEnd, setGEnd] = useState('var(--brand-primary)')
  
  const isGradient = value?.includes('gradient')
  const isBrandVar = value?.includes('var(--brand')
  const isCustomColor = !isGradient && !isBrandVar && value
  
  const applyCustomGradient = () => {
    const gradient = gType === 'linear' 
      ? `linear-gradient(${gAngle}deg, ${gStart}, ${gEnd})`
      : `radial-gradient(circle, ${gStart}, ${gEnd})`
    onChange(gradient)
    setCustomGradient(false)
  }
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs text-muted-foreground flex-shrink-0">{label}</label>
        <div className="flex items-center gap-1.5 flex-1 justify-end">
          {/* Color preview swatch */}
          <div 
            className="h-6 w-6 rounded border cursor-pointer flex-shrink-0"
            style={{ background: value || '#ffffff' }}
            onClick={() => setExpanded(!expanded)}
            title="Click to expand"
          />
          {/* Custom color input for hex values */}
          {isCustomColor && (
            <input
              type="color"
              className="h-6 w-6 rounded border cursor-pointer flex-shrink-0"
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
          {/* Text input */}
          <Input
            className="h-6 text-[10px] flex-1 min-w-0 max-w-[100px]"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
          />
        </div>
      </div>
      
      {/* Expanded options */}
      {expanded && (
        <div className="p-2 rounded border bg-muted/30 space-y-2">
          {/* Brand Colors */}
          <div>
            <div className="text-[10px] text-muted-foreground mb-1">Brand Colors</div>
            <div className="flex flex-wrap gap-1">
              {BRAND_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={cn(
                    "h-6 w-6 rounded border-2 transition-all",
                    value === c.value ? "border-primary scale-110" : "border-transparent hover:border-muted-foreground"
                  )}
                  style={{ background: c.value }}
                  onClick={() => { onChange(c.value); setExpanded(false) }}
                  title={c.label}
                />
              ))}
              {/* Common colors */}
              {['#ffffff', '#000000', '#f5f5f5', '#e5e5e5', 'transparent'].map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    "h-6 w-6 rounded border-2 transition-all",
                    value === c ? "border-primary scale-110" : "border-transparent hover:border-muted-foreground",
                    c === 'transparent' && "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOCIgaGVpZ2h0PSI4IiB2aWV3Qm94PSIwIDAgOCA4IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNjY2MiLz48cmVjdCB4PSI0IiB5PSI0IiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjY2NjIi8+PC9zdmc+')]"
                  )}
                  style={{ background: c === 'transparent' ? undefined : c }}
                  onClick={() => { onChange(c); setExpanded(false) }}
                  title={c}
                />
              ))}
            </div>
          </div>
          
          {/* Gradients */}
          {showGradients && (
            <div>
              <div className="text-[10px] text-muted-foreground mb-1">Gradients</div>
              <div className="flex flex-wrap gap-1">
                {GRADIENT_PRESETS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={cn(
                      "h-6 flex-1 min-w-[60px] rounded border-2 transition-all text-[9px] text-white font-medium",
                      value === g.value ? "border-primary" : "border-transparent hover:border-muted-foreground"
                    )}
                    style={{ background: g.value }}
                    onClick={() => { onChange(g.value); setExpanded(false) }}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="mt-1 text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                onClick={() => setCustomGradient(!customGradient)}
              >
                <Blend className="h-3 w-3" />
                Custom gradient...
              </button>
            </div>
          )}
          
          {/* Custom Gradient Builder */}
          {customGradient && (
            <div className="p-2 rounded border bg-background space-y-2">
              <div className="flex gap-2">
                <select
                  className="h-6 px-2 text-[10px] border rounded bg-background flex-1"
                  value={gType}
                  onChange={(e) => setGType(e.target.value)}
                >
                  <option value="linear">Linear</option>
                  <option value="radial">Radial</option>
                </select>
                {gType === 'linear' && (
                  <div className="flex items-center gap-1">
                    <Input
                      className="h-6 text-[10px] w-12"
                      value={gAngle}
                      onChange={(e) => setGAngle(e.target.value)}
                    />
                    <span className="text-[10px] text-muted-foreground">°</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <div className="text-[10px] text-muted-foreground mb-0.5">From</div>
                  <select
                    className="h-6 px-1 text-[10px] border rounded bg-background w-full"
                    value={gStart}
                    onChange={(e) => setGStart(e.target.value)}
                  >
                    <option value="var(--brand-primary)">Primary</option>
                    <option value="var(--brand-primary)">Secondary</option>
                    <option value="#ffffff">White</option>
                    <option value="#000000">Black</option>
                    <option value="transparent">Transparent</option>
                  </select>
                </div>
                <div className="flex-1">
                  <div className="text-[10px] text-muted-foreground mb-0.5">To</div>
                  <select
                    className="h-6 px-1 text-[10px] border rounded bg-background w-full"
                    value={gEnd}
                    onChange={(e) => setGEnd(e.target.value)}
                  >
                    <option value="var(--brand-primary)">Secondary</option>
                    <option value="var(--brand-primary)">Primary</option>
                    <option value="#ffffff">White</option>
                    <option value="#000000">Black</option>
                    <option value="transparent">Transparent</option>
                  </select>
                </div>
              </div>
              <div 
                className="h-5 rounded"
                style={{ 
                  background: gType === 'linear' 
                    ? `linear-gradient(${gAngle}deg, ${gStart}, ${gEnd})`
                    : `radial-gradient(circle, ${gStart}, ${gEnd})`
                }}
              />
              <Button size="sm" className="w-full h-6 text-[10px]" onClick={applyCustomGradient}>
                Apply
              </Button>
            </div>
          )}
          
          {/* Custom hex input */}
          <div>
            <div className="text-[10px] text-muted-foreground mb-1">Custom</div>
            <div className="flex gap-1">
              <input
                type="color"
                className="h-6 w-8 rounded border cursor-pointer"
                value={isCustomColor ? value : '#000000'}
                onChange={(e) => { onChange(e.target.value); setExpanded(false) }}
              />
              <Input
                className="h-6 text-[10px] flex-1"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Any CSS color value"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// PRESET CONSTANTS
// ============================================================================

const SPACING_PRESETS = [
  { label: '0', value: '0px' },
  { label: '4', value: '4px' },
  { label: '8', value: '8px' },
  { label: '12', value: '12px' },
  { label: '16', value: '16px' },
  { label: '24', value: '24px' },
  { label: '32', value: '32px' },
  { label: '48', value: '48px' },
]

const RADIUS_PRESETS = [
  { label: 'none', value: '0px' },
  { label: 'sm', value: '4px' },
  { label: 'md', value: '8px' },
  { label: 'lg', value: '12px' },
  { label: 'xl', value: '16px' },
  { label: '2xl', value: '24px' },
  { label: 'full', value: '9999px' },
]

const SHADOW_PRESETS = [
  { label: 'none', value: 'none' },
  { label: 'sm', value: '0 1px 2px 0 rgba(0,0,0,0.05)' },
  { label: 'md', value: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)' },
  { label: 'lg', value: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)' },
  { label: 'xl', value: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' },
  { label: '2xl', value: '0 25px 50px -12px rgba(0,0,0,0.25)' },
]

const FONT_SIZE_PRESETS = [
  { label: '10', value: '10px' },
  { label: '12', value: '12px' },
  { label: '14', value: '14px' },
  { label: '16', value: '16px' },
  { label: '18', value: '18px' },
  { label: '20', value: '20px' },
  { label: '24', value: '24px' },
  { label: '32', value: '32px' },
  { label: '48', value: '48px' },
]

// Spacing input with quick presets
function SpacingInput({ label, value, onChange, placeholder }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs text-muted-foreground flex-shrink-0">{label}</label>
        <Input
          className="h-6 text-[10px] flex-1 max-w-[80px]"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || '0px'}
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {SPACING_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            className={cn(
              "h-5 min-w-[24px] px-1 text-[9px] rounded border transition-colors",
              value === preset.value ? "border-primary bg-primary/10 font-medium" : "hover:border-primary/50"
            )}
            onClick={() => onChange(preset.value)}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// Border radius input with presets
function RadiusInput({ label, value, onChange }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs text-muted-foreground flex-shrink-0">{label}</label>
        <Input
          className="h-6 text-[10px] flex-1 max-w-[80px]"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0px"
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {RADIUS_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            className={cn(
              "h-5 min-w-[28px] px-1.5 text-[9px] rounded border transition-colors",
              value === preset.value ? "border-primary bg-primary/10 font-medium" : "hover:border-primary/50"
            )}
            onClick={() => onChange(preset.value)}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// Box shadow input with presets
function ShadowInput({ label, value, onChange }) {
  const currentPreset = SHADOW_PRESETS.find(p => p.value === value)
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs text-muted-foreground flex-shrink-0">{label}</label>
        <span className="text-[10px] text-muted-foreground">
          {currentPreset ? currentPreset.label : 'custom'}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {SHADOW_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className={cn(
              "h-6 flex-1 min-w-[40px] text-[9px] rounded border transition-all",
              value === preset.value ? "border-primary bg-primary/10 font-medium" : "hover:border-primary/50"
            )}
            style={{ boxShadow: preset.value !== 'none' ? preset.value : undefined }}
            onClick={() => onChange(preset.value)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <Input
        className="h-6 text-[10px]"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Custom shadow value"
      />
    </div>
  )
}

// Font size input with presets
function FontSizeInput({ label, value, onChange }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs text-muted-foreground flex-shrink-0">{label}</label>
        <Input
          className="h-6 text-[10px] flex-1 max-w-[60px]"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="16px"
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {FONT_SIZE_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            className={cn(
              "h-5 min-w-[24px] px-1 text-[9px] rounded border transition-colors",
              value === preset.value ? "border-primary bg-primary/10 font-medium" : "hover:border-primary/50"
            )}
            onClick={() => onChange(preset.value)}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// Simple property input (non-color)
function PropertyInput({ label, value, onChange, type = 'text', options, placeholder }) {
  if (type === 'select' && options) {
    return (
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs text-muted-foreground flex-shrink-0">{label}</label>
        <select
          className="h-7 px-2 text-xs border rounded bg-background flex-1 min-w-0"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    )
  }
  
  // For color type, use ColorPicker instead
  if (type === 'color') {
    return <ColorPicker label={label} value={value} onChange={onChange} />
  }
  
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs text-muted-foreground flex-shrink-0">{label}</label>
      <Input
        type={type}
        className="h-7 text-xs flex-1"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

function PropertySection({ title, children, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  
  return (
    <div className="border-b last:border-b-0">
      <button
        className="w-full flex items-center justify-between py-2 px-3 hover:bg-muted/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-xs font-medium">{title}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')} />
      </button>
      {isOpen && (
        <div className="px-3 pb-3 space-y-2">
          {children}
        </div>
      )}
    </div>
  )
}

function PropertiesPanel() {
  const { 
    selectedNodeId,
    rightPanelTab,
    updateNodeStyle,
    updateNodeProps,
    updateNodeName,
    getSelectedNode,
  } = useStudioStore()
  
  const selectedNode = getSelectedNode()
  
  if (!selectedNode) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-muted-foreground">
          <MousePointer2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No element selected</p>
          <p className="text-xs mt-1">Click an element on the canvas or in the layer tree</p>
        </div>
      </div>
    )
  }
  
  const style = selectedNode.style || {}
  const props = selectedNode.props || {}
  
  return (
    <div className="flex-1 overflow-auto">
      {/* Design Tab */}
      {rightPanelTab === 'design' && (
        <>
          {/* Element Info */}
          <PropertySection title="Element">
            <PropertyInput
              label="Name"
              value={selectedNode.name}
              onChange={(v) => updateNodeName(selectedNode.id, v)}
              placeholder={selectedNode.type}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Type</span>
              <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{selectedNode.type}</span>
            </div>
          </PropertySection>
          
          {/* Typography (for text elements) */}
          {['Heading', 'Text', 'Button'].includes(selectedNode.type) && (
            <PropertySection title="Typography">
              <PropertyInput
                label="Text"
                value={props.text}
                onChange={(v) => updateNodeProps(selectedNode.id, 'text', v)}
                placeholder="Enter text..."
              />
              <FontSizeInput
                label="Font Size"
                value={style.fontSize}
                onChange={(v) => updateNodeStyle(selectedNode.id, 'fontSize', v)}
              />
              <PropertyInput
                label="Font Weight"
                type="select"
                value={style.fontWeight}
                onChange={(v) => updateNodeStyle(selectedNode.id, 'fontWeight', v)}
                options={[
                  { value: '', label: 'Default' },
                  { value: '400', label: 'Normal (400)' },
                  { value: '500', label: 'Medium (500)' },
                  { value: '600', label: 'Semibold (600)' },
                  { value: '700', label: 'Bold (700)' },
                ]}
              />
              <PropertyInput
                label="Color"
                type="color"
                value={style.color}
                onChange={(v) => updateNodeStyle(selectedNode.id, 'color', v)}
              />
              <PropertyInput
                label="Align"
                type="select"
                value={style.textAlign}
                onChange={(v) => updateNodeStyle(selectedNode.id, 'textAlign', v)}
                options={[
                  { value: '', label: 'Default' },
                  { value: 'left', label: 'Left' },
                  { value: 'center', label: 'Center' },
                  { value: 'right', label: 'Right' },
                ]}
              />
            </PropertySection>
          )}
          
          {/* Background */}
          <PropertySection title="Background">
            <PropertyInput
              label="Color"
              type="color"
              value={style.backgroundColor}
              onChange={(v) => updateNodeStyle(selectedNode.id, 'backgroundColor', v)}
            />
          </PropertySection>
          
          {/* Border */}
          <PropertySection title="Border" defaultOpen={false}>
            <RadiusInput
              label="Radius"
              value={style.borderRadius}
              onChange={(v) => updateNodeStyle(selectedNode.id, 'borderRadius', v)}
            />
            <PropertyInput
              label="Width"
              value={style.borderWidth}
              onChange={(v) => updateNodeStyle(selectedNode.id, 'borderWidth', v)}
              placeholder="0px"
            />
            <PropertyInput
              label="Color"
              type="color"
              value={style.borderColor}
              onChange={(v) => updateNodeStyle(selectedNode.id, 'borderColor', v)}
            />
          </PropertySection>
          
          {/* Shadow */}
          <PropertySection title="Shadow" defaultOpen={false}>
            <ShadowInput
              label="Box Shadow"
              value={style.boxShadow}
              onChange={(v) => updateNodeStyle(selectedNode.id, 'boxShadow', v)}
            />
          </PropertySection>
          
          {/* Button-specific styles (for Button, BookingButton, BuyNow, AddToCart, EventRSVP, etc.) */}
          {['Button', 'BookingButton', 'BookingCard', 'BuyNow', 'AddToCart', 'EventRSVP', 'FormEmbed'].includes(selectedNode.type) && (
            <PropertySection title="Button Styles" defaultOpen={true}>
              <div className="text-[10px] text-muted-foreground mb-2">
                {selectedNode.type === 'FormEmbed' ? 'Submit button styling' : 'Button appearance'}
              </div>
              <ColorPicker
                label="Background"
                value={selectedNode.type === 'FormEmbed' 
                  ? selectedNode.props?.formStyles?.button?.backgroundColor 
                  : style.backgroundColor}
                onChange={(v) => {
                  if (selectedNode.type === 'FormEmbed') {
                    const currentFormStyles = selectedNode.props?.formStyles || {}
                    updateNodeProps(selectedNode.id, 'formStyles', {
                      ...currentFormStyles,
                      button: { ...currentFormStyles?.button, backgroundColor: v }
                    })
                  } else {
                    updateNodeStyle(selectedNode.id, 'backgroundColor', v)
                  }
                }}
                showGradients={true}
              />
              <ColorPicker
                label="Text Color"
                value={selectedNode.type === 'FormEmbed' 
                  ? selectedNode.props?.formStyles?.button?.color 
                  : style.color}
                onChange={(v) => {
                  if (selectedNode.type === 'FormEmbed') {
                    const currentFormStyles = selectedNode.props?.formStyles || {}
                    updateNodeProps(selectedNode.id, 'formStyles', {
                      ...currentFormStyles,
                      button: { ...currentFormStyles?.button, color: v }
                    })
                  } else {
                    updateNodeStyle(selectedNode.id, 'color', v)
                  }
                }}
                showGradients={false}
              />
              <PropertyInput
                label="Border Radius"
                value={selectedNode.type === 'FormEmbed' 
                  ? selectedNode.props?.formStyles?.button?.borderRadius 
                  : style.borderRadius}
                onChange={(v) => {
                  if (selectedNode.type === 'FormEmbed') {
                    const currentFormStyles = selectedNode.props?.formStyles || {}
                    updateNodeProps(selectedNode.id, 'formStyles', {
                      ...currentFormStyles,
                      button: { ...currentFormStyles?.button, borderRadius: v }
                    })
                  } else {
                    updateNodeStyle(selectedNode.id, 'borderRadius', v)
                  }
                }}
                placeholder="6px"
              />
              <PropertyInput
                label="Padding"
                value={selectedNode.type === 'FormEmbed' 
                  ? selectedNode.props?.formStyles?.button?.padding 
                  : style.padding}
                onChange={(v) => {
                  if (selectedNode.type === 'FormEmbed') {
                    const currentFormStyles = selectedNode.props?.formStyles || {}
                    updateNodeProps(selectedNode.id, 'formStyles', {
                      ...currentFormStyles,
                      button: { ...currentFormStyles?.button, padding: v }
                    })
                  } else {
                    updateNodeStyle(selectedNode.id, 'padding', v)
                  }
                }}
                placeholder="10px 20px"
              />
            </PropertySection>
          )}
          
          {/* Form-specific styles (input and label styling) */}
          {selectedNode.type === 'FormEmbed' && (
            <>
              <PropertySection title="Input Styles" defaultOpen={false}>
                <ColorPicker
                  label="Background"
                  value={selectedNode.props?.formStyles?.input?.backgroundColor || '#ffffff'}
                  onChange={(v) => {
                    const currentFormStyles = selectedNode.props?.formStyles || {}
                    updateNodeProps(selectedNode.id, 'formStyles', {
                      ...currentFormStyles,
                      input: { ...currentFormStyles?.input, backgroundColor: v }
                    })
                  }}
                  showGradients={false}
                />
                <ColorPicker
                  label="Border"
                  value={selectedNode.props?.formStyles?.input?.borderColor || '#e5e5e5'}
                  onChange={(v) => {
                    const currentFormStyles = selectedNode.props?.formStyles || {}
                    updateNodeProps(selectedNode.id, 'formStyles', {
                      ...currentFormStyles,
                      input: { ...currentFormStyles?.input, borderColor: v, border: `1px solid ${v}` }
                    })
                  }}
                  showGradients={false}
                />
                <PropertyInput
                  label="Border Radius"
                  value={selectedNode.props?.formStyles?.input?.borderRadius}
                  onChange={(v) => {
                    const currentFormStyles = selectedNode.props?.formStyles || {}
                    updateNodeProps(selectedNode.id, 'formStyles', {
                      ...currentFormStyles,
                      input: { ...currentFormStyles?.input, borderRadius: v }
                    })
                  }}
                  placeholder="6px"
                />
                <PropertyInput
                  label="Padding"
                  value={selectedNode.props?.formStyles?.input?.padding}
                  onChange={(v) => {
                    const currentFormStyles = selectedNode.props?.formStyles || {}
                    updateNodeProps(selectedNode.id, 'formStyles', {
                      ...currentFormStyles,
                      input: { ...currentFormStyles?.input, padding: v }
                    })
                  }}
                  placeholder="10px 12px"
                />
              </PropertySection>
              
              <PropertySection title="Label Styles" defaultOpen={false}>
                <ColorPicker
                  label="Color"
                  value={selectedNode.props?.formStyles?.label?.color}
                  onChange={(v) => {
                    const currentFormStyles = selectedNode.props?.formStyles || {}
                    updateNodeProps(selectedNode.id, 'formStyles', {
                      ...currentFormStyles,
                      label: { ...currentFormStyles?.label, color: v }
                    })
                  }}
                  showGradients={false}
                />
                <PropertyInput
                  label="Font Size"
                  value={selectedNode.props?.formStyles?.label?.fontSize}
                  onChange={(v) => {
                    const currentFormStyles = selectedNode.props?.formStyles || {}
                    updateNodeProps(selectedNode.id, 'formStyles', {
                      ...currentFormStyles,
                      label: { ...currentFormStyles?.label, fontSize: v }
                    })
                  }}
                  placeholder="14px"
                />
                <PropertyInput
                  label="Font Weight"
                  type="select"
                  value={selectedNode.props?.formStyles?.label?.fontWeight || '500'}
                  onChange={(v) => {
                    const currentFormStyles = selectedNode.props?.formStyles || {}
                    updateNodeProps(selectedNode.id, 'formStyles', {
                      ...currentFormStyles,
                      label: { ...currentFormStyles?.label, fontWeight: v }
                    })
                  }}
                  options={[
                    { value: '400', label: 'Normal' },
                    { value: '500', label: 'Medium' },
                    { value: '600', label: 'Semibold' },
                    { value: '700', label: 'Bold' },
                  ]}
                />
              </PropertySection>
            </>
          )}
        </>
      )}
      
      {/* Layout Tab */}
      {rightPanelTab === 'layout' && (
        <>
          {/* Size */}
          <PropertySection title="Size">
            <PropertyInput
              label="Width"
              value={style.width}
              onChange={(v) => updateNodeStyle(selectedNode.id, 'width', v)}
              placeholder="auto"
            />
            <PropertyInput
              label="Height"
              value={style.height}
              onChange={(v) => updateNodeStyle(selectedNode.id, 'height', v)}
              placeholder="auto"
            />
            <PropertyInput
              label="Min Width"
              value={style.minWidth}
              onChange={(v) => updateNodeStyle(selectedNode.id, 'minWidth', v)}
              placeholder="none"
            />
            <PropertyInput
              label="Max Width"
              value={style.maxWidth}
              onChange={(v) => updateNodeStyle(selectedNode.id, 'maxWidth', v)}
              placeholder="none"
            />
          </PropertySection>
          
          {/* Spacing */}
          <PropertySection title="Spacing">
            <SpacingInput
              label="Padding"
              value={style.padding}
              onChange={(v) => updateNodeStyle(selectedNode.id, 'padding', v)}
            />
            <SpacingInput
              label="Margin"
              value={style.margin}
              onChange={(v) => updateNodeStyle(selectedNode.id, 'margin', v)}
            />
            <SpacingInput
              label="Gap"
              value={style.gap}
              onChange={(v) => updateNodeStyle(selectedNode.id, 'gap', v)}
            />
          </PropertySection>
          
          {/* Display */}
          <PropertySection title="Display">
            <PropertyInput
              label="Display"
              type="select"
              value={style.display}
              onChange={(v) => updateNodeStyle(selectedNode.id, 'display', v)}
              options={[
                { value: '', label: 'Default' },
                { value: 'block', label: 'Block' },
                { value: 'flex', label: 'Flex' },
                { value: 'grid', label: 'Grid' },
                { value: 'inline', label: 'Inline' },
                { value: 'none', label: 'None' },
              ]}
            />
            <PropertyInput
              label="Flex Direction"
              type="select"
              value={style.flexDirection}
              onChange={(v) => updateNodeStyle(selectedNode.id, 'flexDirection', v)}
              options={[
                { value: '', label: 'Default' },
                { value: 'row', label: 'Row' },
                { value: 'column', label: 'Column' },
              ]}
            />
            <PropertyInput
              label="Align Items"
              type="select"
              value={style.alignItems}
              onChange={(v) => updateNodeStyle(selectedNode.id, 'alignItems', v)}
              options={[
                { value: '', label: 'Default' },
                { value: 'flex-start', label: 'Start' },
                { value: 'center', label: 'Center' },
                { value: 'flex-end', label: 'End' },
                { value: 'stretch', label: 'Stretch' },
              ]}
            />
            <PropertyInput
              label="Justify"
              type="select"
              value={style.justifyContent}
              onChange={(v) => updateNodeStyle(selectedNode.id, 'justifyContent', v)}
              options={[
                { value: '', label: 'Default' },
                { value: 'flex-start', label: 'Start' },
                { value: 'center', label: 'Center' },
                { value: 'flex-end', label: 'End' },
                { value: 'space-between', label: 'Space Between' },
                { value: 'space-around', label: 'Space Around' },
              ]}
            />
          </PropertySection>
          
          {/* Position */}
          <PropertySection title="Position" defaultOpen={false}>
            <PropertyInput
              label="Position"
              type="select"
              value={style.position}
              onChange={(v) => updateNodeStyle(selectedNode.id, 'position', v)}
              options={[
                { value: '', label: 'Default' },
                { value: 'relative', label: 'Relative' },
                { value: 'absolute', label: 'Absolute' },
                { value: 'fixed', label: 'Fixed' },
              ]}
            />
            <PropertyInput
              label="Top"
              value={style.top}
              onChange={(v) => updateNodeStyle(selectedNode.id, 'top', v)}
              placeholder="auto"
            />
            <PropertyInput
              label="Right"
              value={style.right}
              onChange={(v) => updateNodeStyle(selectedNode.id, 'right', v)}
              placeholder="auto"
            />
            <PropertyInput
              label="Bottom"
              value={style.bottom}
              onChange={(v) => updateNodeStyle(selectedNode.id, 'bottom', v)}
              placeholder="auto"
            />
            <PropertyInput
              label="Left"
              value={style.left}
              onChange={(v) => updateNodeStyle(selectedNode.id, 'left', v)}
              placeholder="auto"
            />
            <PropertyInput
              label="Z-Index"
              type="number"
              value={style.zIndex}
              onChange={(v) => updateNodeStyle(selectedNode.id, 'zIndex', v)}
              placeholder="auto"
            />
          </PropertySection>
        </>
      )}
      
      {/* Interactions Tab */}
      {rightPanelTab === 'interactions' && (
        <>
          {/* Click Actions - show for buttons and clickable elements */}
          {['Button', 'BookingButton', 'BuyNow', 'AddToCart', 'EventRSVP', 'Image', 'Link'].includes(selectedNode?.type) && (
            <PropertySection title="Click Action" defaultOpen>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Action Type</label>
                  <select
                    className="w-full h-8 px-2 text-sm border rounded-md bg-background"
                    value={selectedNode?.props?.onClick?.action || 'none'}
                    onChange={(e) => updateNodeProp(selectedNode.id, 'onClick', { 
                      ...selectedNode.props?.onClick,
                      action: e.target.value 
                    })}
                  >
                    <option value="none">None</option>
                    <optgroup label="Navigation">
                      <option value="link">Open URL</option>
                      <option value="scroll">Scroll to Section</option>
                      <option value="close">Close Popup</option>
                    </optgroup>
                    <optgroup label="Commerce">
                      <option value="add_to_cart">Add to Cart</option>
                      <option value="checkout">Go to Checkout</option>
                      <option value="book">Open Booking</option>
                    </optgroup>
                    <optgroup label="Forms">
                      <option value="submit_form">Submit Form</option>
                      <option value="open_form">Open Form Modal</option>
                    </optgroup>
                    <optgroup label="Other">
                      <option value="copy">Copy to Clipboard</option>
                      <option value="share">Share</option>
                      <option value="download">Download File</option>
                    </optgroup>
                  </select>
                </div>
                
                {/* URL input for link action */}
                {selectedNode?.props?.onClick?.action === 'link' && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">URL</label>
                    <Input
                      className="h-8 text-sm"
                      placeholder="https://..."
                      value={selectedNode?.props?.onClick?.url || ''}
                      onChange={(e) => updateNodeProp(selectedNode.id, 'onClick', {
                        ...selectedNode.props?.onClick,
                        url: e.target.value
                      })}
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        id="open-new-tab"
                        checked={selectedNode?.props?.onClick?.newTab || false}
                        onChange={(e) => updateNodeProp(selectedNode.id, 'onClick', {
                          ...selectedNode.props?.onClick,
                          newTab: e.target.checked
                        })}
                      />
                      <label htmlFor="open-new-tab" className="text-xs">Open in new tab</label>
                    </div>
                  </div>
                )}
                
                {/* Section ID for scroll action */}
                {selectedNode?.props?.onClick?.action === 'scroll' && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Section ID</label>
                    <Input
                      className="h-8 text-sm"
                      placeholder="#section-id"
                      value={selectedNode?.props?.onClick?.target || ''}
                      onChange={(e) => updateNodeProp(selectedNode.id, 'onClick', {
                        ...selectedNode.props?.onClick,
                        target: e.target.value
                      })}
                    />
                  </div>
                )}
                
                {/* Product/Booking selector for commerce actions */}
                {['add_to_cart', 'checkout', 'book'].includes(selectedNode?.props?.onClick?.action) && (
                  <div className="text-xs text-muted-foreground py-2">
                    Product/booking is set via Commerce panel binding
                  </div>
                )}
                
                {/* Copy text for copy action */}
                {selectedNode?.props?.onClick?.action === 'copy' && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Text to Copy</label>
                    <Input
                      className="h-8 text-sm"
                      placeholder="Text to copy..."
                      value={selectedNode?.props?.onClick?.text || ''}
                      onChange={(e) => updateNodeProp(selectedNode.id, 'onClick', {
                        ...selectedNode.props?.onClick,
                        text: e.target.value
                      })}
                    />
                  </div>
                )}
                
                {/* Download URL for download action */}
                {selectedNode?.props?.onClick?.action === 'download' && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">File URL</label>
                    <Input
                      className="h-8 text-sm"
                      placeholder="https://..."
                      value={selectedNode?.props?.onClick?.url || ''}
                      onChange={(e) => updateNodeProp(selectedNode.id, 'onClick', {
                        ...selectedNode.props?.onClick,
                        url: e.target.value
                      })}
                    />
                  </div>
                )}
              </div>
            </PropertySection>
          )}
          
          <PropertySection title="Hover Effects">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs">Scale on Hover</span>
                <select
                  className="h-7 px-2 text-xs border rounded bg-background"
                  value={selectedNode?.props?.hoverScale || 'none'}
                  onChange={(e) => updateNodeProp(selectedNode.id, 'hoverScale', e.target.value)}
                >
                  <option value="none">None</option>
                  <option value="1.02">Subtle (1.02x)</option>
                  <option value="1.05">Medium (1.05x)</option>
                  <option value="1.1">Large (1.1x)</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">Shadow on Hover</span>
                <select
                  className="h-7 px-2 text-xs border rounded bg-background"
                  value={selectedNode?.props?.hoverShadow || 'none'}
                  onChange={(e) => updateNodeProp(selectedNode.id, 'hoverShadow', e.target.value)}
                >
                  <option value="none">None</option>
                  <option value="sm">Small</option>
                  <option value="md">Medium</option>
                  <option value="lg">Large</option>
                </select>
              </div>
            </div>
          </PropertySection>
          
          <PropertySection title="Animations">
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Entry Animation</label>
                <select
                  className="w-full h-8 px-2 text-sm border rounded-md bg-background"
                  value={selectedNode?.props?.animation || 'none'}
                  onChange={(e) => updateNodeProp(selectedNode.id, 'animation', e.target.value)}
                >
                  <option value="none">None</option>
                  <optgroup label="Fade">
                    <option value="fadeIn">Fade In</option>
                    <option value="fadeInUp">Fade In Up</option>
                    <option value="fadeInDown">Fade In Down</option>
                  </optgroup>
                  <optgroup label="Slide">
                    <option value="slideInLeft">Slide In Left</option>
                    <option value="slideInRight">Slide In Right</option>
                    <option value="slideInUp">Slide In Up</option>
                  </optgroup>
                  <optgroup label="Scale">
                    <option value="scaleIn">Scale In</option>
                    <option value="bounceIn">Bounce In</option>
                  </optgroup>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">Delay (ms)</span>
                <Input
                  type="number"
                  className="h-7 w-20 text-xs"
                  value={selectedNode?.props?.animationDelay || 0}
                  onChange={(e) => updateNodeProp(selectedNode.id, 'animationDelay', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">Duration (ms)</span>
                <Input
                  type="number"
                  className="h-7 w-20 text-xs"
                  value={selectedNode?.props?.animationDuration || 300}
                  onChange={(e) => updateNodeProp(selectedNode.id, 'animationDuration', parseInt(e.target.value) || 300)}
                />
              </div>
            </div>
          </PropertySection>
        </>
      )}
      
      {/* Data Tab */}
      {rightPanelTab === 'data' && (
        <>
          <PropertySection title="Data Bindings">
            <div className="text-xs text-muted-foreground py-4 text-center">
              Data bindings coming soon
            </div>
          </PropertySection>
          
          <PropertySection title="Conditions">
            <div className="text-xs text-muted-foreground py-4 text-center">
              Conditional visibility coming soon
            </div>
          </PropertySection>
        </>
      )}
    </div>
  )
}

// ============================================================================
// LEFT PANEL TABS (Chunk 6)
// ============================================================================

// Component library with primitives
const PRIMITIVE_COMPONENTS = [
  { type: 'Box', name: 'Box', icon: Square, desc: 'Container element', category: 'layout' },
  { type: 'Flex', name: 'Flex', icon: Layers, desc: 'Flexbox container', category: 'layout' },
  { type: 'Heading', name: 'Heading', icon: Type, desc: 'H1-H6 heading', category: 'content' },
  { type: 'Text', name: 'Text', icon: Type, desc: 'Paragraph text', category: 'content' },
  { type: 'Button', name: 'Button', icon: MousePointer2, desc: 'Click button', category: 'content' },
  { type: 'Image', name: 'Image', icon: Image, desc: 'Image element', category: 'content' },
  { type: 'Input', name: 'Input', icon: Code, desc: 'Form input', category: 'forms' },
  { type: 'Divider', name: 'Divider', icon: CornerDownRight, desc: 'Horizontal line', category: 'layout' },
]

// Commerce components for embedding products/events
const COMMERCE_COMPONENTS = [
  { type: 'ProductCard', name: 'Product Card', icon: ShoppingBag, desc: 'Full product display with image, name, price, CTA' },
  { type: 'ProductImage', name: 'Product Image', icon: Image, desc: 'Product image with gallery support' },
  { type: 'ProductPrice', name: 'Price Display', icon: ShoppingBag, desc: 'Formatted price with sale support' },
  { type: 'AddToCart', name: 'Add to Cart', icon: ShoppingBag, desc: 'Add to cart button' },
  { type: 'BuyNow', name: 'Buy Now', icon: ShoppingBag, desc: 'Direct checkout button' },
  { type: 'EventCard', name: 'Event Card', icon: Target, desc: 'Event details with RSVP' },
  { type: 'EventRSVP', name: 'RSVP Button', icon: Check, desc: 'Event registration button' },
  { type: 'EventCountdown', name: 'Countdown', icon: Target, desc: 'Countdown timer to event' },
  { type: 'ProductCarousel', name: 'Product Carousel', icon: Layers, desc: 'Multiple products slider' },
  { type: 'ReviewStars', name: 'Review Stars', icon: Target, desc: 'Star rating display' },
  { type: 'StockBadge', name: 'Stock Badge', icon: Target, desc: 'Availability indicator' },
]

// Form component for embedding managed forms (form builder handles fields/steps, styling applied here)
const FORM_COMPONENT = { type: 'FormEmbed', name: 'Form', icon: FileText, desc: 'Embed a managed form with custom styling' }

// Helper to generate unique node ID
const generateNodeId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Create a node from a component definition
function createNodeFromComponent(component, extraProps = {}) {
  const defaults = {
    Box: { style: { padding: '16px', backgroundColor: '#f5f5f5' } },
    Flex: { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
    Heading: { props: { level: 2, text: 'Heading' }, style: { marginBottom: '8px' } },
    Text: { props: { text: 'Text content goes here' }, style: { color: '#666' } },
    Button: { props: { text: 'Button', variant: 'primary' }, style: { backgroundColor: 'var(--brand-primary)', color: '#ffffff', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: '500', cursor: 'pointer' } },
    Image: { props: { src: '', alt: 'Image' }, style: { maxWidth: '100%' } },
    Input: { props: { placeholder: 'Enter text...' }, style: { padding: '8px' } },
    Divider: { style: { borderTop: '1px solid #e5e5e5', margin: '16px 0' } },
    // Commerce
    ProductCard: { props: { offering_id: null }, style: { padding: '16px', border: '1px solid #e5e5e5', borderRadius: '8px' } },
    ProductImage: { props: { offering_id: null }, style: { width: '100%', aspectRatio: '1' } },
    ProductPrice: { props: { offering_id: null }, style: {} },
    AddToCart: { props: { offering_id: null, text: 'Add to Cart' }, style: { backgroundColor: 'var(--brand-primary)', color: '#ffffff', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: '500', cursor: 'pointer' } },
    BuyNow: { props: { offering_id: null, text: 'Buy Now' }, style: { backgroundColor: 'var(--brand-primary)', color: '#ffffff', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: '500', cursor: 'pointer' } },
    EventCard: { props: { offering_id: null }, style: { padding: '16px', border: '1px solid #e5e5e5', borderRadius: '8px' } },
    EventRSVP: { props: { offering_id: null, text: 'RSVP Now' }, style: { backgroundColor: 'var(--brand-primary)', color: '#ffffff', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: '500', cursor: 'pointer' } },
    EventCountdown: { props: { offering_id: null }, style: {} },
    ProductCarousel: { props: { offering_ids: [], category_id: null }, style: { display: 'flex', gap: '16px', overflowX: 'auto' } },
    ReviewStars: { props: { offering_id: null }, style: {} },
    StockBadge: { props: { offering_id: null }, style: {} },
    // Forms (form builder handles fields/steps, styling applied here)
    FormEmbed: { 
      props: { 
        form_id: null,
        // Nested style overrides for form elements
        formStyles: {
          input: { padding: '10px 12px', borderRadius: '6px', border: '1px solid #e5e5e5', backgroundColor: '#ffffff' },
          label: { fontSize: '14px', fontWeight: '500', marginBottom: '4px', color: '#374151' },
          button: { backgroundColor: 'var(--brand-primary)', color: '#ffffff', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: '500', cursor: 'pointer' },
        }
      }, 
      style: { 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px' 
      },
    },
    // Booking (Sync)
    BookingButton: { props: { booking_type_id: null, booking_type_slug: null, text: 'Schedule Consultation' }, style: { backgroundColor: 'var(--brand-primary)', color: '#ffffff', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: '500', cursor: 'pointer' } },
    BookingCard: { props: { booking_type_id: null, booking_type_slug: null, title: '', description: '', duration: null }, style: { padding: '16px', border: '1px solid #e5e5e5', borderRadius: '8px' } },
  }
  
  const def = defaults[component.type] || { props: {}, style: {} }
  
  return {
    id: generateNodeId(),
    type: component.type,
    name: component.name,
    props: { ...def.props, ...extraProps },
    style: { ...def.style },
    children: [],
  }
}

// ============================================================================
// DRAGGABLE ITEM - Reusable drag wrapper for panel items
// ============================================================================

function DraggableItem({ 
  component, 
  extraProps = {}, 
  children, 
  className = '',
  onDoubleClick 
}) {
  const { setDraggedComponent } = useStudioStore()
  const [isDragging, setIsDragging] = useState(false)
  
  const handleDragStart = (e) => {
    // Create the component data to be dropped
    const nodeData = {
      component,
      extraProps,
    }
    e.dataTransfer.setData('application/json', JSON.stringify(nodeData))
    e.dataTransfer.effectAllowed = 'copy'
    setDraggedComponent(nodeData)
    setIsDragging(true)
  }
  
  const handleDragEnd = () => {
    setDraggedComponent(null)
    setIsDragging(false)
  }
  
  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDoubleClick={onDoubleClick}
      className={cn(
        'cursor-grab active:cursor-grabbing transition-all',
        isDragging && 'opacity-50 ring-2 ring-primary',
        className
      )}
    >
      {children}
    </div>
  )
}

function ComponentsPanel() {
  const { addNode } = useStudioStore()
  const [search, setSearch] = useState('')
  
  const filtered = PRIMITIVE_COMPONENTS.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.desc.toLowerCase().includes(search.toLowerCase())
  )
  
  const handleInsert = (component) => {
    const newNode = createNodeFromComponent(component)
    addNode(newNode)
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search components..."
            className="h-7 pl-7 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      
      {/* Component Grid */}
      <div className="flex-1 overflow-auto p-2">
        <div className="grid grid-cols-2 gap-2">
          {filtered.map((comp) => {
            const Icon = comp.icon
            return (
              <DraggableItem
                key={comp.type}
                component={comp}
                onDoubleClick={() => handleInsert(comp)}
                className="flex flex-col items-center gap-1 p-3 rounded-lg border hover:bg-muted/50 hover:border-primary/50 text-center"
              >
                <Icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs font-medium">{comp.name}</span>
              </DraggableItem>
            )
          })}
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-3">
          Drag to canvas or double-click to insert
        </p>
      </div>
    </div>
  )
}

function AssetsPanel() {
  const { addNode } = useStudioStore()
  const { currentProject } = useAuthStore()
  const fileInputRef = useRef(null)
  const [search, setSearch] = useState('')
  const [currentFolder, setCurrentFolder] = useState('engage') // Default to Engage folder
  const [assets, setAssets] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  
  const projectId = currentProject?.id
  
  // Folder structure for Engage assets
  const folders = [
    { id: 'engage', name: 'Engage', path: 'Engage' },
    { id: 'products', name: 'Products', path: 'Commerce/Products' },
    { id: 'team', name: 'Team', path: 'Team' },
    { id: 'blog', name: 'Blog', path: 'Blog' },
    { id: 'all', name: 'All Images', path: null }, // All images
  ]
  
  // Fetch assets from Files module
  useEffect(() => {
    const loadAssets = async () => {
      if (!projectId) return
      
      setIsLoading(true)
      try {
        const folder = folders.find(f => f.id === currentFolder)
        const params = {
          project_id: projectId,
          content_type: 'image', // Only images for now
        }
        
        // Add path filter if specific folder selected
        if (folder?.path) {
          params.folder_path = folder.path
        }
        
        const response = await filesApi.listFiles(params)
        const filesData = response.data?.data || response.data || []
        setAssets(Array.isArray(filesData) ? filesData : [])
      } catch (err) {
        console.error('Failed to load assets:', err)
        setAssets([])
      } finally {
        setIsLoading(false)
      }
    }
    loadAssets()
  }, [projectId, currentFolder])
  
  const filteredAssets = assets.filter(asset =>
    asset.file_name?.toLowerCase().includes(search.toLowerCase()) ||
    asset.original_name?.toLowerCase().includes(search.toLowerCase())
  )
  
  const handleInsertImage = (asset) => {
    const imageComponent = { type: 'Image', name: asset.file_name || 'Image', icon: Image, desc: 'Image element' }
    const imageUrl = asset.public_url || asset.url || asset.storage_path
    const newNode = createNodeFromComponent(imageComponent, { 
      src: imageUrl, 
      alt: asset.original_name || asset.file_name || 'Image',
      fileId: asset.id // Store file ID for reference
    })
    addNode(newNode)
  }
  
  // Handle file upload
  const handleUpload = async (e) => {
    const files = e.target.files
    if (!files?.length || !projectId) return
    
    setIsUploading(true)
    
    try {
      for (const file of files) {
        // Upload to Supabase storage first
        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const storagePath = `${projectId}/Engage/${fileName}`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('files')
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false
          })
        
        if (uploadError) {
          console.error('Storage upload failed:', uploadError)
          continue
        }
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('files')
          .getPublicUrl(storagePath)
        
        // Register file in database
        await filesApi.registerFile({
          project_id: projectId,
          file_name: fileName,
          original_name: file.name,
          content_type: file.type,
          size: file.size,
          storage_path: storagePath,
          public_url: urlData?.publicUrl,
          folder_path: 'Engage',
          category: 'engage',
        })
      }
      
      // Refresh assets list
      const folder = folders.find(f => f.id === currentFolder)
      const params = {
        project_id: projectId,
        content_type: 'image',
      }
      if (folder?.path) {
        params.folder_path = folder.path
      }
      
      const response = await filesApi.listFiles(params)
      const filesData = response.data?.data || response.data || []
      setAssets(Array.isArray(filesData) ? filesData : [])
      
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleUpload}
      />
      
      {/* Search */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            className="h-7 pl-7 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      
      {/* Folder Navigation */}
      <div className="p-2 border-b">
        <div className="text-xs font-medium text-muted-foreground mb-2">Folders</div>
        <div className="flex flex-wrap gap-1">
          {folders.map((folder) => (
            <Button
              key={folder.id}
              variant={currentFolder === folder.id ? 'secondary' : 'ghost'}
              size="sm"
              className="text-xs h-6"
              onClick={() => setCurrentFolder(folder.id)}
            >
              {folder.name}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Section Header */}
      <div className="px-2 pt-2 flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground">
          {folders.find(f => f.id === currentFolder)?.name || 'Files'}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 gap-1 text-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Plus className="h-3 w-3" />
              Upload
            </>
          )}
        </Button>
      </div>
      
      {/* Assets Grid */}
      <div className="flex-1 overflow-auto p-2">
        {isLoading ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            Loading assets...
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-sm text-muted-foreground mb-2">
              {assets.length === 0 ? 'No images uploaded yet' : 'No images found'}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="h-4 w-4" />
              Upload Images
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {filteredAssets.map((asset) => {
              const imageComponent = { type: 'Image', name: asset.file_name || 'Image', icon: Image, desc: 'Image element' }
              const imageUrl = asset.public_url || asset.url || asset.storage_path
              return (
                <DraggableItem
                  key={asset.id}
                  component={imageComponent}
                  extraProps={{ src: imageUrl, alt: asset.original_name || asset.file_name }}
                  onDoubleClick={() => handleInsertImage(asset)}
                  className="aspect-square rounded border bg-muted/30 hover:border-primary/50 hover:bg-muted/50 flex flex-col items-center justify-center p-1 group overflow-hidden"
                >
                  {imageUrl ? (
                    <img 
                      src={imageUrl} 
                      alt={asset.original_name || ''} 
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <Image className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                  )}
                </DraggableItem>
              )
            })}
          </div>
        )}
      </div>
      
      {/* Tip */}
      <div className="p-2 border-t bg-muted/30">
        <p className="text-[10px] text-muted-foreground text-center">
          Drag to canvas or double-click to insert • Saves to Engage folder
        </p>
      </div>
    </div>
  )
}

function CommercePanel() {
  const { addNode } = useStudioStore()
  const { currentProject } = useAuthStore()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('products')
  const [offerings, setOfferings] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  
  // Fetch offerings from Commerce API
  useEffect(() => {
    const loadOfferings = async () => {
      if (!currentProject?.id) return
      
      setIsLoading(true)
      try {
        const response = await commerceApi.getOfferings(currentProject.id)
        if (response.data) {
          setOfferings(response.data)
        }
      } catch (err) {
        console.error('Failed to load commerce offerings:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadOfferings()
  }, [currentProject?.id])
  
  // Filter by type (product or event) and search
  const products = offerings.filter(o => o.offering_type === 'product')
  const events = offerings.filter(o => o.offering_type === 'event')
  
  const items = activeTab === 'products' ? products : events
  
  const filteredItems = items.filter(item => 
    item.name?.toLowerCase().includes(search.toLowerCase())
  )
  
  // Insert a full product/event card
  const handleInsertCard = (item) => {
    const componentType = item.offering_type === 'product' ? 'ProductCard' : 'EventCard'
    const component = COMMERCE_COMPONENTS.find(c => c.type === componentType)
    const newNode = createNodeFromComponent(component, { offering_id: item.id })
    newNode.name = item.name
    addNode(newNode)
  }
  
  // Insert just a buy/RSVP button
  const handleInsertButton = (item) => {
    const componentType = item.offering_type === 'product' ? 'BuyNow' : 'EventRSVP'
    const component = COMMERCE_COMPONENTS.find(c => c.type === componentType)
    const buttonText = item.offering_type === 'product' ? `Buy ${item.name}` : `RSVP - ${item.name}`
    const newNode = createNodeFromComponent(component, { offering_id: item.id, text: buttonText })
    newNode.name = buttonText
    addNode(newNode)
  }
  
  // Insert add to cart button (products only)
  const handleInsertAddToCart = (item) => {
    const component = COMMERCE_COMPONENTS.find(c => c.type === 'AddToCart')
    const newNode = createNodeFromComponent(component, { offering_id: item.id, text: 'Add to Cart' })
    newNode.name = `Add ${item.name} to Cart`
    addNode(newNode)
  }
  
  // Format price display
  const formatPrice = (item) => {
    if (item.price != null) {
      return `$${Number(item.price).toFixed(2)}`
    }
    return 'Free'
  }
  
  // Format event date
  const formatEventDate = (item) => {
    if (item.event_start_date) {
      try {
        return new Date(item.event_start_date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        })
      } catch {
        return ''
      }
    }
    return ''
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Tabs - Products and Events only */}
      <div className="flex border-b px-2 pt-2 gap-1">
        <Button
          variant={activeTab === 'products' ? 'secondary' : 'ghost'}
          size="sm"
          className="text-xs h-7 gap-1"
          onClick={() => setActiveTab('products')}
        >
          <ShoppingBag className="h-3 w-3" />
          Products
        </Button>
        <Button
          variant={activeTab === 'events' ? 'secondary' : 'ghost'}
          size="sm"
          className="text-xs h-7 gap-1"
          onClick={() => setActiveTab('events')}
        >
          <Target className="h-3 w-3" />
          Events
        </Button>
      </div>
      
      {/* Search */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={`Search ${activeTab}...`}
            className="h-7 pl-7 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      
      {/* Items List */}
      <div className="flex-1 overflow-auto p-2 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            {offerings.length === 0 
              ? `No ${activeTab} in Commerce module`
              : `No ${activeTab} match your search`}
          </div>
        ) : (
          filteredItems.map((item) => {
            const cardComponentType = item.offering_type === 'product' ? 'ProductCard' : 'EventCard'
            const cardComponent = COMMERCE_COMPONENTS.find(c => c.type === cardComponentType)
            
            return (
              <DraggableItem
                key={item.id}
                component={cardComponent}
                extraProps={{ offering_id: item.id }}
                onDoubleClick={() => handleInsertCard(item)}
                className="p-2 rounded-lg border hover:border-primary/50"
              >
                <div className="flex items-start gap-2">
                  {/* Thumbnail or Icon */}
                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                    ) : item.offering_type === 'product' ? (
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Target className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatPrice(item)}
                      {item.offering_type === 'event' && formatEventDate(item) && ` • ${formatEventDate(item)}`}
                      {item.capacity && ` • ${item.capacity} spots`}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-6 flex-1"
                    onClick={(e) => { e.stopPropagation(); handleInsertCard(item) }}
                  >
                    Card
                  </Button>
                  {item.offering_type === 'product' ? (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs h-6 flex-1"
                        onClick={(e) => { e.stopPropagation(); handleInsertAddToCart(item) }}
                      >
                        Cart
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs h-6 flex-1"
                        onClick={(e) => { e.stopPropagation(); handleInsertButton(item) }}
                      >
                        Buy
                      </Button>
                    </>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs h-6 flex-1"
                      onClick={(e) => { e.stopPropagation(); handleInsertButton(item) }}
                    >
                      RSVP
                    </Button>
                  )}
                </div>
              </DraggableItem>
            )
          })
        )}
      </div>
      
      {/* Quick Components */}
      <div className="p-2 border-t">
        <div className="text-xs font-medium text-muted-foreground mb-2">Quick Components</div>
        <div className="grid grid-cols-2 gap-1">
          {COMMERCE_COMPONENTS.slice(0, 4).map((comp) => {
            const Icon = comp.icon
            return (
              <DraggableItem
                key={comp.type}
                component={comp}
                onDoubleClick={() => {
                  const newNode = createNodeFromComponent(comp)
                  addNode(newNode)
                }}
                className="flex items-center gap-1 text-xs h-7 px-2 rounded hover:bg-muted/50"
              >
                <Icon className="h-3 w-3" />
                {comp.name}
              </DraggableItem>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function FormsPanel() {
  const { addNode } = useStudioStore()
  const { currentProject } = useAuthStore()
  const navigate = useNavigate()
  const [forms, setForms] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  
  const projectId = currentProject?.id
  
  // Fetch forms from Forms API
  useEffect(() => {
    const loadForms = async () => {
      if (!projectId) return
      setIsLoading(true)
      try {
        const response = await formsApi.list({ project_id: projectId })
        // Handle nested response structure (axios wraps in data, API may also wrap)
        const formsData = response.data?.data || response.data || []
        setForms(Array.isArray(formsData) ? formsData : [])
      } catch (err) {
        console.error('Failed to load forms:', err)
        setForms([])
      } finally {
        setIsLoading(false)
      }
    }
    loadForms()
  }, [projectId])
  
  const filteredForms = (forms || []).filter(form =>
    form.name?.toLowerCase().includes(search.toLowerCase())
  )
  
  const handleInsertForm = (form) => {
    const newNode = createNodeFromComponent(FORM_COMPONENT, { form_id: form.id })
    newNode.name = form.name
    addNode(newNode)
  }
  
  const handleCreateNewForm = () => {
    navigate('/forms/new')
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search forms..."
            className="h-7 pl-7 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      
      {/* Forms List */}
      <div className="flex-1 overflow-auto p-2 space-y-2">
        {isLoading ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            Loading forms...
          </div>
        ) : filteredForms.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            {forms.length === 0 ? 'No forms created yet' : 'No forms found'}
          </div>
        ) : (
          filteredForms.map((form) => (
            <DraggableItem
              key={form.id}
              component={FORM_COMPONENT}
              extraProps={{ form_id: form.id }}
              onDoubleClick={() => handleInsertForm(form)}
              className="p-3 rounded-lg border hover:border-primary/50 cursor-grab active:cursor-grabbing"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{form.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {form.fields?.length || 0} fields • {form.submission_count || 0} submissions
                  </div>
                </div>
              </div>
            </DraggableItem>
          ))
        )}
      </div>
      
      {/* Create New */}
      <div className="p-2 border-t">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full gap-2"
          onClick={handleCreateNewForm}
        >
          <Plus className="h-4 w-4" />
          Create New Form
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// ECHO AI PANEL (Chunk 7)
// ============================================================================

const ECHO_QUICK_ACTIONS = [
  { id: 'add-product', label: '+ Add product', prompt: 'Add a product card to this design' },
  { id: 'add-form', label: '+ Add form', prompt: 'Add a form to this design' },
  { id: 'responsive', label: 'Make responsive', prompt: 'Make this design mobile-responsive' },
  { id: 'animation', label: 'Add animation', prompt: 'Add subtle animations to make this design more engaging' },
]

function EchoPanel() {
  const { design, selectedNodeId, updateNode, addNode } = useStudioStore()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  const [pendingChanges, setPendingChanges] = useState(null)
  const messagesEndRef = useRef(null)
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  // Get context for Echo
  const getDesignContext = useCallback(() => {
    const selectedNode = design?.children?.find(n => n.id === selectedNodeId)
    return {
      type: 'engage_studio',
      design_json: design,
      selected_component: selectedNode || null,
      selected_node_id: selectedNodeId,
    }
  }, [design, selectedNodeId])
  
  // Send message to Echo
  const handleSend = async (customPrompt) => {
    const messageText = customPrompt || input.trim()
    if (!messageText || isStreaming) return
    
    // Add user message
    const userMessage = { role: 'user', content: messageText }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsStreaming(true)
    
    // Add streaming placeholder
    const streamingId = Date.now()
    setMessages(prev => [...prev, { role: 'assistant', content: '', id: streamingId, streaming: true }])
    
    try {
      await echoApi.streamChat(
        {
          message: messageText,
          conversationId,
          skill: 'engage', // Use the engage skill for design-related requests
          pageContext: getDesignContext(),
        },
        {
          onToken: (token) => {
            setMessages(prev => prev.map(m => 
              m.id === streamingId 
                ? { ...m, content: m.content + token }
                : m
            ))
          },
          onComplete: ({ response, conversationId: newConvId }) => {
            setConversationId(newConvId)
            setMessages(prev => prev.map(m => 
              m.id === streamingId 
                ? { ...m, streaming: false }
                : m
            ))
            setIsStreaming(false)
            
            // Check if response contains design changes
            // Look for JSON in the response that could be applied
            try {
              const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/)
              if (jsonMatch) {
                const proposedChanges = JSON.parse(jsonMatch[1])
                if (proposedChanges.type || proposedChanges.children || proposedChanges.style) {
                  setPendingChanges(proposedChanges)
                }
              }
            } catch (e) {
              // No parseable changes, that's fine
            }
          },
          onError: (error) => {
            setMessages(prev => prev.map(m => 
              m.id === streamingId 
                ? { ...m, content: `Error: ${error}`, streaming: false, error: true }
                : m
            ))
            setIsStreaming(false)
          },
          onToolCall: (toolCall) => {
            // Handle tool calls from Echo (e.g., update_component)
            console.log('[Echo] Tool call:', toolCall)
            if (toolCall.name === 'update_component' && toolCall.params?.design_json) {
              setPendingChanges(toolCall.params.design_json)
            }
          }
        }
      )
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== streamingId))
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Failed to connect to Signal: ${error.message}`,
        error: true 
      }])
      setIsStreaming(false)
    }
  }
  
  // Apply pending changes to design
  const handleApplyChanges = () => {
    if (!pendingChanges) return
    
    if (selectedNodeId && pendingChanges.style) {
      // Update existing node's style
      Object.entries(pendingChanges.style).forEach(([key, value]) => {
        updateNode(selectedNodeId, (node) => {
          node.style = { ...node.style, [key]: value }
        })
      })
    } else if (pendingChanges.type) {
      // Add as new node
      addNode(pendingChanges)
    }
    
    setPendingChanges(null)
    setMessages(prev => [...prev, { 
      role: 'system', 
      content: '✓ Changes applied to design' 
    }])
  }
  
  // Clear pending changes
  const handleDismissChanges = () => {
    setPendingChanges(null)
  }
  
  // Start new conversation
  const handleNewChat = () => {
    setMessages([])
    setConversationId(null)
    setPendingChanges(null)
  }
  
  // Rate a response
  const handleRate = async (messageIndex, rating) => {
    setMessages(prev => prev.map((m, i) => 
      i === messageIndex ? { ...m, rating } : m
    ))
    // Could send to echoApi.rateResponse here
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-2 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
          <span className="text-sm font-medium">Signal Echo</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6"
          onClick={handleNewChat}
          title="New conversation"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            <div 
              className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
            >
              <Sparkles className="h-6 w-6" style={{ color: 'var(--brand-primary)' }} />
            </div>
            <div>
              <div className="text-sm font-medium">How can I help?</div>
              <div className="text-xs text-muted-foreground mt-1">
                I can create components, modify styling, add products, forms, and more.
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={cn(
                "flex gap-2",
                msg.role === 'user' && "justify-end"
              )}
            >
              {msg.role === 'assistant' && (
                <div 
                  className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
                >
                  <Bot className="h-3.5 w-3.5" style={{ color: 'var(--brand-primary)' }} />
                </div>
              )}
              <div 
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                  msg.role === 'user' && "bg-primary text-primary-foreground",
                  msg.role === 'assistant' && "bg-muted",
                  msg.role === 'system' && "bg-green-50 text-green-700 text-xs",
                  msg.error && "bg-red-50 text-red-700"
                )}
              >
                <div className="whitespace-pre-wrap break-words">
                  {msg.content}
                  {msg.streaming && (
                    <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse" />
                  )}
                </div>
                
                {/* Rating buttons for assistant messages */}
                {msg.role === 'assistant' && !msg.streaming && !msg.error && (
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("h-5 w-5", msg.rating === 'up' && "text-green-600")}
                      onClick={() => handleRate(idx, 'up')}
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("h-5 w-5", msg.rating === 'down' && "text-red-600")}
                      onClick={() => handleRate(idx, 'down')}
                    >
                      <ThumbsDown className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Pending Changes Actions */}
      {pendingChanges && (
        <div className="p-2 border-t bg-amber-50 border-amber-200">
          <div className="text-xs text-amber-700 mb-2 font-medium">
            Echo suggested design changes
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              className="flex-1 gap-1 h-7"
              onClick={handleApplyChanges}
            >
              <Check className="h-3.5 w-3.5" />
              Apply
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="gap-1 h-7"
              onClick={handleDismissChanges}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
      
      {/* Quick Actions */}
      {messages.length === 0 && (
        <div className="p-2 border-t">
          <div className="text-xs text-muted-foreground mb-2">Quick actions</div>
          <div className="flex flex-wrap gap-1.5">
            {ECHO_QUICK_ACTIONS.map((action) => (
              <Button
                key={action.id}
                variant="outline"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => handleSend(action.prompt)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}
      
      {/* Input */}
      <div className="p-2 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Ask Echo to help with your design..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            className="h-8 text-sm"
            disabled={isStreaming}
          />
          <Button 
            size="icon" 
            className="h-8 w-8 flex-shrink-0"
            onClick={() => handleSend()}
            disabled={!input.trim() || isStreaming}
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Context indicator */}
        {selectedNodeId && (
          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
            <Target className="h-3 w-3" />
            <span>Focused on selected component</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// BOOKING PANEL (Sync Integration)
// ============================================================================

// Booking button component definition
const BOOKING_COMPONENTS = [
  { type: 'BookingButton', name: 'Book Now Button', icon: Calendar, desc: 'Opens booking flow for selected type' },
  { type: 'BookingCard', name: 'Booking Card', icon: Calendar, desc: 'Booking type with description and button' },
]

function BookingPanel() {
  const { addNode } = useStudioStore()
  const [bookingTypes, setBookingTypes] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  
  // Fetch booking types from Sync API
  useEffect(() => {
    const loadBookingTypes = async () => {
      setIsLoading(true)
      try {
        const response = await syncApi.getBookingTypes()
        if (response.data) {
          setBookingTypes(response.data)
        }
      } catch (err) {
        console.error('Failed to load booking types:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadBookingTypes()
  }, [])
  
  const filteredTypes = bookingTypes.filter(bt =>
    bt.name?.toLowerCase().includes(search.toLowerCase()) ||
    bt.description?.toLowerCase().includes(search.toLowerCase())
  )
  
  // Insert a booking button with selected type
  const handleInsertButton = (bookingType) => {
    const component = BOOKING_COMPONENTS.find(c => c.type === 'BookingButton')
    const newNode = createNodeFromComponent(component, { 
      booking_type_id: bookingType.id,
      booking_type_slug: bookingType.slug,
      text: `Schedule ${bookingType.name}`,
    })
    newNode.name = `Book: ${bookingType.name}`
    addNode(newNode)
  }
  
  // Insert a full booking card
  const handleInsertCard = (bookingType) => {
    const component = BOOKING_COMPONENTS.find(c => c.type === 'BookingCard')
    const newNode = createNodeFromComponent(component, {
      booking_type_id: bookingType.id,
      booking_type_slug: bookingType.slug,
      title: bookingType.name,
      description: bookingType.description || '',
      duration: bookingType.duration,
    })
    newNode.name = `Booking: ${bookingType.name}`
    addNode(newNode)
  }
  
  // Format duration
  const formatDuration = (minutes) => {
    if (!minutes) return ''
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins ? `${hours}h ${mins}m` : `${hours}h`
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search booking types..."
            className="h-7 pl-7 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      
      {/* Booking Types List */}
      <div className="flex-1 overflow-auto p-2 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTypes.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            {bookingTypes.length === 0 
              ? 'No booking types configured in Sync'
              : 'No booking types match your search'}
          </div>
        ) : (
          filteredTypes.map((bt) => {
            const buttonComponent = BOOKING_COMPONENTS.find(c => c.type === 'BookingButton')
            
            return (
              <DraggableItem
                key={bt.id}
                component={buttonComponent}
                extraProps={{ 
                  booking_type_id: bt.id, 
                  booking_type_slug: bt.slug,
                  text: `Schedule ${bt.name}`
                }}
                onDoubleClick={() => handleInsertButton(bt)}
                className="p-2 rounded-lg border hover:border-primary/50"
              >
                <div className="flex items-start gap-2">
                  <div 
                    className="h-10 w-10 rounded flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: bt.color ? `${bt.color}20` : 'var(--muted)' }}
                  >
                    <Calendar 
                      className="h-4 w-4" 
                      style={{ color: bt.color || 'var(--muted-foreground)' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{bt.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDuration(bt.duration)}
                      {bt.price > 0 && ` • $${Number(bt.price).toFixed(2)}`}
                    </div>
                    {bt.description && (
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {bt.description}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-6 flex-1"
                    onClick={(e) => { e.stopPropagation(); handleInsertButton(bt) }}
                  >
                    Button
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-6 flex-1"
                    onClick={(e) => { e.stopPropagation(); handleInsertCard(bt) }}
                  >
                    Card
                  </Button>
                </div>
              </DraggableItem>
            )
          })
        )}
      </div>
      
      {/* Quick Components */}
      <div className="p-2 border-t bg-muted/30">
        <div className="text-xs font-medium text-muted-foreground mb-2">Booking Components</div>
        <div className="grid grid-cols-2 gap-1">
          {BOOKING_COMPONENTS.map((comp) => {
            const Icon = comp.icon
            return (
              <DraggableItem
                key={comp.type}
                component={comp}
                onDoubleClick={() => {
                  const newNode = createNodeFromComponent(comp)
                  addNode(newNode)
                }}
                className="flex items-center gap-1 text-xs h-7 px-2 rounded hover:bg-muted/50"
              >
                <Icon className="h-3 w-3" />
                {comp.name}
              </DraggableItem>
            )
          })}
        </div>
      </div>
      
      {/* Info */}
      <div className="p-2 border-t">
        <p className="text-[10px] text-muted-foreground text-center">
          Configure booking types in Sync module
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// ELEMENT SWITCHER DROPDOWN
// ============================================================================

function ElementSwitcher({ 
  elements, 
  currentElement, 
  onSelect, 
  onCreateNew,
  isLoading 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef(null)
  
  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Group elements by type
  const grouped = elements.reduce((acc, el) => {
    const type = el.element_type || 'popup'
    if (!acc[type]) acc[type] = []
    acc[type].push(el)
    return acc
  }, {})
  
  // Filter by search
  const filteredGroups = Object.entries(grouped).reduce((acc, [type, items]) => {
    const filtered = items.filter(el => 
      el.name?.toLowerCase().includes(search.toLowerCase())
    )
    if (filtered.length > 0) acc[type] = filtered
    return acc
  }, {})
  
  const TypeIcon = currentElement ? ELEMENT_TYPES[currentElement.element_type]?.icon || Target : Target
  
  return (
    <div className="relative" ref={dropdownRef}>
      <Button 
        variant="ghost" 
        size="sm" 
        className="gap-2 max-w-[200px]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <TypeIcon className={cn('h-4 w-4', ELEMENT_TYPES[currentElement?.element_type]?.color)} />
        <span className="font-medium truncate">
          {currentElement?.name || 'Select Element'}
        </span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
      </Button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-popover border rounded-lg shadow-lg z-50 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search elements..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8"
                autoFocus
              />
            </div>
          </div>
          
          {/* Elements List */}
          <div className="max-h-80 overflow-y-auto p-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : Object.keys(filteredGroups).length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No elements found
              </div>
            ) : (
              Object.entries(filteredGroups).map(([type, items]) => {
                const config = ELEMENT_TYPES[type] || ELEMENT_TYPES.popup
                const Icon = config.icon
                
                return (
                  <div key={type} className="mb-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase px-2 py-1">
                      {config.label}s
                    </div>
                    {items.map((el) => (
                      <button
                        key={el.id}
                        className={cn(
                          'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors',
                          currentElement?.id === el.id && 'bg-accent'
                        )}
                        onClick={() => {
                          onSelect(el)
                          setIsOpen(false)
                          setSearch('')
                        }}
                      >
                        <Icon className={cn('h-4 w-4 flex-shrink-0', config.color)} />
                        <span className="truncate flex-1 text-left">{el.name}</span>
                        <span className={cn(
                          'text-xs px-1.5 py-0.5 rounded',
                          el.status === 'live' && 'bg-green-100 text-green-700',
                          el.status === 'draft' && 'bg-gray-100 text-gray-600',
                          el.status === 'paused' && 'bg-yellow-100 text-yellow-700'
                        )}>
                          {el.status === 'live' && '● Live'}
                          {el.status === 'draft' && 'Draft'}
                          {el.status === 'paused' && 'Paused'}
                        </span>
                        {currentElement?.id === el.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                )
              })
            )}
          </div>
          
          {/* Create New */}
          <div className="border-t p-2 grid grid-cols-2 gap-1">
            {Object.entries(ELEMENT_TYPES).slice(0, 4).map(([type, config]) => {
              const Icon = config.icon
              return (
                <Button
                  key={type}
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-2 h-8"
                  onClick={() => {
                    onCreateNew(type)
                    setIsOpen(false)
                  }}
                >
                  <Plus className="h-3 w-3" />
                  <span className="text-xs">New {config.label}</span>
                </Button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// NEW ELEMENT MODAL
// ============================================================================

function NewElementModal({ isOpen, onClose, onSubmit, defaultType = 'popup' }) {
  const [name, setName] = useState('')
  const [type, setType] = useState(defaultType)
  const [startFrom, setStartFrom] = useState('blank')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  useEffect(() => {
    if (isOpen) {
      setName('')
      setType(defaultType)
      setStartFrom('blank')
    }
  }, [isOpen, defaultType])
  
  const handleSubmit = async () => {
    if (!name.trim()) return
    setIsSubmitting(true)
    try {
      await onSubmit({ name: name.trim(), type, startFrom })
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Element</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Element Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Element Type</label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(ELEMENT_TYPES).map(([key, config]) => {
                const Icon = config.icon
                return (
                  <Button
                    key={key}
                    variant={type === key ? 'default' : 'outline'}
                    size="sm"
                    className="gap-2"
                    onClick={() => setType(key)}
                  >
                    <Icon className="h-4 w-4" />
                    {config.label}
                  </Button>
                )
              })}
            </div>
          </div>
          
          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              placeholder={`My ${ELEMENT_TYPES[type]?.label || 'Element'}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              autoFocus
            />
          </div>
          
          {/* Start From */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Start from</label>
            <div className="space-y-2">
              {[
                { id: 'blank', label: 'Blank canvas', desc: 'Start with an empty design' },
                { id: 'echo', label: 'Ask Echo', desc: 'Describe what you want' },
              ].map((option) => (
                <button
                  key={option.id}
                  className={cn(
                    'w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors',
                    startFrom === option.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  )}
                  onClick={() => setStartFrom(option.id)}
                >
                  <div className={cn(
                    'w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0',
                    startFrom === option.id ? 'border-primary bg-primary' : 'border-muted-foreground'
                  )}>
                    {startFrom === option.id && (
                      <Check className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-muted-foreground">{option.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create & Open
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// RESIZE HANDLE COMPONENT
// ============================================================================

function ResizeHandle({ position, onResize }) {
  const [isDragging, setIsDragging] = useState(false)
  
  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
    
    const startX = e.clientX
    
    const handleMouseMove = (moveEvent) => {
      const delta = position === 'left' 
        ? moveEvent.clientX - startX 
        : startX - moveEvent.clientX
      onResize(delta)
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [position, onResize])
  
  return (
    <div
      className={cn(
        'w-1 cursor-col-resize hover:bg-primary/20 transition-colors relative group',
        isDragging && 'bg-primary/30'
      )}
      onMouseDown={handleMouseDown}
    >
      <div className={cn(
        'absolute inset-y-0 w-4 -translate-x-1/2',
        position === 'left' ? 'left-0' : 'right-0'
      )} />
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT: EngageStudio
// ============================================================================

export default function EngageStudio() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { currentProject } = useAuthStore()
  
  // Get element type from query string for new elements
  const initialType = searchParams.get('type') || 'popup'
  
  // Local state for new element modal
  const [showNewModal, setShowNewModal] = useState(false)
  const [newElementType, setNewElementType] = useState(initialType)
  
  // Store state
  const {
    element,
    elements,
    elementsLoading,
    isDirty,
    isSaving,
    leftPanelWidth,
    rightPanelWidth,
    leftPanelCollapsed,
    rightPanelCollapsed,
    leftPanelTab,
    rightPanelTab,
    device,
    zoom,
    showSitePreview,
    siteScreenshotUrl,
    siteScreenshotLoading,
    setElement,
    setElements,
    setElementsLoading,
    setLeftPanelWidth,
    setRightPanelWidth,
    toggleLeftPanel,
    toggleRightPanel,
    setLeftPanelTab,
    setDevice,
    setZoom,
    setIsDirty,
    setIsSaving,
    setShowSitePreview,
    setSiteScreenshotUrl,
    setSiteScreenshotLoading,
    undo,
    redo,
  } = useStudioStore()
  
  // Load all elements for the switcher
  useEffect(() => {
    const loadElements = async () => {
      if (!currentProject?.id) return
      setElementsLoading(true)
      try {
        const data = await engageApi.getElements(currentProject.id)
        setElements(data || [])
      } catch (err) {
        console.error('Failed to load elements:', err)
      } finally {
        setElementsLoading(false)
      }
    }
    loadElements()
  }, [currentProject?.id])
  
  // Load specific element when ID changes
  useEffect(() => {
    const loadElement = async () => {
      if (!id || id === 'new') {
        // Create empty element for new mode - use type from query params
        setElement({
          id: 'new',
          name: 'New Element',
          element_type: initialType,
          status: 'draft',
        })
        return
      }
      try {
        const data = await engageApi.getElement(id)
        if (data) {
          setElement(data)
        } else {
          // Element not found - stay in studio with empty state for testing
          console.warn('Element not found:', id)
          setElement({
            id,
            name: `Element ${id}`,
            element_type: 'popup',
            status: 'draft',
          })
        }
      } catch (err) {
        console.error('Failed to load element:', err)
        // For dev: stay in studio with mock element instead of redirecting
        setElement({
          id,
          name: `Element ${id}`,
          element_type: 'popup',
          status: 'draft',
        })
      }
    }
    loadElement()
  }, [id])
  
  // ====================================================================
  // SITE PREVIEW SCREENSHOT FETCHING
  // ====================================================================
  
  // Get setSiteScreenshots from store
  const setSiteScreenshots = useStudioStore((s) => s.setSiteScreenshots)
  const siteScreenshots = useStudioStore((s) => s.siteScreenshots)
  
  // Fetch screenshots from API
  const fetchSiteScreenshot = useCallback(async (forceRefresh = false) => {
    if (!currentProject?.id) return
    
    setSiteScreenshotLoading(true)
    try {
      // Use screenshotsApi which includes auth token automatically
      const response = await screenshotsApi.getResponsive(currentProject.id, forceRefresh)
      const data = response.data
      // API returns { success: true, projectId: ..., screenshots: { desktop, tablet, mobile, captured_at } }
      if (data.success && data.screenshots) {
        setSiteScreenshots(data.screenshots)
        setShowSitePreview(true)
      }
    } catch (err) {
      console.error('Failed to fetch site screenshot:', err)
    } finally {
      setSiteScreenshotLoading(false)
    }
  }, [currentProject?.id, setSiteScreenshotLoading, setSiteScreenshots, setShowSitePreview])
  
  // On mount, fetch screenshots from API if we don't have them yet
  useEffect(() => {
    if (!siteScreenshots && currentProject?.id) {
      fetchSiteScreenshot()
    }
  }, [currentProject?.id, siteScreenshots, fetchSiteScreenshot])
  
  // Fetch screenshot when site preview is toggled on and no URL cached
  useEffect(() => {
    if (showSitePreview && !siteScreenshotUrl) {
      fetchSiteScreenshot()
    }
  }, [showSitePreview, siteScreenshotUrl, fetchSiteScreenshot])
  
  // Handler for toggling site preview
  const handleToggleSitePreview = useCallback(() => {
    setShowSitePreview(!showSitePreview)
  }, [showSitePreview, setShowSitePreview])
  
  // Handler for refreshing site screenshot (forces new capture of all viewports)
  const handleRefreshScreenshot = useCallback(async () => {
    await fetchSiteScreenshot(true) // force refresh
  }, [fetchSiteScreenshot])
  
  // ====================================================================
  // KEYBOARD SHORTCUTS (Chunk 8)
  // ====================================================================
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMeta = e.metaKey || e.ctrlKey
      
      // Cmd+S - Save
      if (isMeta && e.key === 's') {
        e.preventDefault()
        if (isDirty && !isSaving) {
          handleSave()
        }
      }
      
      // Cmd+Z - Undo
      if (isMeta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      
      // Cmd+Shift+Z or Cmd+Y - Redo
      if ((isMeta && e.key === 'z' && e.shiftKey) || (isMeta && e.key === 'y')) {
        e.preventDefault()
        redo()
      }
      
      // Cmd+N - New Element
      if (isMeta && e.key === 'n') {
        e.preventDefault()
        handleOpenNewModal()
      }
      
      // Escape - Deselect or close panel
      if (e.key === 'Escape') {
        const { selectedNodeId, setSelectedNodeId } = useStudioStore.getState()
        if (selectedNodeId) {
          setSelectedNodeId(null)
        }
      }
      
      // Delete/Backspace - Delete selected node
      if ((e.key === 'Delete' || e.key === 'Backspace') && !e.target.matches('input, textarea, [contenteditable]')) {
        const { selectedNodeId, deleteNode } = useStudioStore.getState()
        if (selectedNodeId) {
          e.preventDefault()
          deleteNode(selectedNodeId)
        }
      }
      
      // Cmd+D - Duplicate selected
      if (isMeta && e.key === 'd') {
        const { selectedNodeId, duplicateNode } = useStudioStore.getState()
        if (selectedNodeId) {
          e.preventDefault()
          duplicateNode(selectedNodeId)
        }
      }
      
      // Cmd+[ - Decrease zoom
      if (isMeta && e.key === '[') {
        e.preventDefault()
        setZoom(Math.max(25, zoom - 25))
      }
      
      // Cmd+] - Increase zoom
      if (isMeta && e.key === ']') {
        e.preventDefault()
        setZoom(Math.min(200, zoom + 25))
      }
      
      // Cmd+0 - Reset zoom
      if (isMeta && e.key === '0') {
        e.preventDefault()
        setZoom(100)
      }
      
      // 1 - Desktop view
      if (e.key === '1' && !e.target.matches('input, textarea, [contenteditable]')) {
        setDevice('desktop')
      }
      
      // 2 - Tablet view
      if (e.key === '2' && !e.target.matches('input, textarea, [contenteditable]')) {
        setDevice('tablet')
      }
      
      // 3 - Mobile view
      if (e.key === '3' && !e.target.matches('input, textarea, [contenteditable]')) {
        setDevice('mobile')
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDirty, isSaving, zoom, undo, redo, setZoom, setDevice])
  
  // ====================================================================
  // AUTO-SAVE (Chunk 8) - Save after 30s of idle
  // ====================================================================
  const autoSaveTimerRef = useRef(null)
  const lastActivityRef = useRef(Date.now())
  
  useEffect(() => {
    // Reset activity timer on any store change
    lastActivityRef.current = Date.now()
    
    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    
    // Only set auto-save timer if there are unsaved changes
    if (isDirty && element?.id && element.id !== 'new') {
      autoSaveTimerRef.current = setTimeout(async () => {
        // Check if still dirty after timeout
        const state = useStudioStore.getState()
        if (state.isDirty && !state.isSaving) {
          console.log('[AutoSave] Saving after 30s idle...')
          try {
            setIsSaving(true)
            await engageApi.updateElement(element.id, {
              design_json: state.design,
            })
            setIsDirty(false)
            console.log('[AutoSave] Saved successfully')
          } catch (err) {
            console.error('[AutoSave] Failed:', err)
          } finally {
            setIsSaving(false)
          }
        }
      }, 30000) // 30 seconds
    }
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [isDirty, element?.id, setIsDirty, setIsSaving])
  
  // ====================================================================
  // BROWSER UNLOAD WARNING (Chunk 8)
  // ====================================================================
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
        return e.returnValue
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])
  
  // Handle element selection from switcher
  const handleSelectElement = async (el) => {
    if (isDirty) {
      // TODO: Show unsaved changes warning
      const confirmSwitch = window.confirm('You have unsaved changes. Switch anyway?')
      if (!confirmSwitch) return
    }
    navigate(`/engage/studio/${el.id}`)
  }
  
  // Handle create new element
  const handleCreateNew = async ({ name, type, startFrom }) => {
    if (!currentProject?.id) return
    
    try {
      const newElement = await engageApi.createElement({
        project_id: currentProject.id,
        name,
        element_type: type,
        status: 'draft',
        design_json: createDefaultDesign(type),
      })
      
      // Add to elements list
      setElements([newElement, ...elements])
      
      // Navigate to new element
      navigate(`/engage/studio/${newElement.id}`)
      
      // If starting from Echo, open Echo panel
      if (startFrom === 'echo') {
        useStudioStore.getState().setLeftPanelTab('echo')
      }
    } catch (err) {
      console.error('Failed to create element:', err)
    }
  }
  
  // Handle opening new element modal
  const handleOpenNewModal = (type = 'popup') => {
    setNewElementType(type)
    setShowNewModal(true)
  }
  
  // Handle close
  const handleClose = () => {
    if (isDirty) {
      const confirmClose = window.confirm('You have unsaved changes. Close anyway?')
      if (!confirmClose) return
    }
    navigate('/engage')
  }
  
  // Handle save
  const handleSave = async () => {
    if (!element?.id) return
    setIsSaving(true)
    try {
      await engageApi.updateElement(element.id, {
        design_json: useStudioStore.getState().design,
      })
      setIsDirty(false)
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setIsSaving(false)
    }
  }
  
  // Left panel tabs config
  const leftTabs = [
    { id: 'layers', icon: Layers, label: 'Layers' },
    { id: 'components', icon: Component, label: 'Components' },
    { id: 'assets', icon: Image, label: 'Assets' },
    { id: 'commerce', icon: ShoppingBag, label: 'Commerce' },
    { id: 'booking', icon: Calendar, label: 'Booking' },
    { id: 'forms', icon: FileText, label: 'Forms' },
    { id: 'echo', icon: Sparkles, label: 'Echo AI' },
  ]
  
  // Right panel tabs config
  const rightTabs = [
    { id: 'design', label: 'Design' },
    { id: 'layout', label: 'Layout' },
    { id: 'interactions', label: 'Interactions' },
    { id: 'data', label: 'Data' },
  ]
  
  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* ================================================================== */}
      {/* HEADER BAR */}
      {/* ================================================================== */}
      <header className="h-12 border-b flex items-center justify-between px-2 bg-muted/30 flex-shrink-0">
        {/* Left: Element Switcher + New Button */}
        <div className="flex items-center gap-2">
          <ElementSwitcher
            elements={elements}
            currentElement={element}
            onSelect={handleSelectElement}
            onCreateNew={handleOpenNewModal}
            isLoading={elementsLoading}
          />
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1.5"
            onClick={() => handleOpenNewModal()}
          >
            <Plus className="h-4 w-4" />
            New
          </Button>
          {isDirty && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Unsaved
            </span>
          )}
        </div>
        
        {/* Center: Device Preview + Zoom */}
        <div className="flex items-center gap-1">
          <div className="flex items-center border rounded-lg p-0.5 bg-background">
            <Button 
              variant={device === 'desktop' ? 'secondary' : 'ghost'} 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setDevice('desktop')}
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button 
              variant={device === 'tablet' ? 'secondary' : 'ghost'} 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setDevice('tablet')}
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button 
              variant={device === 'mobile' ? 'secondary' : 'ghost'} 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setDevice('mobile')}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="w-px h-6 bg-border mx-2" />
          
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setZoom(zoom - 25)}
              disabled={zoom <= 25}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm w-12 text-center">{zoom}%</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setZoom(zoom + 25)}
              disabled={zoom >= 200}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="w-px h-6 bg-border mx-2" />
          
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={undo}>
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Undo (⌘Z)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={redo}>
                    <Redo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Redo (⌘⇧Z)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className="w-px h-6 bg-border mx-2" />
          
          {/* Site Preview Toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={showSitePreview ? "secondary" : "ghost"} 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={handleToggleSitePreview}
                >
                  {showSitePreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showSitePreview ? 'Hide Site Preview' : 'Show Site Preview'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Refresh Screenshot */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={handleRefreshScreenshot}
                  disabled={siteScreenshotLoading}
                >
                  <RefreshCw className={cn("h-4 w-4", siteScreenshotLoading && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh Site Screenshot</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Keyboard Shortcuts Help */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Keyboard className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="w-64 p-0">
                <div className="p-3 space-y-2">
                  <div className="font-medium text-xs mb-2">Keyboard Shortcuts</div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <span className="text-muted-foreground">Save</span>
                    <span className="text-right font-mono">⌘S</span>
                    <span className="text-muted-foreground">Undo</span>
                    <span className="text-right font-mono">⌘Z</span>
                    <span className="text-muted-foreground">Redo</span>
                    <span className="text-right font-mono">⌘⇧Z</span>
                    <span className="text-muted-foreground">New Element</span>
                    <span className="text-right font-mono">⌘N</span>
                    <span className="text-muted-foreground">Duplicate</span>
                    <span className="text-right font-mono">⌘D</span>
                    <span className="text-muted-foreground">Delete</span>
                    <span className="text-right font-mono">⌫</span>
                    <span className="text-muted-foreground">Deselect</span>
                    <span className="text-right font-mono">Esc</span>
                    <span className="text-muted-foreground">Zoom In</span>
                    <span className="text-right font-mono">⌘]</span>
                    <span className="text-muted-foreground">Zoom Out</span>
                    <span className="text-right font-mono">⌘[</span>
                    <span className="text-muted-foreground">Reset Zoom</span>
                    <span className="text-right font-mono">⌘0</span>
                    <span className="text-muted-foreground">Desktop</span>
                    <span className="text-right font-mono">1</span>
                    <span className="text-muted-foreground">Tablet</span>
                    <span className="text-right font-mono">2</span>
                    <span className="text-muted-foreground">Mobile</span>
                    <span className="text-right font-mono">3</span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {/* Right: Preview + Save + Close */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-2">
            <Play className="h-4 w-4" />
            Preview
          </Button>
          <Button 
            size="sm" 
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save
              </>
            )}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>
      
      {/* New Element Modal */}
      <NewElementModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSubmit={handleCreateNew}
        defaultType={newElementType}
      />
      
      {/* ================================================================== */}
      {/* MAIN CONTENT: Three Columns */}
      {/* ================================================================== */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ================================================================ */}
        {/* LEFT PANEL */}
        {/* ================================================================ */}
        <div 
          className={cn(
            'flex-shrink-0 border-r bg-muted/20 flex transition-all duration-200',
            leftPanelCollapsed ? 'w-12' : ''
          )}
          style={{ width: leftPanelCollapsed ? undefined : leftPanelWidth }}
        >
          {/* Tab Icons */}
          <div className="w-12 border-r flex flex-col items-center py-2 gap-1 flex-shrink-0">
            {leftTabs.map((tab) => (
              <Button
                key={tab.id}
                variant={leftPanelTab === tab.id && !leftPanelCollapsed ? 'secondary' : 'ghost'}
                size="icon"
                className="h-9 w-9"
                onClick={() => setLeftPanelTab(tab.id)}
                title={tab.label}
              >
                <tab.icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
          
          {/* Panel Content */}
          {!leftPanelCollapsed && (
            <div className="flex-1 flex flex-col min-w-0">
              {/* Panel Header */}
              <div className="h-10 border-b flex items-center justify-between px-3 flex-shrink-0">
                <span className="font-medium text-sm">
                  {leftTabs.find(t => t.id === leftPanelTab)?.label}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={toggleLeftPanel}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Panel Body */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Layers Tab - Component Tree (Chunk 3) */}
                {leftPanelTab === 'layers' && <ComponentTree />}
                
                {/* Components Tab (Chunk 6) */}
                {leftPanelTab === 'components' && <ComponentsPanel />}
                
                {/* Assets Tab (Chunk 6) */}
                {leftPanelTab === 'assets' && <AssetsPanel />}
                
                {/* Commerce Tab (Chunk 6) */}
                {leftPanelTab === 'commerce' && <CommercePanel />}
                
                {/* Booking Tab (Sync Integration) */}
                {leftPanelTab === 'booking' && <BookingPanel />}
                
                {/* Forms Tab (Chunk 6) */}
                {leftPanelTab === 'forms' && <FormsPanel />}
                
                {/* Echo AI Tab (Chunk 7) */}
                {leftPanelTab === 'echo' && <EchoPanel />}
              </div>
            </div>
          )}
        </div>
        
        {/* Left Resize Handle */}
        {!leftPanelCollapsed && (
          <ResizeHandle 
            position="left" 
            onResize={(delta) => setLeftPanelWidth(leftPanelWidth + delta)} 
          />
        )}
        
        {/* ================================================================ */}
        {/* CENTER: CANVAS (Chunk 4) */}
        {/* ================================================================ */}
        <div className="flex-1 flex flex-col min-w-0">
          <Canvas />
        </div>
        
        {/* Right Resize Handle */}
        {!rightPanelCollapsed && (
          <ResizeHandle 
            position="right" 
            onResize={(delta) => setRightPanelWidth(rightPanelWidth + delta)} 
          />
        )}
        
        {/* ================================================================ */}
        {/* RIGHT PANEL */}
        {/* ================================================================ */}
        <div 
          className={cn(
            'flex-shrink-0 border-l bg-muted/20 flex flex-col transition-all duration-200',
            rightPanelCollapsed ? 'w-12' : ''
          )}
          style={{ width: rightPanelCollapsed ? undefined : rightPanelWidth }}
        >
          {rightPanelCollapsed ? (
            /* Collapsed State */
            <div className="flex flex-col items-center py-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9"
                onClick={toggleRightPanel}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            /* Expanded State */
            <>
              {/* Panel Header with Tabs */}
              <div className="border-b flex-shrink-0">
                <div className="flex items-center justify-between px-3 h-10">
                  <span className="text-sm font-medium truncate">
                    {useStudioStore.getState().getSelectedNode()?.name || 'No selection'}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={toggleRightPanel}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex px-2 pb-2 gap-1">
                  {rightTabs.map((tab) => (
                    <Button
                      key={tab.id}
                      variant={rightPanelTab === tab.id ? 'secondary' : 'ghost'}
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => useStudioStore.getState().setRightPanelTab(tab.id)}
                    >
                      {tab.label}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Panel Body - Properties (Chunk 5) */}
              <PropertiesPanel />
            </>
          )}
        </div>
      </div>
      
      {/* ================================================================== */}
      {/* FOOTER BAR */}
      {/* ================================================================== */}
      <footer className="h-8 border-t flex items-center justify-between px-3 bg-muted/30 flex-shrink-0 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1.5 hover:text-foreground transition-colors">
            <Code className="h-3.5 w-3.5" />
            Code View
          </button>
          <button className="flex items-center gap-1.5 hover:text-foreground transition-colors">
            <Eye className="h-3.5 w-3.5" />
            State Inspector
          </button>
        </div>
        <div className="flex items-center gap-4">
          <span>Auto-saved</span>
          <button className="flex items-center gap-1.5 hover:text-foreground transition-colors">
            <HelpCircle className="h-3.5 w-3.5" />
            Help
          </button>
        </div>
      </footer>
    </div>
  )
}
