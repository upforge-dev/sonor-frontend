// src/components/engage/EngageModule.jsx
// Engage Module Router - handles all /engage/* routes
// Unified module for popups, banners, nudges, toasts, and chat

import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import UptradeLoading from '@/components/UptradeLoading'

// Lazy load engage pages
const EngageDashboard = lazy(() => import('@/pages/engage/EngageDashboard'))

// Studio is NOT lazy loaded - single bundle for snappy experience
// Prefetch happens on hover in sidebar
// Using the new Design Studio (formerly at pages/engage/EngageStudio.jsx)
import EngageStudio from '@/pages/engage/EngageStudio'

export default function EngageModule() {
  return (
    <Suspense fallback={<UptradeLoading />}>
      <div data-sonor-help="engage/dashboard" className="contents">
      <Routes>
        {/* Design Studio - full-screen editor (not wrapped in MainLayout) */}
        <Route path="/studio/:id" element={<EngageStudio />} />
        <Route path="/studio" element={<Navigate to="/engage" replace />} />

        {/* Dashboard with embedded views */}
        <Route path="/*" element={<EngageDashboard />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/engage" replace />} />
      </Routes>
      </div>
    </Suspense>
  )
}
