/**
 * AISummaryCard Component
 * Displays the AI-generated review summary including average rating,
 * credibility score, and summary text. Only visible in AI mode.
 *
 * - Displays average_rating (0.0-5.0, 1 decimal place)
 * - Displays credibility_score (0-100% integer)
 * - Displays summary_text (max 500 chars)
 * - Hides scores when reviews are 0 (values are null)
 * - Shows error message when summary generation fails
 * - Only rendered when search_mode === 'AI'
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */

import { AISummary, SearchMode } from '../models/types.js';

/**
 * Props for the AISummaryCard component.
 */
export interface AISummaryCardProps {
  /** The AI summary data. Null when summary generation failed or not available. */
  summary: AISummary | null;
  /** The current search mode. Card is only visible in 'AI' mode. */
  searchMode: SearchMode;
  /** Whether summary generation failed (shows error message). */
  error?: boolean;
  /** Custom error message to display when generation fails. */
  errorMessage?: string;
}

/**
 * AISummaryCard component class.
 * Renders an AI-generated summary card with rating, credibility, and text.
 * Uses Bootstrap 5.x card component for consistent styling.
 */
export class AISummaryCard {
  private container: HTMLElement;
  private props: AISummaryCardProps;

  constructor(container: HTMLElement, props: AISummaryCardProps) {
    this.container = container;
    this.props = props;
    this.render();
  }

  /**
   * Update the component with new props.
   */
  update(props: Partial<AISummaryCardProps>): void {
    this.props = { ...this.props, ...props };
    this.render();
  }

  /**
   * Get the current props.
   */
  getProps(): AISummaryCardProps {
    return { ...this.props };
  }

  /**
   * Check if the card should be visible based on search mode.
   * Requirement 5.5: Only visible in AI mode.
   */
  isVisible(): boolean {
    return this.props.searchMode === 'AI';
  }

  /**
   * Render the AI summary card.
   */
  render(): void {
    // Requirement 5.5: Not visible in non-AI mode
    if (!this.isVisible()) {
      this.container.innerHTML = '';
      return;
    }

    // Requirement 5.6: Show error message when summary generation fails
    if (this.props.error || (!this.props.summary && this.props.searchMode === 'AI')) {
      this.container.innerHTML = this.renderError();
      return;
    }

    const summary = this.props.summary!;
    this.container.innerHTML = this.renderCard(summary);
  }

  /**
   * Render the error state card.
   * Requirement 5.6: Show error message in the card when summary generation fails.
   */
  private renderError(): string {
    const errorMsg = this.props.errorMessage || 'AIサマリの生成に失敗しました。レビュー一覧は通常通り表示されます。';

    return `<div class="card mb-4 border-danger" data-testid="ai-summary-card" data-state="error">
      <div class="card-header bg-primary text-white">
        <h5 class="card-title mb-0">AIサマリ</h5>
      </div>
      <div class="card-body">
        <div class="alert alert-warning mb-0" role="alert" data-testid="ai-summary-error">
          ${this.escapeHtml(errorMsg)}
        </div>
      </div>
    </div>`;
  }

  /**
   * Render the full AI summary card with scores and text.
   * Requirements 5.1, 5.2, 5.3, 5.4, 5.7
   */
  private renderCard(summary: AISummary): string {
    const scoresSection = this.renderScores(summary);
    const summaryTextSection = this.renderSummaryText(summary.summary_text);

    return `<div class="card mb-4 border-primary" data-testid="ai-summary-card" data-state="success">
      <div class="card-header bg-primary text-white">
        <h5 class="card-title mb-0">AIサマリ</h5>
      </div>
      <div class="card-body">
        ${scoresSection}
        ${summaryTextSection}
      </div>
    </div>`;
  }

  /**
   * Render the scores section (average rating and credibility score).
   * Requirement 5.7: Hide scores when reviews are 0 (values are null).
   * Requirement 5.2: average_rating in 0.0-5.0 range, 1 decimal place.
   * Requirement 5.3: credibility_score in 0-100 integer percentage.
   */
  private renderScores(summary: AISummary): string {
    // Requirement 5.7: When reviews are 0, scores are null - don't display them
    if (summary.average_rating === null && summary.credibility_score === null) {
      return '';
    }

    const parts: string[] = [];

    if (summary.average_rating !== null) {
      parts.push(
        `<div class="col-auto">
          <span class="badge bg-primary fs-6" data-testid="ai-average-rating">平均評価: ${summary.average_rating.toFixed(1)}</span>
        </div>`
      );
    }

    if (summary.credibility_score !== null) {
      parts.push(
        `<div class="col-auto">
          <span class="badge bg-info fs-6" data-testid="ai-credibility-score">信憑性: ${summary.credibility_score}%</span>
        </div>`
      );
    }

    return `<div class="row g-2 mb-3" data-testid="ai-summary-scores">
      ${parts.join('')}
    </div>`;
  }

  /**
   * Render the summary text section.
   * Requirement 5.4: Summary text max 500 characters.
   */
  private renderSummaryText(text: string): string {
    return `<p class="card-text" data-testid="ai-summary-text">${this.escapeHtml(text)}</p>`;
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
 * Factory function to create and mount an AISummaryCard component.
 */
export function createAISummaryCard(container: HTMLElement, props: AISummaryCardProps): AISummaryCard {
  return new AISummaryCard(container, props);
}
