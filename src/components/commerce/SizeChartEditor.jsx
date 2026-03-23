// src/components/commerce/SizeChartEditor.jsx
// Editable size chart table for clothing products.
// Supports inch/cm unit toggle with auto-conversion, measurement column presets, and inline cell editing.

import { useState, useEffect } from 'react'
import { Plus, X, Ruler } from 'lucide-react'
import { cn } from '@/lib/utils'

const MEASUREMENT_PRESETS = {
  Tops: ['Chest', 'Waist', 'Length'],
  Bottoms: ['Waist', 'Hip', 'Inseam', 'Length'],
  Dresses: ['Bust', 'Waist', 'Hip', 'Length'],
}

// ── Conversion helpers ─────────────────────────────────────────────────────────

const CM_PER_INCH = 2.54

/**
 * Convert a single value from `fromUnit` to the other unit.
 * Returns null if the value is not a valid number.
 */
function convertValue(value, fromUnit) {
  if (value === '' || value === null || value === undefined) return null
  const num = parseFloat(value)
  if (isNaN(num)) return null
  if (fromUnit === 'inches') return Math.round(num * CM_PER_INCH * 10) / 10
  return Math.round((num / CM_PER_INCH) * 10) / 10
}

/**
 * Rebuild values_alt for a row given current primary values and unit.
 */
function convertRow(row, fromUnit) {
  return {
    ...row,
    values_alt: row.values.map((v) => convertValue(v, fromUnit)),
  }
}

// ── Chart builder ──────────────────────────────────────────────────────────────

function buildEmptyChart(measurements, existingSizes = []) {
  return {
    unit: 'inches',
    measurements,
    rows: existingSizes.map((size) => ({
      size,
      values: measurements.map(() => ''),
      values_alt: measurements.map(() => null),
    })),
  }
}

// ── Editor component ──────────────────────────────────────────────────────────

