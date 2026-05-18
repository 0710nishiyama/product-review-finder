/**
 * Unit tests for SettingsPage component
 * Tests: rendering, validation, save, feedback, masking
 * Requirements: 3.1, 3.2, 3.3, 3.7, 3.8
 *
 * @jest-environment jsdom
 */

import { SettingsPage, createSettingsPage } from '../../src/components/settingsPage';
import { SettingsManager } from '../../src/services/settingsManager';

// Mock the helpers module for maskApiKey
jest.mock('../../src/utils/helpers', () => ({
  maskApiKey: (key: string) => {
    if (key.length <= 4) return '*'.repeat(key.length);
    return '*'.repeat(key.length - 4) + key.slice(-4);
  },
  generateId: () => 'test-uuid',
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('SettingsPage', () => {
  let container: HTMLElement;
  let settingsManager: SettingsManager;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    localStorageMock.clear();
    jest.clearAllMocks();
    jest.useFakeTimers();
    settingsManager = new SettingsManager();
  });

  afterEach(() => {
    document.body.removeChild(container);
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render settings page with title', () => {
      new SettingsPage(container, settingsManager);
      const heading = container.querySelector('h2');
      expect(heading).not.toBeNull();
      expect(heading?.textContent).toContain('AI API設定');
    });

    it('should render forms for all 3 providers: OpenAI, Google, Claude', () => {
      new SettingsPage(container, settingsManager);

      expect(container.querySelector('#provider-card-openai')).not.toBeNull();
      expect(container.querySelector('#provider-card-google')).not.toBeNull();
      expect(container.querySelector('#provider-card-claude')).not.toBeNull();
    });

    it('should render api_key and model inputs for each provider', () => {
      new SettingsPage(container, settingsManager);

      const providers = ['openai', 'google', 'claude'];
      for (const provider of providers) {
        expect(container.querySelector(`#${provider}-api-key-input`)).not.toBeNull();
        expect(container.querySelector(`#${provider}-model-input`)).not.toBeNull();
      }
    });

    it('should render api_key inputs as password type (masked)', () => {
      new SettingsPage(container, settingsManager);

      const providers = ['openai', 'google', 'claude'];
      for (const provider of providers) {
        const input = container.querySelector(`#${provider}-api-key-input`) as HTMLInputElement;
        expect(input.type).toBe('password');
      }
    });

    it('should render active provider selector', () => {
      new SettingsPage(container, settingsManager);
      const select = container.querySelector('#active-provider-select') as HTMLSelectElement;
      expect(select).not.toBeNull();
      expect(select.options.length).toBe(3);
    });

    it('should render save button', () => {
      new SettingsPage(container, settingsManager);
      const btn = container.querySelector('#settings-save-btn');
      expect(btn).not.toBeNull();
      expect(btn?.textContent?.trim()).toBe('設定を保存');
    });

    it('should display masked API key in form text when key is set', () => {
      // Pre-set some settings
      const settings = {
        activeProvider: 'openai' as const,
        providers: {
          openai: { api_key: 'sk-test1234567890', model: 'gpt-4' },
          google: { api_key: '', model: '' },
          claude: { api_key: '', model: '' },
        },
      };
      settingsManager.saveSettings(settings);
      settingsManager = new SettingsManager();

      new SettingsPage(container, settingsManager);

      const maskedText = container.querySelector('#openai-api-key-masked');
      expect(maskedText?.textContent).toContain('***********7890');
    });

    it('should show "未設定" when API key is empty', () => {
      new SettingsPage(container, settingsManager);

      const maskedText = container.querySelector('#openai-api-key-masked');
      expect(maskedText?.textContent).toContain('未設定');
    });
  });

  describe('Validation on save (Requirements 3.1, 3.2, 3.3)', () => {
    it('should show error when api_key is empty for any provider', () => {
      new SettingsPage(container, settingsManager);

      // Leave all fields empty and submit
      const form = container.querySelector('#settings-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      const openaiError = container.querySelector('#openai-api-key-error');
      expect(openaiError?.textContent).toContain('APIキーを入力してください');
    });

    it('should show error when model is empty for any provider', () => {
      new SettingsPage(container, settingsManager);

      // Set api_key but leave model empty
      const apiKeyInput = container.querySelector('#openai-api-key-input') as HTMLInputElement;
      apiKeyInput.value = 'sk-test123';

      const form = container.querySelector('#settings-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      const modelError = container.querySelector('#openai-model-error');
      expect(modelError?.textContent).toContain('モデル名を入力してください');
    });

    it('should show error when api_key is whitespace-only', () => {
      new SettingsPage(container, settingsManager);

      const apiKeyInput = container.querySelector('#openai-api-key-input') as HTMLInputElement;
      apiKeyInput.value = '   ';

      const form = container.querySelector('#settings-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      const error = container.querySelector('#openai-api-key-error');
      expect(error?.textContent).toContain('APIキーを入力してください');
    });

    it('should add is-invalid class to invalid inputs', () => {
      new SettingsPage(container, settingsManager);

      const form = container.querySelector('#settings-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      const apiKeyInput = container.querySelector('#openai-api-key-input');
      expect(apiKeyInput?.classList.contains('is-invalid')).toBe(true);
    });

    it('should not save when validation fails', () => {
      new SettingsPage(container, settingsManager);

      const form = container.querySelector('#settings-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      // localStorage.setItem should not have been called for settings save
      // (only the initial getItem call should have happened)
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should clear field error when user types in the field', () => {
      new SettingsPage(container, settingsManager);

      // Trigger validation error
      const form = container.querySelector('#settings-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      const apiKeyInput = container.querySelector('#openai-api-key-input') as HTMLInputElement;
      expect(apiKeyInput.classList.contains('is-invalid')).toBe(true);

      // Type in the field
      apiKeyInput.dispatchEvent(new Event('input', { bubbles: true }));
      expect(apiKeyInput.classList.contains('is-invalid')).toBe(false);
    });
  });

  describe('Save functionality', () => {
    it('should save settings when all fields are valid', () => {
      new SettingsPage(container, settingsManager);

      // Fill in all fields
      const providers = ['openai', 'google', 'claude'];
      for (const provider of providers) {
        const apiKeyInput = container.querySelector(`#${provider}-api-key-input`) as HTMLInputElement;
        const modelInput = container.querySelector(`#${provider}-model-input`) as HTMLInputElement;
        apiKeyInput.value = `sk-${provider}-key123`;
        modelInput.value = `${provider}-model`;
      }

      const form = container.querySelector('#settings-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should save the active provider selection', () => {
      new SettingsPage(container, settingsManager);

      // Change active provider
      const select = container.querySelector('#active-provider-select') as HTMLSelectElement;
      select.value = 'claude';

      // Fill in all fields
      const providers = ['openai', 'google', 'claude'];
      for (const provider of providers) {
        const apiKeyInput = container.querySelector(`#${provider}-api-key-input`) as HTMLInputElement;
        const modelInput = container.querySelector(`#${provider}-model-input`) as HTMLInputElement;
        apiKeyInput.value = `sk-${provider}-key123`;
        modelInput.value = `${provider}-model`;
      }

      const form = container.querySelector('#settings-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData.activeProvider).toBe('claude');
    });
  });

  describe('Save confirmation feedback (Requirement 3.7)', () => {
    it('should show success feedback after successful save', () => {
      new SettingsPage(container, settingsManager);

      // Fill in all fields
      const providers = ['openai', 'google', 'claude'];
      for (const provider of providers) {
        const apiKeyInput = container.querySelector(`#${provider}-api-key-input`) as HTMLInputElement;
        const modelInput = container.querySelector(`#${provider}-model-input`) as HTMLInputElement;
        apiKeyInput.value = `sk-${provider}-key123`;
        modelInput.value = `${provider}-model`;
      }

      const form = container.querySelector('#settings-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      const feedback = container.querySelector('#settings-save-feedback');
      expect(feedback).not.toBeNull();
      expect(feedback?.textContent).toContain('設定を保存しました');
    });

    it('should hide feedback after 3 seconds', () => {
      new SettingsPage(container, settingsManager);

      // Fill in all fields and save
      const providers = ['openai', 'google', 'claude'];
      for (const provider of providers) {
        const apiKeyInput = container.querySelector(`#${provider}-api-key-input`) as HTMLInputElement;
        const modelInput = container.querySelector(`#${provider}-model-input`) as HTMLInputElement;
        apiKeyInput.value = `sk-${provider}-key123`;
        modelInput.value = `${provider}-model`;
      }

      const form = container.querySelector('#settings-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      expect(container.querySelector('#settings-save-feedback')).not.toBeNull();

      // Advance time by 3 seconds
      jest.advanceTimersByTime(3000);

      expect(container.querySelector('#settings-save-feedback')).toBeNull();
    });

    it('should not show feedback when validation fails', () => {
      new SettingsPage(container, settingsManager);

      const form = container.querySelector('#settings-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      const feedback = container.querySelector('#settings-save-feedback');
      expect(feedback).toBeNull();
    });
  });

  describe('Factory function', () => {
    it('should create a SettingsPage instance', () => {
      const page = createSettingsPage(container, settingsManager);
      expect(page).toBeInstanceOf(SettingsPage);
    });
  });

  describe('destroy', () => {
    it('should clear the container content', () => {
      const page = new SettingsPage(container, settingsManager);
      expect(container.innerHTML).not.toBe('');

      page.destroy();
      expect(container.innerHTML).toBe('');
    });

    it('should clear feedback timer on destroy', () => {
      const page = new SettingsPage(container, settingsManager);

      // Fill in all fields and save to start the timer
      const providers = ['openai', 'google', 'claude'];
      for (const provider of providers) {
        const apiKeyInput = container.querySelector(`#${provider}-api-key-input`) as HTMLInputElement;
        const modelInput = container.querySelector(`#${provider}-model-input`) as HTMLInputElement;
        apiKeyInput.value = `sk-${provider}-key123`;
        modelInput.value = `${provider}-model`;
      }

      const form = container.querySelector('#settings-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      page.destroy();

      // Advancing timers should not cause errors
      expect(() => jest.advanceTimersByTime(3000)).not.toThrow();
    });
  });

  describe('SettingsManager integration (Requirements 3.1-3.8)', () => {
    it('should load settings from SettingsManager on construction', () => {
      // Pre-save settings
      const settings = {
        activeProvider: 'claude' as const,
        providers: {
          openai: { api_key: 'sk-openai-key', model: 'gpt-4' },
          google: { api_key: 'google-key-123', model: 'gemini-pro' },
          claude: { api_key: 'sk-ant-key456', model: 'claude-3-opus' },
        },
      };
      settingsManager.saveSettings(settings);
      settingsManager = new SettingsManager();

      const page = new SettingsPage(container, settingsManager);

      // Verify active provider is loaded
      const select = container.querySelector('#active-provider-select') as HTMLSelectElement;
      expect(select.value).toBe('claude');

      // Verify model values are loaded
      const claudeModel = container.querySelector('#claude-model-input') as HTMLInputElement;
      expect(claudeModel.value).toBe('claude-3-opus');
    });

    it('should use SettingsManager.validateSettings() for validation', () => {
      const validateSpy = jest.spyOn(settingsManager, 'validateSettings');
      new SettingsPage(container, settingsManager);

      const form = container.querySelector('#settings-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      // validateSettings should be called for each provider
      expect(validateSpy).toHaveBeenCalledTimes(3);
    });

    it('should display validation errors from SettingsManager.validateSettings() inline', () => {
      new SettingsPage(container, settingsManager);

      // Set only openai fields, leave google and claude empty
      const openaiKey = container.querySelector('#openai-api-key-input') as HTMLInputElement;
      const openaiModel = container.querySelector('#openai-model-input') as HTMLInputElement;
      openaiKey.value = 'sk-valid-key';
      openaiModel.value = 'gpt-4';

      const form = container.querySelector('#settings-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      // Google and Claude should have errors
      const googleKeyError = container.querySelector('#google-api-key-error');
      expect(googleKeyError?.textContent).toContain('APIキーを入力してください');

      const claudeKeyError = container.querySelector('#claude-api-key-error');
      expect(claudeKeyError?.textContent).toContain('APIキーを入力してください');
    });

    it('should call SettingsManager.saveSettings() on successful save', () => {
      const saveSpy = jest.spyOn(settingsManager, 'saveSettings');
      new SettingsPage(container, settingsManager);

      // Fill in all fields
      const providers = ['openai', 'google', 'claude'];
      for (const provider of providers) {
        const apiKeyInput = container.querySelector(`#${provider}-api-key-input`) as HTMLInputElement;
        const modelInput = container.querySelector(`#${provider}-model-input`) as HTMLInputElement;
        apiKeyInput.value = `sk-${provider}-key123`;
        modelInput.value = `${provider}-model`;
      }

      const form = container.querySelector('#settings-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      expect(saveSpy).toHaveBeenCalledTimes(1);
      expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({
        activeProvider: 'openai',
        providers: expect.objectContaining({
          openai: { api_key: 'sk-openai-key123', model: 'openai-model' },
        }),
      }));
    });

    it('should expose active provider config via getActiveProviderConfig()', () => {
      const settings = {
        activeProvider: 'openai' as const,
        providers: {
          openai: { api_key: 'sk-test-key-12345', model: 'gpt-4' },
          google: { api_key: 'google-key', model: 'gemini-pro' },
          claude: { api_key: 'claude-key', model: 'claude-3' },
        },
      };
      settingsManager.saveSettings(settings);
      settingsManager = new SettingsManager();

      const page = new SettingsPage(container, settingsManager);
      const config = page.getActiveProviderConfig();

      expect(config.api_key).toBe('sk-test-key-12345');
      expect(config.model).toBe('gpt-4');
    });

    it('should expose current settings via getCurrentSettings()', () => {
      const settings = {
        activeProvider: 'google' as const,
        providers: {
          openai: { api_key: 'oai-key', model: 'gpt-4' },
          google: { api_key: 'google-key', model: 'gemini-pro' },
          claude: { api_key: 'claude-key', model: 'claude-3' },
        },
      };
      settingsManager.saveSettings(settings);
      settingsManager = new SettingsManager();

      const page = new SettingsPage(container, settingsManager);
      const currentSettings = page.getCurrentSettings();

      expect(currentSettings.activeProvider).toBe('google');
      expect(currentSettings.providers.google.model).toBe('gemini-pro');
    });

    it('should expose SettingsManager via getSettingsManager()', () => {
      const page = new SettingsPage(container, settingsManager);
      const manager = page.getSettingsManager();

      expect(manager).toBe(settingsManager);
      expect(manager).toBeInstanceOf(SettingsManager);
    });

    it('should allow AI mode search to access provider config via SettingsManager.getProviderConfig()', () => {
      const settings = {
        activeProvider: 'claude' as const,
        providers: {
          openai: { api_key: 'oai-key', model: 'gpt-4' },
          google: { api_key: 'google-key', model: 'gemini-pro' },
          claude: { api_key: 'sk-ant-api-key-789', model: 'claude-3-sonnet' },
        },
      };
      settingsManager.saveSettings(settings);
      settingsManager = new SettingsManager();

      const page = new SettingsPage(container, settingsManager);
      const manager = page.getSettingsManager();

      // Simulate what the AI search flow would do
      const providerConfig = manager.getProviderConfig('claude');
      expect(providerConfig.api_key).toBe('sk-ant-api-key-789');
      expect(providerConfig.model).toBe('claude-3-sonnet');
    });
  });
});
