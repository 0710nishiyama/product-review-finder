/**
 * E2E Tests for Settings, History, and Favorites
 * Tests settings save/load with masked API key display,
 * search history recording and re-execution,
 * favorites add/remove flow, favorites limit (200) behavior,
 * and navigation between all pages with active state.
 *
 * Requirements: 3.1-3.8, 8.1-8.4, 10.1-10.6
 */

import { test, expect, Page } from '@playwright/test';

// localStorage keys used by the app
const SETTINGS_KEY = 'review-finder-settings';
const HISTORY_KEY = 'review-finder-history';
const FAVORITES_KEY = 'review-finder-favorites';

/**
 * Helper: Navigate to a specific page via hash routing
 */
async function navigateTo(page: Page, route: string) {
  await page.goto(`/#${route}`);
  await page.waitForTimeout(300);
}

/**
 * Helper: Create a mock history entry
 */
function createHistoryEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: `hist-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    productData: {
      productName: 'テスト商品',
      genre: 'テストジャンル',
      productUrl: 'https://example.com/product',
    },
    searchMode: 'non-AI',
    totalHits: 5,
    ...overrides,
  };
}

/**
 * Helper: Create a mock favorite item
 */
function createFavoriteItem(index: number) {
  return {
    id: `fav-${index}-${Date.now()}`,
    addedAt: new Date(Date.now() - index * 1000).toISOString(),
    review: {
      id: `review-${index}`,
      title: `レビュータイトル ${index}`,
      rating: 4.0,
      summary: `レビュー概要 ${index}`,
      url: `https://example.com/review/${index}`,
    },
    searchContext: {
      productName: `商品 ${index}`,
      searchMode: 'non-AI' as const,
    },
  };
}


