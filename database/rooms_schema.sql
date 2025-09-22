-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default rooms
INSERT INTO rooms (name, description) 
VALUES ('general', 'General chat room for everyone')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS (Row Level Security)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all users to read rooms
CREATE POLICY "Allow all users to read rooms" 
ON rooms FOR SELECT 
TO public 
USING (true);

-- Create policy to allow authenticated users to insert rooms
CREATE POLICY "Allow authenticated users to insert rooms" 
ON rooms FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = created_by);
