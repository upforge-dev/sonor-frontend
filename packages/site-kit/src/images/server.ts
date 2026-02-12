/**
 * @uptrade/site-kit/images/server - Server-only image components
 *
 * Use this entry point for components that must run on the server (e.g. in layout head).
 * Importing from ./images (which includes ManagedImage) can cause Next.js 16/Turbopack
 * to treat async components as Client Components when they share a bundle with client code.
 */

export { ManagedFavicon } from './ManagedFavicon'
export type { ManagedFaviconProps } from './ManagedFavicon'
