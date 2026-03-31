// TipTap-based rich text editor that outputs Markdown

import * as React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { useEffect, useCallback, useMemo, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import TurndownService from 'turndown'
import { marked } from 'marked'
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Undo,
  Redo,
  Code,
  Minus,
  Unlink,
  ImageIcon,
  FileCode
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip'

// Configure Turndown for markdown conversion
const createTurndownService = () => {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**',
  })

  // Keep strikethrough
  turndown.addRule('strikethrough', {
    filter: ['del', 's', 'strike'],
    replacement: (content) => `~~${content}~~`
  })

  return turndown
}

marked.setOptions({ gfm: true, breaks: false })

const markdownToHtml = (markdown: string): string => {
  if (!markdown) return ''
  return marked.parse(markdown, { async: false }) as string
}

interface MenuButtonProps {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  children: React.ReactNode
  title?: string
}

const MenuButton = ({ onClick, isActive, disabled, children, title }: MenuButtonProps) => (
  <TooltipProvider delayDuration={300}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "h-8 w-8 p-0",
            isActive && "bg-[var(--bg-tertiary)] text-[var(--accent-primary)]"
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {title}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)

interface MenuBarProps {
  editor: Editor | null
  onViewSource: () => void
  isSourceMode: boolean
}

const MenuBar = ({ editor, onViewSource, isSourceMode }: MenuBarProps) => {
  if (!editor) return null

  const addLink = () => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('Enter URL:', previousUrl)

    if (url === null) return

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const addImage = () => {
    const url = window.prompt('Enter image URL:')

    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
      {/* Text formatting */}
      <MenuButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold (Ctrl+B)"
        disabled={isSourceMode}
      >
        <Bold className="h-4 w-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic (Ctrl+I)"
        disabled={isSourceMode}
      >
        <Italic className="h-4 w-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="Strikethrough"
        disabled={isSourceMode}
      >
        <Strikethrough className="h-4 w-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        title="Inline Code"
        disabled={isSourceMode}
      >
        <Code className="h-4 w-4" />
      </MenuButton>

      <div className="w-px h-6 bg-[var(--border-primary)] mx-1" />

      {/* Headings */}
      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
        disabled={isSourceMode}
      >
        <Heading1 className="h-4 w-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
        disabled={isSourceMode}
      >
        <Heading2 className="h-4 w-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="Heading 3"
        disabled={isSourceMode}
      >
        <Heading3 className="h-4 w-4" />
      </MenuButton>

      <div className="w-px h-6 bg-[var(--border-primary)] mx-1" />

      {/* Lists */}
      <MenuButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
        disabled={isSourceMode}
      >
        <List className="h-4 w-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Numbered List"
        disabled={isSourceMode}
      >
        <ListOrdered className="h-4 w-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="Blockquote"
        disabled={isSourceMode}
      >
        <Quote className="h-4 w-4" />
      </MenuButton>

      <div className="w-px h-6 bg-[var(--border-primary)] mx-1" />

      {/* Links & Media */}
      <MenuButton
        onClick={addLink}
        isActive={editor.isActive('link')}
        title="Add Link"
        disabled={isSourceMode}
      >
        <LinkIcon className="h-4 w-4" />
      </MenuButton>
      {editor.isActive('link') && (
        <MenuButton
          onClick={() => editor.chain().focus().unsetLink().run()}
          title="Remove Link"
          disabled={isSourceMode}
        >
          <Unlink className="h-4 w-4" />
        </MenuButton>
      )}
      <MenuButton
        onClick={addImage}
        title="Insert Image"
        disabled={isSourceMode}
      >
        <ImageIcon className="h-4 w-4" />
      </MenuButton>

      <div className="w-px h-6 bg-[var(--border-primary)] mx-1" />

      {/* Horizontal Rule */}
      <MenuButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal Rule"
        disabled={isSourceMode}
      >
        <Minus className="h-4 w-4" />
      </MenuButton>

      <div className="flex-1" />

      {/* Source Mode Toggle */}
      <MenuButton
        onClick={onViewSource}
        isActive={isSourceMode}
        title={isSourceMode ? "Visual Editor" : "View Markdown"}
      >
        <FileCode className="h-4 w-4" />
      </MenuButton>

      <div className="w-px h-6 bg-[var(--border-primary)] mx-1" />

      {/* Undo/Redo */}
      <MenuButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo() || isSourceMode}
        title="Undo (Ctrl+Z)"
      >
        <Undo className="h-4 w-4" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo() || isSourceMode}
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo className="h-4 w-4" />
      </MenuButton>
    </div>
  )
}

