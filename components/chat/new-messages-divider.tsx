'use client'

export const NewMessagesDivider = () => {
  return (
    <div className="relative flex items-center my-4" role="separator">
      <div className="flex-1 h-px bg-destructive/50"></div>
      <div className="px-3 py-1 bg-destructive/10 backdrop-blur-sm text-destructive text-xs font-semibold rounded-full border border-destructive/30 shadow-sm">
        New messages
      </div>
      <div className="flex-1 h-px bg-destructive/50"></div>
    </div>
  )
}
