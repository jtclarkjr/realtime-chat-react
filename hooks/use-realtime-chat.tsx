'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useCallback } from 'react'
import type { ApiMessage } from '@/lib/types/database'

interface UseRealtimeChatProps {
  roomId: string
  username: string
  userId: string
}

export interface ChatMessage {
  id: string
  content: string
  user: {
    id?: string
    name: string
  }
  createdAt: string
  roomId?: string
}

interface TransformedMessage {
  id: string
  content: string
  user: {
    id: string
    name: string
  }
  createdAt: string
  roomId: string
}

const EVENT_MESSAGE_TYPE = 'message'

export function useRealtimeChat({
  roomId,
  username,
  userId
}: UseRealtimeChatProps) {
  const supabase = createClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)

  // Fetch missed messages on mount
  useEffect(() => {
    let isCancelled = false

    const fetchMissedMessages = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

        const response = await fetch(
          `/api/rooms/${roomId}/rejoin?userId=${userId}`,
          {
            signal: controller.signal,
            credentials: 'same-origin'
          }
        )

        clearTimeout(timeoutId)

        if (isCancelled) return // Don't update state if this effect was cancelled

        if (response.ok) {
          const data = await response.json()

          if (isCancelled) return // Check again after async operation

          if (
            (data.type === 'missed_messages' ||
              data.type === 'recent_messages') &&
            data.messages?.length > 0
          ) {
            // Transform database messages to ChatMessage format
            const transformedMessages: TransformedMessage[] = data.messages.map(
              (msg: ApiMessage) => ({
                id: msg.id,
                content: msg.content,
                user: {
                  id: msg.user.id,
                  name: msg.user.name
                },
                createdAt: msg.createdAt,
                roomId: msg.channelId
              })
            )

            setMessages(transformedMessages)
          }
        } else {
          console.error('Failed to fetch missed messages:', response.statusText)
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn(
            'Missed messages fetch timed out, continuing with real-time only'
          )
        } else {
          console.error('Error fetching missed messages:', error)
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    fetchMissedMessages()

    // Cleanup function
    return () => {
      isCancelled = true
    }
  }, [roomId, userId])

  // Set up realtime subscription
  useEffect(() => {
    if (loading) return // Wait until missed messages are loaded

    const newChannel = supabase.channel(roomId)

    newChannel
      .on('broadcast', { event: EVENT_MESSAGE_TYPE }, (payload) => {
        const receivedMessage = payload.payload as ChatMessage
        // Only add messages that have content and valid structure
        if (
          receivedMessage &&
          receivedMessage.content &&
          receivedMessage.content.trim() &&
          receivedMessage.user?.name
        ) {
          setMessages((current) => {
            // Avoid duplicates by checking message ID
            const exists = current.some((msg) => msg.id === receivedMessage.id)
            if (exists) {
              return current
            }

            return [...current, receivedMessage]
          })

          // Mark message as received (async, don't wait)
          fetch('/api/messages/mark-received', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
              userId,
              roomId: roomId,
              messageId: receivedMessage.id
            })
          }).catch((error) =>
            console.error('Error marking message as received:', error)
          )
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
        }
      })

    return () => {
      supabase.removeChannel(newChannel)
      setIsConnected(false)
    }
  }, [roomId, supabase, loading, userId])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!isConnected || !content.trim()) return

      const message: ChatMessage = {
        id: crypto.randomUUID(),
        content: content.trim(),
        user: {
          id: userId,
          name: username
        },
        createdAt: new Date().toISOString(),
        roomId: roomId
      }

      try {
        // Save to database via API (API will handle broadcasting)

        const response = await fetch('/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            roomId: roomId,
            userId,
            username,
            content: content.trim()
          })
        })

        const result = await response.json()

        if (result.success) {
          // Add message locally immediately for sender using the backend message ID
          if (result.message?.id) {
            const messageWithBackendId = {
              ...message,
              id: result.message.id // Use backend ID to match broadcast
            }

            setMessages((current) => {
              return [...current, messageWithBackendId]
            })
          }
        } else {
          console.error('Failed to save message to database:', result.error)
        }
      } catch (error) {
        console.error('Error saving message to database:', error)
      }
    },
    [isConnected, roomId, userId, username]
  )

  // Cleanup effect when user leaves
  useEffect(() => {
    return () => {
      // User leaving room
    }
  }, [userId, username, roomId, messages.length])

  return { messages, sendMessage, isConnected, loading }
}