// ============================================================
// Settings Tests (Requirements 3.1-3.8)
// ============================================================
test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear localStorage before each test
    await page.evaluate(() => {
      localStorage.clear();
    });
    await navigateTo(page, 'settings');
  });

  test('should display settings form with all three providers', async ({ page }) => {
    // Requirement 3.1, 3.2, 3.3: OpenAI, Google, Claude settings
    await expect(page.locator('#provider-card-openai')).toBeVisible();
    await expect(page.locator('#provider-card-google')).toBeVisible();
    await expect(page.locator('#provider-card-claude')).toBeVisible();

    // Check active provider selector exists
    await expect(page.locator('#active-provider-select')).toBeVisible();
  });

  test('should save settings and show confirmation feedback', async ({ page }) => {
    // Requirement 3.7: Save confirmation shown for 3 seconds
    const apiKeyInput = page.locator('#openai-api-key-input');
    const modelInput = page.locator('#openai-model-input');

    await apiKeyInput.fill('sk-test-key-12345678');
    await modelInput.fill('gpt-4');

    // Also fill google and claude to pass validation
    await page.locator('#google-api-key-input').fill('google-key-1234');
    await page.locator('#google-model-input').fill('gemini-pro');
    await page.locator('#claude-api-key-input').fill('claude-key-1234');
    await page.locator('#claude-model-input').fill('claude-3-opus');

    // Click save
    await page.locator('#settings-save-btn').click();

    // Verify feedback message appears
    const feedback = page.locator('#settings-save-feedback');
    await expect(feedback).toBeVisible();
    await expect(feedback).toContainText('設定を保存しました');
  });


  test('should persist settings to localStorage and reload them', async ({ page }) => {
    // Requirement 3.1-3.3: Save/load settings
    await page.locator('#openai-api-key-input').fill('sk-persist-test-key');
    await page.locator('#openai-model-input').fill('gpt-4');
    await page.locator('#google-api-key-input').fill('google-persist-key');
    await page.locator('#google-model-input').fill('gemini-pro');
    await page.locator('#claude-api-key-input').fill('claude-persist-key');
    await page.locator('#claude-model-input').fill('claude-3-sonnet');

    await page.locator('#settings-save-btn').click();

    // Verify localStorage was updated
    const storedSettings = await page.evaluate((key) => {
      return localStorage.getItem(key);
    }, SETTINGS_KEY);

    expect(storedSettings).not.toBeNull();
    const parsed = JSON.parse(storedSettings!);
    expect(parsed.providers.openai.api_key).toBe('sk-persist-test-key');
    expect(parsed.providers.openai.model).toBe('gpt-4');
    expect(parsed.providers.google.api_key).toBe('google-persist-key');
    expect(parsed.providers.claude.model).toBe('claude-3-sonnet');

    // Navigate away and back to verify settings are loaded
    await navigateTo(page, 'search');
    await navigateTo(page, 'settings');

    // The API key input should have the saved value
    const openaiKeyValue = await page.locator('#openai-api-key-input').inputValue();
    expect(openaiKeyValue).toBe('sk-persist-test-key');
  });

  test('should display masked API key text', async ({ page }) => {
    // Requirement 3.8: API key masked with last 4 chars visible
    // Pre-set settings in localStorage
    await page.evaluate((key) => {
      const settings = {
        activeProvider: 'openai',
        providers: {
          openai: { api_key: 'sk-abcdefgh12345678', model: 'gpt-4' },
          google: { api_key: 'google-key-9999', model: 'gemini-pro' },
          claude: { api_key: 'claude-key-8888', model: 'claude-3-opus' },
        },
      };
      localStorage.setItem(key, JSON.stringify(settings));
    }, SETTINGS_KEY);

    // Reload settings page
    await navigateTo(page, 'search');
    await navigateTo(page, 'settings');

    // Check masked display text for OpenAI
    const maskedText = page.locator('#openai-api-key-masked');
    await expect(maskedText).toContainText('5678');
    // Should contain asterisks for masked portion
    const text = await maskedText.textContent();
    expect(text).toContain('*');
  });


  test('should show validation errors for empty API key and model', async ({ page }) => {
    // Requirement 3.4, 3.6: Validate api_key non-empty/non-whitespace, model non-empty
    // Leave all fields empty and try to save
    await page.locator('#settings-save-btn').click();

    // Should show validation errors
    const openaiKeyError = page.locator('#openai-api-key-error');
    await expect(openaiKeyError).toBeVisible();

    const openaiModelError = page.locator('#openai-model-error');
    await expect(openaiModelError).toBeVisible();

    // API key input should have is-invalid class
    await expect(page.locator('#openai-api-key-input')).toHaveClass(/is-invalid/);
  });

  test('should reject whitespace-only API key', async ({ page }) => {
    // Requirement 3.6: Whitespace-only api_key rejected
    await page.locator('#openai-api-key-input').fill('   ');
    await page.locator('#openai-model-input').fill('gpt-4');
    await page.locator('#google-api-key-input').fill('valid-key');
    await page.locator('#google-model-input').fill('gemini-pro');
    await page.locator('#claude-api-key-input').fill('valid-key');
    await page.locator('#claude-model-input').fill('claude-3');

    await page.locator('#settings-save-btn').click();

    // OpenAI API key should show error
    await expect(page.locator('#openai-api-key-input')).toHaveClass(/is-invalid/);
    // No save feedback should appear
    await expect(page.locator('#settings-save-feedback')).not.toBeVisible();
  });

  test('should allow changing active provider', async ({ page }) => {
    // Requirement 3.1-3.3: Provider selection
    const select = page.locator('#active-provider-select');
    await select.selectOption('google');

    // Fill all fields
    await page.locator('#openai-api-key-input').fill('openai-key1');
    await page.locator('#openai-model-input').fill('gpt-4');
    await page.locator('#google-api-key-input').fill('google-key1');
    await page.locator('#google-model-input').fill('gemini-pro');
    await page.locator('#claude-api-key-input').fill('claude-key1');
    await page.locator('#claude-model-input').fill('claude-3');

    await page.locator('#settings-save-btn').click();

    // Verify active provider was saved
    const stored = await page.evaluate((key) => {
      return JSON.parse(localStorage.getItem(key) || '{}');
    }, SETTINGS_KEY);
    expect(stored.activeProvider).toBe('google');
  });
});


