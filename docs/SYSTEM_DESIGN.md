# System Design - Realtime Chat Application

## Overview

This document outlines the system architecture and design decisions for a
scalable, real-time chat application built with Next.js, Supabase, and Redis.
The system handles real-time messaging, message persistence, offline support,
and reliable message delivery.

## Architecture Diagram

```
┌─────────────────────────────┐    ┌─────────────────────────────┐
│   Browser 1                 │    │   Browser N                 │
│                             │    │                             │
│  ┌───────────────────────┐  │    │  ┌───────────────────────┐  │
│  │     React App         │  │    │  │     React App         │  │
│  │                       │  │    │  │                       │  │
│  │  ┌──────────────────┐ │  │    │  │  ┌──────────────────┐ │  │
│  │  │ React Query      │ │  │    │  │  │ React Query      │ │  │
│  │  │ Cache            │ │  │    │  │  │ Cache            │ │  │
│  │  └──────┬───────────┘ │  │    │  │  └──────┬───────────┘ │  │
│  │         │             │  │    │  │         │             │  │
│  │  ┌──────▼───────────┐ │  │    │  │  ┌──────▼───────────┐ │  │
│  │  │ Local State      │ │  │    │  │  │ Local State      │ │  │
│  │  │ (Messages)       │ │  │    │  │  │ (Messages)       │ │  │
│  │  └──────────────────┘ │  │    │  │  └──────────────────┘ │  │
│  └───────────────────────┘  │    │  └───────────────────────┘  │
└─────────┬───────────────────┘    └─────────┬───────────────────┘
          │                                  │
          │      HTTP (Queries/Mutations)    │
          │      WebSocket (Realtime)        │
          └──────────────┬───────────────────┘
                         │
          ┌──────────────▼──────────────┐
          │      Next.js App            │
          │  ┌────────────────────────┐ │
          │  │  API Routes            │ │
          │  └────────────────────────┘ │
          │  ┌────────────────────────┐ │
          │  │  Server Actions        │ │
          │  └────────────────────────┘ │
          └──────────────┬──────────────┘
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
┌──────▼─────┐   ┌───────▼──────┐   ┌──────▼──────┐
│  Supabase  │   │    Redis     │   │  Supabase   │
│  Realtime  │   │    Cache     │   │  Database   │
│ (WebSocket)│   │              │   │ (PostgreSQL)│
└────────────┘   └──────────────┘   └─────────────┘
```

## Core Components

### 1. Frontend Layer (React/Next.js)

#### Components Architecture

- **RealtimeChat**: Main chat interface component
- **ChatMessage**: Individual message display component
- **useRealtimeChat**: Custom hook managing chat state and real-time connections
- **useChatScroll**: Auto-scroll behavior for message list
- **UserStore**: Zustand store for user session management

#### Key Features

- Real-time message display and sending
- Automatic reconnection handling
- Message deduplication
- Responsive design with Tailwind CSS
- TypeScript for type safety
- **React Query** for data fetching and caching

#### React Query Integration

The application uses TanStack React Query v5 for efficient data management:

**Queries (GET requests)**:

- `useRooms()` - Fetch and cache room list (60s stale time)
- `useMissedMessages()` - Fetch missed messages on reconnect (always fresh)

**Mutations (POST/DELETE)**:

- `useSendMessage()` - Send messages with automatic retry
- `useUnsendMessageMutation()` - Unsend/delete messages
- `useGenerateRoom()` - AI room name generation
- `useCreateRoom()` - Create room (wraps server action)
- `useDeleteRoom()` - Delete room (wraps server action)

### 2. API Layer (Next.js API Routes)

#### Message Handling

```
POST /api/messages/send
├── Validate message content
├── Save to Supabase database
├── Update Redis tracking
├── Broadcast via Supabase Realtime
└── Return success response
```

```
POST /api/messages/mark-received
├── Validate user and message IDs
├── Update Redis delivery tracking
└── Return confirmation
```

#### Room Management

```
GET /api/rooms/{roomId}/rejoin?userId={userId}
├── Check user's last received message in Redis
├── Query database for missed messages
├── Return missed messages or "caught up" status
└── Update Redis tracking
```

### 3. Data Layer

#### Supabase Database (PostgreSQL)

```
/database/schema.sql
```

**Purpose**: Permanent message storage, source of truth **Features**:

- Row Level Security (RLS) policies
- Automatic timestamps
- UUID primary keys
- Indexed for efficient queries

#### Redis Cache

```
Key Patterns:
- user:{userId}:room:{roomId}:last_received → messageId
- room:{roomId}:latest_message_id → messageId
```

**Purpose**: Message delivery tracking and performance optimization
**Features**:

- Lightweight key-value storage
- Fast lookup for missed messages
- Ephemeral data (can be rebuilt from database)

#### Supabase Realtime

**Purpose**: WebSocket-based real-time message broadcasting **Features**:

- Channel-based communication
- Automatic connection management
- Built-in reconnection logic

## Design Decisions

### 1. Hybrid Storage Strategy

**Decision**: Use both Supabase (persistent) and Redis (ephemeral) storage
**Rationale**:

- **Database**: Reliable, queryable, permanent storage
- **Redis**: Fast delivery tracking, minimal memory footprint
- **Best of both**: Reliability + Performance

### 2. Message Deduplication

**Decision**: Client-side deduplication using message IDs **Rationale**:

- Prevents duplicate messages during reconnections
- Simple implementation
- No additional server complexity

### 3. WebSocket Channel Strategy

**Decision**: One channel per room **Rationale**:

- Natural message isolation
- Efficient broadcasting
- Simple subscription management
- Scalable to multiple rooms

## Additional Documentation

For detailed data flow diagrams, message handling, and React Query integration,
see:

- **`DATA_FLOW_ARCHITECTURE.md`** - Complete data flow, message flows, and cache
  synchronization
