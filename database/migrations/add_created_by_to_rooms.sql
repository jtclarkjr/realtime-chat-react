-- Add created_by column to rooms table
-- This links each room to the user who created it

ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for efficient querying of rooms by creator
CREATE INDEX IF NOT EXISTS idx_rooms_created_by 
ON rooms(created_by);

-- Add comment to explain the column
COMMENT ON COLUMN rooms.created_by IS 'The user ID of the user who created this room. References auth.users(id).';

-- Update the existing policy or create new ones for room creation
-- Allow authenticated users to create rooms
DROP POLICY IF EXISTS "Allow authenticated users to insert rooms" ON rooms;
CREATE POLICY "Allow authenticated users to insert rooms" 
ON rooms FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = created_by);

-- Allow users to update their own rooms (optional - uncomment if needed)
-- CREATE POLICY "Allow users to update their own rooms" 
-- ON rooms FOR UPDATE 
-- TO authenticated 
-- USING (auth.uid() = created_by);

-- Note: Existing rooms will have created_by = NULL since we don't know who created them
-- You may want to update these manually or set a default creator if needed