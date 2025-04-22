import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';

interface CacheOptions {
  url: string;
  ttl?: number; // Default TTL in seconds
  prefix?: string; // Key prefix for namespacing
  enableCompression?: boolean; // Enable compression for large values
}

interface CacheSetOptions {
  ttl?: number; // Override default TTL
  tags?: string[]; // Tags for cache invalidation
}

/**
 * Redis-based caching service
 */
export class CacheService {
  private client: RedisClientType;
  private isReady: boolean = false;
  private defaultTtl: number;
  private keyPrefix: string;
  private enableCompression: boolean;

  constructor(options: CacheOptions) {
    this.defaultTtl = options.ttl || 3600; // Default 1 hour
    this.keyPrefix = options.prefix || '';
    this.enableCompression = options.enableCompression || false;

    this.client = createClient({
      url: options.url,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
      }
    });

    this.client.on('error', (err) => {
      logger.error('Redis cache error', { error: err.message });
    });

    this.client.on('connect', () => {
      logger.info('Connected to Redis cache');
    });

    this.client.on('ready', () => {
      this.isReady = true;
      logger.info('Redis cache is ready');
    });

    this.client.connect().catch((err) => {
      logger.error('Failed to connect to Redis cache', { error: err.message });
    });
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isReady) {
      logger.warn('Redis cache not ready, skipping get operation');
      return null;
    }

    try {
      const fullKey = this.getFullKey(key);
      const data = await this.client.get(fullKey);

      if (!data) {
        return null;
      }

      return this.deserialize<T>(data);
    } catch (error) {
      logger.error(`Cache get error for key: ${key}`, { error });
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<boolean> {
    if (!this.isReady) {
      logger.warn('Redis cache not ready, skipping set operation');
      return false;
    }

    try {
      const fullKey = this.getFullKey(key);
      const ttl = options?.ttl || this.defaultTtl;
      const serializedValue = this.serialize(value);

      // Store the value with expiration
      await this.client.set(fullKey, serializedValue, { EX: ttl });

      // If tags are provided, associate this key with the tags
      if (options?.tags && options.tags.length > 0) {
        await this.associateKeyWithTags(fullKey, options.tags);
      }

      return true;
    } catch (error) {
      logger.error(`Cache set error for key: ${key}`, { error });
      return false;
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<boolean> {
    if (!this.isReady) {
      logger.warn('Redis cache not ready, skipping delete operation');
      return false;
    }

    try {
      const fullKey = this.getFullKey(key);
      await this.client.del(fullKey);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key: ${key}`, { error });
      return false;
    }
  }

  /**
   * Invalidate cache by tag
   */
  async invalidateByTag(tag: string): Promise<boolean> {
    if (!this.isReady) {
      logger.warn('Redis cache not ready, skipping invalidation operation');
      return false;
    }

    try {
      const tagKey = `tag:${tag}`;
      
      // Get all keys associated with this tag
      const keys = await this.client.sMembers(tagKey);
      
      if (keys.length > 0) {
        // Delete all keys
        await this.client.del(keys);
        
        // Delete the tag set itself
        await this.client.del(tagKey);
      }
      
      return true;
    } catch (error) {
      logger.error(`Cache invalidation error for tag: ${tag}`, { error });
      return false;
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isReady) {
      logger.warn('Redis cache not ready, skipping exists operation');
      return false;
    }

    try {
      const fullKey = this.getFullKey(key);
      return (await this.client.exists(fullKey)) === 1;
    } catch (error) {
      logger.error(`Cache exists error for key: ${key}`, { error });
      return false;
    }
  }

  /**
   * Close the Redis connection
   */
  async close(): Promise<void> {
    if (this.isReady) {
      await this.client.quit();
      this.isReady = false;
      logger.info('Redis cache connection closed');
    }
  }

  /**
   * Get the full key with prefix
   */
  private getFullKey(key: string): string {
    return this.keyPrefix ? `${this.keyPrefix}:${key}` : key;
  }

  /**
   * Serialize a value for storage
   */
  private serialize<T>(value: T): string {
    const stringValue = JSON.stringify(value);
    
    // If compression is enabled and the value is large, compress it
    // This would be implemented with a compression library
    
    return stringValue;
  }

  /**
   * Deserialize a value from storage
   */
  private deserialize<T>(value: string): T {
    // If compression was used, decompress first
    // This would be implemented with a compression library
    
    return JSON.parse(value) as T;
  }

  /**
   * Associate a key with tags for invalidation
   */
  private async associateKeyWithTags(key: string, tags: string[]): Promise<void> {
    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      await this.client.sAdd(tagKey, key);
    }
  }
}