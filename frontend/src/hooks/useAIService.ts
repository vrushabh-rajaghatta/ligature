

// ============================================================================
// AI Service Hook - v0.23.6: Unified Live + Demo AI Integration
// Provides seamless switching between live Claude API and demo mock data
// ============================================================================


import { useState, useCallback, useRef, useEffect } from 'react'
import { useDemoStore } from '@/store/useDemoStore'
import { DEMO_HAQ_RESPONSES, DEMO_SAFETY_NARRATIVES, DEMO_DOCUMENT_SECTIONS } from '@/data/demo-ai-outputs'

export type AIGenerationType = 'haq-response' | 'safety-narrative' | 'document-section' | 'signal-summary' | 'general'

interface AIServiceConfig {
  type: AIGenerationType
  onStream?: (chunk: string) => void
  onComplete?: (fullContent: string) => void
  onError?: (error: string) => void
}

interface AIServiceState {
  isLoading: boolean
  isStreaming: boolean
  error: string | null
  content: string
  isLiveMode: boolean
}

interface AIServiceStatus {
  status: 'configured' | 'not_configured' | 'checking'
  message: string
  model: string
}

// Check if live AI is available
export function useAIServiceStatus() {
  const [status, setStatus] = useState<AIServiceStatus>({
    status: 'checking',
    message: 'Checking AI service...',
    model: 'claude-sonnet-4-6',
  })

  useEffect(() => {
    async function checkStatus() {
      try {
        const response = await fetch('/api/ai/generate')
        const data = await response.json()
        setStatus(data)
      } catch {
        setStatus({
          status: 'not_configured',
          message: 'AI service unavailable',
          model: 'claude-sonnet-4-6',
        })
      }
    }
    checkStatus()
  }, [])

  return status
}

