// src/components/seo/signal/SignalUpgradeCard.jsx
// Shown to users without Signal access - prompts upgrade
import { motion } from 'framer-motion'
import { Sparkles, Zap, FileText, ArrowRight, Mail } from 'lucide-react'
import SignalIcon from '@/components/ui/SignalIcon'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const FEATURE_MESSAGES = {
  insights: {
    title: 'Signal-Powered Insights',
    description: 'Get personalized recommendations tailored to your site',
    icon: SignalIcon
  },
  autofix: {
    title: 'Auto-Fix Issues',
    description: 'Let Signal automatically fix common SEO issues',
    icon: Zap
  },
  brief: {
    title: 'Content Briefs',
    description: 'Generate content briefs based on your business context',
    icon: FileText
  },
  suggest: {
    title: 'Signal Suggestions',
    description: 'Get Signal title and meta description suggestions',
    icon: Sparkles
  },
  default: {
    title: 'Unlock Signal AI',
    description: 'Get personalized recommendations, auto-fixes, and an AI that learns your business over time',
    icon: Sparkles
  }
}

export default function SignalUpgradeCard({
  feature = 'default',
  variant = 'default', // 'default' | 'inline' | 'compact'
  onUpgrade,
  onContactSales,
  className
}) {
  const featureInfo = FEATURE_MESSAGES[feature] || FEATURE_MESSAGES.default
  const Icon = featureInfo.icon

  if (variant === 'compact') {
    return (
      <div className={cn(
        'flex items-center gap-3 p-3 rounded-lg border',
        className
      )} style={{
        background: 'linear-gradient(to right, color-mix(in srgb, var(--brand-primary) 10%, transparent), color-mix(in srgb, var(--brand-secondary) 10%, transparent))',
        borderColor: 'color-mix(in srgb, var(--brand-primary) 20%, transparent)'
      }}>
        <div className="flex items-center justify-center w-8 h-8 rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 20%, transparent)' }}>
          <Sparkles className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {featureInfo.title}
          </p>
        </div>
        <Button size="sm" variant="ghost" style={{ color: 'var(--brand-primary)' }} onClick={onUpgrade}>
          Upgrade
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <div className={cn(
        'flex items-center justify-between gap-4 p-4 rounded-lg border',
        className
      )} style={{
        background: 'linear-gradient(to right, color-mix(in srgb, var(--brand-primary) 5%, transparent), color-mix(in srgb, var(--brand-secondary) 5%, transparent))',
        borderColor: 'color-mix(in srgb, var(--brand-primary) 20%, transparent)'
      }}>
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
          <div>
            <p className="font-medium text-[var(--text-primary)]">{featureInfo.title}</p>
            <p className="text-sm text-[var(--text-secondary)]">{featureInfo.description}</p>
          </div>
        </div>
        <Button size="sm" style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }} onClick={onUpgrade}>
          <Sparkles className="h-3.5 w-3.5 mr-1" />
          Upgrade
        </Button>
      </div>
    )
  }

  // Default full card
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={cn(
        'overflow-hidden',
        className
      )} style={{
        borderColor: 'color-mix(in srgb, var(--brand-primary) 20%, transparent)',
        background: 'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 5%, transparent), transparent, color-mix(in srgb, var(--brand-secondary) 5%, transparent))'
      }}>
        <CardContent className="py-8 px-6 text-center">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full" style={{
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 20%, transparent), color-mix(in srgb, var(--brand-secondary) 20%, transparent))'
          }}>
            <Sparkles className="h-8 w-8" style={{ color: 'var(--brand-primary)' }} />
          </div>
          
          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            Unlock Signal AI
          </h3>
          
          <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
            Get personalized recommendations, auto-fixes, and an AI that learns your business over time.
          </p>

          <div className="grid gap-3 text-left max-w-sm mx-auto mb-6">
            <div className="flex items-start gap-3">
              <SignalIcon className="h-5 w-5 mt-0.5" style={{ color: 'var(--brand-primary)' }} />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Signal remembers</p>
                <p className="text-xs text-[var(--text-tertiary)]">Your site history and what works</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 mt-0.5" style={{ color: 'var(--brand-primary)' }} />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Auto-fix issues</p>
                <p className="text-xs text-[var(--text-tertiary)]">One-click fixes for common problems</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 mt-0.5" style={{ color: 'var(--brand-primary)' }} />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Content briefs</p>
                <p className="text-xs text-[var(--text-tertiary)]">Tailored to your business</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Button style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }} onClick={onUpgrade}>
              <Sparkles className="h-4 w-4 mr-2" />
              Upgrade to Signal
            </Button>
            {onContactSales && (
              <Button variant="outline" onClick={onContactSales}>
                <Mail className="h-4 w-4 mr-2" />
                Contact Sales
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
