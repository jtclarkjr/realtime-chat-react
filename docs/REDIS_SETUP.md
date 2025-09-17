# Redis-Based Message Delivery Tracking

This implementation adds Redis-based message delivery tracking to handle missed
real-time messages in your chat application.

## The Problem Solved

When users are offline/disconnected, they miss real-time messages sent while
they were away. These messages exist in the database but were never delivered
via WebSocket.

## Solution Overview

The solution uses Redis to track message delivery status and ensures reliable
message delivery:

1. **Track Message Delivery Status**: Redis stores what each user has received
2. **Detect Missed Messages**: When users rejoin, compare their last received
   message with latest messages
3. **Reliable Persistence**: Database remains the source of truth for all
   messages
4. **Lightweight Caching**: Redis only tracks delivery state, not full message
   content

## Setup Instructions

### 1. Database Setup

Run the SQL schema in your Supabase project:

```sql
-- Run the contents of database/schema.sql in Supabase SQL editor
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required environment variables:

- `REDIS_URL`: Your Redis connection string
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

### 3. Redis Setup

#### Local Development

Install and start Redis locally:

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis-server
```

#### Production

Use a managed Redis service like:

- Redis Cloud
- AWS ElastiCache
- Upstash
- Railway Redis

### 4. Update Your Chat Implementation

Update your chat components to include `userId`:

```tsx
<RealtimeChat roomId="roomId" username="user-name" userId="unique-user-id" />
```

## How It Works

### Message Flow

1. **Sending Messages**:
   - Message saved to Supabase database
   - Latest message ID tracked in Redis
   - Real-time broadcast via Supabase Realtime
   - Online users mark message as received

2. **User Rejoins**:
   - Check Redis for user's last received message ID
   - Query database for messages after that ID
   - Send missed messages to user
   - Mark user as caught up in Redis

3. **Real-time Messages**:
   - Received via Supabase Realtime subscription
   - Automatically marked as received in Redis
   - Added to local message state

### Redis Keys

```
user:{userId}:room:{roomId}:last_received → messageId
room:{roomId}:latest_message_id → messageId
```

### API Endpoints

- `POST /api/messages/send` - Send and persist messages
- `POST /api/messages/mark-received` - Mark message as received
- `GET /api/rooms/{roomId}/rejoin` - Get missed messages for user

## Benefits

**Reliable Message Delivery**: Users never miss messages  
**Lightweight Redis Usage**: Only stores delivery tracking, not content  
**Fast Reconnection**: Quick catch-up queries when users rejoin  
**Database as Source of Truth**: Messages safely persisted regardless of Redis
state  
**Scalable**: Redis tracks pointers, database stores content

## Testing

1. Start two browser instances/tabs
2. Send messages from one while the other is "offline" (close tab)
3. Reopen the closed tab
4. Verify missed messages are retrieved and displayed

## Monitoring

Key metrics to monitor:

- Redis memory usage (should be minimal)
- Message delivery latency
- Database query performance for missed messages
- Failed message deliveries

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   - Check `REDIS_URL` environment variable
   - Ensure Redis server is running
   - Check network connectivity

2. **Messages Not Persisting**
   - Verify Supabase configuration
   - Check database table exists and has correct schema
   - Verify RLS policies allow inserts

3. **Missed Messages Not Loading**
   - Check API routes are accessible
   - Verify Redis tracking keys exist
   - Check browser network tab for failed requests

4. **Duplicate Messages**
   - Normal during development/reconnections
   - Deduplication happens in the client based on message ID
