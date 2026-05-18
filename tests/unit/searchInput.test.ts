/**
 * Unit tests for SearchInput component
 * Tests: rendering, validation, form submission, image upload, loading state
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7
 *
 * @jest-environment jsdom
 */

import { SearchInput, createSearchInput, SearchInputProps } from '../../src/components/searchInput';

// Mock the validators module
jest.mock('../../src/utils/validators', () => ({
  validateProductData: jest.fn(),
}));

import { validateProductData } from '../../src/utils/validators';
const mockValidateProductData = validateProductData as jest.MockedFunction<typeof validateProductData>;

describe('SearchInput', () => {
  let container: HTMLElement;
  let mockOnSearch: jest.Mock;
  let defaultProps: SearchInputProps;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mockOnSearch = jest.fn();
    defaultProps = {
      onSearch: mockOnSearch,
      isLoading: false,
    };
    mockValidateProductData.mockReturnValue({ valid: true, errors: [] });
  });

  afterEach(() => {
    document.body.removeChild(container);
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render a form with product name input (required, max 100 chars)', () => {
      new SearchInput(container, defaultProps);

      const input = container.querySelector('#product-name-input') as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.type).toBe('text');
      expect(input.maxLength).toBe(100);
      expect(input.required).toBe(true);
      expect(input.getAttribute('aria-required')).toBe('true');
    });

    it('should render a genre input field', () => {
      new SearchInput(container, defaultProps);

      const input = container.querySelector('#genre-input') as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.type).toBe('text');
    });

    it('should render a product URL input (max 2048 chars)', () => {
      new SearchInput(container, defaultProps);

      const input = container.querySelector('#product-url-input') as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.type).toBe('url');
      expect(input.maxLength).toBe(2048);
    });

    it('should render an image upload input with JPEG/PNG filter', () => {
      new SearchInput(container, defaultProps);

      const input = container.querySelector('#product-image-input') as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.type).toBe('file');
      expect(input.accept).toBe('image/jpeg,image/png');
    });

    it('should render a search submit button', () => {
      new SearchInput(container, defaultProps);

      const btn = container.querySelector('#search-submit-btn') as HTMLButtonElement;
      expect(btn).not.toBeNull();
      expect(btn.type).toBe('submit');
      expect(btn.textContent?.trim()).toBe('検索');
    });

    it('should display image size limit help text', () => {
      new SearchInput(container, defaultProps);

      const helpText = container.querySelector('#product-image-help');
      expect(helpText).not.toBeNull();
      expect(helpText?.textContent).toContain('5MB');
      expect(helpText?.textContent).toContain('JPEG/PNG');
    });
  });

  describe('Loading state (Requirement 7.1)', () => {
    it('should disable search button when isLoading is true', () => {
      new SearchInput(container, { ...defaultProps, isLoading: true });

      const btn = container.querySelector('#search-submit-btn') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it('should enable search button when isLoading is false', () => {
      new SearchInput(container, { ...defaultProps, isLoading: false });

      const btn = container.querySelector('#search-submit-btn') as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });

    it('should show spinner text when loading', () => {
      new SearchInput(container, { ...defaultProps, isLoading: true });

      const btn = container.querySelector('#search-submit-btn') as HTMLButtonElement;
      expect(btn.textContent).toContain('検索中');
    });

    it('should update button state via setLoading', () => {
      const component = new SearchInput(container, defaultProps);

      component.setLoading(true);
      const btn = container.querySelector('#search-submit-btn') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
      expect(btn.textContent).toContain('検索中');

      component.setLoading(false);
      expect(btn.disabled).toBe(false);
      expect(btn.textContent?.trim()).toBe('検索');
    });
  });

  describe('Form submission', () => {
    it('should call onSearch with form data when validation passes', () => {
      new SearchInput(container, defaultProps);

      const nameInput = container.querySelector('#product-name-input') as HTMLInputElement;
      const genreInput = container.querySelector('#genre-input') as HTMLInputElement;
      const urlInput = container.querySelector('#product-url-input') as HTMLInputElement;

      nameInput.value = 'テスト商品';
      genreInput.value = '電子機器';
      urlInput.value = 'https://example.com/product';

      const form = container.querySelector('#search-input-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      expect(mockOnSearch).toHaveBeenCalledWith({
        productName: 'テスト商品',
        genre: '電子機器',
        productUrl: 'https://example.com/product',
        productImage: null,
      });
    });

    it('should not call onSearch when validation fails', () => {
      mockValidateProductData.mockReturnValue({
        valid: false,
        errors: [{
          type: 'validation',
          code: 'PRODUCT_NAME_REQUIRED',
          message: '商品名を入力してください',
          field: 'productName',
          retryable: false,
        }],
      });

      new SearchInput(container, defaultProps);

      const form = container.querySelector('#search-input-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      expect(mockOnSearch).not.toHaveBeenCalled();
    });

    it('should not submit when loading', () => {
      const component = new SearchInput(container, defaultProps);
      component.setLoading(true);

      const nameInput = container.querySelector('#product-name-input') as HTMLInputElement;
      nameInput.value = 'テスト商品';

      const form = container.querySelector('#search-input-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      expect(mockOnSearch).not.toHaveBeenCalled();
    });
  });

  describe('Inline validation errors (Requirement 1.5, 1.7)', () => {
    it('should display error for missing product name', () => {
      mockValidateProductData.mockReturnValue({
        valid: false,
        errors: [{
          type: 'validation',
          code: 'PRODUCT_NAME_REQUIRED',
          message: '商品名を入力してください',
          field: 'productName',
          retryable: false,
        }],
      });

      const component = new SearchInput(container, defaultProps);
      component.validate();

      const input = container.querySelector('#product-name-input');
      expect(input?.classList.contains('is-invalid')).toBe(true);

      const errorDiv = container.querySelector('#product-name-error');
      expect(errorDiv?.textContent).toBe('商品名を入力してください');
    });

    it('should display error for invalid URL', () => {
      mockValidateProductData.mockReturnValue({
        valid: false,
        errors: [{
          type: 'validation',
          code: 'URL_INVALID_FORMAT',
          message: '有効なURL形式で入力してください',
          field: 'productUrl',
          retryable: false,
        }],
      });

      const component = new SearchInput(container, defaultProps);
      component.validate();

      const input = container.querySelector('#product-url-input');
      expect(input?.classList.contains('is-invalid')).toBe(true);

      const errorDiv = container.querySelector('#product-url-error');
      expect(errorDiv?.textContent).toBe('有効なURL形式で入力してください');
    });

    it('should clear field error on input', () => {
      mockValidateProductData.mockReturnValueOnce({
        valid: false,
        errors: [{
          type: 'validation',
          code: 'PRODUCT_NAME_REQUIRED',
          message: '商品名を入力してください',
          field: 'productName',
          retryable: false,
        }],
      });

      const component = new SearchInput(container, defaultProps);
      component.validate();

      // Verify error is shown
      const input = container.querySelector('#product-name-input') as HTMLInputElement;
      expect(input.classList.contains('is-invalid')).toBe(true);

      // Simulate typing
      input.dispatchEvent(new Event('input', { bubbles: true }));

      // Error should be cleared
      expect(input.classList.contains('is-invalid')).toBe(false);
    });
  });

  describe('Image upload (Requirement 1.4)', () => {
    it('should reject files that are not JPEG or PNG', () => {
      new SearchInput(container, defaultProps);

      const input = container.querySelector('#product-image-input') as HTMLInputElement;
      const file = new File(['content'], 'test.gif', { type: 'image/gif' });

      Object.defineProperty(input, 'files', { value: [file], writable: true });
      input.dispatchEvent(new Event('change', { bubbles: true }));

      const errorDiv = container.querySelector('#product-image-error');
      expect(errorDiv?.textContent).toBe('画像はJPEGまたはPNG形式のみ対応しています');
      expect(input.classList.contains('is-invalid')).toBe(true);
    });

    it('should reject files larger than 5MB', () => {
      new SearchInput(container, defaultProps);

      const input = container.querySelector('#product-image-input') as HTMLInputElement;
      const largeContent = new ArrayBuffer(6 * 1024 * 1024); // 6MB
      const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });

      Object.defineProperty(input, 'files', { value: [file], writable: true });
      input.dispatchEvent(new Event('change', { bubbles: true }));

      const errorDiv = container.querySelector('#product-image-error');
      expect(errorDiv?.textContent).toBe('画像ファイルは5MB以内にしてください');
      expect(input.classList.contains('is-invalid')).toBe(true);
    });

    it('should accept valid JPEG files under 5MB', () => {
      new SearchInput(container, defaultProps);

      const input = container.querySelector('#product-image-input') as HTMLInputElement;
      const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });

      Object.defineProperty(input, 'files', { value: [file], writable: true });
      input.dispatchEvent(new Event('change', { bubbles: true }));

      expect(input.classList.contains('is-invalid')).toBe(false);
      // Preview should be shown
      const preview = container.querySelector('#product-image-preview') as HTMLElement;
      expect(preview.style.display).toBe('block');
      expect(container.querySelector('#image-file-name')?.textContent).toBe('photo.jpg');
    });

    it('should accept valid PNG files under 5MB', () => {
      new SearchInput(container, defaultProps);

      const input = container.querySelector('#product-image-input') as HTMLInputElement;
      const file = new File(['content'], 'image.png', { type: 'image/png' });

      Object.defineProperty(input, 'files', { value: [file], writable: true });
      input.dispatchEvent(new Event('change', { bubbles: true }));

      expect(input.classList.contains('is-invalid')).toBe(false);
    });

    it('should remove image when remove button is clicked', () => {
      const component = new SearchInput(container, defaultProps);

      const input = container.querySelector('#product-image-input') as HTMLInputElement;
      const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });

      Object.defineProperty(input, 'files', { value: [file], writable: true });
      input.dispatchEvent(new Event('change', { bubbles: true }));

      // Click remove button
      const removeBtn = container.querySelector('#remove-image-btn') as HTMLButtonElement;
      removeBtn.click();

      // Preview should be hidden
      const preview = container.querySelector('#product-image-preview') as HTMLElement;
      expect(preview.style.display).toBe('none');

      // Form data should have null image
      const formData = component.getFormData();
      expect(formData.productImage).toBeNull();
    });
  });

  describe('getFormData', () => {
    it('should return current form values', () => {
      const component = new SearchInput(container, defaultProps);

      const nameInput = container.querySelector('#product-name-input') as HTMLInputElement;
      const genreInput = container.querySelector('#genre-input') as HTMLInputElement;
      const urlInput = container.querySelector('#product-url-input') as HTMLInputElement;

      nameInput.value = '商品A';
      genreInput.value = '食品';
      urlInput.value = 'https://shop.example.com';

      const data = component.getFormData();
      expect(data.productName).toBe('商品A');
      expect(data.genre).toBe('食品');
      expect(data.productUrl).toBe('https://shop.example.com');
      expect(data.productImage).toBeNull();
    });
  });

  describe('Factory function', () => {
    it('should create a SearchInput instance', () => {
      const component = createSearchInput(container, defaultProps);
      expect(component).toBeInstanceOf(SearchInput);
    });
  });

  describe('destroy', () => {
    it('should clear the container content', () => {
      const component = new SearchInput(container, defaultProps);
      expect(container.innerHTML).not.toBe('');

      component.destroy();
      expect(container.innerHTML).toBe('');
    });
  });
});
