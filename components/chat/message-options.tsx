'use client'

import { FormEvent, useCallback, useMemo, useState } from 'react'
import { Bot, Sparkles, Trash2 } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MessageOptionsProps {
  messageId: string
  messageContent: string
  onUnsend?: (messageId: string) => void
  onReplyWithAI?: () => Promise<void>
  onReplyWithAICustom?: (customPrompt: string) => Promise<void>
  isUnsending: boolean
  canUnsend: boolean
  canReplyWithAI?: boolean
  isReplyingWithAI?: boolean
  children: React.ReactNode
}

export const MessageOptions = ({
  messageId,
  messageContent,
  onUnsend,
  onReplyWithAI,
  onReplyWithAICustom,
  isUnsending,
  canUnsend,
  canReplyWithAI = false,
  isReplyingWithAI = false,
  children
}: MessageOptionsProps) => {
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const handleUnsend = useCallback(() => {
    onUnsend?.(messageId)
  }, [messageId, onUnsend])

  const handleAIReply = useCallback(async () => {
    if (!onReplyWithAI || isReplyingWithAI) return
    try {
      await onReplyWithAI()
    } catch (error) {
      console.error('Failed to generate AI reply:', error)
    }
  }, [onReplyWithAI, isReplyingWithAI])

  const promptPreview = useMemo(() => {
    const trimmed = messageContent.trim()
    return trimmed.length > 160 ? `${trimmed.slice(0, 160)}...` : trimmed
  }, [messageContent])

  const handleCustomPromptSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!onReplyWithAICustom || isReplyingWithAI) return

      const trimmedPrompt = customPrompt.trim()
      if (!trimmedPrompt) return

      await onReplyWithAICustom(trimmedPrompt)
      setCustomPrompt('')
      setIsPromptDialogOpen(false)
    },
    [customPrompt, isReplyingWithAI, onReplyWithAICustom]
  )

  const hasAnyAction = canUnsend || canReplyWithAI

  if (!hasAnyAction) {
    return <div>{children}</div>
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div>{children}</div>
        </ContextMenuTrigger>

        <ContextMenuContent>
          {canReplyWithAI && (
            <>
              <ContextMenuItem
                disabled={isReplyingWithAI}
                onSelect={handleAIReply}
              >
                {isReplyingWithAI ? (
                  <>
                    <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4" />
                    <span>Respond with AI</span>
                  </>
                )}
              </ContextMenuItem>
              <ContextMenuItem
                disabled={isReplyingWithAI}
                onSelect={() => setIsPromptDialogOpen(true)}
              >
                <Sparkles className="w-4 h-4" />
                <span>Respond with AI (Custom Prompt...)</span>
              </ContextMenuItem>
            </>
          )}

          {canReplyWithAI && canUnsend && <ContextMenuSeparator />}

          {canUnsend && (
            <ContextMenuItem
              variant="destructive"
              disabled={isUnsending}
              onSelect={handleUnsend}
            >
              {isUnsending ? (
                <>
                  <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                  <span>Unsending...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Unsend</span>
                </>
              )}
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>

      <Dialog open={isPromptDialogOpen} onOpenChange={setIsPromptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond with AI</DialogTitle>
            <DialogDescription>
              Add custom instructions for how AI should reply to this message.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Replying to
              </p>
              <p className="text-sm whitespace-pre-wrap break-words">
                {promptPreview}
              </p>
            </div>

            <form className="space-y-3" onSubmit={handleCustomPromptSubmit}>
              <Textarea
                value={customPrompt}
                onChange={(event) => setCustomPrompt(event.target.value)}
                placeholder="Example: Reply politely in 1 sentence."
                className="min-h-28"
                maxLength={1000}
                disabled={isReplyingWithAI}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPromptDialogOpen(false)}
                  disabled={isReplyingWithAI}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!customPrompt.trim() || isReplyingWithAI}
                  className={cn(isReplyingWithAI && 'gap-2')}
                >
                  {isReplyingWithAI ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    'Generate Reply'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
