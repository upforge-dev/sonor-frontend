import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { SonorSpinner } from '@/components/SonorLoading'

const PortfolioList = lazy(() => import('./PortfolioList'))
const PortfolioEditor = lazy(() => import('./PortfolioEditor'))

export default function PortfolioModule() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <SonorSpinner size="lg" label="Loading portfolio..." />
      </div>
    }>
      <Routes>
        <Route index element={<PortfolioList />} />
        <Route path=":id" element={<PortfolioEditor />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </Suspense>
  )
}
