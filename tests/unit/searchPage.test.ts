/**
 * Unit tests for SearchPage component
 * Tests: wiring of SearchInput, ModeSelector, LoadingOverlay, SearchResults,
 * Pagination with SearchEngine, AIAnalyzer, HistoryManager, FavoritesManager, SettingsManager.
 *
 * Requirements: 1.6, 2.1, 2.2, 2.3, 7.1, 7.3, 7.4, 10.1
 *
 * @jest-environment jsdom
 */

import { SearchPage, createSearchPage } from '../../src/components/searchPage';
import { SearchEngine } from '../../src/services/searchEngine';
import { AIAnalyzer } from '../../src/services/aiAnalyzer';
import { HistoryManager } from '../../src/services/historyManager';
import { FavoritesManager } from '../../src/services/favoritesManager';
import { SettingsManager } from '../../src/services/settingsManager';
import type { SearchResult, ProductData, AISettings } from '../../src/models/types';

// Mock validators to always pass
jest.mock('../../src/utils/validators', () => ({
  validateProductData: jest.fn().mockReturnValue({ valid: true, errors: [] }),
}));

// Mock helpers
jest.mock('../../src/utils/helpers', () => ({
  generateId: jest.fn().mockReturnValue('test-uuid-123'),
  calculatePages: jest.fn((totalHits: number, pageSize: number) => Math.ceil(totalHits / pageSize)),
  maskApiKey: jest.fn((key: string) => '****' + key.slice(-4)),
  validateSearchResult: jest.fn().mockReturnValue({ valid: true, errors: [] }),
}));

