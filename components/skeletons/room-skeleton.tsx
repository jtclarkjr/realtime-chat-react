export function RoomSkeleton() {
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Messages area skeleton */}
      <div className="flex-1 overflow-hidden p-4 space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-muted shimmer shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-24 shimmer" />
              <div className="h-4 bg-muted rounded w-full max-w-md shimmer" />
              <div className="h-4 bg-muted rounded w-3/4 max-w-sm shimmer" />
            </div>
          </div>
        ))}
      </div>

      {/* Input area skeleton */}
      <div className="border-t border-border p-4">
        <div className="h-20 bg-muted rounded-lg shimmer" />
      </div>
    </div>
  )
}
