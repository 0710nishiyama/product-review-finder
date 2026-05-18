/**
 * Data Model Interfaces
 * All TypeScript interfaces for the Product Review Finder application.
 */

/** Search mode type */
export type SearchMode = 'non-AI' | 'AI';

/** AI provider type */
export type AIProvider = 'openai' | 'google' | 'claude';

/** Product input data */
export interface ProductData {
  productName: string;       // Required, 1-100 chars, non-whitespace-only
  genre: string;             // Optional
  productUrl: string;        // Optional, http/https, max 2048 chars
  productImage: File | null; // Optional, JPEG/PNG, max 5MB
}

/** Pagination info */
export interface Pager {
  page: number;   // >= 1 (current page)
  pages: number;  // >= 0 (total pages)
}

/** AI settings output in search results */
export interface AISettingsOutput {
  model: string;                  // AI model name
  confidence_threshold: number;   // 0.0-1.0
}

/** AI-generated summary */
export interface AISummary {
  average_rating: number | null;      // 0.0-5.0 (1 decimal), null when 0 reviews
  credibility_score: number | null;   // 0-100 integer, null when 0 reviews
  summary_text: string;               // Max 500 chars
}

/** Individual review item */
export interface ReviewItem {
  id: string;          // UUID v4
  title: string;       // Max 200 chars
  rating: number;      // 1.0-5.0
  summary: string;     // Max 1000 chars
  url: string;         // Valid URL
}

/** Search result structure */
export interface SearchResult {
  search_mode: 'AI' | 'non-AI';
  total_hits: number;           // >= 0
  pager: Pager;
  ai_settings: AISettingsOutput | null;
  ai_summary: AISummary | null;
  reviews: ReviewItem[];        // 0-10 items per page
}

/** AI provider configuration */
export interface AIProviderConfig {
  api_key: string;
  model: string;
}

/** AI settings */
export interface AISettings {
  activeProvider: AIProvider;
  providers: {
    openai: AIProviderConfig;
    google: AIProviderConfig;
    claude: AIProviderConfig;
  };
}

/** Search history entry */
export interface HistoryEntry {
  id: string;                // UUID v4
  timestamp: string;         // ISO 8601
  productData: {
    productName: string;
    genre: string;
    productUrl: string;
  };
  searchMode: SearchMode;
  totalHits: number;
}

/** Favorite item */
export interface FavoriteItem {
  id: string;              // UUID v4
  addedAt: string;         // ISO 8601
  review: ReviewItem;
  searchContext: {
    productName: string;
    searchMode: SearchMode;
  };
}

/** Application error */
export interface AppError {
  type: 'validation' | 'api' | 'timeout' | 'storage' | 'navigation';
  code: string;
  message: string;        // User-facing message
  field?: string;         // Field name for validation errors
  retryable: boolean;
}
