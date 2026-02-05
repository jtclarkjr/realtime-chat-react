export function MessageSkeleton() {
  return (
    <div className="flex gap-3 px-4 py-3">
      <div className="w-8 h-8 rounded-full bg-muted shimmer shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded w-24 shimmer" />
        <div className="h-4 bg-muted rounded w-full max-w-md shimmer" />
        <div className="h-4 bg-muted rounded w-3/4 max-w-sm shimmer" />
      </div>
    </div>
  )
}

export function MessageListSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 10 }).map((_, i) => (
        <MessageSkeleton key={i} />
      ))}
    </div>
  )
}