// ============================================================
// History Tests (Requirements 10.1-10.3)
// ============================================================
test.describe('History Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('should display empty state when no history exists', async ({ page }) => {
    await navigateTo(page, 'history');

    const noHistory = page.locator('[data-testid="no-history"]');
    await expect(noHistory).toBeVisible();
    await expect(noHistory).toContainText('検索履歴がありません');
  });

  test('should display history entries in reverse chronological order', async ({ page }) => {
    // Requirement 10.2: Display history newest first, max 50
    const entries = [];
    for (let i = 0; i < 5; i++) {
      entries.push(createHistoryEntry({
        id: `hist-${i}`,
        timestamp: new Date(Date.now() - (4 - i) * 60000).toISOString(),
        productData: {
          productName: `商品 ${i + 1}`,
          genre: 'テスト',
          productUrl: 'https://example.com',
        },
        totalHits: (i + 1) * 10,
      }));
    }

    await page.evaluate(({ key, data }) => {
      localStorage.setItem(key, JSON.stringify(data));
    }, { key: HISTORY_KEY, data: entries });

    await navigateTo(page, 'history');

    // Should show history list
    const historyItems = page.locator('[data-testid="history-item"]');
    await expect(historyItems).toHaveCount(5);

    // First item should be the newest (商品 5)
    const firstItem = historyItems.first();
    await expect(firstItem.locator('[data-testid="history-product-name"]'))
      .toContainText('商品 5');
  });

  test('should display product name, search mode, and total hits', async ({ page }) => {
    const entry = createHistoryEntry({
      productData: {
        productName: 'テスト商品ABC',
        genre: 'エレクトロニクス',
        productUrl: 'https://example.com/abc',
      },
      searchMode: 'AI',
      totalHits: 25,
    });

    await page.evaluate(({ key, data }) => {
      localStorage.setItem(key, JSON.stringify(data));
    }, { key: HISTORY_KEY, data: [entry] });

    await navigateTo(page, 'history');

    const item = page.locator('[data-testid="history-item"]').first();
    await expect(item.locator('[data-testid="history-product-name"]'))
      .toContainText('テスト商品ABC');
    await expect(item.locator('[data-testid="history-search-mode"]'))
      .toContainText('AI');
    await expect(item.locator('[data-testid="history-total-hits"]'))
      .toContainText('25');
  });


  test('should re-execute search when history item is clicked', async ({ page }) => {
    // Requirement 10.3: Click history item to re-execute search
    const entry = createHistoryEntry({
      productData: {
        productName: '再検索テスト商品',
        genre: 'テスト',
        productUrl: 'https://example.com/re-search',
      },
      searchMode: 'non-AI',
      totalHits: 10,
    });

    await page.evaluate(({ key, data }) => {
      localStorage.setItem(key, JSON.stringify(data));
    }, { key: HISTORY_KEY, data: [entry] });

    await navigateTo(page, 'history');

    // Click the history item
    await page.locator('[data-testid="history-item"]').first().click();

    // Should navigate to search page
    await page.waitForTimeout(500);
    const hash = await page.evaluate(() => window.location.hash);
    expect(hash).toBe('#search');
  });

  test('should clear all history when clear button is clicked', async ({ page }) => {
    const entries = [
      createHistoryEntry({ id: 'h1' }),
      createHistoryEntry({ id: 'h2' }),
    ];

    await page.evaluate(({ key, data }) => {
      localStorage.setItem(key, JSON.stringify(data));
    }, { key: HISTORY_KEY, data: entries });

    await navigateTo(page, 'history');

    // Verify items are shown
    await expect(page.locator('[data-testid="history-item"]')).toHaveCount(2);

    // Click clear all button
    await page.locator('[data-testid="clear-history-btn"]').click();

    // Should show empty state
    await expect(page.locator('[data-testid="no-history"]')).toBeVisible();

    // localStorage should be cleared
    const stored = await page.evaluate((key) => {
      return localStorage.getItem(key);
    }, HISTORY_KEY);
    expect(stored).toBeNull();
  });

  test('should limit display to 50 entries', async ({ page }) => {
    // Requirement 10.2: Max 50 entries displayed
    const entries = [];
    for (let i = 0; i < 60; i++) {
      entries.push(createHistoryEntry({
        id: `hist-${i}`,
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
        productData: {
          productName: `商品 ${i}`,
          genre: 'テスト',
          productUrl: '',
        },
        totalHits: i,
      }));
    }

    await page.evaluate(({ key, data }) => {
      localStorage.setItem(key, JSON.stringify(data));
    }, { key: HISTORY_KEY, data: entries });

    await navigateTo(page, 'history');

    const historyItems = page.locator('[data-testid="history-item"]');
    const count = await historyItems.count();
    expect(count).toBeLessThanOrEqual(50);
  });
});


