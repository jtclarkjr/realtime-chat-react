import Redis from 'ioredis'
import { Redis as UpstashRedis } from '@upstash/redis'

let ioredisClient: Redis | null = null
// Upstash client is created fresh for each adapter instance

// Check if we're running with Upstash/Vercel KV
const hasUpstashConfig = Boolean(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
)

type RedisLike = {
  get(key: string): Promise<string | null>
  set(
    key: string,
    value: string,
    mode?: string,
    duration?: number
  ): Promise<string | null>
  del(...keys: string[]): Promise<number>
  quit?(): Promise<void>
}

class UpstashRedisAdapter implements RedisLike {
  private client: UpstashRedis

  constructor() {
    this.client = UpstashRedis.fromEnv()
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key)
  }

  async set(
    key: string,
    value: string,
    mode?: string,
    duration?: number
  ): Promise<string | null> {
    if (mode === 'EX' && duration) {
      await this.client.setex(key, duration, value)
    } else {
      await this.client.set(key, value)
    }
    return 'OK'
  }

  async del(...keys: string[]): Promise<number> {
    return await this.client.del(...keys)
  }
}

class IoredisAdapter implements RedisLike {
  private client: Redis

  constructor(client: Redis) {
    this.client = client
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key)
  }

  async set(
    key: string,
    value: string,
    mode?: string,
    duration?: number
  ): Promise<string | null> {
    if (mode === 'EX' && duration) {
      await this.client.setex(key, duration, value)
    } else {
      await this.client.set(key, value)
    }
    return 'OK'
  }

  async del(...keys: string[]): Promise<number> {
    return await this.client.del(...keys)
  }

  async quit(): Promise<void> {
    await this.client.quit()
  }
}

export function getRedisClient(): RedisLike {
  // Use Upstash Redis in production or when Upstash config is available
  if (hasUpstashConfig) {
    return new UpstashRedisAdapter()
  }

  // Use ioredis for local development
  if (!ioredisClient) {
    ioredisClient = new Redis(
      process.env.REDIS_URL || 'redis://localhost:6379',
      {
        maxRetriesPerRequest: 3,
        enableReadyCheck: false,
        lazyConnect: true
      }
    )

    ioredisClient.on('error', (error) => {
      console.error('Redis connection error:', error)
    })

    ioredisClient.on('connect', () => {
      console.log('Connected to Redis')
    })
  }

  return new IoredisAdapter(ioredisClient)
}

export async function disconnectRedis(): Promise<void> {
  if (ioredisClient) {
    await ioredisClient.quit()
    ioredisClient = null
  }
  // Upstash client doesn't need explicit disconnection
}
