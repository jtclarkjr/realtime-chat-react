# Redis Room Caching

This document describes the Redis caching for room data in the realtime chat
application.

## Overview

The application now uses Redis caching to optimize room data loading and reduce
database queries. The implementation includes:

- **Server-side rendering (SSR)**: Room data is pre-loaded on the server before
  client hydration
- **Redis caching**: Room data is cached in Redis with configurable TTL
- **Database reconciliation**: Background service to sync cache with database
  changes
- **Cache invalidation**: Automatic cache updates when rooms are
  created/modified

## Architecture

### Key Components

1. **RoomCacheService** (`lib/services/room-cache-service.ts`)
   - Handles all Redis caching operations for room data
   - Provides database fallback when cache is unavailable
   - Manages cache TTL and invalidation strategies

2. **RoomReconciliationService** (`lib/services/room-reconciliation-service.ts`)
   - Background service to sync cached data with database
   - Detects changes and updates cache accordingly
   - Runs automatically in production or when `ENABLE_ROOM_RECONCILIATION=true`

3. **Cache Configuration** (`lib/redis/cache-config.ts`)
   - Centralized cache key patterns and TTL settings
   - Environment-specific configurations
   - Cache utilities and helper functions

4. **Server Actions** (`lib/actions/room-actions.ts`)
   - Server-side functions for fetching initial room data
   - Used for SSR to pre-populate client with room data

### Redis Caching Flow

```mermaid
sequenceDiagram
    participant Client
    participant NextJS as Next.js Server
    participant RoomCacheService as Room Cache Service
    participant Redis
    participant Database as PostgreSQL DB
    participant ReconciliationService as Reconciliation Service

    %% Initial Page Load with SSR
    Client->>NextJS: GET / (initial page load)
    NextJS->>RoomCacheService: getInitialRoomsData()
    RoomCacheService->>Redis: GET rooms:all
    
    alt Cache Hit - Fresh Data
        Redis-->>RoomCacheService: Return cached rooms + timestamp
        Note over RoomCacheService: Check cache age < sync threshold
        RoomCacheService-->>NextJS: Return fresh rooms data
        NextJS-->>Client: SSR with rooms data (no loading state)
        
    else Cache Hit - Stale Data
        Redis-->>RoomCacheService: Return stale cached rooms + timestamp
        Note over RoomCacheService: Cache age > sync threshold but < TTL
        RoomCacheService-->>NextJS: Return stale data immediately
        NextJS-->>Client: SSR with stale data (instant load)
        
        %% Background refresh
        Note over RoomCacheService: Background refresh enabled
        RoomCacheService->>Database: SELECT * FROM rooms ORDER BY created_at DESC
        Database-->>RoomCacheService: Return latest rooms data
        RoomCacheService->>Redis: SET rooms:all (updated data + timestamp)
        RoomCacheService->>Redis: SET rooms:last_sync (current timestamp)
        
    else Cache Miss
        Redis-->>RoomCacheService: null/empty response
        RoomCacheService->>Database: SELECT * FROM rooms ORDER BY created_at DESC
        Database-->>RoomCacheService: Return rooms data
        
        %% Cache population
        RoomCacheService->>Redis: SET rooms:all (data + timestamp, TTL)
        RoomCacheService->>Redis: SET rooms:last_sync (current timestamp)
        RoomCacheService-->>NextJS: Return rooms data
        NextJS-->>Client: SSR with rooms data
    end

    %% Individual Room Access
    Client->>NextJS: GET /room/[id]
    NextJS->>RoomCacheService: getRoomById(roomId)
    RoomCacheService->>Redis: GET room:{id}
    
    alt Individual Room Cache Hit
        Redis-->>RoomCacheService: Return cached room + timestamp
        Note over RoomCacheService: Check TTL validity
        RoomCacheService-->>NextJS: Return room data
        NextJS-->>Client: Render room page
        
    else Individual Room Cache Miss
        Redis-->>RoomCacheService: null
        RoomCacheService->>Database: SELECT * FROM rooms WHERE id = $1
        Database-->>RoomCacheService: Return room data
        
        alt Room Exists
            RoomCacheService->>Redis: SET room:{id} (room data + timestamp, TTL)
            RoomCacheService-->>NextJS: Return room data
            NextJS-->>Client: Render room page
        else Room Not Found
            RoomCacheService-->>NextJS: Return null
            NextJS-->>Client: Render 404 page
        end
    end

    %% Room Creation Flow
    Client->>NextJS: POST /api/rooms (create new room)
    NextJS->>RoomCacheService: createRoom(roomData)
    RoomCacheService->>Database: INSERT INTO rooms (...) RETURNING *
    Database-->>RoomCacheService: Return new room data
    
    %% Cache invalidation and update
    RoomCacheService->>Redis: DEL rooms:all (invalidate list cache)
    RoomCacheService->>Redis: DEL rooms:last_sync (force refresh)
    RoomCacheService->>Redis: SET room:{newId} (cache new room, TTL)
    RoomCacheService-->>NextJS: Return new room
    NextJS-->>Client: Room created successfully

    %% Background Reconciliation Process
    Note over ReconciliationService: Runs every 5 minutes (production)
    ReconciliationService->>RoomCacheService: needsReconciliation()
    RoomCacheService->>Redis: GET rooms:last_sync
    Redis-->>RoomCacheService: Last sync timestamp
    
    alt Reconciliation Needed
        Note over RoomCacheService: Time since sync > threshold
        RoomCacheService-->>ReconciliationService: true (needs sync)
        ReconciliationService->>RoomCacheService: reconcileWithDatabase()
        
        %% Compare cache with database
        RoomCacheService->>Redis: GET rooms:all
        RoomCacheService->>Database: SELECT * FROM rooms WITH timestamps
        
        par Parallel data retrieval
            Redis-->>RoomCacheService: Cached rooms data
        and
            Database-->>RoomCacheService: Current database state
        end
        
        alt Changes Detected
            Note over RoomCacheService: Rooms added/removed/modified
            RoomCacheService->>Redis: SET rooms:all (updated data, TTL)
            RoomCacheService->>Redis: SET rooms:last_sync (current time)
            Note over ReconciliationService: Log: "Reconciliation completed - X changes"
            
        else No Changes
            RoomCacheService->>Redis: SET rooms:last_sync (current time)
            Note over ReconciliationService: Log: "Reconciliation completed - no changes"
        end
        
    else No Reconciliation Needed
        RoomCacheService-->>ReconciliationService: false (recent sync)
        Note over ReconciliationService: Skip reconciliation cycle
    end

    %% Error Handling and Fallbacks
    Note over RoomCacheService,Redis: Redis Connection Error
    Client->>NextJS: GET /api/rooms
    NextJS->>RoomCacheService: getAllRooms()
    RoomCacheService->>Redis: GET rooms:all
    Redis-->>RoomCacheService: Connection error
    
    %% Fallback to database
    Note over RoomCacheService: Redis unavailable - fallback
    RoomCacheService->>Database: Direct database query
    Database-->>RoomCacheService: Return rooms data
    RoomCacheService-->>NextJS: Return data (no caching)
    NextJS-->>Client: Rooms data (slower response)

    %% Cache Corruption Detection
    RoomCacheService->>Redis: GET rooms:all
    Redis-->>RoomCacheService: Corrupted data ("[object Object]")
    Note over RoomCacheService: Detect corrupted cache
    RoomCacheService->>Redis: DEL rooms:all (clear corruption)
    RoomCacheService->>Database: Fetch fresh data
    Database-->>RoomCacheService: Clean room data
    RoomCacheService->>Redis: SET rooms:all (clean data, TTL)
```

