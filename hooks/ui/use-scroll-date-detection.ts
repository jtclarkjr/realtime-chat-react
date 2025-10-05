import { useState, useEffect, useCallback } from 'react'
import type { ChatMessage } from '@/lib/types/database'

interface UseScrollDateDetectionProps {
  messages: ChatMessage[]
}

interface UseScrollDateDetectionReturn {
  scrollDate: string | null
  isScrolling: boolean
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void
}

export const useScrollDateDetection = ({
  messages
}: UseScrollDateDetectionProps): UseScrollDateDetectionReturn => {
  const [scrollDate, setScrollDate] = useState<string | null>(null)
  const [isScrolling, setIsScrolling] = useState(false)
  const [scrollTimeout, setScrollTimeout] = useState<NodeJS.Timeout | null>(
    null
  )

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const container = e.currentTarget

      // Show scroll indicator when scrolling
      setIsScrolling(true)

      // Clear existing timeout
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }

      // Hide indicator after scroll stops
      const newTimeout = setTimeout(() => {
        setIsScrolling(false)
      }, 1000)
      setScrollTimeout(newTimeout)

      // Find the bottommost visible message in the viewport
      const containerRect = container.getBoundingClientRect()
      const containerBottom = containerRect.bottom

      // Find message elements and determine which date to show
      const messageElements = container.querySelectorAll('[data-message-id]')
      let currentDate: string | null = null
      let bottomMostMessage: { element: HTMLElement; bottom: number } | null =
        null

      for (let i = 0; i < messageElements.length; i++) {
        const element = messageElements[i] as HTMLElement
        const rect = element.getBoundingClientRect()

        // Check if message is visible in the viewport
        const isVisible =
          rect.top < containerBottom && rect.bottom > containerRect.top

        if (isVisible) {
          // Track the message closest to the bottom of the viewport
          if (!bottomMostMessage || rect.bottom > bottomMostMessage.bottom) {
            bottomMostMessage = { element, bottom: rect.bottom }
          }
        }
      }

      // Get the date from the bottommost visible message
      if (bottomMostMessage) {
        const messageId =
          bottomMostMessage.element.getAttribute('data-message-id')
        const message = messages.find((m) => m.id === messageId)
        if (message) {
          currentDate = message.createdAt
        }
      }

      setScrollDate(currentDate)
    },
    [messages, scrollTimeout]
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
    }
  }, [scrollTimeout])

  return {
    scrollDate,
    isScrolling,
    handleScroll
  }
}
