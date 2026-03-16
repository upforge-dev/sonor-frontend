/**
 * EchoChart — Renders inline charts inside Echo message bubbles.
 *
 * Parses a JSON chart definition and renders using Recharts.
 * Supports: bar, line, area chart types.
 */

import { useMemo } from 'react'
import {
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { cn } from '@/lib/utils'

export interface ChartDefinition {
  type: 'bar' | 'line' | 'area'
  title?: string
  data: Array<Record<string, string | number>>
  xKey: string
  yKeys: Array<{ key: string; label?: string; color?: string }>
}

interface EchoChartProps {
  definition: ChartDefinition
  className?: string
}

const COLORS = [
  'var(--brand-primary)',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
]

export function EchoChart({ definition, className }: EchoChartProps) {
  const { type, title, data, xKey, yKeys } = definition

  if (!data?.length || !xKey || !yKeys?.length) return null

  const chartContent = useMemo(() => {
    const commonProps = {
      data,
      margin: { top: 5, right: 10, left: -10, bottom: 5 },
    }
    const xAxisProps = { dataKey: xKey, tick: { fontSize: 11, fill: 'var(--text-tertiary)' }, axisLine: false, tickLine: false }
    const yAxisProps = { tick: { fontSize: 11, fill: 'var(--text-tertiary)' }, axisLine: false, tickLine: false, width: 45 }
    const gridProps = { strokeDasharray: '3 3', stroke: 'var(--glass-border)', opacity: 0.5 }
    const tooltipStyle = {
      contentStyle: {
        background: 'var(--surface-primary)',
        border: '1px solid var(--glass-border)',
        borderRadius: '8px',
        fontSize: '12px',
      },
    }

    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid {...gridProps} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip {...tooltipStyle} />
            {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: '11px' }} />}
            {yKeys.map((yk, i) => (
              <Line
                key={yk.key}
                type="monotone"
                dataKey={yk.key}
                name={yk.label || yk.key}
                stroke={yk.color || COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        )
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid {...gridProps} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip {...tooltipStyle} />
            {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: '11px' }} />}
            {yKeys.map((yk, i) => (
              <Area
                key={yk.key}
                type="monotone"
                dataKey={yk.key}
                name={yk.label || yk.key}
                stroke={yk.color || COLORS[i % COLORS.length]}
                fill={yk.color || COLORS[i % COLORS.length]}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        )
      case 'bar':
      default:
        return (
          <BarChart {...commonProps}>
            <CartesianGrid {...gridProps} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip {...tooltipStyle} />
            {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: '11px' }} />}
            {yKeys.map((yk, i) => (
              <Bar
                key={yk.key}
                dataKey={yk.key}
                name={yk.label || yk.key}
                fill={yk.color || COLORS[i % COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        )
    }
  }, [type, data, xKey, yKeys])

  return (
    <div className={cn('my-3 -mx-1 rounded-lg border border-[var(--glass-border)]/30 bg-[var(--surface-secondary)]/50 p-3', className)}>
      {title && (
        <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">{title}</p>
      )}
      <ResponsiveContainer width="100%" height={200}>
        {chartContent}
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Try to extract chart definitions from a message text.
 * Looks for ```chart { ... } ``` code blocks.
 */
export function extractCharts(text: string): { cleanText: string; charts: ChartDefinition[] } {
  const charts: ChartDefinition[] = []
  const cleanText = text.replace(/```chart\s*\n?([\s\S]*?)```/g, (_match, json: string) => {
    try {
      const parsed = JSON.parse(json.trim())
      if (parsed.data && parsed.xKey && parsed.yKeys) {
        charts.push(parsed as ChartDefinition)
      }
    } catch {
      // Invalid chart JSON — leave as-is
      return _match
    }
    return ''
  }).trim()

  return { cleanText, charts }
}
