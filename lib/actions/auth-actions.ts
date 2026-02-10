'use server'

import { createServerClient } from '@supabase/ssr'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

export async function signInWithEmailAction(
  email: string,
  password: string
): Promise<{ success: boolean } | { error: string }> {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        }
      }
    }
  )

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    return { error: error.message }
  }

  if (!data.session) {
    return { error: 'Failed to create session' }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function signUpWithEmailAction(
  email: string,
  password: string
): Promise<
  { success: true; message: string } | { success: true } | { error: string }
> {
  const cookieStore = await cookies()
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore - middleware will handle session refresh
          }
        }
      }
    }
  )

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo:
        process.env.NEXT_PUBLIC_AUTH_CALLBACK_URL || `${baseUrl}/auth/callback`
    }
  })

  if (error) {
    return { error: error.message }
  }

  if (data.user && !data.session) {
    return {
      success: true,
      message: 'Check your email to confirm your account!'
    }
  }

  return { success: true }
}

export async function signOutAction() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore - middleware will handle session refresh
          }
        }
      }
    }
  )

  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  return { success: true as const }
}
