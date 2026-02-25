import { Badge } from '@/components/ui/badge'
import { Clock } from 'lucide-react'

/**
 * Proposal Hero Section with branding
 * Theme-compatible: Uses CSS custom properties
 */
export function ProposalHero({ 
  title, 
  subtitle, 
  heroImage, 
  brandName,
  agencyName,
  agencyLogo,
  totalAmount,
  validUntil,
  stats = []
}) {
  const displayName = agencyName || 'Upforge'
  const displayLogo = agencyLogo || '/logo.svg'
  
  return (
    <div className="relative overflow-hidden rounded-2xl mb-8 min-h-[300px]">
      {/* Background Image */}
      {heroImage && (
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImage} 
            alt="" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
        </div>
      )}
      
      {/* Fallback background if no image */}
      {!heroImage && (
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-gray-900 to-gray-800" />
      )}
      
      {/* Content */}
      <div className="relative z-10 text-white p-8 sm:p-12">
        {/* Agency Logo */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <img src={displayLogo} alt={displayName} className="w-10 h-10" />
            <span className="text-sm font-medium opacity-80">{displayName}</span>
          </div>
          {totalAmount && (
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider opacity-60">Total Investment</div>
              <div className="text-3xl font-bold text-[var(--brand-primary)]">${totalAmount.toLocaleString()}</div>
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
          {title}
        </h1>
        
        {/* Subtitle */}
        {subtitle && (
          <p className="text-lg sm:text-xl opacity-90 max-w-3xl mb-8">
            {subtitle}
          </p>
        )}

        {/* Stats Row */}
        {stats.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/20">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold">{stat.value}</div>
                <div className="text-xs sm:text-sm opacity-70">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Valid Until Badge */}
        {validUntil && (
          <div className="mt-6">
            <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
              <Clock className="w-3 h-3 mr-1" />
              Valid until {new Date(validUntil).toLocaleDateString()}
            </Badge>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProposalHero
