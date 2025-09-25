'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

interface NewMessagesBadgeProps {
  isVisible: boolean
  newMessageCount: number
  onScrollToBottom: () => void
}

export const NewMessagesBadge = ({
  isVisible,
  newMessageCount,
  onScrollToBottom
}: NewMessagesBadgeProps) => {
  return (
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none">
      <AnimatePresence>
        {isVisible && newMessageCount > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{
              duration: 0.2,
              ease: 'easeOut'
            }}
            onClick={onScrollToBottom}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-full border border-primary/20 shadow-lg hover:bg-primary/90 transition-colors duration-200 cursor-pointer"
          >
            <span>
              {newMessageCount === 1
                ? 'New message'
                : `${newMessageCount} new messages`}
            </span>
            <ChevronDown className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
