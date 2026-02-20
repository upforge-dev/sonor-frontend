/**
 * Site-Kit Auth Page
 * 
 * This page is opened in a popup from the Site-Kit Setup Wizard.
 * It leverages the existing Supabase session (Google OAuth, email, etc.)
 * and sends the token back to the opener via postMessage.
 */
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function SiteKitAuth() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'checking' | 'success' | 'login-required' | 'error'>('checking')
  const [error, setError] = useState<string | null>(null)
  
  const callbackOrigin = searchParams.get('callback') || ''

  useEffect(() => {
    checkSessionAndNotify()
  }, [])

  async function checkSessionAndNotify() {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Session error:', sessionError)
        setStatus('error')
        setError(sessionError.message)
        return
      }

      if (!session) {
        setStatus('login-required')
        return
      }

      // We have a valid session! Send the token back to the opener
      const token = session.access_token
      const email = session.user?.email

      if (window.opener) {
        // Send message to the opener (site-kit wizard)
        window.opener.postMessage({
          type: 'uptrade-auth-success',
          accessToken: token,
          email: email
        }, callbackOrigin || '*')
        
        setStatus('success')
        
        // Close this popup after a brief moment
        setTimeout(() => {
          window.close()
        }, 1500)
      } else {
        // No opener - this page was opened directly
        setError('This page should be opened from the Site-Kit Setup Wizard')
        setStatus('error')
      }
    } catch (err) {
      console.error('Auth check error:', err)
      setStatus('error')
      setError((err as Error).message)
    }
  }

  async function handleGoogleLogin() {
    const redirectUrl = `${window.location.origin}/auth/site-kit?callback=${encodeURIComponent(callbackOrigin)}`
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    })
    
    if (error) {
      setError(error.message)
      setStatus('error')
    }
  }

  function handleCancel() {
    if (window.opener) {
      window.opener.postMessage({
        type: 'uptrade-auth-error',
        message: 'User cancelled authentication'
      }, callbackOrigin || '*')
    }
    window.close()
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Sonor</h1>
          <p className="text-gray-400">Site-Kit Authentication</p>
        </div>

        {status === 'checking' && (
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Checking your session...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Connected!</h2>
            <p className="text-gray-400">This window will close automatically...</p>
          </div>
        )}

        {status === 'login-required' && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-gray-400 mb-6">
                Sign in to connect your Site-Kit project
              </p>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <div className="text-center">
              <button
                onClick={handleCancel}
                className="text-gray-500 hover:text-gray-300 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={handleCancel}
              className="text-blue-400 hover:underline"
            >
              Close Window
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
