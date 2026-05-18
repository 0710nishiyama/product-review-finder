/**
 * Unit tests for HistoryPage component
 * Tests: rendering, history list display, click to re-execute search, clear all
 * Requirements: 10.1, 10.2, 10.3
 *
 * @jest-environment jsdom
 */

import { HistoryPage, createHistoryPage } from '../../src/components/historyPage';
import type { HistoryEntry } from '../../src/models/types';

// Mock the router module
const mockNavigateTo = jest.fn();
const mockGetCurrentRoute = jest.fn().mockReturnValue('history');
const mockIsValidRoute = jest.fn().mockReturnValue(true);
const mockGetRoutes = jest.fn().mockReturnValue(['search', 'history', 'favorites', 'settings', 'help']);
const mockOnRouteChange = jest.fn();

jest.mock('../../src/router', () => ({
  router: {
    navigateTo: (...args: unknown[]) => mockNavigateTo(...args),
    getCurrentRoute: () => mockGetCurrentRoute(),
    isValidRoute: (route: string) => mockIsValidRoute(route),
    getRoutes: () => mockGetRoutes(),
    onRouteChange: (handler: unknown) => mockOnRouteChange(handler),
  },
  Route: {},
}));

// Mock the historyManager module
const mockGetEntries = jest.fn().mockReturnValue([]);
const mockClearAll = jest.fn();
const mockAddEntry = jest.fn();

jest.mock('../../src/services/historyManager', () => ({
  HistoryManager: jest.fn().mockImplementation(() => ({
    getEntries: (...args: unknown[]) => mockGetEntries(...args),
    clearAll: () => mockClearAll(),
    addEntry: (...args: unknown[]) => mockAddEntry(...args),
  })),
}));

// Mock the helpers module (generateId used by historyManager)
jest.mock('../../src/utils/helpers', () => ({
  generateId: () => 'mock-uuid-1234',
}));

