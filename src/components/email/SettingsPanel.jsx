import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export default function SettingsPanel() {
  return (
    <div className="space-y-6 max-w-2xl">
      {/* Mailboxes */}
      <Card>
        <CardHeader>
          <CardTitle>Mailboxes</CardTitle>
          <CardDescription>Configure sending email addresses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="from-name">From Name</Label>
                <Input id="from-name" placeholder="Sonor" />
              </div>
              <div>
                <Label htmlFor="from-email">From Email</Label>
                <Input id="from-email" placeholder="portal@send.sonor.io" type="email" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="reply-to">Reply-To Email</Label>
                <Input id="reply-to" placeholder="support@sonor.io" type="email" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Defaults */}
      <Card>
        <CardHeader>
          <CardTitle>Default Settings</CardTitle>
          <CardDescription>Configure campaign defaults</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="business-hours-start">Business Hours Start</Label>
              <Input id="business-hours-start" type="time" defaultValue="09:00" />
            </div>
            <div>
              <Label htmlFor="business-hours-end">Business Hours End</Label>
              <Input id="business-hours-end" type="time" defaultValue="17:00" />
            </div>
            <div>
              <Label htmlFor="daily-cap">Daily Cap (emails)</Label>
              <Input id="daily-cap" type="number" defaultValue="1000" />
            </div>
            <div>
              <Label htmlFor="warmup">Default Warmup %</Label>
              <Input id="warmup" type="number" defaultValue="0" min="0" max="100" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tracking */}
      <Card>
        <CardHeader>
          <CardTitle>Tracking & Compliance</CardTitle>
          <CardDescription>Configure tracking and compliance settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="tracking-domain">Tracking Domain</Label>
            <Input id="tracking-domain" placeholder="track.sonor.io" />
          </div>
          <div>
            <Label htmlFor="unsub-domain">Unsubscribe Domain</Label>
            <Input id="unsub-domain" placeholder="unsub.sonor.io" />
          </div>
          <div>
            <Label htmlFor="business-address">Business Address</Label>
            <Input
              id="business-address"
              placeholder="123 Business St, City, ST 12345"
              className="min-h-20"
            />
          </div>
        </CardContent>
      </Card>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>Email service provider settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              These settings are configured via environment variables. Contact your administrator to update them.
            </AlertDescription>
          </Alert>
          <div>
            <Label>Resend API Key Status</Label>
            <p className="text-sm text-green-600 font-medium mt-1">✓ Configured</p>
          </div>
          <div>
            <Label>Webhook Signing Secret</Label>
            <p className="text-sm text-green-600 font-medium mt-1">✓ Configured</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
