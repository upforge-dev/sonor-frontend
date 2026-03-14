import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TrendingUp, Target, CheckCircle } from 'lucide-react'
import Section from './Section'

/**
 * New Website Build Block (for clients with no existing site)
 * Theme-compatible: Uses CSS custom properties
 */
export function NewWebsiteBuild({ children, features, title = 'New Website Build' }) {
  return (
    <Section bg="transparent">
      <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-6 sm:mb-8">
        {title}
      </h2>
      <Alert className="mb-6 border-[var(--brand-primary)] bg-[var(--brand-primary)]/10">
        <TrendingUp className="h-4 w-4 text-[var(--brand-primary)]" />
        <AlertDescription className="text-[var(--text-primary)]">
          <strong>Starting Fresh:</strong> We'll build your digital presence from the ground up with modern technology and best practices.
        </AlertDescription>
      </Alert>
      {features
        ? <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature, i) => (
              <WebsiteFeature key={i} {...feature} />
            ))}
          </div>
        : children}
    </Section>
  )
}

export function WebsiteFeature({ 
  title, 
  description, 
  icon: Icon = Target,
  included = true 
}) {
  return (
    <Card className={`bg-[var(--glass-bg)] border-[var(--glass-border)] ${included ? '' : 'opacity-60'}`}>
      <CardContent className="pt-6">
        <div className="flex items-start">
          <div className="mr-4 p-3 bg-[var(--brand-primary)]/10 rounded-lg">
            <Icon className="h-6 w-6 text-[var(--brand-primary)]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-[var(--text-primary)]">{title}</h4>
              {included && (
                <CheckCircle className="h-5 w-5 text-[var(--brand-primary)]" />
              )}
            </div>
            <p className="text-sm text-[var(--text-secondary)]">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default NewWebsiteBuild
