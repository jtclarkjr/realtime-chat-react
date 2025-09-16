/**
 * Redis client interface that defines the minimal set of operations
 * needed by the realtime chat application
 */
export interface RedisLike {
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
