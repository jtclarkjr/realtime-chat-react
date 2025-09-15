# Authentication System Documentation

## Overview

This document outlines the authentication architecture for the realtime chat application. The system leverages Supabase Auth with OAuth providers to ensure secure user authentication, session management, and protected access to chat functionality.

## Authentication Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   User Access   │────│   Login Page    │────│ OAuth Provider  │
│   Application   │    │  (GitHub/       │    │   (GitHub/      │
│                 │    │   Discord)      │    │    Discord)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │ Not Authenticated     │                       │
         ▼                       │                       ▼
┌─────────────────┐              │              ┌─────────────────┐
│                 │              │              │                 │
│ Redirect to     │              │              │ User Grants     │
│ Login Page      │              │              │ Permissions     │
│                 │              │              │                 │
└─────────────────┘              │              └─────────────────┘
                                  │                       │
                                  │                       ▼
                                  │              ┌─────────────────┐
                                  │              │                 │
                                  │              │ OAuth Callback  │
                                  │              │ /auth/callback  │
                                  │              │                 │
                                  │              └─────────────────┘
                                  │                       │
                                  │                       ▼
                                  │              ┌─────────────────┐
                                  │              │                 │
                                  │              │ Session Created │
                                  │              │ Cookie Set      │
                                  │              │                 │
                                  │              └─────────────────┘
                                  │                       │
                                  │                       ▼
                                  │              ┌─────────────────┐
                                  │              │                 │
                                  └──────────────│ Redirect to     │
                                                 │ Chat Application│
                                                 │                 │
                                                 └─────────────────┘
```

## System Architecture

### Core Components

1. **OAuth Integration Layer**
   - GitHub OAuth Provider
   - Discord OAuth Provider
   - OAuth callback handling
   - Error management

2. **Session Management**
   - Supabase Auth session handling
   - HTTP-only cookie storage
   - Automatic token refresh
   - Cross-tab session sync

3. **Authentication Context**
   - React context for auth state
   - User profile management
   - Loading state handling
   - Auth state persistence

## OAuth Providers

### Supported Authentication Methods

**GitHub OAuth**
- Industry-standard OAuth 2.0 flow
- Automatically retrieves user profile data
- Includes username, email, and avatar
- Secure token-based authentication

**Discord OAuth**
- Discord application integration
- Access to user profile information
- Seamless authentication experience
- Compatible with existing Discord accounts

### OAuth Configuration Requirements

**Supabase Dashboard Setup:**
1. Navigate to Authentication → Providers
2. Enable desired OAuth providers
3. Configure client credentials from provider dashboards
4. Set callback URLs to Supabase auth endpoint

**Provider-Specific Setup:**
- **GitHub:** Create OAuth App at GitHub Developer Settings
- **Discord:** Create Application at Discord Developer Portal
- Both require client ID and client secret configuration

## Database Integration

### Authentication Schema

**Messages Table**
- `user_id`: Links to authenticated user
- `username`: Display name from OAuth provider
- `room_id`: Associates messages with chat rooms
- `content`: Message content
- `created_at`: Timestamp for message ordering

**Rooms Table**
- `id`: Unique room identifier
- `name`: Human-readable room name
- `description`: Optional room description
- `created_at`: Room creation timestamp

### Data Flow

```
Authenticated User → Message Creation → Database Storage → Real-time Broadcast
       ↓                    ↓                 ↓                    ↓
   User Profile      Message Content    Persistent Storage    Live Updates
   Information       Validation         with User Data        to All Users
```

## Security Architecture

### Session Management
- **Secure Cookies**: HTTP-only, secure cookies for session storage
- **Auto-Refresh**: Automatic token refresh handled by Supabase
- **Cross-Tab Sync**: Session state synchronized across browser tabs
- **Logout Cleanup**: Complete session termination on logout

### Route Protection
- **Client-Side Guards**: Authentication checks before route access
- **Automatic Redirects**: Unauthenticated users redirected to login
- **Loading States**: Smooth UX during authentication verification
- **Error Handling**: Graceful handling of auth failures

### Data Security
- **User Association**: All messages linked to authenticated users
- **Profile Integration**: OAuth provider data automatically used
- **Secure API Calls**: Authenticated requests to backend services
- **Token Management**: Secure token storage and transmission

## User Experience Flow

### Authentication Journey

**Step 1: Initial Access**
- User attempts to access chat application
- System checks for existing authentication
- Redirects to login if not authenticated

**Step 2: Provider Selection**
- User presented with GitHub and Discord options
- Single-click authentication initiation
- Loading states during OAuth redirect

**Step 3: OAuth Authorization**
- User redirected to selected provider
- Permission grant for application access
- Provider redirects back with authorization code

**Step 4: Session Establishment**
- Application exchanges code for session
- User profile data retrieved and stored
- Secure cookie set for future requests

**Step 5: Chat Access**
- User redirected to main application
- Full access to chat functionality
- Profile information displayed in UI

### Profile Management

**Automatic Profile Population**
- Display name from OAuth provider metadata
- Profile picture from provider account
- Email address for identification
- No manual profile setup required

**Profile Display**
- User avatar shown in chat interface
- Username displayed with messages
- Profile information in user settings
- Consistent identity across sessions

## Technical Architecture

### Component Hierarchy

```
Application Root
├── AuthProvider (Context)
│   ├── Authentication State
│   ├── User Profile Data
│   └── Session Management
├── Protected Routes
│   ├── Route Guards
│   ├── Loading States
│   └── Redirect Logic
└── Chat Components
    ├── Message Display
    ├── User Identification
    └── Real-time Updates
```

### State Management

**Authentication Context**
- Global user state management
- Authentication status tracking
- Profile data storage
- Loading state coordination

**Session Persistence**
- Automatic session restoration on page load
- Cross-tab session synchronization
- Secure token storage in HTTP-only cookies
- Graceful handling of session expiration

## Environment Configuration

### Required Variables

**Supabase Configuration**
- `NEXT_PUBLIC_SUPABASE_URL`: Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anonymous access key
- `SUPABASE_SERVICE_ROLE_KEY`: Server-side operations key

**OAuth Provider Configuration**
- Configured through Supabase Dashboard
- Client IDs and secrets from provider apps
- Callback URLs properly configured

### Deployment Considerations

**Production Setup**
- Secure environment variable management
- HTTPS required for OAuth flows
- Proper callback URL configuration
- Rate limiting and monitoring

**Development Setup**
- Local environment configuration
- Development OAuth applications
- Testing with localhost callbacks
- Debug logging for troubleshooting

## Implementation Status

### ✅ Completed Features

**Core Authentication**
- Supabase Auth integration
- GitHub and Discord OAuth providers
- Session management and persistence
- Protected route implementation

**User Interface**
- Login page with provider buttons
- User profile display components
- Loading states and error handling
- Logout functionality

**Database Integration**
- Authenticated message storage
- User profile data integration
- Real-time chat with user identity
- Message persistence with user context

### 🔄 Future Enhancements

**Advanced Security**
- Row-level security policies
- Rate limiting implementation
- Content moderation system
- User blocking and reporting

**User Management**
- Extended user profile system
- Room membership management
- User roles and permissions
- Online presence tracking

**Administrative Features**
- Admin dashboard for user management
- Audit logging and monitoring
- Advanced security controls
- System health monitoring

## 7. Security Features
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

  const {
    data: { user },
    error
  } = await supabase.auth.getUser(token)

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
          presence: { key: user.id }
        }
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
            online_at: new Date().toISOString()
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
        user_name: user.user_metadata?.username || user.email?.split('@')[0]
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
