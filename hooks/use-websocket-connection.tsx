'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useCallback } from 'react'
import type { ChatMessage } from '@/lib/types/database'

const EVENT_MESSAGE_TYPE = 'message'

interface UseWebSocketConnectionProps {
  roomId: string
  userId: string
  onMessage: (message: ChatMessage) => void
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
  enabled = true
}: UseWebSocketConnectionProps): UseWebSocketConnectionReturn {
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const supabase = createClient()

  const setupChannel = useCallback((): (() => void) | null => {
    if (!enabled) return null

    let reconnectTimeout: NodeJS.Timeout
    let heartbeatInterval: NodeJS.Timeout
    let isCleanedUp = false

    const newChannel = supabase
      .channel(roomId, {
        config: {
          broadcast: { self: false }, // Don't receive own messages via broadcast
          presence: { key: userId } // Track presence with userId
        }
      })
      .on('broadcast', { event: EVENT_MESSAGE_TYPE }, (payload) => {
        const receivedMessage = payload.payload as ChatMessage
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
              setupChannel()
            }, 3000)
          }
        }
      })
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)

          // Start heartbeat to keep connection alive
          clearInterval(heartbeatInterval)
          heartbeatInterval = setInterval(() => {
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
              setupChannel()
            }, 3000)
          }
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false)
        } else if (status === 'CLOSED') {
          setIsConnected(false)
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
  }, [supabase, roomId, userId, onMessage, enabled])

  const reconnect = useCallback((): void => {
    setupChannel()
  }, [setupChannel])

  useEffect(() => {
    const cleanup = setupChannel()
    return cleanup || (() => {})
  }, [setupChannel])

  return {
    isConnected,
    reconnect
  }
}
