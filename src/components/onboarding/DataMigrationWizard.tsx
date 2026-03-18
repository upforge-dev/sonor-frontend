/**
 * DataMigrationWizard — Multi-step import UI for onboarding Phase 5.
 *
 * Steps:
 *   1. Source Selection — Pick CSV/HubSpot/WordPress/Mailchimp/Shopify
 *   2. Connect / Upload — Provide credentials or upload a file
 *   3. Field Mapping — Review auto-mapped fields, adjust as needed
 *   4. Preview & Validate — See first 5 rows transformed, confirm
 *   5. Import Progress — Live progress with frequency bar animation
 *   6. Complete — Summary with counts and celebratory pulse
 *
 * Rendered as an ```datamigration block from Echo during onboarding,
 * or standalone via /settings/migrations for post-onboarding imports.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  FileSpreadsheet,
  Database,
  Globe,
  Mail,
  ShoppingBag,
  Upload,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  AlertTriangle,
  ChevronDown,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import FrequencyBars from './FrequencyBars'
import SonicPulse from './SonicPulse'

// ─── Types ──────────────────────────────────────────────────────

interface SourceOption {
  source_type: string
  label: string
  description: string
  icon: string
  available_data_types: { data_type: string; label: string; estimated_count?: number }[]
  requires_auth: boolean
  auth_type?: string
}

interface FieldMapping {
  source: string
  target: string
  transform?: string
  confirmed?: boolean
}

interface SourceField {
  name: string
  type: string
  sample_values: string[]
  nullable: boolean
}

interface ValidationResult {
  valid: boolean
  total_rows: number
  warnings: { message: string; severity: string }[]
  errors: { message: string; severity: string }[]
  preview_rows: Record<string, unknown>[]
}

interface MigrationProgress {
  status: string
  total_records: number
  imported_count: number
  skipped_count: number
  error_count: number
  merged_count: number
  percent_complete: number
}

// ─── Props ──────────────────────────────────────────────────────

interface DataMigrationWizardProps {
  /** Portal API base URL */
  apiUrl: string
  /** Auth token for API calls */
  authToken: string
  /** Current project ID */
  projectId: string
  /** Current org ID */
  orgId: string
  /** Called when wizard completes or is skipped */
  onComplete?: (result: { imported: number; skipped: number; errors: number } | null) => void
  /** Called when user wants to skip */
  onSkip?: () => void
}

type WizardStep = 'source' | 'connect' | 'mapping' | 'preview' | 'importing' | 'complete'

// ─── Source icons ───────────────────────────────────────────────

const SOURCE_ICONS: Record<string, typeof FileSpreadsheet> = {
  csv: FileSpreadsheet,
  json: FileSpreadsheet,
  hubspot: Database,
  wordpress: Globe,
  mailchimp: Mail,
  shopify: ShoppingBag,
}

// ─── Component ──────────────────────────────────────────────────

