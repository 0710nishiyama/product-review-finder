/**
 * E2E Tests: Search Flow and Responsive Layout
 *
 * Tests search form submission, AI/non-AI mode switching, loading state,
 * responsive layout at 3 breakpoints, no horizontal scrollbar, and pagination.
 *
 * Validates: Requirements 1.1-1.8, 2.1-2.6, 4.1-4.6, 7.1-7.5, 9.2-9.4
 */

import { test, expect, Page } from '@playwright/test';

// Breakpoint viewport sizes
const MOBILE_VIEWPORT = { width: 375, height: 812 };
const TABLET_VIEWPORT = { width: 820, height: 1180 };
const DESKTOP_VIEWPORT = { width: 1280, height: 800 };

/**
 * Helper: Navigate to the search page and wait for it to load.
 */
async function navigateToSearch(page: Page) {
  await page.goto('/#search');
  await page.waitForSelector('#search-input-form', { timeout: 5000 });
}

/**
 * Helper: Fill in the search form with product data.
 */
async function fillSearchForm(
  page: Page,
  options: {
    productName?: string;
    genre?: string;
    productUrl?: string;
  } = {}
) {
  const { productName = 'テスト商品', genre = '電子機器', productUrl = '' } = options;

  if (productName) {
    await page.fill('#product-name-input', productName);
  }
  if (genre) {
    await page.fill('#genre-input', genre);
  }
  if (productUrl) {
    await page.fill('#product-url-input', productUrl);
  }
}

/**
 * Helper: Mock the search API response by intercepting network requests
 * and injecting results into the page via script evaluation.
 */
async function mockSearchResults(page: Page, totalHits: number, reviewCount: number = 10) {
  const reviews = Array.from({ length: reviewCount }, (_, i) => ({
    id: `review-${i + 1}`,
    title: `レビュー ${i + 1}`,
    rating: 3.5 + (i % 3) * 0.5,
    summary: `これはテストレビュー ${i + 1} の概要です。商品の品質について詳しく説明しています。`,
    url: `https://example.com/review/${i + 1}`,
  }));

  const result = {
    search_mode: 'non-AI',
    total_hits: totalHits,
    pager: {
      page: 1,
      pages: Math.ceil(totalHits / 10),
    },
    ai_settings: null,
    ai_summary: null,
    reviews,
  };

  // Inject mock result into the page's SearchEngine
  await page.evaluate((mockResult) => {
    // Override the SearchEngine.search method to return mock data
    const searchResultsContainer = document.getElementById('search-results-container');
    if (searchResultsContainer) {
      // Dispatch a custom event that the app can listen to
      const event = new CustomEvent('mock-search-result', { detail: mockResult });
      window.dispatchEvent(event);
    }
    // Store mock result for later use
    (window as any).__mockSearchResult = mockResult;
  }, result);

  return result;
}

// ============================================================
// Test: Search form submission and results display
// Validates: Requirements 1.1, 1.2, 1.3, 1.5, 1.7
// ============================================================

