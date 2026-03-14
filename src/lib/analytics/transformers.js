/**
 * Analytics Data Transformers
 * Pure functions to transform raw API data into chart-ready formats
 */

/**
 * Transform daily page views from API format to traffic chart format
 * API returns: { date, count } or { date, pageViews }
 * Chart expects: { date, views, sessions }
 */
export function transformTrafficData(dailyTrend = []) {
  if (!Array.isArray(dailyTrend)) return []
  
  return dailyTrend.map(d => ({
    date: d.date,
    views: d.views || d.pageViews || d.count || 0,
    sessions: d.sessions || d.uniqueSessions || d.uniqueVisitors || Math.floor((d.views || d.count || 0) * 0.6)
  }))
}

/**
 * Transform device breakdown from array to object format
 * API returns: [{ device: 'desktop', count: 100 }, ...]
 * Component expects: { desktop: 100, mobile: 50, tablet: 10 }
 */
export function transformDeviceData(deviceBreakdown = []) {
  const breakdown = Array.isArray(deviceBreakdown)
    ? deviceBreakdown.reduce((acc, item) => {
        acc[item.device] = item.count
        return acc
      }, {})
    : deviceBreakdown

  return {
    desktop: breakdown.desktop || 0,
    mobile: breakdown.mobile || 0,
    tablet: breakdown.tablet || 0
  }
}

/**
 * Transform top pages data for table display
 * Normalizes different API response formats
 */
export function transformPagesData(topPages = []) {
  const pages = Array.isArray(topPages) ? topPages : []
  
  return pages.map(page => {
    const viewCount = page.views ?? page.pageViews ?? page.count ?? 0
    return {
    path: page.path || page.title || '/',
    title: page.title || page.path || 'Unknown',
    views: viewCount,
    uniqueViews: page.uniqueViews || page.sessions || Math.floor(viewCount * 0.75),
    avgDuration: page.avgDuration || page.avgTimeOnPage || 0,
    bounceRate: page.bounceRate || 45
  }
  })
}

/**
 * Transform hourly page views for chart display
 * API returns: { hour: number, count: number }
 * Chart expects: { hour: number, visits: number }
 */
export function transformHourlyData(pageViewsByHour = []) {
  const hourlyData = Array.isArray(pageViewsByHour) ? pageViewsByHour : []
  
  return hourlyData.map(h => ({
    hour: typeof h.hour === 'number' ? h.hour : parseInt(h.label?.replace(':00', ''), 10) || 0,
    visits: h.count || h.views || h.pageViews || 0
  }))
}

/**
 * Build funnel data from summary metrics
 */
export function buildFunnelData(summary = {}) {
  const uniqueSessions = summary.uniqueSessions || summary.totalSessions || 0
  const bounceRate = summary.bounceRate || 40
  
  return {
    uniqueVisitors: uniqueSessions,
    pageViews: summary.pageViews || 0,
    engagedSessions: Math.floor(uniqueSessions * ((100 - bounceRate) / 100)),
    conversions: summary.conversions || 0
  }
}

/**
 * Build engagement data from summary metrics
 */
export function buildEngagementData(summary = {}) {
  const bounceRate = summary.bounceRate || 0
  
  return {
    avgSessionDuration: summary.avgSessionDuration || 0,
    pagesPerSession: summary.avgPagesPerSession || 0,
    bounceRate: bounceRate,
    engagementRate: summary.engagementRate || (100 - bounceRate),
    avgScrollDepth: summary.avgScrollDepth || 65,
    avgTimeOnPage: (summary.avgSessionDuration || 0) * 0.7
  }
}

/**
 * Get daily trend data from overview, handling multiple formats
 */
export function getDailyTrend(overview, pageViewsByDay) {
  if (Array.isArray(overview?.dailyPageViews)) {
    return overview.dailyPageViews
  }
  if (Array.isArray(overview?.dailyTrend)) {
    return overview.dailyTrend
  }
  if (Array.isArray(pageViewsByDay)) {
    return pageViewsByDay
  }
  return []
}
