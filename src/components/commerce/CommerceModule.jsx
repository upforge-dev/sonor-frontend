// src/components/commerce/CommerceModuleWrapper.jsx
// Wrapper for embedding Commerce module in MainLayout
// MIGRATED TO REACT QUERY HOOKS - Jan 29, 2026

import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCommerceSettings } from '@/lib/hooks'
import useAuthStore from '@/lib/auth-store'
import CommerceDashboard from '@/pages/commerce/CommerceDashboard'

export default function CommerceModuleWrapper({ onNavigate }) {
  const { currentProject } = useAuthStore()
  // React Query hook - auto-fetches settings
  const { data: settings } = useCommerceSettings(currentProject?.id)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const path = location.pathname
    const offeringsMatch = path.match(/^\/commerce\/offerings\/([^/]+)(?:\/(edit))?$/)
    if (offeringsMatch) {
      const offeringId = offeringsMatch[1]
      const isEdit = offeringsMatch[2] === 'edit'
      const params = new URLSearchParams({
        view: 'offering',
        offeringId,
      })
      if (isEdit) {
        params.set('mode', 'edit')
      }
      navigate(`/commerce?${params.toString()}`, { replace: true })
      return
    }
    const invoicesNewMatch = path.match(/^\/commerce\/invoices\/new$/)
    if (invoicesNewMatch) {
      navigate('/commerce?view=sales&tab=invoices&invoiceCreate=1', { replace: true })
      return
    }
    const invoiceDetailMatch = path.match(/^\/commerce\/invoices\/([^/]+)$/)
    if (invoiceDetailMatch) {
      const invoiceId = invoiceDetailMatch[1]
      navigate(`/commerce?view=sales&tab=invoices&invoiceId=${invoiceId}`, { replace: true })
    }
  }, [location.pathname, navigate])

  return <div data-sonor-help="commerce/dashboard"><CommerceDashboard onNavigate={onNavigate} /></div>
}
