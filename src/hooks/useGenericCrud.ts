import { useQuery, useMutation, useInfiniteQuery, useQueryClient, QueryKey } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCallback, useMemo } from 'react';

interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  has_more: boolean;
  total?: number;
}

interface CrudOperations<T extends BaseEntity, TFilters = Record<string, any>, TCreatePayload = Partial<T>, TUpdatePayload = Partial<T>> {
  // Core operations
  fetchItems: (filters: TFilters, limit: number, offset: number) => Promise<PaginatedResponse<T>>;
  fetchItem: (id: string) => Promise<T>;
  createItem: (payload: TCreatePayload) => Promise<T>;
  updateItem: (id: string, payload: TUpdatePayload) => Promise<T>;
  deleteItem: (id: string) => Promise<void>;

  // Optional operations
  searchItems?: (query: string) => Promise<T[]>;
  bulkUpdate?: (ids: string[], payload: TUpdatePayload) => Promise<T[]>;
}

interface CrudConfig {
  entityName: string;
  queryKeys: {
    list: (filters?: any) => QueryKey;
    item: (id: string) => QueryKey;
    search: (query: string) => QueryKey;
  };
  defaultLimit?: number;
  staleTime?: number;
  cacheTime?: number;
}

export function useGenericCrud<
  T extends BaseEntity,
  TFilters = Record<string, any>,
  TCreatePayload = Partial<T>,
  TUpdatePayload = Partial<T>
>(
  operations: CrudOperations<T, TFilters, TCreatePayload, TUpdatePayload>,
  config: CrudConfig
) {
  const queryClient = useQueryClient();
  const { entityName, queryKeys, defaultLimit = 20, staleTime = 5 * 60 * 1000 } = config;

  // Memoized operations to prevent recreating functions
  const memoizedOperations = useMemo(() => operations, [operations]);

  // List hook with infinite scroll
  const useList = useCallback((filters: TFilters = {} as TFilters) => {
    return useInfiniteQuery({
      queryKey: queryKeys.list(filters),
      queryFn: async ({ pageParam = 0 }) => {
        return memoizedOperations.fetchItems(filters, defaultLimit, pageParam * defaultLimit);
      },
      getNextPageParam: (lastPage, allPages) => {
        return lastPage.has_more ? allPages.length : undefined;
      },
      initialPageParam: 0,
      staleTime,
      enabled: true,
    });
  }, [queryKeys, memoizedOperations, defaultLimit, staleTime]);

  // Single item hook
  const useItem = useCallback((id: string) => {
    return useQuery({
      queryKey: queryKeys.item(id),
      queryFn: () => memoizedOperations.fetchItem(id),
      enabled: !!id,
      staleTime,
    });
  }, [queryKeys, memoizedOperations, staleTime]);

  // Search hook
  const useSearch = useCallback((query: string) => {
    return useQuery({
      queryKey: queryKeys.search(query),
      queryFn: () => memoizedOperations.searchItems!(query),
      enabled: !!query.trim() && !!memoizedOperations.searchItems && query.length > 2,
      staleTime: 30 * 1000, // Shorter stale time for search
    });
  }, [queryKeys, memoizedOperations]);

  // Create mutation
  const useCreate = useCallback(() => {
    return useMutation({
      mutationFn: (payload: TCreatePayload) => memoizedOperations.createItem(payload),
      onSuccess: (newItem) => {
        // Invalidate list queries
        queryClient.invalidateQueries({ queryKey: queryKeys.list() });

        // Add to cache
        queryClient.setQueryData(queryKeys.item(newItem.id), newItem);

        toast.success(`${entityName} created successfully!`);
      },
      onError: (error: any) => {
        console.error(`Create ${entityName} error:`, error);
        toast.error(error.message || `Failed to create ${entityName.toLowerCase()}`);
      },
    });
  }, [queryClient, queryKeys, memoizedOperations, entityName]);

  // Update mutation
  const useUpdate = useCallback(() => {
    return useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: TUpdatePayload }) =>
        memoizedOperations.updateItem(id, payload),
      onSuccess: (updatedItem) => {
        // Update item cache
        queryClient.setQueryData(queryKeys.item(updatedItem.id), updatedItem);

        // Invalidate list queries to refetch with updated data
        queryClient.invalidateQueries({ queryKey: queryKeys.list() });

        toast.success(`${entityName} updated successfully!`);
      },
      onError: (error: any) => {
        console.error(`Update ${entityName} error:`, error);
        toast.error(error.message || `Failed to update ${entityName.toLowerCase()}`);
      },
    });
  }, [queryClient, queryKeys, memoizedOperations, entityName]);

  // Delete mutation
  const useDelete = useCallback(() => {
    return useMutation({
      mutationFn: (id: string) => memoizedOperations.deleteItem(id),
      onSuccess: (_, deletedId) => {
        // Remove from cache
        queryClient.removeQueries({ queryKey: queryKeys.item(deletedId) });

        // Invalidate list queries
        queryClient.invalidateQueries({ queryKey: queryKeys.list() });

        toast.success(`${entityName} deleted successfully`);
      },
      onError: (error: any) => {
        console.error(`Delete ${entityName} error:`, error);
        toast.error(error.message || `Failed to delete ${entityName.toLowerCase()}`);
      },
    });
  }, [queryClient, queryKeys, memoizedOperations, entityName]);

  // Bulk operations
  const useBulkUpdate = useCallback(() => {
    if (!memoizedOperations.bulkUpdate) {
      throw new Error('Bulk update operation not provided');
    }

    return useMutation({
      mutationFn: ({ ids, payload }: { ids: string[]; payload: TUpdatePayload }) =>
        memoizedOperations.bulkUpdate!(ids, payload),
      onSuccess: (updatedItems) => {
        // Update individual item caches
        updatedItems.forEach(item => {
          queryClient.setQueryData(queryKeys.item(item.id), item);
        });

        // Invalidate list queries
        queryClient.invalidateQueries({ queryKey: queryKeys.list() });

        toast.success(`${updatedItems.length} ${entityName.toLowerCase()}s updated successfully!`);
      },
      onError: (error: any) => {
        console.error(`Bulk update ${entityName} error:`, error);
        toast.error(error.message || `Failed to update ${entityName.toLowerCase()}s`);
      },
    });
  }, [queryClient, queryKeys, memoizedOperations, entityName]);

  // Cache utilities
  const cacheUtils = useMemo(() => ({
    prefetchItem: (id: string) => {
      return queryClient.prefetchQuery({
        queryKey: queryKeys.item(id),
        queryFn: () => memoizedOperations.fetchItem(id),
        staleTime,
      });
    },

    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.list() });
    },

    invalidateItem: (id: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.item(id) });
    },

    setItemData: (id: string, data: T) => {
      queryClient.setQueryData(queryKeys.item(id), data);
    },

    getItemData: (id: string): T | undefined => {
      return queryClient.getQueryData(queryKeys.item(id));
    },
  }), [queryClient, queryKeys, memoizedOperations, staleTime]);

  return {
    // Query hooks
    useList,
    useItem,
    useSearch,

    // Mutation hooks
    useCreate,
    useUpdate,
    useDelete,
    useBulkUpdate: memoizedOperations.bulkUpdate ? useBulkUpdate : undefined,

    // Cache utilities
    cache: cacheUtils,
  };
}

