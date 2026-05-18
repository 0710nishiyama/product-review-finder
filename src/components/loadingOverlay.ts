/**
 * LoadingOverlay Component
 * Shows an indeterminate progress bar with animation overlaying the search area
 * during loading. Auto-hides on search completion, error, or timeout.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

/** Timeout duration in milliseconds (60 seconds) */
const TIMEOUT_MS = 60_000;

/** Loading state */
export type LoadingState = 'idle' | 'loading' | 'complete' | 'error' | 'timeout';

/** Event handler for loading state changes */
export type LoadingStateChangeHandler = (state: LoadingState, message?: string) => void;

/**
 * LoadingOverlay component class.
 * Manages the display of a loading overlay with an indeterminate progress bar
 * over the search area during search operations.
 */
export class LoadingOverlay {
  private container: HTMLElement;
  private state: LoadingState = 'idle';
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private listeners: LoadingStateChangeHandler[] = [];
  private searchButton: HTMLButtonElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  /**
   * Get the current loading state.
   */
  getState(): LoadingState {
    return this.state;
  }

  /**
   * Register a listener for loading state changes.
   */
  onStateChange(handler: LoadingStateChangeHandler): void {
    this.listeners.push(handler);
  }

  /**
   * Remove a state change listener.
   */
  offStateChange(handler: LoadingStateChangeHandler): void {
    this.listeners = this.listeners.filter((l) => l !== handler);
  }

  /**
   * Set the search button element to disable/enable during loading.
   * Requirement 7.1: Disable search button to prevent duplicate operations.
   */
  setSearchButton(button: HTMLButtonElement): void {
    this.searchButton = button;
  }

  /**
   * Show the loading overlay and start the timeout timer.
   * Requirement 7.1: Show loading screen and disable search button.
   * Requirement 7.2: Show indeterminate progress bar with animation.
   */
  show(): void {
    this.setState('loading');
    this.disableSearchButton();
    this.startTimeout();
    this.render();
  }

  /**
   * Hide the loading overlay on successful search completion.
   * Requirement 7.3: Hide loading and show results on normal completion.
   */
  hideOnComplete(): void {
    this.clearTimeout();
    this.setState('complete');
    this.enableSearchButton();
    this.render();
  }

  /**
   * Hide the loading overlay on error.
   * Requirement 7.4: Hide loading and show error message on error.
   */
  hideOnError(message?: string): void {
    this.clearTimeout();
    this.setState('error', message || '検索中にエラーが発生しました');
    this.enableSearchButton();
    this.render();
  }

  /**
   * Hide the loading overlay on timeout.
   * Requirement 7.5: Hide loading and show timeout message after 60 seconds.
   */
  hideOnTimeout(): void {
    this.clearTimeout();
    this.setState('timeout', '検索がタイムアウトしました。再度お試しください。');
    this.enableSearchButton();
    this.render();
  }

  /**
   * Reset the overlay to idle state (hidden, no messages).
   */
  reset(): void {
    this.clearTimeout();
    this.setState('idle');
    this.enableSearchButton();
    this.render();
  }

  /**
   * Check if the overlay is currently visible (loading state).
   */
  isVisible(): boolean {
    return this.state === 'loading';
  }

  /**
   * Render the loading overlay HTML into the container.
   */
  render(): void {
    if (this.state === 'idle' || this.state === 'complete') {
      this.container.innerHTML = '';
      return;
    }

    if (this.state === 'loading') {
      this.container.innerHTML = `
        <div class="loading-overlay" role="alert" aria-live="assertive" aria-busy="true">
          <div class="loading-overlay__backdrop"></div>
          <div class="loading-overlay__content">
            <div class="progress" role="progressbar" aria-label="検索中" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100">
              <div class="progress-bar progress-bar-striped progress-bar-animated w-100"></div>
            </div>
            <p class="loading-overlay__message mt-2 text-center text-muted">検索中...</p>
          </div>
        </div>
      `;
      return;
    }

    if (this.state === 'error') {
      this.container.innerHTML = `
        <div class="alert alert-danger mt-3" role="alert">
          ${this.getLastMessage() || '検索中にエラーが発生しました'}
        </div>
      `;
      return;
    }

    if (this.state === 'timeout') {
      this.container.innerHTML = `
        <div class="alert alert-warning mt-3" role="alert">
          ${this.getLastMessage() || '検索がタイムアウトしました。再度お試しください。'}
        </div>
      `;
      return;
    }
  }

  /**
   * Destroy the component and clean up resources.
   */
  destroy(): void {
    this.clearTimeout();
    this.listeners = [];
    this.searchButton = null;
    this.container.innerHTML = '';
  }

  // --- Private methods ---

  private lastMessage: string | undefined;

  private getLastMessage(): string | undefined {
    return this.lastMessage;
  }

  private setState(state: LoadingState, message?: string): void {
    this.state = state;
    this.lastMessage = message;
    this.notifyListeners(state, message);
  }

  private notifyListeners(state: LoadingState, message?: string): void {
    for (const listener of this.listeners) {
      listener(state, message);
    }
  }

  /**
   * Start the 60-second timeout timer.
   * Requirement 7.5: If search doesn't complete within 60 seconds, hide loading and show timeout.
   */
  private startTimeout(): void {
    this.clearTimeout();
    this.timeoutId = setTimeout(() => {
      if (this.state === 'loading') {
        this.hideOnTimeout();
      }
    }, TIMEOUT_MS);
  }

  private clearTimeout(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Disable the search button to prevent duplicate operations.
   * Requirement 7.1: Disable search button during loading.
   */
  private disableSearchButton(): void {
    if (this.searchButton) {
      this.searchButton.disabled = true;
    }
  }

  /**
   * Re-enable the search button after loading completes.
   */
  private enableSearchButton(): void {
    if (this.searchButton) {
      this.searchButton.disabled = false;
    }
  }
}

/**
 * Factory function to create and mount a LoadingOverlay component.
 */
export function createLoadingOverlay(container: HTMLElement): LoadingOverlay {
  return new LoadingOverlay(container);
}

export { TIMEOUT_MS };
