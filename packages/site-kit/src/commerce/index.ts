/**
 * @uptrade/site-kit/commerce
 * 
 * Commerce module for displaying products, services, events, and classes
 * with checkout and registration flows.
 */

// Types
export * from './types'

// Utils
export * from './utils'

// API (client-side)
export {
  fetchOfferings,
  fetchOffering,
  fetchLatestOffering,
  fetchProducts,
  fetchProductsPublic,
  fetchProductBySlug,
  fetchCategories,
  fetchServices,
  fetchUpcomingEvents,
  fetchNextEvent,
  registerForEvent,
  createCheckoutSession,
  fetchActiveProcessor,
} from './api'

// Components
export { OfferingCard } from './OfferingCard'
export { OfferingList } from './OfferingList'
export { EventTile } from './EventTile'
export { UpcomingEvents } from './UpcomingEvents'
export { ProductEmbed } from './ProductEmbed'
export { ProductDetail } from './ProductDetail'
export { ProductGrid } from './ProductGrid'
export { ProductPage } from './ProductPage'
export { EventEmbed } from './EventEmbed'
export { CheckoutForm } from './CheckoutForm'
export { RegistrationForm } from './RegistrationForm'
export { CalendarView } from './CalendarView'
export { EventModal } from './EventModal'
export { EventCalendar } from './EventCalendar'
export { EventsWidget } from './EventsWidget'

// Hooks
export { useEventModal } from './useEventModal'

// Server-side utilities (import separately for SSR)
// import { getOfferingBySlug, getProductPaths } from '@uptrade/site-kit/commerce/server'
