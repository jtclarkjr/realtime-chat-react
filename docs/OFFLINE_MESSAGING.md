# Offline Messaging System Design

## Overview

This document describes the offline messaging system in the realtime chat
application. The system ensures that messages sent to offline users are reliably
stored and delivered when those users reconnect.

## Architecture

The offline messaging system uses a **hybrid storage approach**:

- **PostgreSQL (Supabase)**: Permanent storage and source of truth for all
  messages
- **Redis**: Lightweight message tracking with delivery pointers
- **Supabase Realtime**: WebSocket-based real-time message delivery for online
  users

## System Components

### 1. Message Storage

All messages are persisted in the PostgreSQL `messages` table:

```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  room_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ...
);
```

### 2. Message Tracking (Redis)

Redis stores lightweight pointers to track message delivery:

```
user:{userId}:room:{roomId}:last_received → messageId (TTL: 30 days)
room:{roomId}:latest_message_id → messageId
```

**Key Points:**

- Only stores message IDs, not full content
- 30-day TTL prevents indefinite growth
- Can be rebuilt from database if lost

### 3. Presence Detection

**Client-Side Network Detection:**

- Browser Navigator API (`navigator.onLine`)
- Network event listeners (`online`, `offline`)
- Tab visibility monitoring

**WebSocket Connection Status:**

- Supabase Realtime channel subscription
- Heartbeat every 30 seconds
- Automatic reconnection on failures

## UML Sequence Diagrams

### Flow 1: Sending Message to Offline User

```mermaid
sequenceDiagram
    participant UserA as User A (Sender)
    participant API as API Server
    participant ChatService as Chat Service
    participant DB as PostgreSQL
    participant Redis as Redis Cache
    participant Realtime as Supabase Realtime
    participant UserB as User B (Offline)
    participant UserC as User C (Online)

    UserA->>API: POST /api/messages/send
    API->>ChatService: sendMessage(request)

    ChatService->>DB: INSERT INTO messages
    DB-->>ChatService: message {id, created_at, ...}

    ChatService->>Redis: trackLatestMessage(roomId, messageId)
    Redis-->>ChatService: OK

    ChatService-->>API: message
    API-->>UserA: {success: true, message}

    API->>Realtime: channel.send({event: 'message'})
    Realtime--xUserB: (not connected - fails silently)
    Realtime->>UserC: broadcast message

    UserC->>API: POST /api/messages/mark-received
    API->>Redis: SET user:C:room:X:last_received
    Redis-->>API: OK
```

### Flow 2: User Reconnecting and Receiving Missed Messages

```mermaid
sequenceDiagram
    participant Client as User B Client
    participant Network as Network Detector
    participant WS as WebSocket Manager
    participant API as API Server
    participant ChatService as Chat Service
    participant Redis as Redis Cache
    participant DB as PostgreSQL
    participant Realtime as Supabase Realtime

    Note over Client: User comes back online

    Client->>Network: useNetworkConnectivity()
    Network-->>Client: isOnline: true

    Client->>WS: useWebSocketConnection()
    WS->>Realtime: channel.subscribe()
    Realtime-->>WS: Status: SUBSCRIBED
    WS-->>Client: isConnected: true

    WS->>Realtime: channel.track({online: true})
    Note over Realtime: Updates presence for other users

    Client->>API: GET /api/rooms/{roomId}/rejoin
    API->>ChatService: getMissedMessages(userId, roomId)

    ChatService->>Redis: GET user:B:room:X:last_received
    Redis-->>ChatService: "message-123" or null

    alt Has last received message
        ChatService->>DB: SELECT created_at FROM messages<br/>WHERE id = 'message-123'
        DB-->>ChatService: timestamp

        ChatService->>DB: SELECT * FROM messages<br/>WHERE room_id = X<br/>AND created_at > timestamp<br/>ORDER BY created_at
        DB-->>ChatService: missedMessages[]
    else New user or 30+ days offline
        ChatService->>DB: SELECT * FROM messages<br/>WHERE room_id = X<br/>LIMIT 50
        DB-->>ChatService: recentMessages[]
    end

    ChatService->>Redis: markUserCaughtUp(userId, roomId)
    Redis-->>ChatService: OK

    ChatService-->>API: {messages, count}
    API-->>Client: missed messages response

    Client->>Client: Merge & deduplicate messages
    Note over Client: UI renders all messages

    Note over Client,Realtime: Ready for real-time updates
```