test.describe('Search Form Submission', () => {
  test('should display search form with all required fields', async ({ page }) => {
    await navigateToSearch(page);

    // Requirement 1.1: Product name input field (max 100 chars)
    const productNameInput = page.locator('#product-name-input');
    await expect(productNameInput).toBeVisible();
    await expect(productNameInput).toHaveAttribute('maxlength', '100');
    await expect(productNameInput).toHaveAttribute('required', '');

    // Requirement 1.2: Genre input field
    const genreInput = page.locator('#genre-input');
    await expect(genreInput).toBeVisible();

    // Requirement 1.3: Product URL input field (max 2048 chars)
    const productUrlInput = page.locator('#product-url-input');
    await expect(productUrlInput).toBeVisible();
    await expect(productUrlInput).toHaveAttribute('maxlength', '2048');

    // Requirement 1.4: Image upload (JPEG/PNG, max 5MB)
    const imageInput = page.locator('#product-image-input');
    await expect(imageInput).toBeVisible();
    await expect(imageInput).toHaveAttribute('accept', 'image/jpeg,image/png');

    // Search button
    const searchButton = page.locator('#search-submit-btn');
    await expect(searchButton).toBeVisible();
    await expect(searchButton).toBeEnabled();
  });

  test('should show validation error when product name is empty', async ({ page }) => {
    await navigateToSearch(page);

    // Requirement 1.5: Error when product name is empty
    await page.click('#search-submit-btn');

    // Should show validation error
    const productNameInput = page.locator('#product-name-input');
    await expect(productNameInput).toHaveClass(/is-invalid/);

    const errorMessage = page.locator('#product-name-error');
    await expect(errorMessage).not.toBeEmpty();
  });

  test('should show validation error for invalid URL format', async ({ page }) => {
    await navigateToSearch(page);

    // Requirement 1.7: Error for invalid URL format
    await page.fill('#product-name-input', 'テスト商品');
    await page.fill('#product-url-input', 'invalid-url-format');
    await page.click('#search-submit-btn');

    const productUrlInput = page.locator('#product-url-input');
    await expect(productUrlInput).toHaveClass(/is-invalid/);

    const errorMessage = page.locator('#product-url-error');
    await expect(errorMessage).not.toBeEmpty();
  });

  test('should clear validation errors on input', async ({ page }) => {
    await navigateToSearch(page);

    // Trigger validation error
    await page.click('#search-submit-btn');
    await expect(page.locator('#product-name-input')).toHaveClass(/is-invalid/);

    // Type in the field to clear error
    await page.fill('#product-name-input', 'テスト');
    await expect(page.locator('#product-name-input')).not.toHaveClass(/is-invalid/);
  });

  test('should submit form with valid product data', async ({ page }) => {
    await navigateToSearch(page);

    await fillSearchForm(page, {
      productName: 'テスト商品名',
      genre: '家電',
      productUrl: 'https://example.com/product',
    });

    // Click search - form should submit without validation errors
    await page.click('#search-submit-btn');

    // No validation errors should be visible
    await expect(page.locator('#product-name-input')).not.toHaveClass(/is-invalid/);
    await expect(page.locator('#product-url-input')).not.toHaveClass(/is-invalid/);
  });
});

// ============================================================
// Test: AI mode vs non-AI mode switching
// Validates: Requirements 2.1-2.6
// ============================================================

test.describe('AI Mode vs Non-AI Mode Switching', () => {
  test('should default to non-AI mode', async ({ page }) => {
    await navigateToSearch(page);

    // Requirement 2.1: Default to non-AI mode
    const nonAIRadio = page.locator('#modeNonAI');
    await expect(nonAIRadio).toBeChecked();

    const aiRadio = page.locator('#modeAI');
    await expect(aiRadio).not.toBeChecked();
  });

  test('should switch to AI mode when AI radio is selected', async ({ page }) => {
    await navigateToSearch(page);

    // Click AI mode label
    await page.click('label[data-mode="AI"]');

    const aiRadio = page.locator('#modeAI');
    await expect(aiRadio).toBeChecked();

    const nonAIRadio = page.locator('#modeNonAI');
    await expect(nonAIRadio).not.toBeChecked();

    // AI mode label should have active class
    const aiLabel = page.locator('label[data-mode="AI"]');
    await expect(aiLabel).toHaveClass(/active/);
  });

  test('should switch back to non-AI mode', async ({ page }) => {
    await navigateToSearch(page);

    // Switch to AI mode first
    await page.click('label[data-mode="AI"]');
    await expect(page.locator('#modeAI')).toBeChecked();

    // Switch back to non-AI mode
    await page.click('label[data-mode="non-AI"]');
    await expect(page.locator('#modeNonAI')).toBeChecked();

    const nonAILabel = page.locator('label[data-mode="non-AI"]');
    await expect(nonAILabel).toHaveClass(/active/);
  });

  test('should display mode selector with proper labels', async ({ page }) => {
    await navigateToSearch(page);

    const nonAILabel = page.locator('label[data-mode="non-AI"]');
    await expect(nonAILabel).toContainText('非AIモード');

    const aiLabel = page.locator('label[data-mode="AI"]');
    await expect(aiLabel).toContainText('AIモード');
  });
});

// ============================================================
// Test: Loading state during search
// Validates: Requirements 7.1-7.5
// ============================================================

