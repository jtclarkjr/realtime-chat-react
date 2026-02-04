'use client'

import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoginDialog } from '@/components/login-dialog'

export function AnonymousBanner() {
  const [showLoginDialog, setShowLoginDialog] = useState(false)

  return (
    <>
      <div className="bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
            <p className="text-sm text-orange-800 dark:text-orange-200">
              You&apos;re browsing as a guest. Sign in to send messages, create
              rooms, and use AI features.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLoginDialog(true)}
            className="flex-shrink-0"
          >
            Sign In
          </Button>
        </div>
      </div>

      <LoginDialog open={showLoginDialog} onOpenChange={setShowLoginDialog} />
    </>
  )
}
