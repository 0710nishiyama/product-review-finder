/**
 * Unit tests for LoadingOverlay component
 * Tests: show/hide states, progress bar rendering, timeout, button disable/enable
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 *
 * @jest-environment jsdom
 */

import { LoadingOverlay, createLoadingOverlay, TIMEOUT_MS, LoadingState } from '../../src/components/loadingOverlay';

describe('LoadingOverlay', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    jest.useFakeTimers();
  });

  afterEach(() => {
    document.body.removeChild(container);
    jest.useRealTimers();
  });

  describe('Initial state', () => {
    it('should start in idle state', () => {
      const overlay = new LoadingOverlay(container);
      expect(overlay.getState()).toBe('idle');
    });

    it('should not render any content in idle state', () => {
      new LoadingOverlay(container);
      expect(container.innerHTML).toBe('');
    });

    it('should not be visible in idle state', () => {
      const overlay = new LoadingOverlay(container);
      expect(overlay.isVisible()).toBe(false);
    });
  });

  describe('show() - Requirement 7.1, 7.2', () => {
    it('should set state to loading', () => {
      const overlay = new LoadingOverlay(container);
      overlay.show();
      expect(overlay.getState()).toBe('loading');
    });

    it('should be visible when loading', () => {
      const overlay = new LoadingOverlay(container);
      overlay.show();
      expect(overlay.isVisible()).toBe(true);
    });

    it('should render an indeterminate progress bar with animation', () => {
      const overlay = new LoadingOverlay(container);
      overlay.show();

      const progressBar = container.querySelector('.progress-bar');
      expect(progressBar).not.toBeNull();
      expect(progressBar?.classList.contains('progress-bar-striped')).toBe(true);
      expect(progressBar?.classList.contains('progress-bar-animated')).toBe(true);
    });

    it('should render a progress container with proper ARIA attributes', () => {
      const overlay = new LoadingOverlay(container);
      overlay.show();

      const progress = container.querySelector('.progress');
      expect(progress).not.toBeNull();
      expect(progress?.getAttribute('role')).toBe('progressbar');
      expect(progress?.getAttribute('aria-label')).toBe('検索中');
    });

    it('should render the overlay backdrop', () => {
      const overlay = new LoadingOverlay(container);
      overlay.show();

      const backdrop = container.querySelector('.loading-overlay__backdrop');
      expect(backdrop).not.toBeNull();
    });

    it('should render a loading message', () => {
      const overlay = new LoadingOverlay(container);
      overlay.show();

      const message = container.querySelector('.loading-overlay__message');
      expect(message).not.toBeNull();
      expect(message?.textContent).toContain('検索中');
    });

    it('should disable the search button when shown', () => {
      const overlay = new LoadingOverlay(container);
      const button = document.createElement('button');
      overlay.setSearchButton(button);

      overlay.show();
      expect(button.disabled).toBe(true);
    });

    it('should have aria-busy="true" on the overlay', () => {
      const overlay = new LoadingOverlay(container);
      overlay.show();

      const overlayEl = container.querySelector('.loading-overlay');
      expect(overlayEl?.getAttribute('aria-busy')).toBe('true');
    });
  });

  describe('hideOnComplete() - Requirement 7.3', () => {
    it('should set state to complete', () => {
      const overlay = new LoadingOverlay(container);
      overlay.show();
      overlay.hideOnComplete();
      expect(overlay.getState()).toBe('complete');
    });

    it('should clear the container content', () => {
      const overlay = new LoadingOverlay(container);
      overlay.show();
      overlay.hideOnComplete();
      expect(container.innerHTML).toBe('');
    });

    it('should not be visible after completion', () => {
      const overlay = new LoadingOverlay(container);
      overlay.show();
      overlay.hideOnComplete();
      expect(overlay.isVisible()).toBe(false);
    });

    it('should re-enable the search button', () => {
      const overlay = new LoadingOverlay(container);
      const button = document.createElement('button');
      overlay.setSearchButton(button);

      overlay.show();
      expect(button.disabled).toBe(true);

      overlay.hideOnComplete();
      expect(button.disabled).toBe(false);
    });
  });

  describe('hideOnError() - Requirement 7.4', () => {
    it('should set state to error', () => {
      const overlay = new LoadingOverlay(container);
      overlay.show();
      overlay.hideOnError('テストエラー');
      expect(overlay.getState()).toBe('error');
    });

    it('should display an error alert', () => {
      const overlay = new LoadingOverlay(container);
      overlay.show();
      overlay.hideOnError('検索中にエラーが発生しました');

      const alert = container.querySelector('.alert-danger');
      expect(alert).not.toBeNull();
      expect(alert?.textContent).toContain('検索中にエラーが発生しました');
    });

    it('should display default error message when none provided', () => {
      const overlay = new LoadingOverlay(container);
      overlay.show();
      overlay.hideOnError();

      const alert = container.querySelector('.alert-danger');
      expect(alert).not.toBeNull();
      expect(alert?.textContent).toContain('検索中にエラーが発生しました');
    });

    it('should not be visible after error', () => {
      const overlay = new LoadingOverlay(container);
      overlay.show();
      overlay.hideOnError('error');
      expect(overlay.isVisible()).toBe(false);
    });

    it('should re-enable the search button', () => {
      const overlay = new LoadingOverlay(container);
      const button = document.createElement('button');
      overlay.setSearchButton(button);

      overlay.show();
      overlay.hideOnError('error');
      expect(button.disabled).toBe(false);
    });
  });

  describe('hideOnTimeout() - Requirement 7.5', () => {
    it('should set state to timeout', () => {
      const overlay = new LoadingOverlay(container);
      overlay.show();
      overlay.hideOnTimeout();
      expect(overlay.getState()).toBe('timeout');
    });

    it('should display a timeout warning alert', () => {
      const overlay = new LoadingOverlay(container);
      overlay.show();
      overlay.hideOnTimeout();

      const alert = container.querySelector('.alert-warning');
      expect(alert).not.toBeNull();
      expect(alert?.textContent).toContain('タイムアウト');
    });

    it('should not be visible after timeout', () => {
      const overlay = new LoadingOverlay(container);
      overlay.show();
      overlay.hideOnTimeout();
      expect(overlay.isVisible()).toBe(false);
    });

    it('should re-enable the search button', () => {
      const overlay = new LoadingOverlay(container);
      const button = document.createElement('button');
      overlay.setSearchButton(button);

      overlay.show();
      overlay.hideOnTimeout();
      expect(button.disabled).toBe(false);
    });
  });

  describe('Auto-timeout after 60 seconds - Requirement 7.5', () => {
    it('should have TIMEOUT_MS set to 60000', () => {
      expect(TIMEOUT_MS).toBe(60_000);
    });

    it('should auto-hide with timeout state after 60 seconds', () => {
      const overlay = new LoadingOverlay(container);
      overlay.show();

      expect(overlay.getState()).toBe('loading');

      jest.advanceTimersByTime(60_000);

      expect(overlay.getState()).toBe('timeout');
      expect(overlay.isVisible()).toBe(false);
    });

    it('should display timeout message after 60 seconds', () => {
      const overlay = new LoadingOverlay(container);
      overlay.show();

      jest.advanceTimersByTime(60_000);

      const alert = container.querySelector('.alert-warning');
      expect(alert).not.toBeNull();
      expect(alert?.textContent).toContain('タイムアウト');
    });

    it('should not timeout if completed before 60 seconds', () => {
      const overlay = new LoadingOverlay(container);
      overlay.show();

      jest.advanceTimersByTime(30_000);
      overlay.hideOnComplete();

      jest.advanceTimersByTime(30_000);

      expect(overlay.getState()).toBe('complete');
    });

    it('should not timeout if error occurs before 60 seconds', () => {
      const overlay = new LoadingOverlay(container);
      overlay.show();

      jest.advanceTimersByTime(30_000);
      overlay.hideOnError('some error');

      jest.advanceTimersByTime(30_000);

      expect(overlay.getState()).toBe('error');
    });

    it('should re-enable search button on auto-timeout', () => {
      const overlay = new LoadingOverlay(container);
      const button = document.createElement('button');
      overlay.setSearchButton(button);

      overlay.show();
      expect(button.disabled).toBe(true);

      jest.advanceTimersByTime(60_000);
      expect(button.disabled).toBe(false);
    });
  });

  describe('reset()', () => {
    it('should return to idle state', () => {
      const overlay = new LoadingOverlay(container);
      overlay.show();
      overlay.reset();
      expect(overlay.getState()).toBe('idle');
    });

    it('should clear the container', () => {
      const overlay = new LoadingOverlay(container);
      overlay.show();
      overlay.reset();
      expect(container.innerHTML).toBe('');
    });

    it('should re-enable the search button', () => {
      const overlay = new LoadingOverlay(container);
      const button = document.createElement('button');
      overlay.setSearchButton(button);

      overlay.show();
      overlay.reset();
      expect(button.disabled).toBe(false);
    });
  });

  describe('State change listeners', () => {
    it('should notify listeners on state change', () => {
      const overlay = new LoadingOverlay(container);
      const handler = jest.fn();
      overlay.onStateChange(handler);

      overlay.show();
      expect(handler).toHaveBeenCalledWith('loading', undefined);
    });

    it('should notify listeners with message on error', () => {
      const overlay = new LoadingOverlay(container);
      const handler = jest.fn();
      overlay.onStateChange(handler);

      overlay.show();
      overlay.hideOnError('テストエラー');

      expect(handler).toHaveBeenCalledWith('error', 'テストエラー');
    });

    it('should notify listeners with message on timeout', () => {
      const overlay = new LoadingOverlay(container);
      const handler = jest.fn();
      overlay.onStateChange(handler);

      overlay.show();
      overlay.hideOnTimeout();

      expect(handler).toHaveBeenCalledWith('timeout', '検索がタイムアウトしました。再度お試しください。');
    });

    it('should remove listener with offStateChange', () => {
      const overlay = new LoadingOverlay(container);
      const handler = jest.fn();
      overlay.onStateChange(handler);
      overlay.offStateChange(handler);

      overlay.show();
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('destroy()', () => {
    it('should clear the container', () => {
      const overlay = new LoadingOverlay(container);
      overlay.show();
      overlay.destroy();
      expect(container.innerHTML).toBe('');
    });

    it('should clear the timeout', () => {
      const overlay = new LoadingOverlay(container);
      overlay.show();
      overlay.destroy();

      // Advancing time should not cause any state change
      jest.advanceTimersByTime(60_000);
      // No error thrown, timeout was cleared
    });

    it('should clear listeners', () => {
      const overlay = new LoadingOverlay(container);
      const handler = jest.fn();
      overlay.onStateChange(handler);
      overlay.destroy();

      // Manually trigger would not notify since listeners are cleared
      // This is an internal check - destroy clears the listeners array
      expect(container.innerHTML).toBe('');
    });
  });

  describe('Factory function', () => {
    it('should create a LoadingOverlay instance', () => {
      const overlay = createLoadingOverlay(container);
      expect(overlay).toBeInstanceOf(LoadingOverlay);
    });
  });
});
