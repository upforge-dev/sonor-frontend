/**
 * EmailClientPreview — Shows how an email signature renders across
 * Gmail, Outlook, and Apple Mail by applying known CSS restrictions.
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

// Outlook strips many CSS properties. This simulates what survives.
function outlookTransform(html) {
  return html
    // Outlook ignores max-width
    .replace(/max-width:\s*[^;]+;?/g, '')
    // Outlook ignores border-radius
    .replace(/border-radius:\s*[^;]+;?/g, '')
    // Outlook ignores background-image/gradient
    .replace(/background-image:\s*[^;]+;?/g, '')
    .replace(/background:\s*linear-gradient[^;]+;?/g, '')
    // Outlook ignores box-shadow
    .replace(/box-shadow:\s*[^;]+;?/g, '')
    // Outlook ignores object-fit
    .replace(/object-fit:\s*[^;]+;?/g, '')
}

// Gmail strips <style> blocks but keeps inline styles (our templates use inline)
function gmailTransform(html) {
  // Remove any <style> blocks
  return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
}

// Apple Mail is the most permissive — renders almost everything
function appleMailTransform(html) {
  return html
}

const CLIENTS = [
  {
    name: 'Gmail',
    transform: gmailTransform,
    compatibility: 'high',
    notes: 'Gmail strips <style> blocks but our templates use inline styles. Full support.',
    icon: CheckCircle,
    color: 'text-green-500',
  },
  {
    name: 'Outlook',
    transform: outlookTransform,
    compatibility: 'medium',
    notes: 'Outlook strips border-radius, max-width, box-shadow, and object-fit. Images may appear square.',
    icon: AlertTriangle,
    color: 'text-yellow-500',
  },
  {
    name: 'Apple Mail',
    transform: appleMailTransform,
    compatibility: 'high',
    notes: 'Apple Mail has excellent CSS support. Full rendering including animations.',
    icon: CheckCircle,
    color: 'text-green-500',
  },
]

export default function EmailClientPreview({ html }) {
  const [activeClient, setActiveClient] = useState('Gmail')

  if (!html) return null

  const client = CLIENTS.find(c => c.name === activeClient) || CLIENTS[0]
  const transformedHtml = client.transform(html)
  const Icon = client.icon

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">
          Email Client Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Client tabs */}
        <div className="flex gap-1 bg-muted p-0.5 rounded-md">
          {CLIENTS.map((c) => (
            <button
              key={c.name}
              onClick={() => setActiveClient(c.name)}
              className={`flex-1 px-3 py-1.5 rounded text-xs transition-colors ${
                activeClient === c.name
                  ? 'bg-background text-foreground shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Compatibility badge */}
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${client.color}`} />
          <span className="text-xs text-muted-foreground">{client.notes}</span>
        </div>

        {/* Preview */}
        <div className="border border-border rounded-lg overflow-hidden bg-white p-4">
          <div
            dangerouslySetInnerHTML={{ __html: transformedHtml }}
            style={{ fontSize: '14px', fontFamily: 'Arial, Helvetica, sans-serif', color: '#333' }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
