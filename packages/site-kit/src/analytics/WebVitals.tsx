/**
 * @uptrade/site-kit/analytics - Web Vitals Component
 * 
 * Automatically reports Core Web Vitals via Portal API
 */

'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import type { Metric } from 'web-vitals'

interface WebVitalsProps {
  apiUrl?: string
  apiKey?: string
  debug?: boolean
}

function getApiConfig() {
  const apiUrl = typeof window !== 'undefined' 
    ? (window as any).__SITE_KIT_API_URL__ || 'https://api.uptrademedia.com'
    : 'https://api.uptrademedia.com'
  const apiKey = typeof window !== 'undefined' 
    ? (window as any).__SITE_KIT_API_KEY__
    : undefined
  return { apiUrl, apiKey }
}

export function WebVitals({ apiUrl: propApiUrl, apiKey: propApiKey, debug = false }: WebVitalsProps) {
  const pathname = usePathname()
  
  useEffect(() => {
    // Dynamic import to avoid SSR issues; catch ChunkLoadError (e.g. Turbopack dev)
    import('web-vitals').then(({ onCLS, onLCP, onTTFB, onINP, onFCP }) => {
      const vitals: Record<string, number> = {}
      let reported = false
      
      const reportVitals = async () => {
        if (reported) return
        if (Object.keys(vitals).length === 0) return
        
        reported = true
        
        const { apiUrl: globalApiUrl, apiKey: globalApiKey } = getApiConfig()
        const apiUrl = propApiUrl || globalApiUrl
        const apiKey = propApiKey || globalApiKey
        
        if (!apiKey) {
          if (debug) console.warn('[Analytics] No API key configured for Web Vitals')
          return
        }
        
        // Report each metric individually
        for (const [name, value] of Object.entries(vitals)) {
          const data = {
            pagePath: pathname,
            metricName: name,
            metricValue: value,
            metricRating: getRating(name, value),
          }
          
          if (debug) {
            console.log('[Analytics] Web Vital:', data)
          }
          
          try {
            await fetch(`${apiUrl}/api/public/analytics/web-vitals`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
              },
              body: JSON.stringify(data),
            })
          } catch (error) {
            if (debug) console.error('[Analytics] Error reporting Web Vital:', error)
          }
        }
      }
      
      // Collect vitals
      onLCP((metric: Metric) => {
        vitals.LCP = metric.value
        if (debug) console.log('[Analytics] LCP:', metric.value)
      })
      
      onCLS((metric: Metric) => {
        vitals.CLS = metric.value
        if (debug) console.log('[Analytics] CLS:', metric.value)
      })
      
      onTTFB((metric: Metric) => {
        vitals.TTFB = metric.value
        if (debug) console.log('[Analytics] TTFB:', metric.value)
      })
      
      onINP((metric: Metric) => {
        vitals.INP = metric.value
        if (debug) console.log('[Analytics] INP:', metric.value)
      })
      
      onFCP((metric: Metric) => {
        vitals.FCP = metric.value
        if (debug) console.log('[Analytics] FCP:', metric.value)
      })
      
      // Report on page hide (user leaving)
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          reportVitals()
        }
      }
      
      document.addEventListener('visibilitychange', handleVisibilityChange)
      
      // Also report after a delay as fallback
      const timeout = setTimeout(reportVitals, 10000)
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        clearTimeout(timeout)
      }
    }).catch((err) => {
      // ChunkLoadError in Turbopack/dev - Web Vitals are optional
      if (debug) console.warn('[Analytics] Web Vitals import failed:', err)
    })
  }, [pathname, propApiUrl, propApiKey, debug])
  
  return null
}

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds: Record<string, [number, number]> = {
    LCP: [2500, 4000],
    CLS: [0.1, 0.25],
    TTFB: [800, 1800],
    INP: [200, 500],
    FCP: [1800, 3000],
  }
  
  const [good, poor] = thresholds[name] || [0, 0]
  if (value <= good) return 'good'
  if (value <= poor) return 'needs-improvement'
  return 'poor'
}
