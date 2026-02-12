/**
 * Managed Redirects - Next.js Middleware Helper
 * 
 * Fetches redirect rules from Uptrade Portal and applies them.
 * Can be used in middleware.ts for server-side redirects.
 * 
 * Usage in middleware.ts:
 * 
 * import { handleManagedRedirects } from '@uptrade/site-kit/redirects'
 * 
 * export async function middleware(request: NextRequest) {
 *   const redirect = await handleManagedRedirects(request, {
 *     domain: 'example.com',  // Your site's domain (without https://)
 *     portalApiUrl: process.env.PORTAL_API_URL || 'https://api.uptrademedia.com',
 *   })
 *   
 *   if (redirect) return redirect
 *   
 *   return NextResponse.next()
 * }
 */

import { NextRequest, NextResponse } from 'next/server'

export interface RedirectRule {
  from_path: string
  to_path: string
  redirect_type: '301' | '302' | '307' | '308'
  is_enabled: boolean
}

export interface RedirectConfig {
  domain: string  // Required: the domain to fetch redirects for
  portalApiUrl?: string
  cacheSeconds?: number
}

// Cache for redirect rules
let cachedRules: RedirectRule[] = []
let cacheExpiry = 0

/**
 * Fetch redirect rules from Portal API
 */
export async function fetchRedirectRules(config: RedirectConfig): Promise<RedirectRule[]> {
  const now = Date.now()
  const cacheSeconds = config.cacheSeconds ?? 300 // 5 min default

  // Return cached if still valid
  if (cachedRules.length > 0 && now < cacheExpiry) {
    return cachedRules
  }

  try {
    const baseUrl = config.portalApiUrl || 'https://api.uptrademedia.com'
    // Use domain-based lookup from public endpoint (no auth required)
    const domain = config.domain || ''
    const url = `${baseUrl}/api/public/seo/redirects?domain=${encodeURIComponent(domain)}`

    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: cacheSeconds },
    })

    if (!res.ok) {
      console.error(`[site-kit] Failed to fetch redirects: ${res.status}`)
      return cachedRules
    }

    const data = await res.json()
    cachedRules = (data.redirects || []).filter((r: RedirectRule) => r.is_enabled)
    cacheExpiry = now + (cacheSeconds * 1000)
    
    return cachedRules
  } catch (error) {
    console.error('[site-kit] Error fetching redirects:', error)
    return cachedRules
  }
}

/**
 * Handle managed redirects in middleware
 * Returns a NextResponse.redirect if a match is found, otherwise undefined
 */
export async function handleManagedRedirects(
  request: NextRequest,
  config: RedirectConfig,
): Promise<NextResponse | undefined> {
  const pathname = request.nextUrl.pathname
  
  // Skip for static assets and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // Has file extension
  ) {
    return undefined
  }

  const rules = await fetchRedirectRules(config)
  
  // Find matching redirect
  const match = rules.find(r => {
    // Exact match
    if (r.from_path === pathname) return true
    
    // Match with trailing slash variance
    const normalizedFrom = r.from_path.endsWith('/') 
      ? r.from_path.slice(0, -1) 
      : r.from_path
    const normalizedPath = pathname.endsWith('/') 
      ? pathname.slice(0, -1) 
      : pathname
    
    return normalizedFrom === normalizedPath
  })

  if (!match) {
    return undefined
  }

  // Build redirect URL
  const redirectUrl = new URL(match.to_path, request.url)
  
  // Preserve query params
  request.nextUrl.searchParams.forEach((value, key) => {
    redirectUrl.searchParams.set(key, value)
  })

  // Track hit (fire and forget)
  trackRedirectHit(config, match.from_path).catch(() => {})

  // Return redirect response
  const statusCode = parseInt(match.redirect_type) as 301 | 302 | 307 | 308
  return NextResponse.redirect(redirectUrl, statusCode)
}

/**
 * Track redirect hit for analytics
 */
async function trackRedirectHit(config: RedirectConfig, fromPath: string): Promise<void> {
  try {
    const baseUrl = config.portalApiUrl || 'https://api.uptrademedia.com'
    await fetch(`${baseUrl}/api/public/seo/redirects/hit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: config.domain, from_path: fromPath }),
    })
  } catch {
    // Ignore tracking errors
  }
}

/**
 * Generate Next.js redirects config from Portal
 * Use this in next.config.js for build-time redirects
 * 
 * Usage in next.config.js:
 * 
 * const { generateNextRedirects } = require('@uptrade/site-kit/redirects')
 * 
 * module.exports = {
 *   async redirects() {
 *     return generateNextRedirects({
 *       domain: 'example.com',
 *       portalApiUrl: process.env.PORTAL_API_URL,
 *     })
 *   }
 * }
 */
export async function generateNextRedirects(config: RedirectConfig): Promise<Array<{
  source: string
  destination: string
  permanent: boolean
}>> {
  const rules = await fetchRedirectRules({ ...config, cacheSeconds: 0 })
  
  return rules.map(r => ({
    source: r.from_path,
    destination: r.to_path,
    permanent: r.redirect_type === '301' || r.redirect_type === '308',
  }))
}

/**
 * Clear redirect cache (useful for development)
 */
export function clearRedirectCache(): void {
  cachedRules = []
  cacheExpiry = 0
}
