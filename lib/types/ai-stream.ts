import { z } from 'zod'

export const aiStreamRealtimePayloadSchema = z.object({
  eventType: z.enum(['start', 'content', 'error']),
  streamId: z.string(),
  roomId: z.string(),
  requesterId: z.string(),
  isPrivate: z.boolean(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    avatar_url: z.string().optional()
  }),
  createdAt: z.string(),
  fullContent: z.string()
})

export type AIStreamRealtimePayload = z.infer<
  typeof aiStreamRealtimePayloadSchema
>