export default function DataMigrationWizard({
  apiUrl,
  authToken,
  projectId,
  orgId,
  onComplete,
  onSkip,
}: DataMigrationWizardProps) {
  // Step state
  const [step, setStep] = useState<WizardStep>('source')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Source selection
  const [sources] = useState<SourceOption[]>([
    {
      source_type: 'csv',
      label: 'CSV / JSON File',
      description: 'Upload a file with your data',
      icon: 'file-spreadsheet',
      available_data_types: [
        { data_type: 'contacts', label: 'Contacts & Leads' },
        { data_type: 'blog_posts', label: 'Blog Posts' },
        { data_type: 'products', label: 'Products' },
      ],
      requires_auth: false,
      auth_type: 'file_upload',
    },
    {
      source_type: 'hubspot',
      label: 'HubSpot CRM',
      description: 'Import contacts, leads, and deals',
      icon: 'database',
      available_data_types: [
        { data_type: 'contacts', label: 'Contacts' },
        { data_type: 'deals', label: 'Deals' },
      ],
      requires_auth: true,
      auth_type: 'api_key',
    },
    {
      source_type: 'wordpress',
      label: 'WordPress',
      description: 'Import blog posts and pages',
      icon: 'globe',
      available_data_types: [
        { data_type: 'blog_posts', label: 'Blog Posts' },
      ],
      requires_auth: false,
      auth_type: 'api_key',
    },
    {
      source_type: 'mailchimp',
      label: 'Mailchimp',
      description: 'Import subscriber lists',
      icon: 'mail',
      available_data_types: [
        { data_type: 'subscribers', label: 'Subscribers' },
      ],
      requires_auth: true,
      auth_type: 'api_key',
    },
    {
      source_type: 'shopify',
      label: 'Shopify',
      description: 'Import products and inventory',
      icon: 'shopping-bag',
      available_data_types: [
        { data_type: 'products', label: 'Products' },
      ],
      requires_auth: true,
      auth_type: 'api_key',
    },
  ])

  const [selectedSource, setSelectedSource] = useState<SourceOption | null>(null)
  const [selectedDataType, setSelectedDataType] = useState<string>('')

  // Connection / upload
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Migration state
  const [migrationId, setMigrationId] = useState<string | null>(null)
  const [sourceSchema, setSourceSchema] = useState<SourceField[]>([])
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
  const [totalRecords, setTotalRecords] = useState(0)

  // Validation
  const [validation, setValidation] = useState<ValidationResult | null>(null)

  // Progress
  const [progress, setProgress] = useState<MigrationProgress | null>(null)
  const progressIntervalRef = useRef<number>(0)

  // ─── API helpers ────────────────────────────────────────────

  const apiFetch = useCallback(async (path: string, options?: RequestInit) => {
    const res = await fetch(`${apiUrl}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        ...options?.headers,
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        'x-project-id': projectId,
      },
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`API error ${res.status}: ${body}`)
    }
    return res.json()
  }, [apiUrl, authToken, projectId])

  // ─── Step handlers ──────────────────────────────────────────

  const handleSourceSelect = (source: SourceOption) => {
    setSelectedSource(source)
    setSelectedDataType(source.available_data_types[0]?.data_type || '')
    setError(null)
  }

  const handleSourceNext = () => {
    if (!selectedSource || !selectedDataType) {
      setError('Please select a source and data type')
      return
    }
    setStep('connect')
    setError(null)
  }

  const handleConnect = async () => {
    if (!selectedSource) return
    setIsLoading(true)
    setError(null)

    try {
      // Create migration job
      const migration = await apiFetch('/migrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_type: selectedSource.source_type,
          data_type: selectedDataType,
          credentials,
        }),
      })

      setMigrationId(migration.id)

      if (selectedSource.auth_type === 'file_upload' && uploadedFile) {
        // Upload file
        const formData = new FormData()
        formData.append('file', uploadedFile)
        const result = await apiFetch(`/migrations/${migration.id}/upload`, {
          method: 'POST',
          body: formData,
        })
        setSourceSchema(result.schema)
        setFieldMappings(result.auto_mappings)
        setTotalRecords(result.total_records)
      } else {
        // API source — detect schema
        const result = await apiFetch(`/migrations/${migration.id}/detect`, {
          method: 'POST',
        })
        setSourceSchema(result.schema)
        setFieldMappings(result.auto_mappings)
        setTotalRecords(result.total_records)
      }

      setStep('mapping')
    } catch (err: any) {
      setError(err.message || 'Connection failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMappingChange = (index: number, field: 'source' | 'target', value: string) => {
    setFieldMappings(prev => prev.map((m, i) =>
      i === index ? { ...m, [field]: value, confirmed: true } : m
    ))
  }

  const handleRemoveMapping = (index: number) => {
    setFieldMappings(prev => prev.filter((_, i) => i !== index))
  }

  const handleValidate = async () => {
    if (!migrationId) return
    setIsLoading(true)
    setError(null)

    try {
      // Save mappings
      await apiFetch(`/migrations/${migrationId}/mappings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: fieldMappings }),
      })

      // Validate
      const result = await apiFetch(`/migrations/${migrationId}/validate`, {
        method: 'POST',
      })
      setValidation(result)
      setStep('preview')
    } catch (err: any) {
      setError(err.message || 'Validation failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExecute = async () => {
    if (!migrationId) return
    setIsLoading(true)
    setError(null)

    try {
      await apiFetch(`/migrations/${migrationId}/execute`, { method: 'POST' })
      setStep('importing')

      // Poll progress
      progressIntervalRef.current = window.setInterval(async () => {
        try {
          const p = await apiFetch(`/migrations/${migrationId}/progress`)
          setProgress(p)
          if (p.status === 'completed' || p.status === 'failed') {
            clearInterval(progressIntervalRef.current)
            setStep('complete')
          }
        } catch {
          // Silently retry
        }
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Import failed')
    } finally {
      setIsLoading(false)
    }
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    }
  }, [])

  const handleComplete = () => {
    onComplete?.(progress ? {
      imported: progress.imported_count,
      skipped: progress.skipped_count,
      errors: progress.error_count,
    } : null)
  }

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="data-migration-wizard">
      <style>{`
        .data-migration-wizard {
          max-width: 560px;
          width: 100%;
          font-family: var(--font-sans, system-ui, sans-serif);
        }

        .dmw-card {
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(57, 191, 176, 0.12);
          border-radius: 16px;
          overflow: hidden;
        }

        .dmw-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .dmw-header-title {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.7);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .dmw-step-badge {
          font-size: 11px;
          color: #39bfb0;
          background: rgba(57, 191, 176, 0.1);
          padding: 3px 10px;
          border-radius: 100px;
        }

        .dmw-body {
          padding: 20px;
        }

        .dmw-source-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .dmw-source-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
          cursor: pointer;
          transition: all 0.15s;
        }
        .dmw-source-card:hover {
          border-color: rgba(57, 191, 176, 0.25);
          background: rgba(57, 191, 176, 0.04);
        }
        .dmw-source-card.selected {
          border-color: rgba(57, 191, 176, 0.4);
          background: rgba(57, 191, 176, 0.08);
          box-shadow: 0 0 20px rgba(57, 191, 176, 0.06);
        }

        .dmw-source-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(57, 191, 176, 0.1);
          color: #39bfb0;
        }

        .dmw-source-name {
          font-size: 14px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.85);
        }

        .dmw-source-desc {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.35);
          line-height: 1.4;
        }

        .dmw-data-types {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .dmw-data-type-chip {
          padding: 6px 14px;
          border-radius: 100px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          transition: all 0.15s;
          background: transparent;
        }
        .dmw-data-type-chip.active {
          border-color: #39bfb0;
          color: #39bfb0;
          background: rgba(57, 191, 176, 0.1);
        }

        .dmw-field-input {
          width: 100%;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.3);
          color: rgba(255, 255, 255, 0.8);
          font-size: 13px;
          outline: none;
          transition: border-color 0.15s;
        }
        .dmw-field-input:focus {
          border-color: rgba(57, 191, 176, 0.4);
        }
        .dmw-field-input::placeholder {
          color: rgba(255, 255, 255, 0.2);
        }

        .dmw-upload-zone {
          border: 2px dashed rgba(57, 191, 176, 0.2);
          border-radius: 12px;
          padding: 32px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.15s;
        }
        .dmw-upload-zone:hover {
          border-color: rgba(57, 191, 176, 0.4);
          background: rgba(57, 191, 176, 0.03);
        }
        .dmw-upload-zone.has-file {
          border-style: solid;
          border-color: rgba(57, 191, 176, 0.3);
          background: rgba(57, 191, 176, 0.05);
        }

        .dmw-mapping-row {
          display: grid;
          grid-template-columns: 1fr auto 1fr auto;
          gap: 8px;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }

        .dmw-mapping-arrow {
          color: rgba(57, 191, 176, 0.4);
        }

        .dmw-preview-table {
          width: 100%;
          font-size: 11px;
          border-collapse: collapse;
        }
        .dmw-preview-table th {
          text-align: left;
          padding: 8px 10px;
          color: rgba(57, 191, 176, 0.6);
          font-weight: 500;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          white-space: nowrap;
        }
        .dmw-preview-table td {
          padding: 6px 10px;
          color: rgba(255, 255, 255, 0.5);
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .dmw-progress-bar {
          height: 4px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.06);
          overflow: hidden;
        }
        .dmw-progress-fill {
          height: 100%;
          border-radius: 2px;
          background: linear-gradient(90deg, #39bfb0, #4dd4c5);
          transition: width 0.5s ease;
        }

        .dmw-stat {
          text-align: center;
          padding: 12px;
        }
        .dmw-stat-value {
          font-size: 24px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.9);
          font-variant-numeric: tabular-nums;
        }
        .dmw-stat-label {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.35);
          margin-top: 4px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .dmw-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .dmw-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 18px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all 0.15s;
        }
        .dmw-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .dmw-btn-primary {
          background: #39bfb0;
          color: #0a0a0f;
        }
        .dmw-btn-primary:hover:not(:disabled) {
          background: #4dd4c5;
        }
        .dmw-btn-ghost {
          background: transparent;
          color: rgba(255, 255, 255, 0.4);
        }
        .dmw-btn-ghost:hover:not(:disabled) {
          color: rgba(255, 255, 255, 0.7);
          background: rgba(255, 255, 255, 0.05);
        }

        .dmw-error {
          padding: 10px 14px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
          font-size: 12px;
          color: #ef4444;
          margin-bottom: 16px;
        }

        .dmw-warning {
          padding: 10px 14px;
          background: rgba(234, 179, 8, 0.1);
          border: 1px solid rgba(234, 179, 8, 0.2);
          border-radius: 8px;
          font-size: 12px;
          color: #eab308;
          display: flex;
          align-items: center;
          gap: 8px;
        }
      `}</style>

      <div className="dmw-card">
        {/* Header */}
        <div className="dmw-header">
          <span className="dmw-header-title">Data Import</span>
          <span className="dmw-step-badge">
            {step === 'source' && 'Select Source'}
            {step === 'connect' && 'Connect'}
            {step === 'mapping' && 'Map Fields'}
            {step === 'preview' && 'Preview'}
            {step === 'importing' && 'Importing...'}
            {step === 'complete' && 'Complete'}
          </span>
        </div>

        {/* Body */}
        <div className="dmw-body">
          {error && <div className="dmw-error">{error}</div>}

          {/* Step 1: Source Selection */}
          {step === 'source' && (
            <>
              <div className="dmw-source-grid">
                {sources.map(source => {
                  const Icon = SOURCE_ICONS[source.source_type] || FileSpreadsheet
                  return (
                    <div
                      key={source.source_type}
                      className={`dmw-source-card ${selectedSource?.source_type === source.source_type ? 'selected' : ''}`}
                      onClick={() => handleSourceSelect(source)}
                    >
                      <div className="dmw-source-icon">
                        <Icon size={16} />
                      </div>
                      <span className="dmw-source-name">{source.label}</span>
                      <span className="dmw-source-desc">{source.description}</span>
                    </div>
                  )
                })}
              </div>

              {selectedSource && (
                <div className="dmw-data-types">
                  {selectedSource.available_data_types.map(dt => (
                    <button
                      key={dt.data_type}
                      className={`dmw-data-type-chip ${selectedDataType === dt.data_type ? 'active' : ''}`}
                      onClick={() => setSelectedDataType(dt.data_type)}
                    >
                      {dt.label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Step 2: Connect / Upload */}
          {step === 'connect' && selectedSource && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {selectedSource.auth_type === 'file_upload' ? (
                // File upload
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.json,.tsv"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) setUploadedFile(f)
                    }}
                  />
                  <div
                    className={`dmw-upload-zone ${uploadedFile ? 'has-file' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.style.borderColor = 'rgba(57,191,176,0.5)'; e.currentTarget.style.background = 'rgba(57,191,176,0.06)' }}
                    onDragLeave={e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.style.borderColor = ''; e.currentTarget.style.background = '' }}
                    onDrop={e => {
                      e.preventDefault(); e.stopPropagation()
                      e.currentTarget.style.borderColor = ''; e.currentTarget.style.background = ''
                      const file = e.dataTransfer.files?.[0]
                      if (file) {
                        const ext = file.name.toLowerCase()
                        if (ext.endsWith('.csv') || ext.endsWith('.json') || ext.endsWith('.tsv')) {
                          setUploadedFile(file)
                        } else {
                          setError('Only CSV, TSV, and JSON files are accepted')
                        }
                      }
                    }}
                  >
                    {uploadedFile ? (
                      <>
                        <FileSpreadsheet size={24} color="#39bfb0" style={{ margin: '0 auto 8px' }} />
                        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 500 }}>
                          {uploadedFile.name}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 4 }}>
                          {(uploadedFile.size / 1024).toFixed(1)} KB — click to change
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload size={24} color="rgba(57,191,176,0.4)" style={{ margin: '0 auto 8px' }} />
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
                          Drop your file here or click to browse
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 4 }}>
                          CSV, TSV, or JSON — up to 50MB
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : selectedSource.source_type === 'wordpress' ? (
                // WordPress just needs a URL
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
                    WordPress Site URL
                  </label>
                  <input
                    className="dmw-field-input"
                    placeholder="https://yourblog.com"
                    value={credentials.site_url || ''}
                    onChange={e => setCredentials({ ...credentials, site_url: e.target.value })}
                  />
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 6 }}>
                    We'll fetch posts via the WordPress REST API. No login needed for public posts.
                  </div>
                </div>
              ) : (
                // API key
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
                    {selectedSource.label} API Key
                  </label>
                  <input
                    className="dmw-field-input"
                    type="password"
                    placeholder={`Paste your ${selectedSource.label} API key`}
                    value={credentials.api_key || ''}
                    onChange={e => setCredentials({ ...credentials, api_key: e.target.value })}
                  />
                  {selectedSource.source_type === 'shopify' && (
                    <div style={{ marginTop: 12 }}>
                      <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
                        Store Domain
                      </label>
                      <input
                        className="dmw-field-input"
                        placeholder="my-store.myshopify.com"
                        value={credentials.store_domain || ''}
                        onChange={e => setCredentials({ ...credentials, store_domain: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Field Mapping */}
          {step === 'mapping' && (
            <div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
                {totalRecords} records found. Review the field mappings below.
              </div>

              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {fieldMappings.map((mapping, i) => (
                  <div key={i} className="dmw-mapping-row">
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>
                      {mapping.source}
                    </div>
                    <ArrowRight size={14} className="dmw-mapping-arrow" />
                    <select
                      className="dmw-field-input"
                      value={mapping.target}
                      onChange={e => handleMappingChange(i, 'target', e.target.value)}
                      style={{ padding: '6px 8px', fontSize: 12 }}
                    >
                      <option value={mapping.target}>{mapping.target}</option>
                      <option value="">— skip —</option>
                    </select>
                    <button
                      onClick={() => handleRemoveMapping(i)}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: 4 }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {fieldMappings.length === 0 && (
                <div style={{ textAlign: 'center', padding: 24, color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                  No field mappings detected. Check your source data format.
                </div>
              )}

              {/* Add new mapping from unmapped source fields */}
              {sourceSchema.length > 0 && (() => {
                const mappedSources = new Set(fieldMappings.map(m => m.source))
                const unmapped = sourceSchema.filter(s => !mappedSources.has(s.name))
                if (unmapped.length === 0) return null
                return (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select
                        className="dmw-field-input"
                        style={{ flex: 1, padding: '6px 8px', fontSize: 12 }}
                        defaultValue=""
                        id="dmw-add-mapping-select"
                      >
                        <option value="" disabled>Add unmapped field...</option>
                        {unmapped.map(s => (
                          <option key={s.name} value={s.name}>
                            {s.name} ({s.type})
                          </option>
                        ))}
                      </select>
                      <button
                        className="dmw-btn dmw-btn-ghost"
                        style={{ padding: '6px 12px', fontSize: 12 }}
                        onClick={() => {
                          const select = document.getElementById('dmw-add-mapping-select') as HTMLSelectElement
                          if (select?.value) {
                            setFieldMappings(prev => [...prev, {
                              source: select.value,
                              target: select.value, // default target = same as source
                              confirmed: false,
                            }])
                            select.value = ''
                          }
                        }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Step 4: Preview & Validate */}
          {step === 'preview' && validation && (
            <div>
              {validation.errors.length > 0 && (
                <div className="dmw-error" style={{ marginBottom: 12 }}>
                  {validation.errors.map((e, i) => <div key={i}>{e.message}</div>)}
                </div>
              )}

              {validation.warnings.length > 0 && (
                <div className="dmw-warning" style={{ marginBottom: 12 }}>
                  <AlertTriangle size={14} />
                  <div>{validation.warnings.map(w => w.message).join('. ')}</div>
                </div>
              )}

              {validation.preview_rows.length > 0 && (
                <div style={{ overflowX: 'auto', marginBottom: 12 }}>
                  <table className="dmw-preview-table">
                    <thead>
                      <tr>
                        {Object.keys(validation.preview_rows[0]).map(key => (
                          <th key={key}>{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {validation.preview_rows.map((row, i) => (
                        <tr key={i}>
                          {Object.values(row).map((val, j) => (
                            <td key={j}>{val !== null ? String(val).slice(0, 50) : '—'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                {validation.total_rows} total records will be imported
              </div>
            </div>
          )}

          {/* Step 5: Importing */}
          {step === 'importing' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <FrequencyBars variant="processing" bars={13} height={40} label={
                progress
                  ? `${progress.percent_complete}% — ${progress.imported_count} imported`
                  : 'Starting import...'
              } />

              {progress && (
                <div style={{ marginTop: 20 }}>
                  <div className="dmw-progress-bar">
                    <div
                      className="dmw-progress-fill"
                      style={{ width: `${progress.percent_complete}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 6: Complete */}
          {step === 'complete' && progress && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
                <SonicPulse trigger={true} rings={3} size={120} />
                <div style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  width: 40, height: 40, borderRadius: '50%', background: 'rgba(57,191,176,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={20} color="#39bfb0" />
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
                marginTop: 8,
              }}>
                <div className="dmw-stat">
                  <div className="dmw-stat-value" style={{ color: '#39bfb0' }}>{progress.imported_count}</div>
                  <div className="dmw-stat-label">Imported</div>
                </div>
                <div className="dmw-stat">
                  <div className="dmw-stat-value">{progress.skipped_count}</div>
                  <div className="dmw-stat-label">Skipped</div>
                </div>
                <div className="dmw-stat">
                  <div className="dmw-stat-value" style={{ color: progress.error_count > 0 ? '#ef4444' : undefined }}>
                    {progress.error_count}
                  </div>
                  <div className="dmw-stat-label">Errors</div>
                </div>
              </div>

              {progress.status === 'failed' && (
                <div className="dmw-error" style={{ marginTop: 16 }}>
                  Import failed. Some records may have been partially imported.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="dmw-footer">
          <button
            className="dmw-btn dmw-btn-ghost"
            onClick={() => {
              if (step === 'source') {
                onSkip?.()
              } else if (step === 'complete') {
                handleComplete()
              } else {
                const prevSteps: Record<string, WizardStep> = {
                  connect: 'source',
                  mapping: 'connect',
                  preview: 'mapping',
                }
                setStep(prevSteps[step] || 'source')
              }
            }}
          >
            {step === 'source' ? (
              'Skip import'
            ) : step === 'complete' ? (
              'Done'
            ) : (
              <><ArrowLeft size={14} /> Back</>
            )}
          </button>

          {step === 'source' && (
            <button
              className="dmw-btn dmw-btn-primary"
              disabled={!selectedSource || !selectedDataType}
              onClick={handleSourceNext}
            >
              Continue <ArrowRight size={14} />
            </button>
          )}

          {step === 'connect' && (
            <button
              className="dmw-btn dmw-btn-primary"
              disabled={isLoading || (selectedSource?.auth_type === 'file_upload' && !uploadedFile)}
              onClick={handleConnect}
            >
              {isLoading ? <><Loader2 size={14} className="animate-spin" /> Connecting...</> : <>Connect & Scan <ArrowRight size={14} /></>}
            </button>
          )}

          {step === 'mapping' && (
            <button
              className="dmw-btn dmw-btn-primary"
              disabled={isLoading || fieldMappings.length === 0}
              onClick={handleValidate}
            >
              {isLoading ? <><Loader2 size={14} className="animate-spin" /> Validating...</> : <>Validate & Preview <ArrowRight size={14} /></>}
            </button>
          )}

          {step === 'preview' && validation && (
            <button
              className="dmw-btn dmw-btn-primary"
              disabled={isLoading || !validation.valid}
              onClick={handleExecute}
            >
              {isLoading ? <><Loader2 size={14} className="animate-spin" /> Starting...</> : <>Import {totalRecords} records <Check size={14} /></>}
            </button>
          )}

          {step === 'complete' && (
            <button className="dmw-btn dmw-btn-primary" onClick={handleComplete}>
              Continue <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
