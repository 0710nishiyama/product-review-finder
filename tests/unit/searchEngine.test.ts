/**
 * Unit tests for SearchEngine service.
 * Tests search dispatching, pagination, timeout handling, and SearchResult structure.
 */

import { SearchEngine, SearchParams } from '../../src/services/searchEngine';
import { AIAnalyzer } from '../../src/services/aiAnalyzer';
import type { ProductData, ReviewItem, AISettings, AIProviderConfig, AISummary } from '../../src/models/types';

// Helper to create a mock ProductData
function createProductData(overrides?: Partial<ProductData>): ProductData {
  return {
    productName: 'Test Product',
    genre: 'Electronics',
    productUrl: 'https://example.com/product',
    productImage: null,
    ...overrides,
  };
}

// Helper to create a mock ReviewItem
function createReviewItem(index: number): ReviewItem {
  return {
    id: `review-${index}`,
    title: `Review ${index}`,
    rating: 3.5,
    summary: `Summary for review ${index}`,
    url: `https://example.com/review/${index}`,
  };
}

// Helper to create mock AISettings
function createAISettings(): AISettings {
  return {
    activeProvider: 'openai',
    providers: {
      openai: { api_key: 'sk-test-key-12345', model: 'gpt-4' },
      google: { api_key: '', model: '' },
      claude: { api_key: '', model: '' },
    },
  };
}

