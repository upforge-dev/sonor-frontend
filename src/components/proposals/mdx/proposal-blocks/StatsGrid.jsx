/**
 * Stats Card Grid
 * Theme-compatible: Uses CSS custom properties
 */
export function StatsGrid({ children, stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 my-8">
      {stats
        ? stats.map((stat, i) => (
            <StatCard key={i} {...stat} />
          ))
        : children}
    </div>
  )
}

export function StatCard({ value, label, change, trend = 'neutral', icon: Icon }) {
  const trendColors = {
    positive: 'text-[var(--accent-green)]',
    negative: 'text-[var(--accent-red)]',
    neutral: 'text-[var(--text-secondary)]'
  }
  
  return (
    <div className="text-center p-4 bg-[var(--glass-bg)] rounded-lg border border-[var(--glass-border)]">
      {Icon && <Icon className="h-6 w-6 mx-auto mb-2 text-[var(--text-secondary)]" />}
      <div className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-1">
        {value}
      </div>
      <div className="text-xs sm:text-sm text-[var(--text-secondary)]">{label}</div>
      {change && (
        <div className={`text-xs mt-1 ${trendColors[trend]}`}>
          {change}
        </div>
      )}
    </div>
  )
}
StatCard.displayName = 'StatCard'

export default StatsGrid
