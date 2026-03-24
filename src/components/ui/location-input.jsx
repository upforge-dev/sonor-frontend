// Location input with optional Google Places Autocomplete.
// Uses existing Google Maps API key: env VITE_GOOGLE_* or Portal API GET /seo/config/maps-api-key (GOOGLE_CLOUD_API_KEY / GOOGLE_MAPS_API_KEY).

import { useRef, useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import portalApi from '@/lib/sonor-api'

const SCRIPT_URL = 'https://maps.googleapis.com/maps/api/js'

function getApiKey() {
  const env =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    import.meta.env.VITE_GOOGLE_PLACES_API_KEY ||
    import.meta.env.VITE_GOOGLE_CLOUD_API_KEY ||
    import.meta.env.VITE_GOOGLE_API_KEY
  if (env) return Promise.resolve(env)
  return portalApi
    .get('/seo/config/maps-api-key')
    .then((r) => r.data?.api_key || '')
    .catch(() => '')
}

const scriptLoadByKey = new Map()
function loadGoogleMapsScript(apiKey) {
  if (typeof window === 'undefined' || !apiKey) return Promise.resolve(null)
  if (window.google?.maps?.places) return Promise.resolve(window.google.maps)
  if (scriptLoadByKey.get(apiKey)) return scriptLoadByKey.get(apiKey)
  const promise = new Promise((resolve) => {
    const existing = document.querySelector(`script[src^="${SCRIPT_URL}"]`)
    if (existing) {
      if (window.google?.maps?.places) return resolve(window.google.maps)
      existing.addEventListener('load', () => resolve(window.google?.maps || null))
      return
    }
    const script = document.createElement('script')
    script.src = `${SCRIPT_URL}?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => resolve(window.google?.maps || null)
    script.onerror = () => resolve(null)
    document.head.appendChild(script)
  })
  scriptLoadByKey.set(apiKey, promise)
  return promise
}

export function LocationInput({ id, value, onChange, placeholder = 'e.g., Room 101 or address', className, ...rest }) {
  const inputRef = useRef(null)
  const autocompleteRef = useRef(null)
  const [scriptReady, setScriptReady] = useState(false)

  useEffect(() => {
    getApiKey().then((key) => {
      if (!key) return
      loadGoogleMapsScript(key).then((googleMaps) => {
        setScriptReady(!!googleMaps?.places)
      })
    })
  }, [])

  useEffect(() => {
    if (!scriptReady || !inputRef.current || !window.google?.maps?.places) return
    if (autocompleteRef.current) return // already attached
    const Autocomplete = window.google.maps.places.Autocomplete
    const autocomplete = new Autocomplete(inputRef.current, {
      types: ['establishment', 'geocode'],
      fields: ['formatted_address', 'name', 'geometry'],
    })
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      const text = place?.formatted_address || place?.name || (inputRef.current?.value ?? '')
      if (text && onChange) onChange(text)
    })
    autocompleteRef.current = autocomplete
    return () => {
      if (window.google?.maps?.event && autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
      autocompleteRef.current = null
    }
  }, [scriptReady, onChange])

  const inputClassName = cn(
    'flex h-10 w-full min-w-0 rounded-[var(--radius-sm)] px-3 py-2 text-base md:text-sm',
    'bg-[var(--glass-bg-inset)] border border-[var(--glass-border)]',
    'text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]',
    'focus:outline-none focus:bg-[var(--glass-bg)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20',
    'pl-9',
    className
  )

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={inputClassName}
        autoComplete="off"
        {...rest}
      />
    </div>
  )
}
