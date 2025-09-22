-- Diagnostic queries to run before the room deletion migration
-- These will help identify any data compatibility issues

-- 1. Check the current column types
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('messages', 'rooms') 
    AND column_name IN ('id', 'room_id')
ORDER BY table_name, column_name;

-- 2. Check if all room_id values in messages are valid UUIDs
SELECT 
    COUNT(*) as total_messages,
    COUNT(CASE WHEN room_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 END) as valid_uuid_messages,
    COUNT(CASE WHEN room_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 END) as invalid_uuid_messages
FROM messages;

-- 3. Show examples of room_id values that are not valid UUIDs (if any)
SELECT DISTINCT room_id 
FROM messages 
WHERE room_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
LIMIT 10;

-- 4. Check room IDs in both tables to see the format difference
SELECT 'rooms' as table_name, id, 'UUID' as type FROM rooms LIMIT 5
UNION ALL
SELECT 'messages' as table_name, room_id as id, 'TEXT' as type FROM messages LIMIT 5;

-- 5. Check if there are any messages referencing non-existent rooms
SELECT DISTINCT m.room_id
FROM messages m
LEFT JOIN rooms r ON m.room_id = r.id::text
WHERE r.id IS NULL
LIMIT 10;