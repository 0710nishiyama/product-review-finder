import { HistoryManager } from '../../src/services/historyManager';
import type { HistoryEntry } from '../../src/models/types';

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

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('HistoryManager', () => {
  let manager: HistoryManager;

  beforeEach(() => {
    localStorageMock.clear();
    manager = new HistoryManager();
  });

  describe('addEntry', () => {
    it('should add an entry with generated id and timestamp', () => {
      manager.addEntry({
        productData: { productName: 'Test Product', genre: 'Electronics', productUrl: '' },
        searchMode: 'non-AI',
        totalHits: 10,
      });

      const entries = manager.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      expect(new Date(entries[0].timestamp).toISOString()).toBe(entries[0].timestamp);
      expect(entries[0].productData.productName).toBe('Test Product');
      expect(entries[0].searchMode).toBe('non-AI');
      expect(entries[0].totalHits).toBe(10);
    });

    it('should enforce 100-entry maximum by removing oldest', () => {
      // Add 101 entries
      for (let i = 0; i < 101; i++) {
        manager.addEntry({
          productData: { productName: `Product ${i}`, genre: '', productUrl: '' },
          searchMode: 'non-AI',
          totalHits: i,
        });
      }

      const entries = manager.getEntries(200);
      expect(entries.length).toBe(100);
      // The first entry (Product 0) should have been removed
      const names = entries.map(e => e.productData.productName);
      expect(names).not.toContain('Product 0');
      expect(names).toContain('Product 1');
      expect(names).toContain('Product 100');
    });
  });

  describe('getEntries', () => {
    it('should return entries in reverse chronological order', () => {
      // Add entries with slight time gaps
      manager.addEntry({
        productData: { productName: 'First', genre: '', productUrl: '' },
        searchMode: 'non-AI',
        totalHits: 1,
      });
      manager.addEntry({
        productData: { productName: 'Second', genre: '', productUrl: '' },
        searchMode: 'AI',
        totalHits: 5,
      });
      manager.addEntry({
        productData: { productName: 'Third', genre: '', productUrl: '' },
        searchMode: 'non-AI',
        totalHits: 3,
      });

      const entries = manager.getEntries();
      // Newest first
      expect(entries[0].productData.productName).toBe('Third');
      expect(entries[1].productData.productName).toBe('Second');
      expect(entries[2].productData.productName).toBe('First');
    });

    it('should default to 50 entries limit', () => {
      for (let i = 0; i < 80; i++) {
        manager.addEntry({
          productData: { productName: `Product ${i}`, genre: '', productUrl: '' },
          searchMode: 'non-AI',
          totalHits: i,
        });
      }

      const entries = manager.getEntries();
      expect(entries.length).toBe(50);
    });

    it('should respect custom limit', () => {
      for (let i = 0; i < 20; i++) {
        manager.addEntry({
          productData: { productName: `Product ${i}`, genre: '', productUrl: '' },
          searchMode: 'non-AI',
          totalHits: i,
        });
      }

      const entries = manager.getEntries(5);
      expect(entries.length).toBe(5);
    });

    it('should return empty array when no entries exist', () => {
      const entries = manager.getEntries();
      expect(entries).toEqual([]);
    });
  });

  describe('clearAll', () => {
    it('should remove all entries', () => {
      manager.addEntry({
        productData: { productName: 'Test', genre: '', productUrl: '' },
        searchMode: 'non-AI',
        totalHits: 1,
      });

      manager.clearAll();
      const entries = manager.getEntries();
      expect(entries).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem('review-finder-history', 'not-valid-json');
      const entries = manager.getEntries();
      expect(entries).toEqual([]);
    });

    it('should handle non-array localStorage data gracefully', () => {
      localStorage.setItem('review-finder-history', JSON.stringify({ foo: 'bar' }));
      const entries = manager.getEntries();
      expect(entries).toEqual([]);
    });
  });
});
