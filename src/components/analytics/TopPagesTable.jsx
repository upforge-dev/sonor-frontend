/**
 * TopPagesTable - Most visited pages with metrics
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, TrendingUp, Clock, ExternalLink, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const defaultFormatNumber = (num) => {
  if (!num && num !== 0) return '0'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toLocaleString()
}

export function TopPagesTable({ 
  pages = [], 
  isLoading = false,
  formatNumber = defaultFormatNumber,
  limit = 15
}) {
  const displayPages = pages.slice(0, limit)
  const maxViews = Math.max(...displayPages.map(p => p.views || 0), 1)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#39bfb0]" />
              Top Pages
            </CardTitle>
            <CardDescription>Most visited pages by views</CardDescription>
          </div>
          <span className="text-xs text-[var(--text-tertiary)]">
            {pages.length} pages tracked
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <ScrollArea className="h-[400px] pr-4">
          {displayPages.length > 0 ? (
            <div className="space-y-1">
              {displayPages.map((page, index) => {
                const barWidth = ((page.views || 0) / maxViews) * 100
                
                return (
                  <div 
                    key={index}
                    className="group relative py-3 hover:bg-[var(--glass-bg)] rounded-lg px-3 -mx-3 transition-colors"
                  >
                    {/* Background bar */}
                    <div 
                      className="absolute inset-y-1 left-0 bg-[#39bfb0]/10 rounded-lg transition-all"
                      style={{ width: `${barWidth}%` }}
                    />
                    
                    <div className="relative flex items-center gap-4">
                      {/* Rank */}
                      <span className={cn(
                        "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold",
                        index < 3 
                          ? "bg-[#39bfb0]/20 text-[#39bfb0]" 
                          : "bg-[var(--glass-bg-inset)] text-[var(--text-tertiary)]"
                      )}>
                        {index + 1}
                      </span>
                      
                      {/* Page info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                            {page.path || '/'}
                          </p>
                          <a 
                            href={`https://sonor.io${page.path || '/'}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ExternalLink className="h-3 w-3 text-[var(--text-tertiary)] hover:text-[#39bfb0]" />
                          </a>
                        </div>
                        {page.title && (
                          <p className="text-xs text-[var(--text-tertiary)] truncate mt-0.5">
                            {page.title}
                          </p>
                        )}
                      </div>
                      
                      {/* Metrics */}
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <p className="text-sm font-bold text-[var(--text-primary)]">
                            {formatNumber(page.views)}
                          </p>
                          <p className="text-xs text-[var(--text-tertiary)]">views</p>
                        </div>
                        
                        {page.avgDuration && (
                          <div className="hidden sm:block">
                            <p className="text-sm text-[var(--text-secondary)]">
                              {Math.floor(page.avgDuration / 60)}:{String(page.avgDuration % 60).padStart(2, '0')}
                            </p>
                            <p className="text-xs text-[var(--text-tertiary)]">avg time</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-[var(--text-tertiary)]">
              No page data available
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export default TopPagesTable
