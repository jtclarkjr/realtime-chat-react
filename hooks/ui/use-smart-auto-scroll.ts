import {
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useState
} from 'react'
import type { ChatMessage } from '@/lib/types/database'

interface ScrollAnchor {
  messageId: string
  offsetWithinViewport: number
}

const roomScrollAnchors = new Map<string, ScrollAnchor>()

interface UseSmartAutoScrollProps {
  roomId: string
  messages: ChatMessage[]
  containerRef: React.RefObject<HTMLDivElement | null>
  scrollToBottom: () => void
  scrollToBottomInstant?: () => void
}

export const useSmartAutoScroll = ({
  roomId,
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

  useLayoutEffect(() => {
    previousMessageCountRef.current = 0
    previousStreamingCursorRef.current = ''
    isAutoScrollingRef.current = false
  }, [roomId])

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
    if (previousMessageCountRef.current === 0) {
      return
    }

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
  }, [roomId, messages.length, scrollToBottom, isNearBottom, userHasScrolledUp])

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
    roomId,
    messages,
    userHasScrolledUp,
    isNearBottom,
    scrollToBottom,
    scrollToBottomInstant
  ])

  useEffect(() => {
    const container = containerRef.current
    if (!container || messages.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting)
        if (visibleEntries.length === 0) return

        const lastVisible = visibleEntries.reduce((current, entry) => {
          if (!current) return entry
          return entry.boundingClientRect.top > current.boundingClientRect.top
            ? entry
            : current
        }, visibleEntries[0])

        const target = lastVisible.target as HTMLElement
        const messageId = target.dataset.messageId
        if (!messageId) return

        const rootTop = container.getBoundingClientRect().top
        roomScrollAnchors.set(roomId, {
          messageId,
          offsetWithinViewport: lastVisible.boundingClientRect.top - rootTop
        })
      },
      {
        root: container,
        threshold: [0.6]
      }
    )

    const messageElements =
      container.querySelectorAll<HTMLElement>('[data-message-id]')
    messageElements.forEach((element) => observer.observe(element))

    return () => {
      observer.disconnect()
    }
  }, [roomId, messages.length, containerRef])

  // Initialize scroll position when messages are first available.
  useLayoutEffect(() => {
    if (messages.length > 0 && previousMessageCountRef.current === 0) {
      const anchor = roomScrollAnchors.get(roomId)
      let restored = false

      if (anchor && containerRef.current) {
        const container = containerRef.current
        const anchoredElement = container.querySelector<HTMLElement>(
          `[data-message-id="${anchor.messageId}"]`
        )

        if (anchoredElement) {
          container.scrollTop = Math.max(
            anchoredElement.offsetTop - anchor.offsetWithinViewport,
            0
          )
          restored = true
        } else {
          const fallbackIndex = messages.findIndex(
            (message) =>
              message.id === anchor.messageId ||
              message.serverId === anchor.messageId
          )

          if (fallbackIndex >= 0) {
            container.scrollTop = Math.max(
              fallbackIndex * 72 - anchor.offsetWithinViewport,
              0
            )
            restored = true
          }
        }
      }

      if (restored) {
        previousMessageCountRef.current = messages.length
        const atBottom = isNearBottom()
        const restoredTimer = setTimeout(() => {
          setUserHasScrolledUp(!atBottom)
          setUnreadMessageCount(0)
        }, 0)
        return () => clearTimeout(restoredTimer)
      }

      const scroll = scrollToBottomInstant || scrollToBottom
      scroll()
      previousMessageCountRef.current = messages.length
      const initTimer = setTimeout(() => {
        setUserHasScrolledUp(false)
        setUnreadMessageCount(0)
      }, 0)
      return () => clearTimeout(initTimer)
    }
  }, [
    roomId,
    messages.length,
    messages,
    containerRef,
    scrollToBottom,
    scrollToBottomInstant,
    isNearBottom
  ])

  return {
    handleUserScroll,
    isNearBottom,
    userHasScrolledUp,
    unreadMessageCount,
    scrollToBottomAndClearUnread
  }
}
