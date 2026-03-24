import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Send, Eye, AlertCircle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { emailApi } from '@/lib/sonor-api'
import { toast } from 'sonner'

export default function NewsletterComposer() {
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [subjectB, setSubjectB] = useState('')
  const [preheader, setPreheader] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [textContent, setTextContent] = useState('')
  const [selectedLists, setSelectedLists] = useState([])
  const [selectedTags, setSelectedTags] = useState([])
  const [selectedMailbox, setSelectedMailbox] = useState('')
  
  const [abTestEnabled, setAbTestEnabled] = useState(false)
  const [abSplitPercent, setAbSplitPercent] = useState('50')
  const [abMetric, setAbMetric] = useState('open')
  const [abEvaluationHours, setAbEvaluationHours] = useState('24')
  
  const [scheduleType, setScheduleType] = useState('now')
  const [scheduleTime, setScheduleTime] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [seedTestEnabled, setSeedTestEnabled] = useState(false)
  
  const [resendEnabled, setResendEnabled] = useState(false)
  const [resendDelayDays, setResendDelayDays] = useState('3')
  const [resendSubject, setResendSubject] = useState('')
  
  const [viewInBrowserEnabled, setViewInBrowserEnabled] = useState(true)
  const [utmPreset, setUtmPreset] = useState('newsletter')
  
  const [estimatedCount, setEstimatedCount] = useState(0)
  const [isValidating, setIsValidating] = useState(false)
  const [isLaunching, setIsLaunching] = useState(false)
  const [activeTab, setActiveTab] = useState('compose')

  const availableLists = [
    { id: 'subscribers', name: 'All Subscribers' },
    { id: 'engaged', name: 'Engaged (opened last 90 days)' },
    { id: 'inactive', name: 'Inactive (not opened 90+ days)' },
  ]

  const availableTags = [
    'Product Updates',
    'Company News',
    'Case Studies',
    'Events',
    'Tips & Tricks',
  ]

  const validateAudience = async () => {
    if (selectedLists.length === 0) {
      toast.error('Select at least one list')
      return
    }

    setIsValidating(true)
    try {
      const res = await emailApi.validateAudience({
        lists: selectedLists,
        tags: selectedTags,
      })
      setEstimatedCount(res.data.count)
      toast.success(`Audience validated: ${res.data.count} recipients`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to validate audience')
    } finally {
      setIsValidating(false)
    }
  }

  const handleLaunch = async () => {
    if (!name || !subject || !htmlContent) {
      toast.error('Fill in name, subject, and content')
      return
    }

    if (selectedLists.length === 0) {
      toast.error('Select at least one list')
      return
    }

    if (!selectedMailbox) {
      toast.error('Select a mailbox')
      return
    }

    if (abTestEnabled && !subjectB) {
      toast.error('Enter subject B for A/B testing')
      return
    }

    setIsLaunching(true)
    try {
      await emailApi.composeNewsletter({
        name,
        mailboxId: selectedMailbox,
        subject,
        preheader,
        html: htmlContent,
        text: textContent,
        lists: selectedLists,
        tags: selectedTags,
        abTestEnabled,
        abSubjectB: subjectB,
        abSplitPercent: parseInt(abSplitPercent),
        abMetric,
        abEvaluationWindowHours: parseInt(abEvaluationHours),
        scheduleType,
        scheduledTime: scheduleType === 'later' ? scheduleTime : null,
        timezone,
        seedTestEnabled,
        resendEnabled,
        resendDelayDays: parseInt(resendDelayDays),
        resendSubject,
        viewInBrowserEnabled,
        utmPreset,
      })
      toast.success('Newsletter campaign launched!')
      setName('')
      setSubject('')
      setHtmlContent('')
      setSelectedLists([])
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to launch campaign')
    } finally {
      setIsLaunching(false)
    }
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Composer */}
      <div className="col-span-2">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="compose">Compose</TabsTrigger>
            <TabsTrigger value="audience">Audience</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Campaign Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="campaign-name">Campaign Name</Label>
                  <Input
                    id="campaign-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="October Product Updates"
                  />
                </div>

                <div>
                  <Label htmlFor="mailbox">Mailbox (From)</Label>
                  <Select value={selectedMailbox} onValueChange={setSelectedMailbox}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select mailbox" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default (portal@send.sonor.io)</SelectItem>
                      <SelectItem value="newsletter">Newsletter (newsletter@sonor.io)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Subject Lines */}
            <Card>
              <CardHeader>
                <CardTitle>Subject Lines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="subject-a">Subject A (Primary)</Label>
                  <Input
                    id="subject-a"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Check out our latest updates..."
                  />
                </div>

                {abTestEnabled && (
                  <div>
                    <Label htmlFor="subject-b">Subject B (Test)</Label>
                    <Input
                      id="subject-b"
                      value={subjectB}
                      onChange={(e) => setSubjectB(e.target.value)}
                      placeholder="You won't believe what's new..."
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="preheader">Preheader (Preview Text)</Label>
                  <Input
                    id="preheader"
                    value={preheader}
                    onChange={(e) => setPreheader(e.target.value)}
                    placeholder="This shows in email preview"
                    maxLength="150"
                  />
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">{preheader.length}/150</p>
                </div>
              </CardContent>
            </Card>

            {/* Content */}
            <Card>
              <CardHeader>
                <CardTitle>Email Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="html-content">HTML Content</Label>
                  <Textarea
                    id="html-content"
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    placeholder="Paste your HTML email content here..."
                    className="font-mono min-h-64"
                  />
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">{htmlContent.length} characters</p>
                </div>

                <div>
                  <Label htmlFor="text-content">Plain Text Alternative</Label>
                  <Textarea
                    id="text-content"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Leave blank to auto-generate from HTML"
                    className="min-h-32"
                  />
                </div>
              </CardContent>
            </Card>

            {/* A/B Testing */}
            <Card>
              <CardHeader>
                <CardTitle>A/B Testing (Optional)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={abTestEnabled}
                    onChange={(e) => setAbTestEnabled(e.target.checked)}
                  />
                  <span className="text-sm">Enable A/B subject test</span>
                </label>

                {abTestEnabled && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="ab-split">Test Split %</Label>
                      <Input
                        id="ab-split"
                        type="number"
                        value={abSplitPercent}
                        onChange={(e) => setAbSplitPercent(e.target.value)}
                        min="10"
                        max="90"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ab-metric">Winner by</Label>
                      <Select value={abMetric} onValueChange={setAbMetric}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open Rate</SelectItem>
                          <SelectItem value="click">Click Rate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="ab-window">Evaluation (hours)</Label>
                      <Input
                        id="ab-window"
                        type="number"
                        value={abEvaluationHours}
                        onChange={(e) => setAbEvaluationHours(e.target.value)}
                        min="1"
                        max="168"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Schedule */}
            <Card>
              <CardHeader>
                <CardTitle>Schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="schedule-type">Send</Label>
                    <Select value={scheduleType} onValueChange={setScheduleType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="now">Now</SelectItem>
                        <SelectItem value="later">Later</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {scheduleType === 'later' && (
                    <div>
                      <Label htmlFor="schedule-time">Date & Time</Label>
                      <Input
                        id="schedule-time"
                        type="datetime-local"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="EST">EST</SelectItem>
                      <SelectItem value="CST">CST</SelectItem>
                      <SelectItem value="MST">MST</SelectItem>
                      <SelectItem value="PST">PST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={seedTestEnabled}
                    onChange={(e) => setSeedTestEnabled(e.target.checked)}
                  />
                  <span className="text-sm">Send to test inbox first</span>
                </label>
              </CardContent>
            </Card>

            {/* Re-send */}
            <Card>
              <CardHeader>
                <CardTitle>Re-send to Non-Openers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resendEnabled}
                    onChange={(e) => setResendEnabled(e.target.checked)}
                  />
                  <span className="text-sm">Enable re-send</span>
                </label>

                {resendEnabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="resend-delay">Days After Initial</Label>
                      <Input
                        id="resend-delay"
                        type="number"
                        value={resendDelayDays}
                        onChange={(e) => setResendDelayDays(e.target.value)}
                        min="1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="resend-subject">New Subject (optional)</Label>
                      <Input
                        id="resend-subject"
                        value={resendSubject}
                        onChange={(e) => setResendSubject(e.target.value)}
                        placeholder="Leave blank to use original"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={viewInBrowserEnabled}
                    onChange={(e) => setViewInBrowserEnabled(e.target.checked)}
                  />
                  <span className="text-sm">Include "View in Browser" link</span>
                </label>

                <div>
                  <Label htmlFor="utm-preset">UTM Preset</Label>
                  <Select value={utmPreset} onValueChange={setUtmPreset}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newsletter">Newsletter</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                      <SelectItem value="promotion">Promotion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audience" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Audience</CardTitle>
                <CardDescription>Choose who receives this newsletter</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Lists (opt-in contacts only)</Label>
                  <div className="space-y-2 mt-2">
                    {availableLists.map((list) => (
                      <label key={list.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedLists.includes(list.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLists([...selectedLists, list.id])
                            } else {
                              setSelectedLists(selectedLists.filter(l => l !== list.id))
                            }
                          }}
                        />
                        <span className="text-sm">{list.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Tags (filter audience)</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {availableTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => {
                          if (selectedTags.includes(tag)) {
                            setSelectedTags(selectedTags.filter(t => t !== tag))
                          } else {
                            setSelectedTags([...selectedTags, tag])
                          }
                        }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button onClick={validateAudience} disabled={isValidating} className="w-full">
                  {isValidating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Validate Audience
                </Button>

                {estimatedCount > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{estimatedCount.toLocaleString()}</strong> recipients will receive this newsletter
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-[var(--surface-secondary)] rounded-lg border">
                    <p className="text-xs text-[var(--text-secondary)] mb-1">Subject: {subject || '(no subject)'}</p>
                    <p className="text-xs text-[var(--text-secondary)] mb-4">Preheader: {preheader || '(no preheader)'}</p>
                    <div
                      className="prose prose-sm max-w-none bg-white p-4 rounded"
                      dangerouslySetInnerHTML={{ __html: htmlContent || '<p>No content yet</p>' }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Summary */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Campaign</p>
              <p className="font-semibold">{name || 'Unnamed'}</p>
            </div>

            <div>
              <p className="text-xs text-[var(--text-secondary)]">Recipients</p>
              <p className="font-semibold">{estimatedCount.toLocaleString() || 'Not validated'}</p>
            </div>

            <div>
              <p className="text-xs text-[var(--text-secondary)]">Schedule</p>
              <p className="font-semibold capitalize">{scheduleType}</p>
            </div>

            {abTestEnabled && (
              <div>
                <p className="text-xs text-[var(--text-secondary)]">A/B Test</p>
                <Badge>Enabled</Badge>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  {abSplitPercent}% get subject A, winner selected by {abMetric} after {abEvaluationHours}h
                </p>
              </div>
            )}

            {resendEnabled && (
              <div>
                <p className="text-xs text-[var(--text-secondary)]">Re-send</p>
                <Badge variant="outline">Non-openers +{resendDelayDays}d</Badge>
              </div>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Compliance check: Includes one-click unsubscribe, business address, and preference link.
              </AlertDescription>
            </Alert>

            <Button
              className="w-full gap-2 mt-6"
              onClick={handleLaunch}
              disabled={isLaunching || selectedLists.length === 0 || !name || !subject}
            >
              {isLaunching && <Loader2 className="h-4 w-4 animate-spin" />}
              <Send className="h-4 w-4" />
              Launch Campaign
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
