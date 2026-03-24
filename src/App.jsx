// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState, useRef, lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Protected from './components/Protected'
import { ThemeProvider } from './components/ThemeProvider'
import useAuthStore from './lib/auth-store'
import SonorLoading from './components/SonorLoading'
import { ErrorBoundary } from './components/ErrorBoundary'
import './App.css'

// Create a client with sensible defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Eager load critical routes (login, dashboard)
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'

// Lazy load less critical routes for code splitting
const MagicLogin = lazy(() => import('./pages/MagicLogin'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const AccountSetup = lazy(() => import('./pages/AccountSetup'))
const ProposalGate = lazy(() => import('./components/ProposalGate'))
const AuditGate = lazy(() => import('./components/AuditGate'))
const AuthCallback = lazy(() => import('./pages/AuthCallback'))
const SiteKitAuth = lazy(() => import('./pages/SiteKitAuth'))
const InvoicePayment = lazy(() => import('./pages/InvoicePayment'))

// Self-serve signup
const Signup = lazy(() => import('./pages/Signup'))

// Onboarding flow (full-screen Echo-guided, no sidebar)
const OnboardingFlow = lazy(() => import('./pages/OnboardingFlow'))

// Sync OAuth Callback (standalone route; main sync UI is in MainLayout via components/sync)
const SyncOAuthCallback = lazy(() => import('./pages/sync/SyncOAuthCallback'))

// Public signature install page (no auth)
const SignatureInstall = lazy(() => import('./pages/public/SignatureInstall'))

export default function App() {
  const { isAuthenticated, checkAuth, isLoading } = useAuthStore()
  const [initialized, setInitialized] = useState(false)
  const hasCheckedAuthRef = useRef(false)

  // Fade out the HTML loader when React is ready
  const hideInitialLoader = () => {
    const loader = document.getElementById('initial-loader')
    if (loader) {
      loader.classList.add('fade-out')
      // Remove from DOM after animation
      setTimeout(() => loader.remove(), 300)
    }
  }

  // Check authentication on app mount (only once).
  // When authenticated, preload the dashboard chunk so we don't show a second loader
  // (MainLayout's Suspense fallback) — one continuous loading state.
  useEffect(() => {
    if (hasCheckedAuthRef.current) return

    hasCheckedAuthRef.current = true

    const checkAuthOnce = async () => {
      // Safety timeout: never let the app hang on auth for more than 15 seconds
      const timeout = setTimeout(() => {
        console.warn('[App] Auth check timed out after 15s — proceeding without auth')
        setInitialized(true)
        requestAnimationFrame(() => hideInitialLoader())
      }, 15000)

      try {
        const result = await checkAuth()
        // If user is authenticated, preload the default dashboard module(s) so
        // MainLayout won't suspend and show a second loading state
        if (result?.success) {
          await Promise.all([
            import('./components/dashboard/DashboardModule'),
            import('./components/dashboard/RepDashboardModule'),
          ])
        }
      } catch (error) {
        console.error('[App] Error during initial auth check:', error)
      } finally {
        clearTimeout(timeout)
        setInitialized(true)
        requestAnimationFrame(() => hideInitialLoader())
      }
    }

    checkAuthOnce()
  }, [])

  // Don't show anything while initializing - the HTML loader is still visible
  if (!initialized) {
    return null
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router>
          <div className="h-full bg-[var(--surface-page)] transition-colors duration-300">
            <ErrorBoundary>
              <Suspense fallback={
                /* Dark void matching boot sequence — no spinner flash during lazy chunk loads */
                <div style={{ position: 'fixed', inset: 0, background: '#0a0a0f', zIndex: 50 }} />
              }>
                <Routes>
              <Route 
                path="/" 
                element={isAuthenticated ? <Protected><Dashboard /></Protected> : <Navigate to="/login" replace />} 
              />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth/site-kit" element={<SiteKitAuth />} />
              <Route path="/auth/magic" element={<MagicLogin />} />
              <Route path="/setup" element={<AccountSetup />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/p/:slug" element={<ProposalGate />} />
              <Route path="/audit/:id" element={<AuditGate />} />
              <Route path="/pay/:token" element={<InvoicePayment />} />
              <Route path="/sig/:slug" element={<SignatureInstall />} />
              
              {/* Onboarding — full-screen Echo-guided, no sidebar/header */}
              <Route path="/onboarding" element={<Protected><OnboardingFlow /></Protected>} />
              <Route path="/onboarding/:projectId" element={<Protected><OnboardingFlow /></Protected>} />

              {/* Sync OAuth Callback - must be standalone */}
              <Route path="/sync/callback" element={<SyncOAuthCallback />} />
              
              {/* ALL authenticated routes go through MainLayout for persistent sidebar/header */}
              <Route
                path="/*"
                element={
                  <Protected>
                    <Dashboard />
                  </Protected>
                }
              />

                </Routes>
              </Suspense>
            </ErrorBoundary>
        </div>
      </Router>
    </ThemeProvider>
    </QueryClientProvider>
  )
}
