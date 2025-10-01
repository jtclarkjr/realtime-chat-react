'use client'

import { useCallback, useRef, useState, useEffect } from 'react'

interface UseContextMenuProps {
  onContextMenu: (x: number, y: number) => void
  longPressDelay?: number
}

interface UseContextMenuReturn {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
  onContextMenu: (e: React.MouseEvent) => void
  isLongPressing: boolean
}

export function useContextMenu({
  onContextMenu,
  longPressDelay = 500
}: UseContextMenuProps): UseContextMenuReturn {
  const [isLongPressing, setIsLongPressing] = useState(false)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const touchStartPos = useRef<{ x: number; y: number } | null>(null)
  const hasMoved = useRef(false)

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    setIsLongPressing(false)
  }, [])

  useEffect(() => {
    return clearLongPressTimer
  }, [clearLongPressTimer])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0]
      touchStartPos.current = { x: touch.clientX, y: touch.clientY }
      hasMoved.current = false
      setIsLongPressing(true)

      longPressTimer.current = setTimeout(() => {
        if (!hasMoved.current && touchStartPos.current) {
          e.preventDefault()
          onContextMenu(touchStartPos.current.x, touchStartPos.current.y)
        }
        setIsLongPressing(false)
      }, longPressDelay)
    },
    [onContextMenu, longPressDelay]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartPos.current) return

      const touch = e.touches[0]
      const deltaX = Math.abs(touch.clientX - touchStartPos.current.x)
      const deltaY = Math.abs(touch.clientY - touchStartPos.current.y)

      // If the touch has moved more than 10px, cancel the long press
      if (deltaX > 10 || deltaY > 10) {
        hasMoved.current = true
        clearLongPressTimer()
      }
    },
    [clearLongPressTimer]
  )

  const handleTouchEnd = useCallback(() => {
    clearLongPressTimer()
    touchStartPos.current = null
    hasMoved.current = false
  }, [clearLongPressTimer])

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      onContextMenu(e.clientX, e.clientY)
    },
    [onContextMenu]
  )

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onContextMenu: handleContextMenu,
    isLongPressing
  }
}
