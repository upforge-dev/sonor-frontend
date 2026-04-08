type PlacesAutocomplete = {
  addListener: (eventName: string, handler: () => void) => void
  getPlace: () => { formatted_address?: string; name?: string }
}

declare global {
  interface Window {
    google?: {
      maps?: {
        importLibrary?: (name: string) => Promise<unknown>
        places?: { Autocomplete: new (el: HTMLInputElement, opts: object) => PlacesAutocomplete }
        event?: { clearInstanceListeners: (instance: PlacesAutocomplete) => void }
      }
    }
  }
}

// Location input with optional Google Places Autocomplete.
// Uses existing Google Maps API key: env VITE_GOOGLE_* or Portal API GET /seo/config/maps-api-key (GOOGLE_CLOUD_API_KEY / GOOGLE_MAPS_API_KEY).

import { useRef, useEffect, useState, type ComponentPropsWithoutRef } from 'react'
import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import portalApi from '@/lib/sonor-api'
import { ensureGoogleMapsBootstrap, importGoogleMapsLibrary } from '@/lib/google-maps-bootstrap'

function getApiKey(): Promise<string> {
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

export type LocationInputProps = Omit<
  ComponentPropsWithoutRef<'input'>,
  'onChange' | 'type'
> & {
  onChange?: (value: string) => void
}

export function LocationInput({
  id,
  value,
  onChange,
  placeholder = 'e.g., Room 101 or address',
  className,
  ...rest
}: LocationInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<PlacesAutocomplete | null>(null)
  const [scriptReady, setScriptReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    getApiKey().then(async (key) => {
      if (!key || cancelled) return
      const ok = await ensureGoogleMapsBootstrap(key)
      if (!ok || cancelled) return
      try {
        await importGoogleMapsLibrary('places')
      } catch {
        /* Places library unavailable */
      }
      if (!cancelled) setScriptReady(!!window.google?.maps?.places)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!scriptReady || !inputRef.current || !window.google?.maps?.places) return
    if (autocompleteRef.current) return // already attached
    const AutocompleteCtor = window.google.maps.places
      .Autocomplete as new (el: HTMLInputElement, opts: object) => PlacesAutocomplete
    const autocomplete = new AutocompleteCtor(inputRef.current, {
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
