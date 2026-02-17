/**
 * useSEOAIGeneration Hook
 * 
 * Hook for generating AI-powered SEO content (titles, meta descriptions, etc.)
 * Uses Signal API skills for generation.
 */

import { useState, useCallback } from 'react'
import { skillsApi } from './signal-api'
import { useSignalAccess } from './signal-access'
import useAuthStore from './auth-store'

/**
 * Generate unique IDs for suggestions
 */
const generateId = () => `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

/**
 * Hook for generating AI SEO content
 * 
 * @returns {Object} Generation state and methods
 */
export function useSEOAIGeneration() {
  const { hasAccess } = useSignalAccess()
  const currentProject = useAuthStore(state => state.currentProject)
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [error, setError] = useState(null)
  
  /**
   * Generate title suggestions for a page
   * 
   * @param {Object} params - Generation parameters
   * @param {string} params.pageUrl - URL of the page
   * @param {string} params.currentTitle - Current title tag
   * @param {string} params.h1 - Current H1 heading
   * @param {string} params.metaDescription - Current meta description
   * @param {string[]} params.targetKeywords - Target keywords for the page
   * @param {number} params.count - Number of suggestions to generate (default: 3)
   * @returns {Promise<Array>} Array of title suggestions
   */
  const generateTitles = useCallback(async ({
    pageUrl,
    currentTitle,
    h1,
    metaDescription,
    targetKeywords = [],
    count = 3
  }) => {
    if (!hasAccess) {
      setError('Signal AI access required')
      return []
    }
    
    setIsGenerating(true)
    setError(null)
    
    try {
      const result = await skillsApi.invoke('seo', 'generate-titles', {
        projectId: currentProject?.id,
        pageUrl: pageUrl,
        currentTitle,
        h1,
        metaDescription,
        targetKeywords,
        count
      })
      
      const newSuggestions = (result.suggestions || []).map((s, i) => ({
        id: generateId(),
        text: s.title || s.text || s,
        reasoning: s.reasoning || s.why || null,
        score: s.score || null
      }))
      
      setSuggestions(newSuggestions)
      return newSuggestions
    } catch (err) {
      console.error('Failed to generate titles:', err)
      setError(err.message || 'Failed to generate titles')
      setSuggestions([])
      return []
    } finally {
      setIsGenerating(false)
    }
  }, [hasAccess, currentProject])
  
  /**
   * Generate meta description suggestions for a page
   * 
   * @param {Object} params - Generation parameters
   * @param {string} params.pageUrl - URL of the page
   * @param {string} params.currentMeta - Current meta description
   * @param {string} params.title - Page title
   * @param {string} params.h1 - Current H1 heading
   * @param {string} params.pageContent - Snippet of page content
   * @param {string[]} params.targetKeywords - Target keywords for the page
   * @param {number} params.count - Number of suggestions to generate (default: 3)
   * @returns {Promise<Array>} Array of meta description suggestions
   */
  const generateMetaDescriptions = useCallback(async ({
    pageUrl,
    currentMeta,
    title,
    h1,
    pageContent,
    targetKeywords = [],
    count = 3
  }) => {
    if (!hasAccess) {
      setError('Signal AI access required')
      return []
    }
    
    setIsGenerating(true)
    setError(null)
    
    try {
      const result = await skillsApi.invoke('seo', 'generate-meta-descriptions', {
        projectId: currentProject?.id,
        pageUrl: pageUrl,
        currentMeta,
        title,
        h1,
        pageContent: pageContent?.substring(0, 500), // Limit content length
        targetKeywords,
        count
      })
      
      const newSuggestions = (result.suggestions || []).map((s, i) => ({
        id: generateId(),
        text: s.description || s.text || s,
        reasoning: s.reasoning || s.why || null,
        score: s.score || null
      }))
      
      setSuggestions(newSuggestions)
      return newSuggestions
    } catch (err) {
      console.error('Failed to generate meta descriptions:', err)
      setError(err.message || 'Failed to generate meta descriptions')
      setSuggestions([])
      return []
    } finally {
      setIsGenerating(false)
    }
  }, [hasAccess, currentProject])
  
  /**
   * Generate H1 heading suggestions for a page
   * 
   * @param {Object} params - Generation parameters
   * @param {string} params.pageUrl - URL of the page
   * @param {string} params.currentH1 - Current H1 heading
   * @param {string} params.title - Page title
   * @param {string[]} params.targetKeywords - Target keywords for the page
   * @param {number} params.count - Number of suggestions to generate (default: 3)
   * @returns {Promise<Array>} Array of H1 suggestions
   */
  const generateH1s = useCallback(async ({
    pageUrl,
    currentH1,
    title,
    targetKeywords = [],
    count = 3
  }) => {
    if (!hasAccess) {
      setError('Signal AI access required')
      return []
    }
    
    setIsGenerating(true)
    setError(null)
    
    try {
      const result = await skillsApi.invoke('seo', 'generate-h1s', {
        projectId: currentProject?.id,
        pageUrl: pageUrl,
        currentH1,
        title,
        targetKeywords,
        count
      })
      
      const newSuggestions = (result.suggestions || []).map((s, i) => ({
        id: generateId(),
        text: s.h1 || s.text || s,
        reasoning: s.reasoning || s.why || null,
        score: s.score || null
      }))
      
      setSuggestions(newSuggestions)
      return newSuggestions
    } catch (err) {
      console.error('Failed to generate H1s:', err)
      setError(err.message || 'Failed to generate H1s')
      setSuggestions([])
      return []
    } finally {
      setIsGenerating(false)
    }
  }, [hasAccess, currentProject])
  
  /**
   * Generate SEO-optimized alt text suggestions for an image
   *
   * @param {Object} params
   * @param {string} params.pagePath - Page path (e.g. /about)
   * @param {string} [params.slotId] - Slot ID (e.g. hero-background)
   * @param {string} [params.currentAlt] - Current alt text
   * @param {string} [params.pageTitle] - Page title for context
   * @param {string} [params.filename] - Image filename for context
   * @param {number} [params.count] - Number of suggestions (default 3)
   * @returns {Promise<Array>} Array of { id, text, reasoning, score }
   */
  const optimizeAltText = useCallback(async ({
    pagePath,
    slotId,
    currentAlt,
    pageTitle,
    filename,
    count = 3
  }) => {
    if (!hasAccess) {
      setError('Signal AI access required')
      return []
    }

    setIsGenerating(true)
    setError(null)

    try {
      const result = await skillsApi.invoke('seo', 'optimize-alt-text', {
        projectId: currentProject?.id,
        pagePath: pagePath || '/',
        slotId,
        currentAlt,
        pageTitle,
        filename,
        count
      })

      const newSuggestions = (result.suggestions || []).map((s) => ({
        id: generateId(),
        text: s.alt ?? s.text ?? '',
        reasoning: s.reasoning ?? null,
        score: s.score ?? null
      }))

      setSuggestions(newSuggestions)
      return newSuggestions
    } catch (err) {
      console.error('Failed to optimize alt text:', err)
      setError(err.message || 'Failed to optimize alt text')
      throw err
    } finally {
      setIsGenerating(false)
    }
  }, [hasAccess, currentProject])

  /**
   * Fetch alt text suggestions for one image (no state update). Use for batch optimization.
   * @param {Object} params - Same as optimizeAltText
   * @returns {Promise<Array>} Array of { id, text, reasoning, score }
   */
  const fetchAltTextSuggestions = useCallback(async ({
    pagePath,
    slotId,
    currentAlt,
    pageTitle,
    filename,
    count = 3
  }) => {
    if (!hasAccess || !currentProject?.id) {
      throw new Error('Signal AI access and project required')
    }
    const result = await skillsApi.invoke('seo', 'optimize-alt-text', {
      projectId: currentProject.id,
      pagePath: pagePath || '/',
      slotId,
      currentAlt,
      pageTitle,
      filename,
      count
    })
    return (result.suggestions || []).map((s) => ({
      id: generateId(),
      text: s.alt ?? s.text ?? '',
      reasoning: s.reasoning ?? null,
      score: s.score ?? null
    }))
  }, [hasAccess, currentProject])

  /**
   * Clear all suggestions
   */
  const clearSuggestions = useCallback(() => {
    setSuggestions([])
    setError(null)
  }, [])
  
  /**
   * Add more suggestions to existing list (for "Generate More")
   */
  const generateMore = useCallback(async (type, params) => {
    const currentSuggestions = [...suggestions]
    
    let newSuggestions = []
    switch (type) {
      case 'title':
        newSuggestions = await generateTitles(params)
        break
      case 'meta_description':
        newSuggestions = await generateMetaDescriptions(params)
        break
      case 'h1':
        newSuggestions = await generateH1s(params)
        break
    }
    
    // Combine with existing, removing duplicates
    const combined = [...currentSuggestions]
    newSuggestions.forEach(s => {
      if (!combined.find(c => c.text === s.text)) {
        combined.push(s)
      }
    })
    
    setSuggestions(combined)
    return combined
  }, [suggestions, generateTitles, generateMetaDescriptions, generateH1s])
  
  return {
    // State
    isGenerating,
    suggestions,
    error,
    hasAccess,
    
    // Methods
    generateTitles,
    generateMetaDescriptions,
    generateH1s,
    optimizeAltText,
    fetchAltTextSuggestions,
    generateMore,
    clearSuggestions
  }
}

export default useSEOAIGeneration
