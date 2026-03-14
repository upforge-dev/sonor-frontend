// src/components/mdx/proposal-blocks/InvestmentSection.jsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Section } from './Section'

/**
 * Investment Section Block
 * Displays pricing/investment details clearly
 */
export function InvestmentSection({ children, title = 'Investment Required' }) {
  return (
    <Section bg="var(--surface-primary)">
      <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-6 sm:mb-8">
        {title}
      </h2>
      <div className="grid gap-6">
        {children}
      </div>
    </Section>
  )
}
