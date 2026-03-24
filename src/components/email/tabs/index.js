/**
 * Email Platform Tabs - Barrel Export
 * All tabs are lazy-loaded for code splitting
 */

import { lazy } from 'react'

// Lazy load all tabs for code splitting
export const OverviewTab = lazy(() => import('./OverviewTab'))
export const EmailCampaignsTab = lazy(() => import('./EmailCampaignsTab'))
export const SettingsTab = lazy(() => import('./SettingsTab'))

// Re-export SystemEmailsTab from parent directory
export const SystemEmailsTab = lazy(() => import('../SystemEmailsTab'))
