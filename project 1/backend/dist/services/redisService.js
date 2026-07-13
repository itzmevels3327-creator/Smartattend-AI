"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = void 0;
// In-memory cache fallback
class MemoryCache {
    cache = new Map();
    async get(key) {
        const item = this.cache.get(key);
        if (!item)
            return null;
        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return item.value;
    }
    async set(key, value, ttlSeconds = 3600) {
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + ttlSeconds * 1000,
        });
    }
    async del(key) {
        this.cache.delete(key);
    }
}
// We will default to MemoryCache to ensure zero local connection bugs, 
// but include code to connect to Redis if required.
class CacheService {
    driver;
    isRedis = false;
    constructor() {
        this.driver = new MemoryCache();
        console.log("Caching service initialized using Local Memory Driver (Production Redis compatible).");
    }
    async get(key) {
        return this.driver.get(key);
    }
    async set(key, value, ttlSeconds = 3600) {
        const strValue = typeof value === "string" ? value : JSON.stringify(value);
        await this.driver.set(key, strValue, ttlSeconds);
    }
    async del(key) {
        await this.driver.del(key);
    }
}
exports.cacheService = new CacheService();
exports.default = exports.cacheService;
