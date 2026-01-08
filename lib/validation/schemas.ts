import { z } from 'zod'
import { byteLength } from './helpers'

// UUID validation
const uuidSchema = z.uuid('Invalid UUID format')

// Common validations
const nonEmptyString = z.string().min(1, 'Cannot be empty')

// For strings that need validation before transformation
const validatedTrimmedString = (min: number, max: number, label: string) =>
  z
    .string()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be ${max} characters or less`)
    .transform((val) => val.trim().normalize('NFC'))

// Byte length validation helper

/**
 * Message Schemas
 *
 * Note: Limits are based on character count after Unicode normalization (NFC).
 * Byte limits are enforced separately at middleware level.
 */

export const sendMessageSchema = z
  .object({
    roomId: uuidSchema,
    userId: uuidSchema,
    username: validatedTrimmedString(1, 50, 'Username'),
    // Content is trimmed and normalized before validation
    // 5000 characters = ~20KB in bytes (accounting for multi-byte unicode)
    content: validatedTrimmedString(1, 5000, 'Message').refine(
      (val) => byteLength(val) <= 20480,
      {
        message: 'Message exceeds maximum size of 20KB'
      }
    ),
    isPrivate: z.boolean().optional(),
    requesterId: uuidSchema.optional()
  })
  .strict() // Reject unknown fields

export const unsendMessageSchema = z
  .object({
    messageId: nonEmptyString,
    userId: uuidSchema,
    roomId: uuidSchema
  })
  .strict()

export const markReceivedSchema = z
  .object({
    userId: uuidSchema,
    roomId: uuidSchema,
    messageId: nonEmptyString
  })
  .strict()

/**
 * Room Schemas
 *
 * Names and descriptions are trimmed and normalized before validation.
 */

export const createRoomSchema = z
  .object({
    name: validatedTrimmedString(1, 100, 'Room name').refine(
      (val) => byteLength(val) <= 400,
      {
        message: 'Room name exceeds maximum size of 400 bytes'
      }
    ),
    description: validatedTrimmedString(0, 500, 'Description')
      .refine((val) => byteLength(val) <= 2048, {
        message: 'Description exceeds maximum size of 2KB'
      })
      .optional()
      .nullable()
  })
  .strict()

export const deleteRoomSchema = z
  .object({
    id: uuidSchema
  })
  .strict()

export const deleteRoomQuerySchema = z
  .object({
    id: uuidSchema
  })
  .strict()

/**
 * AI Request Schemas
 *
 * Streaming endpoint validation - validates metadata before processing stream.
 */

export const aiMessageSchema = z
  .object({
    content: nonEmptyString,
    isAi: z.boolean(),
    userName: nonEmptyString
  })
  .strict()

export const aiStreamRequestSchema = z
  .object({
    roomId: uuidSchema,
    userId: uuidSchema,
    message: validatedTrimmedString(1, 5000, 'Message').refine(
      (val) => byteLength(val) <= 20480,
      {
        message: 'Message exceeds maximum size of 20KB'
      }
    ),
    isPrivate: z.boolean().optional(),
    triggerMessageId: nonEmptyString.optional(),
    // Limit previous messages array to prevent excessive payload
    previousMessages: z
      .array(aiMessageSchema)
      .max(50, 'Too many previous messages')
      .optional()
  })
  .strict()

/**
 * Query Parameter Schemas
 */

export const roomIdParamSchema = z
  .object({
    roomId: uuidSchema
  })
  .strict()

export const rejoinRoomSchema = z
  .object({
    userId: uuidSchema
  })
  .strict()

// Type exports for use in API routes
export type SendMessageInput = z.infer<typeof sendMessageSchema>
export type UnsendMessageInput = z.infer<typeof unsendMessageSchema>
export type MarkReceivedInput = z.infer<typeof markReceivedSchema>
export type CreateRoomInput = z.infer<typeof createRoomSchema>
export type DeleteRoomInput = z.infer<typeof deleteRoomSchema>
export type AIStreamRequestInput = z.infer<typeof aiStreamRequestSchema>
export type RoomIdParamInput = z.infer<typeof roomIdParamSchema>
export type RejoinRoomInput = z.infer<typeof rejoinRoomSchema>
