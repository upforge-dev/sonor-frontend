/**
 * LoadingSpinner - Re-exports UptradeSpinner as the single loading indicator.
 * Use for inline/section loading (content areas, panels).
 * For full-page loading use UptradeLoading.
 */
import type { UptradeSpinnerProps } from '@/components/UptradeLoading'
import { UptradeSpinner } from '@/components/UptradeLoading'

export function LoadingSpinner({ size = 'md', label, className }: UptradeSpinnerProps) {
  return <UptradeSpinner size={size} label={label} className={className} />
}

export { UptradeSpinner }
export default LoadingSpinner