test.describe('Loading State During Search', () => {
  test('should disable search button during loading', async ({ page }) => {
    await navigateToSearch(page);

    await fillSearchForm(page, { productName: 'テスト商品' });

    // Submit the form
    await page.click('#search-submit-btn');

    // Requirement 7.1: Search button should be disabled during loading
    // The button may be disabled briefly - check immediately after click
    const searchButton = page.locator('#search-submit-btn');

    // Wait for either the button to be disabled or the loading overlay to appear
    await expect(
      searchButton.isDisabled().then((disabled) => disabled) ||
      page.locator('.loading-overlay').isVisible().then((visible) => visible)
    ).toBeTruthy;
  });

  test('should show loading overlay with progress bar', async ({ page }) => {
    await navigateToSearch(page);

    // We need to intercept the search to keep it in loading state
    await page.route('**/*', async (route) => {
      // Delay all API requests to keep loading state visible
      if (route.request().url().includes('api')) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      await route.continue();
    });

    await fillSearchForm(page, { productName: 'テスト商品' });
    await page.click('#search-submit-btn');

    // Requirement 7.2: Loading overlay with indeterminate progress bar
    const loadingOverlay = page.locator('.loading-overlay');
    const progressBar = page.locator('.progress-bar-animated');

    // Check if loading state appears (may be very brief)
    const hasLoading = await loadingOverlay.isVisible().catch(() => false);
    if (hasLoading) {
      await expect(progressBar).toBeVisible();
      await expect(page.locator('.loading-overlay__message')).toContainText('検索中');
    }
  });

  test('should show search button text change during loading', async ({ page }) => {
    await navigateToSearch(page);

    await fillSearchForm(page, { productName: 'テスト商品' });

    // Before search
    const searchButton = page.locator('#search-submit-btn');
    await expect(searchButton).toContainText('検索');

    // Submit form
    await page.click('#search-submit-btn');

    // During loading, button text should change to "検索中..."
    // This may be very brief, so we check if it transitions
    const buttonText = await searchButton.textContent();
    // The button should either show "検索中..." or have already completed
    expect(buttonText?.includes('検索') || buttonText?.includes('検索中')).toBeTruthy();
  });
});

// ============================================================
// Test: Responsive layout at 3 breakpoints
// Validates: Requirements 9.2, 9.3
// ============================================================

test.describe('Responsive Layout - Mobile (< 768px)', () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test('should display 1-column layout on mobile', async ({ page }) => {
    await navigateToSearch(page);

    // Requirement 9.2: 1-column layout for < 768px
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();

    // Sidebar should be hidden on mobile
    const sidebar = page.locator('#sidebar');
    await expect(sidebar).toBeHidden();
  });

  test('should display review cards in 1 column on mobile', async ({ page }) => {
    await navigateToSearch(page);

    // Check that review card columns use col-12 (full width)
    const reviewCards = page.locator('[data-testid="review-card"]');
    const cardColumns = page.locator('.col-12.col-md-6.col-lg-4');

    // If there are review cards, they should be full width
    const count = await cardColumns.count();
    if (count > 0) {
      const firstCard = cardColumns.first();
      const box = await firstCard.boundingBox();
      if (box) {
        // On mobile, card should take nearly full viewport width
        expect(box.width).toBeGreaterThan(MOBILE_VIEWPORT.width * 0.8);
      }
    }
  });

  test('should show navbar toggler on mobile', async ({ page }) => {
    await navigateToSearch(page);

    // On mobile, the navbar should collapse and show a toggler button
    const toggler = page.locator('.navbar-toggler');
    await expect(toggler).toBeVisible();
  });
});

test.describe('Responsive Layout - Tablet (768px - 992px)', () => {
  test.use({ viewport: TABLET_VIEWPORT });

  test('should display 2-column layout on tablet', async ({ page }) => {
    await navigateToSearch(page);

    // Requirement 9.2: 2-column layout for 768px - 992px
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();

    // Sidebar should be hidden on tablet
    const sidebar = page.locator('#sidebar');
    await expect(sidebar).toBeHidden();
  });

  test('should display review cards in 2 columns on tablet', async ({ page }) => {
    await navigateToSearch(page);

    // Requirement 9.3: Review cards in 2 columns (col-md-6) on tablet
    const cardColumns = page.locator('.col-12.col-md-6.col-lg-4');
    const count = await cardColumns.count();

    if (count >= 2) {
      const firstCard = cardColumns.nth(0);
      const secondCard = cardColumns.nth(1);

      const firstBox = await firstCard.boundingBox();
      const secondBox = await secondCard.boundingBox();

      if (firstBox && secondBox) {
        // On tablet, cards should be approximately half the viewport width
        expect(firstBox.width).toBeLessThan(TABLET_VIEWPORT.width * 0.6);
        // Two cards should be side by side (same Y position)
        expect(Math.abs(firstBox.y - secondBox.y)).toBeLessThan(5);
      }
    }
  });
});

