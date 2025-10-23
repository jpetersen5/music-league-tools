/**
 * Shuffle array using Fisher-Yates algorithm
 * Creates a new shuffled array without modifying the original
 *
 * @param array - Array to shuffle
 * @returns New shuffled array
 */
export const shuffleArray = <T>(array: T[]): T[] => {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    // Safe: we know these indices are valid due to loop bounds
    const temp = result[i]
    const swapValue = result[j]
    if (temp !== undefined && swapValue !== undefined) {
      result[i] = swapValue
      result[j] = temp
    }
  }
  return result
}
