import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MessageCircle, AlertTriangle } from 'lucide-react'

interface AuthCodeErrorPageProps {
  searchParams: {
    error?: string
    description?: string
  }
}

function getErrorMessage(error?: string, description?: string) {
  if (error === 'signup_disabled') {
    return {
      title: 'Signups Disabled',
      message: 'New account signups are currently disabled. Please contact an administrator to enable your account.',
      suggestion: 'Contact support or try signing in with an existing account.'
    }
  }
  
  if (error === 'access_denied') {
    return {
      title: 'Access Denied',
      message: 'You denied access to the application or signups are disabled.',
      suggestion: 'Please try again and grant the necessary permissions.'
    }
  }

  return {
    title: 'Authentication Error',
    message: description || 'There was an error signing you in. Please try again.',
    suggestion: 'If the problem persists, please contact support.'
  }
}

export default function AuthCodeErrorPage({ searchParams }: AuthCodeErrorPageProps) {
  const errorInfo = getErrorMessage(searchParams.error, searchParams.description)
  
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <MessageCircle className="h-12 w-12 text-muted-foreground" />
              <AlertTriangle className="h-5 w-5 text-destructive absolute -top-1 -right-1" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">{errorInfo.title}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {errorInfo.message}
          </p>
        </div>

        <div className="space-y-4">
          <Button asChild className="w-full">
            <Link href="/login">
              Try Again
            </Link>
          </Button>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              {errorInfo.suggestion}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}