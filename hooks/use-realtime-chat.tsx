'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import type { ApiMessage, ChatMessage } from '@/lib/types/database'
import { useMessageQueue } from './use-message-queue'
import { useNetworkConnectivity } from './use-network-connectivity'

interface UseRealtimeChatProps {
  roomId: string
  username: string
  userId: string
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
  const [isWebSocketConnected, setIsWebSocketConnected] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  
  // Network connectivity detection
  const networkState = useNetworkConnectivity()
  
  // Combined connectivity: both network and WebSocket must be connected
  const isConnected = networkState.isOnline && isWebSocketConnected

  // Message queue processing function
  const processQueuedMessage = useCallback(async (queuedMessage: ChatMessage & { originalContent: string; isPrivate: boolean }): Promise<boolean> => {
    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          roomId: roomId,
          userId,
          username,
          content: queuedMessage.originalContent,
          isPrivate: queuedMessage.isPrivate
        })
      })

      const result = await response.json()
      
      if (result.success) {
        // Remove the queued message from the main messages array since it will come back via broadcast
        setMessages((current) => 
          current.filter(msg => msg.id !== queuedMessage.id)
        )
      }
      
      return result.success
    } catch (error) {
      console.error('Error processing queued message:', error)
      return false
    }
  }, [roomId, userId, username])

  // Initialize message queue
  const messageQueue = useMessageQueue({
    roomId,
    userId,
    isConnected,
    onProcessMessage: processQueuedMessage
  })

  // Fetch missed messages on mount
  useEffect(() => {
    let isCancelled = false

    const fetchMissedMessages = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

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

    let reconnectTimeout: NodeJS.Timeout
    let heartbeatInterval: NodeJS.Timeout
    let isCleanedUp = false

    const setupChannel = () => {
      if (isCleanedUp) return

      const newChannel = supabase
        .channel(roomId, {
          config: {
            broadcast: { self: false }, // Don't receive own messages via broadcast
            presence: { key: userId } // Track presence with userId
          }
        })
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
              const exists = current.some(
                (msg) => msg.id === receivedMessage.id
              )
              if (exists) {
                return current
              }

              // Also remove any pending/queued messages from the same user with the same content
              // This handles cases where a queued message was successfully sent
              const filteredMessages = current.filter(msg => {
                if (msg.user.id === receivedMessage.user.id && 
                    msg.content === receivedMessage.content &&
                    (msg.isPending || msg.isQueued || msg.isRetrying)) {
                  return false
                }
                return true
              })

              return [...filteredMessages, receivedMessage]
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
        .on('system', {}, (payload) => {
          // Handle system events (connection state changes)
          if (
            payload.extension === 'postgres_changes' &&
            payload.type === 'error'
          ) {
            console.error('Channel error:', payload)
            setIsWebSocketConnected(false)
            // Attempt to reconnect after error
            if (!isCleanedUp) {
              clearTimeout(reconnectTimeout)
              reconnectTimeout = setTimeout(() => {
                supabase.removeChannel(newChannel)
                setupChannel()
              }, 3000)
            }
          }
        })
        .subscribe((status, error) => {
          if (status === 'SUBSCRIBED') {
            setIsWebSocketConnected(true)

            // Start heartbeat to keep connection alive
            clearInterval(heartbeatInterval)
            heartbeatInterval = setInterval(() => {
              // Send a presence update as heartbeat
              newChannel.track({ online: true, userId, timestamp: Date.now() })
            }, 30000) // Send heartbeat every 30 seconds
          } else if (status === 'CHANNEL_ERROR') {
            setIsWebSocketConnected(false)
            if (error) {
              console.error('Channel subscription error:', error)
            }
            // Attempt reconnection
            if (!isCleanedUp) {
              clearTimeout(reconnectTimeout)
              reconnectTimeout = setTimeout(() => {
                supabase.removeChannel(newChannel)
                setupChannel()
              }, 3000)
            }
          } else if (status === 'TIMED_OUT') {
            setIsWebSocketConnected(false)
          } else if (status === 'CLOSED') {
            setIsWebSocketConnected(false)
          }
        })

      return newChannel
    }

    const channel = setupChannel()

    // Cleanup function
    return () => {
      isCleanedUp = true
      clearTimeout(reconnectTimeout)
      clearInterval(heartbeatInterval)
      if (channel) {
        supabase.removeChannel(channel)
      }
      setIsWebSocketConnected(false)
    }
  }, [roomId, supabase, loading, userId])

  const sendMessage = useCallback(
    async (content: string, isPrivate = false, messageId?: string) => {
      if (!content.trim()) return null

      const message: ChatMessage = {
        id: messageId || crypto.randomUUID(),
        content: content.trim(),
        user: {
          id: userId,
          name: username
        },
        createdAt: new Date().toISOString(),
        roomId: roomId,
        isAI: false,
        isPrivate,
        requesterId: isPrivate ? userId : undefined,
        isPending: true
      }

      // Add message locally immediately with pending state
      setMessages((current) => {
        // If this is a retry, update the existing message
        if (messageId) {
          return current.map(msg => 
            msg.id === messageId 
              ? { ...msg, isPending: true, isFailed: false, isRetrying: true, isQueued: false }
              : msg
          )
        }
        // Otherwise add new message
        return [...current, message]
      })

      // If not connected, immediately queue the message
      if (!isConnected) {
        const queuedMessage = messageQueue.queueMessage(message, content.trim(), isPrivate)
        setMessages((current) => 
          current.map(msg => 
            msg.id === message.id
              ? { ...queuedMessage }
              : msg
          )
        )
        return message.id
      }

      try {
        // Try to send message immediately
        const response = await fetch('/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            roomId: roomId,
            userId,
            username,
            content: content.trim(),
            isPrivate
          })
        })

        const result = await response.json()

        if (result.success) {
          // Success - update message with backend ID
          if (result.message?.id) {
            const messageWithBackendId = {
              ...message,
              id: result.message.id,
              isPending: false,
              isFailed: false,
              isRetrying: false
            }

            setMessages((current) => {
              if (messageId) {
                return current.map(msg => 
                  msg.id === messageId 
                    ? { ...messageWithBackendId, id: result.message.id }
                    : msg
                )
              }
              return current.map(msg => 
                msg.id === message.id 
                  ? messageWithBackendId
                  : msg
              )
            })
          }
          return result.message.id
        } else {
          // Failed - queue the message for retry when connection is restored
          console.error('Failed to save message to database:', result.error)
          const queuedMessage = messageQueue.queueMessage(message, content.trim(), isPrivate)
          setMessages((current) => 
            current.map(msg => 
              msg.id === (messageId || message.id)
                ? { ...queuedMessage }
                : msg
            )
          )
          return null
        }
      } catch (error) {
        console.error('Error saving message to database:', error)
        // Network error - queue the message
        const queuedMessage = messageQueue.queueMessage(message, content.trim(), isPrivate)
        setMessages((current) => 
          current.map(msg => 
            msg.id === (messageId || message.id)
              ? { ...queuedMessage }
              : msg
          )
        )
        return null
      }
    },
    [isConnected, roomId, userId, username, messageQueue]
  )

  const retryMessage = useCallback(
    async (messageId: string) => {
      return await messageQueue.retryMessage(messageId)
    },
    [messageQueue]
  )

  // Merge regular messages with queued messages
  const allMessages = useMemo(() => {
    const combinedMessages = [...messages, ...messageQueue.queuedMessages]
    
    // Remove duplicates and sort by creation date
    const uniqueMessages = combinedMessages.reduce((acc, message) => {
      const existingIndex = acc.findIndex(msg => msg.id === message.id)
      if (existingIndex >= 0) {
        // Prefer messages that are not queued/pending over queued ones
        const existingMessage = acc[existingIndex]
        const shouldReplaceExisting = (
          // Replace if new message is successfully sent (not queued/pending/retrying)
          (!message.isQueued && !message.isPending && !message.isRetrying && !message.isFailed) ||
          // Or if existing message is failed but new one isn't
          (existingMessage.isFailed && !message.isFailed) ||
          // Or if new message has more recent state
          (message.createdAt && existingMessage.createdAt && 
           new Date(message.createdAt).getTime() > new Date(existingMessage.createdAt).getTime())
        )
        
        if (shouldReplaceExisting) {
          acc[existingIndex] = message
        }
      } else {
        acc.push(message)
      }
      return acc
    }, [] as ChatMessage[])

    return uniqueMessages.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  }, [messages, messageQueue.queuedMessages])

  // Cleanup effect when user leaves
  useEffect(() => {
    return () => {
      // User leaving room
    }
  }, [userId, username, roomId, messages.length])

  return { 
    messages: allMessages, 
    sendMessage, 
    retryMessage, 
    isConnected, 
    loading,
    queueStatus: messageQueue.getQueueStatus(),
    clearFailedMessages: messageQueue.clearFailedMessages
  }
}
