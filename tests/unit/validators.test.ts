import {
  validateProductData,
  validateUrl,
  validateImageFile,
  validateAISettings,
} from '../../src/utils/validators';
import type { ProductData, AISettings } from '../../src/models/types';

describe('validateUrl', () => {
  it('should accept valid http URL', () => {
    const result = validateUrl('http://example.com');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should accept valid https URL', () => {
    const result = validateUrl('https://example.com/path?q=1');
    expect(result.valid).toBe(true);
  });

  it('should reject ftp URL', () => {
    const result = validateUrl('ftp://example.com');
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('URL_INVALID_PROTOCOL');
  });

  it('should reject invalid URL format', () => {
    const result = validateUrl('not-a-url');
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('URL_INVALID_FORMAT');
  });

  it('should reject URL exceeding 2048 chars', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2048);
    const result = validateUrl(longUrl);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('URL_TOO_LONG');
  });

  it('should accept URL at exactly 2048 chars', () => {
    const url = 'https://example.com/' + 'a'.repeat(2028);
    expect(url.length).toBe(2048);
    const result = validateUrl(url);
    expect(result.valid).toBe(true);
  });
});

describe('validateImageFile', () => {
  it('should accept JPEG file under 5MB', () => {
    const file = new File(['x'.repeat(1000)], 'photo.jpg', { type: 'image/jpeg' });
    const result = validateImageFile(file);
    expect(result.valid).toBe(true);
  });

  it('should accept PNG file under 5MB', () => {
    const file = new File(['x'.repeat(1000)], 'photo.png', { type: 'image/png' });
    const result = validateImageFile(file);
    expect(result.valid).toBe(true);
  });

  it('should reject GIF file', () => {
    const file = new File(['x'], 'photo.gif', { type: 'image/gif' });
    const result = validateImageFile(file);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('IMAGE_INVALID_FORMAT');
  });

  it('should reject file over 5MB', () => {
    // Create a file object with size > 5MB using Object.defineProperty
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 + 1 });
    const result = validateImageFile(file);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('IMAGE_TOO_LARGE');
  });

  it('should accept file at exactly 5MB', () => {
    const file = new File(['x'], 'photo.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 });
    const result = validateImageFile(file);
    expect(result.valid).toBe(true);
  });
});

describe('validateProductData', () => {
  const validData: ProductData = {
    productName: 'Test Product',
    genre: 'Electronics',
    productUrl: '',
    productImage: null,
  };

  it('should accept valid product data', () => {
    const result = validateProductData(validData);
    expect(result.valid).toBe(true);
  });

  it('should reject empty product name', () => {
    const result = validateProductData({ ...validData, productName: '' });
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe('productName');
  });

  it('should reject whitespace-only product name', () => {
    const result = validateProductData({ ...validData, productName: '   ' });
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe('productName');
  });

  it('should reject product name over 100 chars', () => {
    const result = validateProductData({ ...validData, productName: 'a'.repeat(101) });
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('PRODUCT_NAME_TOO_LONG');
  });

  it('should accept product name at exactly 100 chars', () => {
    const result = validateProductData({ ...validData, productName: 'a'.repeat(100) });
    expect(result.valid).toBe(true);
  });

  it('should accept product name at 1 char', () => {
    const result = validateProductData({ ...validData, productName: 'a' });
    expect(result.valid).toBe(true);
  });

  it('should skip URL validation when URL is empty', () => {
    const result = validateProductData({ ...validData, productUrl: '' });
    expect(result.valid).toBe(true);
  });

  it('should validate URL when provided', () => {
    const result = validateProductData({ ...validData, productUrl: 'not-a-url' });
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe('productUrl');
  });

  it('should accept valid URL', () => {
    const result = validateProductData({ ...validData, productUrl: 'https://example.com' });
    expect(result.valid).toBe(true);
  });

  it('should skip image validation when image is null', () => {
    const result = validateProductData({ ...validData, productImage: null });
    expect(result.valid).toBe(true);
  });

  it('should validate image when provided', () => {
    const file = new File(['x'], 'photo.gif', { type: 'image/gif' });
    const result = validateProductData({ ...validData, productImage: file });
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe('productImage');
  });
});

describe('validateAISettings', () => {
  const validSettings: AISettings = {
    activeProvider: 'openai',
    providers: {
      openai: { api_key: 'sk-test-key-12345', model: 'gpt-4' },
      google: { api_key: 'google-key', model: 'gemini-pro' },
      claude: { api_key: 'claude-key', model: 'claude-3' },
    },
  };

  it('should accept valid settings', () => {
    const result = validateAISettings(validSettings);
    expect(result.valid).toBe(true);
  });

  it('should reject empty api_key', () => {
    const settings: AISettings = {
      ...validSettings,
      providers: {
        ...validSettings.providers,
        openai: { api_key: '', model: 'gpt-4' },
      },
    };
    const result = validateAISettings(settings);
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe('api_key');
  });

  it('should reject whitespace-only api_key', () => {
    const settings: AISettings = {
      ...validSettings,
      providers: {
        ...validSettings.providers,
        openai: { api_key: '   ', model: 'gpt-4' },
      },
    };
    const result = validateAISettings(settings);
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe('api_key');
  });

  it('should reject empty model', () => {
    const settings: AISettings = {
      ...validSettings,
      providers: {
        ...validSettings.providers,
        openai: { api_key: 'sk-key', model: '' },
      },
    };
    const result = validateAISettings(settings);
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe('model');
  });

  it('should validate the active provider only', () => {
    const settings: AISettings = {
      activeProvider: 'google',
      providers: {
        openai: { api_key: '', model: '' }, // invalid but not active
        google: { api_key: 'valid-key', model: 'gemini-pro' },
        claude: { api_key: '', model: '' }, // invalid but not active
      },
    };
    const result = validateAISettings(settings);
    expect(result.valid).toBe(true);
  });
});
