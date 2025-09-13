# Realtime Chat Application

A modern, real-time chat application built with Next.js, Supabase, and Redis.
Features instant messaging, message persistence, and reconnection handling.

## Features

- **Real-time messaging** using Supabase Realtime
- **Message persistence** with automatic message history loading
- **Redis caching** for improved performance and message tracking
- **Reconnection handling** with missed message recovery
- **Responsive design** with Tailwind CSS
- **TypeScript** for type safety
- **Multiple room support** with isolated conversations

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS v4, Radix UI components
- **Real-time**: Supabase Realtime (WebSocket)
- **Database**: Supabase (PostgreSQL)
- **Caching**: Redis
- **State Management**: Zustand
- **Package Manager**: Bun

## Prerequisites

- Node.js 22+
- Bun package manager
- Docker and Docker Compose (for Redis)
- Supabase account and project

## Environment Setup

1. Create a `.env.local` file in the root directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Redis Configuration
REDIS_URL=redis://localhost:6379
```

## Database Setup

Set up the following tables in your Supabase database:

```sql
-- Messages table
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Anyone can insert messages" ON messages FOR INSERT WITH CHECK (true);
```

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd realtime-chat/react
```

2. Install dependencies:

```bash
bun install
```

3. Start Redis using Docker:

```bash
bun run docker:up
```

4. Start the development server:

```bash
bun run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

### Development

- `bun run dev` - Start development server with Turbopack
- `bun run dev:instance1` - Start on port 3000 (for testing multiple instances)
- `bun run dev:instance2` - Start on port 3001 (for testing multiple instances)

### Build & Production

- `bun run build` - Build the application for production
- `bun run start` - Start the production server

### Code Quality

- `bun run lint` - Run ESLint and TypeScript checks
- `bun run prettier` - Format code with Prettier

### Docker & Redis

- `bun run docker:up` - Start Redis container
- `bun run docker:down` - Stop Redis container
- `bun run docker:logs` - View Redis logs
- `bun run docker:debug` - Start with Redis Commander UI
- `bun run dev:docker` - Start Redis and development server together
- `bun run redis:cli` - Access Redis CLI

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── messages/      # Message handling
│   │   └── rooms/         # Room management
│   ├── layout.tsx         # Root layout
│   └── page.tsx          # Main chat interface
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── chat-message.tsx  # Individual message component
│   └── realtime-chat.tsx # Main chat component
├── hooks/                 # Custom React hooks
│   ├── use-chat-scroll.tsx    # Auto-scroll functionality
│   └── use-realtime-chat.tsx  # Real-time chat logic
├── lib/                   # Utility libraries
│   ├── redis/            # Redis client and utilities
│   ├── services/         # Business logic services
│   ├── stores/           # Zustand state stores
│   ├── supabase/         # Supabase client configuration
│   └── types/            # TypeScript type definitions
└── docker-compose.yml     # Redis container configuration
```

## Key Components

### RealtimeChat

Main chat component handling message display, sending, and real-time updates.

### useRealtimeChat Hook

Custom hook managing:

- WebSocket connections
- Message state
- Missed message recovery
- Real-time subscriptions

### Redis Integration

Used for:

- Message delivery tracking
- Caching recent messages
- Connection state management

## Testing Multiple Instances

To test real-time functionality:

1. Start multiple development instances:

```bash
# Terminal 1
bun run dev:instance1

# Terminal 2
bun run dev:instance2
```

2. Open both URLs:
   - http://localhost:3000
   - http://localhost:3001

3. Join the same room with different usernames to test real-time messaging.

## Redis Commander (Debug Mode)

To monitor Redis in development:

```bash
bun run docker:debug
```

Access Redis Commander at [http://localhost:8081](http://localhost:8081)

## Deployment

### Environment Variables

Ensure all environment variables are set in your deployment platform.

### Database

Run the database setup SQL in your production Supabase instance.

### Redis

Set up a Redis instance (Redis Cloud, Railway, etc.) and update `REDIS_URL`.

## License

MIT License - see LICENSE file for details.
