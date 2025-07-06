
import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { toast } from 'sonner';

interface EnhancedQueryOptions<TData, TError = Error> extends Omit<UseQueryOptions<TData, TError>, 'queryFn'> {
  queryFn: () => Promise<TData>;
  showErrorToast?: boolean;
  retryCount?: number;
  retryDelay?: (attemptIndex: number) => number;
}

interface EnhancedMutationOptions<TData, TError = Error, TVariables = void> 
  extends Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
  invalidateQueries?: string[];
}

export function useEnhancedQuery<TData, TError = Error>(
  options: EnhancedQueryOptions<TData, TError>
) {
  const {
    queryFn,
    showErrorToast = true,
    retryCount = 3,
    retryDelay = (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...queryOptions
  } = options;

  return useQuery({
    ...queryOptions,
    queryFn,
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error instanceof Error && error.message.includes('auth')) {
        return false;
      }
      return failureCount < retryCount;
    },
    retryDelay,
    meta: {
      ...queryOptions.meta,
      errorHandler: (error: TError) => {
        console.error('Enhanced query error:', error);
        
        if (showErrorToast && error instanceof Error) {
          toast.error('Query Failed', {
            description: error.message || 'An unexpected error occurred'
          });
        }
      }
    }
  });
}

export function useEnhancedMutation<TData, TError = Error, TVariables = void>(
  options: EnhancedMutationOptions<TData, TError, TVariables>
) {
  const queryClient = useQueryClient();
  
  const {
    mutationFn,
    showSuccessToast = false,
    showErrorToast = true,
    successMessage = 'Operation completed successfully',
    invalidateQueries = [],
    ...mutationOptions
  } = options;

  return useMutation({
    ...mutationOptions,
    mutationFn,
    onSuccess: (data, variables, context) => {
      // Show success toast
      if (showSuccessToast) {
        toast.success('Success', {
          description: successMessage
        });
      }
      
      // Invalidate specified queries
      invalidateQueries.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });
      
      // Call original onSuccess if provided
      mutationOptions.onSuccess?.(data, variables, context);
    },
    onError: (error: TError, variables, context) => {
      console.error('Enhanced mutation error:', error);
      
      if (showErrorToast && error instanceof Error) {
        let errorMessage = error.message || 'An unexpected error occurred';
        
        // Customize error messages based on common patterns
        if (errorMessage.includes('auth')) {
          errorMessage = 'Authentication failed. Please sign in again.';
        } else if (errorMessage.includes('network')) {
          errorMessage = 'Network error. Please check your connection.';
        } else if (errorMessage.includes('rate limit')) {
          errorMessage = 'Rate limit exceeded. Please try again later.';
        }
        
        toast.error('Operation Failed', {
          description: errorMessage
        });
      }
      
      // Call original onError if provided
      mutationOptions.onError?.(error, variables, context);
    },
    retry: (failureCount, error) => {
      // Don't retry mutations on client errors (4xx)
      if (error instanceof Error && error.message.includes('400')) {
        return false;
      }
      return failureCount < 2; // Retry mutations max 2 times
    }
  });
}

// Specialized hooks for common use cases
export function useAmazonDataQuery<TData>(
  queryKey: string[],
  queryFn: () => Promise<TData>,
  options?: Partial<EnhancedQueryOptions<TData>>
) {
  return useEnhancedQuery({
    queryKey,
    queryFn,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (replaces cacheTime)
    retryCount: 2,
    showErrorToast: true,
    ...options
  });
}

export function useOptimizationMutation<TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<any>,
  options?: Partial<EnhancedMutationOptions<any, Error, TVariables>>
) {
  return useEnhancedMutation({
    mutationFn,
    showSuccessToast: true,
    successMessage: 'Optimization completed successfully',
    invalidateQueries: ['campaigns', 'connections', 'optimization-results'],
    ...options
  });
}
