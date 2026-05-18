/**
 * Unit tests for FavoritesPage component
 * Tests: rendering, ordering, remove functionality, limit message, empty state
 * Requirements: 10.4, 10.5, 10.6
 *
 * @jest-environment jsdom
 */

import { FavoritesPage, createFavoritesPage } from '../../src/components/favoritesPage';
import { FavoritesManager } from '../../src/services/favoritesManager';
import type { FavoriteItem, ReviewItem } from '../../src/models/types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock generateId to return predictable UUIDs
let idCounter = 0;
jest.mock('../../src/utils/helpers', () => ({
  generateId: () => `test-uuid-${++idCounter}`,
}));

function createMockReview(overrides: Partial<ReviewItem> = {}): ReviewItem {
  return {
    id: `review-${Date.now()}-${Math.random()}`,
    title: 'テストレビュー',
    rating: 4.0,
    summary: 'テストサマリ',
    url: 'https://example.com/review',
    ...overrides,
  };
}

function createMockFavorite(overrides: Partial<FavoriteItem> = {}): FavoriteItem {
  return {
    id: `fav-${Date.now()}-${Math.random()}`,
    addedAt: new Date().toISOString(),
    review: createMockReview(),
    searchContext: {
      productName: 'テスト商品',
      searchMode: 'non-AI',
    },
    ...overrides,
  };
}

