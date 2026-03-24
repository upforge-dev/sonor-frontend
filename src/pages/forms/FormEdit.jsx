// src/pages/forms/FormEdit.jsx
// Form editor page - uses the comprehensive FormBuilder component

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useAuthStore from '@/lib/auth-store'
import { formsApi } from '@/lib/sonor-api'
import UptradeLoading from '@/components/UptradeLoading'
import FormBuilder from '@/components/forms/FormBuilder'
import { toast } from 'sonner'

export default function FormEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentProject } = useAuthStore()
  
  const [form, setForm] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const projectId = currentProject?.id
  
  useEffect(() => {
    loadForm()
  }, [id])
  
  async function loadForm() {
    if (!id) return
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await formsApi.get(id)
      setForm(response.data)
    } catch (err) {
      console.error('Failed to load form:', err)
      setError('Failed to load form')
    } finally {
      setIsLoading(false)
    }
  }
  
  async function handleSave(formData) {
    try {
      await formsApi.update(id, formData)
      toast.success('Form saved successfully')
      navigate('/forms')
    } catch (err) {
      console.error('Failed to save form:', err)
      toast.error('Failed to save form')
    }
  }
  
  function handleCancel() {
    navigate('/forms')
  }
  
  if (isLoading) {
    return <UptradeLoading />
  }
  
  if (error || !form) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--text-secondary)] mb-4">{error || 'Form not found'}</p>
          <button 
            onClick={() => navigate('/forms')}
            className="text-[var(--brand-primary)] hover:underline"
          >
            Back to Forms
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <FormBuilder
      formId={id}
      projectId={projectId}
      initialData={form}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  )
}
