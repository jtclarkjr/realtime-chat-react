-- Add privacy column for AI messages
-- This allows AI responses to be either public (visible to all) or private (visible only to requester)

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false NOT NULL;

-- Add index for efficient querying of private messages
CREATE INDEX IF NOT EXISTS idx_messages_private_user 
ON messages(is_private, user_id) 
WHERE is_private = true;

-- Add comment to explain the column
COMMENT ON COLUMN messages.is_private IS 'Whether this message is private (only visible to the user who requested it). Primarily used for private AI responses.';

-- Note: Existing messages will automatically have is_private = false (default)
-- This means all existing messages remain visible to everyone (backward compatible)
