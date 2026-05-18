/**
 * SearchPage Component
 * Wires together all search-related components and services:
 * - SearchInput → SearchEngine/AIAnalyzer
 * - ModeSelector → controls search mode
 * - LoadingOverlay → search state
 * - SearchResults → displays SearchResult data
 * - Pagination → page navigation
 * - Image upload → AIAnalyzer.analyzeImage flow
 * - HistoryManager → saves searches on execution
 * - FavoritesManager → ReviewCard favorite toggle
 *
 * Requirements: 1.6, 2.1, 2.2, 2.3, 7.1, 7.3, 7.4, 10.1
 */

import type { ProductData, SearchResult, SearchMode, ReviewItem, AppError } from '../models/types.js';
import { SearchInput } from './searchInput.js';
import { ModeSelector } from './modeSelector.js';
import { LoadingOverlay } from './loadingOverlay.js';
import { SearchResults } from './searchResults.js';
import { Pagination } from './pagination.js';
import { SearchEngine } from '../services/searchEngine.js';
import { AIAnalyzer } from '../services/aiAnalyzer.js';
import { HistoryManager } from '../services/historyManager.js';
import { FavoritesManager } from '../services/favoritesManager.js';
import { SettingsManager } from '../services/settingsManager.js';

/**
 * SearchPage orchestrates the search workflow:
 * 1. User fills in product data via SearchInput
 * 2. User selects search mode via ModeSelector
 * 3. On search submit, LoadingOverlay is shown
 * 4. SearchEngine executes the search (non-AI or AI mode)
 * 5. If image is uploaded in AI mode, AIAnalyzer.analyzeImage identifies product type
 * 6. Results are displayed via SearchResults + Pagination
 * 7. Search is saved to HistoryManager
 * 8. Favorite toggles are handled via FavoritesManager
 */
export class SearchPage {
  private container: HTMLElement;

  // Child components
  private searchInput: SearchInput | null = null;
  private modeSelector: ModeSelector | null = null;
  private loadingOverlay: LoadingOverlay | null = null;
  private searchResults: SearchResults | null = null;
  private pagination: Pagination | null = null;

  // Services
  private searchEngine: SearchEngine;
  private aiAnalyzer: AIAnalyzer;
  private historyManager: HistoryManager;
  private favoritesManager: FavoritesManager;
  private settingsManager: SettingsManager;

  // State
  private currentMode: SearchMode = 'non-AI';
  private currentResult: SearchResult | null = null;
  private currentProductData: ProductData | null = null;
  private isLoading: boolean = false;

  constructor(
    container: HTMLElement,
    options?: {
      searchEngine?: SearchEngine;
      aiAnalyzer?: AIAnalyzer;
      historyManager?: HistoryManager;
      favoritesManager?: FavoritesManager;
      settingsManager?: SettingsManager;
    }
  ) {
    this.container = container;
    this.searchEngine = options?.searchEngine ?? new SearchEngine();
    this.aiAnalyzer = options?.aiAnalyzer ?? new AIAnalyzer();
    this.historyManager = options?.historyManager ?? new HistoryManager();
    this.favoritesManager = options?.favoritesManager ?? new FavoritesManager();
    this.settingsManager = options?.settingsManager ?? new SettingsManager();

    this.render();
    this.mountComponents();
  }

  /**
   * Render the page layout with containers for each child component.
   */
  render(): void {
    this.container.innerHTML = `
      <h2 class="mb-3">商品レビュー検索</h2>
      <div id="search-mode-selector" class="mb-3" style="display:none;"></div>
      <div id="search-input-container" class="mb-3"></div>
      <div id="loading-overlay-container"></div>
      <div id="search-error-container"></div>
      <div id="search-results-container" class="mt-3"></div>
      <div id="pagination-container" class="mt-3"></div>
    `;
  }

