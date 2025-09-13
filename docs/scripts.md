# Docker Development Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f redis",
    "docker:debug": "docker-compose --profile debug up -d",
    "dev:docker": "docker-compose up -d && bun dev",
    "redis:cli": "docker exec -it realtime-chat-redis redis-cli"
  }
}
```

## Usage:

- `bun run docker:up` - Start Redis in background
- `bun run docker:down` - Stop and remove containers
- `bun run docker:debug` - Start Redis + Redis Commander (UI at
  http://localhost:8081)
- `bun run dev:docker` - Start Redis and Next.js dev server
- `bun run redis:cli` - Connect to Redis CLI for debugging