### Flow 3: Message Delivery State Machine

```mermaid
stateDiagram-v2
    [*] --> Composing: User types message

    Composing --> Sending: User sends
    Sending --> Persisted: DB insert success

    Persisted --> BroadcastAttempt: Trigger broadcast

    BroadcastAttempt --> DeliveredOnline: Recipient online
    BroadcastAttempt --> StoredForOffline: Recipient offline

    DeliveredOnline --> Acknowledged: Recipient marks received
    StoredForOffline --> QueuedInDB: Message waits in database

    QueuedInDB --> ReconnectDetected: Recipient comes online
    ReconnectDetected --> MissedMessagesFetch: API call /rejoin
    MissedMessagesFetch --> DeliveredOffline: Messages retrieved

    DeliveredOffline --> Acknowledged: Recipient marks received
    Acknowledged --> [*]
```

### Flow 4: Component Interaction Diagram

```mermaid
graph TB
    subgraph "Client Application"
        A[useRealtimeChat Hook]
        B[useNetworkConnectivity]
        C[useWebSocketConnection]
        D[useMissedMessages]
        E[useMessageMerging]
        F[ChatMessageList UI]
    end

    subgraph "API Layer"
        G[POST /api/messages/send]
        H[POST /api/messages/mark-received]
        I[GET /api/rooms/roomId/rejoin]
    end

    subgraph "Service Layer"
        J[ChatService]
        K[Message Tracking Redis]
    end

    subgraph "Data Layer"
        L[(PostgreSQL Database)]
        M[(Redis Cache)]
        N[Supabase Realtime]
    end

    A --> B
    A --> C
    A --> D
    A --> E
    E --> F

    B --> C
    C --> N

    D --> I
    A --> G
    A --> H

    G --> J
    H --> J
    I --> J

    J --> K
    K --> M
    J --> L
    J --> N

    N -.realtime broadcast.-> C
```

## Message Retrieval Logic

When a user reconnects, the system determines which messages to retrieve:

```mermaid
flowchart TD
    Start([User Reconnects]) --> CheckRedis{Check Redis for<br/>last_received_id}

    CheckRedis -->|Found| GetTimestamp[Get message timestamp<br/>from database]
    CheckRedis -->|Not Found| NewUser{New user or<br/>30+ days offline?}

    GetTimestamp --> QueryMissed[Query messages after<br/>that timestamp]
    QueryMissed --> ReturnMissed[Return missed messages]

    NewUser --> GetRecent[Get last 50 messages<br/>from database]
    GetRecent --> MarkCaught[Mark user caught up<br/>with latest message]
    MarkCaught --> ReturnRecent[Return recent messages]

    ReturnMissed --> UpdateRedis[Update Redis:<br/>user caught up]
    ReturnRecent --> End([Messages Delivered])
    UpdateRedis --> End
```

## Key Features

### 1. Automatic Message Persistence

- **All messages saved to database first**, regardless of recipient status
- Database serves as single source of truth
- Messages persist permanently (unless soft-deleted)

**Implementation:** `lib/services/chat-service.ts:60-100`

### 2. Redis-Based Delivery Tracking

- Tracks last received message ID per user per room
- Minimal memory footprint (IDs only, not full content)
- 30-day TTL for automatic cleanup
- Fallback to database queries if Redis data lost

