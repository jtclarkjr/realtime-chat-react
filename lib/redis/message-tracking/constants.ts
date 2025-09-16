/**
 * Key prefixes for message tracking
 */
export const MESSAGE_TRACKING_PREFIXES = {
  USER_LAST_RECEIVED: 'user',
  ROOM_LATEST_MESSAGE: 'room'
} as const

/**
 * Cache duration for message tracking (30 days in seconds)
 */
export const MESSAGE_TRACKING_DURATION = 86400 * 30

/**
 * Message tracking key generators
 */
export const MESSAGE_TRACKING_KEYS = {
  /**
   * Generate Redis key for tracking user's last received message in a room
   */
  getUserLastReceivedKey: (userId: string, roomId: string): string => {
    return `${MESSAGE_TRACKING_PREFIXES.USER_LAST_RECEIVED}:${userId}:room:${roomId}:last_received`
  },

  /**
   * Generate Redis key for tracking latest message in a room
   */
  getRoomLatestMessageKey: (roomId: string): string => {
    return `${MESSAGE_TRACKING_PREFIXES.ROOM_LATEST_MESSAGE}:${roomId}:latest_message_id`
  }
} as const
