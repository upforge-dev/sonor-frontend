// src/components/NewContractModal.jsx
// Modal for client orgs to create contracts with rich text editor

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import RichTextEditor from '@/components/ui/RichTextEditor'
import { ContactSelector } from '@/components/ContactSelector'
import { Loader2, FileSignature, Save, Send } from 'lucide-react'
import { proposalsApi } from '@/lib/sonor-api'
import { toast } from '@/lib/toast'

/**
 * NewContractModal - For client orgs to create contracts to send to their customers
 * 
 * Features:
 * - Rich text editor (TipTap) for contract content
 * - Contact selector (filters to 'lead' and 'customer' types)
 * - Signature toggle (requires recipient signature)
 * - Valid until date (optional)
 * 
 * The contract is saved with doc_type: 'contract'
 */
export function NewContractModal({ 
  open, 
  onOpenChange, 
  onSuccess,
  projectId,
  contacts = []  // Pre-loaded contacts from parent
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [selectedContact, setSelectedContact] = useState(null)
  const [includeSignature, setIncludeSignature] = useState(true)
  const [validUntil, setValidUntil] = useState('')

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setTitle('')
      setDescription('')
      setContent('')
      setSelectedContact(null)
      setIncludeSignature(true)
      setValidUntil('')
    }
  }, [open])

  // Filter contacts to only show leads and customers
  const validContacts = contacts.filter(c => 
    ['lead', 'customer'].includes(c.contact_type)
  )

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title')
      return
    }

    setIsLoading(true)
    try {
      const response = await proposalsApi.create({
        title: title.trim(),
        description: description.trim(),
        mdxContent: content,
        contactId: selectedContact?.id,
        projectId,
        includeSignature,
        validUntil: validUntil || undefined,
        status: 'draft',
      })

      const contract = response.data.proposal || response.data
      toast.success('Contract saved as draft')
      onSuccess?.(contract)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save contract:', error)
      toast.error('Failed to save contract')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveAndSend = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title')
      return
    }
    if (!selectedContact) {
      toast.error('Please select a recipient')
      return
    }

    setIsSending(true)
    try {
      // First create the contract
      const createResponse = await proposalsApi.create({
        title: title.trim(),
        description: description.trim(),
        mdxContent: content,
        contactId: selectedContact.id,
        projectId,
        includeSignature,
        validUntil: validUntil || undefined,
        status: 'draft',
      })

      const contract = createResponse.data.proposal || createResponse.data

      // Then send it
      await proposalsApi.send(contract.id, {
        recipients: [{ email: selectedContact.email, name: selectedContact.name }]
      })

      toast.success(`Contract sent to ${selectedContact.name}`)
      onSuccess?.({ ...contract, status: 'sent' })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to send contract:', error)
      toast.error('Failed to send contract')
    } finally {
      setIsSending(false)
    }
  }

  const isProcessing = isLoading || isSending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-[var(--brand-primary)]" />
            New Contract
          </DialogTitle>
          <DialogDescription>
            Create a contract to send to your customers. They'll receive a secure link to view and sign.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Contract Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Membership Agreement, Event Waiver, Service Contract"
              disabled={isProcessing}
            />
          </div>

          {/* Description (optional) */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of this contract..."
              rows={2}
              disabled={isProcessing}
            />
          </div>

          {/* Recipient */}
          <div className="space-y-2">
            <Label>Send To</Label>
            <ContactSelector
              contacts={validContacts}
              selectedContact={selectedContact}
              onSelect={setSelectedContact}
              placeholder="Select a lead or customer..."
              disabled={isProcessing}
            />
            {selectedContact && (
              <p className="text-xs text-[var(--text-secondary)]">
                Contract will be sent to {selectedContact.email}
              </p>
            )}
          </div>

          {/* Contract Content */}
          <div className="space-y-2">
            <Label>Contract Content</Label>
            <div className="border border-[var(--border-primary)] rounded-lg overflow-hidden">
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Write your contract terms, conditions, and agreements..."
                className="min-h-[300px]"
                disabled={isProcessing}
              />
            </div>
          </div>

          {/* Options Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Require Signature */}
            <div className="flex items-center justify-between p-4 border border-[var(--border-primary)] rounded-lg bg-[var(--surface-secondary)]">
              <div>
                <Label htmlFor="signature" className="cursor-pointer">Require Signature</Label>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Recipient must sign to accept
                </p>
              </div>
              <Switch
                id="signature"
                checked={includeSignature}
                onCheckedChange={setIncludeSignature}
                disabled={isProcessing}
              />
            </div>

            {/* Valid Until */}
            <div className="space-y-2 p-4 border border-[var(--border-primary)] rounded-lg bg-[var(--surface-secondary)]">
              <Label htmlFor="validUntil">Valid Until (optional)</Label>
              <Input
                id="validUntil"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                disabled={isProcessing}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4 gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isProcessing || !title.trim()}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Draft
          </Button>
          <Button
            onClick={handleSaveAndSend}
            disabled={isProcessing || !title.trim() || !selectedContact}
            className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Save & Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default NewContractModal
