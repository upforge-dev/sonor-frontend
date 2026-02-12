/**
 * @uptrade/site-kit/commerce - Commerce API
 * 
 * API functions for fetching offerings, submitting orders, and registrations.
 * All data goes through Portal API with API key auth - never Supabase directly.
 */

import type { 
  CommerceOffering, 
  FetchOfferingsOptions,
  FetchEventsOptions,
  CheckoutCustomer,
  CheckoutResult,
} from './types'

// ============================================
// API Config Helpers
// ============================================

function getApiConfig() {
  const apiUrl = typeof window !== 'undefined' 
    ? (window as any).__SITE_KIT_API_URL__ || 'https://api.uptrademedia.com'
    : 'https://api.uptrademedia.com'
  const apiKey = typeof window !== 'undefined' 
    ? (window as any).__SITE_KIT_API_KEY__ || ''
    : ''
  return { apiUrl, apiKey }
}

function getApiUrl(): string {
  return getApiConfig().apiUrl
}

function getApiKey(): string {
  return getApiConfig().apiKey
}

async function apiPost<T>(endpoint: string, body: Record<string, any> = {}): Promise<T | null> {
  const { apiUrl, apiKey } = getApiConfig()
  
  if (!apiKey) {
    console.error('[Commerce] No API key configured')
    return null
  }
  
  try {
    const response = await fetch(`${apiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(body),
    })
    
    if (!response.ok) {
      console.error(`[Commerce] API error: ${response.statusText}`)
      return null
    }
    
    return await response.json()
  } catch (error) {
    console.error('[Commerce] Network error:', error)
    return null
  }
}

// ============================================
// Fetch Offerings
// ============================================

export async function fetchOfferings(
  options: FetchOfferingsOptions = {}
): Promise<CommerceOffering[]> {
  const result = await apiPost<{ offerings: CommerceOffering[]; total: number }>(
    '/api/public/commerce/offerings',
    {
      type: options.type,
      category: options.category,
      status: options.status || 'active',
      limit: options.limit,
      offset: options.offset,
      orderBy: options.orderBy || 'sort_order',
      order: options.order || 'asc',
    }
  )
  
  return result?.offerings || []
}

export async function fetchOffering(slug: string): Promise<CommerceOffering | null> {
  const result = await apiPost<{ offering: CommerceOffering }>(
    '/api/public/commerce/offering',
    { slug }
  )
  
  return result?.offering || null
}

export async function fetchLatestOffering(
  type?: string,
  category?: string
): Promise<CommerceOffering | null> {
  const result = await apiPost<{ offerings: CommerceOffering[] }>(
    '/api/public/commerce/offerings',
    {
      type,
      category,
      status: 'active',
      limit: 1,
      orderBy: 'created_at',
      order: 'desc',
    }
  )
  
  return result?.offerings?.[0] || null
}

// ============================================
// Fetch Events (with schedules)
// ============================================

export async function fetchUpcomingEvents(
  options: FetchEventsOptions = {}
): Promise<CommerceOffering[]> {
  const result = await apiPost<{ events: CommerceOffering[]; total: number }>(
    '/api/public/commerce/events',
    {
      type: 'event',
      category: options.category,
      limit: options.limit,
      includePast: options.past,
    }
  )
  
  return result?.events || []
}

export async function fetchNextEvent(category?: string): Promise<CommerceOffering | null> {
  const events = await fetchUpcomingEvents({ limit: 1, category })
  return events[0] || null
}

// ============================================
// Products
// ============================================

export async function fetchProducts(
  options: Omit<FetchOfferingsOptions, 'type'> = {}
): Promise<CommerceOffering[]> {
  return fetchOfferings({ ...options, type: 'product' })
}

export async function fetchServices(
  options: Omit<FetchOfferingsOptions, 'type'> = {}
): Promise<CommerceOffering[]> {
  return fetchOfferings({ ...options, type: 'service' })
}

/**
 * Fetch products via public API
 */
export async function fetchProductsPublic(
  options: {
    category?: string
    limit?: number
    offset?: number
    orderBy?: 'name' | 'price' | 'created_at' | 'sort_order'
    order?: 'asc' | 'desc'
    search?: string
  } = {}
): Promise<{ products: CommerceOffering[]; total: number }> {
  const result = await apiPost<{ products: CommerceOffering[]; total: number }>(
    '/api/public/commerce/products',
    options
  )
  
  return {
    products: result?.products || [],
    total: result?.total || 0,
  }
}

/**
 * Fetch single product by slug
 */
export async function fetchProductBySlug(slug: string): Promise<CommerceOffering | null> {
  const result = await apiPost<{ product: CommerceOffering }>(
    '/api/public/commerce/product',
    { slug }
  )
  
  return result?.product || null
}

/**
 * Fetch product categories
 */
export async function fetchCategories(): Promise<{ id: string; name: string; slug: string }[]> {
  const result = await apiPost<{ categories: { id: string; name: string; slug: string }[] }>(
    '/api/public/commerce/categories',
    {}
  )
  
  return result?.categories || []
}

// ============================================
// Payment Processor Info
// ============================================

/**
 * Fetch the active payment processor for the current project.
 * Returns 'stripe' | 'square' | null.
 */
export async function fetchActiveProcessor(): Promise<'stripe' | 'square' | null> {
  const { apiUrl, apiKey } = getApiConfig()
  
  if (!apiKey) return null
  
  try {
    const response = await fetch(`${apiUrl}/api/public/commerce/processor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({}),
    })
    
    if (!response.ok) return null
    const data = await response.json()
    return data?.processor || null
  } catch {
    return null
  }
}

