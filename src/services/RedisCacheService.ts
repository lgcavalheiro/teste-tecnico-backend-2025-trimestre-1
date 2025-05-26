import { createClient, RedisClientType } from 'redis';
import { ICacheService } from '../interfaces/ICacheService';

export class RedisCacheService implements ICacheService {
  private client: RedisClientType;
  private static DEFAULT_TTL = 60; // 60 seconds

  constructor(redisUrl: string) {
    this.client = createClient({
      url: redisUrl,
    });
    
    this.client.on('error', (err: Error) => {
      console.error('Redis Client Error:', err);
    });
  }

  async connect(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      await this.ensureConnected();
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Error getting from cache:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number = RedisCacheService.DEFAULT_TTL): Promise<void> {
    try {
      await this.ensureConnected();
      const serializedValue = JSON.stringify(value);
      if (ttlSeconds > 0) {
        await this.client.setEx(key, ttlSeconds, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
    } catch (error) {
      console.error('Error setting cache:', error);
      if (process.env.NODE_ENV !== 'production') {
        throw error;
      }
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.ensureConnected();
      await this.client.del(key);
    } catch (error) {
      console.error('Error deleting from cache:', error);
      if (process.env.NODE_ENV !== 'production') {
        throw error;
      }
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      await this.ensureConnected();
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('Error checking cache key:', error);
      return false;
    }
  }

  private async ensureConnected(): Promise<void> {
    if (!this.client.isOpen) {
      await this.connect();
    }
  }
}
