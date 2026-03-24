// src/components/ContractAIDialog.jsx
/**
 * AI-Powered Contract Generator Dialog
 * 
 * For clients with Signal enabled to create contracts for their customers.
 * Uses commerce services instead of hardcoded proposal types.
 * 
 * Flow:
 * 1. Select service from commerce_offerings
 * 2. Enter recipient info (name, email, company)
 * 3. Add custom details/notes
 * 4. AI generates contract
 * 5. Preview and send via magic link
 */
import React, { useState, useEffect, useMemo } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { 
  Sparkles, 
  Loader2, 
  DollarSign, 
  FileText,
  ChevronRight,
  ChevronLeft,
  Check,
  Send,
  Bot,
  User,
  Package,
  Clock,
  Mail,
  Building2,
  UserCircle,
  AlertCircle
} from 'lucide-react'
import { commerceApi } from '../lib/sonor-api'
import { cn } from '../lib/utils'

// Format price for display
function formatPrice(price, priceType) {
  if (priceType === 'quote') return 'Quote'
  if (priceType === 'free') return 'Free'
  if (!price) return 'TBD'
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price)
}

// Service card component
function ServiceCard({ service, isSelected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative p-4 rounded-xl border-2 text-left transition-all duration-200',
        'hover:border-[var(--brand-primary)] hover:bg-[var(--surface-secondary)]',
        isSelected 
          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 ring-2 ring-[var(--brand-primary)]/20' 
          : 'border-[var(--glass-border)] bg-[var(--surface-primary)]'
      )}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--brand-primary)] flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center',
          isSelected ? 'bg-[var(--brand-primary)]' : 'bg-[var(--surface-tertiary)]'
        )}>
          <Package className={cn(
            'w-5 h-5',
            isSelected ? 'text-white' : 'text-[var(--text-secondary)]'
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-[var(--text-primary)] truncate">{service.name}</h4>
          {service.short_description && (
            <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mt-1">
              {service.short_description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              {formatPrice(service.price, service.price_type)}
            </Badge>
            {service.duration_minutes && (
              <Badge variant="outline" className="text-xs gap-1">
                <Clock className="w-3 h-3" />
                {service.duration_minutes}min
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

export default function ContractAIDialog({ 
  projectId,
  open,
  onOpenChange,
  onSuccess
}) {
  const [step, setStep] = useState(1) // 1: Service, 2: Recipient, 3: Details, 4: Review
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [generatedContract, setGeneratedContract] = useState(null)
  
  // Services state
  const [services, setServices] = useState([])
  const [isLoadingServices, setIsLoadingServices] = useState(true)
  const [servicesError, setServicesError] = useState(null)
  
  // Form state
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [formData, setFormData] = useState({
    recipientName: '',
    recipientEmail: '',
    recipientCompany: '',
    customPrice: '',
    notes: '',
    validDays: '30'
  })
  
  // AI conversation state
  const [aiMessages, setAiMessages] = useState([])
  const [aiInput, setAiInput] = useState('')
  const [isAiThinking, setIsAiThinking] = useState(false)
  
  // Load services on mount
  useEffect(() => {
    if (open && projectId) {
      loadServices()
    }
  }, [open, projectId])
  
  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setStep(1)
      setSelectedServiceId('')
      setFormData({
        recipientName: '',
        recipientEmail: '',
        recipientCompany: '',
        customPrice: '',
        notes: '',
        validDays: '30'
      })
      setGeneratedContract(null)
      setAiMessages([])
    }
  }, [open])
  
  async function loadServices() {
    setIsLoadingServices(true)
    setServicesError(null)
    try {
      const response = await commerceApi.getServices(projectId)
      setServices(response.data?.data || response.data || [])
    } catch (error) {
      console.error('Failed to load services:', error)
      setServicesError('Failed to load services. Please try again.')
    } finally {
      setIsLoadingServices(false)
    }
  }
  
  // Get selected service details
  const selectedService = useMemo(() => 
    services.find(s => s.id === selectedServiceId),
    [services, selectedServiceId]
  )
  
  // Calculate total price
  const totalPrice = useMemo(() => {
    if (formData.customPrice) return parseFloat(formData.customPrice)
    return selectedService?.price || 0
  }, [selectedService, formData.customPrice])
  
  // Validation
  const canProceedStep1 = !!selectedServiceId
  const canProceedStep2 = formData.recipientName.trim() && formData.recipientEmail.trim()
  const canProceedStep3 = true // Notes are optional
  
  // Generate contract with AI
  async function generateContract() {
    setIsGenerating(true)
    try {
      // TODO: Call Signal API to generate contract
      // For now, create a placeholder
      const contract = {
        title: `${selectedService.name} Agreement`,
        recipientName: formData.recipientName,
        recipientEmail: formData.recipientEmail,
        recipientCompany: formData.recipientCompany,
        service: selectedService,
        price: totalPrice,
        notes: formData.notes,
        validDays: parseInt(formData.validDays),
        generatedAt: new Date().toISOString()
      }
      setGeneratedContract(contract)
      setStep(4)
    } catch (error) {
      console.error('Failed to generate contract:', error)
    } finally {
      setIsGenerating(false)
    }
  }
  
  // Send contract
  async function sendContract() {
    setIsSending(true)
    try {
      // Create the contract in the database
      const contractData = {
        doc_type: 'contract',
        offering_id: selectedServiceId,
        recipient_name: formData.recipientName,
        recipient_email: formData.recipientEmail,
        recipient_company: formData.recipientCompany,
        title: generatedContract.title,
        total_amount: totalPrice,
        valid_until: new Date(Date.now() + parseInt(formData.validDays) * 24 * 60 * 60 * 1000).toISOString(),
        metadata: {
          notes: formData.notes,
          service: selectedService
        }
      }
      
      const response = await commerceApi.createContract(projectId, contractData)
      const contract = response.data
      
      // Send the contract via magic link
      await commerceApi.sendContract(projectId, contract.id)
      
      onSuccess?.(contract)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to send contract:', error)
    } finally {
      setIsSending(false)
    }
  }
  
  // Handle AI chat
  async function handleAiChat(message) {
    setAiMessages(prev => [...prev, { role: 'user', content: message }])
    setAiInput('')
    setIsAiThinking(true)
    
    try {
      // TODO: Call Signal API for AI response
      // For now, simulate a response
      await new Promise(resolve => setTimeout(resolve, 1000))
      setAiMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I\'ve noted that. Would you like me to include any specific terms or conditions in the contract?' 
      }])
    } catch (error) {
      console.error('AI chat error:', error)
    } finally {
      setIsAiThinking(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col glass-bg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--brand-primary)]" />
            Create Contract with AI
          </DialogTitle>
          <DialogDescription>
            Generate a professional contract for your customer
          </DialogDescription>
        </DialogHeader>
        
        {/* Step Indicator */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--glass-border)]">
          {[
            { num: 1, label: 'Service' },
            { num: 2, label: 'Recipient' },
            { num: 3, label: 'Details' },
            { num: 4, label: 'Review' }
          ].map((s, i) => (
            <React.Fragment key={s.num}>
              <div className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                step === s.num 
                  ? 'bg-[var(--brand-primary)] text-white' 
                  : step > s.num 
                    ? 'bg-green-500/20 text-green-600' 
                    : 'bg-[var(--surface-tertiary)] text-[var(--text-secondary)]'
              )}>
                {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < 3 && (
                <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
              )}
            </React.Fragment>
          ))}
        </div>
        
        {/* Step Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {/* Step 1: Select Service */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Select the service this contract is for:
              </p>
              
              {isLoadingServices ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
                </div>
              ) : servicesError ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                  <p className="text-[var(--text-secondary)]">{servicesError}</p>
                  <Button variant="outline" onClick={loadServices} className="mt-4">
                    Try Again
                  </Button>
                </div>
              ) : services.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="w-12 h-12 text-[var(--text-tertiary)] mb-4" />
                  <h3 className="font-medium text-[var(--text-primary)]">No Services Found</h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Create services in Commerce → Offerings first
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {services.map(service => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      isSelected={selectedServiceId === service.id}
                      onClick={() => setSelectedServiceId(service.id)}
                    />
                  ))}
                </div>
              )}
              
              {selectedService && (
                <div className="mt-4 p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--glass-border)]">
                  <h4 className="font-medium text-[var(--text-primary)] mb-2">
                    {selectedService.name}
                  </h4>
                  {selectedService.description && (
                    <p className="text-sm text-[var(--text-secondary)] mb-3">
                      {selectedService.description}
                    </p>
                  )}
                  {selectedService.features?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedService.features.slice(0, 5).map((feature, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {typeof feature === 'string' ? feature : feature.name || feature.title}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Step 2: Recipient Info */}
          {step === 2 && (
            <div className="space-y-6">
              <p className="text-sm text-[var(--text-secondary)]">
                Who will receive this contract? They'll get a magic link to view and sign.
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <UserCircle className="w-4 h-4 text-[var(--brand-primary)]" />
                    Recipient Name *
                  </Label>
                  <Input
                    value={formData.recipientName}
                    onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                    placeholder="John Smith"
                    className="glass-bg"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[var(--brand-primary)]" />
                    Recipient Email *
                  </Label>
                  <Input
                    type="email"
                    value={formData.recipientEmail}
                    onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                    placeholder="john@example.com"
                    className="glass-bg"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[var(--brand-primary)]" />
                    Company (Optional)
                  </Label>
                  <Input
                    value={formData.recipientCompany}
                    onChange={(e) => setFormData({ ...formData, recipientCompany: e.target.value })}
                    placeholder="ACME Corp"
                    className="glass-bg"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Step 3: Details & Pricing */}
          {step === 3 && (
            <div className="space-y-6">
              <p className="text-sm text-[var(--text-secondary)]">
                Customize the contract details:
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[var(--brand-primary)]" />
                    Price
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={formData.customPrice || selectedService?.price || ''}
                      onChange={(e) => setFormData({ ...formData, customPrice: e.target.value })}
                      placeholder={selectedService?.price?.toString() || 'Enter price'}
                      className="glass-bg"
                    />
                    <span className="text-sm text-[var(--text-secondary)]">USD</span>
                  </div>
                  {selectedService?.price && !formData.customPrice && (
                    <p className="text-xs text-[var(--text-tertiary)]">
                      Default price from service: {formatPrice(selectedService.price, 'fixed')}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[var(--brand-primary)]" />
                    Additional Notes
                  </Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any special terms, scope details, or notes for the AI..."
                    rows={4}
                    className="glass-bg"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Valid For</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={formData.validDays}
                      onChange={(e) => setFormData({ ...formData, validDays: e.target.value })}
                      className="w-24 glass-bg"
                      min={1}
                      max={90}
                    />
                    <span className="text-sm text-[var(--text-secondary)]">days</span>
                  </div>
                </div>
              </div>
              
              {/* AI Chat for clarifications */}
              <div className="mt-6 p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--glass-border)]">
                <div className="flex items-center gap-2 mb-3">
                  <Bot className="w-4 h-4 text-[var(--brand-primary)]" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    Ask AI for help
                  </span>
                </div>
                
                {aiMessages.length > 0 && (
                  <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                    {aiMessages.map((msg, i) => (
                      <div key={i} className={cn(
                        'flex items-start gap-2 text-sm',
                        msg.role === 'user' ? 'justify-end' : ''
                      )}>
                        {msg.role === 'assistant' && (
                          <Bot className="w-4 h-4 text-[var(--brand-primary)] mt-0.5" />
                        )}
                        <span className={cn(
                          'px-3 py-1.5 rounded-lg max-w-[80%]',
                          msg.role === 'user' 
                            ? 'bg-[var(--brand-primary)] text-white' 
                            : 'bg-[var(--surface-tertiary)] text-[var(--text-primary)]'
                        )}>
                          {msg.content}
                        </span>
                        {msg.role === 'user' && (
                          <User className="w-4 h-4 text-[var(--text-secondary)] mt-0.5" />
                        )}
                      </div>
                    ))}
                    {isAiThinking && (
                      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <Bot className="w-4 h-4 text-[var(--brand-primary)]" />
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Thinking...
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Input
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="Ask about terms, scope, or get suggestions..."
                    className="glass-bg"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && aiInput.trim() && !isAiThinking) {
                        handleAiChat(aiInput.trim())
                      }
                    }}
                  />
                  <Button 
                    size="icon" 
                    disabled={!aiInput.trim() || isAiThinking}
                    onClick={() => handleAiChat(aiInput.trim())}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 4: Review */}
          {step === 4 && generatedContract && (
            <div className="space-y-6">
              <p className="text-sm text-[var(--text-secondary)]">
                Review the contract before sending:
              </p>
              
              <div className="p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--glass-border)] space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    {generatedContract.title}
                  </h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[var(--text-tertiary)]">Recipient:</span>
                    <p className="font-medium text-[var(--text-primary)]">
                      {generatedContract.recipientName}
                    </p>
                    <p className="text-[var(--text-secondary)]">
                      {generatedContract.recipientEmail}
                    </p>
                    {generatedContract.recipientCompany && (
                      <p className="text-[var(--text-secondary)]">
                        {generatedContract.recipientCompany}
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="text-[var(--text-tertiary)]">Amount:</span>
                    <p className="text-2xl font-bold text-[var(--brand-primary)]">
                      {formatPrice(generatedContract.price, 'fixed')}
                    </p>
                  </div>
                </div>
                
                <div>
                  <span className="text-[var(--text-tertiary)] text-sm">Service:</span>
                  <p className="text-[var(--text-primary)]">{generatedContract.service.name}</p>
                </div>
                
                {generatedContract.notes && (
                  <div>
                    <span className="text-[var(--text-tertiary)] text-sm">Notes:</span>
                    <p className="text-[var(--text-secondary)]">{generatedContract.notes}</p>
                  </div>
                )}
                
                <div className="text-xs text-[var(--text-tertiary)]">
                  Valid for {generatedContract.validDays} days
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm text-blue-600">
                  <strong>Note:</strong> The recipient will receive an email with a magic link to view and sign this contract. They don't need a portal account.
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[var(--glass-border)]">
          <Button 
            variant="ghost" 
            onClick={() => step === 1 ? onOpenChange(false) : setStep(step - 1)}
            disabled={isGenerating || isSending}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          
          {step < 3 && (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          
          {step === 3 && (
            <Button
              onClick={generateContract}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Contract
                </>
              )}
            </Button>
          )}
          
          {step === 4 && (
            <Button
              onClick={sendContract}
              disabled={isSending}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Contract
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
