import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle } from 'lucide-react'
import Section from './Section'

/**
 * Pricing/Solution Block
 * Theme-compatible: Uses CSS custom properties
 */
export function PricingSection({ children, tiers, title = 'Proposed Solution & Investment' }) {
  return (
    <Section bg="transparent">
      <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-6 sm:mb-8">
        {title}
      </h2>
      {tiers
        ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tiers.map((tier, i) => (
              <PricingTier key={i} {...tier} />
            ))}
          </div>
        : children}
    </Section>
  )
}

export function PricingTier({ 
  name, 
  price, 
  period = 'one-time',
  description,
  features = [],
  highlighted = false 
}) {
  return (
    <Card className={`bg-[var(--glass-bg)] border-[var(--glass-border)] ${highlighted ? 'border-2 border-[var(--brand-primary)] shadow-lg' : ''}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-[var(--text-primary)]">
          <span>{name}</span>
          {highlighted && (
            <Badge className="bg-[var(--brand-primary)] text-white">Recommended</Badge>
          )}
        </CardTitle>
        <CardDescription className="text-[var(--text-secondary)]">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <span className="text-4xl font-bold text-[var(--text-primary)]">${price?.toLocaleString?.() || price}</span>
          <span className="text-[var(--text-secondary)] ml-2">/ {period}</span>
        </div>
        <ul className="space-y-3">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start">
              <CheckCircle className="h-5 w-5 text-[var(--brand-primary)] mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-[var(--text-secondary)]">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export default PricingSection
