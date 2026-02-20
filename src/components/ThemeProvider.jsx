import { useEffect } from 'react'
import useThemeStore from '@/lib/theme-store'
import useAuthStore from '@/lib/auth-store'

const DEFAULT_BRAND_PRIMARY = '#4bbf39'

function isValidHexColor(value) {
  return typeof value === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)
}

function normalizeHexColor(value, fallback) {
  if (!value) return fallback
  const trimmed = typeof value === 'string' ? value.trim() : ''
  if (!isValidHexColor(trimmed)) return fallback

  // Expand shorthand #abc => #aabbcc
  if (trimmed.length === 4) {
    const r = trimmed[1]
    const g = trimmed[2]
    const b = trimmed[3]
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return trimmed.toLowerCase()
}

function darkenHex(hex, amount = 0.14) {
  const normalized = normalizeHexColor(hex, DEFAULT_BRAND_PRIMARY)
  const r = parseInt(normalized.slice(1, 3), 16)
  const g = parseInt(normalized.slice(3, 5), 16)
  const b = parseInt(normalized.slice(5, 7), 16)

  const factor = Math.max(0, Math.min(1, 1 - amount))
  const nr = Math.round(r * factor)
  const ng = Math.round(g * factor)
  const nb = Math.round(b * factor)

  const toHex = (n) => n.toString(16).padStart(2, '0')
  return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`
}

function applyBrandVars({ primary }) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--brand-primary', primary)
  root.style.setProperty('--brand-primary-hover', darkenHex(primary, 0.18))
}

export function ThemeProvider({ children }) {
  const initTheme = useThemeStore((state) => state.initTheme)
  const currentOrg = useAuthStore((state) => state.currentOrg)
  const currentProject = useAuthStore((state) => state.currentProject)
  
  // Initialize theme on mount
  useEffect(() => {
    initTheme()
  }, [initTheme])

  // Apply brand colors as CSS vars (project > org > defaults)
  useEffect(() => {
    // Exclusions: keep these areas on Uptrade defaults.
    // - Proposals (/p/*)
    // - Audit pages (/audit*, /audits*)
    const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
    const isProposalRoute = pathname.startsWith('/p/')
    const isAuditRoute = pathname.startsWith('/audit') || pathname.startsWith('/audits')

    if (isProposalRoute || isAuditRoute) {
      applyBrandVars({ primary: DEFAULT_BRAND_PRIMARY })
      return
    }

    // Priority: project colors > org dedicated columns > legacy theme object > defaults
    // 1. Project columns: project.brand_primary (highest priority)
    // 2. Org columns: org.brand_primary
    // 3. Legacy theme object: org.theme.brandColor1, etc.
    // 4. Uptrade defaults
    const orgTheme = currentOrg?.theme || {}

    const primary = normalizeHexColor(
      // Project-level color takes highest priority
      currentProject?.brand_primary ||
      // Then org-level color
      currentOrg?.brand_primary ||
      // Then legacy theme object
      orgTheme.brandColor1 || orgTheme.primaryColor || orgTheme.primary,
      DEFAULT_BRAND_PRIMARY,
    )

    applyBrandVars({ primary })
  }, [currentOrg, currentProject])
  
  return children
}

// Theme toggle button component for convenience
export function ThemeToggle({ className = '' }) {
  const { resolvedTheme, toggleTheme, setTheme, theme } = useThemeStore()
  
  return (
    <button
      onClick={toggleTheme}
      className={`
        p-2 rounded-full transition-all duration-200
        hover:bg-[var(--glass-bg-hover)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]
        ${className}
      `}
      title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {resolvedTheme === 'dark' ? (
        // Sun icon for dark mode (click to go light)
        <svg 
          className="w-5 h-5 text-[var(--text-primary)]" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" 
          />
        </svg>
      ) : (
        // Moon icon for light mode (click to go dark)
        <svg 
          className="w-5 h-5 text-[var(--text-primary)]" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" 
          />
        </svg>
      )}
    </button>
  )
}

// Theme selector dropdown for settings pages
export function ThemeSelector({ className = '' }) {
  const { theme, setTheme } = useThemeStore()
  
  const options = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ]
  
  return (
    <div className={`flex gap-1 p-1 rounded-lg bg-[var(--glass-bg-inset)] ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => setTheme(option.value)}
          className={`
            px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200
            ${theme === option.value 
              ? 'bg-[var(--glass-bg-elevated)] text-[var(--text-primary)] shadow-sm' 
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export default ThemeProvider
