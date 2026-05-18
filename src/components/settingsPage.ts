/**
 * SettingsPage Component
 * Renders forms for OpenAI, Google, Claude provider settings.
 * - API key fields are masked (all but last 4 chars hidden)
 * - Model name input for each provider
 * - Save confirmation feedback shown for 3 seconds
 * - Validates using SettingsManager.validateSettings() with inline error display
 * - Exposes active provider config for AI mode search flow
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */

import type { AISettings, AIProvider, AIProviderConfig, AppError } from '../models/types.js';
import { SettingsManager } from '../services/settingsManager.js';
import { maskApiKey } from '../utils/helpers.js';
import type { ValidationResult } from '../utils/validators.js';

/** Provider display configuration */
interface ProviderDisplay {
  id: AIProvider;
  label: string;
  modelPlaceholder: string;
}

const PROVIDERS: ProviderDisplay[] = [
  { id: 'openai', label: 'OpenAI', modelPlaceholder: 'gpt-4, gpt-3.5-turbo など' },
  { id: 'google', label: 'Google Gemini', modelPlaceholder: 'gemini-pro, gemini-1.5-pro など' },
  { id: 'claude', label: 'Claude', modelPlaceholder: 'claude-3-opus, claude-3-sonnet など' },
];

/**
 * SettingsPage component class.
 * Manages AI provider settings forms with validation and save feedback.
 */
export class SettingsPage {
  private container: HTMLElement;
  private settingsManager: SettingsManager;
  private settings: AISettings;
  private errors: Map<string, string> = new Map();
  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;
  private showingFeedback: boolean = false;

  constructor(container: HTMLElement, settingsManager?: SettingsManager) {
    this.container = container;
    this.settingsManager = settingsManager ?? new SettingsManager();
    this.settings = this.settingsManager.getSettings();
    this.render();
    this.bindEvents();
  }

  /**
   * Render the settings page HTML.
   */
  render(): void {
    const providerFormsHtml = PROVIDERS.map((provider) => {
      return this.renderProviderForm(provider);
    }).join('');

    const feedbackHtml = this.showingFeedback
      ? `<div class="alert alert-success alert-dismissible fade show" role="alert" id="settings-save-feedback">
          設定を保存しました
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="閉じる"></button>
        </div>`
      : '';

    this.container.innerHTML = `
      <div class="settings-page">
        <h2 class="mb-4">AI API設定</h2>
        ${feedbackHtml}
        <div id="settings-feedback-container"></div>
        <form id="settings-form" novalidate>
          <div class="mb-3">
            <label for="active-provider-select" class="form-label fw-bold">アクティブプロバイダー</label>
            <select class="form-select" id="active-provider-select" aria-label="アクティブプロバイダー選択">
              ${PROVIDERS.map((p) => `<option value="${p.id}" ${this.settings.activeProvider === p.id ? 'selected' : ''}>${p.label}</option>`).join('')}
            </select>
          </div>

          <hr class="my-4" />

          ${providerFormsHtml}

          <div class="d-grid mt-4">
            <button type="submit" class="btn btn-primary" id="settings-save-btn">
              設定を保存
            </button>
          </div>
        </form>
      </div>
    `;
  }