**Implementation:** `lib/redis/message-tracking/index.ts`

### 3. Smart Missed Message Retrieval

- **Recent users**: Get messages since last received
- **New users**: Get last 50 messages for context
- **Long-absent users (30+ days)**: Reset to recent 50 messages

**Implementation:** `lib/services/chat-service.ts:151-323`

### 4. Client-Side Deduplication

- Messages deduplicated by ID
- Optimistic updates merged with confirmed messages
- Timestamp-based duplicate detection (within 5 seconds)

**Implementation:** `hooks/messages/use-message-merging.tsx`

### 5. Automatic Reconnection

- Network state changes trigger reconnection
- WebSocket errors trigger retry (3 second delay)
- Heartbeat every 30 seconds detects stale connections

**Implementation:** `hooks/connection/use-websocket-connection.tsx`

## Error Handling

### Network Failures

1. **Message Send Failure**
   - Client retries automatically (up to 3 attempts)
   - Shows retry UI to user
   - Stores failed messages locally for manual retry

2. **Reconnection Failure**
   - Exponential backoff retry strategy
   - Maximum retry limit prevents infinite loops
   - User notified of connection issues

### Data Consistency

1. **Redis Cache Miss**
   - Fallback to database query
   - Fetch last 50 messages as baseline
   - Rebuild Redis tracking

2. **Database Query Failure**
   - Return error to client
   - Client can retry or show cached messages
   - Logs error for monitoring

## Performance Characteristics

### Message Sending (Online Recipients)

- **Database Write**: ~10-50ms
- **Redis Update**: ~1-5ms
- **WebSocket Broadcast**: ~5-20ms
- **Total Latency**: ~20-100ms

### Missed Messages Retrieval

- **Redis Lookup**: ~1-5ms
- **Database Query**: ~20-100ms (depends on message count)
- **Message Transform**: ~5-10ms
- **Total Latency**: ~30-150ms for typical case (< 100 messages)

### Scalability Considerations

- **Redis**: Can handle millions of tracking entries
- **Database**: Indexed queries on `room_id` and `created_at`
- **WebSocket**: Supabase Realtime handles connection scaling
- **Pagination**: Limits message retrieval to prevent memory issues

## Security

### Row Level Security (RLS)

Database policies ensure users can only:

- Read messages from rooms they're members of
- Write messages to rooms they're authorized in
- Update their own delivery tracking

**Implementation:** `database/schema.sql`

### Authentication

- All API endpoints protected with `withAuth` middleware
- User ID extracted from authenticated session
- Cannot spoof other users' message tracking

## File Reference

| Component            | File Path                                       | Lines     |
| -------------------- | ----------------------------------------------- | --------- |
| Message Schema       | `database/schema.sql`                           | Full file |
| Send Message API     | `app/api/messages/send/route.ts`                | 35-56     |
| Rejoin API           | `app/api/rooms/[roomId]/rejoin/route.ts`        | Full file |
| Chat Service         | `lib/services/chat-service.ts`                  | 60-323    |
| Redis Tracking       | `lib/redis/message-tracking/index.ts`           | Full file |
| Network Detection    | `hooks/connection/use-network-connectivity.tsx` | Full file |
| WebSocket Connection | `hooks/connection/use-websocket-connection.tsx` | 40-208    |
| Missed Messages Hook | `hooks/messages/use-missed-messages.tsx`        | Full file |
| Realtime Chat Hook   | `hooks/chat/use-realtime-chat.tsx`              | Full file |
| Message Merging      | `hooks/messages/use-message-merging.tsx`        | Full file |

## Future Enhancements

1. **Push Notifications**: Notify offline users via push notifications
2. **Message Batching**: Batch multiple messages in a single retrieval
3. **Compression**: Compress large message payloads
4. **Read Receipts**: Track when messages are actually read vs. just received
5. **Delivery Analytics**: Track delivery rates and latency metrics
