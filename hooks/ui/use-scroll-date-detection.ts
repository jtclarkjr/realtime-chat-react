import { useState, useEffect, useCallback, useRef } from 'react'

interface UseScrollDateDetectionReturn {
  scrollDate: string | null
  isScrolling: boolean
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void
}

export const useScrollDateDetection = (): UseScrollDateDetectionReturn => {
  const [scrollDate, setScrollDate] = useState<string | null>(null)
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const rafRef = useRef<number | null>(null)

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget

    // Show scroll indicator when scrolling
    setIsScrolling(true)

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    // Hide indicator after scroll stops
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false)
    }, 1000)

    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null

      // Find the bottommost visible message in the viewport
      const containerRect = container.getBoundingClientRect()
      const containerBottom = containerRect.bottom
      const messageElements =
        container.querySelectorAll<HTMLElement>('[data-message-id]')
      let currentDate: string | null = null

      for (let i = messageElements.length - 1; i >= 0; i -= 1) {
        const element = messageElements[i]
        const rect = element.getBoundingClientRect()
        const isVisible =
          rect.top < containerBottom && rect.bottom > containerRect.top

        if (isVisible) {
          currentDate = element.getAttribute('data-message-date')
          break
        }
      }

      setScrollDate(currentDate)
    })
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  return {
    scrollDate,
    isScrolling,
    handleScroll
  }
}