describe('FavoritesPage', () => {
  let container: HTMLElement;
  let favoritesManager: FavoritesManager;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    localStorageMock.clear();
    idCounter = 0;
    favoritesManager = new FavoritesManager();
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('Rendering', () => {
    it('should render the favorites page with title', () => {
      new FavoritesPage(container, favoritesManager);
      const page = container.querySelector('[data-testid="favorites-page"]');
      expect(page).not.toBeNull();
      expect(container.querySelector('h2')?.textContent).toBe('お気に入り');
    });

    it('should display the current count and max limit', () => {
      new FavoritesPage(container, favoritesManager);
      const countEl = container.querySelector('[data-testid="favorites-count"]');
      expect(countEl?.textContent).toContain('0 / 200');
    });

    it('should show empty state when no favorites exist', () => {
      new FavoritesPage(container, favoritesManager);
      const emptyState = container.querySelector('[data-testid="empty-state"]');
      expect(emptyState).not.toBeNull();
      expect(emptyState?.textContent).toContain('お気に入りに登録されたレビューはありません');
    });

    it('should not show favorites list when empty', () => {
      new FavoritesPage(container, favoritesManager);
      const list = container.querySelector('[data-testid="favorites-list"]');
      expect(list).toBeNull();
    });
  });

  describe('Displaying favorites (Requirement 10.5)', () => {
    it('should display favorite cards when favorites exist', () => {
      const review = createMockReview({ id: 'r1', title: '素晴らしい商品' });
      favoritesManager.add(review, { productName: 'テスト商品', searchMode: 'non-AI' });

      new FavoritesPage(container, favoritesManager);

      const cards = container.querySelectorAll('[data-testid="favorite-card"]');
      expect(cards.length).toBe(1);
    });

    it('should display review title, rating, and summary', () => {
      const review = createMockReview({
        id: 'r1',
        title: '素晴らしい商品',
        rating: 4.5,
        summary: 'とても良い商品です',
      });
      favoritesManager.add(review, { productName: 'テスト商品', searchMode: 'non-AI' });

      new FavoritesPage(container, favoritesManager);

      expect(container.querySelector('[data-testid="favorite-title"]')?.textContent).toBe('素晴らしい商品');
      expect(container.querySelector('[data-testid="favorite-rating"]')?.textContent).toContain('4.5');
      expect(container.querySelector('[data-testid="favorite-summary"]')?.textContent).toBe('とても良い商品です');
    });

    it('should display search context with product name and search mode', () => {
      const review = createMockReview({ id: 'r1' });
      favoritesManager.add(review, { productName: 'iPhone 15', searchMode: 'AI' });

      new FavoritesPage(container, favoritesManager);

      const contextProduct = container.querySelector('[data-testid="context-product"]');
      const contextMode = container.querySelector('[data-testid="context-mode"]');
      expect(contextProduct?.textContent).toContain('iPhone 15');
      expect(contextMode?.textContent).toContain('AIモード');
    });

    it('should display non-AI mode label correctly', () => {
      const review = createMockReview({ id: 'r1' });
      favoritesManager.add(review, { productName: 'テスト', searchMode: 'non-AI' });

      new FavoritesPage(container, favoritesManager);

      const contextMode = container.querySelector('[data-testid="context-mode"]');
      expect(contextMode?.textContent).toContain('非AIモード');
    });

    it('should display source URL link with target="_blank"', () => {
      const review = createMockReview({ id: 'r1', url: 'https://example.com/review/1' });
      favoritesManager.add(review, { productName: 'テスト', searchMode: 'non-AI' });

      new FavoritesPage(container, favoritesManager);

      const link = container.querySelector('[data-testid="favorite-url"]') as HTMLAnchorElement;
      expect(link).not.toBeNull();
      expect(link.href).toBe('https://example.com/review/1');
      expect(link.target).toBe('_blank');
    });

    it('should display favorites ordered by addedAt descending (newest first)', () => {
      // Add favorites with different timestamps
      const review1 = createMockReview({ id: 'r1', title: '古いレビュー' });
      const review2 = createMockReview({ id: 'r2', title: '新しいレビュー' });

      // Manually set up localStorage with controlled timestamps
      const favorites: FavoriteItem[] = [
        {
          id: 'fav-1',
          addedAt: '2024-01-01T00:00:00.000Z',
          review: review1,
          searchContext: { productName: '商品A', searchMode: 'non-AI' },
        },
        {
          id: 'fav-2',
          addedAt: '2024-06-01T00:00:00.000Z',
          review: review2,
          searchContext: { productName: '商品B', searchMode: 'AI' },
        },
      ];
      localStorageMock.setItem('review-finder-favorites', JSON.stringify(favorites));

      // Re-create manager to pick up the stored data
      favoritesManager = new FavoritesManager();
      new FavoritesPage(container, favoritesManager);

      const titles = container.querySelectorAll('[data-testid="favorite-title"]');
      expect(titles.length).toBe(2);
      // Newest first
      expect(titles[0].textContent).toBe('新しいレビュー');
      expect(titles[1].textContent).toBe('古いレビュー');
    });
  });

  describe('Remove from favorites (Requirement 10.6)', () => {
    it('should render remove button for each favorite', () => {
      const review = createMockReview({ id: 'r1' });
      favoritesManager.add(review, { productName: 'テスト', searchMode: 'non-AI' });

      new FavoritesPage(container, favoritesManager);

      const removeButtons = container.querySelectorAll('[data-testid="remove-button"]');
      expect(removeButtons.length).toBe(1);
    });

    it('should remove favorite when remove button is clicked', () => {
      const review = createMockReview({ id: 'r1' });
      favoritesManager.add(review, { productName: 'テスト', searchMode: 'non-AI' });

      new FavoritesPage(container, favoritesManager);

      expect(favoritesManager.getCount()).toBe(1);

      const removeButton = container.querySelector('[data-testid="remove-button"]') as HTMLElement;
      removeButton.click();

      expect(favoritesManager.getCount()).toBe(0);
      // Should re-render with empty state
      expect(container.querySelector('[data-testid="empty-state"]')).not.toBeNull();
    });

    it('should update count after removal', () => {
      const review1 = createMockReview({ id: 'r1' });
      const review2 = createMockReview({ id: 'r2' });
      favoritesManager.add(review1, { productName: 'テスト', searchMode: 'non-AI' });
      favoritesManager.add(review2, { productName: 'テスト', searchMode: 'non-AI' });

      new FavoritesPage(container, favoritesManager);

      expect(container.querySelector('[data-testid="favorites-count"]')?.textContent).toContain('2 / 200');

      const removeButton = container.querySelector('[data-testid="remove-button"]') as HTMLElement;
      removeButton.click();

      expect(container.querySelector('[data-testid="favorites-count"]')?.textContent).toContain('1 / 200');
    });
  });

  describe('Limit reached message (Requirement 10.4)', () => {
    it('should not show limit message when under 200', () => {
      const review = createMockReview({ id: 'r1' });
      favoritesManager.add(review, { productName: 'テスト', searchMode: 'non-AI' });

      new FavoritesPage(container, favoritesManager);

      const limitMsg = container.querySelector('[data-testid="limit-message"]');
      expect(limitMsg).toBeNull();
    });

    it('should show limit message when at 200 favorites', () => {
      // Create 200 favorites directly in localStorage
      const favorites: FavoriteItem[] = [];
      for (let i = 0; i < 200; i++) {
        favorites.push({
          id: `fav-${i}`,
          addedAt: new Date(Date.now() - i * 1000).toISOString(),
          review: createMockReview({ id: `r-${i}`, title: `レビュー ${i}` }),
          searchContext: { productName: `商品${i}`, searchMode: 'non-AI' },
        });
      }
      localStorageMock.setItem('review-finder-favorites', JSON.stringify(favorites));
      favoritesManager = new FavoritesManager();

      new FavoritesPage(container, favoritesManager);

      const limitMsg = container.querySelector('[data-testid="limit-message"]');
      expect(limitMsg).not.toBeNull();
      expect(limitMsg?.textContent).toContain('上限');
      expect(limitMsg?.textContent).toContain('200');
    });

    it('should display count as 200 / 200 when at limit', () => {
      const favorites: FavoriteItem[] = [];
      for (let i = 0; i < 200; i++) {
        favorites.push({
          id: `fav-${i}`,
          addedAt: new Date(Date.now() - i * 1000).toISOString(),
          review: createMockReview({ id: `r-${i}` }),
          searchContext: { productName: `商品${i}`, searchMode: 'non-AI' },
        });
      }
      localStorageMock.setItem('review-finder-favorites', JSON.stringify(favorites));
      favoritesManager = new FavoritesManager();

      new FavoritesPage(container, favoritesManager);

      const countEl = container.querySelector('[data-testid="favorites-count"]');
      expect(countEl?.textContent).toContain('200 / 200');
    });
  });

  describe('Factory function', () => {
    it('should create a FavoritesPage instance', () => {
      const page = createFavoritesPage(container, favoritesManager);
      expect(page).toBeInstanceOf(FavoritesPage);
    });
  });

  describe('destroy', () => {
    it('should clear the container content', () => {
      const page = new FavoritesPage(container, favoritesManager);
      expect(container.innerHTML).not.toBe('');

      page.destroy();
      expect(container.innerHTML).toBe('');
    });
  });
});
