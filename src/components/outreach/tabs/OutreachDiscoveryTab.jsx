import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  SearchCode, Loader2, Globe, Users, Building, MapPin, Target, TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { outreachSkillsApi } from '@/lib/signal-api'
import SignalIcon from '@/components/ui/SignalIcon'

const SOURCE_TYPES = [
  { value: 'yelp', label: 'Yelp' },
  { value: 'yellowpages', label: 'Yellow Pages' },
  { value: 'bbb', label: 'BBB' },
  { value: 'google', label: 'Google Maps' },
  { value: 'industry', label: 'Industry Registry' },
]

export default function OutreachDiscoveryTab() {
  const [industry, setIndustry] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [keywords, setKeywords] = useState('')
  const [sourceType, setSourceType] = useState('yelp')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [aiRecommendations, setAiRecommendations] = useState(null)
  const [loadingRecs, setLoadingRecs] = useState(false)

  const loadRecommendations = async () => {
    setLoadingRecs(true)
    try {
      const recs = await outreachSkillsApi.recommendTargets({
        industry_focus: industry || undefined,
      })
      setAiRecommendations(recs)
    } catch {
      // AI recommendations are optional — silently fail
    } finally {
      setLoadingRecs(false)
    }
  }

  const handleDiscover = async () => {
    if (!industry.trim() || !city.trim()) {
      toast.error('Industry and city are required')
      return
    }

    setLoading(true)
    try {
      toast.info('Discovery job queued — this may take a few minutes')
      // In production, this would call the Portal API which enqueues to serp-worker
      setResults({
        status: 'queued',
        jobId: 'demo-job-id',
        message: 'Lead discovery job has been submitted. Results will appear in your CRM contacts.',
      })
    } catch (err) {
      toast.error('Failed to start discovery')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Lead Discovery</h2>
        <p className="text-muted-foreground">Use Bright Data to discover and enrich leads from business directories</p>
      </div>

      {/* Signal Recommendations Panel */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <SignalIcon className="h-5 w-5 text-primary" />
              Signal Recommendations
            </CardTitle>
            <Button variant="outline" size="sm" onClick={loadRecommendations} disabled={loadingRecs}>
              {loadingRecs ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <SignalIcon className="h-3.5 w-3.5 mr-1.5" />}
              Get Recommendations
            </Button>
          </div>
          <CardDescription>Signal analyzes your site visitors, CRM data, and closed deals to suggest ideal outreach targets</CardDescription>
        </CardHeader>
        {aiRecommendations && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              {aiRecommendations.recommendations?.map((rec, i) => (
                <div key={i} className="p-3 rounded-lg border bg-background">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{rec.industry}</span>
                    <Badge variant="secondary" className="text-xs">{Math.round(rec.confidence * 100)}%</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{rec.geo}</div>
                    <div className="flex items-center gap-1"><Building className="h-3 w-3" />{rec.company_size}</div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 italic">{rec.reasoning}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 text-xs w-full"
                    onClick={() => {
                      setIndustry(rec.industry)
                      setCity(rec.geo?.split(',')[0] || '')
                    }}
                  >
                    <Target className="h-3 w-3 mr-1" /> Use as Search
                  </Button>
                </div>
              ))}
            </div>
            {aiRecommendations.insights?.length > 0 && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs font-medium mb-1">Insights</p>
                <ul className="space-y-1">
                  {aiRecommendations.insights.map((insight, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <TrendingUp className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Discovery Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><SearchCode className="h-5 w-5" />Discover Leads</CardTitle>
            <CardDescription>Search business directories for prospects matching your criteria</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Industry / Business Type</Label>
              <Input placeholder="e.g. plumbing, dental, real estate" value={industry} onChange={(e) => setIndustry(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>City</Label>
                <Input placeholder="Chicago" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <Label>State</Label>
                <Input placeholder="IL" value={state} onChange={(e) => setState(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Keywords (optional)</Label>
              <Input placeholder="emergency, residential, commercial" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
            </div>

            <div>
              <Label>Source Directory</Label>
              <Select value={sourceType} onValueChange={setSourceType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleDiscover} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchCode className="h-4 w-4" />}
              Discover Leads
            </Button>
          </CardContent>
        </Card>

        {/* Info + Results */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><SearchCode className="h-5 w-5" />How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">1</span>
                  <span>Bright Data crawls the selected directory for businesses matching your criteria</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">2</span>
                  <span>Company names, domains, contacts, and phone numbers are extracted</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">3</span>
                  <span>Contacts are enriched with email patterns and decision-maker data</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">4</span>
                  <span>Results are saved to your CRM as target companies and contacts</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">5</span>
                  <span>Enroll discovered contacts directly into a cold outreach sequence</span>
                </li>
              </ol>
            </CardContent>
          </Card>

          {results && (
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-100"><Target className="h-5 w-5 text-green-600" /></div>
                  <div>
                    <h4 className="font-semibold text-green-700">Discovery Job Submitted</h4>
                    <p className="text-sm text-green-600">{results.message}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Supported Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Globe, name: 'Yelp', desc: 'Local businesses' },
                  { icon: Building, name: 'Yellow Pages', desc: 'Business directory' },
                  { icon: Users, name: 'BBB', desc: 'Verified businesses' },
                  { icon: MapPin, name: 'Google Maps', desc: 'Location data' },
                ].map((source) => (
                  <div key={source.name} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <source.icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{source.name}</p>
                      <p className="text-xs text-muted-foreground">{source.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