export default function SizeChartEditor({ value, onChange, existingSizes = [] }) {
  // chart mirrors the value prop; local edits immediately propagate via onChange
  const [chart, setChart] = useState(value || null)

  // Sync external value changes (e.g. when the offering loads)
  useEffect(() => {
    setChart(value || null)
  }, [value])

  function emit(next) {
    setChart(next)
    onChange(next)
  }

  // ── Unit toggle ──────────────────────────────────────────────────────────────
  // Switching units: swap values ↔ values_alt for all rows, flip the unit field.

  function switchUnit(newUnit) {
    if (!chart || chart.unit === newUnit) return

    const rows = chart.rows.map((row) => {
      const newValues = (row.values_alt || []).map((v) => (v !== null && v !== undefined ? v : ''))
      const newValuesAlt = row.values.map((v) => convertValue(v, chart.unit))
      return {
        ...row,
        values: newValues,
        values_alt: newValuesAlt,
      }
    })

    emit({ ...chart, unit: newUnit, rows })
  }

  // ── Preset selection ──────────────────────────────────────────────────────────

  function applyPreset(presetName) {
    const measurements = MEASUREMENT_PRESETS[presetName]
    emit(buildEmptyChart(measurements, existingSizes))
  }

  // ── Measurements (columns) ────────────────────────────────────────────────────

  function addMeasurement() {
    const measurements = [...chart.measurements, 'Measurement']
    const rows = chart.rows.map((row) => ({
      ...row,
      values: [...row.values, ''],
      values_alt: [...(row.values_alt || []), null],
    }))
    emit({ ...chart, measurements, rows })
  }

  function renameMeasurement(colIdx, name) {
    const measurements = chart.measurements.map((m, i) => (i === colIdx ? name : m))
    emit({ ...chart, measurements })
  }

  function removeMeasurement(colIdx) {
    const measurements = chart.measurements.filter((_, i) => i !== colIdx)
    const rows = chart.rows.map((row) => ({
      ...row,
      values: row.values.filter((_, i) => i !== colIdx),
      values_alt: (row.values_alt || []).filter((_, i) => i !== colIdx),
    }))
    emit({ ...chart, measurements, rows })
  }

  // ── Rows ──────────────────────────────────────────────────────────────────────

  function addRow() {
    const newRow = convertRow(
      {
        size: 'New',
        values: chart.measurements.map(() => ''),
        values_alt: chart.measurements.map(() => null),
      },
      chart.unit,
    )
    emit({ ...chart, rows: [...chart.rows, newRow] })
  }

  function updateRowSize(rowIdx, size) {
    const rows = chart.rows.map((row, i) => (i === rowIdx ? { ...row, size } : row))
    emit({ ...chart, rows })
  }

  function updateCell(rowIdx, colIdx, val) {
    const rows = chart.rows.map((row, i) => {
      if (i !== rowIdx) return row
      const values = row.values.map((v, j) => (j === colIdx ? val : v))
      const values_alt = (row.values_alt || []).map((v, j) =>
        j === colIdx ? convertValue(val, chart.unit) : v,
      )
      return { ...row, values, values_alt }
    })
    emit({ ...chart, rows })
  }

  function removeRow(rowIdx) {
    const rows = chart.rows.filter((_, i) => i !== rowIdx)
    emit({ ...chart, rows })
  }

  // ── Clear ─────────────────────────────────────────────────────────────────────

  function clearChart() {
    setChart(null)
    onChange(null)
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const altUnit = chart?.unit === 'inches' ? 'cm' : 'in'

  function getAltPreview(val) {
    const converted = convertValue(val, chart.unit)
    if (converted === null) return null
    return `≈ ${converted} ${altUnit}`
  }

  // ── Render ─────────────────────────────────────────────────────────────────────

  if (!chart) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <Ruler className="h-4 w-4" />
          <span>Choose a template to get started, or build from scratch.</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.keys(MEASUREMENT_PRESETS).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => applyPreset(preset)}
              className="px-3 py-1.5 rounded-md text-sm font-medium border transition-colors"
              style={{
                borderColor: 'var(--glass-border)',
                background: 'var(--surface-secondary)',
                color: 'var(--text-primary)',
              }}
            >
              {preset}
            </button>
          ))}
          <button
            type="button"
            onClick={() => emit(buildEmptyChart(['Measurement'], existingSizes))}
            className="px-3 py-1.5 rounded-md text-sm border transition-colors flex items-center gap-1"
            style={{
              borderColor: 'var(--glass-border)',
              background: 'transparent',
              color: 'var(--text-secondary)',
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Blank
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Unit toggle + clear */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 p-0.5 rounded-md" style={{ background: 'var(--surface-secondary)' }}>
          {['inches', 'cm'].map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => switchUnit(u)}
              className={cn(
                'px-3 py-1 rounded text-xs font-medium transition-colors',
                chart.unit === u
                  ? 'text-white'
                  : 'text-[var(--text-secondary)]'
              )}
              style={
                chart.unit === u
                  ? { background: 'var(--brand-primary)' }
                  : {}
              }
            >
              {u}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={clearChart}
          className="text-xs transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Clear chart
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <div
          className="rounded-lg border"
          style={{ borderColor: 'var(--glass-border)', background: 'var(--glass-bg)', minWidth: 'fit-content' }}
        >
          <table className="w-full text-sm min-w-max">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                {/* Size column header */}
                <th
                  className="text-left px-2 py-1.5 font-medium text-xs w-16"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Size
                </th>

                {/* Measurement column headers — editable */}
                {chart.measurements.map((m, colIdx) => (
                  <th key={colIdx} className="px-1 py-1.5 min-w-[80px]">
                    <div className="flex items-center gap-0.5">
                      <input
                        type="text"
                        value={m}
                        onChange={(e) => renameMeasurement(colIdx, e.target.value)}
                        className="flex-1 min-w-0 text-xs font-medium bg-transparent border-0 outline-none px-1 py-0.5 rounded"
                        style={{ color: 'var(--text-primary)' }}
                      />
                      <button
                        type="button"
                        onClick={() => removeMeasurement(colIdx)}
                        className="shrink-0 rounded p-0.5 transition-colors hover:bg-red-500/10"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </th>
                ))}

                {/* Add column button */}
                <th className="px-1 py-1.5 w-8">
                  <button
                    type="button"
                    onClick={addMeasurement}
                    title="Add measurement"
                    className="rounded p-0.5 transition-colors"
                    style={{ color: 'var(--brand-primary)' }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </th>
              </tr>
            </thead>

            <tbody>
              {chart.rows.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  style={{ borderBottom: '1px solid var(--glass-border)' }}
                  className="last:border-b-0"
                >
                  {/* Size label — editable */}
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      value={row.size}
                      onChange={(e) => updateRowSize(rowIdx, e.target.value)}
                      className="w-14 text-xs font-semibold bg-transparent border-0 outline-none px-1 py-0.5 rounded"
                      style={{ color: 'var(--text-primary)' }}
                    />
                  </td>

                  {/* Value cells */}
                  {row.values.map((val, colIdx) => {
                    const preview = getAltPreview(val)
                    return (
                      <td key={colIdx} className="px-1 py-1">
                        <input
                          type="number"
                          value={val}
                          onChange={(e) => updateCell(rowIdx, colIdx, e.target.value)}
                          placeholder="—"
                          className="w-full text-xs bg-transparent border rounded px-2 py-1 outline-none focus:ring-1 text-center"
                          style={{
                            borderColor: 'var(--glass-border)',
                            color: 'var(--text-primary)',
                          }}
                        />
                        {preview && (
                          <div
                            className="text-center mt-0.5"
                            style={{ fontSize: '10px', color: 'var(--text-tertiary)', lineHeight: 1.2 }}
                          >
                            {preview}
                          </div>
                        )}
                      </td>
                    )
                  })}

                  {/* Remove row */}
                  <td className="px-1 py-1 w-8">
                    <button
                      type="button"
                      onClick={() => removeRow(rowIdx)}
                      className="rounded p-0.5 transition-colors hover:bg-red-500/10"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}

              {chart.rows.length === 0 && (
                <tr>
                  <td
                    colSpan={chart.measurements.length + 2}
                    className="px-3 py-4 text-xs text-center"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    No rows yet. Click "+ Add row" to add sizes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Add row button */}
          <div className="px-2 py-1.5" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1 text-xs font-medium transition-colors"
              style={{ color: 'var(--brand-primary)' }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add row
            </button>
          </div>
        </div>
      </div>

      {/* Fit note */}
      {chart && (
        <div className="mt-3">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Fit Note
          </label>
          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
            Displayed as a warning on the product page (e.g. "Runs a size small — order one size up!")
          </p>
          <input
            type="text"
            value={chart.fit_note || ''}
            onChange={(e) => emit({ ...chart, fit_note: e.target.value || undefined })}
            placeholder="e.g. Runs a size small — order one size up!"
            className="w-full h-8 text-sm px-3 rounded border bg-background outline-none focus:ring-1"
            style={{ borderColor: 'var(--glass-border)' }}
          />
        </div>
      )}
    </div>
  )
}
