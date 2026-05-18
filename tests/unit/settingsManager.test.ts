/**
 * Unit Tests for SettingsManager Service
 */

import { SettingsManager } from '../../src/services/settingsManager';
import type { AISettings } from '../../src/models/types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('SettingsManager', () => {
  let manager: SettingsManager;

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    manager = new SettingsManager();
  });

  describe('getSettings', () => {
    it('returns default settings when localStorage is empty', () => {
      const settings = manager.getSettings();
      expect(settings.activeProvider).toBe('openai');
      expect(settings.providers.openai).toEqual({ api_key: '', model: '' });
      expect(settings.providers.google).toEqual({ api_key: '', model: '' });
      expect(settings.providers.claude).toEqual({ api_key: '', model: '' });
    });

    it('returns stored settings when valid data exists', () => {
      const stored: AISettings = {
        activeProvider: 'google',
        providers: {
          openai: { api_key: 'sk-abc123', model: 'gpt-4' },
          google: { api_key: 'goog-key', model: 'gemini-pro' },
          claude: { api_key: 'cl-key', model: 'claude-3' },
        },
      };
      localStorageMock.setItem('review-finder-settings', JSON.stringify(stored));

      const settings = manager.getSettings();
      expect(settings.activeProvider).toBe('google');
      expect(settings.providers.openai.api_key).toBe('sk-abc123');
      expect(settings.providers.google.model).toBe('gemini-pro');
    });

    it('returns default settings when stored data is invalid JSON', () => {
      localStorageMock.setItem('review-finder-settings', 'not-json');
      const settings = manager.getSettings();
      expect(settings.activeProvider).toBe('openai');
    });

    it('returns default settings when stored data has invalid shape', () => {
      localStorageMock.setItem('review-finder-settings', JSON.stringify({ foo: 'bar' }));
      const settings = manager.getSettings();
      expect(settings.activeProvider).toBe('openai');
    });

    it('returns default settings when provider config is missing fields', () => {
      const invalid = {
        activeProvider: 'openai',
        providers: {
          openai: { api_key: 'key' }, // missing model
          google: { api_key: '', model: '' },
          claude: { api_key: '', model: '' },
        },
      };
      localStorageMock.setItem('review-finder-settings', JSON.stringify(invalid));
      const settings = manager.getSettings();
      expect(settings.activeProvider).toBe('openai');
      expect(settings.providers.openai).toEqual({ api_key: '', model: '' });
    });
  });

  describe('saveSettings', () => {
    it('saves settings to localStorage', () => {
      const settings: AISettings = {
        activeProvider: 'claude',
        providers: {
          openai: { api_key: 'sk-test', model: 'gpt-4' },
          google: { api_key: 'goog-test', model: 'gemini' },
          claude: { api_key: 'cl-test', model: 'claude-3' },
        },
      };

      manager.saveSettings(settings);

      const stored = JSON.parse(localStorageMock.getItem('review-finder-settings')!);
      expect(stored.activeProvider).toBe('claude');
      expect(stored.providers.claude.api_key).toBe('cl-test');
    });

    it('overwrites existing settings', () => {
      const first: AISettings = {
        activeProvider: 'openai',
        providers: {
          openai: { api_key: 'first', model: 'gpt-3' },
          google: { api_key: '', model: '' },
          claude: { api_key: '', model: '' },
        },
      };
      const second: AISettings = {
        activeProvider: 'google',
        providers: {
          openai: { api_key: 'first', model: 'gpt-3' },
          google: { api_key: 'second', model: 'gemini' },
          claude: { api_key: '', model: '' },
        },
      };

      manager.saveSettings(first);
      manager.saveSettings(second);

      const settings = manager.getSettings();
      expect(settings.activeProvider).toBe('google');
      expect(settings.providers.google.api_key).toBe('second');
    });
  });

  describe('getProviderConfig', () => {
    it('returns config for the specified provider', () => {
      const settings: AISettings = {
        activeProvider: 'openai',
        providers: {
          openai: { api_key: 'sk-openai', model: 'gpt-4' },
          google: { api_key: 'goog-key', model: 'gemini-pro' },
          claude: { api_key: 'cl-key', model: 'claude-3' },
        },
      };
      manager.saveSettings(settings);

      expect(manager.getProviderConfig('openai')).toEqual({ api_key: 'sk-openai', model: 'gpt-4' });
      expect(manager.getProviderConfig('google')).toEqual({ api_key: 'goog-key', model: 'gemini-pro' });
      expect(manager.getProviderConfig('claude')).toEqual({ api_key: 'cl-key', model: 'claude-3' });
    });

    it('returns empty config when no settings are stored', () => {
      const config = manager.getProviderConfig('openai');
      expect(config).toEqual({ api_key: '', model: '' });
    });
  });

  describe('validateSettings', () => {
    it('returns valid for proper settings', () => {
      const settings: AISettings = {
        activeProvider: 'openai',
        providers: {
          openai: { api_key: 'sk-valid-key', model: 'gpt-4' },
          google: { api_key: '', model: '' },
          claude: { api_key: '', model: '' },
        },
      };

      const result = manager.validateSettings(settings);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects empty api_key', () => {
      const settings: AISettings = {
        activeProvider: 'openai',
        providers: {
          openai: { api_key: '', model: 'gpt-4' },
          google: { api_key: '', model: '' },
          claude: { api_key: '', model: '' },
        },
      };

      const result = manager.validateSettings(settings);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'api_key')).toBe(true);
    });

    it('rejects whitespace-only api_key', () => {
      const settings: AISettings = {
        activeProvider: 'google',
        providers: {
          openai: { api_key: '', model: '' },
          google: { api_key: '   \t  ', model: 'gemini-pro' },
          claude: { api_key: '', model: '' },
        },
      };

      const result = manager.validateSettings(settings);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'api_key')).toBe(true);
    });

    it('rejects empty model', () => {
      const settings: AISettings = {
        activeProvider: 'claude',
        providers: {
          openai: { api_key: '', model: '' },
          google: { api_key: '', model: '' },
          claude: { api_key: 'valid-key', model: '' },
        },
      };

      const result = manager.validateSettings(settings);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'model')).toBe(true);
    });

    it('rejects both empty api_key and model', () => {
      const settings: AISettings = {
        activeProvider: 'openai',
        providers: {
          openai: { api_key: '', model: '' },
          google: { api_key: '', model: '' },
          claude: { api_key: '', model: '' },
        },
      };

      const result = manager.validateSettings(settings);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'api_key')).toBe(true);
      expect(result.errors.some(e => e.field === 'model')).toBe(true);
    });

    it('validates only the active provider', () => {
      const settings: AISettings = {
        activeProvider: 'openai',
        providers: {
          openai: { api_key: 'valid-key', model: 'gpt-4' },
          google: { api_key: '', model: '' }, // invalid but not active
          claude: { api_key: '', model: '' }, // invalid but not active
        },
      };

      const result = manager.validateSettings(settings);
      expect(result.valid).toBe(true);
    });
  });

  describe('maskApiKey', () => {
    it('masks all but last 4 chars for long keys', () => {
      expect(manager.maskApiKey('sk-1234567890')).toBe('*********7890');
    });

    it('masks entire string for 4 or fewer chars', () => {
      expect(manager.maskApiKey('abcd')).toBe('****');
      expect(manager.maskApiKey('abc')).toBe('***');
      expect(manager.maskApiKey('ab')).toBe('**');
      expect(manager.maskApiKey('a')).toBe('*');
    });

    it('returns empty string for empty input', () => {
      expect(manager.maskApiKey('')).toBe('');
    });
  });
});
