/**
 * ModuleLayout - Standard wrapper for all module pages (except dashboards)
 *
 * Supports:
 * - One column: main content only
 * - Two column: main content + optional right sidebar (collapsible)
 * - Three column: optional left sidebar + main content + optional right sidebar (both collapsible)
 *
 * Animations (framer-motion + AnimatePresence):
 * - Sidebars: AnimatePresence with width/opacity in-out (tween 0.22s).
 * - Content: Gentle opacity fade-in on mount (0.15s).
 * - Header: Icon tile and panel toggles use whileHover/whileTap scale; panel icons rotate 180° when closed.
 * - Respects prefers-reduced-motion: sidebars/content use instant transitions; header micro-interactions disabled.
 * - Panel toggles expose aria-expanded for screen readers.
 *
 * Header always has the same design: mandatory icon with brand gradient tile,
 * title/breadcrumbs, actions, and collapsible sidebar toggle buttons.
 *
 * Header icon: Mandatory. Use the same icon as Sidebar.jsx for that module.
 * Import from @/lib/module-icons: <ModuleLayout.Header icon={MODULE_ICONS.commerce} ... />
 *
 * Exception: Signal module has its own design and does not use ModuleLayout.
 *
 * Uses design-system tokens only: var(--brand-primary), var(--brand-primary),
 * var(--glass-bg), var(--glass-border), var(--text-primary), var(--text-secondary).
 *
 * Sidebars: Left and right panel content wrappers apply base typography (MODULE_SIDEBAR_TYPOGRAPHY:
 * text-[var(--text-primary)] text-sm font-sans) so modules stay consistent. Do not set a root
 * font/size on sidebar content—only override on specific elements (e.g. text-xs for labels).
 *
 * Usage (no sidebars):
 *   <ModuleLayout>
 *     <ModuleLayout.Header title="Commerce" icon={MODULE_ICONS.commerce} actions={<Button>Create</Button>} />
 *     <ModuleLayout.Content>{children}</ModuleLayout.Content>
 *   </ModuleLayout>
 *
 * Usage (with right sidebar):
 *   <ModuleLayout rightSidebar={<DetailPanel />} defaultRightSidebarOpen={true}>
 *     <ModuleLayout.Header title="SEO" icon={MODULE_ICONS.seo} breadcrumbs={[...]} actions={...} />
 *     <ModuleLayout.Content>...</ModuleLayout.Content>
 *   </ModuleLayout>
 *
 * Controlled sidebars (e.g. tab-driven open/close):
 *   <ModuleLayout
 *     leftSidebarOpen={showLeft}
 *     rightSidebarOpen={showRight}
 *     onLeftSidebarOpenChange={setShowLeft}
 *     onRightSidebarOpenChange={setShowRight}
 *     leftSidebar={...}
 *     rightSidebar={...}
 *   >
 */

