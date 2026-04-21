/* ═══════════════════════════════════════════════
   cache.js — In-memory TTL cache (Redis-compatible interface)
   Drop-in replacement: swap get/set/del for ioredis calls in prod
   ═══════════════════════════════════════════════ */

const store = new Map(); // key → { value, expiresAt }

const cache = {
  /**
   * Get a cached value. Returns null if missing or expired.
   */
  get(key) {
    const entry = store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return entry.value;
  },

  /**
   * Set a value with optional TTL in seconds.
   * @param {string} key
   * @param {any} value
   * @param {number} ttlSeconds — default 300s (5 min)
   */
  set(key, value, ttlSeconds = 300) {
    store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
      createdAt: Date.now()
    });
  },

  /**
   * Delete a key.
   */
  del(key) {
    store.delete(key);
  },

  /**
   * Check if key exists and is not expired.
   */
  has(key) {
    return this.get(key) !== null;
  },

  /**
   * Get or compute: if key exists return it, else run fn and cache result.
   */
  async getOrSet(key, fn, ttlSeconds = 300) {
    const cached = this.get(key);
    if (cached !== null) return cached;
    const fresh = await fn();
    if (fresh !== null && fresh !== undefined) {
      this.set(key, fresh, ttlSeconds);
    }
    return fresh;
  },

  /**
   * Clear all expired entries (run periodically).
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        store.delete(key);
      }
    }
  },

  /**
   * Stats for /api/health.
   */
  stats() {
    return { size: store.size, keys: [...store.keys()] };
  }
};

// Auto-cleanup every 5 minutes
setInterval(() => cache.cleanup(), 5 * 60 * 1000);

export default cache;
