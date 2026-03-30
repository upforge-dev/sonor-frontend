/**
 * AgencyProfileSection — Inline editor for agency proposal profile.
 * Renders below Organization Profile in Org Settings.
 * Data stored in organizations.agency_profile (JSONB).
 *
 * Portfolio items auto-pull from featured items in the Portfolio module.
 */
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Save, Loader2, Building2, Globe, Plus, X, Award
} from 'lucide-react'
import { toast } from 'sonner'
import { adminApi } from '@/lib/sonor-api'

export default function AgencyProfileSection({ orgDetails, orgId, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [newHighlight, setNewHighlight] = useState('')

  const [profile, setProfile] = useState({
    name: '',
    logo: '',
    tagline: '',
    description: '',
    founded: '',
    team_size: '',
    projects_completed: '',
    website: '',
    highlights: [],
  })

  useEffect(() => {
    if (orgDetails) {
      const existing = orgDetails.agency_profile || {}
      setProfile({
        name: existing.name || orgDetails.name || '',
        logo: existing.logo || '',
        tagline: existing.tagline || '',
        description: existing.description || '',
        founded: existing.founded || '',
        team_size: existing.team_size || '',
        projects_completed: existing.projects_completed || '',
        website: existing.website || orgDetails.website || '',
        highlights: existing.highlights || [],
      })
    }
  }, [orgDetails])

  const updateField = (key, value) => {
    setProfile(prev => ({ ...prev, [key]: value }))
  }

  const addHighlight = () => {
    const text = newHighlight.trim()
    if (!text) return
    updateField('highlights', [...profile.highlights, text])
    setNewHighlight('')
  }

  const removeHighlight = (index) => {
    updateField('highlights', profile.highlights.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!orgId) return
    setSaving(true)
    try {
      await adminApi.updateOrganization(orgId, { agency_profile: profile })
      toast.success('Agency profile saved')
      onSaved?.(profile)
    } catch (err) {
      console.error('Failed to save agency profile:', err)
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[var(--brand-primary)]" />
          Agency Profile
        </CardTitle>
        <CardDescription>
          This information appears in all your proposals to build trust with clients.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Identity */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Agency Name</Label>
            <Input
              value={profile.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Your Agency"
            />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input
              value={profile.website}
              onChange={(e) => updateField('website', e.target.value)}
              placeholder="youragency.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Logo URL</Label>
            <div className="flex items-center gap-3">
              {profile.logo && (
                <img
                  src={profile.logo}
                  alt="Logo preview"
                  className="w-10 h-10 rounded-lg object-contain border border-[var(--glass-border)]"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              )}
              <Input
                value={profile.logo}
                onChange={(e) => updateField('logo', e.target.value)}
                placeholder="https://..."
                className="flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tagline</Label>
            <Input
              value={profile.tagline}
              onChange={(e) => updateField('tagline', e.target.value)}
              placeholder="We build digital experiences that convert"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>About Your Agency</Label>
          <Textarea
            value={profile.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="A brief description of your agency, what you specialize in, and why clients choose you."
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Founded</Label>
            <Input
              value={profile.founded}
              onChange={(e) => updateField('founded', e.target.value)}
              placeholder="2020"
            />
          </div>
          <div className="space-y-2">
            <Label>Team Size</Label>
            <Input
              value={profile.team_size}
              onChange={(e) => updateField('team_size', e.target.value)}
              placeholder="8"
            />
          </div>
          <div className="space-y-2">
            <Label>Projects Completed</Label>
            <Input
              value={profile.projects_completed}
              onChange={(e) => updateField('projects_completed', e.target.value)}
              placeholder="150+"
            />
          </div>
        </div>

        {/* Highlights */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Highlights & Credentials
          </Label>
          {profile.highlights.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {profile.highlights.map((h, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {h}
                  <button onClick={() => removeHighlight(i)} className="ml-1 hover:text-[var(--accent-red)]">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={newHighlight}
              onChange={(e) => setNewHighlight(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHighlight())}
              placeholder="e.g. 5-Star Google Rating, Next.js Experts, 100+ Websites Built"
            />
            <Button variant="outline" size="sm" onClick={addHighlight}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Portfolio Info */}
        <div className="p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--glass-border)]">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-[var(--brand-primary)]" />
            <Label className="font-medium">Portfolio in Proposals</Label>
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">
            Your <strong>featured</strong> portfolio items are automatically included in every proposal.
            Mark items as featured in the Portfolio module to control which projects appear.
          </p>
        </div>

        {/* Save */}
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Agency Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
