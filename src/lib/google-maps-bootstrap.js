/**
 * Single Google Maps JS bootstrap per page + API key (deduped for React Strict Mode).
 * Uses loading=async + v=weekly. Load feature libs via google.maps.importLibrary().
 */

const SCRIPT_SELECTOR = 'script[src*="maps.googleapis.com/maps/api/js"]'

/** @type {Map<string, Promise<void>>} */
const pendingByKey = new Map()

function isMapsReady() {
  return typeof window !== 'undefined' && !!window.google?.maps?.Map
}

/** Resolve when Map is usable (importLibrary('maps') if needed on weekly channel). */
async function ensureCoreMapsLoaded() {
  if (isMapsReady()) return
  if (window.google?.maps?.importLibrary) {
    await window.google.maps.importLibrary('maps')
  }
}

async function waitForGoogleMapsReady(timeoutMs = 25000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (isMapsReady()) return
    if (window.google?.maps?.importLibrary) {
      try {
        await window.google.maps.importLibrary('maps')
      } catch {
        /* still booting */
      }
    }
    if (isMapsReady()) return
    await new Promise((r) => setTimeout(r, 50))
  }
  throw new Error('Google Maps load timeout')
}

/**
 * @param {string} apiKey
 * @returns {Promise<boolean>}
 */
export function ensureGoogleMapsBootstrap(apiKey) {
  if (typeof window === 'undefined' || !apiKey) return Promise.resolve(false)
  if (isMapsReady()) return Promise.resolve(true)

  let existing = pendingByKey.get(apiKey)
  if (existing) {
    return existing.then(() => true).catch(() => false)
  }

  let resolveBootstrap
  let rejectBootstrap
  const p = new Promise((resolve, reject) => {
    resolveBootstrap = resolve
    rejectBootstrap = reject
  })
  pendingByKey.set(apiKey, p)

  const finish = (ok) => {
    if (ok) {
      pendingByKey.delete(apiKey)
      resolveBootstrap()
    } else {
      pendingByKey.delete(apiKey)
      rejectBootstrap(new Error('Google Maps bootstrap failed'))
    }
  }

  ;(async () => {
    try {
      const scriptEl = document.querySelector(SCRIPT_SELECTOR)
      if (scriptEl) {
        await waitForGoogleMapsReady()
        await ensureCoreMapsLoaded()
        finish(true)
        return
      }

      if (isMapsReady()) {
        finish(true)
        return
      }

      const callbackName = `__sonorGmaps_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
      window[callbackName] = async () => {
        try {
          delete window[callbackName]
        } catch {
          /* ignore */
        }
        try {
          await ensureCoreMapsLoaded()
          finish(true)
        } catch {
          finish(false)
        }
      }

      const params = new URLSearchParams({
        key: apiKey,
        v: 'weekly',
        loading: 'async',
        callback: callbackName,
      })
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`
      script.async = true
      script.dataset.sonorGoogleMaps = '1'
      script.onerror = () => {
        try {
          delete window[callbackName]
        } catch {
          /* ignore */
        }
        finish(false)
      }
      document.head.appendChild(script)
    } catch {
      finish(false)
    }
  })()

  return p.then(() => true).catch(() => false)
}

/**
 * @param {string} name maps, marker, places, visualization, etc.
 * @returns {Promise<unknown>}
 */
export function importGoogleMapsLibrary(name) {
  if (!window.google?.maps?.importLibrary) {
    return Promise.reject(new Error('google.maps.importLibrary not available'))
  }
  return window.google.maps.importLibrary(name)
}
