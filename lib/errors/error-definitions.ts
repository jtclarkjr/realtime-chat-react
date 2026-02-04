/**
 * Centralized error definitions for API responses
 *
 * Each error includes:
 * - code: Unique identifier for the error type
 * - message: User-friendly error message
 * - statusCode: HTTP status code
 */

export const ERROR_DEFINITIONS = {
  // 400 - Bad Request
  MISSING_ROOM_ID: {
    code: 'MISSING_ROOM_ID',
    message: 'Room ID is required',
    statusCode: 400
  },
  MISSING_REQUIRED_FIELDS: {
    code: 'MISSING_REQUIRED_FIELDS',
    message: 'Missing required fields',
    statusCode: 400
  },
  MISSING_MESSAGE_FIELDS: {
    code: 'MISSING_MESSAGE_FIELDS',
    message: 'Missing required fields for message',
    statusCode: 400
  },

  // 401 - Unauthorized
  AUTHENTICATION_REQUIRED: {
    code: 'UNAUTHENTICATED',
    message: 'Authentication required. Please sign in.',
    statusCode: 401
  },

  // 403 - Forbidden
  SEND_AS_SELF_ONLY: {
    code: 'FORBIDDEN_SENDER_MISMATCH',
    message: 'You can only send messages as yourself',
    statusCode: 403
  },
  UNSEND_OWN_MESSAGES_ONLY: {
    code: 'FORBIDDEN_UNSEND_OTHER',
    message: 'You can only unsend your own messages',
    statusCode: 403
  },
  MARK_RECEIVED_SELF_ONLY: {
    code: 'FORBIDDEN_MARK_RECEIVED_OTHER',
    message: 'You can only mark messages as received for yourself',
    statusCode: 403
  },
  GET_MISSED_MESSAGES_SELF_ONLY: {
    code: 'FORBIDDEN_MISSED_MESSAGES_OTHER',
    message: 'You can only get missed messages for yourself',
    statusCode: 403
  },
  AI_REQUEST_SELF_ONLY: {
    code: 'FORBIDDEN_AI_REQUEST_OTHER',
    message: 'You can only request AI responses for yourself',
    statusCode: 403
  },
  ANONYMOUS_USER_RESTRICTED: {
    code: 'ANONYMOUS_USER_RESTRICTED',
    message: 'This action requires a full account. Please sign in.',
    statusCode: 403
  },

  // 404 - Not Found
  ROOM_NOT_FOUND: {
    code: 'ROOM_NOT_FOUND',
    message: 'Room not found',
    statusCode: 404
  },
  ROOM_NOT_FOUND_OR_UNAUTHORIZED: {
    code: 'ROOM_NOT_FOUND_OR_UNAUTHORIZED',
    message: 'Room not found or unauthorized to delete',
    statusCode: 404
  },
  MESSAGE_NOT_FOUND: {
    code: 'MESSAGE_NOT_FOUND',
    message: 'Message not found',
    statusCode: 404
  },

  // 409 - Conflict
  ROOM_NAME_EXISTS: {
    code: 'ROOM_NAME_EXISTS',
    message: 'A room with this name already exists',
    statusCode: 409
  },

  // 500 - Internal Server Error
  INTERNAL_SERVER_ERROR: {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error',
    statusCode: 500
  },
  AUTH_VERIFICATION_FAILED: {
    code: 'AUTH_ERROR',
    message: 'Authentication verification failed.',
    statusCode: 500
  },
  AI_SERVICE_NOT_CONFIGURED: {
    code: 'AI_SERVICE_UNAVAILABLE',
    message: 'AI service not configured',
    statusCode: 500
  },
  AI_RESPONSE_FAILED: {
    code: 'AI_RESPONSE_FAILED',
    message: 'Failed to get AI response',
    statusCode: 500
  },
  MESSAGE_SEND_FAILED: {
    code: 'MESSAGE_SEND_FAILED',
    message: 'Failed to send message',
    statusCode: 500
  },
  MESSAGE_UNSEND_FAILED: {
    code: 'MESSAGE_UNSEND_FAILED',
    message: 'Failed to unsend message',
    statusCode: 500
  },
  MESSAGE_MARK_RECEIVED_FAILED: {
    code: 'MESSAGE_MARK_RECEIVED_FAILED',
    message: 'Failed to mark message as received',
    statusCode: 500
  },
  ROOM_GENERATION_FAILED: {
    code: 'ROOM_GENERATION_FAILED',
    message: 'Failed to generate room suggestion',
    statusCode: 500
  }
} as const

export type ErrorCode = keyof typeof ERROR_DEFINITIONS
