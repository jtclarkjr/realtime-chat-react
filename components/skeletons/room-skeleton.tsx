import { MessageListSkeleton } from './message-skeleton'

export function RoomSkeleton() {
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Messages area skeleton */}
      <div className="flex-1 overflow-hidden p-3 sm:p-4">
        <MessageListSkeleton />
      </div>

      {/* Input area skeleton with same footprint as ChatInput */}
      <div className="border-t border-border p-3 sm:p-4 bg-background/50">
        <div className="flex w-full gap-2 sm:gap-3">
          <div className="flex-1 h-12 sm:h-11 rounded-2xl border border-border/50 bg-muted/60 shimmer" />
          <div className="h-12 w-12 sm:h-10 sm:w-10 rounded-full bg-muted/70 shimmer shrink-0" />
        </div>
      </div>
    </div>
  )
}
