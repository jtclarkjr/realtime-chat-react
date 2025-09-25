import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Check if two dates are on different days
 */
export function isDifferentDay(date1: string, date2: string): boolean {
  const d1 = new Date(date1)
  const d2 = new Date(date2)

  return (
    d1.getFullYear() !== d2.getFullYear() ||
    d1.getMonth() !== d2.getMonth() ||
    d1.getDate() !== d2.getDate()
  )
}

/**
 * Check if a date separator should be shown between two messages
 */
export function shouldShowDateSeparator(
  currentMessage: { createdAt: string },
  previousMessage: { createdAt: string } | null
): boolean {
  if (!previousMessage) {
    return true // Always show separator for first message
  }

  return isDifferentDay(currentMessage.createdAt, previousMessage.createdAt)
}
