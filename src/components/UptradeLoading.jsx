/**
 * DEPRECATED — Use SonorLoading / SonorSpinner instead.
 * This file re-exports from SonorLoading.tsx for backwards compatibility.
 * All 30+ imports across the codebase will continue to work.
 */
import SonorLoading, { SonorSpinner } from './SonorLoading'

export const UptradeSpinner = SonorSpinner

const UptradeLoading = SonorLoading
UptradeLoading.Spinner = SonorSpinner
export default UptradeLoading
