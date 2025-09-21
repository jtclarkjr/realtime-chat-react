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
    const handleWindowFocus = () => {
      if (!document.hidden) {
        setLoading(null)
      }
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setLoading(null)
      }
    }

    // Check on mount
    if (!document.hidden) {
      setLoading(null)
    }

    window.addEventListener('focus', handleWindowFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleWindowFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    // Only activate cancellation detection for Apple login
    if (loading !== 'apple') return

    let intervalId: NodeJS.Timeout

    // Wait 2s for Apple popup to show, then start cancellation detection
    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        if (document.visibilityState === 'visible' && !document.hidden) {
          setLoading(null)
        }
      }, 500)
    }, 2000)

    return () => {
      clearTimeout(timeoutId)
      if (intervalId) clearInterval(intervalId)
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
      }, 1500)

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
