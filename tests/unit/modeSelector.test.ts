/**
 * Unit tests for ModeSelector component
 * Tests: rendering, default state, mode switching, event emission
 * Requirements: 2.1
 *
 * @jest-environment jsdom
 */

import { ModeSelector, createModeSelector } from '../../src/components/modeSelector';

describe('ModeSelector', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('Rendering', () => {
    it('should render a btn-group with two radio options', () => {
      new ModeSelector(container);
      const btnGroup = container.querySelector('.btn-group');
      expect(btnGroup).not.toBeNull();

      const radios = container.querySelectorAll('input[type="radio"]');
      expect(radios.length).toBe(2);
    });

    it('should render non-AI and AI mode labels', () => {
      new ModeSelector(container);
      const nonAILabel = container.querySelector('[data-mode="non-AI"]');
      const aiLabel = container.querySelector('[data-mode="AI"]');

      expect(nonAILabel).not.toBeNull();
      expect(nonAILabel?.textContent?.trim()).toBe('非AIモード');
      expect(aiLabel).not.toBeNull();
      expect(aiLabel?.textContent?.trim()).toBe('AIモード');
    });

    it('should have proper aria-label for accessibility', () => {
      new ModeSelector(container);
      const group = container.querySelector('[role="group"]');
      expect(group).not.toBeNull();
      expect(group?.getAttribute('aria-label')).toBe('検索モード選択');
    });

    it('should render a form label', () => {
      new ModeSelector(container);
      const label = container.querySelector('.form-label');
      expect(label).not.toBeNull();
      expect(label?.textContent?.trim()).toBe('検索モード');
    });
  });

  describe('Default state (Requirement 2.1)', () => {
    it('should default to non-AI mode when no props provided', () => {
      const selector = new ModeSelector(container);
      expect(selector.getSelectedMode()).toBe('non-AI');
    });

    it('should have non-AI radio checked by default', () => {
      new ModeSelector(container);
      const nonAIInput = container.querySelector('#modeNonAI') as HTMLInputElement;
      const aiInput = container.querySelector('#modeAI') as HTMLInputElement;

      expect(nonAIInput.checked).toBe(true);
      expect(aiInput.checked).toBe(false);
    });

    it('should have non-AI label with active class by default', () => {
      new ModeSelector(container);
      const nonAILabel = container.querySelector('[data-mode="non-AI"]');
      const aiLabel = container.querySelector('[data-mode="AI"]');

      expect(nonAILabel?.classList.contains('active')).toBe(true);
      expect(aiLabel?.classList.contains('active')).toBe(false);
    });
  });

  describe('Initial mode from props', () => {
    it('should accept AI mode as initial state', () => {
      const selector = new ModeSelector(container, { selectedMode: 'AI' });
      expect(selector.getSelectedMode()).toBe('AI');

      const aiInput = container.querySelector('#modeAI') as HTMLInputElement;
      expect(aiInput.checked).toBe(true);
    });

    it('should accept non-AI mode as initial state', () => {
      const selector = new ModeSelector(container, { selectedMode: 'non-AI' });
      expect(selector.getSelectedMode()).toBe('non-AI');

      const nonAIInput = container.querySelector('#modeNonAI') as HTMLInputElement;
      expect(nonAIInput.checked).toBe(true);
    });
  });

  describe('Mode change events', () => {
    it('should call onModeChange when switching to AI mode', () => {
      const onModeChange = jest.fn();
      new ModeSelector(container, { onModeChange });

      const aiInput = container.querySelector('#modeAI') as HTMLInputElement;
      aiInput.checked = true;
      aiInput.dispatchEvent(new Event('change', { bubbles: true }));

      expect(onModeChange).toHaveBeenCalledWith('AI');
      expect(onModeChange).toHaveBeenCalledTimes(1);
    });

    it('should call onModeChange when switching to non-AI mode', () => {
      const onModeChange = jest.fn();
      new ModeSelector(container, { selectedMode: 'AI', onModeChange });

      const nonAIInput = container.querySelector('#modeNonAI') as HTMLInputElement;
      nonAIInput.checked = true;
      nonAIInput.dispatchEvent(new Event('change', { bubbles: true }));

      expect(onModeChange).toHaveBeenCalledWith('non-AI');
      expect(onModeChange).toHaveBeenCalledTimes(1);
    });

    it('should not call onModeChange when selecting the already active mode', () => {
      const onModeChange = jest.fn();
      new ModeSelector(container, { selectedMode: 'non-AI', onModeChange });

      const nonAIInput = container.querySelector('#modeNonAI') as HTMLInputElement;
      nonAIInput.dispatchEvent(new Event('change', { bubbles: true }));

      expect(onModeChange).not.toHaveBeenCalled();
    });

    it('should update internal state when mode changes', () => {
      const selector = new ModeSelector(container);

      const aiInput = container.querySelector('#modeAI') as HTMLInputElement;
      aiInput.checked = true;
      aiInput.dispatchEvent(new Event('change', { bubbles: true }));

      expect(selector.getSelectedMode()).toBe('AI');
    });
  });

  describe('setSelectedMode', () => {
    it('should update the selected mode programmatically', () => {
      const selector = new ModeSelector(container);
      selector.setSelectedMode('AI');

      expect(selector.getSelectedMode()).toBe('AI');
      const aiInput = container.querySelector('#modeAI') as HTMLInputElement;
      expect(aiInput.checked).toBe(true);
    });

    it('should not trigger re-render if mode is the same', () => {
      const selector = new ModeSelector(container);
      const initialHtml = container.innerHTML;
      selector.setSelectedMode('non-AI');

      // HTML should remain unchanged since mode didn't change
      expect(container.innerHTML).toBe(initialHtml);
    });

    it('should update active class on labels', () => {
      const selector = new ModeSelector(container);
      selector.setSelectedMode('AI');

      const nonAILabel = container.querySelector('[data-mode="non-AI"]');
      const aiLabel = container.querySelector('[data-mode="AI"]');

      expect(nonAILabel?.classList.contains('active')).toBe(false);
      expect(aiLabel?.classList.contains('active')).toBe(true);
    });
  });

  describe('setOnModeChange', () => {
    it('should allow updating the callback', () => {
      const selector = new ModeSelector(container);
      const newCallback = jest.fn();
      selector.setOnModeChange(newCallback);

      const aiInput = container.querySelector('#modeAI') as HTMLInputElement;
      aiInput.checked = true;
      aiInput.dispatchEvent(new Event('change', { bubbles: true }));

      expect(newCallback).toHaveBeenCalledWith('AI');
    });
  });

  describe('Factory function', () => {
    it('should create a ModeSelector instance', () => {
      const selector = createModeSelector(container);
      expect(selector).toBeInstanceOf(ModeSelector);
    });

    it('should accept props in factory function', () => {
      const onModeChange = jest.fn();
      const selector = createModeSelector(container, {
        selectedMode: 'AI',
        onModeChange,
      });

      expect(selector.getSelectedMode()).toBe('AI');
    });
  });

  describe('destroy', () => {
    it('should clear the container content', () => {
      const selector = new ModeSelector(container);
      expect(container.innerHTML).not.toBe('');

      selector.destroy();
      expect(container.innerHTML).toBe('');
    });
  });
});
