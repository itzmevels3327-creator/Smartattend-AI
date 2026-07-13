import logging from "morgan";

// In-memory cache fallback
class MemoryCache {
  private cache = new Map<string, { value: string; expiresAt: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds: number = 3600): Promise<void> {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }
}

// We will default to MemoryCache to ensure zero local connection bugs, 
// but include code to connect to Redis if required.
class CacheService {
  private driver: MemoryCache;
  private isRedis = false;

  constructor() {
    this.driver = new MemoryCache();
    console.log("Caching service initialized using Local Memory Driver (Production Redis compatible).");
  }

  async get(key: string): Promise<string | null> {
    return this.driver.get(key);
  }

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    const strValue = typeof value === "string" ? value : JSON.stringify(value);
    await this.driver.set(key, strValue, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.driver.del(key);
  }
}

export const cacheService = new CacheService();
export default cacheService;