// Utility function to create standard query keys
export function createQueryKeys(entityName: string) {
  return {
    list: (filters?: any) => [entityName, 'list', filters] as const,
    item: (id: string) => [entityName, 'item', id] as const,
    search: (query: string) => [entityName, 'search', query] as const,
  };
}

// Helper for common Supabase operations
export const supabaseOperations = {
  createFetcher: <T>(tableName: string) => ({
    async fetchItems(filters: Record<string, any> = {}, limit: number, offset: number): Promise<PaginatedResponse<T>> {
      let query = supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (key === 'search') {
            query = query.textSearch('search', value);
          } else {
            query = query.eq(key, value);
          }
        }
      });

      const { data, error, count } = await query;

      if (error) {
        console.error(`Error fetching ${tableName}:`, error);
        throw error;
      }

      return {
        data: data || [],
        has_more: (offset + limit) < (count || 0),
        total: count || 0,
      };
    },

    async fetchItem(id: string): Promise<T> {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error(`Error fetching ${tableName} item:`, error);
        throw error;
      }

      return data;
    },

    async createItem(payload: any): Promise<T> {
      const { data, error } = await supabase
        .from(tableName)
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error(`Error creating ${tableName} item:`, error);
        throw error;
      }

      return data;
    },

    async updateItem(id: string, payload: any): Promise<T> {
      const { data, error } = await supabase
        .from(tableName)
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Error updating ${tableName} item:`, error);
        throw error;
      }

      return data;
    },

    async deleteItem(id: string): Promise<void> {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`Error deleting ${tableName} item:`, error);
        throw error;
      }
    },

    async searchItems(query: string): Promise<T[]> {
      if (!query.trim()) return [];

      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .textSearch('search', query)
        .limit(10);

      if (error) {
        console.error(`Error searching ${tableName}:`, error);
        throw error;
      }

      return data || [];
    },
  }),
};