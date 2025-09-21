import { useState, useEffect, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { useCache, CACHE_KEYS, CACHE_TTL } from './useCache';

interface QueryOptions {
  cache?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
  staleWhileRevalidate?: boolean;
  retryCount?: number;
  retryDelay?: number;
}

interface QueryResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  invalidate: () => void;
}

export function useSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: QueryOptions = {}
) {
  const {
    cache = true,
    cacheKey,
    cacheTTL = CACHE_TTL.MEDIUM,
    staleWhileRevalidate = true,
    retryCount = 3,
    retryDelay = 1000,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryAttempts, setRetryAttempts] = useState(0);

  const executeQuery = useCallback(async (forceRefresh = false) => {
    if (!cacheKey) {
      // Execute query without cache
      setLoading(true);
      setError(null);

      try {
        const result = await queryFn();
        if (result.error) {
          throw new Error(result.error.message);
        }
        setData(result.data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Check cache first
    if (cache && !forceRefresh) {
      const cachedData = useCache.getCache<T>(cacheKey);
      if (cachedData) {
        setData(cachedData);
        return;
      }
    }

    // If staleWhileRevalidate is enabled, return stale data while fetching
    if (staleWhileRevalidate && cache) {
      const staleData = useCache.getCache<T>(cacheKey);
      if (staleData) {
        setData(staleData);
      }
    }

    setLoading(true);
    setError(null);

    try {
      const result = await queryFn();
      if (result.error) {
        throw new Error(result.error.message);
      }

      if (cache && cacheKey) {
        useCache.setCache(cacheKey, result.data, { ttl: cacheTTL });
      }

      setData(result.data);
      setRetryAttempts(0);
    } catch (err) {
      const error = err as Error;
      setError(error);

      // Retry logic
      if (retryAttempts < retryCount) {
        setRetryAttempts(prev => prev + 1);
        setTimeout(() => {
          executeQuery(forceRefresh);
        }, retryDelay * Math.pow(2, retryAttempts)); // Exponential backoff
      }
    } finally {
      setLoading(false);
    }
  }, [queryFn, cache, cacheKey, cacheTTL, staleWhileRevalidate, retryCount, retryDelay, retryAttempts]);

  useEffect(() => {
    executeQuery();
  }, [executeQuery]);

  const refresh = useCallback(async () => {
    await executeQuery(true);
  }, [executeQuery]);

  const invalidate = useCallback(() => {
    if (cacheKey) {
      useCache.deleteCache(cacheKey);
    }
    setData(null);
  }, [cacheKey]);

  return {
    data,
    loading,
    error,
    refresh,
    invalidate,
  };
}

// Hook específico para consultas de dashboard
export function useDashboardStats() {
  const { supabase } = require('@/integrations/supabase/client');

  return useSupabaseQuery(
    async () => {
      const { data, error } = await supabase.rpc('get_dashboard_stats');
      return { data, error };
    },
    {
      cache: true,
      cacheKey: CACHE_KEYS.DASHBOARD_STATS,
      cacheTTL: CACHE_TTL.SHORT,
      staleWhileRevalidate: true,
    }
  );
}

// Hook específico para métricas financeiras
export function useFinancialMetrics(dataInicio: string, dataFim: string) {
  const { supabase } = require('@/integrations/supabase/client');

  return useSupabaseQuery(
    async () => {
      const { data, error } = await supabase.rpc('get_financial_metrics', {
        p_data_inicio: dataInicio,
        p_data_fim: dataFim,
      });
      return { data, error };
    },
    {
      cache: true,
      cacheKey: `${CACHE_KEYS.FINANCIAL_METRICS}_${dataInicio}_${dataFim}`,
      cacheTTL: CACHE_TTL.MEDIUM,
      staleWhileRevalidate: true,
    }
  );
}

// Hook específico para receita mensal
export function useMonthlyRevenue(dataInicio: string, dataFim: string) {
  const { supabase } = require('@/integrations/supabase/client');

  return useSupabaseQuery(
    async () => {
      const { data, error } = await supabase.rpc('get_monthly_revenue', {
        p_data_inicio: dataInicio,
        p_data_fim: dataFim,
      });
      return { data, error };
    },
    {
      cache: true,
      cacheKey: `${CACHE_KEYS.MONTHLY_REVENUE}_${dataInicio}_${dataFim}`,
      cacheTTL: CACHE_TTL.MEDIUM,
      staleWhileRevalidate: true,
    }
  );
}

// Hook específico para receita por cliente
export function useClientRevenue(dataInicio: string, dataFim: string) {
  const { supabase } = require('@/integrations/supabase/client');

  return useSupabaseQuery(
    async () => {
      const { data, error } = await supabase.rpc('get_client_revenue', {
        p_data_inicio: dataInicio,
        p_data_fim: dataFim,
      });
      return { data, error };
    },
    {
      cache: true,
      cacheKey: `${CACHE_KEYS.CLIENT_REVENUE}_${dataInicio}_${dataFim}`,
      cacheTTL: CACHE_TTL.MEDIUM,
      staleWhileRevalidate: true,
    }
  );
}

// Hook específico para receita por produto
export function useProductRevenue(dataInicio: string, dataFim: string) {
  const { supabase } = require('@/integrations/supabase/client');

  return useSupabaseQuery(
    async () => {
      const { data, error } = await supabase.rpc('get_product_revenue', {
        p_data_inicio: dataInicio,
        p_data_fim: dataFim,
      });
      return { data, error };
    },
    {
      cache: true,
      cacheKey: `${CACHE_KEYS.PRODUCT_REVENUE}_${dataInicio}_${dataFim}`,
      cacheTTL: CACHE_TTL.MEDIUM,
      staleWhileRevalidate: true,
    }
  );
}

// Hook para consultas genéricas com cache
export function useCachedQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  cacheKey: string,
  options: Omit<QueryOptions, 'cacheKey'> = {}
) {
  return useSupabaseQuery(queryFn, {
    ...options,
    cacheKey,
    cache: true,
  });
}

// Hook para consultas sem cache
export function useUncachedQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
) {
  return useSupabaseQuery(queryFn, {
    cache: false,
  });
}

// Hook para prefetch de dados
export function usePrefetchQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  cacheKey: string,
  options: Omit<QueryOptions, 'cacheKey'> = {}
) {
  const prefetch = useCallback(async () => {
    try {
      const result = await queryFn();
      if (!result.error && result.data) {
        useCache.setCache(cacheKey, result.data, { ttl: options.cacheTTL || CACHE_TTL.MEDIUM });
      }
    } catch (error) {
      console.error(`Failed to prefetch data for key ${cacheKey}:`, error);
    }
  }, [queryFn, cacheKey, options.cacheTTL]);

  return { prefetch };
}

// Hook para invalidar cache baseado em padrões
export function useCacheInvalidation() {
  const invalidateByPattern = useCallback((pattern: string) => {
    const stats = useCache.getStats();
    // Implementar lógica para invalidar cache por padrão
    // Por enquanto, limpar todo o cache
    useCache.clearCache();
  }, []);

  const invalidateByKeys = useCallback((keys: string[]) => {
    keys.forEach(key => useCache.deleteCache(key));
  }, []);

  return {
    invalidateByPattern,
    invalidateByKeys,
  };
}
