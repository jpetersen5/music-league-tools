/**
 * Music League Sentiment Analysis Utility
 *
 * Provides type-safe sentiment analysis for Music League comments using the sentiment library.
 * Implements production-ready analysis with comprehensive error handling and batch processing.
 *
 * @module sentimentAnalysis
 */

import Sentiment from 'sentiment'
import type { SentimentScore, SentimentLabel } from '../../types/musicLeague'

// ============================================================================
// Configuration and Setup
// ============================================================================

/**
 * Singleton sentiment analyzer instance
 * Browser-compatible sentiment analysis
 */
let analyzerInstance: Sentiment | null = null

/**
 * Get or create the sentiment analyzer instance
 * Uses lazy initialization for performance
 *
 * @returns Configured Sentiment instance
 */
function getAnalyzer(): Sentiment {
  if (!analyzerInstance) {
    analyzerInstance = new Sentiment()
  }
  return analyzerInstance
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Threshold values for sentiment classification
 */
const SENTIMENT_THRESHOLDS = {
  /** Comparative score above this is considered positive */
  POSITIVE: 0.05,
  /** Comparative score below this is considered negative */
  NEGATIVE: -0.05,
} as const

/**
 * Empty sentiment score returned for invalid inputs
 */
const EMPTY_SENTIMENT: SentimentScore = Object.freeze({
  score: 0,
  comparative: 0,
  positive: Object.freeze([]),
  negative: Object.freeze([]),
  tokenCount: 0,
})

// ============================================================================
// Core Analysis Functions
// ============================================================================

/**
 * Analyze the sentiment of a single text string
 *
 * Performs comprehensive sentiment analysis using the AFINN lexicon,
 * which provides numeric sentiment scores for thousands of English words.
 *
 * @param text - The text to analyze (comment, review, etc.)
 * @returns Detailed sentiment analysis result
 *
 * @example
 * ```typescript
 * const result = analyzeSentiment("This song is absolutely amazing!");
 * console.log(result.comparative); // Positive value, e.g., 0.6
 * console.log(result.positive); // ["amazing"]
 * ```
 *
 * @example
 * ```typescript
 * // Handles edge cases gracefully
 * const empty = analyzeSentiment("");
 * console.log(empty.tokenCount); // 0
 * console.log(empty.comparative); // 0
 * ```
 */
export function analyzeSentiment(text: string): SentimentScore {
  // Handle null, undefined, or empty strings
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return EMPTY_SENTIMENT
  }

  try {
    const analyzer = getAnalyzer()

    // Analyze the text - sentiment library handles tokenization internally
    const result = analyzer.analyze(text)

    // Handle empty results
    if (!result || !result.tokens || result.tokens.length === 0) {
      return EMPTY_SENTIMENT
    }

    return Object.freeze({
      score: result.score,
      comparative: result.comparative,
      positive: Object.freeze(result.positive),
      negative: Object.freeze(result.negative),
      tokenCount: result.tokens.length,
    })
  } catch (error) {
    // Log error but return empty result for resilience
    console.error('Error analyzing sentiment:', error)
    return EMPTY_SENTIMENT
  }
}

/**
 * Analyze sentiment for multiple texts efficiently
 *
 * Processes texts in batch for optimal performance. Suitable for analyzing
 * large numbers of comments (250+) without blocking the main thread.
 *
 * @param texts - Array of texts to analyze
 * @returns Array of sentiment results in the same order as input
 *
 * @example
 * ```typescript
 * const comments = [
 *   "Love this track!",
 *   "Not my favorite",
 *   "Absolutely perfect"
 * ];
 * const results = batchAnalyzeSentiment(comments);
 * results.forEach((result, i) => {
 *   console.log(`Comment ${i + 1}: ${getSentimentLabel(result.comparative)}`);
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Handles mixed valid and invalid inputs
 * const mixed = ["Great song", "", null, "Terrible", undefined];
 * const results = batchAnalyzeSentiment(mixed);
 * // Returns valid results for non-empty strings, empty results for others
 * ```
 */
