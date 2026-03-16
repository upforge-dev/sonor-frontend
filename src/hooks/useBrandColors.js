import { useMemo } from 'react'
import useAuthStore from '@/lib/auth-store'

const DEFAULT_BRAND_PRIMARY = '#4bbf39'
const DEFAULT_BRAND_ACCENT = '#10B981'

/**
 * Validates and normalizes a hex color
 */
function normalizeHexColor(value, fallback) {
  if (!value) return fallback
  const trimmed = typeof value === 'string' ? value.trim() : ''
  const isValid = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)
  if (!isValid) return fallback

  // Expand shorthand #abc => #aabbcc
  if (trimmed.length === 4) {
    const r = trimmed[1]
    const g = trimmed[2]
    const b = trimmed[3]
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return trimmed.toLowerCase()
}

/**
 * Darkens a hex color by a percentage
 * @param hex - Hex color string
 * @param amount - Amount to darken (0-1, default 0.14 = 14% darker)
 */
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

/**
 * Lightens a hex color by a percentage
 * @param hex - Hex color string
 * @param amount - Amount to lighten (0-1, default 0.25 = 25% lighter)
 */
function lightenHex(hex, amount = 0.25) {
  const normalized = normalizeHexColor(hex, DEFAULT_BRAND_PRIMARY)
  const r = parseInt(normalized.slice(1, 3), 16)
  const g = parseInt(normalized.slice(3, 5), 16)
  const b = parseInt(normalized.slice(5, 7), 16)

  const nr = Math.round(r + (255 - r) * amount)
  const ng = Math.round(g + (255 - g) * amount)
  const nb = Math.round(b + (255 - b) * amount)

  const toHex = (n) => n.toString(16).padStart(2, '0')
  return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`
}

/**
 * Converts hex to rgba string
 * @param hex - Hex color string
 * @param alpha - Opacity (0-1)
 */
function hexToRgba(hex, alpha = 1) {
  const normalized = normalizeHexColor(hex, DEFAULT_BRAND_PRIMARY)
  const r = parseInt(normalized.slice(1, 3), 16)
  const g = parseInt(normalized.slice(3, 5), 16)
  const b = parseInt(normalized.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Hook to access brand colors with auto-generated variants.
 * 
 * Priority order (project colors now take precedence):
 * 1. Project columns: project.brand_primary
 * 2. Organization columns: org.brand_primary, org.brand_accent
 * 3. Legacy theme object: org.theme.brandColor1, org.theme.primaryColor, etc.
 * 4. Sonor defaults
 *
 * @returns {Object} Brand colors with variants
 *
 * @example
 * const { primary, accent, primaryHover, primaryLight, rgba } = useBrandColors()
 *
 * <button style={{ backgroundColor: primary }}>
 * <div style={{ backgroundColor: rgba.primary10 }}>
 */
export function useBrandColors() {
  const currentOrg = useAuthStore((state) => state.currentOrg)
  const currentProject = useAuthStore((state) => state.currentProject)

  return useMemo(() => {
    const orgTheme = currentOrg?.theme || {}

    // Resolve colors with priority chain (project > org > legacy > defaults)
    const primary = normalizeHexColor(
      // 1. Project-level color (highest priority)
      currentProject?.brand_primary ||
      // 2. Org-level direct column
      currentOrg?.brand_primary ||
      // 3. Legacy org theme
      orgTheme.brandColor1 || orgTheme.primaryColor || orgTheme.primary,
      DEFAULT_BRAND_PRIMARY
    )

    const accent = normalizeHexColor(
      currentOrg?.brand_accent ||
      orgTheme.accentColor || orgTheme.accent,
      DEFAULT_BRAND_ACCENT
    )

    // Determine the source of colors for debugging/display
    const colorSource = currentProject?.brand_primary ? 'project' :
                        currentOrg?.brand_primary ? 'organization' :
                        (orgTheme.brandColor1 || orgTheme.primaryColor) ? 'legacy' : 'default'

    return {
      // Base colors
      primary,
      accent,

      // Hover variants (18% darker)
      primaryHover: darkenHex(primary, 0.18),
      accentHover: darkenHex(accent, 0.18),

      // Light variants (25% lighter)
      primaryLight: lightenHex(primary, 0.25),
      accentLight: lightenHex(accent, 0.25),

      // Dark variants (35% darker)
      primaryDark: darkenHex(primary, 0.35),
      accentDark: darkenHex(accent, 0.35),

      // RGBA variants for opacity overlays
      rgba: {
        primary10: hexToRgba(primary, 0.1),
        primary20: hexToRgba(primary, 0.2),
        primary30: hexToRgba(primary, 0.3),
        primary50: hexToRgba(primary, 0.5),
        accent10: hexToRgba(accent, 0.1),
        accent20: hexToRgba(accent, 0.2),
      },

      // Utility functions for custom values
      darken: darkenHex,
      lighten: lightenHex,
      toRgba: hexToRgba,

      // Defaults (for reference/fallback)
      defaults: {
        primary: DEFAULT_BRAND_PRIMARY,
        accent: DEFAULT_BRAND_ACCENT,
      },

      // Source info
      isCustom: !!(currentProject?.brand_primary || currentOrg?.brand_primary || orgTheme.brandColor1 || orgTheme.primaryColor),
      colorSource, // 'project' | 'organization' | 'legacy' | 'default'
      isProjectColor: !!currentProject?.brand_primary,
    }
  }, [currentOrg, currentProject])
}

export default useBrandColors
