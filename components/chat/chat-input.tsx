'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AIBadge } from '@/components/ui/ai-badge'
import { Send } from 'lucide-react'

function getPlaceholderText(
  loading: boolean,
  isAILoading: boolean,
  isAIEnabled: boolean,
  isConnected: boolean
): string {
  if (loading) return 'Connecting...'
  if (isAILoading) return 'AI is responding...'
  if (!isConnected && !loading)
    return isAIEnabled ? 'Ask AI (offline)...' : 'Type message (offline)...'
  if (isAIEnabled) return 'Ask AI assistant...'
  return 'Type a message...'
}

interface ChatInputProps {
  newMessage: string
  setNewMessage: (message: string) => void
  onSendMessage: (e: React.FormEvent) => void
  loading: boolean
  isConnected: boolean
  isAIEnabled: boolean
  setIsAIEnabled: (enabled: boolean) => void
  isAIPrivate: boolean
  setIsAIPrivate: (isPrivate: boolean) => void
  isAILoading: boolean
}

export const ChatInput = ({
  newMessage,
  setNewMessage,
  onSendMessage,
  loading,
  isConnected,
  isAIEnabled,
  setIsAIEnabled,
  isAIPrivate,
  setIsAIPrivate,
  isAILoading
}: ChatInputProps) => {
  return (
    <form
      onSubmit={onSendMessage}
      className="flex w-full gap-2 sm:gap-3 border-t border-border p-3 sm:p-4 bg-background/50 backdrop-blur-sm"
      role="form"
      aria-label="Send message"
    >
      <div className="flex-1 relative">
        <Input
          className={cn(
            'w-full rounded-full bg-background text-base sm:text-sm pl-4 pr-16 py-3 sm:py-2 transition-all duration-300 border-2 focus:border-primary',
            (loading || isAILoading) && 'opacity-50 cursor-not-allowed'
          )}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={getPlaceholderText(
            loading,
            isAILoading,
            isAIEnabled,
            isConnected
          )}
          disabled={loading || isAILoading}
          autoComplete="off"
          autoCapitalize="sentences"
          autoFocus={!loading && !isAILoading}
          aria-label="Type your message"
          aria-describedby="ai-status"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <AIBadge
            isActive={isAIEnabled}
            onToggle={() => setIsAIEnabled(!isAIEnabled)}
            isPrivate={isAIPrivate}
            onPrivacyToggle={() => setIsAIPrivate(!isAIPrivate)}
          />
        </div>
      </div>
      {!loading && newMessage.trim() && (
        <Button
          className={cn(
            'aspect-square h-12 w-12 sm:h-10 sm:w-10 rounded-full animate-in fade-in slide-in-from-right-4 duration-300 active:scale-95',
            isConnected
              ? 'bg-primary hover:bg-primary/90'
              : 'bg-orange-500 hover:bg-orange-600'
          )}
          type="submit"
          disabled={loading}
          aria-label={isConnected ? 'Send message' : 'Queue message (offline)'}
          title={
            isConnected
              ? 'Send message'
              : "You're offline - message will be queued and sent when connection is restored"
          }
        >
          <Send className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden="true" />
        </Button>
      )}
    </form>
  )
}
