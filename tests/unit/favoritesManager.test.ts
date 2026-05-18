/**
 * Unit tests for FavoritesManager service
 * Tests localStorage persistence, 200-entry limit, ordering, and CRUD operations.
 */

import { FavoritesManager } from '../../src/services/favoritesManager';
import type { ReviewItem } from '../../src/models/types';

const STORAGE_KEY = 'review-finder-favorites';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

function createReview(id: string, title: string = 'Test Review'): ReviewItem {
  return {
    id,
    title,
    rating: 4.0,
    summary: 'A test review summary',
    url: 'https://example.com/review',
  };
}

describe('FavoritesManager', () => {
  let manager: FavoritesManager;

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    manager = new FavoritesManager();
  });

  describe('add()', () => {
    it('should add a review to favorites successfully', () => {
      const review = createReview('review-1');
      const result = manager.add(review);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(manager.getCount()).toBe(1);
    });

    it('should create FavoriteItem with UUID and ISO timestamp', () => {
      const review = createReview('review-1');
      manager.add(review, { productName: 'Test Product', searchMode: 'AI' });

      const favorites = manager.getAll();
      expect(favorites).toHaveLength(1);
      expect(favorites[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(favorites[0].addedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(favorites[0].review).toEqual(review);
      expect(favorites[0].searchContext).toEqual({ productName: 'Test Product', searchMode: 'AI' });
    });

    it('should reject additions when 200-entry limit is reached', () => {
      // Pre-fill with 200 entries
      const existingFavorites = Array.from({ length: 200 }, (_, i) => ({
        id: `fav-${i}`,
        addedAt: new Date(Date.now() - i * 1000).toISOString(),
        review: createReview(`review-${i}`),
        searchContext: { productName: 'Product', searchMode: 'non-AI' as const },
      }));
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(existingFavorites));

      const review = createReview('review-new');
      const result = manager.add(review);

      expect(result.success).toBe(false);
      expect(result.error).toBe('LIMIT_REACHED');
      expect(manager.getCount()).toBe(200);
    });

    it('should allow adding up to exactly 200 entries', () => {
      for (let i = 0; i < 200; i++) {
        const result = manager.add(createReview(`review-${i}`));
        expect(result.success).toBe(true);
      }
      expect(manager.getCount()).toBe(200);

      // 201st should fail
      const result = manager.add(createReview('review-201'));
      expect(result.success).toBe(false);
      expect(result.error).toBe('LIMIT_REACHED');
    });

    it('should use default searchContext when not provided', () => {
      const review = createReview('review-1');
      manager.add(review);

      const favorites = manager.getAll();
      expect(favorites[0].searchContext).toEqual({ productName: '', searchMode: 'non-AI' });
    });
  });

  describe('remove()', () => {
    it('should remove a favorite by review ID', () => {
      manager.add(createReview('review-1'));
      manager.add(createReview('review-2'));
      manager.add(createReview('review-3'));

      expect(manager.getCount()).toBe(3);

      manager.remove('review-2');

      expect(manager.getCount()).toBe(2);
      expect(manager.isFavorited('review-2')).toBe(false);
      expect(manager.isFavorited('review-1')).toBe(true);
      expect(manager.isFavorited('review-3')).toBe(true);
    });

    it('should do nothing when removing a non-existent review', () => {
      manager.add(createReview('review-1'));
      manager.remove('non-existent');
      expect(manager.getCount()).toBe(1);
    });

    it('should decrement count after removal', () => {
      manager.add(createReview('review-1'));
      manager.add(createReview('review-2'));
      expect(manager.getCount()).toBe(2);

      manager.remove('review-1');
      expect(manager.getCount()).toBe(1);
    });
  });

  describe('getAll()', () => {
    it('should return empty array when no favorites exist', () => {
      expect(manager.getAll()).toEqual([]);
    });

    it('should return entries ordered by addedAt descending (newest first)', () => {
      // Add entries with controlled timestamps
      const favorites = [
        {
          id: 'fav-1',
          addedAt: '2024-01-01T10:00:00.000Z',
          review: createReview('review-1'),
          searchContext: { productName: 'Product', searchMode: 'non-AI' as const },
        },
        {
          id: 'fav-2',
          addedAt: '2024-01-03T10:00:00.000Z',
          review: createReview('review-2'),
          searchContext: { productName: 'Product', searchMode: 'non-AI' as const },
        },
        {
          id: 'fav-3',
          addedAt: '2024-01-02T10:00:00.000Z',
          review: createReview('review-3'),
          searchContext: { productName: 'Product', searchMode: 'non-AI' as const },
        },
      ];
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(favorites));

      const result = manager.getAll();
      expect(result[0].id).toBe('fav-2'); // Jan 3 (newest)
      expect(result[1].id).toBe('fav-3'); // Jan 2
      expect(result[2].id).toBe('fav-1'); // Jan 1 (oldest)
    });
  });

  describe('isFavorited()', () => {
    it('should return true for a favorited review', () => {
      manager.add(createReview('review-1'));
      expect(manager.isFavorited('review-1')).toBe(true);
    });

    it('should return false for a non-favorited review', () => {
      expect(manager.isFavorited('review-1')).toBe(false);
    });

    it('should return false after a review is removed', () => {
      manager.add(createReview('review-1'));
      manager.remove('review-1');
      expect(manager.isFavorited('review-1')).toBe(false);
    });
  });

  describe('getCount()', () => {
    it('should return 0 when no favorites exist', () => {
      expect(manager.getCount()).toBe(0);
    });

    it('should return correct count after additions', () => {
      manager.add(createReview('review-1'));
      manager.add(createReview('review-2'));
      expect(manager.getCount()).toBe(2);
    });

    it('should return correct count after removals', () => {
      manager.add(createReview('review-1'));
      manager.add(createReview('review-2'));
      manager.remove('review-1');
      expect(manager.getCount()).toBe(1);
    });
  });

  describe('localStorage persistence', () => {
    it('should persist favorites to localStorage', () => {
      manager.add(createReview('review-1'));
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.any(String)
      );
    });

    it('should load favorites from localStorage on new instance', () => {
      manager.add(createReview('review-1'));

      const newManager = new FavoritesManager();
      expect(newManager.getCount()).toBe(1);
      expect(newManager.isFavorited('review-1')).toBe(true);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.setItem(STORAGE_KEY, 'invalid-json');
      // getItem mock needs to return the corrupted data
      localStorageMock.getItem.mockReturnValueOnce('invalid-json');

      const newManager = new FavoritesManager();
      expect(newManager.getAll()).toEqual([]);
      expect(newManager.getCount()).toBe(0);
    });

    it('should handle empty localStorage gracefully', () => {
      localStorageMock.getItem.mockReturnValueOnce(null as unknown as string);

      const newManager = new FavoritesManager();
      expect(newManager.getAll()).toEqual([]);
    });
  });
});