describe('HistoryPage', () => {
  let container: HTMLElement;

  const sampleEntries: HistoryEntry[] = [
    {
      id: 'entry-1',
      timestamp: '2024-01-15T10:30:00.000Z',
      productData: {
        productName: 'テスト商品A',
        genre: '電子機器',
        productUrl: 'https://example.com/product-a',
      },
      searchMode: 'AI',
      totalHits: 25,
    },
    {
      id: 'entry-2',
      timestamp: '2024-01-14T08:00:00.000Z',
      productData: {
        productName: 'テスト商品B',
        genre: '書籍',
        productUrl: '',
      },
      searchMode: 'non-AI',
      totalHits: 10,
    },
    {
      id: 'entry-3',
      timestamp: '2024-01-13T15:45:00.000Z',
      productData: {
        productName: 'テスト商品C',
        genre: '',
        productUrl: 'https://example.com/product-c',
      },
      searchMode: 'non-AI',
      totalHits: 0,
    },
  ];

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    jest.clearAllMocks();
    mockGetEntries.mockReturnValue([]);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('Rendering - Empty state', () => {
    it('should display "no history" message when there are no entries', () => {
      mockGetEntries.mockReturnValue([]);
      new HistoryPage(container);

      const noHistory = container.querySelector('[data-testid="no-history"]');
      expect(noHistory).not.toBeNull();
      expect(noHistory?.textContent).toContain('検索履歴がありません');
    });

    it('should not display the history list when empty', () => {
      mockGetEntries.mockReturnValue([]);
      new HistoryPage(container);

      const historyList = container.querySelector('[data-testid="history-list"]');
      expect(historyList).toBeNull();
    });
  });

  describe('Rendering - With entries (Requirement 10.2)', () => {
    it('should display history entries as a list', () => {
      mockGetEntries.mockReturnValue(sampleEntries);
      new HistoryPage(container);

      const historyList = container.querySelector('[data-testid="history-list"]');
      expect(historyList).not.toBeNull();

      const items = container.querySelectorAll('[data-testid="history-item"]');
      expect(items.length).toBe(3);
    });

    it('should display product name for each entry', () => {
      mockGetEntries.mockReturnValue(sampleEntries);
      new HistoryPage(container);

      const productNames = container.querySelectorAll('[data-testid="history-product-name"]');
      expect(productNames[0]?.textContent).toBe('テスト商品A');
      expect(productNames[1]?.textContent).toBe('テスト商品B');
      expect(productNames[2]?.textContent).toBe('テスト商品C');
    });

    it('should display search mode badge for each entry', () => {
      mockGetEntries.mockReturnValue(sampleEntries);
      new HistoryPage(container);

      const modeBadges = container.querySelectorAll('[data-testid="history-search-mode"]');
      expect(modeBadges[0]?.textContent).toBe('AI');
      expect(modeBadges[1]?.textContent).toBe('非AI');
      expect(modeBadges[2]?.textContent).toBe('非AI');
    });

    it('should display total hits for each entry', () => {
      mockGetEntries.mockReturnValue(sampleEntries);
      new HistoryPage(container);

      const totalHits = container.querySelectorAll('[data-testid="history-total-hits"]');
      expect(totalHits[0]?.textContent).toContain('25');
      expect(totalHits[1]?.textContent).toContain('10');
      expect(totalHits[2]?.textContent).toContain('0');
    });

    it('should display formatted timestamp for each entry', () => {
      mockGetEntries.mockReturnValue(sampleEntries);
      new HistoryPage(container);

      const timestamps = container.querySelectorAll('[data-testid="history-timestamp"]');
      // Timestamps are formatted in local time, so we just check they exist and are non-empty
      expect(timestamps.length).toBe(3);
      timestamps.forEach((ts) => {
        expect(ts.textContent?.trim().length).toBeGreaterThan(0);
      });
    });

    it('should call getEntries with limit of 50', () => {
      mockGetEntries.mockReturnValue(sampleEntries);
      new HistoryPage(container);

      expect(mockGetEntries).toHaveBeenCalledWith(50);
    });
  });

  describe('Click to re-execute search (Requirement 10.3)', () => {
    it('should call onReSearch callback when a history item is clicked', () => {
      mockGetEntries.mockReturnValue(sampleEntries);
      const onReSearch = jest.fn();
      new HistoryPage(container, { onReSearch });

      const firstItem = container.querySelector('[data-history-id="entry-1"]') as HTMLElement;
      firstItem.click();

      expect(onReSearch).toHaveBeenCalledWith(sampleEntries[0]);
    });

    it('should navigate to search page when a history item is clicked', () => {
      mockGetEntries.mockReturnValue(sampleEntries);
      new HistoryPage(container);

      const firstItem = container.querySelector('[data-history-id="entry-1"]') as HTMLElement;
      firstItem.click();

      expect(mockNavigateTo).toHaveBeenCalledWith('search');
    });

    it('should pass the correct entry data for re-search', () => {
      mockGetEntries.mockReturnValue(sampleEntries);
      const onReSearch = jest.fn();
      new HistoryPage(container, { onReSearch });

      const secondItem = container.querySelector('[data-history-id="entry-2"]') as HTMLElement;
      secondItem.click();

      expect(onReSearch).toHaveBeenCalledWith(expect.objectContaining({
        productData: {
          productName: 'テスト商品B',
          genre: '書籍',
          productUrl: '',
        },
        searchMode: 'non-AI',
      }));
    });

    it('should not call onReSearch if entry is not found', () => {
      mockGetEntries.mockReturnValue(sampleEntries);
      const onReSearch = jest.fn();
      new HistoryPage(container, { onReSearch });

      // Manually create a click on a non-existent entry
      const item = container.querySelector('[data-history-id="entry-1"]') as HTMLElement;
      item.setAttribute('data-history-id', 'non-existent');
      item.click();

      expect(onReSearch).not.toHaveBeenCalled();
    });
  });

  describe('Clear all history', () => {
    it('should call historyManager.clearAll when clear button is clicked', () => {
      mockGetEntries.mockReturnValue(sampleEntries);
      new HistoryPage(container);

      const clearBtn = container.querySelector('[data-testid="clear-history-btn"]') as HTMLElement;
      // After clear, getEntries will return empty
      mockGetEntries.mockReturnValue([]);
      clearBtn.click();

      expect(mockClearAll).toHaveBeenCalled();
    });

    it('should refresh the list after clearing', () => {
      mockGetEntries.mockReturnValue(sampleEntries);
      new HistoryPage(container);

      mockGetEntries.mockReturnValue([]);
      const clearBtn = container.querySelector('[data-testid="clear-history-btn"]') as HTMLElement;
      clearBtn.click();

      // After clearing, should show empty state
      const noHistory = container.querySelector('[data-testid="no-history"]');
      expect(noHistory).not.toBeNull();
    });
  });

  describe('Refresh', () => {
    it('should reload entries and re-render when refresh is called', () => {
      mockGetEntries.mockReturnValue([]);
      const page = new HistoryPage(container);

      expect(container.querySelector('[data-testid="no-history"]')).not.toBeNull();

      // Now entries are available
      mockGetEntries.mockReturnValue(sampleEntries);
      page.refresh();

      expect(container.querySelector('[data-testid="history-list"]')).not.toBeNull();
      const items = container.querySelectorAll('[data-testid="history-item"]');
      expect(items.length).toBe(3);
    });
  });

  describe('getEntries', () => {
    it('should return a copy of the current entries', () => {
      mockGetEntries.mockReturnValue(sampleEntries);
      const page = new HistoryPage(container);

      const entries = page.getEntries();
      expect(entries).toEqual(sampleEntries);
      // Should be a copy, not the same reference
      expect(entries).not.toBe(sampleEntries);
    });
  });

  describe('Factory function', () => {
    it('should create a HistoryPage instance', () => {
      mockGetEntries.mockReturnValue([]);
      const page = createHistoryPage(container);
      expect(page).toBeInstanceOf(HistoryPage);
    });
  });

  describe('XSS prevention', () => {
    it('should escape HTML in product names', () => {
      const maliciousEntry: HistoryEntry = {
        id: 'xss-entry',
        timestamp: '2024-01-15T10:30:00.000Z',
        productData: {
          productName: '<script>alert("xss")</script>',
          genre: '',
          productUrl: '',
        },
        searchMode: 'non-AI',
        totalHits: 5,
      };
      mockGetEntries.mockReturnValue([maliciousEntry]);
      new HistoryPage(container);

      const productName = container.querySelector('[data-testid="history-product-name"]');
      expect(productName?.innerHTML).not.toContain('<script>');
      expect(productName?.textContent).toContain('alert');
    });
  });

  describe('destroy', () => {
    it('should clear the container content', () => {
      mockGetEntries.mockReturnValue(sampleEntries);
      const page = new HistoryPage(container);
      expect(container.innerHTML).not.toBe('');

      page.destroy();
      expect(container.innerHTML).toBe('');
    });
  });
});