  /**
   * Mount all child components into their respective containers.
   */
  private mountComponents(): void {
    const modeSelectorContainer = this.container.querySelector('#search-mode-selector') as HTMLElement;
    const searchInputContainer = this.container.querySelector('#search-input-container') as HTMLElement;
    const loadingContainer = this.container.querySelector('#loading-overlay-container') as HTMLElement;
    const resultsContainer = this.container.querySelector('#search-results-container') as HTMLElement;
    const paginationContainer = this.container.querySelector('#pagination-container') as HTMLElement;

    // Mount ModeSelector (Requirement 2.1: default to non-AI mode)
    this.modeSelector = new ModeSelector(modeSelectorContainer, {
      selectedMode: this.currentMode,
      onModeChange: (mode: SearchMode) => this.handleModeChange(mode),
    });

    // Mount SearchInput (wired to trigger search)
    this.searchInput = new SearchInput(searchInputContainer, {
      onSearch: (productData: ProductData) => this.handleSearch(productData),
      isLoading: this.isLoading,
    });

    // Mount LoadingOverlay
    this.loadingOverlay = new LoadingOverlay(loadingContainer);

    // Mount SearchResults (with favorite toggle wired to FavoritesManager)
    this.searchResults = new SearchResults(resultsContainer, {
      result: null,
      onFavoriteToggle: (review: ReviewItem) => this.handleFavoriteToggle(review),
      isFavorited: (reviewId: string) => this.favoritesManager.isFavorited(reviewId),
    });

    // Mount Pagination
    this.pagination = new Pagination(paginationContainer, {
      currentPage: 1,
      totalPages: 0,
      onPageChange: (page: number) => this.handlePageChange(page),
    });
  }

  /**
   * Handle mode change from ModeSelector.
   * Requirement 2.1: Switch between non-AI and AI mode.
   */
  private handleModeChange(mode: SearchMode): void {
    this.currentMode = mode;
  }

  /**
   * Handle search execution triggered by SearchInput.
   * Requirements: 1.6, 2.2, 2.3, 7.1, 7.3, 7.4, 10.1
   */
  private async handleSearch(productData: ProductData): Promise<void> {
    if (this.isLoading) return;

    this.currentProductData = productData;
    this.isLoading = true;

    // Requirement 7.1: Show loading overlay and disable search button
    this.loadingOverlay?.show();
    this.searchInput?.setLoading(true);
    this.clearError();

    try {
      // Requirement 1.6: If image is uploaded in AI mode, analyze it first
      let enrichedProductData = { ...productData };
      if (productData.productImage && this.currentMode === 'AI') {
        enrichedProductData = await this.handleImageAnalysis(productData);
      }

      // Get AI settings for AI mode
      const aiSettings = this.currentMode === 'AI'
        ? this.settingsManager.getSettings()
        : undefined;

      // Execute search via SearchEngine (Requirement 2.2, 2.3)
      const result = await this.searchEngine.search({
        productData: enrichedProductData,
        mode: this.currentMode,
        page: 1,
        aiSettings,
      });

      this.currentResult = result;

      // Requirement 7.3: Hide loading and show results on completion
      this.loadingOverlay?.hideOnComplete();
      this.searchInput?.setLoading(false);
      this.isLoading = false;

      // Display results
      this.displayResults(result);

      // Requirement 10.1: Save search to history
      this.historyManager.addEntry({
        productData: {
          productName: enrichedProductData.productName,
          genre: enrichedProductData.genre,
          productUrl: enrichedProductData.productUrl,
        },
        searchMode: this.currentMode,
        totalHits: result.total_hits,
      });
    } catch (error: unknown) {
      this.isLoading = false;
      this.searchInput?.setLoading(false);

      // Requirement 7.4: Hide loading and show error on failure
      if (this.isAppError(error) && error.type === 'timeout') {
        this.loadingOverlay?.hideOnTimeout();
      } else {
        const message = error instanceof Error
          ? error.message
          : (this.isAppError(error) ? error.message : '検索中にエラーが発生しました');
        this.loadingOverlay?.hideOnError(message);
      }
    }
  }

  /**
   * Handle image analysis via AIAnalyzer.
   * Requirement 1.6: When image is uploaded, AI analyzes it to identify product type.
   * Returns enriched ProductData with genre set from image analysis if successful.
   */
  private async handleImageAnalysis(productData: ProductData): Promise<ProductData> {
    if (!productData.productImage) return productData;

    const settings = this.settingsManager.getSettings();
    const providerConfig = settings.providers[settings.activeProvider];

    const analysisResult = await this.aiAnalyzer.analyzeImage(
      productData.productImage,
      providerConfig
    );

    if (analysisResult.success && analysisResult.productType) {
      // Enrich product data with identified product type as genre
      return {
        ...productData,
        genre: productData.genre || analysisResult.productType,
      };
    }

    // If analysis fails, show error but continue with original data (Requirement 1.8)
    if (analysisResult.error) {
      this.showError(analysisResult.error);
    }

    return productData;
  }

