// src/hooks/useSignalAccess.js
// Re-export signal access hook for easier importing
// The actual implementation is in @/lib/signal-access

export {
  useSignalAccess,
  useSignalStatus,
  useSignalEnabledProjectIds,
  useEchoAccess,
  useSyncSignalAccess,
  useEchoConfig,
  hasSignalFeature,
  withSignalAccess
} from '@/lib/signal-access'

// Convenience hook that matches the expected interface from sidebar
import { useSignalAccess } from '@/lib/signal-access'

export function useSignalAccessSimple() {
  const { hasAccess, hasCurrentProjectSignal, canUseEcho, canUseSyncSignal, scope } = useSignalAccess()

  return {
    hasSignalAccess: hasAccess,
    hasCurrentProjectSignal,
    canUseEcho,
    canUseSyncSignal,
    scope
  }
}
