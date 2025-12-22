# User Presence System Design

## Overview

The user presence system provides real-time visibility of active users in chat rooms through avatar displays. Users can see who else is currently in a room, with avatars updating dynamically as people join and leave.

### Key Features

- **Real-time presence tracking** - Avatars appear/disappear instantly as users join/leave
- **Avatar stack display** - Overlapping avatars with overflow indicators
- **Current user highlighting** - Your avatar is highlighted with a distinct border
- **Tooltips** - Hover to see full names
- **Efficient architecture** - Single channel approach, minimal overhead
- **Automatic cleanup** - Presence removed on disconnect/navigation

---

## Architecture

### Design Philosophy

**Single Channel Integration** - The presence system leverages the existing Supabase WebSocket channel used for messaging rather than creating a separate presence-only channel. This design choice provides:

- **Lower resource usage** - One channel instead of two
- **Simplified state management** - Single connection state to track
- **Better performance** - Reduced overhead on both client and server
- **Consistency** - Presence and messaging synchronized through same channel

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         RoomClient                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Header Section                          │  │
│  │  ┌──────────────────┐  ┌──────────┐  ┌──────────────┐    │  │
│  │  │ Presence Avatars │  │Room Name │  │ Leave Button │    │  │
│  │  └──────────────────┘  └──────────┘  └──────────────┘    │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   RealtimeChat                            │  │
│  │    ┌─────────────────────────────────────┐               │  │
│  │    │    useRealtimeChat Hook             │               │  │
│  │    │  ┌───────────────────────────────┐  │               │  │
│  │    │  │  useWebSocketConnection       │  │               │  │
│  │    │  │  - Presence tracking          │  │               │  │
│  │    │  │  - Message broadcasting       │  │               │  │
│  │    │  │  - Heartbeat mechanism        │  │               │  │
│  │    │  └───────────────────────────────┘  │               │  │
│  │    └─────────────────────────────────────┘               │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Complete Presence Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER ENTERS ROOM                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ RoomClient Component Initializes                                 │
│ - Receives user data from server (SSR)                          │
│ - Sets up presence state: useState<PresenceState>({})           │
│ - Creates handlePresenceChange callback                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ RealtimeChat Component Mounts                                    │
│ - Receives onPresenceChange prop                                │
│ - Initializes useRealtimeChat hook                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ useRealtimeChat Hook Initializes                                │
│ - Creates presence state: useState<PresenceState>({})           │
│ - Defines handlePresenceSync callback                           │
│ - Passes username, avatar_url to useWebSocketConnection         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ useWebSocketConnection Hook                                     │
│ Step 1: Creates Supabase channel                                │
│   channel(roomId, {                                             │
│     config: {                                                   │
│       broadcast: { self: false },                               │
│       presence: { key: userId }                                 │
│     }                                                            │
│   })                                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: Sets up event listeners                                 │
│   - .on('broadcast', { event: 'message' }, ...)                │
│   - .on('broadcast', { event: 'message_unsent' }, ...)         │
│   - .on('presence', { event: 'sync' }, ...)  ← NEW             │
│   - .on('system', {}, ...)                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: Subscribes to channel                                   │
│   .subscribe(async (status) => {                                │
│     if (status === 'SUBSCRIBED') {                              │
│       // Initial presence track                                 │
│       await channel.track({                                     │
│         online: true,                                            │
│         userId,                                                  │
│         name: username,                                          │
│         avatar_url: userAvatarUrl,                              │
│         online_at: Date.now(),                                  │
│         timestamp: Date.now()                                   │
│       })                                                         │
│     }                                                            │
│   })                                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ SUPABASE REALTIME SERVER                                        │
│ - Receives presence track from user                             │
│ - Broadcasts presence:sync to all channel subscribers           │
│ - Includes complete presence state of all users in room         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Presence 'sync' Event Fires (All Clients)                       │
│   .on('presence', { event: 'sync' }, () => {                   │
│     const presenceState = channel.presenceState<PresenceUser>() │
│     // Transform to PresenceState format                        │
│     const transformedState = {}                                 │
│     Object.entries(presenceState).forEach(([userId, data]) => {│
│       transformedState[userId] = {                              │
│         id: userId,                                             │
│         name: data[0].name,                                     │
│         avatar_url: data[0].avatar_url,                         │
│         online_at: data[0].online_at                            │
│       }                                                          │
│     })                                                           │
│     onPresenceSync?.(transformedState)                          │
│   })                                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ handlePresenceSync in useRealtimeChat                           │
│   - Updates local presenceUsers state                           │
│   - setPresenceUsers(transformedState)                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ useEffect in RealtimeChat Component                             │
│   useEffect(() => {                                             │
│     if (onPresenceChange) {                                     │
│       onPresenceChange(presenceUsers)                           │
│     }                                                            │
│   }, [presenceUsers, onPresenceChange])                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ handlePresenceChange in RoomClient                              │
│   - Updates RoomClient's local presenceUsers state              │
│   - setPresenceUsers(users)                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ RealtimePresenceAvatars Renders                                 │
│   - Receives presenceUsers prop                                 │
│   - Transforms Record to Array                                  │
│   - Ensures current user is included                            │
│   - Sorts: current user first, then alphabetically              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ AvatarStack Component Renders                                   │
│   - Takes first maxVisible (5) users                            │
│   - Calculates overflow count                                   │
│   - Renders overlapping avatars with z-index layering           │
│   - Highlights current user with ring-primary                   │
│   - Shows "+N" badge for overflow                               │
│   - Wraps each in Tooltip with user name                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ USER INTERACTION                                                │
│   - Hover over avatar → Tooltip shows "Name (you)" or "Name"   │
│   - See real-time updates as others join/leave                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ HEARTBEAT MECHANISM (Every 30 seconds)                          │
│   setInterval(() => {                                           │
│     channel.track({                                             │
│       online: true,                                             │
│       userId,                                                    │
│       name: username,                                            │
│       avatar_url: userAvatarUrl,                                │
│       online_at: Date.now(),                                    │
│       timestamp: Date.now()                                     │
│     })                                                           │
│   }, 30000)                                                     │
│   // Keeps presence fresh, prevents stale data                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ USER LEAVES ROOM                                                │
│   - Component unmounts                                          │
│   - Cleanup function runs:                                      │
│     supabase.removeChannel(channel)                             │
│   - Supabase automatically removes user from presence           │
│   - Presence:sync event fires for remaining users               │
│   - Avatars update to remove departed user                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

