'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { DiscordIcon, GitHubIcon, AppleIcon } from '@/components/ui/icons'
import {
  signInWithDiscord,
  signInWithGitHub,
  signInWithApple
} from '@/lib/auth/client'

export function LoginClient() {
  const [loading, setLoading] = useState<string | null>(null)

  useEffect(() => {
    // Detect iOS devices
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1)

    let intervalId: NodeJS.Timeout | null = null

    // Reset loading state when user returns to the page from cancelled login popup
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && loading) {
        setLoading(null)
      }
    }

    const handleFocus = () => {
      if (loading) {
        setLoading(null)
      }
    }

    // iOS-specific handling: poll for page visibility since events don't fire reliably
    if (isIOS && loading) {
      intervalId = setInterval(() => {
        // Check if we're back in focus and reset loading
        if (document.visibilityState === 'visible' && !document.hidden) {
          setLoading(null)
        }
      }, 500) // Check every 500ms on iOS
    }

    // Standard event listeners for non-iOS
    if (!isIOS) {
      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('focus', handleFocus)
    }

    // Additional pageshow event for iOS (fires when returning from native apps)
    const handlePageShow = () => {
      if (loading) {
        setLoading(null)
      }
    }

    if (isIOS) {
      window.addEventListener('pageshow', handlePageShow)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)

      if (!isIOS) {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('focus', handleFocus)
      }

      if (isIOS) {
        window.removeEventListener('pageshow', handlePageShow)
      }
    }
  }, [loading])

  const handleOAuthSignIn = async (
    provider: 'discord' | 'github' | 'apple',
    signIn: () => Promise<{ error: Error | null }>
  ) => {
    try {
      setLoading(provider)

      // Set a timeout to reset loading state in case of redirect
      const timeoutId = setTimeout(() => {
        setLoading(null)
      }, 5000)

      const { error } = await signIn()

      // Clear timeout if we get here (error case)
      clearTimeout(timeoutId)

      if (error) {
        console.error(`Error signing in with ${provider}:`, error)
        setLoading(null)
      }
    } catch (error) {
      console.error(`Error signing in with ${provider}:`, error)
      setLoading(null)
    }
  }

  const handleDiscordSignIn = () =>
    handleOAuthSignIn('discord', signInWithDiscord)
  const handleGitHubSignIn = () => handleOAuthSignIn('github', signInWithGitHub)
  const handleAppleSignIn = () => handleOAuthSignIn('apple', signInWithApple)

  return (
    <div className="space-y-4">
      <Button
        onClick={handleDiscordSignIn}
        disabled={!!loading}
        variant="discord"
        size="xl"
      >
        {loading === 'discord' ? (
          <span className="flex items-center gap-2">
            <Spinner variant="white" />
            Signing in...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <DiscordIcon />
            Continue with Discord
          </span>
        )}
      </Button>

      <Button
        onClick={handleGitHubSignIn}
        disabled={!!loading}
        variant="github"
        size="xl"
      >
        {loading === 'github' ? (
          <span className="flex items-center gap-2">
            <Spinner />
            Signing in...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <GitHubIcon />
            Continue with GitHub
          </span>
        )}
      </Button>

      <Button
        onClick={handleAppleSignIn}
        disabled={!!loading}
        variant="apple"
        size="xl"
      >
        {loading === 'apple' ? (
          <span className="flex items-center gap-2">
            <Spinner variant="white" />
            Signing in...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <AppleIcon />
            Continue with Apple
          </span>
        )}
      </Button>
    </div>
  )
}
