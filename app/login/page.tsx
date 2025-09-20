import { PageTransition } from '@/components/page-transition'
import { MessageCircle } from 'lucide-react'
import { LoginClient } from './login-client'

export default function LoginPage() {

  return (
    <PageTransition className="min-h-dvh flex items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center mb-4">
            <MessageCircle className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Welcome to Realtime Chat
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
