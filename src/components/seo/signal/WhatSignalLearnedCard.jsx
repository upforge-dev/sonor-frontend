// src/components/seo/signal/WhatSignalLearnedCard.jsx
// Shows Signal's learning history - wins and losses
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, ChevronRight, History } from 'lucide-react'
import SignalIcon from '@/components/ui/SignalIcon'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

export default function WhatSignalLearnedCard({
  wins = [],
  losses = [],
  onViewDetails,
  isLoading = false,
  className
}) {
  const [activeTab, setActiveTab] = useState('wins')

  const renderItem = (item, type) => {
    const isWin = type === 'win'
    
    return (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'p-3 rounded-lg border transition-colors cursor-pointer',
          'bg-[var(--glass-bg)] border-[var(--glass-border)]',
          isWin ? 'hover:border-emerald-500/30' : 'hover:border-red-500/30'
        )}
        onClick={() => onViewDetails?.(item)}
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            'flex items-center justify-center w-6 h-6 rounded-full shrink-0',
            isWin ? 'bg-emerald-500/20' : 'bg-red-500/20'
          )}>
            {isWin ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-red-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-1">
              {item.page}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">
              {item.description}
            </p>
            
            <div className="flex items-center gap-2 mt-2">
              {item.metric && (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    'text-xs',
                    isWin ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  )}
                >
                  {isWin ? '+' : ''}{item.metric}
                </Badge>
              )}
              {item.date && (
                <span className="text-xs text-[var(--text-tertiary)]">
                  {item.date}
                </span>
              )}
            </div>
          </div>

          <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)] shrink-0" />
        </div>
      </motion.div>
    )
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div 
            className="flex items-center justify-center w-8 h-8 rounded-full" 
            style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 20%, transparent)' }}
          >
            <SignalIcon className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
          </div>
          <div>
            <CardTitle className="text-base">What Signal Learned</CardTitle>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              Patterns from your site's performance
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-3">
            <TabsTrigger value="wins" className="text-sm">
              <TrendingUp className="h-3.5 w-3.5 mr-1 text-emerald-400" />
              Wins ({wins.length})
            </TabsTrigger>
            <TabsTrigger value="losses" className="text-sm">
              <TrendingDown className="h-3.5 w-3.5 mr-1 text-red-400" />
              Losses ({losses.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wins" className="mt-0">
            {isLoading ? (
              <LoadingState />
            ) : wins.length === 0 ? (
              <EmptyState type="wins" />
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {wins.map(item => renderItem(item, 'win'))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="losses" className="mt-0">
            {isLoading ? (
              <LoadingState />
            ) : losses.length === 0 ? (
              <EmptyState type="losses" />
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {losses.map(item => renderItem(item, 'loss'))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="mb-2"
      >
        <SignalIcon className="h-6 w-6" style={{ color: 'var(--brand-primary)' }} />
      </motion.div>
      <p className="text-sm text-[var(--text-secondary)]">Loading patterns...</p>
    </div>
  )
}

function EmptyState({ type }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--glass-bg)] mb-3">
        <History className="h-5 w-5 text-[var(--text-tertiary)]" />
      </div>
      <p className="text-sm text-[var(--text-secondary)] mb-1">
        {type === 'wins' ? 'No wins recorded yet' : 'No losses recorded yet'}
      </p>
      <p className="text-xs text-[var(--text-tertiary)]">
        Signal will track patterns as you optimize
      </p>
    </div>
  )
}