// ============================================================
// Favorites Tests (Requirements 10.4-10.6)
// ============================================================
test.describe('Favorites Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('should display empty state when no favorites exist', async ({ page }) => {
    await navigateTo(page, 'favorites');

    const emptyState = page.locator('[data-testid="empty-state"]');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('お気に入りに登録されたレビューはありません');
  });

  test('should display favorites with review details and search context', async ({ page }) => {
    // Requirement 10.5: Display favorites ordered by addedAt descending
    const favorites = [
      createFavoriteItem(1),
      createFavoriteItem(2),
      createFavoriteItem(3),
    ];

    await page.evaluate(({ key, data }) => {
      localStorage.setItem(key, JSON.stringify(data));
    }, { key: FAVORITES_KEY, data: favorites });

    await navigateTo(page, 'favorites');

    // Should show favorites list
    const cards = page.locator('[data-testid="favorite-card"]');
    await expect(cards).toHaveCount(3);

    // First card should show review details
    const firstCard = cards.first();
    await expect(firstCard.locator('[data-testid="favorite-title"]'))
      .toContainText('レビュータイトル');
    await expect(firstCard.locator('[data-testid="favorite-rating"]'))
      .toContainText('4.0');
    await expect(firstCard.locator('[data-testid="favorite-summary"]'))
      .toContainText('レビュー概要');
    await expect(firstCard.locator('[data-testid="context-product"]'))
      .toContainText('商品');
    await expect(firstCard.locator('[data-testid="context-mode"]'))
      .toContainText('非AIモード');
  });

  test('should display favorites count', async ({ page }) => {
    const favorites = [createFavoriteItem(1), createFavoriteItem(2)];

    await page.evaluate(({ key, data }) => {
      localStorage.setItem(key, JSON.stringify(data));
    }, { key: FAVORITES_KEY, data: favorites });

    await navigateTo(page, 'favorites');

    const countText = page.locator('[data-testid="favorites-count"]');
    await expect(countText).toContainText('2 / 200');
  });


  test('should remove a favorite when remove button is clicked', async ({ page }) => {
    // Requirement 10.6: Remove from favorites
    const favorites = [
      createFavoriteItem(1),
      createFavoriteItem(2),
      createFavoriteItem(3),
    ];

    await page.evaluate(({ key, data }) => {
      localStorage.setItem(key, JSON.stringify(data));
    }, { key: FAVORITES_KEY, data: favorites });

    await navigateTo(page, 'favorites');

    // Verify 3 cards initially
    await expect(page.locator('[data-testid="favorite-card"]')).toHaveCount(3);

    // Click remove on the first card
    await page.locator('[data-testid="remove-button"]').first().click();

    // Should now have 2 cards
    await expect(page.locator('[data-testid="favorite-card"]')).toHaveCount(2);

    // Count should update
    await expect(page.locator('[data-testid="favorites-count"]'))
      .toContainText('2 / 200');

    // Verify localStorage was updated
    const stored = await page.evaluate((key) => {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data).length : 0;
    }, FAVORITES_KEY);
    expect(stored).toBe(2);
  });

  test('should show limit reached message when at 200 favorites', async ({ page }) => {
    // Requirement 10.4: 200 limit behavior
    const favorites = [];
    for (let i = 0; i < 200; i++) {
      favorites.push(createFavoriteItem(i));
    }

    await page.evaluate(({ key, data }) => {
      localStorage.setItem(key, JSON.stringify(data));
    }, { key: FAVORITES_KEY, data: favorites });

    await navigateTo(page, 'favorites');

    // Should show limit message
    const limitMessage = page.locator('[data-testid="limit-message"]');
    await expect(limitMessage).toBeVisible();
    await expect(limitMessage).toContainText('上限（200件）に達しています');

    // Count should show 200 / 200
    await expect(page.locator('[data-testid="favorites-count"]'))
      .toContainText('200 / 200');
  });

  test('should not show limit message when under 200', async ({ page }) => {
    const favorites = [createFavoriteItem(1)];

    await page.evaluate(({ key, data }) => {
      localStorage.setItem(key, JSON.stringify(data));
    }, { key: FAVORITES_KEY, data: favorites });

    await navigateTo(page, 'favorites');

    // Limit message should not be visible
    await expect(page.locator('[data-testid="limit-message"]')).not.toBeVisible();
  });


  test('should have clickable source URL that opens in new tab', async ({ page }) => {
    const favorites = [createFavoriteItem(1)];

    await page.evaluate(({ key, data }) => {
      localStorage.setItem(key, JSON.stringify(data));
    }, { key: FAVORITES_KEY, data: favorites });

    await navigateTo(page, 'favorites');

    const urlLink = page.locator('[data-testid="favorite-url"]').first();
    await expect(urlLink).toBeVisible();
    await expect(urlLink).toHaveAttribute('target', '_blank');
    await expect(urlLink).toHaveAttribute('href', /https:\/\/example\.com\/review/);
  });

  test('should order favorites by addedAt descending (newest first)', async ({ page }) => {
    // Requirement 10.5: Ordered by addedAt descending
    const favorites = [
      {
        ...createFavoriteItem(1),
        addedAt: '2024-01-01T10:00:00.000Z',
        review: { id: 'r-old', title: '古いレビュー', rating: 3.0, summary: '古い', url: 'https://example.com/old' },
      },
      {
        ...createFavoriteItem(2),
        addedAt: '2024-06-15T10:00:00.000Z',
        review: { id: 'r-new', title: '新しいレビュー', rating: 5.0, summary: '新しい', url: 'https://example.com/new' },
      },
    ];

    await page.evaluate(({ key, data }) => {
      localStorage.setItem(key, JSON.stringify(data));
    }, { key: FAVORITES_KEY, data: favorites });

    await navigateTo(page, 'favorites');

    const cards = page.locator('[data-testid="favorite-card"]');
    // Newest should be first
    await expect(cards.first().locator('[data-testid="favorite-title"]'))
      .toContainText('新しいレビュー');
    await expect(cards.last().locator('[data-testid="favorite-title"]'))
      .toContainText('古いレビュー');
  });
});


