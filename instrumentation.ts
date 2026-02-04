/**
 * Next.js Instrumentation
 * Runs on server startup to configure global error handling
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Suppress expected auth errors when no session exists (e.g., on login page)
    // This prevents noisy "refresh_token_not_found" errors from cluttering logs
    process.on('unhandledRejection', (reason: unknown) => {
      // Check if this is an expected Supabase auth error
      if (
        reason &&
        typeof reason === 'object' &&
        '__isAuthError' in reason &&
        'code' in reason
      ) {
        const authError = reason as {
          __isAuthError: boolean
          code: string
          status?: number
        }

        // Suppress refresh token errors - these are expected when not logged in
        if (
          authError.__isAuthError &&
          (authError.code === 'refresh_token_not_found' ||
            authError.code === 'session_not_found' ||
            (authError.status === 400 &&
              authError.code === 'refresh_token_not_found'))
        ) {
          // Silently ignore these expected errors
          return
        }
      }

      // For all other unhandled rejections, log them
      console.error('Unhandled Rejection:', reason)
    })
  }
}
