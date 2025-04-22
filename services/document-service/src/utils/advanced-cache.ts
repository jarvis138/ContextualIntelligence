import { createClient, RedisClientType } from 'redis';
import { LRUCache } from 'lru-cache';
import { logger } from './logger';
import { config } from '../config';

/**
 * Multi-level caching system with:
 * - L1: In-memory LRU cache
 * - L2: Redis distributed cache
 * - L3: CDN cache (handled separately)
 */
export class AdvancedCacheService {
  private redisClient: RedisClientType;
  private memoryCache: LRUCache<string, any>;
  private isRedisReady: boolean = false;

  constructor() {
    // Initialize in-memory LRU cache
    this.memoryCache = new LRUCache({
      max: config.cache.memory.maxItems || 1000,
      ttl: (config.cache.memory.ttl || 300) * 1000, // Convert to milliseconds
      updateAgeOnGet: true,
      allowStale: false
    });

    // Initialize Redis client if enabled
    if (config.cache.redis.enabled) {
      this.redisClient = createClient({
        url: config.cache.redis.url,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
        }
      });

      this.redisClient.on('error', (err) => {
        logger.error('Redis cache error', { error: err.message });
        this.isRedisReady = false;
      });

      this.redisClient.on('connect', () => {
        logger.info('Connected to Redis cache');
      });

      this.redisClient.on('ready', () => {
        this.isRedisReady = true;
        logger.info('Redis cache is ready');
      });

      this.redisClient.connect().catch((err) => {
        logger.error('Failed to connect to Redis cache', { error: err.message });
      });
    }
  }

  /**
   * Generate a cache key with namespace
   */
  private getCacheKey(key: string, namespace: string = 'default'): string {
    return `${namespace}:${key}`;
  }

  /**
   * Get a value from cache with multi-level fallback
   */
  async get<T>(key: string, namespace: string = 'default'): Promise<T | null> {
    const cacheKey = this.getCacheKey(key, namespace);
    
    try {
      // Try L1 cache first (in-memory)
      const memoryResult = this.memoryCache.get(cacheKey) as T | undefined;
      if (memoryResult !== undefined) {
        logger.debug('Cache hit (L1/memory)', { key: cacheKey });
        return memoryResult;
      }
      
      // If Redis is enabled and ready, try L2 cache
      if (config.cache.redis.enabled && this.isRedisReady) {
        const redisResult = await this.redisClient.get(cacheKey);
        if (redisResult) {
          logger.debug('Cache hit (L2/Redis)', { key: cacheKey });
          
          // Parse the result
          const parsed = JSON.parse(redisResult) as T;
          
          // Store in L1 cache for future requests
          this.memoryCache.set(cacheKey, parsed);
          
          return parsed;
        }
      }
      
      // Cache miss
      logger.debug('Cache miss', { key: cacheKey });
      return null;
    } catch (error) {
      logger.error('Error getting from cache', { key: cacheKey, error });
      return null;
    }
  }

  /**
   * Set a value in cache at multiple levels
   */
  async set<T>(
    key: string, 
    value: T, 
    options: { 
      namespace?: string; 
      ttl?: number; 
      tags?: string[];
      skipL1?: boolean;
      skipL2?: boolean;
    } = {}
  ): Promise<boolean> {
    const {
      namespace = 'default',
      ttl,
      tags = [],
      skipL1 = false,
      skipL2 = false
    } = options;
    
    const cacheKey = this.getCacheKey(key, namespace);
    
    try {
      // Set in L1 cache (in-memory)
      if (!skipL1) {
        this.memoryCache.set(cacheKey, value, {
          ttl: ttl ? ttl * 1000 : undefined // Convert to milliseconds if provided
        });
      }
      
      // Set in L2 cache (Redis) if enabled and ready
      if (!skipL2 && config.cache.redis.enabled && this.isRedisReady) {
        const serializedValue = JSON.stringify(value);
        const redisTtl = ttl || config.cache.redis.ttl || 3600; // Default 1 hour
        
        await this.redisClient.set(cacheKey, serializedValue, {
          EX: redisTtl
        });
        
        // Associate with tags if provided
        if (tags.length > 0) {
          await this.associateWithTags(cacheKey, tags);
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Error setting cache', { key: cacheKey, error });
      return false;
    }
  }

  /**
   * Delete a value from all cache levels
   */
  async delete(key: string, namespace: string = 'default'): Promise<boolean> {
    const cacheKey = this.getCacheKey(key, namespace);
    
    try {
      // Delete from L1 cache
      this.memoryCache.delete(cacheKey);
      
      // Delete from L2 cache if enabled and ready
      if (config.cache.redis.enabled && this.isRedisReady) {
        await this.redisClient.del(cacheKey);
      }
      
      return true;
    } catch (error) {
      logger.error('Error deleting from cache', { key: cacheKey, error });
      return false;
    }
  }

  /**
   * Invalidate cache by tag
   */
  async invalidateByTag(tag: string): Promise<boolean> {
    try {
      if (!config.cache.redis.enabled || !this.isRedisReady) {
        logger.warn('Redis not available for tag invalidation', { tag });
        return false;
      }
      
      const tagKey = `tag:${tag}`;
      
      // Get all keys associated with this tag
      const keys = await this.redisClient.sMembers(tagKey);
      
      if (keys.length > 0) {
        // Delete from L1 cache
        for (const key of keys) {
          this.memoryCache.delete(key);
        }
        
        // Delete from L2 cache
        await this.redisClient.del(keys);
        
        // Delete the tag set itself
        await this.redisClient.del(tagKey);
        
        logger.info('Invalidated cache by tag', { tag, keyCount: keys.length });
      }
      
      return true;
    } catch (error) {
      logger.error('Error invalidating cache by tag', { tag, error });
      return false;
    }
  }

  /**
   * Invalidate cache by namespace
   */
  async invalidateByNamespace(namespace: string): Promise<boolean> {
    try {
      if (!config.cache.redis.enabled || !this.isRedisReady) {
        logger.warn('Redis not available for namespace invalidation', { namespace });
        
        // Clear memory cache items in this namespace
        const namespacePrefix = `${namespace}:`;
        for (const key of this.memoryCache.keys()) {
          if (key.startsWith(namespacePrefix)) {
            this.memoryCache.delete(key);
          }
        }
        
        return true;
      }
      
      // Find all keys in this namespace
      const keys = await this.redisClient.keys(`${namespace}:*`);
      
      if (keys.length > 0) {
        // Delete from L1 cache
        for (const key of keys) {
          this.memoryCache.delete(key);
        }
        
        // Delete from L2 cache
        await this.redisClient.del(keys);
        
        logger.info('Invalidated cache by namespace', { namespace, keyCount: keys.length });
      }
      
      return true;
    } catch (error) {
      logger.error('Error invalidating cache by namespace', { namespace, error });
      return false;
    }
  }

  /**
   * Prefetch and cache data
   */
  async prefetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: {
      namespace?: string;
      ttl?: number;
      tags?: string[];
    } = {}
  ): Promise<T> {
    const { namespace = 'default', ttl, tags = [] } = options;
    
    try {
      // Fetch the data
      const data = await fetchFn();
      
      // Cache the result
      await this.set(key, data, { namespace, ttl, tags });
      
      return data;
    } catch (error) {
      logger.error('Error prefetching data', { key, namespace, error });
      throw error;
    }
  }

  /**
   * Get or set cache value (with automatic fetching if missing)
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: {
      namespace?: string;
      ttl?: number;
      tags?: string[];
      forceRefresh?: boolean;
    } = {}
  ): Promise<T> {
    const { 
      namespace = 'default', 
      ttl, 
      tags = [],
      forceRefresh = false
    } = options;
    
    // If force refresh, skip cache lookup
    if (!forceRefresh) {
      // Try to get from cache first
      const cachedValue = await this.get<T>(key, namespace);
      if (cachedValue !== null) {
        return cachedValue;
      }
    }
    
    // Cache miss or force refresh, fetch the data
    const data = await fetchFn();
    
    // Cache the result
    await this.set(key, data, { namespace, ttl, tags });
    
    return data;
  }

  /**
   * Associate a key with tags for invalidation
   */
  private async associateWithTags(key: string, tags: string[]): Promise<void> {
    if (!config.cache.redis.enabled || !this.isRedisReady) {
      return;
    }
    
    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      await this.redisClient.sAdd(tagKey, key);
      
      // Set expiry on tag to avoid orphaned tag sets
      // Use a longer TTL than the cache items
      const tagTtl = (config.cache.redis.ttl || 3600) * 2;
      await this.redisClient.expire(tagKey, tagTtl);
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    if (config.cache.redis.enabled && this.isRedisReady) {
      await this.redisClient.quit();
      this.isRedisReady = false;
    }
  }
}

// Export singleton instance
export const advancedCache = new AdvancedCacheService();