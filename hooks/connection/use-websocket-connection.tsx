'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { ChatMessage } from '@/lib/types/database'
import type { PresenceState, PresenceUser } from '@/lib/types/presence'

const EVENT_MESSAGE_TYPE = 'message'
const PRESENCE_STALE_MS = 90_000
const PRESENCE_PRUNE_INTERVAL_MS = 15_000
const PRESENCE_HEARTBEAT_INTERVAL_MS = 5_000
const PRESENCE_EMPTY_DEBOUNCE_MS = 2_500

interface UseWebSocketConnectionProps {
  roomId: string
  userId: string
  onMessage: (message: ChatMessage) => void
  onMessageUnsent?: (messageId: string) => void
  enabled: boolean
  username?: string
  userAvatarUrl?: string
  onPresenceSync?: (state: PresenceState) => void
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
  enabled = true,
  username,
  userAvatarUrl,
  onPresenceSync
}: UseWebSocketConnectionProps): UseWebSocketConnectionReturn {
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [reconnectTrigger, setReconnectTrigger] = useState<number>(0)
  const supabaseRef = useRef(createClient())

  const setupChannel = useCallback((): (() => void) | null => {
    if (!enabled) return null

    let reconnectTimeout: NodeJS.Timeout
    let heartbeatInterval: NodeJS.Timeout
    let presencePruneInterval: NodeJS.Timeout
    let missedHeartbeats = 0
    let isCleanedUp = false
    let lastNonEmptyPresenceAt = 0
    let lastEmittedPresence: PresenceState = {}

    // Get fresh supabase client
    const supabase = supabaseRef.current

    const emitPresenceSync = (): void => {
      const presenceState = newChannel.presenceState<PresenceUser>()
      const transformedState: PresenceState = {}
      const now = Date.now()

      Object.entries(presenceState).forEach(([presenceUserId, presences]) => {
        if (!presences || presences.length === 0) return

        // Use the most recent metadata update from this user.
        const latestPresence = presences[presences.length - 1]
        const lastSeenAt =
          latestPresence.timestamp || latestPresence.online_at || 0
        const isStale = lastSeenAt > 0 && now - lastSeenAt > PRESENCE_STALE_MS

        if (latestPresence.online === false || isStale) return

        transformedState[presenceUserId] = {
          id: presenceUserId,
          name: latestPresence.name,
          avatar_url: latestPresence.avatar_url,
          online_at: latestPresence.online_at,
          timestamp: latestPresence.timestamp,
          online: latestPresence.online
        }
      })

      const hasUsers = Object.keys(transformedState).length > 0
      const hadUsers = Object.keys(lastEmittedPresence).length > 0

      if (hasUsers) {
        lastNonEmptyPresenceAt = now
        lastEmittedPresence = transformedState
        onPresenceSync?.(transformedState)
        return
      }

      // Reconnects can emit an empty sync before presences repopulate.
      // Debounce empty state to prevent avatar flicker.
      if (hadUsers && now - lastNonEmptyPresenceAt < PRESENCE_EMPTY_DEBOUNCE_MS) {
        return
      }

      lastEmittedPresence = {}
      onPresenceSync?.({})
    }

    const newChannel = supabase
      .channel(roomId, {
        config: {
          broadcast: { self: false }, // Don't receive own messages via broadcast
          presence: { key: userId } // Track presence with userId
        }
      })
      .on('broadcast', { event: EVENT_MESSAGE_TYPE }, (payload) => {
        // Supabase broadcast wraps data in payload.payload
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
        // Handle message unsend events - Supabase broadcast wraps data in payload.payload
        const { messageId } = payload.payload as { messageId: string }
        if (messageId && onMessageUnsent) {
          onMessageUnsent(messageId)
        }
      })
      .on('presence', { event: 'sync' }, () => {
        // Handle presence sync events
        emitPresenceSync()
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
              void newChannel.track({
                online: false,
                userId,
                name: username || 'Anonymous',
                avatar_url: userAvatarUrl,
                timestamp: Date.now()
              })
              void newChannel.untrack()
              void supabase.removeChannel(newChannel)
              // Trigger reconnect by incrementing trigger
              setReconnectTrigger((prev) => prev + 1)
            }, 3000)
          }
        }
      })
      .subscribe(async (status, error) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          missedHeartbeats = 0

          // Track user presence with metadata
          await newChannel.track({
            online: true,
            userId,
            name: username || 'Anonymous',
            avatar_url: userAvatarUrl,
            online_at: Date.now(),
            timestamp: Date.now()
          })

          // Start heartbeat to keep connection alive
          clearInterval(heartbeatInterval)
          heartbeatInterval = setInterval(() => {
            missedHeartbeats++

            // If we've missed too many heartbeats, reconnect
            if (missedHeartbeats > 3) {
              console.warn('Connection appears stale, reconnecting...')
              clearInterval(heartbeatInterval)
              setIsConnected(false)
              if (!isCleanedUp) {
                void newChannel.track({
                  online: false,
                  userId,
                  name: username || 'Anonymous',
                  avatar_url: userAvatarUrl,
                  timestamp: Date.now()
                })
                void newChannel.untrack()
                void supabase.removeChannel(newChannel)
                setReconnectTrigger((prev) => prev + 1)
              }
              return
            }

            // Send a presence update as heartbeat
            newChannel.track({
              online: true,
              userId,
              name: username || 'Anonymous',
              avatar_url: userAvatarUrl,
              online_at: Date.now(),
              timestamp: Date.now()
            })
          }, PRESENCE_HEARTBEAT_INTERVAL_MS) // Send heartbeat every 10 seconds

          clearInterval(presencePruneInterval)
          presencePruneInterval = setInterval(() => {
            emitPresenceSync()
          }, PRESENCE_PRUNE_INTERVAL_MS)
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false)
          if (error) {
            console.error('Channel subscription error:', error)
          }
          // Attempt reconnection
          if (!isCleanedUp) {
            clearTimeout(reconnectTimeout)
            reconnectTimeout = setTimeout(() => {
              void newChannel.track({
                online: false,
                userId,
                name: username || 'Anonymous',
                avatar_url: userAvatarUrl,
                timestamp: Date.now()
              })
              void newChannel.untrack()
              void supabase.removeChannel(newChannel)
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
      clearInterval(presencePruneInterval)
      if (newChannel) {
        // Best effort: announce offline + leave presence before removing.
        void newChannel.track({
          online: false,
          userId,
          name: username || 'Anonymous',
          avatar_url: userAvatarUrl,
          timestamp: Date.now()
        })
        void newChannel.untrack()
        void supabase.removeChannel(newChannel)
      }
      setIsConnected(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    roomId,
    userId,
    onMessage,
    onMessageUnsent,
    enabled,
    reconnectTrigger,
    username,
    userAvatarUrl,
    onPresenceSync
  ])

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
