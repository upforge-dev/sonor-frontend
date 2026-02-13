// src/lib/supabase.js
// Re-exports the single Supabase client from supabase-auth.js
// to avoid creating multiple GoTrueClient instances.
//
// Note: Using implicit flow (not PKCE) because magic links generated via
// supabaseAdmin.auth.admin.generateLink() produce implicit flow tokens.
// PKCE requires client-initiated auth to generate code verifier/challenge pairs.

import { supabase } from './supabase-auth'

export { supabase }

/**
 * Helper function to get current user
 * @returns {Promise<{user: object | null, error: Error | null}>}
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

/**
 * Helper function to get current session
 * @returns {Promise<{session: object | null, error: Error | null}>}
 */
export async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

/**
 * Helper function to sign out
 * @returns {Promise<{error: Error | null}>}
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

/**
 * Helper function to check if user is authenticated
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated() {
  const { session } = await getCurrentSession()
  return !!session
}
