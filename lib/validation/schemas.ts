import { z } from 'zod'

// UUID validation helper
const uuidSchema = z.string().uuid('Invalid UUID format')

// Common validations
const nonEmptyString = z.string().min(1, 'Cannot be empty')
const trimmedString = z.string().trim()

/**
 * Message Schemas
 */

export const sendMessageSchema = z.object({
  roomId: uuidSchema,
  userId: uuidSchema,
  username: nonEmptyString.max(50, 'Username must be 50 characters or less'),
  content: trimmedString
    .min(1, 'Message content cannot be empty')
    .max(10000, 'Message must be 10,000 characters or less'),
  isPrivate: z.boolean().optional(),
  requesterId: uuidSchema.optional()
})

export const unsendMessageSchema = z.object({
  messageId: nonEmptyString,
  userId: uuidSchema,
  roomId: uuidSchema
})

export const markReceivedSchema = z.object({
  userId: uuidSchema,
  roomId: uuidSchema,
  messageId: nonEmptyString
})

/**
 * Room Schemas
 */

export const createRoomSchema = z.object({
  name: trimmedString
    .min(1, 'Room name is required')
    .max(100, 'Room name must be 100 characters or less'),
  description: trimmedString
    .max(500, 'Description must be 500 characters or less')
    .optional()
    .nullable()
})

export const deleteRoomSchema = z.object({
  id: uuidSchema
})

export const deleteRoomQuerySchema = z.object({
  id: uuidSchema
})

/**
 * AI Request Schemas
 */

export const aiMessageSchema = z.object({
  content: nonEmptyString,
  isAi: z.boolean(),
  userName: nonEmptyString
})

export const aiStreamRequestSchema = z.object({
  roomId: uuidSchema,
  userId: uuidSchema,
  message: trimmedString
    .min(1, 'Message cannot be empty')
    .max(10000, 'Message must be 10,000 characters or less'),
  isPrivate: z.boolean().optional(),
  triggerMessageId: nonEmptyString.optional(),
  previousMessages: z.array(aiMessageSchema).optional()
})

/**
 * Query Parameter Schemas
 */

export const roomIdParamSchema = z.object({
  roomId: uuidSchema
})

export const rejoinRoomSchema = z.object({
  userId: uuidSchema
})

// Type exports for use in API routes
export type SendMessageInput = z.infer<typeof sendMessageSchema>
export type UnsendMessageInput = z.infer<typeof unsendMessageSchema>
export type MarkReceivedInput = z.infer<typeof markReceivedSchema>
export type CreateRoomInput = z.infer<typeof createRoomSchema>
export type DeleteRoomInput = z.infer<typeof deleteRoomSchema>
export type AIStreamRequestInput = z.infer<typeof aiStreamRequestSchema>
export type RoomIdParamInput = z.infer<typeof roomIdParamSchema>
export type RejoinRoomInput = z.infer<typeof rejoinRoomSchema>
