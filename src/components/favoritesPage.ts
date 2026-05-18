/**
 * FavoritesPage Component
 * Displays favorited reviews ordered by addedAt descending.
 * Shows review details with search context (product name, search mode).
 * Handles remove from favorites and shows limit reached message when at 200.
 *
 * Requirements: 10.4, 10.5, 10.6
 */

import type { FavoriteItem } from '../models/types.js';
import { FavoritesManager } from '../services/favoritesManager.js';

const MAX_FAVORITES = 200;

/**
 * FavoritesPage component class.
 * Renders the favorites list with search context and removal functionality.
 */
export class FavoritesPage {
  private container: HTMLElement;
  private favoritesManager: FavoritesManager;

  constructor(container: HTMLElement, favoritesManager?: FavoritesManager) {
    this.container = container;
    this.favoritesManager = favoritesManager ?? new FavoritesManager();
    this.render();
  }

  /**
   * Render the favorites page.
   */
  render(): void {
    const favorites = this.favoritesManager.getAll();
    const count = this.favoritesManager.getCount();
    const isAtLimit = count >= MAX_FAVORITES;

    this.container.innerHTML = `
      <div class="favorites-page" data-testid="favorites-page">
        <h2>お気に入り</h2>
        <p class="text-muted" data-testid="favorites-count">保存件数: ${count} / ${MAX_FAVORITES}</p>
        ${isAtLimit ? this.renderLimitMessage() : ''}
        ${favorites.length === 0 ? this.renderEmptyState() : this.renderFavoritesList(favorites)}
      </div>
    `;

    this.bindEvents();
  }

  /**
   * Render the limit reached warning message.
   */
  private renderLimitMessage(): string {
    return `
      <div class="alert alert-warning" role="alert" data-testid="limit-message">
        お気に入りの上限（${MAX_FAVORITES}件）に達しています。新しいレビューを追加するには、既存のお気に入りを削除してください。
      </div>
    `;
  }

  /**
   * Render the empty state when no favorites exist.
   */
  private renderEmptyState(): string {
    return `
      <div class="text-center py-5" data-testid="empty-state">
        <p class="text-muted fs-5">お気に入りに登録されたレビューはありません。</p>
        <p class="text-muted">検索結果からレビューをお気に入りに追加できます。</p>
      </div>
    `;
  }

  /**
   * Render the list of favorite items.
   */
  private renderFavoritesList(favorites: FavoriteItem[]): string {
    const items = favorites.map((fav) => this.renderFavoriteCard(fav)).join('');
    return `<div class="favorites-list" data-testid="favorites-list">${items}</div>`;
  }

  /**
   * Render a single favorite item card.
   */
  private renderFavoriteCard(favorite: FavoriteItem): string {
    const { review, searchContext, addedAt } = favorite;
    const formattedDate = this.formatDate(addedAt);
    const modeLabel = searchContext.searchMode === 'AI' ? 'AIモード' : '非AIモード';

    return `
      <div class="card mb-3" data-testid="favorite-card" data-favorite-id="${this.escapeAttr(favorite.id)}" data-review-id="${this.escapeAttr(review.id)}">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <h5 class="card-title" data-testid="favorite-title">${this.escapeHtml(review.title)}</h5>
            <button class="btn btn-sm btn-outline-danger" data-testid="remove-button" data-review-id="${this.escapeAttr(review.id)}" aria-label="お気に入りから削除">
              ✕
            </button>
          </div>
          <div class="mb-2">
            <span class="badge bg-success" data-testid="favorite-rating">評価: ${review.rating.toFixed(1)}</span>
          </div>
          <p class="card-text" data-testid="favorite-summary">${this.escapeHtml(review.summary)}</p>
          <div class="d-flex justify-content-between align-items-center mt-2">
            <div class="text-muted small" data-testid="search-context">
              <span data-testid="context-product">商品: ${this.escapeHtml(searchContext.productName || '不明')}</span>
              <span class="ms-2" data-testid="context-mode">${modeLabel}</span>
            </div>
            <div class="text-muted small" data-testid="favorite-date">
              追加日: ${formattedDate}
            </div>
          </div>
        </div>
        <div class="card-footer">
          <a href="${this.escapeAttr(review.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-primary" data-testid="favorite-url">
            出典を見る
          </a>
        </div>
      </div>
    `;
  }

  /**
   * Format an ISO 8601 date string for display.
   */
  private formatDate(isoString: string): string {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  }

  /**
   * Bind event listeners for remove buttons using event delegation.
   */
  private bindEvents(): void {
    this.container.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      const removeButton = target.closest('[data-testid="remove-button"]') as HTMLElement | null;
      if (removeButton) {
        const reviewId = removeButton.getAttribute('data-review-id');
        if (reviewId) {
          this.handleRemove(reviewId);
        }
      }
    });
  }

  /**
   * Handle removing a favorite item.
   */
  private handleRemove(reviewId: string): void {
    this.favoritesManager.remove(reviewId);
    this.render();
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
 * Factory function to create and mount a FavoritesPage component.
 */
export function createFavoritesPage(container: HTMLElement, favoritesManager?: FavoritesManager): FavoritesPage {
  return new FavoritesPage(container, favoritesManager);
}
