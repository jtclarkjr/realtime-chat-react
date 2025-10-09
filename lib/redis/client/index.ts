import Redis from 'ioredis'
import { Redis as UpstashRedis } from '@upstash/redis'
import { RedisLike } from './types'
import { hasUpstashConfig, REDIS_CONFIG } from './constants'

let ioredisClient: Redis | null = null
// Upstash client is created fresh for each adapter instance

class UpstashRedisAdapter implements RedisLike {
  private client: UpstashRedis

  constructor() {
    this.client = UpstashRedis.fromEnv()
  }

  async get(key: string): Promise<string | null> {
    const result = await this.client.get(key)
    // Upstash Redis automatically deserializes JSON, but we need strings
    // to maintain compatibility with our cache service
    if (result === null || result === undefined) {
      return null
    }
    // If it's already a string, return it as-is
    if (typeof result === 'string') {
      return result
    }
    // If it's an object, serialize it back to a string
    return JSON.stringify(result)
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
    ioredisClient = new Redis(REDIS_CONFIG.url, {
      maxRetriesPerRequest: REDIS_CONFIG.maxRetriesPerRequest,
      enableReadyCheck: REDIS_CONFIG.enableReadyCheck,
      lazyConnect: REDIS_CONFIG.lazyConnect
    })

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
