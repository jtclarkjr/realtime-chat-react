-- Create messages table for chat with proper schema
-- Run this SQL in your Supabase Dashboard -> SQL Editor

CREATE TABLE IF NOT EXISTS messages (
  id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries by room and time
CREATE INDEX IF NOT EXISTS messages_room_created_idx 
ON messages(room_id, created_at DESC);

-- Create index for user queries
CREATE INDEX IF NOT EXISTS messages_user_room_idx 
ON messages(user_id, room_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all users to read and insert messages
-- (In production, you'd want more restrictive policies)
CREATE POLICY "Allow all users to read messages" ON messages
  FOR SELECT USING (true);

CREATE POLICY "Allow all users to insert messages" ON messages
  FOR INSERT WITH CHECK (true);