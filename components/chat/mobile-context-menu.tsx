'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileContextMenuProps {
  isOpen: boolean
  position: { x: number; y: number }
  onClose: () => void
  onUnsend: () => void
  isUnsending: boolean
  children?: React.ReactNode
}

export const MobileContextMenu = ({
  isOpen,
  position,
  onClose,
  onUnsend,
  isUnsending,
  children
}: MobileContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Calculate menu position to ensure it stays within viewport
  const menuWidth = 200
  const menuHeight = 60
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  }

  let adjustedX = position.x - menuWidth / 2
  let adjustedY = position.y - menuHeight - 10

  // Adjust horizontal position if menu would go off-screen
  if (adjustedX < 10) adjustedX = 10
  if (adjustedX + menuWidth > viewport.width - 10) {
    adjustedX = viewport.width - menuWidth - 10
  }

  // Adjust vertical position if menu would go off-screen
  if (adjustedY < 10) {
    adjustedY = position.y + 10
  }

  return createPortal(
    <>
      {/* Menu */}
      <div
        ref={menuRef}
        className="fixed z-50 bg-background border border-border rounded-lg shadow-lg py-1 min-w-[200px]"
        style={{
          left: adjustedX,
          top: adjustedY,
          touchAction: 'none'
        }}
      >
        <button
          onClick={() => {
            onUnsend()
            onClose()
          }}
          disabled={isUnsending}
          className={cn(
            'w-full px-4 py-3 text-left text-sm hover:bg-muted transition-colors flex items-center gap-3',
            'focus:outline-none focus:bg-muted',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isUnsending ? (
            <>
              <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
              <span>Unsending...</span>
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4 text-red-500" />
              <span className="text-red-500">Unsend</span>
            </>
          )}
        </button>

        {children}
      </div>
    </>,
    document.body
  )
}
