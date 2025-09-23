'use client'

import { Wifi, WifiOff, Clock, AlertTriangle } from 'lucide-react'

interface QueueStatus {
  pending: number
  failed: number
}

interface ConnectionStatusBarProps {
  isConnected: boolean
  queueStatus: QueueStatus
  onClearFailedMessages: () => void
}

export const ConnectionStatusBar = ({
  isConnected,
  queueStatus,
  onClearFailedMessages
}: ConnectionStatusBarProps) => {
  if (isConnected) return null

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border text-xs">
      <div className="flex items-center gap-2">
        {isConnected ? (
          <Wifi className="h-3 w-3 text-green-500" />
        ) : (
          <WifiOff className="h-3 w-3 text-orange-500" />
        )}
        <span className={isConnected ? 'text-green-600' : 'text-orange-600'}>
          {isConnected ? 'Connected' : 'Offline'}
        </span>
      </div>
      {(queueStatus.pending > 0 || queueStatus.failed > 0) && (
        <div className="flex items-center gap-3">
          {queueStatus.pending > 0 && (
            <div className="flex items-center gap-1 text-orange-600">
              <Clock className="h-3 w-3" />
              <span>{queueStatus.pending} queued</span>
            </div>
          )}
          {queueStatus.failed > 0 && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertTriangle className="h-3 w-3" />
              <span>{queueStatus.failed} failed</span>
              <button
                onClick={onClearFailedMessages}
                className="ml-1 px-1 py-0.5 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
