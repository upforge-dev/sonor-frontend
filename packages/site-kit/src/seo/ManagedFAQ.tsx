import * as React from 'react'
import { getFAQData } from './api'
import type { ManagedFAQProps, FAQItem } from './types'
import { createSchema } from './ManagedSchema'

/**
 * Inline styles for the accordion FAQ (no external CSS dependency)
 */
const faqStyles = `
.uptrade-faq-items {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.uptrade-faq-item {
  border-bottom: 1px solid rgba(0,0,0,0.08);
}
.uptrade-faq-item:first-child {
  border-top: 1px solid rgba(0,0,0,0.08);
}
.uptrade-faq-item summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: 1.25rem 0;
  font-weight: 600;
  font-size: 1.05rem;
  line-height: 1.5;
  color: inherit;
  list-style: none;
  user-select: none;
  transition: color 0.15s ease;
}
.uptrade-faq-item summary:hover {
  opacity: 0.8;
}
.uptrade-faq-item summary::-webkit-details-marker {
  display: none;
}
.uptrade-faq-item summary::marker {
  display: none;
  content: '';
}
.uptrade-faq-chevron {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  margin-left: 1rem;
  transition: transform 0.2s ease;
  opacity: 0.5;
}
.uptrade-faq-item[open] .uptrade-faq-chevron {
  transform: rotate(180deg);
}
.uptrade-faq-answer {
  padding: 0 0 1.25rem 0;
  color: rgba(0,0,0,0.6);
  line-height: 1.75;
  font-size: 0.95rem;
}
.uptrade-faq-answer p {
  margin: 0 0 0.75rem 0;
}
.uptrade-faq-answer p:last-child {
  margin-bottom: 0;
}
.uptrade-faq-answer ul, .uptrade-faq-answer ol {
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}
.uptrade-faq-answer li {
  margin-bottom: 0.25rem;
}
.uptrade-faq-answer a {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.uptrade-faq-title {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}
.uptrade-faq-description {
  color: rgba(0,0,0,0.6);
  margin-bottom: 2rem;
  font-size: 1rem;
  line-height: 1.6;
}
`

/**
 * Chevron SVG (no icon library dependency)
 */
function ChevronDown() {
  return (
    <svg
      className="uptrade-faq-chevron"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

/**
 * Default FAQ item renderer – uses native <details>/<summary> for toggle
 */
function DefaultFAQItem({ item, index }: { item: FAQItem; index: number }) {
  return (
    <details key={item.id} className="uptrade-faq-item">
      <summary>
        <span>{item.question}</span>
        <ChevronDown />
      </summary>
      <div
        className="uptrade-faq-answer"
        dangerouslySetInnerHTML={{ __html: item.answer }}
      />
    </details>
  )
}

/**
 * Generate FAQ schema from items
 * 
 * IMPORTANT: This is the ONLY place FAQ schema (FAQPage) is generated.
 * The CLI setup command does NOT generate FAQ schema - it only extracts/uploads
 * FAQ data to the Portal. This component then dynamically generates the schema
 * from that data, ensuring FAQ changes in Portal automatically update the schema.
 */
function generateFAQSchema(items: FAQItem[]): Record<string, unknown> {
  return createSchema('FAQPage', {
    mainEntity: items
      .filter(item => item.is_visible)
      .map(item => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
  })
}

/**
 * ManagedFAQ - Server Component that renders FAQ section with schema
 * 
 * Fetches FAQ content from Portal and renders with optional schema injection
 * 
 * @example
 * ```tsx
 * // app/services/plumbing/page.tsx
 * import { ManagedFAQ } from '@uptrade/seo'
 * 
 * export default async function PlumbingPage() {
 *   return (
 *     <main>
 *       <h1>Plumbing Services</h1>
 *       <section>
 *         <ManagedFAQ 
 *           projectId={process.env.UPTRADE_PROJECT_ID!}
 *           path="/services/plumbing"
 *           showTitle
 *           includeSchema
 *         />
 *       </section>
 *     </main>
 *   )
 * }
 * ```
 */
export async function ManagedFAQ({
  projectId,
  path,
  className,
  renderItem,
  includeSchema = true,
  showTitle = true,
}: ManagedFAQProps): Promise<React.ReactElement | null> {
  const faqData = await getFAQData(projectId, path)

  if (!faqData || !faqData.items?.length) {
    return null
  }

  const visibleItems = faqData.items.filter((item: FAQItem) => item.is_visible)
  
  if (visibleItems.length === 0) {
    return null
  }

  // Sort by order
  visibleItems.sort((a: FAQItem, b: FAQItem) => a.order - b.order)

  const shouldIncludeSchema = includeSchema && faqData.include_schema

  return (
    <>
      {shouldIncludeSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateFAQSchema(visibleItems), null, 0),
          }}
        />
      )}
      {/* Embedded styles for accordion FAQ (no external CSS file needed) */}
      <style dangerouslySetInnerHTML={{ __html: faqStyles }} />
      <div className={className || 'uptrade-faq'}>
        {showTitle && faqData.title && (
          <h2 className="uptrade-faq-title">{faqData.title}</h2>
        )}
        {faqData.description && (
          <p className="uptrade-faq-description">{faqData.description}</p>
        )}
        <div className="uptrade-faq-items">
          {visibleItems.map((item: FAQItem, index: number) => 
            renderItem 
              ? renderItem(item, index)
              : <DefaultFAQItem key={item.id} item={item} index={index} />
          )}
        </div>
      </div>
    </>
  )
}

export default ManagedFAQ