  /**
   * Handle page change from Pagination component.
   * Re-executes search for the requested page.
   */
  private async handlePageChange(page: number): Promise<void> {
    if (!this.currentProductData || this.isLoading) return;

    this.isLoading = true;
    this.loadingOverlay?.show();
    this.searchInput?.setLoading(true);

    try {
      const aiSettings = this.currentMode === 'AI'
        ? this.settingsManager.getSettings()
        : undefined;

      const result = await this.searchEngine.search({
        productData: this.currentProductData,
        mode: this.currentMode,
        page,
        aiSettings,
      });

      this.currentResult = result;
      this.loadingOverlay?.hideOnComplete();
      this.searchInput?.setLoading(false);
      this.isLoading = false;

      this.displayResults(result);
    } catch (error: unknown) {
      this.isLoading = false;
      this.searchInput?.setLoading(false);

      if (this.isAppError(error) && error.type === 'timeout') {
        this.loadingOverlay?.hideOnTimeout();
      } else {
        const message = error instanceof Error
          ? error.message
          : '検索中にエラーが発生しました';
        this.loadingOverlay?.hideOnError(message);
      }
    }
  }

  /**
   * Handle favorite toggle from ReviewCard.
   * Integrates FavoritesManager to add/remove favorites.
   */
  private handleFavoriteToggle(review: ReviewItem): void {
    if (this.favoritesManager.isFavorited(review.id)) {
      this.favoritesManager.remove(review.id);
    } else {
      const result = this.favoritesManager.add(review, {
        productName: this.currentProductData?.productName ?? '',
        searchMode: this.currentMode,
      });

      if (!result.success && result.error === 'LIMIT_REACHED') {
        this.showError('お気に入りの上限（200件）に達しました。');
      }
    }

    // Re-render results to update favorite state
    if (this.currentResult) {
      this.displayResults(this.currentResult);
    }
  }

  /**
   * Display search results and pagination.
   */
  private displayResults(result: SearchResult): void {
    this.searchResults?.update({
      result,
      onFavoriteToggle: (review: ReviewItem) => this.handleFavoriteToggle(review),
      isFavorited: (reviewId: string) => this.favoritesManager.isFavorited(reviewId),
    });

    this.pagination?.update({
      currentPage: result.pager.page,
      totalPages: result.pager.pages,
      onPageChange: (page: number) => this.handlePageChange(page),
    });
  }

  /**
   * Show an error message in the error container.
   */
  private showError(message: string): void {
    const errorContainer = this.container.querySelector('#search-error-container') as HTMLElement;
    if (errorContainer) {
      errorContainer.innerHTML = `
        <div class="alert alert-warning alert-dismissible fade show mt-2" role="alert">
          ${this.escapeHtml(message)}
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="閉じる"></button>
        </div>
      `;
    }
  }

  /**
   * Clear the error container.
   */
  private clearError(): void {
    const errorContainer = this.container.querySelector('#search-error-container') as HTMLElement;
    if (errorContainer) {
      errorContainer.innerHTML = '';
    }
  }

  /**
   * Check if an error is an AppError.
   */
  private isAppError(error: unknown): error is AppError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'type' in error &&
      'code' in error &&
      'message' in error
    );
  }

  /**
   * Escape HTML to prevent XSS.
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Destroy the page and all child components.
   */
  destroy(): void {
    this.searchInput?.destroy();
    this.modeSelector?.destroy();
    this.loadingOverlay?.destroy();
    this.searchResults?.destroy();
    this.pagination?.destroy();
    this.container.innerHTML = '';
  }
}

/**
 * Factory function to create and mount a SearchPage.
 */
export function createSearchPage(
  container: HTMLElement,
  options?: {
    searchEngine?: SearchEngine;
    aiAnalyzer?: AIAnalyzer;
    historyManager?: HistoryManager;
    favoritesManager?: FavoritesManager;
    settingsManager?: SettingsManager;
  }
): SearchPage {
  return new SearchPage(container, options);
}
