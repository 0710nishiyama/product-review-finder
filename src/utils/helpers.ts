/**
 * Utility Helper Functions
 * API key masking, UUID generation, pagination, and search result validation.
 */

import { v4 as uuidv4 } from 'uuid';
import type { SearchResult } from '../models/types.js';

/**
 * Mask an API key, showing only the last 4 characters.
 * For strings of 4 or fewer characters, the entire string is masked.
 */
export function maskApiKey(key: string): string {
  if (key.length <= 4) {
    return '*'.repeat(key.length);
  }
  const visiblePart = key.slice(-4);
  const maskedPart = '*'.repeat(key.length - 4);
  return maskedPart + visiblePart;
}

/**
 * Generate a UUID v4 identifier.
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * Calculate total pages from total hits and page size.
 * Returns ceil(totalHits / pageSize), minimum 0.
 */
export function calculatePages(totalHits: number, pageSize: number): number {
  if (totalHits <= 0 || pageSize <= 0) {
    return 0;
  }
  return Math.ceil(totalHits / pageSize);
}

export interface SearchResultValidation {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a SearchResult object for structural invariants.
 * Checks: search_mode, total_hits, pager, reviews array, and each ReviewItem.
 */
export function validateSearchResult(result: SearchResult): SearchResultValidation {
  const errors: string[] = [];

  // search_mode must be "AI" or "non-AI"
  if (result.search_mode !== 'AI' && result.search_mode !== 'non-AI') {
    errors.push('search_mode must be "AI" or "non-AI"');
  }

  // total_hits must be a non-negative integer
  if (!Number.isInteger(result.total_hits) || result.total_hits < 0) {
    errors.push('total_hits must be a non-negative integer');
  }

  // pager.page must be >= 1
  if (!Number.isInteger(result.pager.page) || result.pager.page < 1) {
    errors.push('pager.page must be an integer >= 1');
  }

  // pager.pages must be >= 0
  if (!Number.isInteger(result.pager.pages) || result.pager.pages < 0) {
    errors.push('pager.pages must be a non-negative integer');
  }

  // reviews must be an array of 0-10 items
  if (!Array.isArray(result.reviews)) {
    errors.push('reviews must be an array');
  } else {
    if (result.reviews.length > 10) {
      errors.push('reviews must contain at most 10 items');
    }

    // Validate each ReviewItem
    for (let i = 0; i < result.reviews.length; i++) {
      const review = result.reviews[i];

      if (typeof review.title !== 'string' || review.title.length > 200) {
        errors.push(`reviews[${i}].title must be a string of at most 200 chars`);
      }

      if (typeof review.rating !== 'number' || review.rating < 1.0 || review.rating > 5.0) {
        errors.push(`reviews[${i}].rating must be a number between 1.0 and 5.0`);
      }

      if (typeof review.summary !== 'string' || review.summary.length > 1000) {
        errors.push(`reviews[${i}].summary must be a string of at most 1000 chars`);
      }

      if (typeof review.url !== 'string') {
        errors.push(`reviews[${i}].url must be a string`);
      } else {
        try {
          const parsed = new URL(review.url);
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            errors.push(`reviews[${i}].url must be a valid http/https URL`);
          }
        } catch {
          errors.push(`reviews[${i}].url must be a valid URL`);
        }
      }
    }
  }

  // Conditional constraints
  // When total_hits is 0: reviews must be empty, pager must be {page: 1, pages: 0}
  if (result.total_hits === 0) {
    if (result.reviews.length !== 0) {
      errors.push('When total_hits is 0, reviews must be empty');
    }
    if (result.pager.page !== 1 || result.pager.pages !== 0) {
      errors.push('When total_hits is 0, pager must be {page: 1, pages: 0}');
    }
  }

  // When search_mode is "non-AI": ai_summary must be null
  if (result.search_mode === 'non-AI' && result.ai_summary !== null) {
    errors.push('When search_mode is "non-AI", ai_summary must be null');
  }

  // When search_mode is "AI": ai_settings must have model and confidence_threshold
  if (result.search_mode === 'AI') {
    if (!result.ai_settings) {
      errors.push('When search_mode is "AI", ai_settings must be present');
    } else {
      if (typeof result.ai_settings.model !== 'string' || result.ai_settings.model.length === 0) {
        errors.push('ai_settings.model must be a non-empty string');
      }
      if (
        typeof result.ai_settings.confidence_threshold !== 'number' ||
        result.ai_settings.confidence_threshold < 0.0 ||
        result.ai_settings.confidence_threshold > 1.0
      ) {
        errors.push('ai_settings.confidence_threshold must be a number in [0.0, 1.0]');
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
