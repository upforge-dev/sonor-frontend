import { useState, useEffect, useCallback, useMemo } from 'react'
import { COMPONENT_REGISTRY } from './ContractBlocks'

/**
 * ContractView — JSON-schema contract renderer with MDX fallback.
 * 
 * When a contract has `sections_json`, renders each section using
 * the component registry. Falls back to MDX when sections_json is null.
 */
export default function ContractView({ contract, isPublicView = false, onBack, MdxFallback }) {
  const sectionsJson = contract?.sections_json
  const lineItems = contract?.line_items || contract?.metadata?.line_items || []

  if (!sectionsJson && MdxFallback) {
    return <MdxFallback contract={contract} isPublicView={isPublicView} onBack={onBack} />
  }

  if (!sectionsJson) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No contract content available.</p>
      </div>
    )
  }

  const sections = Array.isArray(sectionsJson) ? sectionsJson : []

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-10 print:shadow-none print:border-0">
        {sections.map((section, index) => (
          <ContractSection
            key={`${section.type}-${index}`}
            section={section}
            lineItems={lineItems}
            contract={contract}
          />
        ))}
      </div>
    </div>
  )
}

function ContractSection({ section, lineItems, contract }) {
  const Component = COMPONENT_REGISTRY[section.type]

  if (!Component) {
    if (section.type === 'Custom' && section.props?.html) {
      return <div className="mb-6" dangerouslySetInnerHTML={{ __html: section.props.html }} />
    }
    return (
      <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
        Unknown section type: <code>{section.type}</code>
      </div>
    )
  }

  const props = { ...section.props }

  if (section.source === 'line_items') {
    props.items = lineItems
    props.total = contract?.total_amount
    props.deposit = contract?.intake_data?.deposit_amount
  }

  if (section.type === 'SignatureBlock') {
    props.clientName = contract?.recipient_name || props.clientName
    props.clientSignedAt = contract?.signed_at
    props.clientSignatureUrl = contract?.client_signature_url
  }

  return <Component {...props} />
}

export function resolveTemplate(sectionsTemplate, intakeData, lineItems = [], defaultTerms = {}) {
  return sectionsTemplate.map(section => {
    const resolved = { type: section.type }

    if (section.source === 'line_items') {
      resolved.source = 'line_items'
      resolved.props = section.props || {}
      return resolved
    }

    if (section.use_defaults && defaultTerms[section.type]) {
      resolved.props = { ...defaultTerms[section.type] }
      return resolved
    }

    if (section.props) {
      resolved.props = { ...section.props }
      return resolved
    }

    if (section.props_map) {
      resolved.props = {}
      for (const [propKey, expression] of Object.entries(section.props_map)) {
        resolved.props[propKey] = resolveExpression(expression, intakeData)
      }
      return resolved
    }

    resolved.props = {}
    return resolved
  })
}

function resolveExpression(expr, intakeData) {
  if (typeof expr !== 'string') return expr

  if (expr.startsWith("'") && expr.endsWith("'")) {
    return expr.slice(1, -1)
  }

  if (expr.startsWith('intake.')) {
    const key = expr.replace('intake.', '')
    return intakeData?.[key] ?? ''
  }

  if (expr.startsWith('[') && expr.endsWith(']')) {
    try {
      const inner = expr.slice(1, -1).trim()
      if (inner.startsWith('{')) {
        const resolved = inner.replace(/intake\.(\w+)/g, (_, key) => {
          const val = intakeData?.[key]
          return typeof val === 'string' ? `"${val}"` : String(val ?? '')
        })
        return [JSON.parse(resolved)]
      }
    } catch {
      // fall through
    }
  }

  return expr
}
