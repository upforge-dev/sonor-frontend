/**
 * useTour — Tour state management hook.
 *
 * Manages the lifecycle of a module walkthrough:
 *   1. Detects `?tour=1` query param on navigation
 *   2. Resolves the module from the current route
 *   3. Loads the tour step config
 *   4. Tracks current step, navigation, completion
 *   5. Persists completed tours so they don't repeat
 *
 * Usage in MainLayout:
 *   const tour = useTour()
 *   // tour.isActive, tour.steps, tour.currentStep, tour.next(), tour.prev(), tour.close()
 *   // {tour.isActive && <TourOverlay ... />}
 */

import { useState, useCallback, useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { getModuleTour, type ModuleTour } from '@/components/tour/tour-steps'

const COMPLETED_TOURS_KEY = 'sonor_completed_tours'
const TOUR_PARAM = 'tour'

function getCompletedTours(): Set<string> {
  try {
    const raw = localStorage.getItem(COMPLETED_TOURS_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function markTourCompleted(moduleKey: string) {
  const completed = getCompletedTours()
  completed.add(moduleKey)
  localStorage.setItem(COMPLETED_TOURS_KEY, JSON.stringify([...completed]))
}

/** Resolve which module the current path belongs to */
function resolveModuleFromPath(pathname: string): string | null {
  // Strip leading slash and take first segment
  const segments = pathname.replace(/^\/+/, '').split('/')
  const first = segments[0]

  // Map path segments to module keys
  const pathToModule: Record<string, string> = {
    seo: 'seo',
    analytics: 'analytics',
    crm: 'crm',
    clients: 'crm',
    prospects: 'crm',
    engage: 'engage',
    forms: 'forms',
    blog: 'blog',
    commerce: 'commerce',
    reputation: 'reputation',
    broadcast: 'broadcast',
    sync: 'sync',
    signal: 'signal',
    website: 'website',
    outreach: 'outreach',
    affiliates: 'affiliates',
  }

  return pathToModule[first] || null
}

export interface UseTourReturn {
  /** Whether a tour is currently active */
  isActive: boolean
  /** The current module tour config */
  tour: ModuleTour | null
  /** Current step index */
  currentStep: number
  /** Module name for display */
  moduleName: string
  /** Advance to next step (or close if last) */
  next: () => void
  /** Go back one step */
  prev: () => void
  /** Close the tour */
  close: () => void
  /** Programmatically start a tour for a module */
  startTour: (moduleKey: string) => void
  /** Check if a module tour has been completed */
  isCompleted: (moduleKey: string) => boolean
  /** Reset all completed tours */
  resetAll: () => void
}

export function useTour(): UseTourReturn {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [activeTour, setActiveTour] = useState<ModuleTour | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [isActive, setIsActive] = useState(false)
  // Detect ?tour=1 from URL
  useEffect(() => {
    if (searchParams.get(TOUR_PARAM) === '1' && !isActive) {
      const moduleKey = resolveModuleFromPath(location.pathname)
      if (moduleKey) {
        const tour = getModuleTour(moduleKey)
        if (tour) {
          // Remove ?tour=1 from URL without navigation
          const newParams = new URLSearchParams(searchParams)
          newParams.delete(TOUR_PARAM)
          setSearchParams(newParams, { replace: true })

          // Start the tour after a brief delay for the module to render
          setTimeout(() => {
            setActiveTour(tour)
            setCurrentStep(0)
            setIsActive(true)
          }, 500)
        }
      }
    }
  }, [searchParams, location.pathname, isActive, setSearchParams])

  const close = useCallback(() => {
    if (activeTour) {
      markTourCompleted(activeTour.module)
    }
    setIsActive(false)
    setActiveTour(null)
    setCurrentStep(0)
  }, [activeTour])

  const next = useCallback(() => {
    if (!activeTour) return
    if (currentStep >= activeTour.steps.length - 1) {
      // Last step — complete
      close()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }, [activeTour, currentStep, close])

  const prev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const startTour = useCallback((moduleKey: string) => {
    const tour = getModuleTour(moduleKey)
    if (!tour) return

    // Navigate to the module first if not already there
    const currentModule = resolveModuleFromPath(location.pathname)
    if (currentModule !== moduleKey) {
      navigate(tour.path)
      // Start tour after navigation completes
      setTimeout(() => {
        setActiveTour(tour)
        setCurrentStep(0)
        setIsActive(true)
      }, 600)
    } else {
      setActiveTour(tour)
      setCurrentStep(0)
      setIsActive(true)
    }
  }, [location.pathname, navigate])

  const isCompleted = useCallback((moduleKey: string) => {
    return getCompletedTours().has(moduleKey)
  }, [])

  const resetAll = useCallback(() => {
    localStorage.removeItem(COMPLETED_TOURS_KEY)
  }, [])

  return {
    isActive,
    tour: activeTour,
    currentStep,
    moduleName: activeTour?.name || '',
    next,
    prev,
    close,
    startTour,
    isCompleted,
    resetAll,
  }
}
