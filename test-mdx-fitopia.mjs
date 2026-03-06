// Test MDX sanitization for Fitopia proposal
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

// Minimal sanitize logic to trace the problem
const mdxContent = `<GlassHero title="Transform FITOPIA's Digital Experience" subtitle="Revitalize your site with Next.js & Sanity — fast, scalable, franchise-ready" clientName="FITOPIA" proposalType="rebuild" stats={[{ value: "21", label: "Performance (current)" }, { value: "77", label: "SEO" }, { value: "3w", label: "Target Launch" }]} />

<SiteAnalysisCard
  url="https://fitopiaems.com"
  screenshot="https://mwcjtnoqxolplwpkxnfe.supabase.co/storage/v1/object/public/screenshots/fitopiaems.com/1280x800/1772763789883.webp"
  scores={{ performance: 21, seo: 77, accessibility: 91, bestPractices: 73 }}
  technologies={["Legacy CMS / PHP-driven pages", "Heavy third-party embeds (video, Instagram)", "Unoptimized JS/CSS bundles"]}
  findings={[
    { type: "issue", text: "Very low Performance (21/100): pages load slowly, causing higher bounce rates and poor Core Web Vitals." },
    { type: "issue", text: "Third-party video and social embeds are blocking the main thread and increasing TTFB/CLS." },
    { type: "issue", text: "Location pages are fragmented and not ready for scaling to dozens of franchise studios — no geo-routing or stable location templates detected." },
    { type: "opportunity", text: "No structured multi-location routing or dynamic meta generation for local SEO — we can target city-specific keywords immediately." },
    { type: "opportunity", text: "CMS workflow limitations: marketing needs easier publishing for research, success stories, and gated franchise content." }
  ]}
/>

<CriticalIssues title="CRITICAL DIGITAL GAPS">
  <IssueCard title="Critical performance bottlenecks" description="Lighthouse Performance: 21/100. Slow initial load and render are causing visitor drop-off and hurting local ad effectiveness. Improving Core Web Vitals is essential for SEO and conversions." severity="critical" />
  <IssueCard title="Friction in 'Free Intro' booking flow" description="The primary CTA needs an app-like, multi-step flow." severity="critical" />
</CriticalIssues>`

let s = mdxContent
// Apply the same sanitization as ProposalView
s = s.replace(/\\"/g, "'")
s = s.replace(/(\w)'(\w)/g, '$1\u2019$2')

const lines = s.split(/\r?\n/)
console.log('Line 21 (1-indexed):')
console.log(lines[20])
console.log('\nColumn 44: char =', JSON.stringify(lines[20]?.[43]))
console.log('\nFull line 21:')
console.log(lines[20])
