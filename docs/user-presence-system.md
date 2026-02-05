# User Presence System Design

## Overview

The user presence system provides real-time visibility of active users in chat
rooms through online count displays in the sidebar. Users can see how many people
are currently in each room, with counts updating dynamically as people join and leave.

> **Note**: As of the Discord-like UI redesign (Feb 2026), presence is now displayed
> as online counts in the sidebar rather than avatar stacks in the room header.

### Key Features

- **Real-time presence tracking** - Online counts update instantly as users join/leave
- **Sidebar integration** - Online count shown next to each room name
- **Per-room tracking** - Cached in UI store for persistent display
- **Tooltip information** - Shows online count in collapsed sidebar state
- **Efficient architecture** - Single channel approach, minimal overhead
- **Automatic cleanup** - Presence removed on disconnect/navigation

---

## Architecture

### Design Philosophy

**Single Channel Integration** - The presence system leverages the existing
Supabase WebSocket channel used for messaging rather than creating a separate
presence-only channel. This design choice provides:

- **Lower resource usage** - One channel instead of two
- **Simplified state management** - Single connection state to track
- **Better performance** - Reduced overhead on both client and server
- **Consistency** - Presence and messaging synchronized through same channel

### Component Architecture (Updated Feb 2026)

```mermaid
graph TB
    AL[AuthenticatedLayout]
    SB[Sidebar]
    RL[RoomList]
    RLI[RoomListItem<br/>Shows online count]
    UIS[UI Store<br/>roomPresence cache]
    RC[RoomClient]
    RTC[RealtimeChat]
    URC[useRealtimeChat Hook]
    UWS[useWebSocketConnection<br/>- Presence tracking<br/>- Message broadcasting<br/>- Heartbeat mechanism]

    AL --> SB
    SB --> RL
    RL --> RLI
    RLI -.reads from.-> UIS
    RC -.updates.-> UIS
    RC --> RTC
    RTC --> URC
    URC --> UWS
```

**Key Changes:**
- Presence avatars removed from room header
- Online counts displayed in sidebar next to room names
- Presence data cached in UI store (`roomPresence` state)
- `RoomClient` updates presence count when `onPresenceChange` fires

---

## Data Flow

### Complete Presence Lifecycle

```mermaid
flowchart TD
    A[USER ENTERS ROOM] --> B[RoomClient Component Initializes<br/>- Receives user data from server SSR<br/>- Sets up presence state<br/>- Creates handlePresenceChange callback]
    B --> C[RealtimeChat Component Mounts<br/>- Receives onPresenceChange prop<br/>- Initializes useRealtimeChat hook]
    C --> D[useRealtimeChat Hook Initializes<br/>- Creates presence state<br/>- Defines handlePresenceSync callback<br/>- Passes username, avatar_url to useWebSocketConnection]
    D --> E[useWebSocketConnection Hook<br/>Step 1: Creates Supabase channel<br/>with broadcast and presence config]
    E --> F[Step 2: Sets up event listeners<br/>- broadcast: message<br/>- broadcast: message_unsent<br/>- presence: sync<br/>- system events]
    F --> G[Step 3: Subscribes to channel<br/>Tracks initial presence with<br/>online, userId, name, avatar_url, timestamps]
    G --> H[SUPABASE REALTIME SERVER<br/>- Receives presence track<br/>- Broadcasts presence:sync to all subscribers<br/>- Includes complete presence state]
    H --> I[Presence 'sync' Event Fires<br/>Gets presenceState and transforms<br/>to PresenceState format]
    I --> J[handlePresenceSync in useRealtimeChat<br/>Updates local presenceUsers state]
    J --> K[useEffect in RealtimeChat Component<br/>Calls onPresenceChange with presenceUsers]
    K --> L[handlePresenceChange in RoomClient<br/>Calculates online count from users object<br/>Updates UI store: setRoomPresence roomId, count]
    L --> M[UI Store Updates<br/>roomPresence roomId mapped to online count]
    M --> N[Sidebar RoomListItem Reads<br/>Displays online count next to room name<br/>Shows in tooltip for collapsed sidebar]
    N --> O[USER INTERACTION<br/>- See live count updates in sidebar<br/>- Hover collapsed sidebar for details]
    O --> P[HEARTBEAT MECHANISM<br/>Every 30 seconds<br/>channel.track with updated timestamps]
    P --> O
    O --> Q[USER LEAVES ROOM<br/>- Component unmounts<br/>- Cleanup: supabase.removeChannel<br/>- Supabase removes user from presence<br/>- Avatars update for remaining users]
```

---

## Component Hierarchy (Updated Feb 2026)

### Visual Component Tree

```mermaid
graph TB
    AL[AuthenticatedLayout]
    SB[Sidebar]
    RL[RoomList]
    RLI[RoomListItem]
    HASH[Hash Icon]
    NAME[Room Name Text]
    COUNT[Online Count Badge]
    TT[Tooltip Collapsed]
    RC[RoomClient]
    RTC[RealtimeChat]

    AL --> SB
    AL --> RC
    SB --> RL
    RL --> RLI
    RLI --> HASH
    RLI --> NAME
    RLI --> COUNT
    RLI -.collapsed state.-> TT
    RC --> RTC
```

**Simplified Structure:**
- Online count displayed as simple number next to room name
- Tooltip shows count when sidebar is collapsed
- No avatar stack component needed
- Cleaner, more Discord-like UI

### Data Flow Between Components (Updated Feb 2026)

```mermaid
flowchart TB
    subgraph RC[RoomClient]
        RC_Callback[Callback: handlePresenceChange<br/>- Calculates online count<br/>- Updates UI store]

        subgraph RTC[RealtimeChat]
            RTC_Props[Props: onPresenceChange]

            subgraph URC[useRealtimeChat]
                URC_State[Callback: handlePresenceSync]

                subgraph UWS[useWebSocketConnection]
                    UWS_Props[Props:<br/>- username<br/>- userAvatarUrl<br/>- onPresenceSync]
                    UWS_Channel[Supabase Channel:<br/>- track sends presence<br/>- presenceState reads presence<br/>- sync event triggers callback]
                end
            end
        end
    end

    subgraph UIS[UI Store]
        UIS_State[State: roomPresence<br/>Record roomId to online count]
    end

    subgraph SB[Sidebar]
        subgraph RLI[RoomListItem]
            RLI_Display[Displays:<br/>- Room name<br/>- Online count<br/>- Tooltip in collapsed state]
        end
    end

    UWS_Props --> UWS_Channel
    URC_State --> UWS
    RTC_Props --> URC
    RC_Callback --> RTC
    RC_Callback --> UIS_State
    UIS_State --> RLI_Display
```

**Key Changes:**
- Removed `RealtimePresenceAvatars` and `AvatarStack` components
- Added UI store for persistence
- Sidebar reads from UI store to display counts

---

## State Synchronization

### State Flow Chart

```mermaid
flowchart TD
    Server[SUPABASE REALTIME SERVER<br/>Source of Truth for Presence State]

    Server -->|presence:sync| ClientA
    Server -->|presence:sync| ClientB

    subgraph ClientA[Client A]
        A1[Hook State:<br/>presenceUsers]
        A2[Component State:<br/>presenceUsers]
        A3[UI Renders:<br/>A, B, C]
        A1 --> A2 --> A3
    end

    subgraph ClientB[Client B]
        B1[Hook State:<br/>presenceUsers]
        B2[Component State:<br/>presenceUsers]
        B3[UI Renders:<br/>A, B, C]
        B1 --> B2 --> B3
    end
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
