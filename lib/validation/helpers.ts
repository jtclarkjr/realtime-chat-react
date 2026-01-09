import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * Validation error response interface
 */
interface ValidationErrorResponse {
  error: string
  code: string
  details?: Array<{
    field: string
    message: string
  }>
}

/**
 * Sanitize error message to prevent leaking sensitive information
 */
function sanitizeErrorMessage(message: string): string {
  // Remove file paths, stack traces, and internal details
  return message
    .replace(/\/[^\s]+\.ts/g, '[file]') // Remove file paths
    .replace(/at .+\(.+\)/g, '') // Remove stack trace lines
    .replace(/Expected .+, received .+/g, 'Invalid value') // Generic type errors
    .trim()
}

/**
 * Convert Zod path array to dot notation field name
 */
function formatFieldPath(path: (string | number | symbol)[]): string {
  if (path.length === 0) return 'root'
  return path.map((p) => String(p)).join('.')
}

/**
 * Validates request body against a Zod schema
 * Returns parsed data or null with error response
 */
export async function validateRequestBody<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T
): Promise<
  | { success: true; data: z.infer<T> }
  | { success: false; response: NextResponse<ValidationErrorResponse> }
> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      const errorDetails = result.error.issues.map((err) => ({
        field: formatFieldPath(err.path),
        message: sanitizeErrorMessage(err.message)
      }))

      return {
        success: false,
        response: NextResponse.json(
          {
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errorDetails
          },
          { status: 400 }
        )
      }
    }

    return { success: true, data: result.data }
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Invalid JSON in request body',
          code: 'INVALID_JSON'
        },
        { status: 400 }
      )
    }
  }
}

/**
 * Validates query parameters against a Zod schema
 * Returns parsed data or null with error response
 */
export function validateQueryParams<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T
):
  | { success: true; data: z.infer<T> }
  | { success: false; response: NextResponse<ValidationErrorResponse> }
{
  const { searchParams } = new URL(request.url)
  const params: Record<string, string> = {}

  searchParams.forEach((value, key) => {
    params[key] = value
  })

  const result = schema.safeParse(params)

  if (!result.success) {
    const errorDetails = result.error.issues.map((err) => ({
      field: formatFieldPath(err.path),
      message: sanitizeErrorMessage(err.message)
    }))

    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Invalid query parameters',
          code: 'INVALID_QUERY_PARAMS',
          details: errorDetails
        },
        { status: 400 }
      )
    }
  }

  return { success: true, data: result.data }
}

/**
 * Validates URL path parameters against a Zod schema
 * Returns parsed data or error response
 */
export function validatePathParams<T extends z.ZodTypeAny>(
  params: Record<string, string | string[]>,
  schema: T
):
  | { success: true; data: z.infer<T> }
  | { success: false; response: NextResponse<ValidationErrorResponse> }
{
  const result = schema.safeParse(params)

  if (!result.success) {
    const errorDetails = result.error.issues.map((err) => ({
      field: formatFieldPath(err.path),
      message: sanitizeErrorMessage(err.message)
    }))

    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Invalid path parameters',
          code: 'INVALID_PATH_PARAMS',
          details: errorDetails
        },
        { status: 400 }
      )
    }
  }

  return { success: true, data: result.data }
}

/**
 * Validates data synchronously (for use outside of API routes)
 */
export function validateData<T extends z.ZodTypeAny>(
  data: unknown,
  schema: T
):
  | { success: true; data: z.infer<T> }
  | { success: false; errors: z.ZodError }
{
  const result = schema.safeParse(data)

  if (!result.success) {
    return { success: false, errors: result.error }
  }

  return { success: true, data: result.data }
}

export const byteLength = (str: string): number => new TextEncoder().encode(str).length

