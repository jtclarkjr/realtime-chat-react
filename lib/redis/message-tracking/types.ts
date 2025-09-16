/**
 * Message tracking key types
 */
export interface MessageTrackingKeys {
  userLastReceived: (userId: string, roomId: string) => string
  roomLatestMessage: (roomId: string) => string
}

/**
 * Message tracking operations
 */
export interface MessageTrackingOperations {
  markMessageReceived: (
    userId: string,
    roomId: string,
    messageId: string
  ) => Promise<void>
  trackLatestMessage: (roomId: string, messageId: string) => Promise<void>
  getUserLastReceivedMessageId: (
    userId: string,
    roomId: string
  ) => Promise<string | null>
  getRoomLatestMessageId: (roomId: string) => Promise<string | null>
  markUserCaughtUp: (userId: string, roomId: string) => Promise<void>
}
