import { getRedisClient } from './client'

const USER_LAST_RECEIVED_KEY_PREFIX = 'user'
const ROOM_LATEST_MESSAGE_KEY_PREFIX = 'room'
const CACHE_DURATION = 86400 * 30 // 30 days

/**
 * Generate Redis key for tracking user's last received message in a room
 */
export function getUserLastReceivedKey(userId: string, roomId: string): string {
  return `${USER_LAST_RECEIVED_KEY_PREFIX}:${userId}:room:${roomId}:last_received`
}

/**
 * Generate Redis key for tracking latest message in a room
 */
export function getRoomLatestMessageKey(roomId: string): string {
  return `${ROOM_LATEST_MESSAGE_KEY_PREFIX}:${roomId}:latest_message_id`
}

/**
 * Mark a message as received by a user
 */
export async function markMessageReceived(
  userId: string,
  roomId: string,
  messageId: string
): Promise<void> {
  const redis = getRedisClient()
  const key = getUserLastReceivedKey(userId, roomId)

  await redis.set(key, messageId, 'EX', CACHE_DURATION)
}

/**
 * Track the latest message in a room
 */
export async function trackLatestMessage(
  roomId: string,
  messageId: string
): Promise<void> {
  const redis = getRedisClient()
  const key = getRoomLatestMessageKey(roomId)

  await redis.set(key, messageId)
}

/**
 * Get user's last received message ID for a room
 */
export async function getUserLastReceivedMessageId(
  userId: string,
  roomId: string
): Promise<string | null> {
  const redis = getRedisClient()
  const key = getUserLastReceivedKey(userId, roomId)

  return await redis.get(key)
}

/**
 * Get the latest message ID in a room
 */
export async function getRoomLatestMessageId(
  roomId: string
): Promise<string | null> {
  const redis = getRedisClient()
  const key = getRoomLatestMessageKey(roomId)

  return await redis.get(key)
}

/**
 * Mark user as caught up in a room (set their last received to latest message)
 */
export async function markUserCaughtUp(
  userId: string,
  roomId: string
): Promise<void> {
  const latestMessageId = await getRoomLatestMessageId(roomId)
  if (latestMessageId) {
    await markMessageReceived(userId, roomId, latestMessageId)
  }
}