  /**
   * Render a single provider's settings form section.
   */
  private renderProviderForm(provider: ProviderDisplay): string {
    const config = this.settings.providers[provider.id];
    const maskedKey = config.api_key ? maskApiKey(config.api_key) : '';
    const apiKeyError = this.errors.get(`${provider.id}_api_key`) || '';
    const modelError = this.errors.get(`${provider.id}_model`) || '';
    const apiKeyInvalid = apiKeyError ? ' is-invalid' : '';
    const modelInvalid = modelError ? ' is-invalid' : '';

    return `
      <div class="card mb-3" id="provider-card-${provider.id}">
        <div class="card-header">
          <h5 class="mb-0">${provider.label}</h5>
        </div>
        <div class="card-body">
          <div class="mb-3">
            <label for="${provider.id}-api-key-input" class="form-label">APIキー</label>
            <input
              type="password"
              class="form-control${apiKeyInvalid}"
              id="${provider.id}-api-key-input"
              name="${provider.id}_api_key"
              placeholder="APIキーを入力してください"
              value="${this.escapeHtml(config.api_key)}"
              autocomplete="off"
              aria-describedby="${provider.id}-api-key-error ${provider.id}-api-key-masked"
            />
            <div id="${provider.id}-api-key-masked" class="form-text">
              ${maskedKey ? `現在の値: ${maskedKey}` : '未設定'}
            </div>
            <div id="${provider.id}-api-key-error" class="invalid-feedback" role="alert">
              ${apiKeyError}
            </div>
          </div>

          <div class="mb-3">
            <label for="${provider.id}-model-input" class="form-label">モデル</label>
            <input
              type="text"
              class="form-control${modelInvalid}"
              id="${provider.id}-model-input"
              name="${provider.id}_model"
              placeholder="${provider.modelPlaceholder}"
              value="${this.escapeHtml(config.model)}"
              aria-describedby="${provider.id}-model-error"
            />
            <div id="${provider.id}-model-error" class="invalid-feedback" role="alert">
              ${modelError}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Bind form events.
   */
  private bindEvents(): void {
    const form = this.container.querySelector('#settings-form') as HTMLFormElement | null;
    if (form) {
      form.addEventListener('submit', (e: Event) => {
        e.preventDefault();
        this.handleSave();
      });
    }

    // Clear field errors on input
    PROVIDERS.forEach((provider) => {
      const apiKeyInput = this.container.querySelector(`#${provider.id}-api-key-input`);
      if (apiKeyInput) {
        apiKeyInput.addEventListener('input', () => {
          this.clearFieldError(`${provider.id}_api_key`);
        });
      }

      const modelInput = this.container.querySelector(`#${provider.id}-model-input`);
      if (modelInput) {
        modelInput.addEventListener('input', () => {
          this.clearFieldError(`${provider.id}_model`);
        });
      }
    });
  }

  /**
   * Handle save button click.
   * Reads form values, validates using SettingsManager.validateSettings(),
   * and saves if valid. Displays inline validation errors from the service.
   */
  private handleSave(): void {
    this.clearAllErrors();
    this.hideFeedback();

    // Read form values
    const activeProvider = this.getSelectValue('active-provider-select') as AIProvider;
    const newSettings: AISettings = {
      activeProvider,
      providers: {
        openai: {
          api_key: this.getInputValue('openai-api-key-input'),
          model: this.getInputValue('openai-model-input'),
        },
        google: {
          api_key: this.getInputValue('google-api-key-input'),
          model: this.getInputValue('google-model-input'),
        },
        claude: {
          api_key: this.getInputValue('claude-api-key-input'),
          model: this.getInputValue('claude-model-input'),
        },
      },
    };

    // Validate all providers using SettingsManager.validateSettings()
    const isValid = this.validateAllProviders(newSettings);

    if (isValid) {
      this.settingsManager.saveSettings(newSettings);
      this.settings = newSettings;
      this.showSaveFeedback();
    }
  }

  /**
   * Validate all provider settings using SettingsManager.validateSettings().
   * For each provider, temporarily sets it as activeProvider to validate via the service.
   * Displays inline validation errors from the service's ValidationResult.
   * Returns true if all providers are valid.
   */
  private validateAllProviders(settings: AISettings): boolean {
    let hasErrors = false;

    PROVIDERS.forEach((provider) => {
      // Create a temporary settings object with this provider as active
      // to leverage SettingsManager.validateSettings()
      const tempSettings: AISettings = {
        activeProvider: provider.id,
        providers: settings.providers,
      };

      const result: ValidationResult = this.settingsManager.validateSettings(tempSettings);

      if (!result.valid) {
        hasErrors = true;
        // Map validation errors to the UI fields
        for (const error of result.errors) {
          if (error.field === 'api_key') {
            this.errors.set(
              `${provider.id}_api_key`,
              error.message
            );
          } else if (error.field === 'model') {
            this.errors.set(
              `${provider.id}_model`,
              error.message
            );
          }
        }
      }
    });

    if (hasErrors) {
      this.displayAllErrors();
    }

    return !hasErrors;
  }

  /**
   * Show save confirmation feedback for 3 seconds.
   * Requirement 3.7: Show save confirmation for 3 seconds.
   */
  private showSaveFeedback(): void {
    this.showingFeedback = true;

    // Clear any existing timer
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
    }

    const feedbackContainer = this.container.querySelector('#settings-feedback-container');
    if (feedbackContainer) {
      feedbackContainer.innerHTML = `
        <div class="alert alert-success alert-dismissible fade show" role="alert" id="settings-save-feedback">
          設定を保存しました
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="閉じる"></button>
        </div>
      `;
    }

    // Auto-hide after 3 seconds
    this.feedbackTimer = setTimeout(() => {
      this.hideFeedback();
    }, 3000);
  }

  /**
   * Hide the save confirmation feedback.
   */
  private hideFeedback(): void {
    this.showingFeedback = false;
    const feedbackContainer = this.container.querySelector('#settings-feedback-container');
    if (feedbackContainer) {
      feedbackContainer.innerHTML = '';
    }
    const existingFeedback = this.container.querySelector('#settings-save-feedback');
    if (existingFeedback) {
      existingFeedback.remove();
    }
  }

  /**
   * Display all current errors in the UI.
   */
  private displayAllErrors(): void {
    for (const [key, message] of this.errors) {
      const parts = key.split('_');
      const provider = parts[0];
      const field = parts.slice(1).join('_');
      const inputId = `${provider}-${field.replace('_', '-')}-input`;
      const errorId = `${provider}-${field.replace('_', '-')}-error`;

      const input = this.container.querySelector(`#${inputId}`) as HTMLElement | null;
      if (input) {
        input.classList.add('is-invalid');
      }

      const errorDiv = this.container.querySelector(`#${errorId}`) as HTMLElement | null;
      if (errorDiv) {
        errorDiv.textContent = message;
      }
    }
  }

  /**
   * Clear a specific field's error.
   */
  private clearFieldError(key: string): void {
    this.errors.delete(key);
    const parts = key.split('_');
    const provider = parts[0];
    const field = parts.slice(1).join('_');
    const inputId = `${provider}-${field.replace('_', '-')}-input`;
    const errorId = `${provider}-${field.replace('_', '-')}-error`;

    const input = this.container.querySelector(`#${inputId}`) as HTMLElement | null;
    if (input) {
      input.classList.remove('is-invalid');
    }

    const errorDiv = this.container.querySelector(`#${errorId}`) as HTMLElement | null;
    if (errorDiv) {
      errorDiv.textContent = '';
    }
  }

  /**
   * Clear all validation errors from the UI.
   */
  private clearAllErrors(): void {
    this.errors.clear();

    const invalidInputs = this.container.querySelectorAll('.is-invalid');
    invalidInputs.forEach((el) => el.classList.remove('is-invalid'));

    const errorDivs = this.container.querySelectorAll('.invalid-feedback');
    errorDivs.forEach((el) => {
      el.textContent = '';
    });
  }

  /**
   * Get the value of an input element by ID.
   */
  private getInputValue(id: string): string {
    const input = this.container.querySelector(`#${id}`) as HTMLInputElement | null;
    return input?.value ?? '';
  }

  /**
   * Get the value of a select element by ID.
   */
  private getSelectValue(id: string): string {
    const select = this.container.querySelector(`#${id}`) as HTMLSelectElement | null;
    return select?.value ?? '';
  }

  /**
   * Escape HTML special characters to prevent XSS.
   */
  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Get the active provider configuration for AI mode search.
   * This allows the search flow to access the current provider settings
   * via SettingsManager.getProviderConfig().
   */
  getActiveProviderConfig(): AIProviderConfig {
    const settings = this.settingsManager.getSettings();
    return this.settingsManager.getProviderConfig(settings.activeProvider);
  }

  /**
   * Get the current AI settings from the SettingsManager.
   * Used by the AI mode search flow to pass settings to SearchEngine.
   */
  getCurrentSettings(): AISettings {
    return this.settingsManager.getSettings();
  }

  /**
   * Get the underlying SettingsManager instance.
   * Allows other components (e.g., search page) to access provider settings.
   */
  getSettingsManager(): SettingsManager {
    return this.settingsManager;
  }

  /**
   * Destroy the component and clean up timers.
   */
  destroy(): void {
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = null;
    }
    this.container.innerHTML = '';
    this.errors.clear();
  }
}

/**
 * Factory function to create and mount a SettingsPage component.
 */
export function createSettingsPage(container: HTMLElement, settingsManager?: SettingsManager): SettingsPage {
  return new SettingsPage(container, settingsManager);
}
