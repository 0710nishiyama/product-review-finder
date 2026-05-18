/**
 * Unit tests for ReviewCard component
 * Tests: rendering title/rating/summary/URL, favorite toggle, Bootstrap card usage
 * Requirements: 4.1, 10.4
 *
 * @jest-environment jsdom
 */

import { ReviewCard, createReviewCard, ReviewCardProps } from '../../src/components/reviewCard';
import { ReviewItem } from '../../src/models/types';

describe('ReviewCard', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  const sampleReview: ReviewItem = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: '素晴らしい商品です',
    rating: 4.5,
    summary: '品質が高く、価格に見合った価値があります。デザインも良く、使い勝手も抜群です。',
    url: 'https://example.com/review/123'
  };

  const defaultProps: ReviewCardProps = {
    review: sampleReview,
    onFavoriteToggle: jest.fn(),
    isFavorited: false
  };

  describe('Card rendering - Requirement 4.1', () => {
    it('should render a Bootstrap card component', () => {
      new ReviewCard(container, defaultProps);
      const card = container.querySelector('[data-testid="review-card"]');
      expect(card).not.toBeNull();
      expect(card?.classList.contains('card')).toBe(true);
    });

    it('should include the review id as data attribute', () => {
      new ReviewCard(container, defaultProps);
      const card = container.querySelector('[data-testid="review-card"]');
      expect(card?.getAttribute('data-review-id')).toBe(sampleReview.id);
    });
  });

  describe('Title display - Requirement 4.1', () => {
    it('should display the review title', () => {
      new ReviewCard(container, defaultProps);
      const title = container.querySelector('[data-testid="review-title"]');
      expect(title).not.toBeNull();
      expect(title?.textContent).toBe('素晴らしい商品です');
    });

    it('should escape HTML in title to prevent XSS', () => {
      const xssReview: ReviewItem = {
        ...sampleReview,
        title: '<script>alert("xss")</script>'
      };
      new ReviewCard(container, { ...defaultProps, review: xssReview });
      const title = container.querySelector('[data-testid="review-title"]');
      expect(title?.innerHTML).not.toContain('<script>');
      expect(title?.textContent).toContain('<script>alert("xss")</script>');
    });
  });

  describe('Rating display - Requirement 4.1', () => {
    it('should display the rating value', () => {
      new ReviewCard(container, defaultProps);
      const rating = container.querySelector('[data-testid="review-rating"]');
      expect(rating).not.toBeNull();
      expect(rating?.textContent).toContain('4.5');
    });

    it('should format rating to 1 decimal place', () => {
      const review: ReviewItem = { ...sampleReview, rating: 3.0 };
      new ReviewCard(container, { ...defaultProps, review });
      const rating = container.querySelector('[data-testid="review-rating"]');
      expect(rating?.textContent).toContain('3.0');
    });

    it('should display minimum rating correctly', () => {
      const review: ReviewItem = { ...sampleReview, rating: 1.0 };
      new ReviewCard(container, { ...defaultProps, review });
      const rating = container.querySelector('[data-testid="review-rating"]');
      expect(rating?.textContent).toContain('1.0');
    });

    it('should display maximum rating correctly', () => {
      const review: ReviewItem = { ...sampleReview, rating: 5.0 };
      new ReviewCard(container, { ...defaultProps, review });
      const rating = container.querySelector('[data-testid="review-rating"]');
      expect(rating?.textContent).toContain('5.0');
    });
  });

  describe('Summary display - Requirement 4.1', () => {
    it('should display the review summary', () => {
      new ReviewCard(container, defaultProps);
      const summary = container.querySelector('[data-testid="review-summary"]');
      expect(summary).not.toBeNull();
      expect(summary?.textContent).toContain('品質が高く、価格に見合った価値があります');
    });

    it('should escape HTML in summary to prevent XSS', () => {
      const xssReview: ReviewItem = {
        ...sampleReview,
        summary: '<img src=x onerror=alert(1)>'
      };
      new ReviewCard(container, { ...defaultProps, review: xssReview });
      const summary = container.querySelector('[data-testid="review-summary"]');
      expect(summary?.innerHTML).not.toContain('<img');
      expect(summary?.textContent).toContain('<img src=x onerror=alert(1)>');
    });
  });

  describe('Source URL - Requirement 4.1', () => {
    it('should display a clickable URL link', () => {
      new ReviewCard(container, defaultProps);
      const link = container.querySelector('[data-testid="review-url"]') as HTMLAnchorElement;
      expect(link).not.toBeNull();
      expect(link.tagName).toBe('A');
      expect(link.href).toBe('https://example.com/review/123');
    });

    it('should open URL in new tab with target="_blank"', () => {
      new ReviewCard(container, defaultProps);
      const link = container.querySelector('[data-testid="review-url"]') as HTMLAnchorElement;
      expect(link.getAttribute('target')).toBe('_blank');
    });

    it('should include rel="noopener noreferrer" for security', () => {
      new ReviewCard(container, defaultProps);
      const link = container.querySelector('[data-testid="review-url"]') as HTMLAnchorElement;
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    });
  });

  describe('Favorite toggle - Requirement 10.4', () => {
    it('should render a favorite toggle button', () => {
      new ReviewCard(container, defaultProps);
      const button = container.querySelector('[data-testid="favorite-toggle"]');
      expect(button).not.toBeNull();
      expect(button?.tagName).toBe('BUTTON');
    });

    it('should show unfavorited state (☆) when isFavorited is false', () => {
      new ReviewCard(container, { ...defaultProps, isFavorited: false });
      const button = container.querySelector('[data-testid="favorite-toggle"]');
      expect(button?.textContent?.trim()).toBe('☆');
      expect(button?.classList.contains('btn-outline-warning')).toBe(true);
    });

    it('should show favorited state (★) when isFavorited is true', () => {
      new ReviewCard(container, { ...defaultProps, isFavorited: true });
      const button = container.querySelector('[data-testid="favorite-toggle"]');
      expect(button?.textContent?.trim()).toBe('★');
      expect(button?.classList.contains('btn-warning')).toBe(true);
    });

    it('should call onFavoriteToggle with the review when clicked', () => {
      const onFavoriteToggle = jest.fn();
      new ReviewCard(container, { ...defaultProps, onFavoriteToggle });
      const button = container.querySelector('[data-testid="favorite-toggle"]') as HTMLButtonElement;
      button.click();
      expect(onFavoriteToggle).toHaveBeenCalledTimes(1);
      expect(onFavoriteToggle).toHaveBeenCalledWith(sampleReview);
    });

    it('should have an accessible aria-label', () => {
      new ReviewCard(container, { ...defaultProps, isFavorited: false });
      const button = container.querySelector('[data-testid="favorite-toggle"]');
      expect(button?.getAttribute('aria-label')).toBe('お気に入りに追加');
    });

    it('should update aria-label when favorited', () => {
      new ReviewCard(container, { ...defaultProps, isFavorited: true });
      const button = container.querySelector('[data-testid="favorite-toggle"]');
      expect(button?.getAttribute('aria-label')).toBe('お気に入りから削除');
    });
  });

  describe('update()', () => {
    it('should re-render with new review data', () => {
      const card = new ReviewCard(container, defaultProps);
      const newReview: ReviewItem = {
        ...sampleReview,
        title: '更新されたタイトル',
        rating: 2.5
      };
      card.update({ review: newReview });
      const title = container.querySelector('[data-testid="review-title"]');
      expect(title?.textContent).toBe('更新されたタイトル');
      const rating = container.querySelector('[data-testid="review-rating"]');
      expect(rating?.textContent).toContain('2.5');
    });

    it('should update favorite state', () => {
      const card = new ReviewCard(container, { ...defaultProps, isFavorited: false });
      card.update({ isFavorited: true });
      const button = container.querySelector('[data-testid="favorite-toggle"]');
      expect(button?.textContent?.trim()).toBe('★');
    });
  });

  describe('getProps()', () => {
    it('should return current props', () => {
      const card = new ReviewCard(container, defaultProps);
      const props = card.getProps();
      expect(props.review).toEqual(sampleReview);
      expect(props.isFavorited).toBe(false);
    });
  });

  describe('destroy()', () => {
    it('should clear the container', () => {
      const card = new ReviewCard(container, defaultProps);
      card.destroy();
      expect(container.innerHTML).toBe('');
    });
  });

  describe('Factory function', () => {
    it('should create a ReviewCard instance', () => {
      const card = createReviewCard(container, defaultProps);
      expect(card).toBeInstanceOf(ReviewCard);
    });
  });
});