import React, { createContext, useContext, useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { PanelLeftClose, PanelRightClose, FileText, GripVertical } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { MODULE_ICONS } from '@/lib/module-icons'

const LG_BREAKPOINT = 1024

function useIsLg() {
  const [isLg, setIsLg] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(`(min-width: ${LG_BREAKPOINT}px)`).matches : true
  )
  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${LG_BREAKPOINT}px)`)
    const onChange = () => setIsLg(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return isLg
}

const ModuleLayoutContext = createContext(null)

function useModuleLayout() {
  const ctx = useContext(ModuleLayoutContext)
  return ctx
}

const RIGHT_SIDEBAR_WIDTH_DEFAULT = 360
const LEFT_SIDEBAR_WIDTH_DEFAULT = 280
const LEFT_SIDEBAR_MIN_WIDTH = 200
const LEFT_SIDEBAR_MAX_WIDTH = 450
const RIGHT_SIDEBAR_MIN_WIDTH = 280
const RIGHT_SIDEBAR_MAX_WIDTH = 600

// LocalStorage keys for persisting sidebar widths
const STORAGE_KEY_LEFT_WIDTH = 'module-layout-left-sidebar-width'
const STORAGE_KEY_RIGHT_WIDTH = 'module-layout-right-sidebar-width'

// Shared animation config – exported for modules that want to match timing
const SIDEBAR_TRANSITION = { type: 'tween', duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }
const CONTENT_FADE = { duration: 0.15, ease: 'easeOut' }
const TAP_SCALE = 0.97
const HOVER_SCALE = 1.02

/** Default font/size for module sidebar content. Use on all sidebar wrappers so left/right and desktop/sheet stay consistent. */
const MODULE_SIDEBAR_TYPOGRAPHY = 'text-[var(--text-primary)] text-sm font-sans'

/**
 * Hook for resizable sidebar functionality
 * Handles drag events, width persistence, and constraints
 */
function useResizableSidebar({
  side, // 'left' | 'right'
  defaultWidth,
  minWidth,
  maxWidth,
  storageKey,
  enabled = true,
}) {
  // Load persisted width or use default
  const [width, setWidth] = useState(() => {
    if (typeof window === 'undefined') return defaultWidth
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      const parsed = parseInt(stored, 10)
      if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
        return parsed
      }
    }
    return defaultWidth
  })

  const isDragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const handleMouseDown = useCallback((e) => {
    if (!enabled) return
    e.preventDefault()
    isDragging.current = true
    startX.current = e.clientX
    startWidth.current = width

    // Add class to body to prevent text selection during drag
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [enabled, width])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return

    const delta = side === 'left'
      ? e.clientX - startX.current
      : startX.current - e.clientX

    const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth.current + delta))
    setWidth(newWidth)
  }, [side, minWidth, maxWidth])

  const handleMouseUp = useCallback(() => {
    if (!isDragging.current) return
    isDragging.current = false

    // Reset body styles
    document.body.style.cursor = ''
    document.body.style.userSelect = ''

    // Persist to localStorage
    localStorage.setItem(storageKey, String(width))
  }, [storageKey, width])

  // Attach/detach global mouse listeners
  useEffect(() => {
    if (!enabled) return

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [enabled, handleMouseMove, handleMouseUp])

  return { width, handleMouseDown, setWidth }
}

/**
 * ResizeHandle component - the draggable edge between sidebar and content
 */
function ResizeHandle({ side, onMouseDown, className }) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${side} panel`}
      className={cn(
        'group absolute top-0 bottom-0 w-1.5 cursor-col-resize z-10 flex items-center justify-center',
        'hover:bg-[var(--brand-primary)]/20 active:bg-[var(--brand-primary)]/30 transition-colors',
        side === 'left' ? 'right-0 translate-x-1/2' : 'left-0 -translate-x-1/2',
        className
      )}
      onMouseDown={onMouseDown}
    >
      {/* Visual grip indicator on hover */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-4 w-4 text-[var(--text-secondary)]" />
      </div>
    </div>
  )
}

