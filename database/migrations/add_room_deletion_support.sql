-- Add cascade deletion and RLS policy for room deletion
-- Messages should be deleted when their room is deleted

-- Since messages table uses TEXT for room_id and rooms table uses UUID for id,
-- we need to convert the room_id column to UUID type to create the foreign key

-- First, drop existing constraint if it exists
ALTER TABLE messages 
DROP CONSTRAINT IF EXISTS messages_room_id_fkey;

-- Convert room_id column from TEXT to UUID
-- This will work if all existing room_id values are valid UUIDs
ALTER TABLE messages 
ALTER COLUMN room_id TYPE UUID USING room_id::UUID;

-- Add the foreign key constraint with CASCADE DELETE
-- This ensures messages are automatically deleted when a room is deleted
ALTER TABLE messages 
ADD CONSTRAINT messages_room_id_fkey 
FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

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
