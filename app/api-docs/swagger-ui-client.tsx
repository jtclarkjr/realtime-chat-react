'use client'

import dynamic from 'next/dynamic'
import { use, useEffect } from 'react'
import 'swagger-ui-react/swagger-ui.css'
import './swagger-ui.css'

const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () => <div className="p-4">Loading Swagger UI...</div>
})

interface SwaggerUIClientProps {
  specPromise: Promise<any>
}

const SwaggerUIClient = ({ specPromise }: SwaggerUIClientProps) => {
  const spec = use(specPromise)

  useEffect(() => {
    const originalError = console.error
    console.error = (...args) => {
      if (
        typeof args[0] === 'string' &&
        args[0].includes('UNSAFE_componentWillReceiveProps')
      ) {
        return
      }
      originalError.call(console, ...args)
    }

    return () => {
      console.error = originalError
    }
  }, [])

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <SwaggerUI
        spec={spec}
        deepLinking={true}
        displayOperationId={false}
        defaultModelsExpandDepth={1}
        defaultModelExpandDepth={1}
        defaultModelRendering="example"
        displayRequestDuration={true}
        docExpansion="list"
        filter={true}
        showExtensions={true}
        showCommonExtensions={true}
      />
    </div>
  )
}

export default SwaggerUIClient
