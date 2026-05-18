/**
 * Unit tests for SearchResults container component
 * Tests: rendering, AI summary display, responsive grid, no results, total hits
 * Requirements: 4.1, 4.2, 4.6, 5.1, 5.5, 9.3
 *
 * @jest-environment jsdom
 */

import { SearchResults, createSearchResults } from '../../src/components/searchResults';
import { SearchResult, ReviewItem, AISummary } from '../../src/models/types';

describe('SearchResults', () => {
  let container: HTMLElement;

  const createMockReview = (overrides: Partial<ReviewItem> = {}): ReviewItem => ({
    id: 'review-1',
    title: 'Great Product',
    rating: 4.5,
    summary: 'This is a great product with excellent features.',
    url: 'https://example.com/review/1',
    ...overrides,
  });

  const createMockAISummary = (overrides: Partial<AISummary> = {}): AISummary => ({
    average_rating: 4.2,
    credibility_score: 85,
    summary_text: 'Overall positive reviews with high credibility.',
    ...overrides,
  });

  const createMockSearchResult = (overrides: Partial<SearchResult> = {}): SearchResult => ({
    search_mode: 'non-AI',
    total_hits: 5,
    pager: { page: 1, pages: 1 },
    ai_settings: null,
    ai_summary: null,
    reviews: [createMockReview()],
    ...overrides,
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('Rendering with null result', () => {
    it('should render nothing when result is null', () => {
      new SearchResults(container, { result: null });
      expect(container.innerHTML).toBe('');
    });
  });

  describe('Total hits display (Requirement 4.2)', () => {
    it('should display total_hits count', () => {
      const result = createMockSearchResult({ total_hits: 42 });
      new SearchResults(container, { result });

      const totalHits = container.querySelector('[data-testid="total-hits"]');
      expect(totalHits).not.toBeNull();
      expect(totalHits?.textContent).toContain('42');
    });

    it('should display 0 total_hits', () => {
      const result = createMockSearchResult({ total_hits: 0, reviews: [] });
      new SearchResults(container, { result });

      const totalHits = container.querySelector('[data-testid="total-hits"]');
      expect(totalHits?.textContent).toContain('0');
    });
  });

  describe('AI Summary Card (Requirements 5.1, 5.5)', () => {
    it('should show AISummaryCard when search_mode is AI', () => {
      const result = createMockSearchResult({
        search_mode: 'AI',
        ai_summary: createMockAISummary(),
        ai_settings: { model: 'gpt-4', confidence_threshold: 0.8 },
      });
      new SearchResults(container, { result });

      const summaryCard = container.querySelector('[data-testid="ai-summary-card"]');
      expect(summaryCard).not.toBeNull();
    });

    it('should NOT show AISummaryCard when search_mode is non-AI', () => {
      const result = createMockSearchResult({ search_mode: 'non-AI' });
      new SearchResults(container, { result });

      const summaryCard = container.querySelector('[data-testid="ai-summary-card"]');
      expect(summaryCard).toBeNull();
    });

    it('should display average_rating in AI summary', () => {
      const result = createMockSearchResult({
        search_mode: 'AI',
        ai_summary: createMockAISummary({ average_rating: 4.2 }),
        ai_settings: { model: 'gpt-4', confidence_threshold: 0.8 },
      });
      new SearchResults(container, { result });

      const summaryCard = container.querySelector('[data-testid="ai-summary-card"]');
      expect(summaryCard?.textContent).toContain('4.2');
    });

    it('should display credibility_score in AI summary', () => {
      const result = createMockSearchResult({
        search_mode: 'AI',
        ai_summary: createMockAISummary({ credibility_score: 85 }),
        ai_settings: { model: 'gpt-4', confidence_threshold: 0.8 },
      });
      new SearchResults(container, { result });

      const summaryCard = container.querySelector('[data-testid="ai-summary-card"]');
      expect(summaryCard?.textContent).toContain('85%');
    });

    it('should display summary_text in AI summary', () => {
      const result = createMockSearchResult({
        search_mode: 'AI',
        ai_summary: createMockAISummary({ summary_text: 'Test summary text' }),
        ai_settings: { model: 'gpt-4', confidence_threshold: 0.8 },
      });
      new SearchResults(container, { result });

      const summaryText = container.querySelector('[data-testid="ai-summary-text"]');
      expect(summaryText?.textContent).toContain('Test summary text');
    });

    it('should hide rating and credibility when they are null (0 reviews)', () => {
      const result = createMockSearchResult({
        search_mode: 'AI',
        ai_summary: createMockAISummary({
          average_rating: null,
          credibility_score: null,
          summary_text: 'レビューが見つかりませんでした。',
        }),
        ai_settings: { model: 'gpt-4', confidence_threshold: 0.8 },
        reviews: [],
        total_hits: 0,
      });
      new SearchResults(container, { result });

      const summaryCard = container.querySelector('[data-testid="ai-summary-card"]');
      expect(summaryCard).not.toBeNull();
      expect(summaryCard?.textContent).not.toContain('平均評価');
      expect(summaryCard?.textContent).not.toContain('信憑性');
    });

    it('should not show AI summary card when ai_summary is null even in AI mode', () => {
      const result = createMockSearchResult({
        search_mode: 'AI',
        ai_summary: null,
        ai_settings: { model: 'gpt-4', confidence_threshold: 0.8 },
      });
      new SearchResults(container, { result });

      const summaryCard = container.querySelector('[data-testid="ai-summary-card"]');
      expect(summaryCard).toBeNull();
    });
  });

  describe('No results message (Requirement 4.6)', () => {
    it('should show "no results" message when reviews array is empty', () => {
      const result = createMockSearchResult({ reviews: [], total_hits: 0 });
      new SearchResults(container, { result });

      const noResults = container.querySelector('[data-testid="no-results"]');
      expect(noResults).not.toBeNull();
      expect(noResults?.textContent).toContain('該当するレビューが見つかりませんでした');
    });

    it('should NOT show "no results" message when reviews exist', () => {
      const result = createMockSearchResult({ reviews: [createMockReview()] });
      new SearchResults(container, { result });

      const noResults = container.querySelector('[data-testid="no-results"]');
      expect(noResults).toBeNull();
    });
  });

  describe('Review list responsive grid (Requirement 9.3)', () => {
    it('should render review cards in a row container', () => {
      const result = createMockSearchResult({ reviews: [createMockReview()] });
      new SearchResults(container, { result });

      const reviewList = container.querySelector('[data-testid="review-list"]');
      expect(reviewList).not.toBeNull();
      expect(reviewList?.classList.contains('row')).toBe(true);
    });

    it('should apply responsive column classes: col-12, col-md-6, col-lg-4', () => {
      const reviews = [
        createMockReview({ id: 'r1' }),
        createMockReview({ id: 'r2' }),
        createMockReview({ id: 'r3' }),
      ];
      const result = createMockSearchResult({ reviews, total_hits: 3 });
      new SearchResults(container, { result });

      const columns = container.querySelectorAll('[data-testid="review-list"] > div');
      columns.forEach((col) => {
        expect(col.classList.contains('col-12')).toBe(true);
        expect(col.classList.contains('col-md-6')).toBe(true);
        expect(col.classList.contains('col-lg-4')).toBe(true);
      });
    });

    it('should render correct number of review cards', () => {
      const reviews = [
        createMockReview({ id: 'r1' }),
        createMockReview({ id: 'r2' }),
        createMockReview({ id: 'r3' }),
      ];
      const result = createMockSearchResult({ reviews, total_hits: 3 });
      new SearchResults(container, { result });

      const cards = container.querySelectorAll('[data-testid="review-card"]');
      expect(cards.length).toBe(3);
    });
  });

  describe('Review card content (Requirement 4.1)', () => {
    it('should display review title', () => {
      const review = createMockReview({ title: 'Amazing Product Review' });
      const result = createMockSearchResult({ reviews: [review] });
      new SearchResults(container, { result });

      const title = container.querySelector('[data-testid="review-title"]');
      expect(title?.textContent).toContain('Amazing Product Review');
    });

    it('should display review rating', () => {
      const review = createMockReview({ rating: 4.5 });
      const result = createMockSearchResult({ reviews: [review] });
      new SearchResults(container, { result });

      const rating = container.querySelector('[data-testid="review-rating"]');
      expect(rating?.textContent).toContain('4.5');
    });

    it('should display review summary', () => {
      const review = createMockReview({ summary: 'Excellent quality and value.' });
      const result = createMockSearchResult({ reviews: [review] });
      new SearchResults(container, { result });

      const summary = container.querySelector('[data-testid="review-summary"]');
      expect(summary?.textContent).toContain('Excellent quality and value.');
    });

    it('should display review URL as external link with target="_blank"', () => {
      const review = createMockReview({ url: 'https://example.com/review' });
      const result = createMockSearchResult({ reviews: [review] });
      new SearchResults(container, { result });

      const link = container.querySelector('[data-testid="review-url"]') as HTMLAnchorElement;
      expect(link).not.toBeNull();
      expect(link.href).toBe('https://example.com/review');
      expect(link.target).toBe('_blank');
      expect(link.rel).toContain('noopener');
    });
  });

  describe('Favorite toggle', () => {
    it('should show unfavorited state by default', () => {
      const result = createMockSearchResult({ reviews: [createMockReview()] });
      new SearchResults(container, { result });

      const favoriteBtn = container.querySelector('[data-testid="favorite-toggle"]');
      expect(favoriteBtn?.textContent?.trim()).toBe('☆');
    });

    it('should show favorited state when isFavorited returns true', () => {
      const review = createMockReview({ id: 'fav-1' });
      const result = createMockSearchResult({ reviews: [review] });
      new SearchResults(container, {
        result,
        isFavorited: (id) => id === 'fav-1',
      });

      const favoriteBtn = container.querySelector('[data-testid="favorite-toggle"]');
      expect(favoriteBtn?.textContent?.trim()).toBe('★');
    });

    it('should call onFavoriteToggle when favorite button is clicked', () => {
      const review = createMockReview({ id: 'toggle-1' });
      const result = createMockSearchResult({ reviews: [review] });
      const onFavoriteToggle = jest.fn();

      new SearchResults(container, { result, onFavoriteToggle });

      const favoriteBtn = container.querySelector('[data-testid="favorite-toggle"]') as HTMLElement;
      favoriteBtn.click();

      expect(onFavoriteToggle).toHaveBeenCalledWith(review);
    });
  });

  describe('Update method', () => {
    it('should re-render with new results when update is called', () => {
      const result1 = createMockSearchResult({ total_hits: 5 });
      const component = new SearchResults(container, { result: result1 });

      const result2 = createMockSearchResult({ total_hits: 10 });
      component.update({ result: result2 });

      const totalHits = container.querySelector('[data-testid="total-hits"]');
      expect(totalHits?.textContent).toContain('10');
    });
  });

  describe('XSS prevention', () => {
    it('should escape HTML in review title', () => {
      const review = createMockReview({ title: '<script>alert("xss")</script>' });
      const result = createMockSearchResult({ reviews: [review] });
      new SearchResults(container, { result });

      const title = container.querySelector('[data-testid="review-title"]');
      expect(title?.innerHTML).not.toContain('<script>');
    });

    it('should escape HTML in summary text', () => {
      const review = createMockReview({ summary: '<img onerror="alert(1)" src="x">' });
      const result = createMockSearchResult({ reviews: [review] });
      new SearchResults(container, { result });

      const summary = container.querySelector('[data-testid="review-summary"]');
      expect(summary?.innerHTML).not.toContain('<img');
    });
  });

  describe('Factory function', () => {
    it('should create a SearchResults instance', () => {
      const component = createSearchResults(container);
      expect(component).toBeInstanceOf(SearchResults);
    });

    it('should accept props in factory function', () => {
      const result = createMockSearchResult({ total_hits: 7 });
      const component = createSearchResults(container, { result });
      expect(component.getResult()).toEqual(result);
    });
  });

  describe('Destroy', () => {
    it('should clear the container content', () => {
      const result = createMockSearchResult();
      const component = new SearchResults(container, { result });
      expect(container.innerHTML).not.toBe('');

      component.destroy();
      expect(container.innerHTML).toBe('');
    });
  });
});