### Data Flow

#### Initial Page Load (SSR)

1. Server calls `getInitialRoomsData()` during rendering
2. Cache service checks Redis for room data
3. If cache hit: return cached data immediately
4. If cache miss: fetch from database and populate cache
5. Room data is sent to client with initial HTML

#### Client-side Operations

1. `RoomSelector` component receives initial room data as props
2. No loading state shown since data is already available
3. New rooms created through API automatically invalidate cache

#### Background Reconciliation

1. Service runs every 5 minutes (configurable)
2. Compares cached data with database state
3. Updates cache if discrepancies are found
4. Logs reconciliation activities

## Configuration

### Environment Variables

```bash
# Enable background reconciliation (recommended for production)
ENABLE_ROOM_RECONCILIATION=true

# Redis connection (automatically detected)
REDIS_URL=redis://localhost:6379
# OR
KV_REST_API_URL=https://your-upstash-endpoint
KV_REST_API_TOKEN=your-upstash-token
```

### Cache TTL Settings

Default TTL values (configurable in `cache-config.ts`):

- **All rooms list**: 5 minutes (300 seconds)
- **Individual room**: 1 hour (3600 seconds)
- **Sync threshold**: 1 minute (60 seconds)

### Development vs Production

- **Development**: Shorter TTLs (10% of production values)
- **Production**: Full TTL values with background reconciliation
- **Test**: Caching disabled completely

## Benefits

### Performance Improvements

1. **Faster page loads**: Room data is available immediately (no loading
   spinner)
2. **Reduced database queries**: Most room requests served from cache
3. **Better user experience**: Instant room selection without API calls

### Scalability Benefits

1. **Database load reduction**: Fewer direct database queries
2. **Horizontal scaling**: Cache shared across multiple server instances
3. **Resilient fallback**: Always falls back to database if cache fails

## Cache Keys Structure

```
rooms:all                    # List of all rooms
room:{id}                   # Individual room by ID
rooms:last_sync            # Last reconciliation timestamp
rooms:count                # Room count metadata
```

## Monitoring

### Cache Statistics

The system tracks:

- Cache hits vs misses
- Error rates
- Reconciliation frequency
- TTL effectiveness

### Reconciliation Logs

Background reconciliation logs show:

- Changes detected (added/removed/modified rooms)
- Sync frequency and timing
- Error conditions

## API Changes

### Updated Endpoints

- `GET /api/rooms`: Now uses cache-first strategy
- `POST /api/rooms`: Automatically invalidates cache
- `GET /api/rooms/by-id/[roomId]`: Uses individual room cache

### Response Times

Expected improvements:

- Cached responses: ~10-20ms
- Database fallback: ~50-100ms (unchanged)
- Initial page load: ~200-500ms faster

## Future Enhancements

Potential additions:

1. Message caching for chat history
2. User session caching
3. Real-time cache invalidation via WebSockets
4. Cache warming strategies
5. Advanced cache analytics

## Troubleshooting

### Common Issues

1. **Cache not working**: Check Redis connection and environment variables
2. **Stale data**: Verify reconciliation service is running
3. **High memory usage**: Adjust TTL values or implement LRU eviction

### Debug Commands

```bash
# Check Redis connection
bun redis:cli ping

# View cached room data
bun redis:cli get rooms:all

# Monitor reconciliation
tail -f logs/reconciliation.log
```

## Performance Considerations

- Cache warming on application startup
- Background refresh for frequently accessed data
- Graceful degradation when Redis is unavailable
- Memory-efficient key naming patterns
- Configurable TTL based on usage patterns
