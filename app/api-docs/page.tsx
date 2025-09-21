import { Suspense } from 'react'
import { swaggerSpec } from '@/lib/swagger'
import SwaggerUIClient from './swagger-ui-client'

const getSwaggerSpec = async () => {
  return swaggerSpec
}

const LoadingFallback = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading API Documentation...</p>
      </div>
    </div>
  )
}

export default function ApiDocsPage() {
  const specPromise = getSwaggerSpec()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Realtime Chat API Documentation
          </h1>
          <p className="text-muted-foreground">
            Interactive API documentation for the Realtime Chat application
          </p>
        </div>
        <Suspense fallback={<LoadingFallback />}>
          <SwaggerUIClient specPromise={specPromise} />
        </Suspense>
      </div>
    </div>
  )
}