// Main AI service hook
export function useAIService(config: AIServiceConfig) {
  const { type, onStream, onComplete, onError } = config
  const isDemoMode = useDemoStore(s => s.isDemoMode)
  const [state, setState] = useState<AIServiceState>({
    isLoading: false,
    isStreaming: false,
    error: null,
    content: '',
    isLiveMode: false,
  })
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const streamedContentRef = useRef('')

  // Demo mode streaming simulation
  const simulateDemoStream = useCallback(async (content: string) => {
    setState(s => ({ ...s, isLoading: true, isStreaming: true, content: '', error: null }))
    streamedContentRef.current = ''
    
    const words = content.split(' ')
    const chunkSize = 3 // words per chunk
    
    for (let i = 0; i < words.length; i += chunkSize) {
      if (abortControllerRef.current?.signal.aborted) break
      
      const chunk = words.slice(i, i + chunkSize).join(' ') + ' '
      streamedContentRef.current += chunk
      
      setState(s => ({ ...s, content: streamedContentRef.current }))
      onStream?.(chunk)
      
      // Simulate network delay (30-80ms per chunk)
      await new Promise(r => setTimeout(r, 30 + Math.random() * 50))
    }
    
    setState(s => ({ ...s, isLoading: false, isStreaming: false }))
    onComplete?.(streamedContentRef.current.trim())
  }, [onStream, onComplete])

  // Get demo content based on type
  const getDemoContent = useCallback((prompt: string): string => {
    switch (type) {
      case 'haq-response': {
        // Find a relevant demo response or use the first one
        const demo = DEMO_HAQ_RESPONSES.find(r => 
          prompt.toLowerCase().includes(r.questionNumber.toLowerCase()) ||
          prompt.toLowerCase().includes(r.discipline.toLowerCase())
        ) || DEMO_HAQ_RESPONSES[0]
        return demo?.generatedResponse || 'Demo HAQ response content...'
      }
      case 'safety-narrative': {
        const demo = DEMO_SAFETY_NARRATIVES?.[0]
        return demo?.narrative || 'Demo safety narrative content...'
      }
      case 'document-section': {
        const demo = DEMO_DOCUMENT_SECTIONS?.[0]
        return demo?.content || 'Demo document section content...'
      }
      default:
        return 'This is a demo response. Add ANTHROPIC_API_KEY for live AI generation.'
    }
  }, [type])

  // Live API generation with streaming
  const generateLive = useCallback(async (prompt: string, context?: string) => {
    abortControllerRef.current = new AbortController()
    setState(s => ({ ...s, isLoading: true, isStreaming: true, content: '', error: null, isLiveMode: true }))
    streamedContentRef.current = ''

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          context,
          type,
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Generation failed')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No response body')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            
            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                streamedContentRef.current += parsed.delta.text
                setState(s => ({ ...s, content: streamedContentRef.current }))
                onStream?.(parsed.delta.text)
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }
      }

      setState(s => ({ ...s, isLoading: false, isStreaming: false }))
      onComplete?.(streamedContentRef.current)

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setState(s => ({ ...s, isLoading: false, isStreaming: false }))
        return
      }
      
      const message = error instanceof Error ? error.message : 'Generation failed'
      setState(s => ({ ...s, isLoading: false, isStreaming: false, error: message, isLiveMode: false }))
      onError?.(message)
    }
  }, [type, onStream, onComplete, onError])

  // Main generate function - chooses live or demo
  const generate = useCallback(async (prompt: string, context?: string, forceLive = false) => {
    // Cancel any in-progress generation
    abortControllerRef.current?.abort()

    // Check if we should use live mode
    const useLive = forceLive || !isDemoMode

    if (useLive) {
      // Try live first
      try {
        const statusCheck = await fetch('/api/ai/generate')
        const status = await statusCheck.json()
        
        if (status.status === 'configured') {
          return generateLive(prompt, context)
        }
      } catch {
        // Fall through to demo
      }
    }

    // Fall back to demo mode
    const demoContent = getDemoContent(prompt)
    return simulateDemoStream(demoContent)
  }, [isDemoMode, generateLive, getDemoContent, simulateDemoStream])

  // Non-streaming generation
  const generateSync = useCallback(async (prompt: string, context?: string): Promise<string> => {
    setState(s => ({ ...s, isLoading: true, error: null }))

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context, type, stream: false }),
      })

      const data = await response.json()
      
      if (data.error) {
        if (data.demo) {
          // Fall back to demo content
          const demoContent = getDemoContent(prompt)
          setState(s => ({ ...s, isLoading: false, content: demoContent, isLiveMode: false }))
          return demoContent
        }
        throw new Error(data.message || 'Generation failed')
      }

      setState(s => ({ ...s, isLoading: false, content: data.content, isLiveMode: true }))
      return data.content
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Generation failed'
      setState(s => ({ ...s, isLoading: false, error: message }))
      throw error
    }
  }, [type, getDemoContent])

  // Cancel in-progress generation
  const cancel = useCallback(() => {
    abortControllerRef.current?.abort()
    setState(s => ({ ...s, isLoading: false, isStreaming: false }))
  }, [])

  // Reset state
  const reset = useCallback(() => {
    abortControllerRef.current?.abort()
    streamedContentRef.current = ''
    setState({
      isLoading: false,
      isStreaming: false,
      error: null,
      content: '',
      isLiveMode: false,
    })
  }, [])

  return {
    ...state,
    generate,
    generateSync,
    cancel,
    reset,
  }
}

// Simplified hook for one-off generations
export function useQuickAI(type: AIGenerationType = 'general') {
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const service = useAIService({
    type,
    onStream: (chunk) => setContent(c => c + chunk),
    onComplete: setContent,
  })

  const generate = useCallback(async (prompt: string) => {
    setContent('')
    setIsLoading(true)
    await service.generate(prompt)
    setIsLoading(false)
  }, [service])

  return { content, isLoading, generate, cancel: service.cancel }
}