describe('SearchEngine', () => {
  let searchEngine: SearchEngine;
  let mockAIAnalyzer: AIAnalyzer;

  beforeEach(() => {
    mockAIAnalyzer = new AIAnalyzer();
    searchEngine = new SearchEngine(mockAIAnalyzer);
  });

  describe('Non-AI mode search', () => {
    it('should return SearchResult with search_mode "non-AI"', async () => {
      const params: SearchParams = {
        productData: createProductData(),
        mode: 'non-AI',
        page: 1,
      };

      const result = await searchEngine.search(params);

      expect(result.search_mode).toBe('non-AI');
    });

    it('should return ai_summary as null in non-AI mode', async () => {
      const params: SearchParams = {
        productData: createProductData(),
        mode: 'non-AI',
        page: 1,
      };

      const result = await searchEngine.search(params);

      expect(result.ai_summary).toBeNull();
    });

    it('should return ai_settings as null in non-AI mode', async () => {
      const params: SearchParams = {
        productData: createProductData(),
        mode: 'non-AI',
        page: 1,
      };

      const result = await searchEngine.search(params);

      expect(result.ai_settings).toBeNull();
    });

    it('should return empty reviews and pager {page:1, pages:0} when no results', async () => {
      const params: SearchParams = {
        productData: createProductData(),
        mode: 'non-AI',
        page: 1,
      };

      const result = await searchEngine.search(params);

      expect(result.total_hits).toBe(0);
      expect(result.reviews).toEqual([]);
      expect(result.pager).toEqual({ page: 1, pages: 0 });
    });
  });

  describe('AI mode search', () => {
    it('should return SearchResult with search_mode "AI"', async () => {
      const params: SearchParams = {
        productData: createProductData(),
        mode: 'AI',
        page: 1,
        aiSettings: createAISettings(),
      };

      const result = await searchEngine.search(params);

      expect(result.search_mode).toBe('AI');
    });

    it('should return ai_settings with model and confidence_threshold in AI mode', async () => {
      // Mock AIAnalyzer to return some reviews
      const reviews = [createReviewItem(1), createReviewItem(2)];
      jest.spyOn(mockAIAnalyzer, 'searchWithAI').mockResolvedValue(reviews);
      jest.spyOn(mockAIAnalyzer, 'generateSummary').mockResolvedValue({
        average_rating: 3.5,
        credibility_score: 75,
        summary_text: 'Good product overall.',
      });

      const params: SearchParams = {
        productData: createProductData(),
        mode: 'AI',
        page: 1,
        aiSettings: createAISettings(),
      };

      const result = await searchEngine.search(params);

      expect(result.ai_settings).not.toBeNull();
      expect(result.ai_settings!.model).toBe('gpt-4');
      expect(result.ai_settings!.confidence_threshold).toBeGreaterThanOrEqual(0.0);
      expect(result.ai_settings!.confidence_threshold).toBeLessThanOrEqual(1.0);
    });

    it('should throw error when aiSettings is not provided in AI mode', async () => {
      const params: SearchParams = {
        productData: createProductData(),
        mode: 'AI',
        page: 1,
        // No aiSettings
      };

      await expect(searchEngine.search(params)).rejects.toMatchObject({
        type: 'validation',
        code: 'AI_SETTINGS_REQUIRED',
      });
    });

    it('should return ai_summary with summary_text when reviews found', async () => {
      const reviews = [createReviewItem(1)];
      const mockSummary: AISummary = {
        average_rating: 4.0,
        credibility_score: 80,
        summary_text: 'Excellent product.',
      };
      jest.spyOn(mockAIAnalyzer, 'searchWithAI').mockResolvedValue(reviews);
      jest.spyOn(mockAIAnalyzer, 'generateSummary').mockResolvedValue(mockSummary);

      const params: SearchParams = {
        productData: createProductData(),
        mode: 'AI',
        page: 1,
        aiSettings: createAISettings(),
      };

      const result = await searchEngine.search(params);

      expect(result.ai_summary).not.toBeNull();
      expect(result.ai_summary!.summary_text).toBe('Excellent product.');
    });

    it('should return ai_summary with null scores when no reviews found', async () => {
      jest.spyOn(mockAIAnalyzer, 'searchWithAI').mockResolvedValue([]);

      const params: SearchParams = {
        productData: createProductData(),
        mode: 'AI',
        page: 1,
        aiSettings: createAISettings(),
      };

      const result = await searchEngine.search(params);

      expect(result.ai_summary).not.toBeNull();
      expect(result.ai_summary!.average_rating).toBeNull();
      expect(result.ai_summary!.credibility_score).toBeNull();
    });
  });

  describe('Pagination', () => {
    it('should paginate results with 10 items per page', async () => {
      // Create 25 reviews
      const reviews = Array.from({ length: 25 }, (_, i) => createReviewItem(i));
      jest.spyOn(mockAIAnalyzer, 'searchWithAI').mockResolvedValue(reviews);
      jest.spyOn(mockAIAnalyzer, 'generateSummary').mockResolvedValue({
        average_rating: 3.5,
        credibility_score: 70,
        summary_text: 'Summary text.',
      });

      const params: SearchParams = {
        productData: createProductData(),
        mode: 'AI',
        page: 1,
        aiSettings: createAISettings(),
      };

      const result = await searchEngine.search(params);

      expect(result.total_hits).toBe(25);
      expect(result.pager.pages).toBe(3); // ceil(25/10) = 3
      expect(result.pager.page).toBe(1);
      expect(result.reviews.length).toBe(10);
    });

    it('should return correct page of results for page 2', async () => {
      const reviews = Array.from({ length: 25 }, (_, i) => createReviewItem(i));
      jest.spyOn(mockAIAnalyzer, 'searchWithAI').mockResolvedValue(reviews);
      jest.spyOn(mockAIAnalyzer, 'generateSummary').mockResolvedValue({
        average_rating: 3.5,
        credibility_score: 70,
        summary_text: 'Summary text.',
      });

      const params: SearchParams = {
        productData: createProductData(),
        mode: 'AI',
        page: 2,
        aiSettings: createAISettings(),
      };

      const result = await searchEngine.search(params);

      expect(result.pager.page).toBe(2);
      expect(result.reviews.length).toBe(10);
      expect(result.reviews[0].id).toBe('review-10');
    });

    it('should return remaining items on last page', async () => {
      const reviews = Array.from({ length: 25 }, (_, i) => createReviewItem(i));
      jest.spyOn(mockAIAnalyzer, 'searchWithAI').mockResolvedValue(reviews);
      jest.spyOn(mockAIAnalyzer, 'generateSummary').mockResolvedValue({
        average_rating: 3.5,
        credibility_score: 70,
        summary_text: 'Summary text.',
      });

      const params: SearchParams = {
        productData: createProductData(),
        mode: 'AI',
        page: 3,
        aiSettings: createAISettings(),
      };

      const result = await searchEngine.search(params);

      expect(result.pager.page).toBe(3);
      expect(result.reviews.length).toBe(5); // 25 - 20 = 5
    });

    it('should clamp page to valid range when page exceeds total pages', async () => {
      const reviews = Array.from({ length: 5 }, (_, i) => createReviewItem(i));
      jest.spyOn(mockAIAnalyzer, 'searchWithAI').mockResolvedValue(reviews);
      jest.spyOn(mockAIAnalyzer, 'generateSummary').mockResolvedValue({
        average_rating: 3.5,
        credibility_score: 70,
        summary_text: 'Summary text.',
      });

      const params: SearchParams = {
        productData: createProductData(),
        mode: 'AI',
        page: 99,
        aiSettings: createAISettings(),
      };

      const result = await searchEngine.search(params);

      // Should clamp to last page (page 1 since 5 items = 1 page)
      expect(result.pager.page).toBe(1);
    });

    it('should clamp page to 1 when page is less than 1', async () => {
      const reviews = Array.from({ length: 15 }, (_, i) => createReviewItem(i));
      jest.spyOn(mockAIAnalyzer, 'searchWithAI').mockResolvedValue(reviews);
      jest.spyOn(mockAIAnalyzer, 'generateSummary').mockResolvedValue({
        average_rating: 3.5,
        credibility_score: 70,
        summary_text: 'Summary text.',
      });

      const params: SearchParams = {
        productData: createProductData(),
        mode: 'AI',
        page: 0,
        aiSettings: createAISettings(),
      };

      const result = await searchEngine.search(params);

      expect(result.pager.page).toBe(1);
    });
  });

  describe('Max results limits', () => {
    it('should limit AI mode results to 30', async () => {
      const reviews = Array.from({ length: 50 }, (_, i) => createReviewItem(i));
      jest.spyOn(mockAIAnalyzer, 'searchWithAI').mockResolvedValue(reviews);
      jest.spyOn(mockAIAnalyzer, 'generateSummary').mockResolvedValue({
        average_rating: 3.5,
        credibility_score: 70,
        summary_text: 'Summary text.',
      });

      const params: SearchParams = {
        productData: createProductData(),
        mode: 'AI',
        page: 1,
        aiSettings: createAISettings(),
      };

      const result = await searchEngine.search(params);

      expect(result.total_hits).toBe(30);
      expect(result.pager.pages).toBe(3); // ceil(30/10) = 3
    });
  });

  describe('Timeout handling', () => {
    it('should throw timeout error when AI search exceeds timeout', async () => {
      jest.spyOn(mockAIAnalyzer, 'searchWithAI').mockImplementation(
        (async (...args: unknown[]) => {
          const signal = args[2] as AbortSignal | undefined;
          // Simulate abort
          if (signal?.aborted) {
            throw new DOMException('The operation was aborted.', 'AbortError');
          }
          throw new DOMException('The operation was aborted.', 'AbortError');
        }) as typeof mockAIAnalyzer.searchWithAI
      );

      const params: SearchParams = {
        productData: createProductData(),
        mode: 'AI',
        page: 1,
        aiSettings: createAISettings(),
      };

      await expect(searchEngine.search(params)).rejects.toMatchObject({
        type: 'timeout',
        code: 'SEARCH_TIMEOUT',
        retryable: true,
      });
    });
  });

  describe('SearchResult structure invariants', () => {
    it('should always have valid pager.page >= 1', async () => {
      const params: SearchParams = {
        productData: createProductData(),
        mode: 'non-AI',
        page: 1,
      };

      const result = await searchEngine.search(params);

      expect(result.pager.page).toBeGreaterThanOrEqual(1);
    });

    it('should always have valid pager.pages >= 0', async () => {
      const params: SearchParams = {
        productData: createProductData(),
        mode: 'non-AI',
        page: 1,
      };

      const result = await searchEngine.search(params);

      expect(result.pager.pages).toBeGreaterThanOrEqual(0);
    });

    it('should always have total_hits >= 0', async () => {
      const params: SearchParams = {
        productData: createProductData(),
        mode: 'non-AI',
        page: 1,
      };

      const result = await searchEngine.search(params);

      expect(result.total_hits).toBeGreaterThanOrEqual(0);
    });

    it('should have reviews array length <= 10', async () => {
      const reviews = Array.from({ length: 30 }, (_, i) => createReviewItem(i));
      jest.spyOn(mockAIAnalyzer, 'searchWithAI').mockResolvedValue(reviews);
      jest.spyOn(mockAIAnalyzer, 'generateSummary').mockResolvedValue({
        average_rating: 3.5,
        credibility_score: 70,
        summary_text: 'Summary text.',
      });

      const params: SearchParams = {
        productData: createProductData(),
        mode: 'AI',
        page: 1,
        aiSettings: createAISettings(),
      };

      const result = await searchEngine.search(params);

      expect(result.reviews.length).toBeLessThanOrEqual(10);
    });
  });
});