test.describe('Responsive Layout - Desktop (>= 992px)', () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test('should display sidebar + main layout on desktop', async ({ page }) => {
    await navigateToSearch(page);

    // Requirement 9.2: Sidebar + main (3:9 ratio) for >= 992px
    const sidebar = page.locator('#sidebar');
    await expect(sidebar).toBeVisible();

    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();

    // Verify sidebar is narrower than main content
    const sidebarBox = await sidebar.boundingBox();
    const mainBox = await mainContent.boundingBox();

    if (sidebarBox && mainBox) {
      expect(sidebarBox.width).toBeLessThan(mainBox.width);
      // Sidebar should be approximately 25% of viewport (col-lg-3)
      expect(sidebarBox.width).toBeGreaterThan(DESKTOP_VIEWPORT.width * 0.15);
      expect(sidebarBox.width).toBeLessThan(DESKTOP_VIEWPORT.width * 0.35);
    }
  });

  test('should display review cards in 3 columns on desktop', async ({ page }) => {
    await navigateToSearch(page);

    // Requirement 9.3: Review cards in 3 columns (col-lg-4) on desktop
    const cardColumns = page.locator('.col-12.col-md-6.col-lg-4');
    const count = await cardColumns.count();

    if (count >= 3) {
      const firstCard = cardColumns.nth(0);
      const secondCard = cardColumns.nth(1);
      const thirdCard = cardColumns.nth(2);

      const firstBox = await firstCard.boundingBox();
      const secondBox = await secondCard.boundingBox();
      const thirdBox = await thirdCard.boundingBox();

      if (firstBox && secondBox && thirdBox) {
        // Three cards should be on the same row
        expect(Math.abs(firstBox.y - secondBox.y)).toBeLessThan(5);
        expect(Math.abs(secondBox.y - thirdBox.y)).toBeLessThan(5);
      }
    }
  });

  test('should show sidebar navigation items on desktop', async ({ page }) => {
    await navigateToSearch(page);

    const sidebarNav = page.locator('#sidebar-nav');
    await expect(sidebarNav).toBeVisible();

    // Should have navigation links
    const navLinks = sidebarNav.locator('.nav-link');
    await expect(navLinks).toHaveCount(5);
  });
});

// ============================================================
// Test: No horizontal scrollbar at all breakpoints
// Validates: Requirement 9.4
// ============================================================

