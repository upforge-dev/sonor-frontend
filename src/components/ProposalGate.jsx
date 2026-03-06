import { useParams } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { proposalsApi, getPortalApiUrl } from '@/lib/portal-api'
import UptradeLoading from './UptradeLoading'
import ProposalTemplate from './proposals/ProposalTemplate'

export default function ProposalGate() {
  const { slug } = useParams()
  const [proposal, setProposal] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const fetchAttempted = useRef(false)
  const viewIdRef = useRef(null)
  const viewStartedAtRef = useRef(null)

  useEffect(() => {
    fetchProposal()
  }, [slug])

  const sendViewTimeBeacon = () => {
    const viewId = viewIdRef.current
    const startedAt = viewStartedAtRef.current
    if (!viewId || !startedAt) return
    const timeOnPage = Math.round((Date.now() - startedAt) / 1000)
    if (timeOnPage < 1) return
    viewIdRef.current = null
    try {
      fetch(`${getPortalApiUrl()}/proposals/views/${viewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeOnPage }),
        keepalive: true,
      }).catch(() => {})
    } catch {
      // Ignore
    }
  }

  useEffect(() => {
    const handleExit = () => sendViewTimeBeacon()
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

  const fetchProposal = async () => {
    if (fetchAttempted.current) return
    fetchAttempted.current = true

    try {
      setIsLoading(true)
      setError(null)

      const response = await proposalsApi.getBySlug(slug)

      const data = response.data
      const proposalData = data?.proposal ?? data
      if (proposalData?.id) {
        setProposal(proposalData)
        viewIdRef.current = data?.viewId ?? null
        viewStartedAtRef.current = Date.now()
      } else {
        setError('Proposal not found')
      }
    } catch (err) {
      console.error('[ProposalGate] Failed to fetch proposal:', err)
      const raw = err.response?.data?.error
      const message = typeof raw === 'object' && raw !== null && 'message' in raw
        ? String(raw.message)
        : typeof raw === 'string'
          ? raw
          : 'Failed to load proposal'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

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

  // Pass isPublicView=true since this is the client-facing route
  // Clients should always see the signature section
  return <ProposalTemplate proposal={proposal} proposalSlug={slug} isPublicView={true} />
}