// ============================================
// Checkout & Registration
// ============================================

export async function registerForEvent(
  eventId: string,
  scheduleId: string | undefined,
  customer: CheckoutCustomer
): Promise<CheckoutResult> {
  const { apiUrl, apiKey } = getApiConfig()
  
  // Get analytics session ID for conversion tracking
  const analyticsSessionId = typeof sessionStorage !== 'undefined' 
    ? sessionStorage.getItem('_uptrade_sid') 
    : null
  
  try {
    const response = await fetch(`${apiUrl}/api/public/commerce/register`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        offeringId: eventId,
        scheduleId,
        customer,
        analyticsSessionId, // Pass for conversion tracking
      }),
    })
    
    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.message || 'Registration failed' }
    }
    
    const result = await response.json()
    
    // Note: Conversion is auto-logged via database trigger when commerce_sales is created
    
    return { 
      success: true, 
      sale_id: result.sale_id,
      confirmation_number: result.confirmation_number,
    }
  } catch (error) {
    return { success: false, error: 'Network error. Please try again.' }
  }
}

export interface CreateCheckoutOptions {
  offeringId: string
  variantId?: string
  scheduleId?: string
  quantity?: number
  customer?: CheckoutCustomer
  successUrl?: string
  cancelUrl?: string
}

/**
 * Create a checkout session for a product or service
 * Supports both Stripe and Square based on project configuration
 */
export async function createCheckoutSession(
  optionsOrOfferingId: CreateCheckoutOptions | string,
  legacyOptions?: {
    variantId?: string
    scheduleId?: string
    quantity?: number
    customer?: CheckoutCustomer
    successUrl?: string
    cancelUrl?: string
  }
): Promise<CheckoutResult> {
  const { apiUrl, apiKey } = getApiConfig()

  // Support both calling conventions
  const options: CreateCheckoutOptions = typeof optionsOrOfferingId === 'string'
    ? { offeringId: optionsOrOfferingId, ...legacyOptions }
    : optionsOrOfferingId
  
  // Get analytics session ID for conversion tracking
  const analyticsSessionId = typeof sessionStorage !== 'undefined' 
    ? sessionStorage.getItem('_uptrade_sid') 
    : null
  
  try {
    const response = await fetch(`${apiUrl}/api/public/commerce/checkout`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        ...options,
        analyticsSessionId, // Pass for conversion tracking
        successUrl: options.successUrl || (typeof window !== 'undefined' ? window.location.href : ''),
        cancelUrl: options.cancelUrl || (typeof window !== 'undefined' ? window.location.href : ''),
      }),
    })
    
    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.message || 'Checkout failed' }
    }
    
    const result = await response.json()
    
    // Note: Conversion is auto-logged via database trigger when commerce_sales is created
    
    return { 
      success: true, 
      payment_url: result.checkout_url,
      checkout_url: result.checkout_url,
      sale_id: result.sale_id,
      confirmation_number: result.confirmation_number,
    }
  } catch (error) {
    return { success: false, error: 'Network error. Please try again.' }
  }
}
