import { useEffect, useRef, useCallback, useState } from 'react'
import type { ChatMessage } from '@/lib/types/database'

interface UseSmartAutoScrollProps {
  messages: ChatMessage[]
  containerRef: React.RefObject<HTMLDivElement | null>
  scrollToBottom: () => void
  scrollToBottomInstant?: () => void
}

export const useSmartAutoScroll = ({
  messages,
  containerRef,
  scrollToBottom,
  scrollToBottomInstant
}: UseSmartAutoScrollProps) => {
  const previousMessageCountRef = useRef(0)
  const previousStreamingCursorRef = useRef<string>('')
  const isAutoScrollingRef = useRef(false)
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false)
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)

  // Check if user is near bottom of the scroll container
  const isNearBottom = useCallback((): boolean => {
    if (!containerRef.current) return true

    const container = containerRef.current
    const threshold = 100 // pixels from bottom
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight

    return distanceFromBottom <= threshold
  }, [containerRef])

  // Handle scroll to detect user scrolling up
  const handleUserScroll = useCallback(() => {
    if (!containerRef.current || isAutoScrollingRef.current) return

    const isAtBottom = isNearBottom()
    setUserHasScrolledUp(!isAtBottom)

    // If user scrolled back to bottom, clear unread count
    if (isAtBottom) {
      setUnreadMessageCount(0)
    }
  }, [containerRef, isNearBottom])

  // Handle scroll to bottom from badge click
  const scrollToBottomAndClearUnread = useCallback(() => {
    isAutoScrollingRef.current = true
    scrollToBottom()
    setUnreadMessageCount(0)

    setTimeout(() => {
      isAutoScrollingRef.current = false
      setUserHasScrolledUp(false)
    }, 100)
  }, [scrollToBottom])

  // Auto-scroll when new messages arrive
  useEffect(() => {
    const currentMessageCount = messages.length
    const previousMessageCount = previousMessageCountRef.current
    const newMessageCount = currentMessageCount - previousMessageCount

    if (newMessageCount > 0) {
      // New messages arrived
      const shouldAutoScroll = !userHasScrolledUp || isNearBottom()

      if (shouldAutoScroll) {
        // Auto-scroll and reset unread count
        isAutoScrollingRef.current = true
        scrollToBottom()

        // Reset flag and state after scroll completes
        const resetTimer = setTimeout(() => {
          setUnreadMessageCount(0)
          isAutoScrollingRef.current = false
          setUserHasScrolledUp(false) // Reset since we're now at bottom
        }, 0)
        return () => clearTimeout(resetTimer)
      } else {
        // User is scrolled up, increment unread count
        setUnreadMessageCount((prev) => prev + newMessageCount)
      }
    }

    previousMessageCountRef.current = currentMessageCount
  }, [messages.length, scrollToBottom, isNearBottom, userHasScrolledUp])

  // Keep viewport pinned to bottom while a streaming message grows.
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage?.isStreaming) {
      previousStreamingCursorRef.current = ''
      return
    }

    const streamingCursor = `${lastMessage.id}:${lastMessage.content.length}`
    const hasProgressed = streamingCursor !== previousStreamingCursorRef.current
    previousStreamingCursorRef.current = streamingCursor

    if (!hasProgressed) return

    const shouldAutoScroll = !userHasScrolledUp || isNearBottom()
    if (!shouldAutoScroll) return

    const scroll = scrollToBottomInstant || scrollToBottom
    const frame = requestAnimationFrame(() => {
      scroll()
    })

    return () => cancelAnimationFrame(frame)
  }, [
    messages,
    userHasScrolledUp,
    isNearBottom,
    scrollToBottom,
    scrollToBottomInstant
  ])

  // Reset scroll state when component mounts or messages are initially loaded
  useEffect(() => {
    if (messages.length > 0 && previousMessageCountRef.current === 0) {
      // Initial load - use instant scroll
      const scroll = scrollToBottomInstant || scrollToBottom
      const initTimer = setTimeout(() => {
        scroll()
        previousMessageCountRef.current = messages.length
        setUserHasScrolledUp(false)
        setUnreadMessageCount(0)
      }, 0)
      return () => clearTimeout(initTimer)
    }
  }, [messages.length, scrollToBottom, scrollToBottomInstant])

  return {
    handleUserScroll,
    isNearBottom,
    userHasScrolledUp,
    unreadMessageCount,
    scrollToBottomAndClearUnread
  }
}
