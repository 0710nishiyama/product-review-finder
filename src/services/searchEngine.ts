/**
 * SearchEngine Service
 * Dispatches search requests to non-AI (web crawling) or AI mode.
 * Builds structured SearchResult JSON with pagination, timeout handling, and all required fields.
 *
 * Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 6.1-6.9, 7.5
 */

import type {
  SearchResult,
  ReviewItem,
  Pager,
  AISettingsOutput,
  AISummary,
  ProductData,
  SearchMode,
  AISettings,
  AppError,
} from '../models/types.js';
import { calculatePages } from '../utils/helpers.js';
import { AIAnalyzer } from './aiAnalyzer.js';

/** Parameters for a search request */
export interface SearchParams {
  productData: ProductData;
  mode: SearchMode;
  page: number;
  aiSettings?: AISettings;
}

/** Interface for the SearchEngine service */
export interface ISearchEngine {
  search(params: SearchParams): Promise<SearchResult>;
}

/** Page size constant: 10 items per page */
const PAGE_SIZE = 10;

/** Timeout for non-AI mode (30 seconds) */
const NON_AI_TIMEOUT_MS = 30_000;

/** Timeout for AI mode (60 seconds) */
const AI_TIMEOUT_MS = 60_000;

/** Maximum results for non-AI mode */
const NON_AI_MAX_RESULTS = 50;

/** Maximum results for AI mode */
const AI_MAX_RESULTS = 30;

export class SearchEngine implements ISearchEngine {
  private aiAnalyzer: AIAnalyzer;

  constructor(aiAnalyzer?: AIAnalyzer) {
    this.aiAnalyzer = aiAnalyzer ?? new AIAnalyzer();
  }

  /**
   * Execute a search based on the given parameters.
   * Dispatches to non-AI or AI mode and returns a structured SearchResult.
   */
  async search(params: SearchParams): Promise<SearchResult> {
    const { mode, page } = params;

    if (mode === 'AI') {
      return this.searchAIMode(params, page);
    } else {
      return this.searchNonAIMode(params, page);
    }
  }

  /**
   * Non-AI mode: perform web crawling search with 30-second timeout, max 50 results.
   * Returns SearchResult with ai_summary = null and ai_settings = null.
   */
  private async searchNonAIMode(params: SearchParams, page: number): Promise<SearchResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), NON_AI_TIMEOUT_MS);

    try {
      const allReviews = await this.performWebCrawling(params.productData, controller.signal);
      clearTimeout(timeoutId);

      // Limit to max results
      const limitedReviews = allReviews.slice(0, NON_AI_MAX_RESULTS);
      const totalHits = limitedReviews.length;

      return this.buildSearchResult({
        searchMode: 'non-AI',
        totalHits,
        page,
        allReviews: limitedReviews,
        aiSettings: null,
        aiSummary: null,
      });
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (this.isAbortError(error)) {
        throw this.createTimeoutError('non-AI');
      }
      throw error;
    }
  }

  /**
   * AI mode: delegate to AIAnalyzer with 60-second timeout, max 30 results.
   * Returns SearchResult with ai_summary and ai_settings populated.
   */
  private async searchAIMode(params: SearchParams, page: number): Promise<SearchResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    try {
      if (!params.aiSettings) {
        clearTimeout(timeoutId);
        throw this.createSettingsError();
      }

      const providerConfig = params.aiSettings.providers[params.aiSettings.activeProvider];

      // Delegate to AIAnalyzer for review collection
      const allReviews = await this.aiAnalyzer.searchWithAI(
        params.productData,
        providerConfig,
        controller.signal
      );
      clearTimeout(timeoutId);

      // Limit to max results
      const limitedReviews = allReviews.slice(0, AI_MAX_RESULTS);
      const totalHits = limitedReviews.length;

      // Generate AI summary
      let aiSummary: AISummary | null = null;
      if (totalHits > 0) {
        aiSummary = await this.aiAnalyzer.generateSummary(
          limitedReviews,
          params.productData,
          providerConfig
        );
      } else {
        aiSummary = {
          average_rating: null,
          credibility_score: null,
          summary_text: '該当するレビューが見つかりませんでした。',
        };
      }

      // Build AI settings output
      const aiSettingsOutput: AISettingsOutput = {
        model: providerConfig.model || 'default',
        confidence_threshold: 0.7, // Default confidence threshold
      };

      return this.buildSearchResult({
        searchMode: 'AI',
        totalHits,
        page,
        allReviews: limitedReviews,
        aiSettings: aiSettingsOutput,
        aiSummary,
      });
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (this.isAbortError(error)) {
        throw this.createTimeoutError('AI');
      }
      throw error;
    }
  }

  /**
   * Perform web crawling to find reviews matching the product data.
   * Calls the proxy server at localhost:3001 to bypass CORS restrictions.
   */
  private async performWebCrawling(
    productData: ProductData,
    signal: AbortSignal
  ): Promise<ReviewItem[]> {
    // Check if already aborted
    if (signal.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError');
    }

    const response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productName: productData.productName,
        genre: productData.genre,
        productUrl: productData.productUrl,
      }),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error((errorData as { error?: string }).error || '検索に失敗しました');
    }

    const data = await response.json() as { reviews: ReviewItem[]; total: number };
    return data.reviews || [];
  }

  /**
   * Build a SearchResult object with pagination applied.
   */
  private buildSearchResult(options: {
    searchMode: 'AI' | 'non-AI';
    totalHits: number;
    page: number;
    allReviews: ReviewItem[];
    aiSettings: AISettingsOutput | null;
    aiSummary: AISummary | null;
  }): SearchResult {
    const { searchMode, totalHits, page, allReviews, aiSettings, aiSummary } = options;

    // Handle zero results case
    if (totalHits === 0) {
      return {
        search_mode: searchMode,
        total_hits: 0,
        pager: { page: 1, pages: 0 },
        ai_settings: searchMode === 'AI' ? aiSettings : null,
        ai_summary: searchMode === 'AI' ? aiSummary : null,
        reviews: [],
      };
    }

    // Calculate pagination
    const totalPages = calculatePages(totalHits, PAGE_SIZE);
    const currentPage = Math.max(1, Math.min(page, totalPages));

    // Slice reviews for current page
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    const pageReviews = allReviews.slice(startIndex, endIndex);

    const pager: Pager = {
      page: currentPage,
      pages: totalPages,
    };

    return {
      search_mode: searchMode,
      total_hits: totalHits,
      pager,
      ai_settings: searchMode === 'AI' ? aiSettings : null,
      ai_summary: searchMode === 'non-AI' ? null : aiSummary,
      reviews: pageReviews,
    };
  }

  /**
   * Check if an error is an AbortError (timeout).
   */
  private isAbortError(error: unknown): boolean {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return true;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      return true;
    }
    return false;
  }

  /**
   * Create a timeout AppError.
   */
  private createTimeoutError(mode: SearchMode): AppError {
    const timeoutSeconds = mode === 'AI' ? 60 : 30;
    return {
      type: 'timeout',
      code: 'SEARCH_TIMEOUT',
      message: `検索が${timeoutSeconds}秒以内に完了しませんでした。再試行してください。`,
      retryable: true,
    };
  }

  /**
   * Create an error for missing AI settings.
   */
  private createSettingsError(): AppError {
    return {
      type: 'validation',
      code: 'AI_SETTINGS_REQUIRED',
      message: 'AIモードの検索にはAI設定が必要です。設定画面でAPIキーとモデルを設定してください。',
      field: 'aiSettings',
      retryable: false,
    };
  }
}
