/**
 * ReviewCard Component
 * Displays an individual review item as a Bootstrap 5.x card with:
 * - Title
 * - Rating (1.0-5.0)
 * - Summary text
 * - Source URL (opens in new tab with target="_blank")
 * - Favorite toggle button
 *
 * Requirements: 4.1, 10.4
 */

import { ReviewItem } from '../models/types.js';

/**
 * Props for the ReviewCard component.
 */
export interface ReviewCardProps {
  /** The review item to display. */
  review: ReviewItem;
  /** Callback when the favorite toggle button is clicked. */
  onFavoriteToggle: (review: ReviewItem) => void;
  /** Whether this review is currently favorited. */
  isFavorited: boolean;
}

/**
 * ReviewCard component class.
 * Renders a single review as a Bootstrap card with title, rating, summary,
 * source URL link, and a favorite toggle button.
 */
export class ReviewCard {
  private container: HTMLElement;
  private props: ReviewCardProps;

  constructor(container: HTMLElement, props: ReviewCardProps) {
    this.container = container;
    this.props = props;
    this.render();
  }

  /**
   * Update the component with new props.
   */
  update(props: Partial<ReviewCardProps>): void {
    this.props = { ...this.props, ...props };
    this.render();
  }

  /**
   * Get the current props.
   */
  getProps(): ReviewCardProps {
    return { ...this.props };
  }

  /**
   * Render the review card.
   */
  render(): void {
    const { review, isFavorited } = this.props;
    const favoriteIcon = isFavorited ? '★' : '☆';
    const favoriteClass = isFavorited ? 'btn-warning' : 'btn-outline-warning';
    const favoriteAriaLabel = isFavorited ? 'お気に入りから削除' : 'お気に入りに追加';

    this.container.innerHTML = `<div class="card h-100" data-testid="review-card" data-review-id="${this.escapeAttr(review.id)}">
      <div class="card-body">
        <h5 class="card-title" data-testid="review-title">${this.escapeHtml(review.title)}</h5>
        <div class="mb-2">
          <span class="badge bg-success" data-testid="review-rating">評価: ${review.rating.toFixed(1)}</span>
        </div>
        <p class="card-text" data-testid="review-summary">${this.escapeHtml(review.summary)}</p>
      </div>
      <div class="card-footer d-flex justify-content-between align-items-center">
        <a href="${this.escapeAttr(review.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-primary" data-testid="review-url">
          出典を見る
        </a>
        <button class="btn btn-sm ${favoriteClass}" data-testid="favorite-toggle" data-review-id="${this.escapeAttr(review.id)}" aria-label="${favoriteAriaLabel}">
          ${favoriteIcon}
        </button>
      </div>
    </div>`;

    this.bindEvents();
  }

  /**
   * Bind event listeners for the favorite toggle button.
   */
  private bindEvents(): void {
    const favoriteButton = this.container.querySelector('[data-testid="favorite-toggle"]');
    if (favoriteButton) {
      favoriteButton.addEventListener('click', () => {
        this.props.onFavoriteToggle(this.props.review);
      });
    }
  }

  /**
   * Escape HTML special characters to prevent XSS.
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Escape attribute values to prevent XSS in HTML attributes.
   */
  private escapeAttr(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Destroy the component and clean up.
   */
  destroy(): void {
    this.container.innerHTML = '';
  }
}

/**
 * Factory function to create and mount a ReviewCard component.
 */
export function createReviewCard(container: HTMLElement, props: ReviewCardProps): ReviewCard {
  return new ReviewCard(container, props);
}
