/**
 * SignalIcon - Inline SVG component for the Signal AI icon
 * Allows for dynamic coloring via the color prop
 */
export default function SignalIcon({ className = '', color = 'currentColor', size = 24 }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={{ color }}
    >
      <path 
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeMiterlimit="10"
        d="M13.21,7.3c2.12.54,3.68,2.46,3.68,4.74,0,1.86-1.03,3.47-2.56,4.3M14.32,19.33c3.1-.98,5.34-3.88,5.34-7.3,0-.98-.18-1.92-.52-2.78M17.97,7.23c-1.4-1.75-3.56-2.87-5.97-2.87s-4.54,1.1-5.95,2.83M4.88,9.21c-.35.87-.54,1.82-.54,2.82,0,3.42,2.24,6.32,5.34,7.3M9.44,13.01l2.61-2.35M14.56,13.05l-2.52-2.39M13.63,22.56c5.1-.78,9-5.19,9-10.5,0-5.87-4.76-10.62-10.62-10.62S1.38,6.19,1.38,12.06c0,4.93,3.35,9.07,7.9,10.27,0,0,0,0,0,0,1.92.4,2.76-1.11,2.76-2.33v-9.35M10.89,7.28c-2.17.5-3.78,2.45-3.78,4.77,0,1.86,1.03,3.47,2.56,4.3"
      />
    </svg>
  )
}
