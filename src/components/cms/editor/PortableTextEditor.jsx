/**
 * PortableTextEditor - TipTap-based editor that reads/writes Portable Text.
 *
 * Wraps the existing TipTap editor with bidirectional PT conversion.
 * Input: Portable Text blocks array. Output: Portable Text blocks array.
 */
import { useCallback, useRef, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
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
} from 'lucide-react'
import { tiptapToPortableText } from './tiptap-to-portable-text'
import { portableTextToTiptap } from './portable-text-to-tiptap'

const MenuButton = ({ onClick, isActive, disabled, children, title }) => (
  <Button
    type="button"
    variant="ghost"
    size="sm"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={cn(
      'h-8 w-8 p-0',
      isActive && 'bg-muted text-foreground'
    )}
  >
    {children}
  </Button>
)

function MenuBar({ editor }) {
  if (!editor) return null

  const addLink = () => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b bg-muted/50">
      <MenuButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold">
        <Bold className="h-4 w-4" />
      </MenuButton>
      <MenuButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic">
        <Italic className="h-4 w-4" />
      </MenuButton>
      <MenuButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Underline">
        <UnderlineIcon className="h-4 w-4" />
      </MenuButton>
      <MenuButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Strikethrough">
        <Strikethrough className="h-4 w-4" />
      </MenuButton>
      <MenuButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')} title="Inline Code">
        <Code className="h-4 w-4" />
      </MenuButton>

      <div className="w-px h-6 bg-border mx-1" />

      <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="Heading 1">
        <Heading1 className="h-4 w-4" />
      </MenuButton>
      <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Heading 2">
        <Heading2 className="h-4 w-4" />
      </MenuButton>
      <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="Heading 3">
        <Heading3 className="h-4 w-4" />
      </MenuButton>

      <div className="w-px h-6 bg-border mx-1" />

      <MenuButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Bullet List">
        <List className="h-4 w-4" />
      </MenuButton>
      <MenuButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Numbered List">
        <ListOrdered className="h-4 w-4" />
      </MenuButton>
      <MenuButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Blockquote">
        <Quote className="h-4 w-4" />
      </MenuButton>

      <div className="w-px h-6 bg-border mx-1" />

      <MenuButton onClick={addLink} isActive={editor.isActive('link')} title="Add Link">
        <LinkIcon className="h-4 w-4" />
      </MenuButton>
      {editor.isActive('link') && (
        <MenuButton onClick={() => editor.chain().focus().unsetLink().run()} title="Remove Link">
          <Unlink className="h-4 w-4" />
        </MenuButton>
      )}

      <div className="w-px h-6 bg-border mx-1" />

      <MenuButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
        <Minus className="h-4 w-4" />
      </MenuButton>

      <div className="flex-1" />

      <MenuButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
        <Undo className="h-4 w-4" />
      </MenuButton>
      <MenuButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
        <Redo className="h-4 w-4" />
      </MenuButton>
    </div>
  )
}

/**
 * @param {Object} props
 * @param {Array} props.value - Portable Text blocks
 * @param {(blocks: Array) => void} props.onChange - Called with updated PT blocks
 * @param {string} [props.placeholder]
 * @param {string} [props.className]
 * @param {string} [props.minHeight='150px']
 * @param {boolean} [props.disabled=false]
 */
export function PortableTextEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  className,
  minHeight = '150px',
  disabled = false,
}) {
  const isUpdatingRef = useRef(false)

  // Convert initial PT value to TipTap JSON
  const initialContent = value ? portableTextToTiptap(value) : undefined

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Image.configure({
        inline: false,
      }),
    ],
    content: initialContent,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      if (isUpdatingRef.current) return
      const json = editor.getJSON()
      const ptBlocks = tiptapToPortableText(json)
      onChange?.(ptBlocks)
    },
  })

  // Update content when value prop changes externally
  useEffect(() => {
    if (!editor || !value) return
    // Only update if the value is meaningfully different
    const currentPt = tiptapToPortableText(editor.getJSON())
    const currentText = currentPt.map(b => b.children?.map(c => c.text).join('')).join('\n')
    const newText = value.map(b => b.children?.map(c => c.text).join('')).join('\n')
    if (currentText !== newText) {
      isUpdatingRef.current = true
      editor.commands.setContent(portableTextToTiptap(value))
      isUpdatingRef.current = false
    }
  }, [value, editor])

  useEffect(() => {
    if (editor) editor.setEditable(!disabled)
  }, [disabled, editor])

  return (
    <div
      className={cn(
        'border rounded-md overflow-hidden bg-background',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <MenuBar editor={editor} />
      <EditorContent
        editor={editor}
        className={cn(
          'prose prose-sm dark:prose-invert max-w-none p-3',
          '[&_.ProseMirror]:outline-none',
          '[&_.ProseMirror]:min-h-[var(--editor-min-height)]',
          '[&_.ProseMirror_p]:my-2',
          '[&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:my-4',
          '[&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:my-3',
          '[&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:my-2',
          '[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6',
          '[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6',
          '[&_.ProseMirror_li]:my-1',
          '[&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-muted-foreground/30 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic',
          '[&_.ProseMirror_code]:bg-muted [&_.ProseMirror_code]:px-1.5 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:text-sm',
          '[&_.ProseMirror_hr]:border-border [&_.ProseMirror_hr]:my-4',
          '[&_.ProseMirror_a]:text-primary [&_.ProseMirror_a]:underline'
        )}
        style={{ '--editor-min-height': minHeight }}
      />
    </div>
  )
}

export default PortableTextEditor
