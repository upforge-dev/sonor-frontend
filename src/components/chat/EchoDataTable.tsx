/**
 * EchoDataTable — Renders inline data tables inside Echo message bubbles.
 *
 * Parses a JSON table definition from ```table code blocks.
 */

import { cn } from '@/lib/utils'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'

export interface TableDefinition {
  title?: string
  columns: Array<{ key: string; label: string; align?: 'left' | 'center' | 'right' }>
  rows: Array<Record<string, string | number | boolean>>
  highlight?: string
}

interface EchoDataTableProps {
  definition: TableDefinition
  className?: string
}

export function EchoDataTable({ definition, className }: EchoDataTableProps) {
  const { title, columns, rows, highlight } = definition

  return (
    <div className={cn('my-3 rounded-lg border border-border/50 overflow-hidden', className)}>
      {title && (
        <div className="px-3 py-2 bg-muted/40 border-b border-border/50 text-sm font-medium">
          {title}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-3 py-2 text-xs font-medium text-muted-foreground',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    !col.align && 'text-left',
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={cn(
                  'border-b border-border/20 last:border-0',
                  highlight && String(row[columns[0]?.key]) === highlight && 'bg-primary/5',
                )}
              >
                {columns.map((col) => {
                  const val = row[col.key]
                  const isChange = typeof val === 'string' && (val.startsWith('+') || val.startsWith('-'))
                  return (
                    <td
                      key={col.key}
                      className={cn(
                        'px-3 py-2',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                        isChange && val.startsWith('+') && 'text-green-600 dark:text-green-400',
                        isChange && val.startsWith('-') && 'text-red-600 dark:text-red-400',
                      )}
                    >
                      {isChange && (
                        <span className="inline-flex items-center gap-0.5">
                          {val.startsWith('+') ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                          {val}
                        </span>
                      )}
                      {!isChange && String(val ?? '')}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function extractTables(text: string): { tables: TableDefinition[]; cleanText: string } {
  const tables: TableDefinition[] = []
  const cleanText = text.replace(/```table\s*\n([\s\S]*?)```/g, (_, json) => {
    try {
      const parsed = JSON.parse(json.trim())
      if (parsed.columns && parsed.rows) {
        tables.push(parsed)
        return ''
      }
    } catch { /* ignore malformed */ }
    return _
  })
  return { tables, cleanText }
}
