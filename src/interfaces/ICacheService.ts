export interface ICacheService {
  /**
   * Get a value from cache
   * @param key The cache key
   * @returns The cached value or null if not found/expired
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a value in cache with TTL
   * @param key The cache key
   * @param value The value to cache
   * @param ttlSeconds Time to live in seconds (default: 60)
   * @returns Promise that resolves when the value is cached
   */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /**
   * Delete a value from cache
   * @param key The cache key to delete
   * @returns Promise that resolves when the key is deleted
   */
  del(key: string): Promise<void>;

  /**
   * Check if a key exists in cache
   * @param key The cache key to check
   * @returns Promise that resolves to true if key exists and is not expired
   */
  has(key: string): Promise<boolean>;
}
