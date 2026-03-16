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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Loader2, Send, Eye } from 'lucide-react'
import { emailApi } from '@/lib/portal-api'
import { toast } from 'sonner'

export default function OneOffComposer() {
  const [campaignName, setCampaignName] = useState('')
  const [selectedContact, setSelectedContact] = useState(null)
  const [selectedMailbox, setSelectedMailbox] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [subject, setSubject] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [goalUrl, setGoalUrl] = useState('')
  const [scheduleType, setScheduleType] = useState('now')
  const [scheduleTime, setScheduleTime] = useState('')
  const [daypartEnabled, setDaypartEnabled] = useState(true)
  const [dailyCap, setDailyCap] = useState('100')
  const [warmupPercent, setWarmupPercent] = useState('0')
  
  const [followUps, setFollowUps] = useState([])
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false)
  const [followUpDelay, setFollowUpDelay] = useState('2')
  const [followUpSubject, setFollowUpSubject] = useState('')
  const [followUpHtml, setFollowUpHtml] = useState('')
  
  const [contactSearch, setContactSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  
  const [mailboxes, setMailboxes] = useState([])
  const [templates, setTemplates] = useState([])
  const [isSending, setIsSending] = useState(false)
  const [isLaunching, setIsLaunching] = useState(false)
  const [activeTab, setActiveTab] = useState('compose')

  const handleContactSearch = async (query) => {
    setContactSearch(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    
    setIsSearching(true)
    try {
      const res = await emailApi.searchContacts(query)
      setSearchResults(res.data.contacts || [])
    } catch (err) {
      console.error('Search error:', err)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const selectContact = (contact) => {
    setSelectedContact(contact)
    setContactSearch('')
    setSearchResults([])
  }

  const addFollowUp = () => {
    if (!followUpDelay) {
      toast.error('Enter delay in days')
      return
    }
    
    const newFollowUp = {
      id: Date.now(),
      stepIndex: followUps.length + 1,
      delayDays: parseInt(followUpDelay),
      subjectOverride: followUpSubject || subject,
      htmlOverride: followUpHtml || htmlContent,
    }
    
    setFollowUps([...followUps, newFollowUp])
    setFollowUpDelay('2')
    setFollowUpSubject('')
    setFollowUpHtml('')
    setShowFollowUpDialog(false)
    toast.success(`Follow-up F${newFollowUp.stepIndex} added`)
  }

  const removeFollowUp = (id) => {
    setFollowUps(followUps.filter(f => f.id !== id))
  }

  const handleSendTest = async () => {
    if (!selectedContact || !selectedMailbox || !subject) {
      toast.error('Select contact, mailbox, and subject')
      return
    }
    
    setIsSending(true)
    try {
      await emailApi.sendTest({
        contactId: selectedContact.id,
        mailboxId: selectedMailbox,
        subject,
        html: htmlContent,
      })
      toast.success('Test email sent!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send test')
    } finally {
      setIsSending(false)
    }
  }

  const handleLaunch = async () => {
    if (!selectedContact || !selectedMailbox || !subject) {
      toast.error('Select contact, mailbox, and subject')
      return
    }
    
    if (!campaignName) {
      toast.error('Enter a campaign name')
      return
    }

    setIsLaunching(true)
    try {
      await emailApi.composeOneOff({
        name: campaignName,
        mailboxId: selectedMailbox,
        contactId: selectedContact.id,
        subject,
        html: htmlContent,
        followUpSteps: followUps.map(f => ({
          stepIndex: f.stepIndex,
          delayDays: f.delayDays,
          subjectOverride: f.subjectOverride,
          htmlOverride: f.htmlOverride,
        })),
        goalUrl: goalUrl || null,
        scheduleType,
        scheduledTime: scheduleType === 'later' ? scheduleTime : null,
        daypartEnabled,
        dailyCap: parseInt(dailyCap),
        warmupPercent: parseInt(warmupPercent),
      })
      toast.success('Campaign launched!')
      // Reset form
      setCampaignName('')
      setSelectedContact(null)
      setSubject('')
      setHtmlContent('')
      setFollowUps([])
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="compose">Compose</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="campaign-name">Campaign Name</Label>
                  <Input
                    id="campaign-name"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g., Welcome Follow-up"
                  />
                </div>

                {/* Contact Selection */}
                <div>
                  <Label>Recipient</Label>
                  {selectedContact ? (
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
                      <div>
                        <p className="font-medium">{selectedContact.name}</p>
                        <p className="text-sm text-[var(--text-secondary)]">{selectedContact.email}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedContact(null)}
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Input
                        placeholder="Search contact by name or email..."
                        value={contactSearch}
                        onChange={(e) => handleContactSearch(e.target.value)}
                      />
                      {isSearching && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />}
                      {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 border rounded-lg bg-white shadow-lg z-50">
                          {searchResults.map((contact) => (
                            <button
                              key={contact.id}
                              onClick={() => selectContact(contact)}
                              className="w-full p-3 text-left hover:bg-[var(--surface-secondary)] border-b last:border-b-0"
                            >
                              <p className="font-medium">{contact.name}</p>
                              <p className="text-sm text-[var(--text-secondary)]">{contact.email}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Mailbox Selection */}
                <div>
                  <Label htmlFor="mailbox">Mailbox (From)</Label>
                  <Select value={selectedMailbox} onValueChange={setSelectedMailbox}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select mailbox" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default (portal@send.sonor.io)</SelectItem>
                      <SelectItem value="outreach">Outreach (outreach@sonor.io)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Subject Line */}
                <div>
                  <Label htmlFor="subject">Subject Line</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Welcome to Sonor..."
                  />
                </div>

                {/* Goal URL (Optional) */}
                <div>
                  <Label htmlFor="goal-url">Goal URL (optional - auto-cancel follow-ups on click)</Label>
                  <Input
                    id="goal-url"
                    value={goalUrl}
                    onChange={(e) => setGoalUrl(e.target.value)}
                    placeholder="https://example.com/signup"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Content Editor */}
            <Card>
              <CardHeader>
                <CardTitle>Email Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="html-content">HTML Content</Label>
                    <Textarea
                      id="html-content"
                      value={htmlContent}
                      onChange={(e) => setHtmlContent(e.target.value)}
                      placeholder="<h1>Hello!</h1><p>Welcome to our platform...</p>"
                      className="font-mono min-h-64"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scheduling & Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Schedule & Settings</CardTitle>
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
                      <Label htmlFor="schedule-time">Schedule Time</Label>
                      <Input
                        id="schedule-time"
                        type="datetime-local"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="daily-cap">Daily Cap</Label>
                    <Input
                      id="daily-cap"
                      type="number"
                      value={dailyCap}
                      onChange={(e) => setDailyCap(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="warmup">Warmup %</Label>
                    <Input
                      id="warmup"
                      type="number"
                      value={warmupPercent}
                      onChange={(e) => setWarmupPercent(e.target.value)}
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={daypartEnabled}
                        onChange={(e) => setDaypartEnabled(e.target.checked)}
                      />
                      <span className="text-sm">Business hours</span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle>Email Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-[var(--surface-secondary)] rounded-lg border">
                    <p className="text-xs text-[var(--text-secondary)] mb-2">To: {selectedContact?.email || '(no recipient selected)'}</p>
                    <p className="text-xs text-[var(--text-secondary)] mb-2">From: {selectedMailbox || '(no mailbox selected)'}</p>
                    <p className="font-bold text-sm mb-4">{subject || '(no subject)'}</p>
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

      {/* Right Sidebar */}
      <div className="space-y-6">
        {/* Follow-Ups */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Follow-Ups</CardTitle>
            <CardDescription>Automated follow-up sequence</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {followUps.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No follow-ups yet</p>
            ) : (
              <div className="space-y-2">
                {followUps.map((fu) => (
                  <div key={fu.id} className="flex items-center justify-between p-2 bg-[var(--surface-secondary)] rounded">
                    <div className="text-sm">
                      <Badge>F{fu.stepIndex}</Badge>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">+{fu.delayDays} days</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFollowUp(fu.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Dialog open={showFollowUpDialog} onOpenChange={setShowFollowUpDialog}>
              <DialogTrigger asChild>
                <Button className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Add Follow-Up
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Follow-Up Email (F{followUps.length + 1})</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="followup-delay">Days After Initial (default: 2)</Label>
                    <Input
                      id="followup-delay"
                      type="number"
                      value={followUpDelay}
                      onChange={(e) => setFollowUpDelay(e.target.value)}
                      min="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="followup-subject">Subject Override (leave blank to use initial)</Label>
                    <Input
                      id="followup-subject"
                      value={followUpSubject}
                      onChange={(e) => setFollowUpSubject(e.target.value)}
                      placeholder="Optional: Different subject for follow-up"
                    />
                  </div>
                  <div>
                    <Label htmlFor="followup-html">HTML Override (leave blank to use initial)</Label>
                    <Textarea
                      id="followup-html"
                      value={followUpHtml}
                      onChange={(e) => setFollowUpHtml(e.target.value)}
                      placeholder="Optional: Different content for follow-up"
                      className="font-mono min-h-32"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowFollowUpDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={addFollowUp}>Add Follow-Up</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <div className="text-xs text-[var(--text-secondary)] p-2 bg-[var(--surface-secondary)] rounded">
              <p className="font-medium">Auto-cancel rules:</p>
              <ul className="mt-1 space-y-1 list-disc list-inside">
                <li>Any reply detected</li>
                <li>Contact unsubscribes</li>
                <li>Bounce or complaint</li>
                <li>Goal link clicked</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleSendTest}
            disabled={isSending || !selectedContact}
          >
            {isSending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Eye className="h-4 w-4" />
            Send Test
          </Button>
          <Button
            className="w-full gap-2"
            onClick={handleLaunch}
            disabled={isLaunching || !selectedContact || !subject}
          >
            {isLaunching && <Loader2 className="h-4 w-4 animate-spin" />}
            <Send className="h-4 w-4" />
            Launch Campaign
          </Button>
        </div>
      </div>
    </div>
  )
}
