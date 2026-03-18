/**
 * OnboardingBlocks — Parsers and renderers for cinematic onboarding blocks
 * embedded in Echo's markdown responses.
 *
 * Supports:
 *   ```dataflood { provider, entries?, counters? } ```
 *   ```moduleunlock { modules } ```
 *   ```constellation { nodes, center? } ```
 *   ```datamigration { projectId, orgId } ```
 */

import { lazy, Suspense } from 'react'

// Lazy-load the heavy visual components
const DataFlood = lazy(() => import('./DataFlood'))
const ModuleUnlockGrid = lazy(() => import('./ModuleUnlockGrid'))
const ProgressConstellation = lazy(() => import('./ProgressConstellation'))
const DataMigrationWizard = lazy(() => import('./DataMigrationWizard'))

export interface OnboardingBlock {
  type: 'dataflood' | 'moduleunlock' | 'constellation' | 'datamigration'
  data: any
}

/**
 * Extract onboarding blocks from markdown text.
 * Removes the fenced blocks and returns clean text + parsed block data.
 */
export function extractOnboardingBlocks(text: string): {
  cleanText: string
  blocks: OnboardingBlock[]
} {
  const blocks: OnboardingBlock[] = []
  const blockTypes = ['dataflood', 'moduleunlock', 'constellation', 'datamigration'] as const

  let cleanText = text
  for (const blockType of blockTypes) {
    const regex = new RegExp('```' + blockType + '\\s*\\n([\\s\\S]*?)\\n```', 'g')
    cleanText = cleanText.replace(regex, (_, jsonStr) => {
      try {
        const data = JSON.parse(jsonStr.trim())
        blocks.push({ type: blockType, data })
      } catch {
        // Invalid JSON — skip
      }
      return ''
    })
  }

  return { cleanText: cleanText.trim(), blocks }
}

/**
 * Render a single onboarding block.
 */
export function OnboardingBlockRenderer({
  block,
  onOAuthClick,
  migrationContext,
}: {
  block: OnboardingBlock
  onOAuthClick?: (provider: string) => void
  migrationContext?: {
    apiUrl: string
    authToken: string
    projectId: string
    orgId: string
    onComplete?: (result: { imported: number; skipped: number; errors: number }) => void
    onSkip?: () => void
  }
}) {
  const fallback = (
    <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          width: 20,
          height: 20,
          border: '2px solid rgba(57,191,176,0.3)',
          borderTopColor: '#39bfb0',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
    </div>
  )

  switch (block.type) {
    case 'dataflood':
      return (
        <Suspense fallback={fallback}>
          <DataFlood
            provider={block.data.provider || 'default'}
            entries={block.data.entries}
            counters={block.data.counters}
            counterLabels={block.data.counterLabels}
            duration={block.data.duration}
          />
        </Suspense>
      )

    case 'moduleunlock':
      return (
        <Suspense fallback={fallback}>
          <ModuleUnlockGrid
            enabledModules={block.data.modules || []}
            animateIn={block.data.animateIn !== false}
            staggerDelay={block.data.staggerDelay}
          />
        </Suspense>
      )

    case 'constellation':
      return (
        <Suspense fallback={fallback}>
          <ProgressConstellation
            nodes={block.data.nodes || []}
            center={block.data.center}
          />
        </Suspense>
      )

    case 'datamigration':
      if (!migrationContext) return null
      return (
        <Suspense fallback={fallback}>
          <DataMigrationWizard
            apiUrl={migrationContext.apiUrl}
            authToken={migrationContext.authToken}
            projectId={block.data.projectId || migrationContext.projectId}
            orgId={block.data.orgId || migrationContext.orgId}
            onComplete={migrationContext.onComplete}
            onSkip={migrationContext.onSkip}
          />
        </Suspense>
      )

    default:
      return null
  }
}
