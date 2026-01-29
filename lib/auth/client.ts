'use client'

import { createAuthClient } from '@/lib/supabase/client-auth'

export async function signInWithDiscord() {
  const supabase = createAuthClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo:
        process.env.NEXT_PUBLIC_AUTH_CALLBACK_URL ||
        `${window.location.origin}/auth/callback`
    }
  })
  return { data, error }
}

export async function signInWithGitHub() {
  const supabase = createAuthClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo:
        process.env.NEXT_PUBLIC_AUTH_CALLBACK_URL ||
        `${window.location.origin}/auth/callback`
    }
  })
  return { data, error }
}

export async function signInWithApple() {
  const supabase = createAuthClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo:
        process.env.NEXT_PUBLIC_AUTH_CALLBACK_URL ||
        `${window.location.origin}/auth/callback`
    }
  })
  return { data, error }
}

// Email/password auth moved to server actions
// See lib/actions/auth-actions.ts for signInWithEmailAction and signUpWithEmailAction