export interface MarkdownEditorProps {
  value?: string
  onChange?: (markdown: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
  disabled?: boolean
}

export function MarkdownEditor({
  value = '',
  onChange,
  placeholder = 'Start writing your content...',
  className,
  minHeight = '300px',
  disabled = false
}: MarkdownEditorProps) {
  const turndownService = useMemo(() => createTurndownService(), [])

  // State for source mode
  const [isSourceMode, setIsSourceMode] = React.useState(false)
  const [sourceValue, setSourceValue] = React.useState(value)
  /** Last markdown emitted by the editor — skips prop sync when parent echo matches (avoids empty flash + cursor fights). */
  const lastEditorMarkdownRef = useRef<string | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'bg-[var(--bg-tertiary)] p-4 rounded-lg font-mono text-sm overflow-x-auto',
          },
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[var(--accent-primary)] underline cursor-pointer',
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-4',
        },
      }),
    ],
    content: markdownToHtml(value),
    editable: !disabled && !isSourceMode,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML()
      // Convert HTML to Markdown
      const markdown = turndownService.turndown(html)
      lastEditorMarkdownRef.current = markdown
      setSourceValue(markdown)
      onChange?.(markdown)
    },
  })

  // When parent value changes (e.g. post loads after mount), push into TipTap. Use emitUpdate: false + ref to avoid fighting typing.
  useEffect(() => {
    if (!editor || isSourceMode) return
    if (lastEditorMarkdownRef.current === value) return
    editor.commands.setContent(markdownToHtml(value || ''), { emitUpdate: false })
    setSourceValue(value || '')
    lastEditorMarkdownRef.current = value || ''
  }, [value, editor, isSourceMode])

  // Update editable state when disabled or source mode changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled && !isSourceMode)
    }
  }, [disabled, isSourceMode, editor])

  // Handle source mode toggle
  const handleViewSource = useCallback(() => {
    if (isSourceMode) {
      // Switching back to visual mode - update editor with source
      if (editor) {
        editor.commands.setContent(markdownToHtml(sourceValue), { emitUpdate: false })
        lastEditorMarkdownRef.current = sourceValue
      }
    } else {
      // Switching to source mode - get current markdown
      if (editor) {
        setSourceValue(turndownService.turndown(editor.getHTML()))
      }
    }
    setIsSourceMode(!isSourceMode)
  }, [isSourceMode, editor, sourceValue, turndownService])

  // Handle source textarea changes
  const handleSourceChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setSourceValue(newValue)
    onChange?.(newValue)
  }, [onChange])

  return (
    <div
      className={cn(
        "border border-[var(--border-primary)] rounded-lg overflow-hidden bg-[var(--bg-primary)]",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <MenuBar editor={editor} onViewSource={handleViewSource} isSourceMode={isSourceMode} />

      {isSourceMode ? (
        <textarea
          value={sourceValue}
          onChange={handleSourceChange}
          className={cn(
            "w-full p-4 font-mono text-sm bg-[var(--bg-primary)] text-[var(--text-primary)] resize-none outline-none",
            "min-h-[var(--editor-min-height)]"
          )}
          style={{ '--editor-min-height': minHeight } as React.CSSProperties}
          placeholder={placeholder}
          disabled={disabled}
        />
      ) : (
        <EditorContent
          editor={editor}
          className={cn(
            "prose prose-sm dark:prose-invert max-w-none p-4",
            "[&_.ProseMirror]:outline-none",
            "[&_.ProseMirror]:min-h-[var(--editor-min-height)]",
            "[&_.ProseMirror_p]:my-3 [&_.ProseMirror_p]:leading-relaxed",
            "[&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:my-4 [&_.ProseMirror_h1]:text-[var(--text-primary)]",
            "[&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:my-3 [&_.ProseMirror_h2]:text-[var(--text-primary)]",
            "[&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:my-2 [&_.ProseMirror_h3]:text-[var(--text-primary)]",
            "[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ul]:my-3",
            "[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_ol]:my-3",
            "[&_.ProseMirror_li]:my-1",
            "[&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-[var(--accent-primary)] [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:text-[var(--text-secondary)] [&_.ProseMirror_blockquote]:my-4",
            "[&_.ProseMirror_code]:bg-[var(--bg-tertiary)] [&_.ProseMirror_code]:px-1.5 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:text-sm [&_.ProseMirror_code]:font-mono",
            "[&_.ProseMirror_pre]:bg-[var(--bg-tertiary)] [&_.ProseMirror_pre]:p-4 [&_.ProseMirror_pre]:rounded-lg [&_.ProseMirror_pre]:my-4 [&_.ProseMirror_pre]:overflow-x-auto",
            "[&_.ProseMirror_hr]:border-[var(--border-primary)] [&_.ProseMirror_hr]:my-6",
            "[&_.ProseMirror_a]:text-[var(--accent-primary)] [&_.ProseMirror_a]:underline",
            "[&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:h-auto [&_.ProseMirror_img]:rounded-lg [&_.ProseMirror_img]:my-4",
            "[&_.ProseMirror_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_.is-editor-empty:first-child::before]:text-[var(--text-tertiary)] [&_.ProseMirror_.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_.is-editor-empty:first-child::before]:pointer-events-none"
          )}
          style={{ '--editor-min-height': minHeight } as React.CSSProperties}
        />
      )}
    </div>
  )
}

export default MarkdownEditor
