-- Create messages table for chat with proper schema using Supabase auth.users
-- Run this SQL Query to create the table in your DB

CREATE TABLE IF NOT EXISTS messages (
  id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
  room_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_ai_message BOOLEAN DEFAULT false,
  is_private BOOLEAN DEFAULT false,
  requester_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  has_ai_response BOOLEAN DEFAULT FALSE
);

-- Create index for faster queries by room and time
CREATE INDEX IF NOT EXISTS messages_room_created_idx 
ON messages(room_id, created_at DESC);

-- Create index for user queries
CREATE INDEX IF NOT EXISTS messages_user_room_idx 
ON messages(user_id, room_id, created_at DESC);

-- Create index for privacy queries
CREATE INDEX IF NOT EXISTS idx_messages_privacy_room
ON messages(is_private, room_id, created_at DESC);

-- Create index for privacy filter
CREATE INDEX IF NOT EXISTS idx_messages_privacy_filter
ON messages(room_id, is_private, user_id, created_at DESC);

-- Create index for private user messages
CREATE INDEX IF NOT EXISTS idx_messages_private_user
ON messages(is_private, user_id)
WHERE is_private = true;

-- Create index for private messages by requester (for AI responses)
CREATE INDEX IF NOT EXISTS idx_messages_private_requester
ON messages(is_private, requester_id, room_id, created_at DESC)
WHERE is_private = true;

-- Create index for filtering out deleted messages (most common query)
CREATE INDEX IF NOT EXISTS idx_messages_active
ON messages(room_id, deleted_at, created_at DESC)
WHERE deleted_at IS NULL;

-- Create index for deleted messages queries (for admin/recovery purposes)
CREATE INDEX IF NOT EXISTS idx_messages_deleted
ON messages(deleted_at, deleted_by, room_id)
WHERE deleted_at IS NOT NULL;

-- Create index for user's deleted messages (for audit/recovery)
CREATE INDEX IF NOT EXISTS idx_messages_deleted_by_user
ON messages(deleted_by, room_id, deleted_at DESC)
WHERE deleted_at IS NOT NULL;

-- Create index for messages with AI responses
CREATE INDEX IF NOT EXISTS idx_messages_ai_response
ON messages(has_ai_response, room_id, created_at DESC)
WHERE has_ai_response = TRUE;

-- Add comment to explain the requester_id column
COMMENT ON COLUMN messages.requester_id IS 'ID of the user who requested this message. Used for private AI responses to identify who can see the message. For regular messages, this is typically NULL or same as user_id.';

-- Add comments for soft delete columns
COMMENT ON COLUMN messages.deleted_at IS 'Timestamp when the message was soft-deleted (unsent). NULL means message is active.';
COMMENT ON COLUMN messages.deleted_by IS 'ID of the user who deleted/unsent the message. Must equal user_id for user-initiated deletes.';
COMMENT ON COLUMN messages.has_ai_response IS 'TRUE if this message triggered an AI response. Such messages cannot be unsent to maintain conversation context.';

-- Add database constraint to ensure deleted_by equals user_id (security layer)
ALTER TABLE messages ADD CONSTRAINT check_deleted_by_equals_user_id
  CHECK ((deleted_at IS NULL AND deleted_by IS NULL) OR 
         (deleted_at IS NOT NULL AND deleted_by = user_id));

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users with proper security
-- Updated to handle soft deletes with proper security
CREATE POLICY "Allow authenticated users to read active messages" ON messages
  FOR SELECT 
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Allow users to read their own deleted messages" ON messages
  FOR SELECT 
  TO authenticated
  USING (deleted_at IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Allow authenticated users to insert messages" ON messages
  FOR INSERT 
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow users to soft delete their own messages only
-- Users cannot unsend messages that triggered AI responses to maintain conversation context
CREATE POLICY "Allow users to soft delete their own messages" ON messages
  FOR UPDATE 
  TO authenticated
  USING (
    user_id = auth.uid() AND 
    deleted_at IS NULL AND 
    has_ai_response = FALSE
  )
  WITH CHECK (
    user_id = auth.uid() AND 
    deleted_at IS NOT NULL AND 
    deleted_by = auth.uid() AND 
    has_ai_response = FALSE
  );

-- Database trigger to automatically set deleted_at timestamp
-- This ensures consistent timestamps set at the database level
CREATE OR REPLACE FUNCTION set_deleted_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    -- If deleted_at is being set to a non-null value and it was previously null
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
        NEW.deleted_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that runs before update on the messages table
CREATE TRIGGER auto_set_deleted_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION set_deleted_at_timestamp();

-- Add comment explaining the trigger function
COMMENT ON FUNCTION set_deleted_at_timestamp() IS 
'Automatically sets deleted_at to current timestamp when a message is being soft deleted (when deleted_at changes from NULL to any value)';


-- Create helpful function to get user display name
-- SECURITY DEFINER allows the function to access auth.users with elevated privileges
CREATE OR REPLACE FUNCTION get_user_display_name(user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      raw_user_meta_data->>'display_name',
      raw_user_meta_data->>'full_name',
      email,
      'Anonymous User'
    )
    FROM auth.users 
    WHERE id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users and service role
GRANT EXECUTE ON FUNCTION get_user_display_name(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_display_name(UUID) TO service_role;

-- Add helpful comments
COMMENT ON FUNCTION get_user_display_name(UUID) IS 
'Helper function to get a user display name from auth.users, falling back to email or "Anonymous User" if not found. Uses SECURITY DEFINER for auth.users access.';
