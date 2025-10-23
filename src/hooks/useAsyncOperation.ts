import { useState, useCallback } from 'react'

interface AsyncOperationState {
  isLoading: boolean
  error: string | null
}

// Generic function type that accepts any parameters and returns a value
// Using unknown[] for parameters and unknown for return type provides type safety
// while maintaining generic flexibility
type AnyFunction = (...args: unknown[]) => unknown

interface AsyncOperationReturn<T extends AnyFunction> {
  execute: (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>
  isLoading: boolean
  error: string | null
  clearError: () => void
}

/**
 * Custom hook for managing async operations with loading and error states
 * Provides a clean interface for handling async operations with proper error handling
 *
 * @param asyncFunction - The async function to execute
 * @param onSuccess - Optional callback on successful completion
 * @param onError - Optional callback on error
 * @returns Object with execute function, loading state, error state, and clearError function
 */
export const useAsyncOperation = <T extends AnyFunction>(
  asyncFunction: T,
  onSuccess?: (result: Awaited<ReturnType<T>>) => void,
  onError?: (error: Error) => void
): AsyncOperationReturn<T> => {
  const [state, setState] = useState<AsyncOperationState>({
    isLoading: false,
    error: null,
  })

  const execute = useCallback(
    async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
      setState({ isLoading: true, error: null })

      try {
        const result = await asyncFunction(...args)
        setState({ isLoading: false, error: null })
        onSuccess?.(result as Awaited<ReturnType<T>>)
        return result as Awaited<ReturnType<T>>
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An error occurred'
        setState({ isLoading: false, error: errorMessage })
        onError?.(error instanceof Error ? error : new Error(errorMessage))
        throw error
      }
    },
    [asyncFunction, onSuccess, onError]
  )

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    execute,
    isLoading: state.isLoading,
    error: state.error,
    clearError,
  }
}
