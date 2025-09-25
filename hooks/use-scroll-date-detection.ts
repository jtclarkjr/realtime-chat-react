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
  const [scrollTimeout, setScrollTimeout] = useState<NodeJS.Timeout | null>(null)

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget
    const scrollTop = container.scrollTop
    const containerHeight = container.clientHeight
    
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
    
    // Find the message that's currently in the middle of the viewport
    const middlePosition = scrollTop + containerHeight / 2
    
    // Find message elements and determine which date to show
    const messageElements = container.querySelectorAll('[data-message-id]')
    let currentDate: string | null = null
    
    for (let i = 0; i < messageElements.length; i++) {
      const element = messageElements[i] as HTMLElement
      const rect = element.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      const elementTop = rect.top - containerRect.top + scrollTop
      const elementBottom = elementTop + rect.height
      
      if (elementTop <= middlePosition && elementBottom >= middlePosition) {
        const messageId = element.getAttribute('data-message-id')
        const message = messages.find(m => m.id === messageId)
        if (message) {
          currentDate = message.createdAt
        }
        break
      }
    }
    
    setScrollDate(currentDate)
  }, [messages, scrollTimeout])
  
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