// ============================================================
// Navigation Tests (Requirements 8.1-8.4)
// ============================================================
test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('should display all 5 navigation items', async ({ page }) => {
    // Requirement 8.1: 5 nav items accessible from all pages
    const navLinks = page.locator('.navbar-nav .nav-link');
    await expect(navLinks).toHaveCount(5);

    // Verify labels
    await expect(navLinks.nth(0)).toContainText('検索');
    await expect(navLinks.nth(1)).toContainText('履歴');
    await expect(navLinks.nth(2)).toContainText('お気に入り');
    await expect(navLinks.nth(3)).toContainText('設定');
    await expect(navLinks.nth(4)).toContainText('ヘルプ');
  });

  test('should highlight active navigation item on search page', async ({ page }) => {
    // Requirement 8.2, 8.3: Active item visually distinct
    await navigateTo(page, 'search');

    const searchLink = page.locator('.navbar-nav [data-route="search"]');
    await expect(searchLink).toHaveClass(/active/);

    // Other items should not be active
    const historyLink = page.locator('.navbar-nav [data-route="history"]');
    await expect(historyLink).not.toHaveClass(/active/);
  });

  test('should navigate between all pages and update active state', async ({ page }) => {
    // Requirement 8.2: Navigate and update active item
    const routes = ['search', 'history', 'favorites', 'settings', 'help'];

    for (const route of routes) {
      // On mobile viewports, the navbar may be collapsed - expand it first
      const toggler = page.locator('.navbar-toggler');
      if (await toggler.isVisible()) {
        const navCollapse = page.locator('#mainNav');
        if (!(await navCollapse.isVisible())) {
          await toggler.click();
          await page.waitForTimeout(400);
        }
      }

      // Click the nav link
      await page.locator(`.navbar-nav [data-route="${route}"]`).click();
      await page.waitForTimeout(200);

      // Verify active state
      const activeLink = page.locator(`.navbar-nav [data-route="${route}"]`);
      await expect(activeLink).toHaveClass(/active/);

      // Verify hash
      const hash = await page.evaluate(() => window.location.hash);
      expect(hash).toBe(`#${route}`);

      // Verify exactly one item is active
      const activeCount = await page.locator('.navbar-nav .nav-link.active').count();
      expect(activeCount).toBe(1);
    }
  });


  test('should navigate via hash change', async ({ page }) => {
    // Test hash-based routing directly
    await page.goto('/#settings');
    await page.waitForTimeout(300);

    const settingsLink = page.locator('.navbar-nav [data-route="settings"]');
    await expect(settingsLink).toHaveClass(/active/);

    // Navigate via hash
    await page.goto('/#favorites');
    await page.waitForTimeout(300);

    const favoritesLink = page.locator('.navbar-nav [data-route="favorites"]');
    await expect(favoritesLink).toHaveClass(/active/);
  });

  test('should default to search page when no hash is present', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(300);

    const searchLink = page.locator('.navbar-nav [data-route="search"]');
    await expect(searchLink).toHaveClass(/active/);
  });

  test('should maintain exactly one active nav item at all times', async ({ page }) => {
    // Requirement 8.2: Exactly one active at any time
    // Rapidly navigate between pages
    const routes = ['history', 'settings', 'favorites', 'help', 'search'];

    for (const route of routes) {
      // On mobile viewports, the navbar may be collapsed - expand it first
      const toggler = page.locator('.navbar-toggler');
      if (await toggler.isVisible()) {
        const navCollapse = page.locator('#mainNav');
        if (!(await navCollapse.isVisible())) {
          await toggler.click();
          await page.waitForTimeout(400);
        }
      }

      await page.locator(`.navbar-nav [data-route="${route}"]`).click();
      await page.waitForTimeout(100);

      const activeLinks = page.locator('.navbar-nav .nav-link.active');
      const count = await activeLinks.count();
      expect(count).toBe(1);
    }
  });

  test('should show page content for each route', async ({ page }) => {
    // Navigate to settings and verify content
    await navigateTo(page, 'settings');
    await expect(page.locator('.settings-page')).toBeVisible();

    // Navigate to history
    await navigateTo(page, 'history');
    await expect(page.locator('.history-page')).toBeVisible();

    // Navigate to favorites
    await navigateTo(page, 'favorites');
    await expect(page.locator('[data-testid="favorites-page"]')).toBeVisible();
  });

  test('should have aria-current on active nav item', async ({ page }) => {
    // Accessibility: aria-current for active item
    await navigateTo(page, 'settings');

    const settingsLink = page.locator('.navbar-nav [data-route="settings"]');
    await expect(settingsLink).toHaveAttribute('aria-current', 'page');

    // Other items should not have aria-current
    const searchLink = page.locator('.navbar-nav [data-route="search"]');
    await expect(searchLink).not.toHaveAttribute('aria-current');
  });
});
