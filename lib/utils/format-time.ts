/**
 * Format a timestamp to relative time (e.g., "5 minutes ago", "2 hours ago")
 */
export function formatRelativeTime(timestamp: string | Date): string {
  const now = new Date()
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  // Less than a minute
  if (diffInSeconds < 60) {
    return 'just now'
  }

  // Less than an hour
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return diffInMinutes === 1 ? '1 minute ago' : `${diffInMinutes} minutes ago`
  }

  // Less than a day
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`
  }

  // Less than a week
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays === 1) {
    return 'Yesterday'
  }
  if (diffInDays < 7) {
    return `${diffInDays} days ago`
  }

  // Less than a month
  if (diffInDays < 30) {
    const diffInWeeks = Math.floor(diffInDays / 7)
    return diffInWeeks === 1 ? '1 week ago' : `${diffInWeeks} weeks ago`
  }

  // Format as date for older messages
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric'
  }

  // Add year if it's not the current year
  if (date.getFullYear() !== now.getFullYear()) {
    options.year = 'numeric'
  }

  return date.toLocaleDateString(undefined, options)
}
