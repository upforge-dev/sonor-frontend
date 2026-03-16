/**
 * TipTap JSON → Portable Text converter.
 *
 * Converts TipTap's ProseMirror JSON document model into Sanity Portable Text blocks.
 * Supports: paragraphs, headings (h1-h4), blockquotes, lists (bullet + ordered),
 * marks (bold, italic, underline, strike, code, link), and horizontal rules.
 */

let blockKeyCounter = 0

function generateKey() {
  return `k${Date.now().toString(36)}${(blockKeyCounter++).toString(36)}`
}

/**
 * Extract marks from a TipTap text node.
 * Returns array of PT mark definitions.
 */
function convertMarks(marks = []) {
  const ptMarks = []
  for (const mark of marks) {
    switch (mark.type) {
      case 'bold':
        ptMarks.push('strong')
        break
      case 'italic':
        ptMarks.push('em')
        break
      case 'underline':
        ptMarks.push('underline')
        break
      case 'strike':
        ptMarks.push('strike')
        break
      case 'code':
        ptMarks.push('code')
        break
      case 'link':
        // Links are handled as markDefs on the block level
        ptMarks.push(mark)
        break
    }
  }
  return ptMarks
}

/**
 * Convert a TipTap text/inline node into PT spans.
 * Returns { spans: Span[], markDefs: MarkDef[] }
 */
function convertInlineContent(content = []) {
  const spans = []
  const markDefs = []

  for (const node of content) {
    if (node.type === 'text') {
      const marks = convertMarks(node.marks)
      const spanMarks = []

      for (const m of marks) {
        if (typeof m === 'string') {
          spanMarks.push(m)
        } else if (m.type === 'link') {
          // Create a markDef for the link
          const linkKey = generateKey()
          markDefs.push({
            _key: linkKey,
            _type: 'link',
            href: m.attrs?.href || '',
          })
          spanMarks.push(linkKey)
        }
      }

      spans.push({
        _key: generateKey(),
        _type: 'span',
        text: node.text || '',
        marks: spanMarks,
      })
    } else if (node.type === 'hardBreak') {
      spans.push({
        _key: generateKey(),
        _type: 'span',
        text: '\n',
        marks: [],
      })
    }
  }

  // Ensure at least one span (empty block)
  if (spans.length === 0) {
    spans.push({
      _key: generateKey(),
      _type: 'span',
      text: '',
      marks: [],
    })
  }

  return { spans, markDefs }
}

/**
 * Convert a TipTap block node into PT block(s).
 */
function convertBlock(node, listLevel = 0) {
  const blocks = []

  switch (node.type) {
    case 'paragraph': {
      const { spans, markDefs } = convertInlineContent(node.content)
      blocks.push({
        _key: generateKey(),
        _type: 'block',
        style: 'normal',
        children: spans,
        markDefs,
      })
      break
    }

    case 'heading': {
      const level = node.attrs?.level || 1
      const { spans, markDefs } = convertInlineContent(node.content)
      blocks.push({
        _key: generateKey(),
        _type: 'block',
        style: `h${level}`,
        children: spans,
        markDefs,
      })
      break
    }

    case 'blockquote': {
      // Blockquote wraps children — flatten into blocks with style 'blockquote'
      for (const child of node.content || []) {
        if (child.type === 'paragraph') {
          const { spans, markDefs } = convertInlineContent(child.content)
          blocks.push({
            _key: generateKey(),
            _type: 'block',
            style: 'blockquote',
            children: spans,
            markDefs,
          })
        }
      }
      break
    }

    case 'bulletList':
    case 'orderedList': {
      const listItem = node.type === 'bulletList' ? 'bullet' : 'number'
      for (const item of node.content || []) {
        if (item.type === 'listItem') {
          for (const child of item.content || []) {
            if (child.type === 'paragraph') {
              const { spans, markDefs } = convertInlineContent(child.content)
              blocks.push({
                _key: generateKey(),
                _type: 'block',
                style: 'normal',
                listItem,
                level: listLevel + 1,
                children: spans,
                markDefs,
              })
            } else if (child.type === 'bulletList' || child.type === 'orderedList') {
              // Nested list
              blocks.push(...convertBlock(child, listLevel + 1))
            }
          }
        }
      }
      break
    }

    case 'horizontalRule': {
      blocks.push({
        _key: generateKey(),
        _type: 'break',
        style: 'lineBreak',
      })
      break
    }

    case 'image': {
      blocks.push({
        _key: generateKey(),
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: node.attrs?.src || '',
        },
        alt: node.attrs?.alt || '',
      })
      break
    }

    default:
      // Unknown node type — try to convert children
      if (node.content) {
        for (const child of node.content) {
          blocks.push(...convertBlock(child, listLevel))
        }
      }
  }

  return blocks
}

/**
 * Convert a full TipTap document JSON to Portable Text blocks.
 * @param {Object} doc - TipTap document JSON (with type: 'doc', content: [...])
 * @returns {Array} Portable Text blocks
 */
export function tiptapToPortableText(doc) {
  if (!doc || !doc.content) return []

  blockKeyCounter = 0
  const blocks = []

  for (const node of doc.content) {
    blocks.push(...convertBlock(node))
  }

  return blocks
}
