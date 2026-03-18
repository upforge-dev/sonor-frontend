// src/components/forms/FormsModule.jsx
// Forms Module Router - handles all /forms/* routes
// Unified module for forms, submissions, analytics, and settings.
// Renders inside MainLayout (do not wrap in MainLayout again).

import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import UptradeLoading from '@/components/UptradeLoading'

// Lazy load forms pages
const FormsDashboard = lazy(() => import('@/pages/forms/FormsDashboard'))
const FormDetail = lazy(() => import('@/pages/forms/FormDetail'))
const FormCreate = lazy(() => import('@/pages/forms/FormCreate'))
const FormEdit = lazy(() => import('@/pages/forms/FormEdit'))
const SubmissionDetail = lazy(() => import('@/pages/forms/SubmissionDetail'))

export default function FormsModule() {
  return (
    <Suspense fallback={<UptradeLoading />}>
      <div data-sonor-help="forms/dashboard" className="contents">
      <Routes>
        {/* Dashboard - main forms view */}
        <Route index element={<FormsDashboard />} />

        {/* Form management */}
        <Route path="new" element={<FormCreate />} />
        <Route path=":id" element={<FormDetail />} />
        <Route path=":id/edit" element={<FormEdit />} />

        {/* Submission detail */}
        <Route path="submissions/:id" element={<SubmissionDetail />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/forms" replace />} />
      </Routes>
      </div>
    </Suspense>
  )
}
