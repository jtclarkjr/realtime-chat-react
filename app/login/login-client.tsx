'use client'

import { useState } from 'react'
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

  const handleOAuthSignIn = async (
    provider: 'discord' | 'github' | 'apple',
    signInFn: () => Promise<{ error: Error | null }>
  ) => {
    try {
      setLoading(provider)

      // Set a timeout to reset loading state in case of redirect
      const timeoutId = setTimeout(() => {
        setLoading(null)
      }, 5000)

      const { error } = await signInFn()

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
        className="w-full py-3 px-4 rounded-lg font-medium text-base"
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
        className="w-full py-3 px-4 rounded-lg font-medium text-base"
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
        className="w-full py-3 px-4 rounded-lg font-medium text-base"
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
