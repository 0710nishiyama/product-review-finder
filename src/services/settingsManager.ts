/**
 * SettingsManager Service
 * Manages AI provider settings in localStorage.
 * Provides save/load, validation, provider config retrieval, and API key masking.
 */

import type { AISettings, AIProvider, AIProviderConfig, AppError } from '../models/types.js';
import { maskApiKey } from '../utils/helpers.js';
import type { ValidationResult } from '../utils/validators.js';

const STORAGE_KEY = 'review-finder-settings';

const DEFAULT_SETTINGS: AISettings = {
  activeProvider: 'openai',
  providers: {
    openai: { api_key: '', model: '' },
    google: { api_key: '', model: '' },
    claude: { api_key: '', model: '' },
  },
};

export interface ISettingsManager {
  getSettings(): AISettings;
  saveSettings(settings: AISettings): void;
  getProviderConfig(provider: AIProvider): AIProviderConfig;
  validateSettings(settings: AISettings): ValidationResult;
  maskApiKey(key: string): string;
}

export class SettingsManager implements ISettingsManager {
  /**
   * Load AI settings from localStorage.
   * Returns default settings if none are stored or data is invalid.
   */
  getSettings(): AISettings {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        return { ...DEFAULT_SETTINGS, providers: { ...DEFAULT_SETTINGS.providers } };
      }
      const parsed = JSON.parse(data);
      if (!this.isValidSettingsShape(parsed)) {
        return { ...DEFAULT_SETTINGS, providers: { ...DEFAULT_SETTINGS.providers } };
      }
      return parsed as AISettings;
    } catch {
      return { ...DEFAULT_SETTINGS, providers: { ...DEFAULT_SETTINGS.providers } };
    }
  }

  /**
   * Save AI settings to localStorage.
   */
  saveSettings(settings: AISettings): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }

  /**
   * Get the provider configuration for a specific AI provider.
   * Loads settings from storage and returns the config for the given provider.
   */
  getProviderConfig(provider: AIProvider): AIProviderConfig {
    const settings = this.getSettings();
    return settings.providers[provider];
  }

  /**
   * Validate AI settings for the active provider.
   * Checks that api_key is non-empty and non-whitespace-only, and model is non-empty.
   * Returns validation errors that include the field name.
   */
  validateSettings(settings: AISettings): ValidationResult {
    const errors: AppError[] = [];
    const provider = settings.activeProvider;
    const config = settings.providers[provider];

    if (!config.api_key || config.api_key.trim().length === 0) {
      errors.push({
        type: 'validation',
        code: 'API_KEY_REQUIRED',
        message: `${provider}のAPIキーを入力してください`,
        field: 'api_key',
        retryable: false,
      });
    }

    if (!config.model || config.model.length === 0) {
      errors.push({
        type: 'validation',
        code: 'MODEL_REQUIRED',
        message: `${provider}のモデル名を入力してください`,
        field: 'model',
        retryable: false,
      });
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Mask an API key for display purposes.
   * For strings longer than 4 chars, preserves last 4 and masks the rest.
   * For strings of 4 or fewer chars, masks the entire string.
   */
  maskApiKey(key: string): string {
    return maskApiKey(key);
  }

  /**
   * Check if a parsed object has the expected AISettings shape.
   */
  private isValidSettingsShape(obj: unknown): boolean {
    if (typeof obj !== 'object' || obj === null) {
      return false;
    }

    const settings = obj as Record<string, unknown>;

    // Check activeProvider
    if (!['openai', 'google', 'claude'].includes(settings.activeProvider as string)) {
      return false;
    }

    // Check providers object
    if (typeof settings.providers !== 'object' || settings.providers === null) {
      return false;
    }

    const providers = settings.providers as Record<string, unknown>;
    for (const provider of ['openai', 'google', 'claude']) {
      const config = providers[provider];
      if (typeof config !== 'object' || config === null) {
        return false;
      }
      const providerConfig = config as Record<string, unknown>;
      if (typeof providerConfig.api_key !== 'string') {
        return false;
      }
      if (typeof providerConfig.model !== 'string') {
        return false;
      }
    }

    return true;
  }
}