describe('SearchPage', () => {
  let container: HTMLElement;
  let mockSearchEngine: jest.Mocked<SearchEngine>;
  let mockAIAnalyzer: jest.Mocked<AIAnalyzer>;
  let mockHistoryManager: jest.Mocked<HistoryManager>;
  let mockFavoritesManager: jest.Mocked<FavoritesManager>;
  let mockSettingsManager: jest.Mocked<SettingsManager>;

  const mockSearchResult: SearchResult = {
    search_mode: 'non-AI',
    total_hits: 3,
    pager: { page: 1, pages: 1 },
    ai_settings: null,
    ai_summary: null,
    reviews: [
      { id: 'r1', title: 'Great product', rating: 4.5, summary: 'Very good', url: 'https://example.com/r1' },
      { id: 'r2', title: 'Decent', rating: 3.0, summary: 'OK product', url: 'https://example.com/r2' },
      { id: 'r3', title: 'Not bad', rating: 3.5, summary: 'Average', url: 'https://example.com/r3' },
    ],
  };

  const mockAISearchResult: SearchResult = {
    search_mode: 'AI',
    total_hits: 2,
    pager: { page: 1, pages: 1 },
    ai_settings: { model: 'gpt-4', confidence_threshold: 0.7 },
    ai_summary: { average_rating: 4.0, credibility_score: 80, summary_text: 'Good product overall' },
    reviews: [
      { id: 'r1', title: 'AI Review 1', rating: 4.0, summary: 'AI found this', url: 'https://example.com/ai1' },
      { id: 'r2', title: 'AI Review 2', rating: 4.0, summary: 'AI found this too', url: 'https://example.com/ai2' },
    ],
  };

  const mockSettings: AISettings = {
    activeProvider: 'openai',
    providers: {
      openai: { api_key: 'sk-test-key-12345', model: 'gpt-4' },
      google: { api_key: '', model: '' },
      claude: { api_key: '', model: '' },
    },
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    // Create mocked services
    mockSearchEngine = {
      search: jest.fn().mockResolvedValue(mockSearchResult),
    } as unknown as jest.Mocked<SearchEngine>;

    mockAIAnalyzer = {
      analyzeImage: jest.fn().mockResolvedValue({ success: true, productType: 'Electronics', confidence: 0.9 }),
      generateSummary: jest.fn().mockResolvedValue({ average_rating: 4.0, credibility_score: 80, summary_text: 'Good' }),
      searchWithAI: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<AIAnalyzer>;

    mockHistoryManager = {
      addEntry: jest.fn(),
      getEntries: jest.fn().mockReturnValue([]),
      clearAll: jest.fn(),
    } as unknown as jest.Mocked<HistoryManager>;

    mockFavoritesManager = {
      add: jest.fn().mockReturnValue({ success: true }),
      remove: jest.fn(),
      getAll: jest.fn().mockReturnValue([]),
      isFavorited: jest.fn().mockReturnValue(false),
      getCount: jest.fn().mockReturnValue(0),
    } as unknown as jest.Mocked<FavoritesManager>;

    mockSettingsManager = {
      getSettings: jest.fn().mockReturnValue(mockSettings),
      saveSettings: jest.fn(),
      getProviderConfig: jest.fn().mockReturnValue(mockSettings.providers.openai),
      validateSettings: jest.fn().mockReturnValue({ valid: true, errors: [] }),
      maskApiKey: jest.fn((key: string) => '****' + key.slice(-4)),
    } as unknown as jest.Mocked<SettingsManager>;
  });

  afterEach(() => {
    document.body.removeChild(container);
    jest.clearAllMocks();
  });

  function createPage(): SearchPage {
    return new SearchPage(container, {
      searchEngine: mockSearchEngine,
      aiAnalyzer: mockAIAnalyzer,
      historyManager: mockHistoryManager,
      favoritesManager: mockFavoritesManager,
      settingsManager: mockSettingsManager,
    });
  }

  describe('Rendering', () => {
    it('should render the page with all component containers', () => {
      createPage();

      expect(container.querySelector('#search-mode-selector')).not.toBeNull();
      expect(container.querySelector('#search-input-container')).not.toBeNull();
      expect(container.querySelector('#loading-overlay-container')).not.toBeNull();
      expect(container.querySelector('#search-results-container')).not.toBeNull();
      expect(container.querySelector('#pagination-container')).not.toBeNull();
    });

    it('should render the ModeSelector with non-AI as default', () => {
      createPage();

      const nonAIInput = container.querySelector('#modeNonAI') as HTMLInputElement;
      expect(nonAIInput).not.toBeNull();
      expect(nonAIInput.checked).toBe(true);
    });

    it('should render the SearchInput form', () => {
      createPage();

      expect(container.querySelector('#search-input-form')).not.toBeNull();
      expect(container.querySelector('#product-name-input')).not.toBeNull();
    });
  });

  describe('Search execution (Requirement 2.2 - non-AI mode)', () => {
    it('should call SearchEngine.search with non-AI mode when form is submitted', async () => {
      createPage();

      // Fill in form
      const nameInput = container.querySelector('#product-name-input') as HTMLInputElement;
      nameInput.value = 'テスト商品';

      // Submit form
      const form = container.querySelector('#search-input-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      // Wait for async search
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockSearchEngine.search).toHaveBeenCalledWith(
        expect.objectContaining({
          productData: expect.objectContaining({ productName: 'テスト商品' }),
          mode: 'non-AI',
          page: 1,
        })
      );
    });
  });

  describe('Search execution (Requirement 2.3 - AI mode)', () => {
    it('should call SearchEngine.search with AI mode and settings when AI mode is selected', async () => {
      mockSearchEngine.search.mockResolvedValue(mockAISearchResult);
      createPage();

      // Switch to AI mode
      const aiInput = container.querySelector('#modeAI') as HTMLInputElement;
      aiInput.checked = true;
      aiInput.dispatchEvent(new Event('change', { bubbles: true }));

      // Fill in form
      const nameInput = container.querySelector('#product-name-input') as HTMLInputElement;
      nameInput.value = 'AI商品';

      // Submit form
      const form = container.querySelector('#search-input-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockSearchEngine.search).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'AI',
          aiSettings: mockSettings,
        })
      );
    });
  });

  describe('Loading state (Requirement 7.1, 7.3)', () => {
    it('should show loading overlay when search starts', async () => {
      // Make search take some time
      mockSearchEngine.search.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockSearchResult), 100)));
      createPage();

      const nameInput = container.querySelector('#product-name-input') as HTMLInputElement;
      nameInput.value = 'テスト商品';

      const form = container.querySelector('#search-input-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      // Check loading state immediately
      await new Promise(resolve => setTimeout(resolve, 0));
      const loadingContainer = container.querySelector('#loading-overlay-container') as HTMLElement;
      expect(loadingContainer.querySelector('.loading-overlay')).not.toBeNull();
    });

    it('should hide loading overlay when search completes', async () => {
      createPage();

      const nameInput = container.querySelector('#product-name-input') as HTMLInputElement;
      nameInput.value = 'テスト商品';

      const form = container.querySelector('#search-input-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await new Promise(resolve => setTimeout(resolve, 0));

      const loadingContainer = container.querySelector('#loading-overlay-container') as HTMLElement;
      expect(loadingContainer.querySelector('.loading-overlay')).toBeNull();
    });

    it('should disable search button during loading', async () => {
      mockSearchEngine.search.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockSearchResult), 100)));
      createPage();

      const nameInput = container.querySelector('#product-name-input') as HTMLInputElement;
      nameInput.value = 'テスト商品';

      const form = container.querySelector('#search-input-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await new Promise(resolve => setTimeout(resolve, 0));

      const btn = container.querySelector('#search-submit-btn') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });
  });

  describe('Error handling (Requirement 7.4)', () => {
    it('should show error message when search fails', async () => {
      mockSearchEngine.search.mockRejectedValue(new Error('Network error'));
      createPage();

      const nameInput = container.querySelector('#product-name-input') as HTMLInputElement;
      nameInput.value = 'テスト商品';

      const form = container.querySelector('#search-input-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await new Promise(resolve => setTimeout(resolve, 0));

      const loadingContainer = container.querySelector('#loading-overlay-container') as HTMLElement;
      expect(loadingContainer.querySelector('.alert-danger')).not.toBeNull();
    });

    it('should show timeout message when search times out', async () => {
      const timeoutError = { type: 'timeout', code: 'SEARCH_TIMEOUT', message: 'タイムアウト', retryable: true };
      mockSearchEngine.search.mockRejectedValue(timeoutError);
      createPage();

      const nameInput = container.querySelector('#product-name-input') as HTMLInputElement;
      nameInput.value = 'テスト商品';

      const form = container.querySelector('#search-input-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await new Promise(resolve => setTimeout(resolve, 0));

      const loadingContainer = container.querySelector('#loading-overlay-container') as HTMLElement;
      expect(loadingContainer.querySelector('.alert-warning')).not.toBeNull();
    });
  });

  describe('Results display', () => {
    it('should display search results after successful search', async () => {
      createPage();

      const nameInput = container.querySelector('#product-name-input') as HTMLInputElement;
      nameInput.value = 'テスト商品';

      const form = container.querySelector('#search-input-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await new Promise(resolve => setTimeout(resolve, 0));

      const resultsContainer = container.querySelector('#search-results-container') as HTMLElement;
      expect(resultsContainer.querySelector('[data-testid="total-hits"]')).not.toBeNull();
      expect(resultsContainer.querySelector('[data-testid="review-card"]')).not.toBeNull();
    });

    it('should display AI summary card in AI mode', async () => {
      mockSearchEngine.search.mockResolvedValue(mockAISearchResult);
      createPage();

      // Switch to AI mode
      const aiInput = container.querySelector('#modeAI') as HTMLInputElement;
      aiInput.checked = true;
      aiInput.dispatchEvent(new Event('change', { bubbles: true }));

      const nameInput = container.querySelector('#product-name-input') as HTMLInputElement;
      nameInput.value = 'AI商品';

      const form = container.querySelector('#search-input-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await new Promise(resolve => setTimeout(resolve, 0));

      const resultsContainer = container.querySelector('#search-results-container') as HTMLElement;
      expect(resultsContainer.querySelector('[data-testid="ai-summary-card"]')).not.toBeNull();
    });
  });

  describe('Image upload → AIAnalyzer.analyzeImage (Requirement 1.6)', () => {
    it('should call AIAnalyzer.analyzeImage when image is uploaded in AI mode', async () => {
      mockSearchEngine.search.mockResolvedValue(mockAISearchResult);
      createPage();

      // Switch to AI mode
      const aiInput = container.querySelector('#modeAI') as HTMLInputElement;
      aiInput.checked = true;
      aiInput.dispatchEvent(new Event('change', { bubbles: true }));

      // Set up image
      const imageInput = container.querySelector('#product-image-input') as HTMLInputElement;
      const file = new File(['image-data'], 'product.jpg', { type: 'image/jpeg' });
      Object.defineProperty(imageInput, 'files', { value: [file], writable: true });
      imageInput.dispatchEvent(new Event('change', { bubbles: true }));

      // Fill in product name
      const nameInput = container.querySelector('#product-name-input') as HTMLInputElement;
      nameInput.value = 'テスト商品';

      // Submit
      const form = container.querySelector('#search-input-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockAIAnalyzer.analyzeImage).toHaveBeenCalledWith(
        file,
        mockSettings.providers.openai
      );
    });

    it('should not call AIAnalyzer.analyzeImage in non-AI mode', async () => {
      createPage();

      // Set up image (in non-AI mode)
      const imageInput = container.querySelector('#product-image-input') as HTMLInputElement;
      const file = new File(['image-data'], 'product.jpg', { type: 'image/jpeg' });
      Object.defineProperty(imageInput, 'files', { value: [file], writable: true });
      imageInput.dispatchEvent(new Event('change', { bubbles: true }));

      const nameInput = container.querySelector('#product-name-input') as HTMLInputElement;
      nameInput.value = 'テスト商品';

      const form = container.querySelector('#search-input-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockAIAnalyzer.analyzeImage).not.toHaveBeenCalled();
    });
  });

  describe('History integration (Requirement 10.1)', () => {
    it('should save search to history after successful execution', async () => {
      createPage();

      const nameInput = container.querySelector('#product-name-input') as HTMLInputElement;
      nameInput.value = 'テスト商品';

      const genreInput = container.querySelector('#genre-input') as HTMLInputElement;
      genreInput.value = '電子機器';

      const form = container.querySelector('#search-input-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockHistoryManager.addEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          productData: expect.objectContaining({
            productName: 'テスト商品',
            genre: '電子機器',
          }),
          searchMode: 'non-AI',
          totalHits: 3,
        })
      );
    });

    it('should not save to history when search fails', async () => {
      mockSearchEngine.search.mockRejectedValue(new Error('Failed'));
      createPage();

      const nameInput = container.querySelector('#product-name-input') as HTMLInputElement;
      nameInput.value = 'テスト商品';

      const form = container.querySelector('#search-input-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockHistoryManager.addEntry).not.toHaveBeenCalled();
    });
  });

  describe('Favorites integration', () => {
    it('should call FavoritesManager.add when favorite toggle is clicked on unfavorited review', async () => {
      createPage();

      const nameInput = container.querySelector('#product-name-input') as HTMLInputElement;
      nameInput.value = 'テスト商品';

      const form = container.querySelector('#search-input-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await new Promise(resolve => setTimeout(resolve, 0));

      // Click favorite toggle on first review
      const favoriteBtn = container.querySelector('[data-testid="favorite-toggle"]') as HTMLButtonElement;
      expect(favoriteBtn).not.toBeNull();
      favoriteBtn.click();

      expect(mockFavoritesManager.add).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'r1' }),
        expect.objectContaining({ productName: 'テスト商品', searchMode: 'non-AI' })
      );
    });

    it('should call FavoritesManager.remove when favorite toggle is clicked on favorited review', async () => {
      mockFavoritesManager.isFavorited.mockReturnValue(true);
      createPage();

      const nameInput = container.querySelector('#product-name-input') as HTMLInputElement;
      nameInput.value = 'テスト商品';

      const form = container.querySelector('#search-input-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await new Promise(resolve => setTimeout(resolve, 0));

      const favoriteBtn = container.querySelector('[data-testid="favorite-toggle"]') as HTMLButtonElement;
      favoriteBtn.click();

      expect(mockFavoritesManager.remove).toHaveBeenCalledWith('r1');
    });
  });

  describe('Mode switching (Requirement 2.1)', () => {
    it('should default to non-AI mode', () => {
      createPage();

      const nonAIInput = container.querySelector('#modeNonAI') as HTMLInputElement;
      expect(nonAIInput.checked).toBe(true);
    });

    it('should switch to AI mode when AI radio is selected', () => {
      createPage();

      const aiInput = container.querySelector('#modeAI') as HTMLInputElement;
      aiInput.checked = true;
      aiInput.dispatchEvent(new Event('change', { bubbles: true }));

      const aiLabel = container.querySelector('[data-mode="AI"]') as HTMLElement;
      expect(aiLabel.classList.contains('active')).toBe(true);
    });
  });

  describe('Factory function', () => {
    it('should create a SearchPage instance', () => {
      const page = createSearchPage(container, {
        searchEngine: mockSearchEngine,
        aiAnalyzer: mockAIAnalyzer,
        historyManager: mockHistoryManager,
        favoritesManager: mockFavoritesManager,
        settingsManager: mockSettingsManager,
      });
      expect(page).toBeInstanceOf(SearchPage);
    });
  });

  describe('destroy', () => {
    it('should clear the container', () => {
      const page = createPage();
      expect(container.innerHTML).not.toBe('');

      page.destroy();
      expect(container.innerHTML).toBe('');
    });
  });
});
