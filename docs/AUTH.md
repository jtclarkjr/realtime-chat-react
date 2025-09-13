# Authentication Implementation Strategy

## Overview

This document outlines the detailed implementation strategy for adding Supabase Auth and Row Level Security (RLS) to the realtime chat application.

## 1. Supabase Auth Integration

### Auth Context Implementation
```typescript
// Auth Context
const AuthProvider = () => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])
}
```

### Database Schema Updates
```sql
-- Enhanced messages table with proper auth
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles table
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'offline',
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Room memberships table
CREATE TABLE room_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  role TEXT DEFAULT 'member', -- member, admin, owner
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);
```

### Enhanced RLS Policies
```sql
-- Messages RLS policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can only read messages from rooms they're members of
CREATE POLICY "Users can read messages from joined rooms" ON messages 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM room_memberships 
    WHERE room_id = messages.channel_id 
    AND user_id = auth.uid()
  )
);

-- Users can only insert messages to rooms they're members of
CREATE POLICY "Users can send messages to joined rooms" ON messages 
FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM room_memberships 
    WHERE room_id = messages.channel_id 
    AND user_id = auth.uid()
  )
);

-- User profiles RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON user_profiles 
FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON user_profiles 
FOR UPDATE USING (auth.uid() = id);

-- Room memberships RLS
ALTER TABLE room_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view room memberships" ON room_memberships 
FOR SELECT USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM room_memberships rm 
    WHERE rm.room_id = room_memberships.room_id 
    AND rm.user_id = auth.uid()
  )
);
```

## 2. Security Model Implementation

### JWT Token Validation
```typescript
// API middleware for auth validation
export async function validateAuth(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  
  if (!token) {
    throw new Error('No authorization token provided')
  }

  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    throw new Error('Invalid or expired token')
  }

  return user
}
```

### Room Access Control APIs
```typescript
// Enhanced room management API
POST /api/rooms/join
├── Validate user authentication
├── Check room exists or create if allowed
├── Add user to room_memberships
├── Subscribe to realtime channel with auth
└── Return room data and permissions

POST /api/rooms/leave
├── Validate user authentication
├── Remove from room_memberships
├── Unsubscribe from realtime channel
└── Update user status

GET /api/rooms/{roomId}/members
├── Validate user is room member
├── Return member list with profiles
└── Include online status
```

## 3. Realtime Security Enhancement

### Authenticated Realtime Subscriptions
```typescript
// Enhanced realtime chat hook with auth
export function useAuthenticatedRealtimeChat(roomId: string) {
  const { user, session } = useAuth()
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!user || !session) return

    const newChannel = supabase
      .channel(`room:${roomId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: user.id },
        },
      })
      .on('broadcast', { event: 'message' }, (payload) => {
        // Handle authenticated messages
        handleRealtimeMessage(payload.payload)
      })
      .on('presence', { event: 'sync' }, () => {
        // Handle user presence updates
        handlePresenceSync()
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Track user presence
          newChannel.track({
            user_id: user.id,
            username: user.user_metadata?.username,
            online_at: new Date().toISOString(),
          })
        }
      })

    setChannel(newChannel)

    return () => {
      newChannel.unsubscribe()
    }
  }, [user, session, roomId])
}
```

## 4. Redis Security & Session Management

### Enhanced Redis Key Structure
```
Key Patterns with Auth:
- user:{userId}:session:{sessionId} → session data
- user:{userId}:rooms → Set of joined room IDs
- room:{roomId}:members → Set of member user IDs
- room:{roomId}:typing:{userId} → typing indicator with TTL
- user:{userId}:room:{roomId}:last_seen → timestamp
- user:{userId}:presence → online status with TTL
```

### Session Validation Service
```typescript
export class AuthSessionService {
  private redis: Redis

