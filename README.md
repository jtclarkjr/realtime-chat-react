# Realtime Chat Application

A modern, real-time chat application built with Next.js, Supabase, and Redis.
Features instant messaging, message persistence, and reconnection handling.

**Live Demo**:
[https://realtime-chat-react-psi.vercel.app](https://realtime-chat-react-psi.vercel.app)

## Features

- **Real-time messaging** using Supabase Realtime
- **Message persistence** with automatic message history loading
- **Redis/Vercel KV caching** for improved performance and message tracking
- **Reconnection handling** with missed message recovery
- **Responsive design** with Tailwind CSS
- **TypeScript** for type safety
- **Multiple room support** with isolated conversations
- **Production deployment** on Vercel with KV storage

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS v4, Radix UI components
- **Real-time**: Supabase Realtime (WebSocket)
- **Database**: Supabase (PostgreSQL)
- **Caching**: Redis (local) / Vercel KV (production)
- **State Management**: Zustand
- **Package Manager**: Bun
- **Deployment**: Vercel with KV storage

## Prerequisites

- Node.js 22+
- Bun package manager
- Docker and Docker Compose (for local Redis development)
- Supabase account and project
- Vercel account (for deployment)

## Environment Setup

1. Create a `.env.local` file in the root directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Redis Configuration (Local Development)
REDIS_URL=redis://localhost:6379

# Vercel KV Configuration (Production - Auto-configured)
# KV_REST_API_URL=your_vercel_kv_rest_api_url
# KV_REST_API_TOKEN=your_vercel_kv_rest_api_token
# KV_REST_API_READ_ONLY_TOKEN=your_vercel_kv_read_only_token
# KV_URL=your_vercel_kv_url
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

### Redis/Vercel KV Integration

Used for:

- Message delivery tracking
- Caching recent messages
- Connection state management
- Automatic environment switching (Redis locally, Vercel KV in production)

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

This application is deployed on Vercel with automatic KV storage integration.

### Database Setup

Run the database setup SQL in your production Supabase instance.

### Redis/KV Architecture

- **Local Development**: Uses Docker Redis container
- **Production**: Automatically uses Vercel KV (Upstash Redis)
- **Automatic Detection**: Client switches based on environment variables

## License

MIT License - see LICENSE file for details.
