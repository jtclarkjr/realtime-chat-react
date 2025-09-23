'use client'

import { createClient } from '@/lib/supabase/client'
import type { User, AuthError } from '@supabase/supabase-js'

export async function signInWithDiscord() {
  const supabase = createClient()
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
  const supabase = createClient()
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
  const supabase = createClient()
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

export async function signOut(): Promise<{ error: AuthError | null }> {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  return user
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  const supabase = createClient()
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null)
  })
}
