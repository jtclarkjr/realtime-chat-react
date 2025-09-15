import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Room Not Found</h1>
        <p className="text-muted-foreground">
          The room you&apos;re looking for doesn&apos;t exist or has been
          removed.
        </p>
        <Button asChild>
          <Link href="/">Go Back to Home</Link>
        </Button>
      </div>
    </div>
  )
}
