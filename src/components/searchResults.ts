/**
 * SearchResults Container Component
 * Conditionally renders AISummaryCard (AI mode only), ReviewList with ReviewCards
 * in a responsive Bootstrap grid, "no results" message, and total_hits count.
 *
 * Responsive grid layout:
 * - < 768px: 1 column (col-12)
 * - 768px - 992px: 2 columns (col-md-6)
 * - >= 992px: 3 columns (col-lg-4)
 *
 * Requirements: 4.1, 4.2, 4.6, 5.1, 5.5, 9.3
 */

import { SearchResult, ReviewItem, AISummary } from '../models/types.js';

/**
 * Props for the SearchResults component.
 */
export interface SearchResultsProps {
  result: SearchResult | null;
  onFavoriteToggle?: (review: ReviewItem) => void;
  isFavorited?: (reviewId: string) => boolean;
  onPageChange?: (page: number) => void;
}

/**
 * SearchResults container component.
 * Manages rendering of search results including AI summary, review cards, and pagination.
 */
export class SearchResults {
  private container: HTMLElement;
  private props: SearchResultsProps;

  constructor(container: HTMLElement, props: SearchResultsProps = { result: null }) {
    this.container = container;
    this.props = props;
    this.render();
  }

  /**
   * Update the component with new search results.
   */
  update(props: Partial<SearchResultsProps>): void {
    this.props = { ...this.props, ...props };
    this.render();
  }

  /**
   * Get the current search result.
   */
  getResult(): SearchResult | null {
    return this.props.result;
  }

  /**
   * Render the search results container.
   */
  render(): void {
    const { result } = this.props;

    if (!result) {
      this.container.innerHTML = '';
      return;
    }

    const sections: string[] = [];

    // Total hits count (Requirement 4.2)
    sections.push(this.renderTotalHits(result.total_hits));

    // AI Summary Card - only in AI mode (Requirements 5.1, 5.5)
    if (result.search_mode === 'AI' && result.ai_summary) {
      sections.push(this.renderAISummaryCard(result.ai_summary));
    }

    // Reviews section
    if (result.reviews.length === 0) {
      // No results message (Requirement 4.6)
      sections.push(this.renderNoResults());
    } else {
      // Review list in responsive grid (Requirement 9.3)
      sections.push(this.renderReviewList(result.reviews));
    }

    this.container.innerHTML = sections.join('');
    this.bindEvents();
  }

  /**
   * Render the total hits count display.
   * Requirement 4.2: Display total_hits count.
   */
  private renderTotalHits(totalHits: number): string {
    return `<div class="search-results-header mb-3">
      <p class="text-muted" data-testid="total-hits">
        検索結果: <strong>${totalHits}</strong> 件
      </p>
    </div>`;
  }

  /**
   * Render the AI Summary Card.
   * Requirements 5.1, 5.5: Show AI summary above review list in AI mode only.
   */
  private renderAISummaryCard(summary: AISummary): string {
    const ratingDisplay = summary.average_rating !== null
      ? `<div class="col-auto">
          <span class="badge bg-primary fs-6">平均評価: ${summary.average_rating.toFixed(1)}</span>
        </div>`
      : '';

    const credibilityDisplay = summary.credibility_score !== null
      ? `<div class="col-auto">
          <span class="badge bg-info fs-6">信憑性: ${summary.credibility_score}%</span>
        </div>`
      : '';

    return `<div class="card mb-4 border-primary" data-testid="ai-summary-card">
      <div class="card-header bg-primary text-white">
        <h5 class="card-title mb-0">AIサマリ</h5>
      </div>
      <div class="card-body">
        <div class="row g-2 mb-3">
          ${ratingDisplay}
          ${credibilityDisplay}
        </div>
        <p class="card-text" data-testid="ai-summary-text">${this.escapeHtml(summary.summary_text)}</p>
      </div>
    </div>`;
  }

  /**
   * Render the "no results" message.
   * Requirement 4.6: Show message when reviews is empty.
   */
  private renderNoResults(): string {
    return `<div class="alert alert-info text-center" role="alert" data-testid="no-results">
      <p class="mb-0">該当するレビューが見つかりませんでした。</p>
    </div>`;
  }

  /**
   * Render the review list in a responsive Bootstrap grid.
   * Requirement 9.3: col-12 for mobile, col-md-6 for tablet, col-lg-4 for desktop.
   */
  private renderReviewList(reviews: ReviewItem[]): string {
    const reviewCards = reviews.map((review) => this.renderReviewCard(review)).join('');

    return `<div class="row g-3" data-testid="review-list">
      ${reviewCards}
    </div>`;
  }

  /**
   * Render a single review card.
   * Requirement 4.1: Display title, rating, summary, source URL (opens in new tab).
   */
  private renderReviewCard(review: ReviewItem): string {
    const isFavorited = this.props.isFavorited ? this.props.isFavorited(review.id) : false;
    const favoriteIcon = isFavorited ? '★' : '☆';
    const favoriteClass = isFavorited ? 'btn-warning' : 'btn-outline-warning';

    return `<div class="col-12 col-md-6 col-lg-4">
      <div class="card h-100" data-testid="review-card" data-review-id="${review.id}">
        <div class="card-body">
          <h6 class="card-title" data-testid="review-title">${this.escapeHtml(review.title)}</h6>
          <div class="mb-2">
            <span class="badge bg-success" data-testid="review-rating">評価: ${review.rating.toFixed(1)}</span>
          </div>
          <p class="card-text small" data-testid="review-summary">${this.escapeHtml(review.summary)}</p>
        </div>
        <div class="card-footer d-flex justify-content-between align-items-center">
          <a href="${this.escapeHtml(review.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-primary" data-testid="review-url">
            出典を見る
          </a>
          <button class="btn btn-sm ${favoriteClass}" data-testid="favorite-toggle" data-review-id="${review.id}" aria-label="お気に入り切替">
            ${favoriteIcon}
          </button>
        </div>
      </div>
    </div>`;
  }

  /**
   * Bind event listeners for interactive elements.
   */
  private bindEvents(): void {
    // Favorite toggle buttons
    const favoriteButtons = this.container.querySelectorAll('[data-testid="favorite-toggle"]');
    favoriteButtons.forEach((button) => {
      button.addEventListener('click', (e: Event) => {
        const target = e.currentTarget as HTMLElement;
        const reviewId = target.getAttribute('data-review-id');
        if (reviewId && this.props.onFavoriteToggle && this.props.result) {
          const review = this.props.result.reviews.find((r) => r.id === reviewId);
          if (review) {
            this.props.onFavoriteToggle(review);
          }
        }
      });
    });
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
   * Destroy the component and clean up.
   */
  destroy(): void {
    this.container.innerHTML = '';
  }
}

/**
 * Factory function to create and mount a SearchResults component.
 */
export function createSearchResults(container: HTMLElement, props?: SearchResultsProps): SearchResults {
  return new SearchResults(container, props);
}
