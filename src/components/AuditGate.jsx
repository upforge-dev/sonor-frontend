// src/components/AuditGate.jsx
// Public gate for magic link access to audits
// Uses Supabase Auth magic links (primary) with token validation fallback
// See MAGIC-LINK-AUTH.md for architecture details
import { useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import UptradeLoading from './UptradeLoading'
import AuditPublicView from './AuditPublicView'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { auditsApi } from '@/lib/portal-api'

// Error messages for better UX
const errorMessages = {
  'No access token provided': {
    title: 'Invalid Link',
    message: 'This link is missing the access token. Please use the link from your email.'
  },
  'Invalid token': {
    title: 'Access Denied',
    message: 'This link is not valid. Please request a new audit or contact support.'
  },
  'Token expired': {
    title: 'Link Expired',
    message: 'This link has expired (30 days). Please request a new audit to get a fresh link.'
  },
  'Audit not found': {
    title: 'Audit Not Found',
    message: 'This audit does not exist. It may have been deleted.'
  },
  'No session or token': {
    title: 'Authentication Required',
    message: 'Please use the link from your email to access this audit.'
  }
}

export default function AuditGate() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const [audit, setAudit] = useState(null)
  const [contact, setContact] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const authChecked = useRef(false)

  useEffect(() => {
    // Set up Supabase auth state listener
    // This handles magic link tokens in URL hash (#access_token=...)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuditGate] Auth state change:', event, !!session)
        
        if (event === 'SIGNED_IN' && session) {
          // Magic link worked - fetch audit with session
          await fetchAuditWithSession(session)
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Session refreshed, already have audit data
          console.log('[AuditGate] Token refreshed')
        }
      }
    )

    // Initial auth check
    checkAuthAndFetchAudit()

    return () => {
      subscription.unsubscribe()
    }
  }, [id])

  // Check for existing session or fallback token
  const checkAuthAndFetchAudit = async () => {
    // Prevent duplicate checks
    if (authChecked.current) return
    authChecked.current = true

    try {
      setIsLoading(true)
      setError(null)

      // Check session cache first (1 hour)
      const cacheKey = `audit_${id}`
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        try {
          const cachedData = JSON.parse(cached)
          if (Date.now() - cachedData._cachedAt < 3600000) {
            console.log('[AuditGate] Using cached audit data')
            setAudit(cachedData.audit)
            setContact(cachedData.contact)
            setIsLoading(false)
            return
          }
        } catch (e) {
          sessionStorage.removeItem(cacheKey)
        }
      }

      // PRIORITY 1: Check for token in query params (most reliable, 7-day expiration)
      const token = searchParams.get('token')
      if (token) {
        console.log('[AuditGate] Found token in query params, using token validation')
        await validateWithToken(token)
        return
      }

      // PRIORITY 2: Check if URL hash contains Supabase magic link tokens
      // These have only 1-hour expiration and require redirect URL whitelisting
      const hashHasTokens = window.location.hash.includes('access_token') || 
                            window.location.hash.includes('error_description')
      
      if (hashHasTokens) {
        console.log('[AuditGate] Magic link tokens in URL hash, letting Supabase process...')
        // Give Supabase a moment to process the hash tokens
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Check if auth succeeded after processing
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          console.log('[AuditGate] Session established from magic link')
          // Clean up the URL hash for better UX
          window.history.replaceState(null, '', window.location.pathname)
          await fetchAuditWithSession(session)
          return
        }
        
        // Check for auth errors in hash
        if (window.location.hash.includes('error_description')) {
          const errorMatch = window.location.hash.match(/error_description=([^&]+)/)
          const errorMsg = errorMatch ? decodeURIComponent(errorMatch[1]) : 'Authentication failed'
          console.error('[AuditGate] Magic link error:', errorMsg)
          // Don't show error - Supabase magic links are not our primary method
          // Just log it and fall through to check for token or session
          console.log('[AuditGate] Supabase magic link failed, checking other auth methods...')
        }
      }

      // Check for existing Supabase session (user already authenticated)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        console.log('[AuditGate] Found existing session')
        await fetchAuditWithSession(session)
        return
      }

      // No auth method available
      setError('No session or token')
      setIsLoading(false)

    } catch (err) {
      console.error('[AuditGate] Auth check failed:', err)
      setError('Failed to authenticate. Please try again.')
      setIsLoading(false)
    }
  }

  // Fetch audit using Supabase session
  const fetchAuditWithSession = async (session) => {
    try {
      console.log('[AuditGate] Fetching audit with session for user:', session.user?.email)
      
      // Call portal's audit-get-public function with session
      const response = await auditsApi.getPublic(id)
      const data = response.data
      
      // Cache for session
      const cacheKey = `audit_${id}`
      sessionStorage.setItem(cacheKey, JSON.stringify({
        audit: data.audit || data,
        contact: data.contact || data.audit?.contact || null,
        _cachedAt: Date.now()
      }))

      setAudit(data.audit || data)
      setContact(data.contact || data.audit?.contact || null)
      setIsLoading(false)

      // Track view (fire and forget)
      trackAuditView(id)

    } catch (err) {
      console.error('[AuditGate] Failed to fetch audit with session:', err)
      setError('Failed to load audit report. Please try again.')
      setIsLoading(false)
    }
  }

  // Fallback: Validate with legacy token via portal proxy
  const validateWithToken = async (token) => {
    try {
      const response = await auditsApi.getPublic(id, token)
      const data = response.data

      // Cache for session
      const cacheKey = `audit_${id}`
      sessionStorage.setItem(cacheKey, JSON.stringify({
        audit: data.audit || data,
        contact: data.contact || data.audit?.contact || null,
        _cachedAt: Date.now()
      }))

      setAudit(data.audit || data)
      setContact(data.contact || data.audit?.contact || null)
      setIsLoading(false)

      // Track view (fire and forget)
      trackAuditView(id)

    } catch (err) {
      console.error('[AuditGate] Token validation failed:', err)
      const message = err.response?.data?.error?.message || err.response?.data?.message
      setError(message || 'Failed to load audit report. Please try again.')
      setIsLoading(false)
    }
  }

  // Track audit view for analytics
  const trackAuditView = async (auditId) => {
    try {
      await auditsApi.trackView(auditId)
    } catch (err) {
      console.warn('[AuditGate] Failed to track view:', err)
    }
  }

  if (isLoading) {
    return <UptradeLoading message="Loading your audit report..." />
  }

  if (error || !audit) {
    const errorInfo = errorMessages[error] || {
      title: 'Unable to Load Audit',
      message: error || 'Audit not found'
    }
    
    return (
      <div className="min-h-screen bg-[var(--surface-page)] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-[var(--accent-red)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-[var(--accent-red)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
            {errorInfo.title}
          </h1>
          <p className="text-[var(--text-secondary)] mb-6">{errorInfo.message}</p>
          <a 
            href="https://sonor.io/free-audit/"
            className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white font-semibold rounded-xl hover:shadow-lg transition-all"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Request a New Audit
          </a>
        </div>
      </div>
    )
  }

  return <AuditPublicView audit={audit} contact={contact} />
}