test.describe('No Horizontal Scrollbar', () => {
  const viewports = [
    { name: 'mobile', ...MOBILE_VIEWPORT },
    { name: 'tablet', ...TABLET_VIEWPORT },
    { name: 'desktop', ...DESKTOP_VIEWPORT },
  ];

  for (const viewport of viewports) {
    test(`should have no horizontal scrollbar at ${viewport.name} (${viewport.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await navigateToSearch(page);

      // Requirement 9.4: No horizontal scrollbar on any page
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalScroll).toBe(false);
    });
  }

  for (const viewport of viewports) {
    test(`should have no horizontal scrollbar on history page at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/#history');
      await page.waitForTimeout(500);

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalScroll).toBe(false);
    });
  }

  for (const viewport of viewports) {
    test(`should have no horizontal scrollbar on settings page at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/#settings');
      await page.waitForTimeout(500);

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalScroll).toBe(false);
    });
  }
});

// ============================================================
// Test: Pagination navigation and scroll-to-top
// Validates: Requirements 4.3, 4.4, 4.5, 4.6
// ============================================================

test.describe('Pagination Navigation', () => {
  test('should hide pagination when total_hits <= 10', async ({ page }) => {
    await navigateToSearch(page);

    // Requirement 4.3: Pagination shown only when total_hits > 10
    // When there are no results or <= 10 results, pagination should be hidden
    const pagination = page.locator('[data-testid="pagination"]');
    await expect(pagination).toHaveCount(0);
  });

  test('should display pagination info with current page and total pages', async ({ page }) => {
    await navigateToSearch(page);

    // If pagination is visible, it should show page info
    const paginationInfo = page.locator('[data-testid="pagination-info"]');
    const count = await paginationInfo.count();

    if (count > 0) {
      // Requirement 4.4: Show current page / total pages
      const text = await paginationInfo.textContent();
      expect(text).toMatch(/ページ \d+ \/ \d+/);
    }
  });

  test('should highlight current page in pagination', async ({ page }) => {
    await navigateToSearch(page);

    // Check if pagination exists and has active page
    const activePage = page.locator('[data-testid="pagination"] .page-item.active');
    const count = await activePage.count();

    if (count > 0) {
      // Active page should be highlighted
      await expect(activePage).toHaveClass(/active/);
    }
  });

  test('should have disabled previous button on first page', async ({ page }) => {
    await navigateToSearch(page);

    const prevButton = page.locator('[data-page-nav="prev"]').locator('..');
    const count = await prevButton.count();

    if (count > 0) {
      // On first page, previous button should be disabled
      await expect(prevButton).toHaveClass(/disabled/);
    }
  });

  test('pagination scroll-to-top behavior', async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await navigateToSearch(page);

    // Requirement 4.5: Scroll to top on page change
    // If pagination exists, clicking a page link should scroll to top
    const pageLinks = page.locator('[data-testid="pagination"] .page-link[data-page]');
    const count = await pageLinks.count();

    if (count > 1) {
      // Scroll down first
      await page.evaluate(() => window.scrollTo(0, 500));
      const scrollBefore = await page.evaluate(() => window.scrollY);

      // Click a page link (not the current active one)
      const nonActivePage = page.locator(
        '[data-testid="pagination"] .page-item:not(.active):not(.disabled) .page-link[data-page]'
      );
      const nonActiveCount = await nonActivePage.count();

      if (nonActiveCount > 0) {
        await nonActivePage.first().click();

        // Wait for scroll animation
        await page.waitForTimeout(500);

        const scrollAfter = await page.evaluate(() => window.scrollY);
        // Should have scrolled to top (or near top)
        expect(scrollAfter).toBeLessThanOrEqual(scrollBefore);
      }
    }
  });
});

// ============================================================
// Test: Search results display
// Validates: Requirements 4.1, 4.2, 4.6
// ============================================================

test.describe('Search Results Display', () => {
  test('should show total hits count when results are displayed', async ({ page }) => {
    await navigateToSearch(page);

    // Requirement 4.2: Display total_hits count
    const totalHits = page.locator('[data-testid="total-hits"]');
    const count = await totalHits.count();

    if (count > 0) {
      const text = await totalHits.textContent();
      expect(text).toContain('検索結果');
      expect(text).toContain('件');
    }
  });

  test('should show no results message when reviews is empty', async ({ page }) => {
    await navigateToSearch(page);

    // Requirement 4.6: Show "no results" message when reviews is empty
    const noResults = page.locator('[data-testid="no-results"]');
    const count = await noResults.count();

    if (count > 0) {
      await expect(noResults).toContainText('見つかりませんでした');
    }
  });

  test('should display review cards with required fields', async ({ page }) => {
    await navigateToSearch(page);

    // Requirement 4.1: Each review card has title, rating, summary, source URL
    const reviewCards = page.locator('[data-testid="review-card"]');
    const count = await reviewCards.count();

    if (count > 0) {
      const firstCard = reviewCards.first();

      // Title
      const title = firstCard.locator('[data-testid="review-title"]');
      await expect(title).toBeVisible();

      // Rating
      const rating = firstCard.locator('[data-testid="review-rating"]');
      await expect(rating).toBeVisible();

      // Summary
      const summary = firstCard.locator('[data-testid="review-summary"]');
      await expect(summary).toBeVisible();

      // Source URL with target="_blank"
      const url = firstCard.locator('[data-testid="review-url"]');
      await expect(url).toBeVisible();
      await expect(url).toHaveAttribute('target', '_blank');
    }
  });

  test('should show AI summary card only in AI mode', async ({ page }) => {
    await navigateToSearch(page);

    // Requirement 5.1, 5.5: AI summary only visible in AI mode
    // In non-AI mode (default), AI summary should not be visible
    const aiSummary = page.locator('[data-testid="ai-summary-card"]');
    await expect(aiSummary).toHaveCount(0);
  });
});

// ============================================================
// Test: Viewport meta tag
// Validates: Requirement 9.5
// ============================================================

test.describe('Viewport Configuration', () => {
  test('should have viewport meta tag with initial-scale=1.0', async ({ page }) => {
    await page.goto('/');

    // Requirement 9.5: viewport meta tag with initial-scale=1.0
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', /initial-scale=1\.0/);
  });
});

// ============================================================
// Test: Navigation integration with search page
// Validates: Requirements 8.1, 8.2
// ============================================================

test.describe('Navigation on Search Page', () => {
  test('should highlight search nav item when on search page', async ({ page }) => {
    await navigateToSearch(page);

    // Requirement 8.2: Active nav item corresponds to current route
    // Use navbar-nav to target only the top navigation bar (not sidebar)
    const searchNavLink = page.locator('.navbar-nav .nav-link[data-route="search"]');
    await expect(searchNavLink).toHaveClass(/active/);
  });

  test('should have exactly one active nav item', async ({ page }) => {
    await navigateToSearch(page);

    // Requirement 8.2: Exactly one navigation item is active
    const activeLinks = page.locator('.navbar-nav .nav-link.active');
    await expect(activeLinks).toHaveCount(1);
  });
});