### Visual Component Tree

```
RoomClient
│
├── Header
│   ├── RealtimePresenceAvatars (LEFT SIDE)
│   │   └── AvatarStack
│   │       ├── TooltipProvider
│   │       ├── Tooltip (for each user)
│   │       │   ├── TooltipTrigger
│   │       │   │   └── UserAvatar (with ring styling)
│   │       │   └── TooltipContent
│   │       │       └── "Username" or "Username (you)"
│   │       └── Tooltip (overflow badge)
│   │           ├── TooltipTrigger
│   │           │   └── "+N" Badge
│   │           └── TooltipContent
│   │               └── List of hidden users
│   │
│   ├── Room Title (CENTER)
│   └── Leave Button (RIGHT)
│
└── RealtimeChat
    └── (chat interface)
```

### Data Flow Between Components

```
┌──────────────────────────────────────────────────────────────┐
│                         RoomClient                            │
│                                                               │
│  State: presenceUsers (PresenceState)                        │
│  Callback: handlePresenceChange                              │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                  RealtimeChat                          │  │
│  │                                                         │  │
│  │  Props: onPresenceChange                               │  │
│  │                                                         │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │          useRealtimeChat                         │  │  │
│  │  │                                                   │  │  │
│  │  │  State: presenceUsers                            │  │  │
│  │  │  Callback: handlePresenceSync                    │  │  │
│  │  │                                                   │  │  │
│  │  │  ┌────────────────────────────────────────────┐  │  │  │
│  │  │  │   useWebSocketConnection                   │  │  │  │
│  │  │  │                                             │  │  │  │
│  │  │  │  Props:                                     │  │  │  │
│  │  │  │  - username                                 │  │  │  │
│  │  │  │  - userAvatarUrl                            │  │  │  │
│  │  │  │  - onPresenceSync                           │  │  │  │
│  │  │  │                                             │  │  │  │
│  │  │  │  Supabase Channel:                          │  │  │  │
│  │  │  │  - track() sends presence                   │  │  │  │
│  │  │  │  - presenceState() reads presence           │  │  │  │
│  │  │  │  - sync event triggers callback             │  │  │  │
│  │  │  └────────────────────────────────────────────┘  │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │         RealtimePresenceAvatars                        │  │
│  │                                                         │  │
│  │  Props:                                                │  │
│  │  - presenceUsers (from RoomClient state)              │  │
│  │  - currentUserId                                       │  │
│  │  - currentUserName                                     │  │
│  │  - currentUserAvatar                                   │  │
│  │                                                         │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │           AvatarStack                            │  │  │
│  │  │                                                   │  │  │
│  │  │  - Transforms data to array                      │  │  │
│  │  │  - Sorts users (current first)                   │  │  │
│  │  │  - Renders visible avatars                       │  │  │
│  │  │  - Shows overflow badge                          │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## State Synchronization

### State Flow Chart

```
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE REALTIME SERVER                        │
│         (Source of Truth for Presence State)                 │
└─────────────────────────────────────────────────────────────┘
                          ↓ presence:sync
        ┌─────────────────┴──────────────────┐
        ↓                                     ↓
