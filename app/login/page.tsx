import { PageTransition } from '@/components/page-transition'
import { MessageCircle } from 'lucide-react'
import { LoginClient } from './login-client'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function LoginPage() {
  const appName = process.env.APP_NAME || 'Realtime Chat'

  // Check if user is already signed in
  const headersList = await headers()
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const request = new Request(baseUrl, {
    headers: Object.fromEntries(headersList.entries())
  })
  const { supabase } = createClient(request)
  const {
    data: { user }
  } = await supabase.auth.getUser()

  // If user is signed in with a full account (not anonymous), redirect to home
  if (user && !user.is_anonymous) {
    redirect('/')
  }

  return (
    <PageTransition className="min-h-dvh flex items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center mb-4">
            <MessageCircle className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Welcome to {appName}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Sign in to join the conversation
          </p>
        </div>

        <LoginClient />

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            By signing in, you agree to our terms of service and privacy policy
          </p>
        </div>
      </div>
    </PageTransition>
  )
}
