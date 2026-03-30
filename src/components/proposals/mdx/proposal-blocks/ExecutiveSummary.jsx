import { Children, isValidElement } from 'react'
import { FileText } from 'lucide-react'

/**
 * Executive Summary Block — Liquid Glass Design
 * Matches the premium glass aesthetic used across all proposal sections.
 */

const liquidGlassBase = `
  relative
  bg-gradient-to-br from-white/10 to-white/5
  backdrop-blur-xl
  border border-white/20
  shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.2)]
  rounded-3xl
`

export function ExecutiveSummary({ children, title = 'Executive Summary' }) {
  const childArray = Children.toArray(children)

  // Group consecutive StatCards so they can render side-by-side
  const blocks = []
  let pendingStatCards = []

  const flushStatCards = () => {
    if (pendingStatCards.length === 0) return
    blocks.push({ type: 'stat-grid', items: pendingStatCards })
    pendingStatCards = []
  }

  for (const child of childArray) {
    const typeName = isValidElement(child) && (
      child.type?.displayName || child.type?.name || ''
    )
    const isStatLike = typeName === 'MetricHighlight' || typeName === 'StatCard'

    if (isStatLike) {
      pendingStatCards.push(child)
    } else {
      flushStatCards()
      blocks.push({ type: 'content', item: child })
    }
  }
  flushStatCards()

  return (
    <div className={`${liquidGlassBase} p-8 md:p-10 my-10`}>
      {/* Subtle brand glow */}
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#39bfb0]/10 rounded-full blur-3xl" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#39bfb0]/20 border border-[#39bfb0]/30 flex items-center justify-center">
            <FileText className="w-6 h-6 text-[#39bfb0]" />
          </div>
          <div>
            <span className="text-sm uppercase tracking-widest text-[#39bfb0] block">Overview</span>
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">{title}</h2>
          </div>
        </div>

        <div className="text-[var(--text-secondary)] leading-relaxed space-y-4">
          {blocks.map((block, idx) => {
            if (block.type === 'stat-grid') {
              const count = block.items.length
              const colsLg = count >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'

              return (
                <div
                  key={`stat-grid-${idx}`}
                  className={`grid grid-cols-1 sm:grid-cols-2 ${colsLg} gap-4 sm:gap-6`}
                >
                  {block.items.map((node, j) => (
                    <div key={`stat-${idx}-${j}`} className="h-full">
                      {node}
                    </div>
                  ))}
                </div>
              )
            }

            return <div key={`content-${idx}`}>{block.item}</div>
          })}
        </div>
      </div>
    </div>
  )
}

export default ExecutiveSummary
