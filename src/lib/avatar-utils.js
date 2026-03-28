import { supabase } from '@/lib/supabase-auth'

/** Supabase Storage bucket for user avatars (create in Dashboard: Storage → New bucket → name: avatars, public: true). */
export const AVATARS_BUCKET = 'avatars'

/** Supabase Storage bucket for custom portal background images (create in Dashboard: Storage → New bucket → name: user-backgrounds, public: true). One file per user: {authUserId}/background.{ext} */
export const USER_BACKGROUNDS_BUCKET = 'user-backgrounds'

/**
 * Fetch Google avatar URL, upload blob directly to Supabase Storage (no base64), return public URL or null.
 */
export async function uploadGoogleAvatarToStorage(googlePictureUrl, authUserId) {
  if (!googlePictureUrl) return null
  try {
    const res = await fetch(googlePictureUrl, { mode: 'cors' })
    if (!res.ok) return null
    const blob = await res.blob()
    const ext = blob.type === 'image/png' ? 'png' : 'jpg'
    const path = `${authUserId}.${ext}`
    const { error } = await supabase.storage.from(AVATARS_BUCKET).upload(path, blob, {
      contentType: blob.type || 'image/jpeg',
      upsert: true,
    })
    if (error) {
      console.warn('[avatar-utils] Avatar storage upload failed:', error.message)
      return null
    }
    const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path)
    return data?.publicUrl ?? null
  } catch (e) {
    console.warn('[avatar-utils] Avatar fetch/upload failed:', e)
    return null
  }
}

/**
 * Upload a File (from input) directly to Supabase Storage (no base64), return public URL or null.
 */
export async function uploadAvatarFileToStorage(file, authUserId) {
  if (!file?.type?.startsWith('image/')) return null
  try {
    const ext = file.name?.split('.').pop()?.toLowerCase() || (file.type === 'image/png' ? 'png' : 'jpg')
    const path = `${authUserId}.${ext}`
    const { error } = await supabase.storage.from(AVATARS_BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: true,
    })
    if (error) {
      console.warn('[avatar-utils] Avatar file upload failed:', error.message)
      return null
    }
    const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path)
    return data?.publicUrl ?? null
  } catch (e) {
    console.warn('[avatar-utils] Avatar file upload failed:', e)
    return null
  }
}

const BLOG_AUTHOR_MIME_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

/**
 * Upload a blog / E-E-A-T author avatar to Supabase Storage.
 * Uses a project-scoped path so it does not overwrite the user's profile avatar ({authUserId}.ext).
 */
export async function uploadBlogAuthorAvatarToStorage(file, authUserId, projectId) {
  if (!file?.type?.startsWith('image/')) return null
  if (!authUserId || !projectId) return null
  try {
    let ext = BLOG_AUTHOR_MIME_EXT[file.type]
    if (!ext) {
      const fromName = file.name?.split('.').pop()?.toLowerCase()
      if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(fromName)) {
        ext = fromName === 'jpeg' ? 'jpg' : fromName
      }
    }
    if (!ext) ext = 'jpg'
    const unique =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
    const path = `${authUserId}/blog-authors/${projectId}/${unique}.${ext}`
    const { error } = await supabase.storage.from(AVATARS_BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: true,
    })
    if (error) {
      console.warn('[avatar-utils] Blog author avatar upload failed:', error.message)
      return null
    }
    const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path)
    return data?.publicUrl ?? null
  } catch (e) {
    console.warn('[avatar-utils] Blog author avatar upload failed:', e)
    return null
  }
}

const MAX_BACKGROUND_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * Upload a File (drag-drop or input) to Supabase Storage for custom portal background.
 * Path: {authUserId}/background.{ext} — unique per user, one file per user (upsert).
 * Returns public URL or null.
 */
const IMAGE_EXT_FROM_MIME = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
}

export async function uploadBackgroundFileToStorage(file, authUserId) {
  if (!file?.type?.startsWith('image/')) return null
  if (file.size > MAX_BACKGROUND_SIZE) return null
  try {
    const extFromName = file.name?.split('.').pop()?.toLowerCase()
    const extFromMime = IMAGE_EXT_FROM_MIME[file.type]
    const ext = extFromName || extFromMime || 'jpg'
    const path = `${authUserId}/background.${ext}`
    const { error } = await supabase.storage.from(USER_BACKGROUNDS_BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: true,
    })
    if (error) {
      console.warn('[avatar-utils] Background upload failed:', error.message)
      return null
    }
    const { data } = supabase.storage.from(USER_BACKGROUNDS_BUCKET).getPublicUrl(path)
    return data?.publicUrl ?? null
  } catch (e) {
    console.warn('[avatar-utils] Background upload failed:', e)
    return null
  }
}

/**
 * Extract storage path from a user-backgrounds public URL.
 * URL format: .../storage/v1/object/public/user-backgrounds/{path} or .../user-backgrounds/{path}
 */
function getBackgroundPathFromUrl(publicUrl) {
  if (!publicUrl || typeof publicUrl !== 'string') return null
  const match = publicUrl.match(/user-backgrounds\/(.+?)(?:\?|$)/)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * Delete a background image from Supabase Storage by its public URL.
 * Call before or after uploading a new image, or when user removes the background.
 */
export async function deleteBackgroundFromStorage(publicUrl) {
  const path = getBackgroundPathFromUrl(publicUrl)
  if (!path) return
  try {
    const { error } = await supabase.storage.from(USER_BACKGROUNDS_BUCKET).remove([path])
    if (error) console.warn('[avatar-utils] Background delete failed:', error.message)
  } catch (e) {
    console.warn('[avatar-utils] Background delete failed:', e)
  }
}
