/**
 * Unit tests for AIAnalyzer service.
 * Tests validation, provider detection, error handling, and response parsing.
 */

import {
  AIAnalyzer,
  validateAIConfig,
  detectProvider,
  TimeoutError,
} from '../../src/services/aiAnalyzer';
import type { AIProviderConfig, ProductData, ReviewItem } from '../../src/models/types';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock FileReader for image tests
class MockFileReader {
  result: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  readAsDataURL(_file: File): void {
    this.result = 'data:image/jpeg;base64,dGVzdA==';
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
}

(global as unknown as Record<string, unknown>).FileReader = MockFileReader;

describe('AIAnalyzer', () => {
  let analyzer: AIAnalyzer;

  beforeEach(() => {
    analyzer = new AIAnalyzer();
    mockFetch.mockReset();
  });

  describe('validateAIConfig', () => {
    it('should return null for valid settings', () => {
      const settings: AIProviderConfig = { api_key: 'sk-test123', model: 'gpt-4' };
      expect(validateAIConfig(settings)).toBeNull();
    });

    it('should return warning for empty api_key', () => {
      const settings: AIProviderConfig = { api_key: '', model: 'gpt-4' };
      const result = validateAIConfig(settings);
      expect(result).not.toBeNull();
      expect(result).toContain('api_key');
    });

    it('should return warning for whitespace-only api_key', () => {
      const settings: AIProviderConfig = { api_key: '   ', model: 'gpt-4' };
      const result = validateAIConfig(settings);
      expect(result).not.toBeNull();
      expect(result).toContain('api_key');
    });

    it('should return warning for empty model', () => {
      const settings: AIProviderConfig = { api_key: 'sk-test123', model: '' };
      const result = validateAIConfig(settings);
      expect(result).not.toBeNull();
      expect(result).toContain('model');
    });

    it('should return warning for whitespace-only model', () => {
      const settings: AIProviderConfig = { api_key: 'sk-test123', model: '   ' };
      const result = validateAIConfig(settings);
      expect(result).not.toBeNull();
      expect(result).toContain('model');
    });
  });

  describe('detectProvider', () => {
    it('should detect OpenAI from gpt models', () => {
      expect(detectProvider('gpt-4')).toBe('openai');
      expect(detectProvider('gpt-3.5-turbo')).toBe('openai');
      expect(detectProvider('GPT-4o')).toBe('openai');
    });

    it('should detect OpenAI from o1/o3 models', () => {
      expect(detectProvider('o1-preview')).toBe('openai');
      expect(detectProvider('o3-mini')).toBe('openai');
    });

    it('should detect Google from gemini models', () => {
      expect(detectProvider('gemini-pro')).toBe('google');
      expect(detectProvider('gemini-1.5-flash')).toBe('google');
    });

    it('should detect Claude from claude models', () => {
      expect(detectProvider('claude-3-opus')).toBe('claude');
      expect(detectProvider('claude-3.5-sonnet')).toBe('claude');
    });

    it('should default to openai for unknown models', () => {
      expect(detectProvider('unknown-model')).toBe('openai');
    });
  });

  describe('analyzeImage', () => {
    const mockImage = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    it('should return error when settings are invalid', async () => {
      const settings: AIProviderConfig = { api_key: '', model: 'gpt-4' };
      const result = await analyzer.analyzeImage(mockImage, settings);

      expect(result.success).toBe(false);
      expect(result.productType).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.error).toBeDefined();
    });

    it('should return error on authentication failure (401)', async () => {
      const settings: AIProviderConfig = { api_key: 'invalid-key', model: 'gpt-4' };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await analyzer.analyzeImage(mockImage, settings);

      expect(result.success).toBe(false);
      expect(result.error).toContain('認証エラー');
    });

    it('should return error on authentication failure (403)', async () => {
      const settings: AIProviderConfig = { api_key: 'invalid-key', model: 'gpt-4' };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      const result = await analyzer.analyzeImage(mockImage, settings);

      expect(result.success).toBe(false);
      expect(result.error).toContain('認証エラー');
    });

    it('should return success with product type on valid response', async () => {
      const settings: AIProviderConfig = { api_key: 'sk-valid', model: 'gpt-4' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'スマートフォン' } }],
        }),
      });

      const result = await analyzer.analyzeImage(mockImage, settings);

      expect(result.success).toBe(true);
      expect(result.productType).toBe('スマートフォン');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should throw TimeoutError on timeout', async () => {
      const settings: AIProviderConfig = { api_key: 'sk-valid', model: 'gpt-4' };
      mockFetch.mockImplementationOnce(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      await expect(analyzer.analyzeImage(mockImage, settings)).rejects.toThrow(TimeoutError);
    });
  });

  describe('generateSummary', () => {
    const mockReviews: ReviewItem[] = [
      { id: '1', title: 'Great product', rating: 4.5, summary: 'Very good', url: 'https://example.com/1' },
      { id: '2', title: 'Decent', rating: 3.0, summary: 'OK product', url: 'https://example.com/2' },
    ];

    const mockProductData: ProductData = {
      productName: 'テスト商品',
      genre: '電子機器',
      productUrl: 'https://example.com',
      productImage: null,
    };

    it('should return null scores when reviews are empty', async () => {
      const settings: AIProviderConfig = { api_key: 'sk-valid', model: 'gpt-4' };
      const result = await analyzer.generateSummary([], mockProductData, settings);

      expect(result.average_rating).toBeNull();
      expect(result.credibility_score).toBeNull();
      expect(result.summary_text).toContain('見つかりませんでした');
    });

    it('should return warning when settings are invalid', async () => {
      const settings: AIProviderConfig = { api_key: '', model: 'gpt-4' };
      const result = await analyzer.generateSummary(mockReviews, mockProductData, settings);

      expect(result.summary_text).toContain('APIキー');
      // Should still calculate average_rating from reviews
      expect(result.average_rating).not.toBeNull();
    });

    it('should return warning on authentication error', async () => {
      const settings: AIProviderConfig = { api_key: 'invalid', model: 'gpt-4' };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await analyzer.generateSummary(mockReviews, mockProductData, settings);

      expect(result.summary_text).toContain('認証エラー');
      expect(result.average_rating).not.toBeNull();
    });

    it('should parse valid AI response', async () => {
      const settings: AIProviderConfig = { api_key: 'sk-valid', model: 'gpt-4' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                average_rating: 4.2,
                credibility_score: 85,
                summary_text: 'この商品は全体的に高評価です。',
              }),
            },
          }],
        }),
      });

      const result = await analyzer.generateSummary(mockReviews, mockProductData, settings);

      expect(result.average_rating).toBe(4.2);
      expect(result.credibility_score).toBe(85);
      expect(result.summary_text).toBe('この商品は全体的に高評価です。');
    });

    it('should clamp average_rating to [0.0, 5.0]', async () => {
      const settings: AIProviderConfig = { api_key: 'sk-valid', model: 'gpt-4' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                average_rating: 7.5,
                credibility_score: 85,
                summary_text: 'テスト',
              }),
            },
          }],
        }),
      });

      const result = await analyzer.generateSummary(mockReviews, mockProductData, settings);

      expect(result.average_rating).toBeLessThanOrEqual(5.0);
      expect(result.average_rating).toBeGreaterThanOrEqual(0.0);
    });

    it('should clamp credibility_score to [0, 100]', async () => {
      const settings: AIProviderConfig = { api_key: 'sk-valid', model: 'gpt-4' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                average_rating: 4.0,
                credibility_score: 150,
                summary_text: 'テスト',
              }),
            },
          }],
        }),
      });

      const result = await analyzer.generateSummary(mockReviews, mockProductData, settings);

      expect(result.credibility_score).toBeLessThanOrEqual(100);
      expect(result.credibility_score).toBeGreaterThanOrEqual(0);
    });

    it('should truncate summary_text to 500 chars', async () => {
      const settings: AIProviderConfig = { api_key: 'sk-valid', model: 'gpt-4' };
      const longText = 'あ'.repeat(600);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                average_rating: 4.0,
                credibility_score: 80,
                summary_text: longText,
              }),
            },
          }],
        }),
      });

      const result = await analyzer.generateSummary(mockReviews, mockProductData, settings);

      expect(result.summary_text.length).toBeLessThanOrEqual(500);
    });

    it('should throw TimeoutError on timeout', async () => {
      const settings: AIProviderConfig = { api_key: 'sk-valid', model: 'gpt-4' };
      mockFetch.mockImplementationOnce(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      await expect(
        analyzer.generateSummary(mockReviews, mockProductData, settings)
      ).rejects.toThrow(TimeoutError);
    });
  });

  describe('searchWithAI', () => {
    const mockProductData: ProductData = {
      productName: 'テスト商品',
      genre: '電子機器',
      productUrl: 'https://example.com',
      productImage: null,
    };

    it('should return empty array when settings are invalid', async () => {
      const settings: AIProviderConfig = { api_key: '', model: 'gpt-4' };
      const result = await analyzer.searchWithAI(mockProductData, settings);

      expect(result).toEqual([]);
    });

    it('should return empty array on authentication error', async () => {
      const settings: AIProviderConfig = { api_key: 'invalid', model: 'gpt-4' };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await analyzer.searchWithAI(mockProductData, settings);

      expect(result).toEqual([]);
    });

    it('should parse valid review response', async () => {
      const settings: AIProviderConfig = { api_key: 'sk-valid', model: 'gpt-4' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify([
                {
                  title: 'Great product',
                  rating: 4.5,
                  summary: 'Very good quality',
                  url: 'https://review.com/1',
                },
                {
                  title: 'Average',
                  rating: 3.0,
                  summary: 'OK but could be better',
                  url: 'https://review.com/2',
                },
              ]),
            },
          }],
        }),
      });

      const result = await analyzer.searchWithAI(mockProductData, settings);

      expect(result.length).toBe(2);
      expect(result[0].title).toBe('Great product');
      expect(result[0].rating).toBe(4.5);
      expect(result[0].id).toBeDefined();
      expect(result[1].title).toBe('Average');
    });

    it('should limit results to 30 items', async () => {
      const settings: AIProviderConfig = { api_key: 'sk-valid', model: 'gpt-4' };
      const manyReviews = Array.from({ length: 40 }, (_, i) => ({
        title: `Review ${i}`,
        rating: 4.0,
        summary: 'Test',
        url: `https://review.com/${i}`,
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(manyReviews) } }],
        }),
      });

      const result = await analyzer.searchWithAI(mockProductData, settings);

      expect(result.length).toBeLessThanOrEqual(30);
    });

    it('should clamp ratings to [1.0, 5.0]', async () => {
      const settings: AIProviderConfig = { api_key: 'sk-valid', model: 'gpt-4' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify([
                { title: 'Test', rating: 0.5, summary: 'Low', url: 'https://example.com' },
                { title: 'Test2', rating: 6.0, summary: 'High', url: 'https://example.com' },
              ]),
            },
          }],
        }),
      });

      const result = await analyzer.searchWithAI(mockProductData, settings);

      expect(result[0].rating).toBeGreaterThanOrEqual(1.0);
      expect(result[1].rating).toBeLessThanOrEqual(5.0);
    });

    it('should truncate title to 200 chars', async () => {
      const settings: AIProviderConfig = { api_key: 'sk-valid', model: 'gpt-4' };
      const longTitle = 'a'.repeat(300);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify([
                { title: longTitle, rating: 4.0, summary: 'Test', url: 'https://example.com' },
              ]),
            },
          }],
        }),
      });

      const result = await analyzer.searchWithAI(mockProductData, settings);

      expect(result[0].title.length).toBeLessThanOrEqual(200);
    });

    it('should throw TimeoutError on timeout', async () => {
      const settings: AIProviderConfig = { api_key: 'sk-valid', model: 'gpt-4' };
      mockFetch.mockImplementationOnce(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      await expect(analyzer.searchWithAI(mockProductData, settings)).rejects.toThrow(TimeoutError);
    });

    it('should return empty array on non-JSON response', async () => {
      const settings: AIProviderConfig = { api_key: 'sk-valid', model: 'gpt-4' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'This is not JSON' } }],
        }),
      });

      const result = await analyzer.searchWithAI(mockProductData, settings);

      expect(result).toEqual([]);
    });

    it('should use Google Gemini endpoint for gemini models', async () => {
      const settings: AIProviderConfig = { api_key: 'google-key', model: 'gemini-pro' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify([
                  { title: 'Test', rating: 4.0, summary: 'Good', url: 'https://example.com' },
                ]),
              }],
            },
          }],
        }),
      });

      await analyzer.searchWithAI(mockProductData, settings);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.anything()
      );
    });

    it('should use Claude endpoint for claude models', async () => {
      const settings: AIProviderConfig = { api_key: 'claude-key', model: 'claude-3-opus' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          content: [{
            type: 'text',
            text: JSON.stringify([
              { title: 'Test', rating: 4.0, summary: 'Good', url: 'https://example.com' },
            ]),
          }],
        }),
      });

      await analyzer.searchWithAI(mockProductData, settings);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.anthropic.com'),
        expect.anything()
      );
    });
  });
});