export function batchAnalyzeSentiment(texts: string[]): SentimentScore[] {
  // Handle empty or invalid input
  if (!Array.isArray(texts) || texts.length === 0) {
    return []
  }

  try {
    // Pre-initialize the analyzer for better batch performance
    getAnalyzer()

    // Process all texts
    return texts.map(text => analyzeSentiment(text))
  } catch (error) {
    console.error('Error in batch sentiment analysis:', error)
    // Return empty results for all texts on error
    return texts.map(() => EMPTY_SENTIMENT)
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert a comparative sentiment score to a human-readable label
 *
 * Uses configurable thresholds to classify sentiment:
 * - Positive: score > 0.05
 * - Negative: score < -0.05
 * - Neutral: -0.05 <= score <= 0.05
 *
 * @param comparative - The comparative score from sentiment analysis
 * @returns Sentiment classification label
 *
 * @example
 * ```typescript
 * getSentimentLabel(0.8);   // "positive"
 * getSentimentLabel(0.02);  // "neutral"
 * getSentimentLabel(-0.5);  // "negative"
 * ```
 */
export function getSentimentLabel(comparative: number): SentimentLabel {
  if (comparative > SENTIMENT_THRESHOLDS.POSITIVE) {
    return 'positive'
  }
  if (comparative < SENTIMENT_THRESHOLDS.NEGATIVE) {
    return 'negative'
  }
  return 'neutral'
}

/**
 * Get a sentiment label from a full sentiment score object
 *
 * Convenience function that extracts the comparative score and
 * returns the corresponding label
 *
 * @param score - Complete sentiment analysis result
 * @returns Sentiment classification label
 *
 * @example
 * ```typescript
 * const score = analyzeSentiment("Excellent choice!");
 * const label = getSentimentLabelFromScore(score);
 * console.log(label); // "positive"
 * ```
 */
export function getSentimentLabelFromScore(score: SentimentScore): SentimentLabel {
  return getSentimentLabel(score.comparative)
}

/**
 * Calculate aggregate sentiment statistics for multiple sentiment scores
 *
 * Useful for analyzing overall sentiment trends across many comments
 *
 * @param scores - Array of sentiment analysis results
 * @returns Aggregate statistics
 *
 * @example
 * ```typescript
 * const comments = votes.map(v => v.comment);
 * const scores = batchAnalyzeSentiment(comments);
 * const stats = getAggregateSentiment(scores);
 *
 * console.log(`Average sentiment: ${stats.averageComparative.toFixed(2)}`);
 * console.log(`Positive: ${stats.positiveCount}, Negative: ${stats.negativeCount}`);
 * ```
 */
export function getAggregateSentiment(scores: SentimentScore[]): {
  readonly averageScore: number
  readonly averageComparative: number
  readonly totalTokens: number
  readonly positiveCount: number
  readonly negativeCount: number
  readonly neutralCount: number
  readonly totalPositiveWords: number
  readonly totalNegativeWords: number
} {
  if (!Array.isArray(scores) || scores.length === 0) {
    return Object.freeze({
      averageScore: 0,
      averageComparative: 0,
      totalTokens: 0,
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0,
      totalPositiveWords: 0,
      totalNegativeWords: 0,
    })
  }

  let totalScore = 0
  let totalComparative = 0
  let totalTokens = 0
  let positiveCount = 0
  let negativeCount = 0
  let neutralCount = 0
  let totalPositiveWords = 0
  let totalNegativeWords = 0

  for (const score of scores) {
    totalScore += score.score
    totalComparative += score.comparative
    totalTokens += score.tokenCount
    totalPositiveWords += score.positive.length
    totalNegativeWords += score.negative.length

    const label = getSentimentLabel(score.comparative)
    if (label === 'positive') {
      positiveCount++
    } else if (label === 'negative') {
      negativeCount++
    } else {
      neutralCount++
    }
  }

  const count = scores.length

  return Object.freeze({
    averageScore: count > 0 ? totalScore / count : 0,
    averageComparative: count > 0 ? totalComparative / count : 0,
    totalTokens,
    positiveCount,
    negativeCount,
    neutralCount,
    totalPositiveWords,
    totalNegativeWords,
  })
}

/**
 * Filter sentiment scores by label
 *
 * Useful for extracting only positive, negative, or neutral comments
 *
 * @param scores - Array of sentiment scores to filter
 * @param label - The sentiment label to filter by
 * @returns Filtered array of sentiment scores
 *
 * @example
 * ```typescript
 * const allScores = batchAnalyzeSentiment(comments);
 * const positiveScores = filterByLabel(allScores, 'positive');
 * const negativeScores = filterByLabel(allScores, 'negative');
 * ```
 */
export function filterByLabel(scores: SentimentScore[], label: SentimentLabel): SentimentScore[] {
  if (!Array.isArray(scores)) {
    return []
  }

  return scores.filter(score => getSentimentLabel(score.comparative) === label)
}

/**
 * Find the most positive and most negative sentiment scores
 *
 * Useful for identifying extreme sentiments in a collection of comments
 *
 * @param scores - Array of sentiment scores to analyze
 * @returns Object containing the most positive and negative scores, or null if empty
 *
 * @example
 * ```typescript
 * const scores = batchAnalyzeSentiment(allComments);
 * const extremes = findExtremes(scores);
 *
 * if (extremes) {
 *   console.log(`Most positive: ${extremes.mostPositive.comparative}`);
 *   console.log(`Most negative: ${extremes.mostNegative.comparative}`);
 * }
 * ```
 */
export function findExtremes(scores: SentimentScore[]): {
  readonly mostPositive: SentimentScore
  readonly mostNegative: SentimentScore
} | null {
  if (!Array.isArray(scores) || scores.length === 0) {
    return null
  }

  let mostPositive = scores[0]!
  let mostNegative = scores[0]!

  for (const score of scores) {
    if (score.comparative > mostPositive.comparative) {
      mostPositive = score
    }
    if (score.comparative < mostNegative.comparative) {
      mostNegative = score
    }
  }

  return Object.freeze({
    mostPositive,
    mostNegative,
  })
}

/**
 * Get the CSS class modifier for a sentiment score
 *
 * @param score - The sentiment score to classify
 * @returns 'positive', 'negative', or 'neutral'
 */
export function getSentimentClass(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'neutral'
  return getSentimentLabel(score)
}

// ============================================================================
// Type Exports
// ============================================================================

/**
 * Re-export types for convenience
 */
export type { SentimentScore, SentimentLabel } from '../../types/musicLeague'
