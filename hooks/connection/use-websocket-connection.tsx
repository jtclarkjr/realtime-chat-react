'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { ChatMessage } from '@/lib/types/database'

const EVENT_MESSAGE_TYPE = 'message'

interface UseWebSocketConnectionProps {
  roomId: string
  userId: string
  onMessage: (message: ChatMessage) => void
  onMessageUnsent?: (messageId: string) => void
  enabled: boolean
}

interface UseWebSocketConnectionReturn {
  isConnected: boolean
  reconnect: () => void
}

export function useWebSocketConnection({
  roomId,
  userId,
  onMessage,
  onMessageUnsent,
  enabled = true
}: UseWebSocketConnectionProps): UseWebSocketConnectionReturn {
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [reconnectTrigger, setReconnectTrigger] = useState<number>(0)
  const supabaseRef = useRef(createClient())

  const setupChannel = useCallback((): (() => void) | null => {
    if (!enabled) return null

    let reconnectTimeout: NodeJS.Timeout
    let heartbeatInterval: NodeJS.Timeout
    let missedHeartbeats = 0
    let isCleanedUp = false

    // Get fresh supabase client
    const supabase = supabaseRef.current

    const newChannel = supabase
      .channel(roomId, {
        config: {
          broadcast: { self: false }, // Don't receive own messages via broadcast
          presence: { key: userId } // Track presence with userId
        }
      })
      .on('broadcast', { event: EVENT_MESSAGE_TYPE }, (payload) => {
        const receivedMessage = payload.payload as ChatMessage
        // Reset missed heartbeats when we receive a message
        missedHeartbeats = 0
        // Only process messages that have content and valid structure
        if (
          receivedMessage &&
          receivedMessage.content &&
          receivedMessage.content.trim() &&
          receivedMessage.user?.name
        ) {
          onMessage(receivedMessage)
        }
      })
      .on('broadcast', { event: 'message_unsent' }, (payload) => {
        // Handle message unsend events
        const { messageId } = payload.payload as { messageId: string }
        if (messageId && onMessageUnsent) {
          onMessageUnsent(messageId)
        }
      })
      .on('system', {}, (payload) => {
        // Handle system events (connection state changes)
        if (
          payload.extension === 'postgres_changes' &&
          payload.type === 'error'
        ) {
          console.error('Channel error:', payload)
          setIsConnected(false)
          // Attempt to reconnect after error
          if (!isCleanedUp) {
            clearTimeout(reconnectTimeout)
            reconnectTimeout = setTimeout(() => {
              supabase.removeChannel(newChannel)
              // Trigger reconnect by incrementing trigger
              setReconnectTrigger((prev) => prev + 1)
            }, 3000)
          }
        }
      })
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          missedHeartbeats = 0

          // Start heartbeat to keep connection alive
          clearInterval(heartbeatInterval)
          heartbeatInterval = setInterval(() => {
            missedHeartbeats++
            
            // If we've missed too many heartbeats, reconnect
            if (missedHeartbeats > 3) {
              console.warn('Connection appears stale, reconnecting...')
              setIsConnected(false)
              if (!isCleanedUp) {
                supabase.removeChannel(newChannel)
                setReconnectTrigger((prev) => prev + 1)
              }
              return
            }
            
            // Send a presence update as heartbeat
            newChannel.track({ online: true, userId, timestamp: Date.now() })
          }, 30000) // Send heartbeat every 30 seconds
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false)
          if (error) {
            console.error('Channel subscription error:', error)
          }
          // Attempt reconnection
          if (!isCleanedUp) {
            clearTimeout(reconnectTimeout)
            reconnectTimeout = setTimeout(() => {
              supabase.removeChannel(newChannel)
              // Trigger reconnect by incrementing trigger
              setReconnectTrigger((prev) => prev + 1)
            }, 3000)
          }
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false)
          // Trigger reconnect on timeout
          if (!isCleanedUp) {
            setReconnectTrigger((prev) => prev + 1)
          }
        } else if (status === 'CLOSED') {
          setIsConnected(false)
          // Trigger reconnect when closed
          if (!isCleanedUp) {
            setReconnectTrigger((prev) => prev + 1)
          }
        }
      })

    // Return cleanup function
    return () => {
      isCleanedUp = true
      clearTimeout(reconnectTimeout)
      clearInterval(heartbeatInterval)
      if (newChannel) {
        supabase.removeChannel(newChannel)
      }
      setIsConnected(false)
    }
  }, [roomId, userId, onMessage, onMessageUnsent, enabled, reconnectTrigger])

  const reconnect = useCallback((): void => {
    setReconnectTrigger((prev) => prev + 1)
  }, [])

  useEffect(() => {
    const cleanup = setupChannel()
    return cleanup || (() => {})
  }, [setupChannel])

  return {
    isConnected,
    reconnect
  }
}
