/**
 * Portable Text → TipTap JSON converter.
 *
 * Converts Sanity Portable Text blocks into TipTap's ProseMirror JSON document model.
 * Supports: normal, h1-h4, blockquote, lists (bullet + number), marks (strong, em,
 * underline, strike, code, link), images, and break nodes.
 */

/**
 * Convert PT marks on a span to TipTap marks.
 * @param {string[]} marks - Mark names or markDef keys
 * @param {Object[]} markDefs - Block-level mark definitions
 */
function convertPtMarks(marks = [], markDefs = []) {
  const markDefMap = new Map()
  for (const md of markDefs) {
    markDefMap.set(md._key, md)
  }

  const tiptapMarks = []
  for (const mark of marks) {
    switch (mark) {
      case 'strong':
        tiptapMarks.push({ type: 'bold' })
        break
      case 'em':
        tiptapMarks.push({ type: 'italic' })
        break
      case 'underline':
        tiptapMarks.push({ type: 'underline' })
        break
      case 'strike':
        tiptapMarks.push({ type: 'strike' })
        break
      case 'code':
        tiptapMarks.push({ type: 'code' })
        break
      default: {
        // Check if it's a markDef key (e.g. link)
        const def = markDefMap.get(mark)
        if (def?._type === 'link') {
          tiptapMarks.push({
            type: 'link',
            attrs: {
              href: def.href || '',
              target: def.blank ? '_blank' : null,
              rel: null,
              class: null,
            },
          })
        }
        break
      }
    }
  }
  return tiptapMarks
}

/**
 * Convert PT block children (spans) to TipTap inline content.
 */
function convertChildren(children = [], markDefs = []) {
  const content = []

  for (const child of children) {
    if (child._type === 'span') {
      const text = child.text || ''
      // Handle line breaks within spans
      if (text.includes('\n')) {
        const parts = text.split('\n')
        parts.forEach((part, i) => {
          if (part) {
            const marks = convertPtMarks(child.marks, markDefs)
            content.push({
              type: 'text',
              text: part,
              ...(marks.length > 0 ? { marks } : {}),
            })
          }
          if (i < parts.length - 1) {
            content.push({ type: 'hardBreak' })
          }
        })
      } else {
        const marks = convertPtMarks(child.marks, markDefs)
        content.push({
          type: 'text',
          text,
          ...(marks.length > 0 ? { marks } : {}),
        })
      }
    }
  }

  return content
}

/**
 * Convert a single PT block to TipTap node(s).
 */
function convertPtBlock(block) {
  if (block._type === 'break') {
    return [{ type: 'horizontalRule' }]
  }

  if (block._type === 'image') {
    return [{
      type: 'image',
      attrs: {
        src: block.asset?._ref || block.asset?.url || '',
        alt: block.alt || '',
        title: block.title || null,
      },
    }]
  }

  if (block._type !== 'block') {
    // Unknown block type — skip
    return []
  }

  const style = block.style || 'normal'
  const content = convertChildren(block.children, block.markDefs)

  // Headings
  if (/^h[1-6]$/.test(style)) {
    const level = parseInt(style.slice(1), 10)
    return [{
      type: 'heading',
      attrs: { level },
      content: content.length > 0 ? content : undefined,
    }]
  }

  // Blockquote
  if (style === 'blockquote') {
    return [{
      type: 'blockquote',
      content: [{
        type: 'paragraph',
        content: content.length > 0 ? content : undefined,
      }],
    }]
  }

  // Normal paragraph (may be a list item)
  const paragraph = {
    type: 'paragraph',
    content: content.length > 0 ? content : undefined,
  }

  return [paragraph]
}

/**
 * Group consecutive list items into TipTap list nodes.
 */
function groupListItems(tiptapNodes, ptBlocks) {
  const result = []
  let i = 0

  while (i < ptBlocks.length) {
    const block = ptBlocks[i]

    if (block._type === 'block' && block.listItem) {
      // Start a list
      const listType = block.listItem === 'bullet' ? 'bulletList' : 'orderedList'
      const items = []

      while (i < ptBlocks.length && ptBlocks[i]._type === 'block' && ptBlocks[i].listItem === block.listItem) {
        const itemBlock = ptBlocks[i]
        const content = convertChildren(itemBlock.children, itemBlock.markDefs)
        items.push({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: content.length > 0 ? content : undefined,
          }],
        })
        i++
      }

      result.push({
        type: listType,
        content: items,
      })
    } else {
      // Non-list block — use the already-converted nodes
      result.push(...convertPtBlock(block))
      i++
    }
  }

  return result
}

/**
 * Convert Portable Text blocks to a full TipTap document JSON.
 * @param {Array} blocks - Portable Text blocks
 * @returns {Object} TipTap document JSON ({ type: 'doc', content: [...] })
 */
export function portableTextToTiptap(blocks) {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    }
  }

  const content = groupListItems([], blocks)

  return {
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph' }],
  }
}
