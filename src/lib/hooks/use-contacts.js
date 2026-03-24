/**
 * Contacts Query Hooks
 * 
 * TanStack Query hooks for unified Contacts.
 * Replaces contacts-store.js with automatic caching, deduplication, and background refresh.
 * Handles all contact types: prospects, leads, clients, customers, team.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contactsApi } from '../sonor-api'

// Contact type constants
export const ContactType = {
  PROSPECT: 'prospect',
  LEAD: 'lead',
  CLIENT: 'client',
  CUSTOMER: 'customer',
  TEAM: 'team',
  PARTNER: 'partner',
  VENDOR: 'vendor',
  OTHER: 'other',
}

// Pipeline stage constants
export const PipelineStage = {
  NEW_LEAD: 'new_lead',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  PROPOSAL: 'proposal',
  NEGOTIATION: 'negotiation',
  WON: 'won',
  LOST: 'lost',
  DISQUALIFIED: 'disqualified',
}

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const contactsKeys = {
  all: ['contacts'],
  list: (filters) => [...contactsKeys.all, 'list', filters],
  detail: (id) => [...contactsKeys.all, 'detail', id],
  timeline: (id) => [...contactsKeys.all, 'timeline', id],
  activity: (id) => [...contactsKeys.all, 'activity', id],
  notes: (id) => [...contactsKeys.all, 'notes', id],
  tasks: (id) => [...contactsKeys.all, 'tasks', id],
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTACTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch contacts list with filtering
 */
export function useContacts(filters = {}, options = {}) {
  return useQuery({
    queryKey: contactsKeys.list(filters),
    queryFn: async () => {
      const response = await contactsApi.list(filters)
      const data = response.data || response
      return {
        contacts: data.contacts || data || [],
        total: data.total || 0,
        summary: data.summary,
      }
    },
    ...options,
  })
}

/**
 * Fetch single contact
 */
export function useContact(id, options = {}) {
  return useQuery({
    queryKey: contactsKeys.detail(id),
    queryFn: async () => {
      const response = await contactsApi.get(id)
      const data = response.data || response
      return data.contact || data
    },
    enabled: !!id,
    ...options,
  })
}

/**
 * Create contact
 */
export function useCreateContact() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (contactData) => {
      const response = await contactsApi.create(contactData)
      const data = response.data || response
      return data.contact || data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactsKeys.all })
    },
  })
}

/**
 * Update contact
 */
export function useUpdateContact() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const response = await contactsApi.update(id, updates)
      const data = response.data || response
      return data.contact || data
    },
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(contactsKeys.detail(id), data)
      queryClient.invalidateQueries({ queryKey: contactsKeys.list({}) })
    },
  })
}

/**
 * Delete contact
 */
export function useDeleteContact() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id) => {
      await contactsApi.delete(id)
      return id
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: contactsKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: contactsKeys.all })
    },
  })
}

/**
 * Bulk update contacts
 */
export function useBulkUpdateContacts() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ ids, updates }) => {
      const response = await contactsApi.bulkUpdate(ids, updates)
      return response.data || response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactsKeys.all })
    },
  })
}

/**
 * Update pipeline stage
 */
export function useUpdateContactStage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, stage }) => {
      const response = await contactsApi.updateStage(id, stage)
      const data = response.data || response
      return data.contact || data
    },
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(contactsKeys.detail(id), data)
      queryClient.invalidateQueries({ queryKey: contactsKeys.list({}) })
    },
  })
}

/**
 * Convert contact type (e.g., prospect -> client)
 */
export function useConvertContact() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, newType }) => {
      const response = await contactsApi.convert(id, newType)
      const data = response.data || response
      return data.contact || data
    },
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(contactsKeys.detail(id), data)
      queryClient.invalidateQueries({ queryKey: contactsKeys.all })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// TIMELINE & ACTIVITY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch contact timeline
 */
export function useContactTimeline(contactId, options = {}) {
  return useQuery({
    queryKey: contactsKeys.timeline(contactId),
    queryFn: async () => {
      const response = await contactsApi.getTimeline(contactId)
      const data = response.data || response
      return data.timeline || data.events || data
    },
    enabled: !!contactId,
    ...options,
  })
}

/**
 * Log activity for a contact
 */
export function useLogContactActivity() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ contactId, activity }) => {
      const response = await contactsApi.logActivity(contactId, activity)
      return response.data || response
    },
    onSuccess: (_, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: contactsKeys.timeline(contactId) })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch contact notes
 */
export function useContactNotes(contactId, options = {}) {
  return useQuery({
    queryKey: contactsKeys.notes(contactId),
    queryFn: async () => {
      const response = await contactsApi.getNotes(contactId)
      const data = response.data || response
      return data.notes || data
    },
    enabled: !!contactId,
    ...options,
  })
}

/**
 * Add note to contact
 */
export function useAddContactNote() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ contactId, note }) => {
      const response = await contactsApi.addNote(contactId, note)
      return response.data || response
    },
    onSuccess: (_, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: contactsKeys.notes(contactId) })
      queryClient.invalidateQueries({ queryKey: contactsKeys.timeline(contactId) })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// TASKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch contact tasks
 */
export function useContactTasks(contactId, options = {}) {
  return useQuery({
    queryKey: contactsKeys.tasks(contactId),
    queryFn: async () => {
      const response = await contactsApi.getTasks(contactId)
      const data = response.data || response
      return data.tasks || data
    },
    enabled: !!contactId,
    ...options,
  })
}

/**
 * Add task to contact
 */
export function useAddContactTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ contactId, task }) => {
      const response = await contactsApi.addTask(contactId, task)
      return response.data || response
    },
    onSuccess: (_, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: contactsKeys.tasks(contactId) })
    },
  })
}

/**
 * Update contact task
 */
export function useUpdateContactTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ contactId, taskId, updates }) => {
      const response = await contactsApi.updateTask(contactId, taskId, updates)
      return response.data || response
    },
    onSuccess: (_, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: contactsKeys.tasks(contactId) })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// TAGS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Add tag to contact
 */
export function useAddContactTag() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ contactId, tag }) => {
      const response = await contactsApi.addTag(contactId, tag)
      return response.data || response
    },
    onSuccess: (_, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: contactsKeys.detail(contactId) })
    },
  })
}

/**
 * Remove tag from contact
 */
export function useRemoveContactTag() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ contactId, tag }) => {
      const response = await contactsApi.removeTag(contactId, tag)
      return response.data || response
    },
    onSuccess: (_, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: contactsKeys.detail(contactId) })
    },
  })
}
