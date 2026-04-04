/**
 * OAuth Popup Utility
 * 
 * Opens OAuth flows in popup windows instead of full page redirects.
 * The popup communicates back to the parent window via postMessage.
 */

const POPUP_WIDTH = 500
const POPUP_HEIGHT = 650

/**
 * Open an OAuth flow in a popup window
 * 
 * @param {string} url - The OAuth authorization URL
 * @param {string} name - Window name (used for targeting)
 * @returns {Promise<{success: boolean, connectionId?: string, error?: string}>}
 */
export function openOAuthPopup(url, name = 'oauth') {
  return new Promise((resolve, reject) => {
    const left = window.screenX + (window.outerWidth - POPUP_WIDTH) / 2
    const top = window.screenY + (window.outerHeight - POPUP_HEIGHT) / 2
    
    const features = [
      `width=${POPUP_WIDTH}`,
      `height=${POPUP_HEIGHT}`,
      `left=${left}`,
      `top=${top}`,
      'toolbar=no',
      'menubar=no',
      'scrollbars=yes',
      'resizable=yes',
    ].join(',')
    
    const popup = window.open(url, name, features)
    
    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site.'))
      return
    }
    
    popup.focus()
    let settled = false

    const handleResult = (data) => {
      if (settled) return
      if (data?.type === 'oauth-success') {
        settled = true
        cleanup()
        resolve({
          success: true,
          connectionId: data.connectionId,
          platform: data.platform,
          selectProperty: data.selectProperty,
          selectLocation: data.selectLocation,
        })
      } else if (data?.type === 'oauth-error') {
        settled = true
        cleanup()
        resolve({
          success: false,
          error: data.error || 'OAuth failed',
        })
      }
    }

    const handleMessage = (event) => {
      const allowedOrigins = [
        'http://localhost:3002',
        'https://api.sonor.io',
        window.location.origin,
      ]
      if (!allowedOrigins.includes(event.origin)) return
      handleResult(event.data)
    }

    // localStorage fallback — popup writes result when window.opener is lost
    const handleStorage = (event) => {
      if (event.key !== 'sonor-oauth-result' || !event.newValue) return
      try {
        handleResult(JSON.parse(event.newValue))
      } catch (_) {}
      try { localStorage.removeItem('sonor-oauth-result') } catch (_) {}
    }
    
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        if (!settled) {
          // Final localStorage check (storage event may not fire for same-tab writes)
          try {
            const stored = localStorage.getItem('sonor-oauth-result')
            if (stored) {
              handleResult(JSON.parse(stored))
              localStorage.removeItem('sonor-oauth-result')
              if (settled) return
            }
          } catch (_) {}
          cleanup()
          resolve({ success: false, error: 'OAuth window was closed' })
        }
      }
    }, 500)
    
    const cleanup = () => {
      window.removeEventListener('message', handleMessage)
      window.removeEventListener('storage', handleStorage)
      clearInterval(checkClosed)
      if (!popup.closed) popup.close()
    }
    
    // Clear any stale result before starting
    try { localStorage.removeItem('sonor-oauth-result') } catch (_) {}
    window.addEventListener('message', handleMessage)
    window.addEventListener('storage', handleStorage)
    
    setTimeout(() => {
      if (!settled) {
        cleanup()
        resolve({ success: false, error: 'OAuth timed out' })
      }
    }, 5 * 60 * 1000)
  })
}

/**
 * Initiate OAuth in a popup
 * 
 * @param {Object} options
 * @param {string} options.platform - Platform to connect (google, facebook, etc.)
 * @param {string} options.projectId - Project ID
 * @param {string[]} options.modules - Modules to enable
 * @param {string} options.connectionType - 'workspace' or 'business'
 * @param {Function} options.getOAuthUrl - Function to get OAuth URL from API
 * @returns {Promise<{success: boolean, connectionId?: string, error?: string}>}
 */
export async function initiateOAuthPopup({
  platform,
  projectId,
  modules,
  connectionType = 'business',
  getOAuthUrl,
}) {
  try {
    // Get the OAuth URL with popup mode
    const url = await getOAuthUrl({
      platform,
      projectId,
      modules,
      connectionType,
      popupMode: true,
    })
    
    // Open popup
    return await openOAuthPopup(url, `oauth-${platform}`)
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to initiate OAuth',
    }
  }
}
