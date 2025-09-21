import { useState, useEffect, useCallback } from 'react';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  staleWhileRevalidate?: boolean; // Return stale data while fetching new data
}

class CacheManager {
  private cache = new Map<string, CacheItem<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl || this.defaultTTL;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const isExpired = Date.now() - item.timestamp > item.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    const isExpired = Date.now() - item.timestamp > item.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getStale<T>(key: string): T | null {
    const item = this.cache.get(key);
    return item ? item.data : null;
  }

  isStale(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return true;

    return Date.now() - item.timestamp > item.ttl;
  }

  // Cleanup expired items
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    let expired = 0;
    let valid = 0;

    for (const item of this.cache.values()) {
      if (now - item.timestamp > item.ttl) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      total: this.cache.size,
      valid,
      expired,
    };
  }
}

// Global cache instance
const cacheManager = new CacheManager();

// Cleanup expired items every 5 minutes
setInterval(() => {
  cacheManager.cleanup();
}, 5 * 60 * 1000);

export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Check cache first
    if (!forceRefresh && cacheManager.has(key)) {
      const cachedData = cacheManager.get<T>(key);
      if (cachedData) {
        setData(cachedData);
        return;
      }
    }

    // If staleWhileRevalidate is enabled, return stale data while fetching
    if (options.staleWhileRevalidate && !forceRefresh) {
      const staleData = cacheManager.getStale<T>(key);
      if (staleData) {
        setData(staleData);
      }
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      cacheManager.set(key, result, options);
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  const invalidate = useCallback(() => {
    cacheManager.delete(key);
    setData(null);
  }, [key]);

  return {
    data,
    loading,
    error,
    refresh,
    invalidate,
  };
}

// Hook for manual cache management
export function useCacheManager() {
  const setCache = useCallback(<T>(key: string, data: T, options: CacheOptions = {}) => {
    cacheManager.set(key, data, options);
  }, []);

  const getCache = useCallback(<T>(key: string): T | null => {
    return cacheManager.get<T>(key);
  }, []);

  const hasCache = useCallback((key: string): boolean => {
    return cacheManager.has(key);
  }, []);

  const deleteCache = useCallback((key: string): void => {
    cacheManager.delete(key);
  }, []);

  const clearCache = useCallback((): void => {
    cacheManager.clear();
  }, []);

  const getStats = useCallback(() => {
    return cacheManager.getStats();
  }, []);

  return {
    setCache,
    getCache,
    hasCache,
    deleteCache,
    clearCache,
    getStats,
  };
}

// Hook for prefetching data
export function usePrefetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
) {
  const prefetch = useCallback(async () => {
    if (!cacheManager.has(key)) {
      try {
        const data = await fetcher();
        cacheManager.set(key, data, options);
      } catch (error) {
        console.error(`Failed to prefetch data for key ${key}:`, error);
      }
    }
  }, [key, fetcher, options]);

  return { prefetch };
}

// Cache keys constants
export const CACHE_KEYS = {
  DASHBOARD_STATS: 'dashboard_stats',
  FINANCIAL_METRICS: 'financial_metrics',
  MONTHLY_REVENUE: 'monthly_revenue',
  CLIENT_REVENUE: 'client_revenue',
  PRODUCT_REVENUE: 'product_revenue',
  ORDENS_SERVICO: 'ordens_servico',
  CLIENTES: 'clientes',
  COLABORADORES: 'colaboradores',
  PRODUTOS: 'produtos',
  USUARIOS: 'usuarios',
  PERMISSOES: 'permissoes',
  AUDITORIA: 'auditoria',
  NOTIFICACOES: 'notificacoes',
} as const;

// Cache TTL constants
export const CACHE_TTL = {
  SHORT: 1 * 60 * 1000, // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 15 * 60 * 1000, // 15 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
} as const;

export default cacheManager;
