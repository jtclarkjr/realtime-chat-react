'use client'

export const StreamingIndicator = () => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex space-x-1" aria-hidden="true">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"
            style={{
              animationDelay: `${i * 0.2}s`,
              animationDuration: '1s'
            }}
          />
        ))}
      </div>
      <span className="text-sm text-muted-foreground italic">
        AI is thinking...
      </span>
    </div>
  )
}