┌──────────────────┐                 ┌──────────────────┐
│   Client A       │                 │   Client B       │
│                  │                 │                  │
│  Hook State:     │                 │  Hook State:     │
│  presenceUsers   │                 │  presenceUsers   │
│      ↓           │                 │      ↓           │
│  Component State │                 │  Component State │
│  presenceUsers   │                 │  presenceUsers   │
│      ↓           │                 │      ↓           │
│  UI Renders:     │                 │  UI Renders:     │
│  [A, B, C]       │                 │  [A, B, C]       │
└──────────────────┘                 └──────────────────┘
```

### Update Propagation

1. **User Action** (join/leave)
   - `channel.track()` or `channel.unsubscribe()`

2. **Server Update**
   - Supabase updates presence registry
   - Triggers `presence:sync` to all subscribers

3. **Client Sync**
   - Each client receives full presence state
   - `onPresenceSync` callback fires

4. **State Cascade**
   - useWebSocketConnection → useRealtimeChat → RealtimeChat → RoomClient

5. **UI Render**
   - React re-renders with new presence data
   - Framer Motion handles transitions (if configured)

---

## Performance Considerations

### Optimization Strategies

#### 1. Memoization

#### 2. Limited Visible Avatars

- Only render 5 avatars by default
- Overflow hidden behind "+N" badge
- Prevents DOM bloat in large rooms

#### 3. Throttled Updates

- Heartbeat every 30 seconds (not on every message)
- Supabase handles presence timeout automatically
- Balance between freshness and network usage

#### 4. Efficient Event Listeners

### Scalability

**Current Design:**
- Handles rooms with 5-10 users optimally
- Gracefully degrades to 50+ users (overflow badge)
- Performance impact minimal due to:
  - Limited visible avatars
  - Single channel architecture
  - Memoized transformations

**Potential Bottlenecks:**
- Very large rooms (100+ users) may cause:
  - Increased sync payload size
  - More frequent re-renders
  - Memory usage from presence state

**Mitigation:**
- Pagination in overflow tooltip
- Virtual scrolling for large user lists
- Room size limits (product decision)

---

## Technical Decisions

### Why Track on Every Heartbeat?

**Rationale:**
- Supabase presence has a timeout mechanism
- Periodic tracking keeps user "alive"
- Detects disconnected clients
- 30-second interval balances freshness vs. network load

**Alternative:** Track only on join/leave
- Risk: Stale presence if client crashes
- Risk: False "online" status for zombie connections

### Why Current User in Presence List?

**User Preference:** Yes, include current user

**Benefits:**
- Confirms you're visible to others
- Shows your connection status
- Consistent with design pattern (Figma, Google Docs)

**Implementation:**
- Highlighted with `ring-primary`
- Sorted first in list
- Tooltip shows "(you)"

---

## Error Handling & Edge Cases

### Connection Loss

**Scenario:** User's internet disconnects

**Behavior:**
1. WebSocket connection drops
2. `setIsConnected(false)` triggered
3. Reconnection logic attempts reconnect
4. On reconnect, presence automatically re-tracked
5. Other users' views update when sync event fires

**User Experience:**
- Avatar may temporarily disappear for others
- Reappears automatically on reconnection
- No manual intervention needed

---

### Integration

**Scenarios:**
1. User joins room → Avatar appears for all
2. User leaves room → Avatar disappears for all
3. Multiple users join → Avatars stack properly
4. Overflow scenario → "+N" badge appears
5. Hover interaction → Tooltip shows name
6. Connection loss → Reconnect and restore presence

---

### Related Documentation

- [Supabase Realtime Presence Docs](https://supabase.com/docs/guides/realtime/presence)

