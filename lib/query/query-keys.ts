export const queryKeys = {
  rooms: {
    all: ['rooms'] as const,
    list: () => [...queryKeys.rooms.all, 'list'] as const,
    detail: (roomId: string) =>
      [...queryKeys.rooms.all, 'detail', roomId] as const
  },
  messages: {
    all: ['messages'] as const,
    list: (roomId: string) =>
      [...queryKeys.messages.all, 'list', roomId] as const,
    missed: (roomId: string, userId: string) =>
      [...queryKeys.messages.all, 'missed', roomId, userId] as const,
    recent: (roomId: string) =>
      [...queryKeys.messages.all, 'recent', roomId] as const
  }
} as const
