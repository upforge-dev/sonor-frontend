import { useParams } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { proposalsApi, getPortalApiUrl } from '@/lib/sonor-api'
import UptradeLoading from './UptradeLoading'
import ProposalTemplate from './proposals/ProposalTemplate'

export default function ProposalGate() {
  const { slug } = useParams()
  const [proposal, setProposal] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const viewIdRef = useRef(null)
  const viewStartedAtRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setIsLoading(true)
      setError(null)
      setProposal(null)
      viewIdRef.current = null
      viewStartedAtRef.current = null

      try {
        const response = await proposalsApi.getBySlug(slug)
        if (cancelled) return

        const data = response.data
        const pendingPath = data?.pendingPaymentPath
        if (pendingPath && typeof pendingPath === 'string' && pendingPath.startsWith('/')) {
          window.location.replace(`${window.location.origin}${pendingPath}`)
          return
        }

        const proposalData = data?.proposal ?? data
        if (proposalData?.id) {
          setProposal(proposalData)
          viewIdRef.current = data?.viewId ?? null
          viewStartedAtRef.current = Date.now()
        } else {
          setError('Proposal not found')
        }
      } catch (err) {
        if (cancelled) return
        console.error('[ProposalGate] Failed to fetch proposal:', err)
        const raw = err.response?.data?.error
        const message = typeof raw === 'object' && raw !== null && 'message' in raw
          ? String(raw.message)
          : typeof raw === 'string'
            ? raw
            : 'Failed to load proposal'
        setError(message)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [slug])

  const sendViewTimeBeacon = (clearRefs = false) => {
    const viewId = viewIdRef.current
    const startedAt = viewStartedAtRef.current
    if (!viewId || !startedAt) return
    const timeOnPage = Math.round((Date.now() - startedAt) / 1000)
    if (clearRefs) viewIdRef.current = null
    try {
      fetch(`${getPortalApiUrl()}/proposals/views/${viewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeOnPage }),
        keepalive: true,
        credentials: 'include',
      }).catch((err) => {
        if (import.meta.env?.DEV) {
          console.warn('[ProposalGate] View time update failed', err)
        }
      })
    } catch (err) {
      if (import.meta.env?.DEV) {
        console.warn('[ProposalGate] View time beacon error', err)
      }
    }
  }

  useEffect(() => {
    const handleExit = () => sendViewTimeBeacon(true)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') handleExit()
    }
    window.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', handleExit)
    return () => {
      window.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', handleExit)
      handleExit()
    }
  }, [])

  useEffect(() => {
    const viewId = viewIdRef.current
    const startedAt = viewStartedAtRef.current
    if (!viewId || !startedAt) return
    const interval = setInterval(() => {
      sendViewTimeBeacon(false)
    }, 20_000)
    return () => clearInterval(interval)
  }, [proposal?.id])

  if (isLoading) {
    return <UptradeLoading />
  }

  if (error || !proposal) {
    const message = typeof error === 'string' ? error : (error?.message ?? 'Proposal not found')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Unable to Load Proposal</h1>
          <p className="text-gray-600 mb-4">{message}</p>
        </div>
      </div>
    )
  }

  return <ProposalTemplate proposal={proposal} proposalSlug={slug} isPublicView={true} />
}
