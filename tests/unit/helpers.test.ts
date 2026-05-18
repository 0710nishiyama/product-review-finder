import {
  maskApiKey,
  generateId,
  calculatePages,
  validateSearchResult,
} from '../../src/utils/helpers';
import type { SearchResult } from '../../src/models/types';

describe('maskApiKey', () => {
  it('should mask all but last 4 chars for long strings', () => {
    expect(maskApiKey('sk-test-key-12345')).toBe('*************2345');
  });

  it('should mask entire string for 4-char strings', () => {
    expect(maskApiKey('abcd')).toBe('****');
  });

  it('should mask entire string for strings shorter than 4 chars', () => {
    expect(maskApiKey('abc')).toBe('***');
    expect(maskApiKey('ab')).toBe('**');
    expect(maskApiKey('a')).toBe('*');
  });

  it('should return empty string for empty input', () => {
    expect(maskApiKey('')).toBe('');
  });

  it('should preserve last 4 chars for 5-char string', () => {
    expect(maskApiKey('12345')).toBe('*2345');
  });
});

describe('generateId', () => {
  it('should return a valid UUID v4 format', () => {
    const id = generateId();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(id).toMatch(uuidRegex);
  });

  it('should generate unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe('calculatePages', () => {
  it('should return 0 for 0 total hits', () => {
    expect(calculatePages(0, 10)).toBe(0);
  });

  it('should return 1 for hits <= page size', () => {
    expect(calculatePages(1, 10)).toBe(1);
    expect(calculatePages(10, 10)).toBe(1);
  });

  it('should return correct pages for exact multiples', () => {
    expect(calculatePages(20, 10)).toBe(2);
    expect(calculatePages(30, 10)).toBe(3);
  });

  it('should round up for non-exact multiples', () => {
    expect(calculatePages(11, 10)).toBe(2);
    expect(calculatePages(21, 10)).toBe(3);
  });

  it('should return 0 for negative total hits', () => {
    expect(calculatePages(-1, 10)).toBe(0);
  });

  it('should return 0 for zero page size', () => {
    expect(calculatePages(10, 0)).toBe(0);
  });

  it('should handle large numbers', () => {
    expect(calculatePages(1000, 10)).toBe(100);
  });
});

describe('validateSearchResult', () => {
  const validNonAIResult: SearchResult = {
    search_mode: 'non-AI',
    total_hits: 15,
    pager: { page: 1, pages: 2 },
    ai_settings: null,
    ai_summary: null,
    reviews: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Great product',
        rating: 4.5,
        summary: 'This is a great product.',
        url: 'https://example.com/review/1',
      },
    ],
  };

  const validAIResult: SearchResult = {
    search_mode: 'AI',
    total_hits: 5,
    pager: { page: 1, pages: 1 },
    ai_settings: { model: 'gpt-4', confidence_threshold: 0.8 },
    ai_summary: {
      average_rating: 4.2,
      credibility_score: 85,
      summary_text: 'Overall positive reviews.',
    },
    reviews: [
      {
        id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Nice item',
        rating: 4.0,
        summary: 'Works well.',
        url: 'https://example.com/review/2',
      },
    ],
  };

  it('should accept valid non-AI result', () => {
    const result = validateSearchResult(validNonAIResult);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should accept valid AI result', () => {
    const result = validateSearchResult(validAIResult);
    expect(result.valid).toBe(true);
  });

  it('should reject invalid search_mode', () => {
    const invalid = { ...validNonAIResult, search_mode: 'invalid' as any };
    const result = validateSearchResult(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('search_mode must be "AI" or "non-AI"');
  });

  it('should reject negative total_hits', () => {
    const invalid = { ...validNonAIResult, total_hits: -1 };
    const result = validateSearchResult(invalid);
    expect(result.valid).toBe(false);
  });

  it('should reject pager.page < 1', () => {
    const invalid = { ...validNonAIResult, pager: { page: 0, pages: 2 } };
    const result = validateSearchResult(invalid);
    expect(result.valid).toBe(false);
  });

  it('should reject pager.pages < 0', () => {
    const invalid = { ...validNonAIResult, pager: { page: 1, pages: -1 } };
    const result = validateSearchResult(invalid);
    expect(result.valid).toBe(false);
  });

  it('should reject reviews with more than 10 items', () => {
    const reviews = Array.from({ length: 11 }, (_, i) => ({
      id: `id-${i}`,
      title: `Review ${i}`,
      rating: 3.0,
      summary: 'Summary',
      url: 'https://example.com',
    }));
    const invalid = { ...validNonAIResult, reviews };
    const result = validateSearchResult(invalid);
    expect(result.valid).toBe(false);
  });

  it('should reject review with rating out of range', () => {
    const invalid = {
      ...validNonAIResult,
      reviews: [{ ...validNonAIResult.reviews[0], rating: 5.5 }],
    };
    const result = validateSearchResult(invalid);
    expect(result.valid).toBe(false);
  });

  it('should reject review with title over 200 chars', () => {
    const invalid = {
      ...validNonAIResult,
      reviews: [{ ...validNonAIResult.reviews[0], title: 'a'.repeat(201) }],
    };
    const result = validateSearchResult(invalid);
    expect(result.valid).toBe(false);
  });

  it('should enforce conditional: total_hits 0 means empty reviews', () => {
    const invalid: SearchResult = {
      ...validNonAIResult,
      total_hits: 0,
      pager: { page: 1, pages: 0 },
      reviews: [validNonAIResult.reviews[0]],
    };
    const result = validateSearchResult(invalid);
    expect(result.valid).toBe(false);
  });

  it('should enforce conditional: non-AI means ai_summary is null', () => {
    const invalid: SearchResult = {
      ...validNonAIResult,
      ai_summary: { average_rating: 4.0, credibility_score: 80, summary_text: 'test' },
    };
    const result = validateSearchResult(invalid);
    expect(result.valid).toBe(false);
  });

  it('should enforce conditional: AI mode requires ai_settings', () => {
    const invalid: SearchResult = {
      ...validAIResult,
      ai_settings: null,
    };
    const result = validateSearchResult(invalid);
    expect(result.valid).toBe(false);
  });

  it('should accept valid zero-result non-AI search', () => {
    const valid: SearchResult = {
      search_mode: 'non-AI',
      total_hits: 0,
      pager: { page: 1, pages: 0 },
      ai_settings: null,
      ai_summary: null,
      reviews: [],
    };
    const result = validateSearchResult(valid);
    expect(result.valid).toBe(true);
  });
});
