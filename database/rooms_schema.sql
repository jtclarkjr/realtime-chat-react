-- Create rooms table with proper Supabase auth integration
-- NOTE: This schema requires the public.is_anonymous_user() function to exist
-- Run schema.sql first to create the required helper functions

CREATE TABLE IF NOT EXISTS rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default rooms
INSERT INTO rooms (name, description) 
VALUES ('general', 'General chat room for everyone')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS (Row Level Security)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read rooms
CREATE POLICY "Allow authenticated users to read rooms" 
ON rooms FOR SELECT 
TO authenticated 
USING (true);

-- Create policy to allow non-anonymous users to insert rooms
CREATE POLICY "Allow non-anonymous users to insert rooms"
ON rooms FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by AND NOT public.is_anonymous_user());

-- Create policy to allow non-anonymous room creators to update their rooms
CREATE POLICY "Allow non-anonymous room creators to update their rooms"
ON rooms FOR UPDATE
TO authenticated
USING (auth.uid() = created_by AND NOT public.is_anonymous_user())
WITH CHECK (auth.uid() = created_by AND NOT public.is_anonymous_user());

-- Create policy to allow non-anonymous room creators to delete their rooms
CREATE POLICY "Allow non-anonymous room creators to delete their rooms"
ON rooms FOR DELETE
TO authenticated
USING (auth.uid() = created_by AND NOT public.is_anonymous_user());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rooms_created_by 
ON rooms(created_by);

CREATE INDEX IF NOT EXISTS idx_rooms_name 
ON rooms(name);

CREATE INDEX IF NOT EXISTS idx_rooms_created_at 
ON rooms(created_at DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rooms_updated_at
    BEFORE UPDATE ON rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE rooms IS 
'Chat rooms table. Each room can contain multiple messages and is owned by the user who created it.';

COMMENT ON COLUMN rooms.created_by IS 
'The user ID of the user who created this room. References auth.users(id).';

COMMENT ON COLUMN rooms.updated_at IS 
'Automatically updated whenever the room is modified via trigger.';

COMMENT ON FUNCTION update_updated_at_column() IS 
'Trigger function that automatically updates the updated_at column when a room is modified.';
