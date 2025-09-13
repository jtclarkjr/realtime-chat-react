'use client'

import { createClient } from '@/lib/supabase/client'
import { useCallback, useEffect, useState } from 'react'

interface UseRealtimeChatProps {
  roomName: string
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

const EVENT_MESSAGE_TYPE = 'message'

export function useRealtimeChat({
  roomName,
  username,
  userId
}: UseRealtimeChatProps) {
  const supabase = createClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [channel, setChannel] = useState<ReturnType<
    typeof supabase.channel
  > | null>(null)

  // Log when hook is created (only once per actual mount)
  useEffect(() => {
    console.log('🚀 HOOK INITIALIZED:', {
      userId: userId.slice(0, 8),
      username,
      roomName,
      timestamp: new Date().toISOString().split('T')[1].slice(0, 8)
    })
  }, []) // Empty deps = only run once

  // Debug: Log messages state changes
  useEffect(() => {
    console.log('🔔 MESSAGES STATE CHANGE:', {
      count: messages.length,
      roomName,
      userId: userId.slice(0, 8),
      messages: messages.map((m) => ({
        id: m.id.slice(0, 8),
        content: m.content.slice(0, 20),
        user: m.user.name,
        createdAt: m.createdAt
      }))
    })
  }, [messages])

  // Fetch missed messages on mount
  useEffect(() => {
    let isCancelled = false
    const effectId = Math.random().toString(36).substr(2, 9)
    console.log(
      `🚀 STARTING FETCH EFFECT ${effectId} for userId: ${userId.slice(0, 8)}, room: ${roomName}`
    )

    const fetchMissedMessages = async () => {
      try {
        console.log(`📨 EFFECT ${effectId}: Fetching missed messages...`)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

        const response = await fetch(
          `/api/rooms/${roomName}/rejoin?userId=${userId}`,
          {
            signal: controller.signal
          }
        )

        clearTimeout(timeoutId)

        if (isCancelled) return // Don't update state if this effect was cancelled

        if (response.ok) {
          const data = await response.json()
          console.log(`💾 EFFECT ${effectId}: API RESPONSE:`, {
            type: data.type,
            messageCount: data.messages?.length || 0,
            userId: userId.slice(0, 8),
            roomName,
            fullData: data
          })

          if (isCancelled) return // Check again after async operation

          if (
            (data.type === 'missed_messages' ||
              data.type === 'recent_messages') &&
            data.messages?.length > 0
          ) {
            // Transform database messages to ChatMessage format
            const transformedMessages = data.messages.map((msg: any) => ({
              id: msg.id,
              content: msg.content,
              user: {
                id: msg.user.id,
                name: msg.user.name
              },
              createdAt: msg.createdAt,
              roomId: msg.channelId
            }))

            console.log(
              `✅ EFFECT ${effectId}: SETTING MESSAGES FROM API (${data.type}):`,
              {
                count: transformedMessages.length,
                messages: transformedMessages.map((m) => ({
                  content: m.content.slice(0, 20),
                  user: m.user.name,
                  createdAt: m.createdAt,
                  id: m.id.slice(0, 8)
                }))
              }
            )
            console.log(
              `🔍 EFFECT ${effectId}: About to call setMessages with:`,
              transformedMessages.length,
              'messages'
            )
            setMessages(transformedMessages)
            console.log(
              `🎉 EFFECT ${effectId}: Loaded ${data.count} ${data.type === 'missed_messages' ? 'missed' : 'recent'} messages - setMessages called`
            )
          } else {
            console.log(
              '⚠️ No messages found - API returned caught_up or empty'
            )
            // Don't clear messages if we get 'caught_up' - keep existing messages
          }
        } else {
          console.error(
            '❌ Failed to fetch missed messages:',
            response.statusText
          )
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.warn(
            'Missed messages fetch timed out, continuing with real-time only'
          )
        } else {
          console.error('Error fetching missed messages:', error)
        }
      } finally {
        if (!isCancelled) {
          console.log('Setting loading to false')
          setLoading(false)
        }
      }
    }

    fetchMissedMessages()

    // Cleanup function
    return () => {
      console.log(`🗳 EFFECT ${effectId}: Cancelled`)
      isCancelled = true
    }
  }, [roomName, userId])

  // Set up realtime subscription
  useEffect(() => {
    if (loading) return // Wait until missed messages are loaded

    const newChannel = supabase.channel(roomName)

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
              console.log('🚫 Duplicate message detected, skipping:', {
                id: receivedMessage.id.slice(0, 8),
                content: receivedMessage.content.slice(0, 20)
              })
              return current
            }

            console.log('📨 Adding broadcast message:', {
              id: receivedMessage.id.slice(0, 8),
              content: receivedMessage.content.slice(0, 20),
              from: receivedMessage.user.name
            })
            return [...current, receivedMessage]
          })

          // Mark message as received (async, don't wait)
          fetch('/api/messages/mark-received', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              roomId: roomName,
              messageId: receivedMessage.id
            })
          }).catch((error) =>
            console.error('Error marking message as received:', error)
          )
        }
      })
      .subscribe(async (status) => {
        console.log('Channel subscription status:', status)
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          console.log('Chat connected and ready!')
        }
      })

    setChannel(newChannel)

    return () => {
      console.log('Cleaning up channel')
      supabase.removeChannel(newChannel)
      setIsConnected(false)
    }
  }, [roomName, supabase, loading, userId])

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
        roomId: roomName
      }

      console.log('📤 SENDING MESSAGE:', {
        messageId: message.id.slice(0, 8),
        content: content.slice(0, 30),
        userId: userId.slice(0, 8),
        username,
        roomName
      })

      try {
        // Save to database via API (API will handle broadcasting)
        console.log('💾 SAVING TO DATABASE...', {
          roomName,
          userId: userId.slice(0, 8),
          content: content.slice(0, 20)
        })

        const response = await fetch('/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: roomName,
            userId,
            username,
            content: content.trim()
          })
        })

        const result = await response.json()

        if (result.success) {
          console.log('✅ MESSAGE SAVED TO DATABASE:', {
            messageId: result.message?.id?.slice(0, 8) || 'unknown',
            status: response.status
          })

          // Add message locally immediately for sender using the backend message ID
          if (result.message?.id) {
            const messageWithBackendId = {
              ...message,
              id: result.message.id // Use backend ID to match broadcast
            }

            setMessages((current) => {
              console.log(
                '📝 ADDING MESSAGE LOCALLY - Before:',
                current.length,
                'After:',
                current.length + 1
              )
              return [...current, messageWithBackendId]
            })
          }
        } else {
          console.error('❌ Failed to save message to database:', result.error)
        }
      } catch (error) {
        console.error('❌ Error saving message to database:', error)
      }
    },
    [isConnected, roomName, userId, username, channel]
  )

  // Cleanup effect to log when user leaves
  useEffect(() => {
    return () => {
      console.log('🚪 USER LEAVING ROOM:', {
        userId: userId.slice(0, 8),
        username,
        roomName,
        messageCount: messages.length,
        timestamp: new Date().toISOString().split('T')[1].slice(0, 8)
      })
    }
  }, [userId, username, roomName, messages.length])

  return { messages, sendMessage, isConnected, loading }
}
