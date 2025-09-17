'use client'

import { cn } from '@/lib/utils'
import { ChatMessageItem } from '@/components/chat-message'
import { useChatScroll } from '@/hooks/use-chat-scroll'
import { type ChatMessage, useRealtimeChat } from '@/hooks/use-realtime-chat'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface RealtimeChatProps {
  roomId: string
  username: string
  userId: string
  onMessage?: (messages: ChatMessage[]) => void
  messages?: ChatMessage[]
}

/**
 * Realtime chat component
 * @param roomId - The ID of the room to join. Each room is a unique chat.
 * @param username - The username of the user
 * @param onMessage - The callback function to handle the messages. Useful if you want to store the messages in a database.
 * @param messages - The messages to display in the chat. Useful if you want to display messages from a database.
 * @returns The chat component
 */
export const RealtimeChat = ({
  roomId,
  username,
  userId,
  onMessage,
  messages: initialMessages = []
}: RealtimeChatProps) => {
  const { containerRef, scrollToBottom } = useChatScroll()

  const {
    messages: realtimeMessages,
    sendMessage,
    isConnected,
    loading
  } = useRealtimeChat({
    roomId,
    username,
    userId
  })
  const [newMessage, setNewMessage] = useState('')

  // Merge realtime messages with initial messages
  const allMessages = useMemo(() => {
    const mergedMessages = [...initialMessages, ...realtimeMessages]

    // Remove duplicates based on message id and filter out invalid messages
    const uniqueMessages = mergedMessages.filter((message, index, self) => {
      // Filter out messages without content or invalid structure
      if (
        !message ||
        !message.id ||
        !message.content?.trim() ||
        !message.user?.name
      ) {
        return false
      }
      // Remove duplicates
      return index === self.findIndex((m) => m?.id === message.id)
    })

    // Sort by creation date with null checks
    const sortedMessages = uniqueMessages.sort((a, b) => {
      const dateA = a.createdAt || new Date().toISOString()
      const dateB = b.createdAt || new Date().toISOString()
      return new Date(dateA).getTime() - new Date(dateB).getTime()
    })

    return sortedMessages
  }, [initialMessages, realtimeMessages])

  useEffect(() => {
    if (onMessage) {
      onMessage(allMessages)
    }
  }, [allMessages, onMessage])

  useEffect(() => {
    // Scroll to bottom whenever messages change
    scrollToBottom()
  }, [allMessages, scrollToBottom])

  const handleSendMessage = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      // Prevent sending if loading or no connection
      if (!newMessage.trim() || loading || !isConnected) return

      sendMessage(newMessage)
      setNewMessage('')
    },
    [newMessage, isConnected, sendMessage, loading]
  )

  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground antialiased">
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-4"
      >
        {loading && initialMessages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            <div>Connecting to chat...</div>
          </div>
        ) : !loading && allMessages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            <div>No messages yet. Start the conversation!</div>
          </div>
        ) : null}
        {(initialMessages.length > 0 || !loading) && (
          <div className="space-y-1 sm:space-y-2">
            {allMessages.map((message, index) => {
              const prevMessage = index > 0 ? allMessages[index - 1] : null
              const showHeader =
                !prevMessage || prevMessage.user.name !== message.user.name

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05, // Stagger effect
                    ease: [0.25, 0.46, 0.45, 0.94]
                  }}
                  className="transform-gpu"
                >
                  <ChatMessageItem
                    message={message}
                    isOwnMessage={message.user.name === username}
                    showHeader={showHeader}
                  />
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSendMessage}
        className="flex w-full gap-2 sm:gap-3 border-t border-border p-3 sm:p-4 bg-background/50 backdrop-blur-sm"
      >
        <Input
          className={cn(
            'flex-1 rounded-full bg-background text-base sm:text-sm px-4 py-3 sm:py-2 transition-all duration-300 border-2 focus:border-primary',
            loading && 'opacity-50 cursor-not-allowed'
          )}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={loading ? 'Connecting...' : 'Type a message...'}
          disabled={loading}
          autoComplete="off"
          autoCapitalize="sentences"
          autoFocus={!loading}
        />
        {!loading && isConnected && newMessage.trim() && (
          <Button
            className="aspect-square h-12 w-12 sm:h-10 sm:w-10 rounded-full animate-in fade-in slide-in-from-right-4 duration-300 bg-primary hover:bg-primary/90 active:scale-95"
            type="submit"
            disabled={loading || !isConnected}
          >
            <Send className="h-5 w-5 sm:h-4 sm:w-4" />
          </Button>
        )}
      </form>
    </div>
  )
}
