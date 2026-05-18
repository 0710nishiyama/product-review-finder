/**
 * Validation Functions
 * Input validation for ProductData, URLs, image files, and AI settings.
 */

import type { ProductData, AISettings, AIProviderConfig, AppError } from '../models/types.js';

export interface ValidationResult {
  valid: boolean;
  errors: AppError[];
}

/**
 * Validate a product URL (http/https format, max 2048 chars).
 */
export function validateUrl(url: string): ValidationResult {
  const errors: AppError[] = [];

  if (url.length > 2048) {
    errors.push({
      type: 'validation',
      code: 'URL_TOO_LONG',
      message: 'URLは2048文字以内で入力してください',
      field: 'productUrl',
      retryable: false,
    });
    return { valid: false, errors };
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      errors.push({
        type: 'validation',
        code: 'URL_INVALID_PROTOCOL',
        message: 'URLはhttp://またはhttps://で始まる必要があります',
        field: 'productUrl',
        retryable: false,
      });
    }
  } catch {
    errors.push({
      type: 'validation',
      code: 'URL_INVALID_FORMAT',
      message: '有効なURL形式で入力してください',
      field: 'productUrl',
      retryable: false,
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate an image file (JPEG/PNG, max 5MB).
 */
export function validateImageFile(file: File): ValidationResult {
  const errors: AppError[] = [];
  const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
  const ACCEPTED_TYPES = ['image/jpeg', 'image/png'];

  if (!ACCEPTED_TYPES.includes(file.type)) {
    errors.push({
      type: 'validation',
      code: 'IMAGE_INVALID_FORMAT',
      message: '画像はJPEGまたはPNG形式のみ対応しています',
      field: 'productImage',
      retryable: false,
    });
  }

  if (file.size > MAX_SIZE_BYTES) {
    errors.push({
      type: 'validation',
      code: 'IMAGE_TOO_LARGE',
      message: '画像ファイルは5MB以内にしてください',
      field: 'productImage',
      retryable: false,
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate ProductData input.
 * - productName: required, 1-100 chars, non-whitespace-only
 * - productUrl: optional, but if provided must be valid http/https URL, max 2048 chars
 * - productImage: optional, but if provided must be JPEG/PNG, max 5MB
 */
export function validateProductData(data: ProductData): ValidationResult {
  const errors: AppError[] = [];

  // Validate productName
  if (!data.productName || data.productName.trim().length === 0) {
    errors.push({
      type: 'validation',
      code: 'PRODUCT_NAME_REQUIRED',
      message: '商品名を入力してください',
      field: 'productName',
      retryable: false,
    });
  } else if (data.productName.length > 100) {
    errors.push({
      type: 'validation',
      code: 'PRODUCT_NAME_TOO_LONG',
      message: '商品名は100文字以内で入力してください',
      field: 'productName',
      retryable: false,
    });
  }

  // Validate productUrl (optional, but if provided must be valid)
  if (data.productUrl && data.productUrl.trim().length > 0) {
    const urlResult = validateUrl(data.productUrl);
    if (!urlResult.valid) {
      errors.push(...urlResult.errors);
    }
  }

  // Validate productImage (optional, but if provided must be valid)
  if (data.productImage) {
    const imageResult = validateImageFile(data.productImage);
    if (!imageResult.valid) {
      errors.push(...imageResult.errors);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate AI settings.
 * - api_key: non-empty, non-whitespace-only
 * - model: non-empty
 */
export function validateAISettings(settings: AISettings): ValidationResult {
  const errors: AppError[] = [];
  const provider = settings.activeProvider;
  const config: AIProviderConfig = settings.providers[provider];

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
