/**
 * WelcomeScreen Component
 * 
 * Empty state shown when no thread is selected or thread has no messages.
 * Features:
 * - Greeting message
 * - Quick action prompts
 */

import { Sparkles, MessageCircle, TrendingUp, FileText, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import EchoLogo from '@/components/EchoLogo'

interface Prompt {
  label: string
  prompt: string
  icon?: string
}

interface WelcomeScreenProps {
  /** Greeting text */
  greeting?: string
  /** Description text */
  description?: string
  /** Quick action prompts */
  prompts?: Prompt[]
  /** Called when a prompt is clicked */
  onPromptClick?: (prompt: string) => void
  /** Type of chat for appropriate theming */
  chatType?: 'echo' | 'user' | 'visitor'
  /** Additional className */
  className?: string
}

// Icon mapping for prompts
const ICON_MAP: Record<string, typeof Sparkles> = {
  sparkles: Sparkles,
  message: MessageCircle,
  trending: TrendingUp,
  search: TrendingUp,
  chart: TrendingUp,
  file: FileText,
  write: FileText,
  users: Users,
}

export function WelcomeScreen({
  greeting = "Hi! How can I help you today?",
  description,
  prompts = [],
  onPromptClick,
  chatType = 'echo',
  className,
}: WelcomeScreenProps) {
  const isEcho = chatType === 'echo'
  
  return (
    <div className={cn('flex flex-col items-center justify-center h-full p-6 text-center', className)}>
      {/* Logo/Avatar */}
      <div className="mb-6">
        {isEcho ? (
          <div className="w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)] shadow-xl shadow-[var(--brand-primary)]/20">
            <EchoLogo size={48} animated />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-full flex items-center justify-center bg-[var(--surface-secondary)] border border-[var(--glass-border)]/50">
            <MessageCircle className="h-10 w-10 text-[var(--text-tertiary)]" />
          </div>
        )}
      </div>
      
      {/* Greeting */}
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
        {greeting}
      </h2>
      
      {/* Description */}
      {description && (
        <p className="text-[var(--text-secondary)] max-w-md mb-6">
          {description}
        </p>
      )}
      
      {/* Quick prompts */}
      {prompts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full mt-4">
          {prompts.map((prompt, index) => {
            const IconComponent = prompt.icon ? ICON_MAP[prompt.icon] || Sparkles : Sparkles
            
            return (
              <button
                key={index}
                onClick={() => onPromptClick?.(prompt.prompt)}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-xl text-left transition-all duration-200',
                  'bg-[var(--surface-secondary)] border border-[var(--glass-border)]/30',
                  'hover:border-[var(--brand-primary)]/50 hover:bg-[color-mix(in_srgb,var(--brand-primary)_5%,transparent)]',
                  'group'
                )}
              >
                <div 
                  className="p-2 rounded-lg transition-colors"
                  style={{ 
                    backgroundColor: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)'
                  }}
                >
                  <IconComponent 
                    className="h-5 w-5 transition-colors" 
                    style={{ color: 'var(--brand-primary)' }}
                  />
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">
                  {prompt.label}
                </span>
              </button>
            )
          })}
        </div>
      )}
      
      {/* Keyboard hint */}
      <p className="text-xs text-[var(--text-tertiary)] mt-8">
        Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] font-mono">Enter</kbd> to send
        {' · '}
        <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] font-mono">Shift+Enter</kbd> for new line
      </p>
    </div>
  )
}