function ModuleLayoutRoot({
  children,
  className,
  rightSidebar,
  leftSidebar,
  defaultRightSidebarOpen = true,
  defaultLeftSidebarOpen = true,
  /** Controlled: when provided, parent controls open state */
  leftSidebarOpen,
  rightSidebarOpen,
  onLeftSidebarOpenChange,
  onRightSidebarOpenChange,
  /** Optional titles for mobile Sheet headers */
  leftSidebarTitle = 'Left panel',
  rightSidebarTitle = 'Right panel',
  /** Initial widths (px); actual widths persist in localStorage */
  leftSidebarWidth: leftSidebarWidthProp = LEFT_SIDEBAR_WIDTH_DEFAULT,
  rightSidebarWidth: rightSidebarWidthProp = RIGHT_SIDEBAR_WIDTH_DEFAULT,
  /** Optional region label for screen readers (e.g. "Projects module") */
  ariaLabel = 'Module',
  /** When true, sidebar content is unmounted when closed (saves memory; may re-fetch on reopen) */
  unmountSidebarsWhenClosed = false,
  /** Enable drag-to-resize sidebars (default: true) */
  resizableSidebars = true,
}) {
  const [rightOpenInternal, setRightOpenInternal] = useState(defaultRightSidebarOpen)
  const [leftOpenInternal, setLeftOpenInternal] = useState(defaultLeftSidebarOpen)
  const [leftSheetOpen, setLeftSheetOpen] = useState(false)
  const [rightSheetOpen, setRightSheetOpen] = useState(false)

  const leftToggleRef = useRef(null)
  const rightToggleRef = useRef(null)
  const isLg = useIsLg()

  // Resizable sidebar hooks
  const leftResize = useResizableSidebar({
    side: 'left',
    defaultWidth: leftSidebarWidthProp,
    minWidth: LEFT_SIDEBAR_MIN_WIDTH,
    maxWidth: LEFT_SIDEBAR_MAX_WIDTH,
    storageKey: STORAGE_KEY_LEFT_WIDTH,
    enabled: resizableSidebars && !!leftSidebar && isLg,
  })
  const rightResize = useResizableSidebar({
    side: 'right',
    defaultWidth: rightSidebarWidthProp,
    minWidth: RIGHT_SIDEBAR_MIN_WIDTH,
    maxWidth: RIGHT_SIDEBAR_MAX_WIDTH,
    storageKey: STORAGE_KEY_RIGHT_WIDTH,
    enabled: resizableSidebars && !!rightSidebar && isLg,
  })

  // Use resizable widths when enabled, otherwise use props
  const leftSidebarWidth = resizableSidebars ? leftResize.width : leftSidebarWidthProp
  const rightSidebarWidth = resizableSidebars ? rightResize.width : rightSidebarWidthProp

  const isLeftControlled = leftSidebarOpen !== undefined
  const isRightControlled = rightSidebarOpen !== undefined
  const leftOpen = isLeftControlled ? leftSidebarOpen : leftOpenInternal
  const rightOpen = isRightControlled ? rightSidebarOpen : rightOpenInternal

  const focusLeftToggle = () => {
    const el = leftToggleRef.current
    const btn = el?.querySelector?.('button')
    if (btn) btn.focus()
    else el?.focus?.()
  }
  const focusRightToggle = () => {
    const el = rightToggleRef.current
    const btn = el?.querySelector?.('button')
    if (btn) btn.focus()
    else el?.focus?.()
  }

  const setLeftOpen = useMemo(
    () => (value) => {
      const next = typeof value === 'function' ? value(leftOpen) : value
      if (next === false) setTimeout(focusLeftToggle, 0)
      if (isLeftControlled && onLeftSidebarOpenChange) onLeftSidebarOpenChange(next)
      else setLeftOpenInternal(next)
    },
    [isLeftControlled, leftOpen, onLeftSidebarOpenChange]
  )
  const setRightOpen = useMemo(
    () => (value) => {
      const next = typeof value === 'function' ? value(rightOpen) : value
      if (next === false) setTimeout(focusRightToggle, 0)
      if (isRightControlled && onRightSidebarOpenChange) onRightSidebarOpenChange(next)
      else setRightOpenInternal(next)
    },
    [isRightControlled, rightOpen, onRightSidebarOpenChange]
  )

  const hasRightSidebar = !!rightSidebar
  const hasLeftSidebar = !!leftSidebar
  const reducedMotion = useReducedMotion()

  const contextValue = useMemo(
    () => ({
      hasRightSidebar,
      hasLeftSidebar,
      rightSidebarOpen: rightOpen,
      leftSidebarOpen: leftOpen,
      setRightSidebarOpen: setRightOpen,
      setLeftSidebarOpen: setLeftOpen,
      toggleRightSidebar: () => setRightOpen((v) => !v),
      toggleLeftSidebar: () => setLeftOpen((v) => !v),
      reducedMotion: !!reducedMotion,
      isLg,
      leftSheetOpen,
      rightSheetOpen,
      setLeftSheetOpen,
      setRightSheetOpen,
      leftToggleRef,
      rightToggleRef,
      leftSidebarTitle,
      rightSidebarTitle,
    }),
    [
      hasRightSidebar,
      hasLeftSidebar,
      rightOpen,
      leftOpen,
      setRightOpen,
      setLeftOpen,
      reducedMotion,
      isLg,
      leftSheetOpen,
      rightSheetOpen,
      leftSidebarTitle,
      rightSidebarTitle,
    ]
  )

  let headerChild = null
  let contentChild = null
  React.Children.forEach(children, (child) => {
    if (!child || typeof child !== 'object') return
    const t = child.type
    if (t === ModuleHeader || t?.displayName === 'ModuleHeader') headerChild = child
    else if (t === ModuleContent || t?.displayName === 'ModuleContent') contentChild = child
  })

  const showLeftDesktop = hasLeftSidebar && leftOpen && isLg
  const showRightDesktop = hasRightSidebar && rightOpen && isLg
  const renderLeftContent = !unmountSidebarsWhenClosed || leftOpen
  const renderRightContent = !unmountSidebarsWhenClosed || rightOpen

  return (
    <ModuleLayoutContext.Provider value={contextValue}>
      <motion.div
        className={cn('flex flex-col h-full min-h-0 bg-[var(--glass-bg)] backdrop-blur-xl', className)}
        role="region"
        aria-label={ariaLabel}
        initial={false}
      >
        {headerChild}
        <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
          <AnimatePresence initial={false}>
            {showLeftDesktop && (
              <motion.aside
                key="module-layout-left"
                data-module-column
                initial={reducedMotion ? false : { width: 0, opacity: 0 }}
                animate={{ width: leftSidebarWidth, opacity: 1 }}
                exit={reducedMotion ? false : { width: 0, opacity: 0 }}
                transition={reducedMotion ? { duration: 0 } : SIDEBAR_TRANSITION}
                className="relative hidden lg:flex flex-col shrink-0 min-h-0 min-w-0 border-r border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl overflow-hidden"
                role="complementary"
                aria-label="Left panel"
              >
                <div className={cn('flex flex-col w-full min-w-0 min-h-0 flex-1 overflow-y-auto', MODULE_SIDEBAR_TYPOGRAPHY)}>
                  {renderLeftContent ? leftSidebar : null}
                </div>
                {/* Resize handle for left sidebar */}
                {resizableSidebars && (
                  <ResizeHandle side="left" onMouseDown={leftResize.handleMouseDown} />
                )}
              </motion.aside>
            )}
          </AnimatePresence>
          <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden" data-module-column>
            {contentChild}
          </div>
          <AnimatePresence initial={false}>
            {showRightDesktop && (
              <motion.aside
                key="module-layout-right"
                data-module-column
                initial={reducedMotion ? false : { width: 0, opacity: 0 }}
                animate={{ width: rightSidebarWidth, opacity: 1 }}
                exit={reducedMotion ? false : { width: 0, opacity: 0 }}
                transition={reducedMotion ? { duration: 0 } : SIDEBAR_TRANSITION}
                className="relative hidden lg:flex flex-col shrink-0 min-h-0 min-w-0 border-l border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl overflow-hidden"
                role="complementary"
                aria-label="Right panel"
              >
                {/* Resize handle for right sidebar */}
                {resizableSidebars && (
                  <ResizeHandle side="right" onMouseDown={rightResize.handleMouseDown} />
                )}
                <div className={cn('flex flex-col w-full min-w-0 min-h-0 flex-1 overflow-hidden', MODULE_SIDEBAR_TYPOGRAPHY)}>
                  {renderRightContent ? rightSidebar : null}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile: left panel as Sheet */}
        {hasLeftSidebar && !isLg && (
          <Sheet open={leftSheetOpen} onOpenChange={setLeftSheetOpen}>
            <SheetContent side="left" className="w-[min(85vw,320px)] sm:max-w-[min(85vw,320px)] flex flex-col p-0 gap-0">
              <SheetHeader className="border-b border-[var(--glass-border)] px-4 py-3 pr-12 shrink-0">
                <SheetTitle className="text-base">{leftSidebarTitle}</SheetTitle>
              </SheetHeader>
              <div className={cn('flex-1 overflow-auto p-4', MODULE_SIDEBAR_TYPOGRAPHY)}>{leftSidebar}</div>
            </SheetContent>
          </Sheet>
        )}

        {/* Mobile: right panel as Sheet */}
        {hasRightSidebar && !isLg && (
          <Sheet open={rightSheetOpen} onOpenChange={setRightSheetOpen}>
            <SheetContent side="right" className="w-[min(85vw,360px)] sm:max-w-[min(85vw,360px)] flex flex-col p-0 gap-0">
              <SheetHeader className="border-b border-[var(--glass-border)] px-4 py-3 pr-12 shrink-0">
                <SheetTitle className="text-base">{rightSidebarTitle}</SheetTitle>
              </SheetHeader>
              <div className={cn('flex-1 overflow-auto p-4', MODULE_SIDEBAR_TYPOGRAPHY)}>{rightSidebar}</div>
            </SheetContent>
          </Sheet>
        )}
      </motion.div>
    </ModuleLayoutContext.Provider>
  )
}

function ModuleHeader({ title, subtitle, breadcrumbs = [], actions, icon, className }) {
  const layout = useModuleLayout()

  const hasRightSidebar = layout?.hasRightSidebar ?? false
  const hasLeftSidebar = layout?.hasLeftSidebar ?? false
  const rightOpen = layout?.rightSidebarOpen ?? true
  const leftOpen = layout?.leftSidebarOpen ?? true
  const toggleRight = layout?.toggleRightSidebar
  const toggleLeft = layout?.toggleLeftSidebar
  const reducedMotion = layout?.reducedMotion ?? false
  const isLg = layout?.isLg ?? true
  const leftSheetOpen = layout?.leftSheetOpen ?? false
  const rightSheetOpen = layout?.rightSheetOpen ?? false
  const setLeftSheetOpen = layout?.setLeftSheetOpen
  const setRightSheetOpen = layout?.setRightSheetOpen
  const leftToggleRef = layout?.leftToggleRef
  const rightToggleRef = layout?.rightToggleRef

  const handleLeftToggle = () => {
    if (isLg) toggleLeft?.()
    else setLeftSheetOpen?.(!leftSheetOpen)
  }
  const handleRightToggle = () => {
    if (isLg) toggleRight?.()
    else setRightSheetOpen?.(!rightSheetOpen)
  }
  const leftExpanded = isLg ? leftOpen : leftSheetOpen
  const rightExpanded = isLg ? rightOpen : rightSheetOpen

  // Icon is mandatory; use same as Sidebar.jsx for this module (see @/lib/module-icons)
  const Icon = icon ?? FileText
  if (process.env.NODE_ENV === 'development' && !icon) {
    console.warn('[ModuleLayout.Header] icon is required; use MODULE_ICONS from @/lib/module-icons to match Sidebar.jsx')
  }

  const motionProps = reducedMotion ? {} : { whileHover: { scale: HOVER_SCALE }, whileTap: { scale: TAP_SCALE }, transition: { type: 'tween', duration: 0.12 } }
  const iconMotionProps = reducedMotion ? {} : { whileHover: { scale: HOVER_SCALE }, whileTap: { scale: TAP_SCALE }, transition: { type: 'tween', duration: 0.15 } }

  return (
    <TooltipProvider>
      <motion.header
        className={cn(
          'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 py-4 border-b border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl shrink-0',
          className
        )}
        role="region"
        aria-label="Page header"
        initial={false}
      >
        {/* Left panel toggle – far left */}
        {hasLeftSidebar && (
          <div className="flex items-center shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div ref={leftToggleRef} {...motionProps}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    onClick={handleLeftToggle}
                    aria-label={leftExpanded ? 'Hide left panel' : 'Show left panel'}
                    aria-expanded={leftExpanded}
                  >
                    <motion.span
                      animate={{ rotate: leftExpanded ? 0 : 180 }}
                      transition={reducedMotion ? { duration: 0 } : { type: 'tween', duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                    >
                      <PanelLeftClose className="h-4 w-4" />
                    </motion.span>
                  </Button>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent>{leftExpanded ? 'Hide left panel' : 'Show left panel'}</TooltipContent>
            </Tooltip>
          </div>
        )}

        <div className="min-w-0 flex-1 flex items-center gap-3">
          {/* Mandatory module icon with brand gradient tile; subtle hover/tap when motion allowed */}
          <motion.div
            className="flex shrink-0 items-center justify-center rounded-lg p-2 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)]"
            aria-hidden
            {...iconMotionProps}
          >
            <Icon className="h-5 w-5 text-white" />
          </motion.div>
          <div className="min-w-0 flex-1">
            {breadcrumbs.length > 0 ? (
              <Breadcrumb>
                <BreadcrumbList className="text-[var(--text-secondary)]">
                  {breadcrumbs.map((item, i) => {
                    const isLast = i === breadcrumbs.length - 1
                    return (
                      <BreadcrumbItem key={i}>
                        {i > 0 && <BreadcrumbSeparator />}
                        {item.href != null ? (
                          <BreadcrumbLink asChild className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                            <Link to={item.href}>{item.label}</Link>
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage className="text-[var(--text-primary)]" aria-current={isLast ? 'page' : undefined}>
                            {item.label}
                          </BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                    )
                  })}
                </BreadcrumbList>
              </Breadcrumb>
            ) : null}
            {title && (
              <h1 className="text-xl font-semibold text-[var(--text-primary)] truncate mt-0.5">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-sm text-[var(--text-secondary)] mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>

        {/* Right panel toggle – far right */}
        {hasRightSidebar && (
          <div className="flex items-center shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div ref={rightToggleRef} {...motionProps}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    onClick={handleRightToggle}
                    aria-label={rightExpanded ? 'Hide right panel' : 'Show right panel'}
                    aria-expanded={rightExpanded}
                  >
                    <motion.span
                      animate={{ rotate: rightExpanded ? 0 : 180 }}
                      transition={reducedMotion ? { duration: 0 } : { type: 'tween', duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                    >
                      <PanelRightClose className="h-4 w-4" />
                    </motion.span>
                  </Button>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent>{rightExpanded ? 'Hide right panel' : 'Show right panel'}</TooltipContent>
            </Tooltip>
          </div>
        )}
      </motion.header>
    </TooltipProvider>
  )
}

function ModuleContent({ children, className, padding = 'none', noPadding: noPaddingProp, contentTransition = true }) {
  const reducedMotion = useReducedMotion()
  const noPadding = noPaddingProp ?? (padding === 'none' || padding === false)
  const doFade = contentTransition && !reducedMotion
  return (
    <motion.div
      className={cn(
        'flex-1 min-h-0 overflow-auto scrollbar-hide text-[var(--text-primary)] text-sm font-sans',
        !noPadding && 'p-4',
        className
      )}
      role="region"
      aria-label="Page content"
      initial={doFade ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={doFade ? CONTENT_FADE : { duration: 0 }}
    >
      {children}
    </motion.div>
  )
}

ModuleHeader.displayName = 'ModuleHeader'
ModuleContent.displayName = 'ModuleContent'

ModuleLayoutRoot.Header = ModuleHeader
ModuleLayoutRoot.Content = ModuleContent

export {
  ModuleLayoutRoot as ModuleLayout,
  ModuleHeader,
  ModuleContent,
  useModuleLayout,
  MODULE_ICONS,
  MODULE_SIDEBAR_TYPOGRAPHY,
  SIDEBAR_TRANSITION,
  CONTENT_FADE,
  TAP_SCALE,
  HOVER_SCALE,
}
export default ModuleLayoutRoot