  async validateSession(userId: string, sessionId: string): Promise<boolean> {
    const sessionKey = `user:${userId}:session:${sessionId}`
    const sessionData = await this.redis.get(sessionKey)
    
    if (!sessionData) {
      return false
    }

    // Extend session TTL on valid access
    await this.redis.expire(sessionKey, 86400) // 24 hours
    return true
  }

  async trackUserRoom(userId: string, roomId: string): Promise<void> {
    await Promise.all([
      this.redis.sadd(`user:${userId}:rooms`, roomId),
      this.redis.sadd(`room:${roomId}:members`, userId),
      this.redis.set(`user:${userId}:room:${roomId}:last_seen`, Date.now())
    ])
  }
}
```

## 5. API Route Security Enhancement

```typescript
// Enhanced message sending with full auth
export async function POST(request: Request) {
  try {
    // Validate authentication
    const user = await validateAuth(request)
    
    const { content, channelId } = await request.json()

    // Validate user has access to room
    const { data: membership } = await supabase
      .from('room_memberships')
      .select('role')
      .eq('room_id', channelId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Not authorized to send messages to this room' },
        { status: 403 }
      )
    }

    // Create message with authenticated user
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        content,
        channel_id: channelId,
        user_id: user.id,
        user_name: user.user_metadata?.username || user.email?.split('@')[0],
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ message })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
```

## 6. Additional Security Features

### Rate Limiting Service
```typescript
// Rate limiting service
export class RateLimitService {
  private redis: Redis

  async checkRateLimit(
    userId: string,
    action: string,
    limit: number,
    window: number
  ): Promise<boolean> {
    const key = `rate_limit:${userId}:${action}`
    const current = await this.redis.incr(key)
    
    if (current === 1) {
      await this.redis.expire(key, window)
    }
    
    return current <= limit
  }
}
```

### Content Moderation
```typescript
// Message content validation
export function validateMessageContent(content: string): ValidationResult {
  // Length validation
  if (content.length > 2000) {
    return { valid: false, error: 'Message too long' }
  }
  
  // Basic content filtering
  const prohibitedPatterns = [
    // Add patterns for spam, inappropriate content, etc.
  ]
  
  for (const pattern of prohibitedPatterns) {
    if (pattern.test(content)) {
      return { valid: false, error: 'Message contains prohibited content' }
    }
  }
  
  return { valid: true }
}
```

## 7. Migration Strategy

### Phase 1: Database Migration
1. Create new tables with auth integration
2. Migrate existing messages to new schema
3. Update RLS policies

### Phase 2: Frontend Updates
1. Add Supabase Auth provider
2. Implement login/signup flows
3. Update chat components for authenticated users

### Phase 3: API Security
1. Add auth middleware to all API routes
2. Update Redis patterns for authenticated sessions
3. Implement rate limiting and content moderation

### Phase 4: Testing & Rollout
1. Test authentication flows
2. Verify RLS policies work correctly
3. Performance testing with auth overhead
4. Gradual rollout with feature flags

## Implementation Checklist

### Database Setup
- [ ] Create user_profiles table
- [ ] Create room_memberships table
- [ ] Update messages table schema
- [ ] Implement RLS policies
- [ ] Test policy enforcement

### Frontend Implementation
- [ ] Add Auth context provider
- [ ] Create login/signup components
- [ ] Update chat components for auth
- [ ] Add protected route handling
- [ ] Implement user profile management

### Backend Implementation
- [ ] Add auth middleware
- [ ] Update API routes for security
- [ ] Implement room management APIs
- [ ] Add rate limiting
- [ ] Content moderation system

### Redis Updates
- [ ] Update key patterns
- [ ] Implement session service
- [ ] Add presence tracking
- [ ] Update delivery tracking

### Testing
- [ ] Unit tests for auth flows
- [ ] Integration tests for RLS
- [ ] Performance testing
- [ ] Security testing
- [ ] End-to-end user flows

### Deployment
- [ ] Environment variables setup
- [ ] Database migrations
- [ ] Feature flag configuration
- [ ] Monitoring setup
- [ ] Rollback procedures