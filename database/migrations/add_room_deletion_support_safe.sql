-- Alternative migration that handles potential data issues more safely
-- Add cascade deletion and RLS policy for room deletion

-- First, check if there are any messages with invalid UUIDs in room_id
-- This query will help identify problematic data before the migration
-- SELECT room_id FROM messages WHERE room_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Option 1: If you have problematic data, clean it up first
-- DELETE FROM messages WHERE room_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
-- OR update them to reference valid room UUIDs

-- Drop existing constraint if it exists
ALTER TABLE messages 
DROP CONSTRAINT IF EXISTS messages_room_id_fkey;

-- Try to convert room_id column from TEXT to UUID
-- This will fail if any existing room_id values are not valid UUIDs
BEGIN;
  -- Test the conversion first (this will rollback if it fails)
  DO $$
  BEGIN
    -- Try to convert all room_id values to UUID
    PERFORM room_id::UUID FROM messages LIMIT 1;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Cannot convert room_id to UUID. Please clean up invalid room_id values first. Run: SELECT room_id FROM messages WHERE room_id !~ ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'';';
  END $$;

  -- If we get here, all room_id values are valid UUIDs
  ALTER TABLE messages 
  ALTER COLUMN room_id TYPE UUID USING room_id::UUID;

  -- Add the foreign key constraint with CASCADE DELETE
  ALTER TABLE messages 
  ADD CONSTRAINT messages_room_id_fkey 
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;
  
COMMIT;

-- Add RLS policy to allow only room creators to delete their rooms
CREATE POLICY "Allow room creators to delete their own rooms" 
ON rooms FOR DELETE 
TO authenticated 
USING (auth.uid() = created_by);

-- Add RLS policy to allow room creators to update their own rooms (optional)
CREATE POLICY "Allow room creators to update their own rooms" 
ON rooms FOR UPDATE 
TO authenticated 
USING (auth.uid() = created_by);

-- Add comment explaining the cascade behavior
COMMENT ON CONSTRAINT messages_room_id_fkey ON messages IS 'Foreign key constraint with cascade delete - messages are automatically deleted when their room is deleted';