/**
 * ManagedFavicon Component
 * 
 * Server component that renders favicon link tags using the project's logo.
 * When a logo is uploaded in Project Settings, it's automatically synced
 * to the 'favicon' slot in site_managed_images.
 * 
 * Usage:
 * ```tsx
 * import { ManagedFavicon } from '@uptrade/site-kit/images'
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <head>
 *         <ManagedFavicon />
 *       </head>
 *       <body>{children}</body>
 *     </html>
 *   )
 * }
 * ```
 * 
 * Supports:
 * - SVG favicons (best for modern browsers, scales perfectly)
 * - PNG favicons with multiple sizes
 * - Apple touch icons
 * - Theme color for mobile browsers
 */

import React from 'react'

export interface ManagedFaviconProps {
  /**
   * API key for Portal API authentication
   * Defaults to NEXT_PUBLIC_UPTRADE_API_KEY env var
   */
  apiKey?: string
  
  /**
   * API URL (defaults to https://api.uptrademedia.com)
   */
  apiUrl?: string
  
  /**
   * Fallback favicon URL if no managed favicon is set
   */
  fallback?: string
  
  /**
   * Theme color for mobile browser chrome
   * Defaults to #4bbf39 (Uptrade brand primary)
   */
  themeColor?: string
}

interface FaviconData {
  public_url?: string
  mime_type?: string
  is_placeholder?: boolean
}

/**
 * Server-side fetch of favicon data
 */
async function fetchFaviconData(apiUrl: string, apiKey: string): Promise<FaviconData | null> {
  try {
    const res = await fetch(`${apiUrl}/public/images/slot/favicon`, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      next: { revalidate: 3600 }, // Cache 1hr – favicon rarely changes, allows static generation
    })

    if (!res.ok) {
      console.warn('[ManagedFavicon] Failed to fetch:', res.status)
      return null
    }

    const data = await res.json()
    if (data.image && !data.is_placeholder) {
      return {
        public_url: data.image.public_url || data.image.external_url,
        mime_type: data.image.file?.mime_type,
        is_placeholder: false,
      }
    }
    return null
  } catch (err) {
    console.error('[ManagedFavicon] Error fetching favicon:', err)
    return null
  }
}

export async function ManagedFavicon({
  apiKey = process.env.NEXT_PUBLIC_UPTRADE_API_KEY,
  apiUrl = process.env.NEXT_PUBLIC_UPTRADE_API_URL || 'https://api.uptrademedia.com',
  fallback = '/favicon.ico',
  themeColor = '#4bbf39',
}: ManagedFaviconProps) {
  // Fetch favicon data during SSR
  const faviconData = apiKey && apiUrl ? await fetchFaviconData(apiUrl, apiKey) : null
  
  const faviconUrl = faviconData?.public_url || fallback
  const mimeType = faviconData?.mime_type || 'image/x-icon'
  const isSvg = mimeType === 'image/svg+xml' || faviconUrl.endsWith('.svg')

  return (
    <>
      {/* Primary favicon */}
      {isSvg ? (
        <link rel="icon" type="image/svg+xml" href={faviconUrl} />
      ) : (
        <>
          <link rel="icon" type="image/png" sizes="32x32" href={faviconUrl} />
          <link rel="icon" type="image/png" sizes="16x16" href={faviconUrl} />
        </>
      )}
      
      {/* Apple touch icon (for iOS home screen) */}
      <link rel="apple-touch-icon" sizes="180x180" href={faviconUrl} />
      
      {/* Theme color for mobile browsers */}
      <meta name="theme-color" content={themeColor} />
    </>
  )
}