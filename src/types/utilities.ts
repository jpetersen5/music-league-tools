/**
 * Type utility functions and guards for type-safe operations
 */

/**
 * Type guard to check if array access returns a defined value
 * Useful with noUncheckedIndexedAccess compiler option
 */
export const isDefined = <T>(value: T | undefined): value is T => {
  return value !== undefined
}

/**
 * Type-safe Map.get that returns undefined if key doesn't exist
 */
export const safeMapGet = <K, V>(map: Map<K, V>, key: K): V | undefined => {
  return map.get(key)
}
