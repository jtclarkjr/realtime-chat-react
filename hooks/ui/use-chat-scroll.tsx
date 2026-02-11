import { useCallback, useLayoutEffect, useRef } from 'react'

export function useChatScroll() {
  const containerRef = useRef<HTMLDivElement>(null)
  const hasInitiallyScrolled = useRef(false)

  // Instantly position at bottom when component first mounts/renders
  useLayoutEffect(() => {
    if (!containerRef.current || hasInitiallyScrolled.current) return

    const container = containerRef.current
    // Set scrollTop directly for instant positioning without animation
    container.scrollTop = container.scrollHeight
    hasInitiallyScrolled.current = true
  }, [])

  const scrollToBottom = useCallback((): void => {
    if (!containerRef.current) return

    const container = containerRef.current
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    })
  }, [])

  const scrollToBottomInstant = useCallback((): void => {
    if (!containerRef.current) return

    const container = containerRef.current
    // Set scrollTop directly for instant positioning
    container.scrollTop = container.scrollHeight
  }, [])

  return {
    containerRef,
    scrollToBottom,
    scrollToBottomInstant
  }
}
