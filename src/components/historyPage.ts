/**
 * HistoryPage Component
 * Displays search history list (max 50 entries, newest first).
 * Shows product name, search mode, total hits, and timestamp for each entry.
 * Handles click to re-execute search with saved conditions.
 *
 * Requirements: 10.1, 10.2, 10.3
 */

import type { HistoryEntry, SearchMode } from '../models/types.js';
import { HistoryManager } from '../services/historyManager.js';
import { router } from '../router.js';

/** Callback for re-executing a search from history */
export type ReSearchHandler = (entry: HistoryEntry) => void;

/** Props for HistoryPage component */
export interface HistoryPageProps {
  onReSearch?: ReSearchHandler;
}

/**
 * HistoryPage component class.
 * Manages rendering and interaction of the search history list.
 */
export class HistoryPage {
  private container: HTMLElement;
  private historyManager: HistoryManager;
  private props: HistoryPageProps;
  private entries: HistoryEntry[] = [];

  constructor(container: HTMLElement, props: HistoryPageProps = {}) {
    this.container = container;
    this.historyManager = new HistoryManager();
    this.props = props;
    this.loadEntries();
    this.render();
    this.bindEvents();
  }

  /**
   * Load history entries from the HistoryManager (max 50, newest first).
   */
  private loadEntries(): void {
    this.entries = this.historyManager.getEntries(50);
  }

  /**
   * Refresh the history list by reloading entries and re-rendering.
   */
  refresh(): void {
    this.loadEntries();
    this.render();
    this.bindEvents();
  }

  /**
   * Get the currently displayed entries.
   */
  getEntries(): HistoryEntry[] {
    return [...this.entries];
  }

  /**
   * Render the history page HTML.
   */
  render(): void {
    if (this.entries.length === 0) {
      this.container.innerHTML = `
        <div class="history-page">
          <h2 class="mb-4">検索履歴</h2>
          <div class="alert alert-info text-center" role="alert" data-testid="no-history">
            <p class="mb-0">検索履歴がありません。</p>
          </div>
        </div>
      `;
      return;
    }

    const listItems = this.entries.map((entry) => this.renderHistoryItem(entry)).join('');

    this.container.innerHTML = `
      <div class="history-page">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2 class="mb-0">検索履歴</h2>
          <button class="btn btn-outline-danger btn-sm" data-testid="clear-history-btn" aria-label="履歴をすべて削除">
            すべて削除
          </button>
        </div>
        <div class="list-group" data-testid="history-list">
          ${listItems}
        </div>
      </div>
    `;
  }

  /**
   * Render a single history item.
   */
  private renderHistoryItem(entry: HistoryEntry): string {
    const formattedDate = this.formatTimestamp(entry.timestamp);
    const modeBadgeClass = entry.searchMode === 'AI' ? 'bg-primary' : 'bg-secondary';
    const modeLabel = entry.searchMode === 'AI' ? 'AI' : '非AI';

    return `
      <a href="#" class="list-group-item list-group-item-action" data-testid="history-item" data-history-id="${entry.id}">
        <div class="d-flex w-100 justify-content-between align-items-start">
          <div>
            <h6 class="mb-1" data-testid="history-product-name">${this.escapeHtml(entry.productData.productName)}</h6>
            <div class="d-flex align-items-center gap-2">
              <span class="badge ${modeBadgeClass}" data-testid="history-search-mode">${modeLabel}</span>
              <small class="text-muted" data-testid="history-total-hits">ヒット数: ${entry.totalHits}件</small>
            </div>
          </div>
          <small class="text-muted" data-testid="history-timestamp">${formattedDate}</small>
        </div>
      </a>
    `;
  }

  /**
   * Format an ISO 8601 timestamp to a user-friendly display format.
   */
  private formatTimestamp(isoString: string): string {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) {
        return isoString;
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}/${month}/${day} ${hours}:${minutes}`;
    } catch {
      return isoString;
    }
  }

  /**
   * Bind click events for history items and clear button.
   */
  private bindEvents(): void {
    // History item clicks - re-execute search
    const historyItems = this.container.querySelectorAll('[data-testid="history-item"]');
    historyItems.forEach((item) => {
      item.addEventListener('click', (e: Event) => {
        e.preventDefault();
        const target = e.currentTarget as HTMLElement;
        const historyId = target.getAttribute('data-history-id');
        if (historyId) {
          this.handleReSearch(historyId);
        }
      });
    });

    // Clear all button
    const clearBtn = this.container.querySelector('[data-testid="clear-history-btn"]');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.handleClearAll();
      });
    }
  }

  /**
   * Handle re-executing a search from a history entry.
   * Requirement 10.3: Re-execute search with saved conditions.
   */
  private handleReSearch(historyId: string): void {
    const entry = this.entries.find((e) => e.id === historyId);
    if (!entry) {
      return;
    }

    if (this.props.onReSearch) {
      this.props.onReSearch(entry);
    }

    // Navigate to search page
    router.navigateTo('search');
  }

  /**
   * Handle clearing all history entries.
   */
  private handleClearAll(): void {
    this.historyManager.clearAll();
    this.refresh();
  }

  /**
   * Escape HTML special characters to prevent XSS.
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char] || char);
  }

  /**
   * Destroy the component and clean up.
   */
  destroy(): void {
    this.container.innerHTML = '';
    this.entries = [];
  }
}

/**
 * Factory function to create and mount a HistoryPage component.
 */
export function createHistoryPage(container: HTMLElement, props?: HistoryPageProps): HistoryPage {
  return new HistoryPage(container, props);
}
