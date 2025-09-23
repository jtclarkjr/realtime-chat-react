'use client'

import { useState, useEffect } from 'react'

interface NetworkConnectivityState {
  isOnline: boolean
  wasOffline: boolean
  lastConnectionChange: number
}

/**
 * Hook to detect real-time network connectivity changes
 * Combines navigator.onLine with online/offline event listeners
 */
export function useNetworkConnectivity(): NetworkConnectivityState {
  const [connectivityState, setConnectivityState] =
    useState<NetworkConnectivityState>(() => ({
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      wasOffline: false,
      lastConnectionChange: Date.now()
    }))

  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return

    let wasOffline = !navigator.onLine

    const handleOnline = () => {
      setConnectivityState((prev) => ({
        isOnline: true,
        wasOffline: prev.wasOffline || wasOffline,
        lastConnectionChange: Date.now()
      }))
      wasOffline = false
    }

    const handleOffline = () => {
      setConnectivityState(() => ({
        isOnline: false,
        wasOffline: true,
        lastConnectionChange: Date.now()
      }))
      wasOffline = true
    }

    // Add event listeners for network state changes
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Also listen for visibility changes to check connectivity when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const currentOnlineStatus = navigator.onLine
        if (currentOnlineStatus !== connectivityState.isOnline) {
          setConnectivityState((prev) => ({
            isOnline: currentOnlineStatus,
            wasOffline: prev.wasOffline || !currentOnlineStatus,
            lastConnectionChange: Date.now()
          }))
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup event listeners
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [connectivityState.isOnline])

  return connectivityState
}
