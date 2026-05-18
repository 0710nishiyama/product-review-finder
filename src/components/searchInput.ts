/**
 * SearchInput Component
 * Renders product data input form with validation:
 * - Product name input (required, max 100 chars)
 * - Genre input (optional)
 * - Product URL input (optional, max 2048 chars, http/https)
 * - Image upload (optional, JPEG/PNG, max 5MB)
 * Displays inline validation errors and disables search button during loading.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7
 */

import type { ProductData, AppError } from '../models/types.js';
import { validateProductData } from '../utils/validators.js';

/** Props for SearchInput component */
export interface SearchInputProps {
  onSearch: (productData: ProductData) => void;
  isLoading: boolean;
}

/**
 * SearchInput component class.
 * Manages the product data input form with inline validation.
 */
export class SearchInput {
  private container: HTMLElement;
  private props: SearchInputProps;
  private errors: Map<string, string> = new Map();
  private selectedImage: File | null = null;

  constructor(container: HTMLElement, props: SearchInputProps) {
    this.container = container;
    this.props = props;
    this.render();
    this.bindEvents();
  }

  /**
   * Update the loading state and re-render the submit button.
   */
  setLoading(isLoading: boolean): void {
    this.props.isLoading = isLoading;
    const btn = this.container.querySelector('#search-submit-btn') as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = isLoading;
      btn.innerHTML = isLoading
        ? '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>検索中...'
        : '検索';
    }
  }

  /**
   * Update the onSearch callback.
   */
  setOnSearch(onSearch: (productData: ProductData) => void): void {
    this.props.onSearch = onSearch;
  }

  /**
   * Get current form values as ProductData.
   */
  getFormData(): ProductData {
    const productName = this.getInputValue('product-name-input');
    const genre = this.getInputValue('genre-input');
    const productUrl = this.getInputValue('product-url-input');

    return {
      productName,
      genre,
      productUrl,
      productImage: this.selectedImage,
    };
  }

  /**
   * Validate the form and display inline errors.
   * Returns true if valid.
   */
  validate(): boolean {
    this.clearErrors();
    const data = this.getFormData();
    const result = validateProductData(data);

    if (!result.valid) {
      for (const error of result.errors) {
        if (error.field) {
          this.errors.set(error.field, error.message);
        }
      }
      this.displayErrors();
      return false;
    }

    return true;
  }

  /**
   * Render the search input form HTML.
   */
  render(): void {
    this.container.innerHTML = `
      <form id="search-input-form" novalidate>
        <div class="mb-3">
          <label for="product-name-input" class="form-label">
            商品名 <span class="text-danger">*</span>
          </label>
          <input
            type="text"
            class="form-control"
            id="product-name-input"
            name="productName"
            maxlength="100"
            required
            placeholder="商品名を入力してください"
            aria-required="true"
            aria-describedby="product-name-error"
          />
          <div id="product-name-error" class="invalid-feedback" role="alert"></div>
        </div>

        <div class="mb-3">
          <label for="genre-input" class="form-label">ジャンル</label>
          <input
            type="text"
            class="form-control"
            id="genre-input"
            name="genre"
            placeholder="ジャンルを入力してください（任意）"
          />
        </div>

        <div class="mb-3">
          <label for="product-url-input" class="form-label">商品リンク</label>
          <input
            type="url"
            class="form-control"
            id="product-url-input"
            name="productUrl"
            maxlength="2048"
            placeholder="https://example.com/product（任意）"
            aria-describedby="product-url-error"
          />
          <div id="product-url-error" class="invalid-feedback" role="alert"></div>
        </div>

        <div class="mb-3">
          <label for="product-image-input" class="form-label">商品画像</label>
          <input
            type="file"
            class="form-control"
            id="product-image-input"
            name="productImage"
            accept="image/jpeg,image/png"
            aria-describedby="product-image-help product-image-error"
          />
          <div id="product-image-help" class="form-text">
            JPEG/PNG形式、最大5MB
          </div>
          <div id="product-image-error" class="invalid-feedback" role="alert"></div>
          <div id="product-image-preview" class="mt-2" style="display: none;">
            <span class="badge bg-secondary" id="image-file-name"></span>
            <button type="button" class="btn btn-sm btn-outline-danger ms-2" id="remove-image-btn">
              削除
            </button>
          </div>
        </div>

        <div class="d-grid">
          <button
            type="submit"
            class="btn btn-primary"
            id="search-submit-btn"
            ${this.props.isLoading ? 'disabled' : ''}
          >
            ${this.props.isLoading
              ? '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>検索中...'
              : '検索'}
          </button>
        </div>
      </form>
    `;
  }

  /**
   * Bind form events: submit, input changes, file selection.
   */
  private bindEvents(): void {
    const form = this.container.querySelector('#search-input-form') as HTMLFormElement | null;
    if (form) {
      form.addEventListener('submit', (e: Event) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }

    // Clear field error on input
    const productNameInput = this.container.querySelector('#product-name-input');
    if (productNameInput) {
      productNameInput.addEventListener('input', () => {
        this.clearFieldError('productName');
      });
    }

    const productUrlInput = this.container.querySelector('#product-url-input');
    if (productUrlInput) {
      productUrlInput.addEventListener('input', () => {
        this.clearFieldError('productUrl');
      });
    }

    // File input handling
    const imageInput = this.container.querySelector('#product-image-input') as HTMLInputElement | null;
    if (imageInput) {
      imageInput.addEventListener('change', () => {
        this.handleImageChange(imageInput);
      });
    }

    // Remove image button
    const removeBtn = this.container.querySelector('#remove-image-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        this.removeImage();
      });
    }
  }

  /**
   * Handle form submission.
   */
  private handleSubmit(): void {
    if (this.props.isLoading) {
      return;
    }

    if (this.validate()) {
      const data = this.getFormData();
      this.props.onSearch(data);
    }
  }

  /**
   * Handle image file selection with validation.
   */
  private handleImageChange(input: HTMLInputElement): void {
    this.clearFieldError('productImage');
    const file = input.files?.[0] || null;

    if (!file) {
      this.selectedImage = null;
      this.hideImagePreview();
      return;
    }

    // Validate file type and size
    const acceptedTypes = ['image/jpeg', 'image/png'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!acceptedTypes.includes(file.type)) {
      this.errors.set('productImage', '画像はJPEGまたはPNG形式のみ対応しています');
      this.displayFieldError('productImage');
      this.selectedImage = null;
      input.value = '';
      this.hideImagePreview();
      return;
    }

    if (file.size > maxSize) {
      this.errors.set('productImage', '画像ファイルは5MB以内にしてください');
      this.displayFieldError('productImage');
      this.selectedImage = null;
      input.value = '';
      this.hideImagePreview();
      return;
    }

    this.selectedImage = file;
    this.showImagePreview(file.name);
  }

  /**
   * Remove the selected image.
   */
  private removeImage(): void {
    this.selectedImage = null;
    const input = this.container.querySelector('#product-image-input') as HTMLInputElement | null;
    if (input) {
      input.value = '';
    }
    this.hideImagePreview();
    this.clearFieldError('productImage');
  }

  /**
   * Show image file name preview.
   */
  private showImagePreview(fileName: string): void {
    const preview = this.container.querySelector('#product-image-preview') as HTMLElement | null;
    const nameEl = this.container.querySelector('#image-file-name') as HTMLElement | null;
    if (preview && nameEl) {
      nameEl.textContent = fileName;
      preview.style.display = 'block';
    }
  }

  /**
   * Hide image preview.
   */
  private hideImagePreview(): void {
    const preview = this.container.querySelector('#product-image-preview') as HTMLElement | null;
    if (preview) {
      preview.style.display = 'none';
    }
  }

  /**
   * Clear all validation errors from the UI.
   */
  private clearErrors(): void {
    this.errors.clear();

    const invalidInputs = this.container.querySelectorAll('.is-invalid');
    invalidInputs.forEach((el) => el.classList.remove('is-invalid'));

    const errorDivs = this.container.querySelectorAll('.invalid-feedback');
    errorDivs.forEach((el) => {
      el.textContent = '';
    });
  }

  /**
   * Clear a specific field's error.
   */
  private clearFieldError(field: string): void {
    this.errors.delete(field);
    const inputId = this.getInputIdForField(field);
    const input = this.container.querySelector(`#${inputId}-input`) as HTMLElement | null;
    if (input) {
      input.classList.remove('is-invalid');
    }
    const errorDiv = this.container.querySelector(`#${inputId}-error`) as HTMLElement | null;
    if (errorDiv) {
      errorDiv.textContent = '';
    }
  }

  /**
   * Display all current errors in the UI.
   */
  private displayErrors(): void {
    for (const [field] of this.errors) {
      this.displayFieldError(field);
    }
  }

  /**
   * Display a single field's error in the UI.
   */
  private displayFieldError(field: string): void {
    const message = this.errors.get(field);
    if (!message) return;

    const inputId = this.getInputIdForField(field);
    const input = this.container.querySelector(`#${inputId}-input`) as HTMLElement | null;
    if (input) {
      input.classList.add('is-invalid');
    }
    const errorDiv = this.container.querySelector(`#${inputId}-error`) as HTMLElement | null;
    if (errorDiv) {
      errorDiv.textContent = message;
    }
  }

  /**
   * Map field names to input element ID prefixes (without -input or -error suffix).
   */
  private getInputIdForField(field: string): string {
    switch (field) {
      case 'productName':
        return 'product-name';
      case 'productUrl':
        return 'product-url';
      case 'productImage':
        return 'product-image';
      default:
        return field;
    }
  }

  /**
   * Get the value of an input element by ID.
   */
  private getInputValue(id: string): string {
    const input = this.container.querySelector(`#${id}`) as HTMLInputElement | null;
    return input?.value ?? '';
  }

  /**
   * Destroy the component and clean up.
   */
  destroy(): void {
    this.container.innerHTML = '';
    this.errors.clear();
    this.selectedImage = null;
  }
}

/**
 * Factory function to create and mount a SearchInput component.
 */
export function createSearchInput(container: HTMLElement, props: SearchInputProps): SearchInput {
  return new SearchInput(container, props);
}
