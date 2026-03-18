// src/components/broadcast/BroadcastModuleDashboard.jsx
import React from 'react';
import { Broadcast } from '@/pages/broadcast';

/**
 * Wrapper component for embedding Broadcast module in MainLayout
 */
export default function BroadcastModuleDashboard({ onNavigate }) {
  return <div data-sonor-help="broadcast/dashboard"><Broadcast onNavigate={onNavigate} /></div>;
}
