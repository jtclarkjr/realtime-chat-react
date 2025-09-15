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
  hget(key: string, field: string): Promise<string | null>
  hset(key: string, field: string, value: string): Promise<number>
  hdel(key: string, ...fields: string[]): Promise<number>
  hgetall(key: string): Promise<Record<string, string>>
  exists(...keys: string[]): Promise<number>
  expire(key: string, seconds: number): Promise<number>
  sadd(key: string, ...members: string[]): Promise<number>
  srem(key: string, ...members: string[]): Promise<number>
  smembers(key: string): Promise<string[]>
  sismember(key: string, member: string): Promise<number>
  publish(channel: string, message: string): Promise<number>
  subscribe(channel: string): Promise<void>
  unsubscribe(channel: string): Promise<void>
  on(event: string, callback: (...args: unknown[]) => void): void
  off(event: string, callback: (...args: unknown[]) => void): void
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

  async hget(key: string, field: string): Promise<string | null> {
    return await this.client.hget(key, field)
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    return await this.client.hset(key, { [field]: value })
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    return await this.client.hdel(key, ...fields)
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const result = await this.client.hgetall(key)
    // Convert unknown values to strings
    const stringRecord: Record<string, string> = {}
    if (result) {
      Object.entries(result).forEach(([k, v]) => {
        stringRecord[k] = String(v)
      })
    }
    return stringRecord
  }

  async exists(...keys: string[]): Promise<number> {
    return await this.client.exists(...keys)
  }

  async expire(key: string, seconds: number): Promise<number> {
    return await this.client.expire(key, seconds)
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    return await this.client.sadd(key, members as [string, ...string[]])
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return await this.client.srem(key, ...members)
  }

  async smembers(key: string): Promise<string[]> {
    return await this.client.smembers(key)
  }

  async sismember(key: string, member: string): Promise<number> {
    const result = await this.client.sismember(key, member)
    return result ? 1 : 0
  }

  // Note: Upstash Redis supports pub/sub in some configurations
  async publish(channel: string, message: string): Promise<number> {
    try {
      return await this.client.publish(channel, message)
    } catch (error) {
      console.warn(
        'Pub/sub may not be supported in this Upstash configuration:',
        error
      )
      return 0
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async subscribe(_channel: string): Promise<void> {
    console.warn(
      'Subscribe operations should be handled through Upstash Redis client directly for pub/sub'
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async unsubscribe(_channel: string): Promise<void> {
    console.warn(
      'Unsubscribe operations should be handled through Upstash Redis client directly for pub/sub'
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  on(_event: string, _callback: (...args: unknown[]) => void): void {
    // No-op for compatibility
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  off(_event: string, _callback: (...args: unknown[]) => void): void {
    // No-op for compatibility
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

  async hget(key: string, field: string): Promise<string | null> {
    return await this.client.hget(key, field)
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    return await this.client.hset(key, field, value)
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    return await this.client.hdel(key, ...fields)
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return await this.client.hgetall(key)
  }

  async exists(...keys: string[]): Promise<number> {
    return await this.client.exists(...keys)
  }

  async expire(key: string, seconds: number): Promise<number> {
    return await this.client.expire(key, seconds)
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    return await this.client.sadd(key, ...members)
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return await this.client.srem(key, ...members)
  }

  async smembers(key: string): Promise<string[]> {
    return await this.client.smembers(key)
  }

  async sismember(key: string, member: string): Promise<number> {
    return await this.client.sismember(key, member)
  }

  async publish(channel: string, message: string): Promise<number> {
    return await this.client.publish(channel, message)
  }

  async subscribe(channel: string): Promise<void> {
    await this.client.subscribe(channel)
  }

  async unsubscribe(channel: string): Promise<void> {
    await this.client.unsubscribe(channel)
  }

  on(event: string, callback: (...args: unknown[]) => void): void {
    this.client.on(event, callback)
  }

  off(event: string, callback: (...args: unknown[]) => void): void {
    this.client.off(event, callback)
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
