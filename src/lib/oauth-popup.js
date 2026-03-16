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
    // Calculate center position
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
    
    // Focus the popup
    popup.focus()
    
    // Listen for messages from the popup
    const handleMessage = (event) => {
      // Verify origin matches our API
      const allowedOrigins = [
        'http://localhost:3002',
        'https://api.sonor.io',
        window.location.origin,
      ]
      
      if (!allowedOrigins.includes(event.origin)) {
        return
      }
      
      if (event.data?.type === 'oauth-success') {
        cleanup()
        resolve({
          success: true,
          connectionId: event.data.connectionId,
          platform: event.data.platform,
          selectProperty: event.data.selectProperty,
          selectLocation: event.data.selectLocation,
        })
      } else if (event.data?.type === 'oauth-error') {
        cleanup()
        resolve({
          success: false,
          error: event.data.error || 'OAuth failed',
        })
      }
    }
    
    // Check if popup was closed without completing
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        cleanup()
        resolve({
          success: false,
          error: 'OAuth window was closed',
        })
      }
    }, 500)
    
    const cleanup = () => {
      window.removeEventListener('message', handleMessage)
      clearInterval(checkClosed)
      if (!popup.closed) {
        popup.close()
      }
    }
    
    window.addEventListener('message', handleMessage)
    
    // Timeout after 5 minutes
    setTimeout(() => {
      cleanup()
      resolve({
        success: false,
        error: 'OAuth timed out',
      })
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
