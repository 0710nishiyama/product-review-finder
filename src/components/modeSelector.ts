/**
 * ModeSelector Component
 * Renders a toggle for non-AI and AI mode selection using Bootstrap 5.x btn-group.
 * Defaults to non-AI mode and emits mode change events via a callback.
 *
 * Requirements: 2.1
 */

import { SearchMode } from '../models/types.js';

/** Props for the ModeSelector component */
export interface ModeSelectorProps {
  selectedMode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
}

/**
 * ModeSelector component class.
 * Manages rendering and interaction of the search mode toggle.
 */
export class ModeSelector {
  private container: HTMLElement;
  private selectedMode: SearchMode;
  private onModeChange: (mode: SearchMode) => void;

  constructor(container: HTMLElement, props?: Partial<ModeSelectorProps>) {
    this.container = container;
    this.selectedMode = props?.selectedMode ?? 'non-AI';
    this.onModeChange = props?.onModeChange ?? (() => {});
    this.render();
    this.bindEvents();
  }

  /**
   * Get the currently selected search mode.
   */
  getSelectedMode(): SearchMode {
    return this.selectedMode;
  }

  /**
   * Set the selected mode and update the UI.
   */
  setSelectedMode(mode: SearchMode): void {
    if (mode !== this.selectedMode) {
      this.selectedMode = mode;
      this.updateActiveState();
    }
  }

  /**
   * Update the onModeChange callback.
   */
  setOnModeChange(callback: (mode: SearchMode) => void): void {
    this.onModeChange = callback;
  }

  /**
   * Render the mode selector HTML into the container.
   */
  render(): void {
    const nonAIActive = this.selectedMode === 'non-AI' ? ' active' : '';
    const nonAIChecked = this.selectedMode === 'non-AI' ? ' checked' : '';
    const aiActive = this.selectedMode === 'AI' ? ' active' : '';
    const aiChecked = this.selectedMode === 'AI' ? ' checked' : '';

    this.container.innerHTML = `
      <div class="mb-3" role="group" aria-label="検索モード選択">
        <label class="form-label fw-semibold">検索モード</label>
        <div class="btn-group w-100" role="group" aria-label="検索モード切替">
          <input type="radio" class="btn-check" name="searchMode" id="modeNonAI" value="non-AI" autocomplete="off"${nonAIChecked}>
          <label class="btn btn-outline-primary${nonAIActive}" for="modeNonAI" data-mode="non-AI">非AIモード</label>

          <input type="radio" class="btn-check" name="searchMode" id="modeAI" value="AI" autocomplete="off"${aiChecked}>
          <label class="btn btn-outline-primary${aiActive}" for="modeAI" data-mode="AI">AIモード</label>
        </div>
      </div>
    `;
  }

  /**
   * Update the active state of the toggle buttons without full re-render.
   */
  private updateActiveState(): void {
    const nonAIInput = this.container.querySelector('#modeNonAI') as HTMLInputElement | null;
    const aiInput = this.container.querySelector('#modeAI') as HTMLInputElement | null;
    const nonAILabel = this.container.querySelector('[data-mode="non-AI"]') as HTMLElement | null;
    const aiLabel = this.container.querySelector('[data-mode="AI"]') as HTMLElement | null;

    if (nonAIInput && aiInput && nonAILabel && aiLabel) {
      if (this.selectedMode === 'non-AI') {
        nonAIInput.checked = true;
        aiInput.checked = false;
        nonAILabel.classList.add('active');
        aiLabel.classList.remove('active');
      } else {
        nonAIInput.checked = false;
        aiInput.checked = true;
        nonAILabel.classList.remove('active');
        aiLabel.classList.add('active');
      }
    }
  }

  /**
   * Bind change events to the radio inputs using event delegation.
   */
  private bindEvents(): void {
    this.container.addEventListener('change', (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.name === 'searchMode') {
        const newMode = target.value as SearchMode;
        if (newMode !== this.selectedMode) {
          this.selectedMode = newMode;
          this.updateActiveState();
          this.onModeChange(newMode);
        }
      }
    });
  }

  /**
   * Destroy the component and clean up.
   */
  destroy(): void {
    this.container.innerHTML = '';
  }
}

/**
 * Factory function to create and mount a ModeSelector component.
 * Defaults to non-AI mode.
 */
export function createModeSelector(
  container: HTMLElement,
  props?: Partial<ModeSelectorProps>
): ModeSelector {
  return new ModeSelector(container, props);
}
