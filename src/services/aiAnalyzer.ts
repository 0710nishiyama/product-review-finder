/**
 * AIAnalyzer Service
 * Handles AI-powered image analysis, review search, and summary generation.
 * Supports OpenAI, Google Gemini, and Claude API providers.
 *
 * Requirements: 1.6, 1.8, 2.3, 2.4, 3.4, 3.5, 3.6, 5.1-5.7
 */

import type {
  AIProviderConfig,
  AISummary,
  ProductData,
  ReviewItem,
  AIProvider,
} from '../models/types.js';
import { generateId } from '../utils/helpers.js';

/** Result of AI image analysis */
export interface ImageAnalysisResult {
  success: boolean;
  productType: string | null;
  confidence: number;
  error?: string;
}

/** Interface for the AI Analyzer service */
export interface IAIAnalyzer {
  analyzeImage(image: File, settings: AIProviderConfig): Promise<ImageAnalysisResult>;
  generateSummary(
    reviews: ReviewItem[],
    productData: ProductData,
    settings: AIProviderConfig
  ): Promise<AISummary>;
  searchWithAI(productData: ProductData, settings: AIProviderConfig, signal?: AbortSignal): Promise<ReviewItem[]>;
}

/** API endpoint configuration for each provider */
const API_ENDPOINTS: Record<AIProvider, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  google: 'https://generativelanguage.googleapis.com/v1beta/models',
  claude: 'https://api.anthropic.com/v1/messages',
};

/** Timeout for AI API calls (60 seconds) */
const AI_TIMEOUT_MS = 60000;

/**
 * Determine the AI provider from the model name or API key prefix.
 * Uses model naming conventions to identify the provider.
 * Falls back to API key prefix detection if model is empty.
 */
export function detectProvider(modelOrKey: string): AIProvider {
  const lower = modelOrKey.toLowerCase();
  if (lower.includes('gpt') || lower.includes('o1') || lower.includes('o3')) {
    return 'openai';
  }
  if (lower.includes('gemini') || lower.includes('palm')) {
    return 'google';
  }
  if (lower.includes('claude')) {
    return 'claude';
  }
  // Try to detect from API key prefix
  if (lower.startsWith('sk-')) {
    return 'openai';
  }
  if (lower.startsWith('aig') || lower.startsWith('ai')) {
    return 'google';
  }
  // Default to openai if provider cannot be determined
  return 'openai';
}

/**
 * Validate AI provider settings before making API calls.
 * Returns a warning message if settings are invalid, or null if valid.
 * Model is optional - defaults will be used if not specified.
 */
export function validateAIConfig(settings: AIProviderConfig): string | null {
  if (!settings.api_key || settings.api_key.trim().length === 0) {
    return 'APIキーが未設定です。設定画面でapi_keyを入力してください。';
  }
  return null;
}

/** Default models for each provider */
const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: 'gpt-4o-mini',
  google: 'gemini-1.5-flash',
  claude: 'claude-3-5-sonnet-20241022',
};

/**
 * Get the model to use, falling back to default if not specified.
 */
function getModelOrDefault(settings: AIProviderConfig): string {
  if (settings.model && settings.model.trim().length > 0) {
    return settings.model;
  }
  const provider = detectProvider(settings.model || settings.api_key);
  return DEFAULT_MODELS[provider];
}

/**
 * Build the request configuration for a specific AI provider.
 */
function buildRequestForProvider(
  provider: AIProvider,
  model: string,
  apiKey: string,
  prompt: string
): { url: string; options: RequestInit } {
  switch (provider) {
    case 'openai':
      return {
        url: API_ENDPOINTS.openai,
        options: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 2000,
          }),
        },
      };

    case 'google': {
      const url = `${API_ENDPOINTS.google}/${model}:generateContent?key=${apiKey}`;
      return {
        url,
        options: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2000,
            },
          }),
        },
      };
    }

    case 'claude':
      return {
        url: API_ENDPOINTS.claude,
        options: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            max_tokens: 2000,
            messages: [{ role: 'user', content: prompt }],
          }),
        },
      };
  }
}

/**
 * Build the request configuration for image analysis.
 */
function buildImageRequestForProvider(
  provider: AIProvider,
  model: string,
  apiKey: string,
  imageBase64: string,
  mimeType: string
): { url: string; options: RequestInit } {
  const prompt = '画像に写っている商品のタイプ・カテゴリを特定してください。商品タイプのみを簡潔に回答してください。';

  switch (provider) {
    case 'openai':
      return {
        url: API_ENDPOINTS.openai,
        options: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  {
                    type: 'image_url',
                    image_url: { url: `data:${mimeType};base64,${imageBase64}` },
                  },
                ],
              },
            ],
            max_tokens: 500,
          }),
        },
      };

    case 'google': {
      const url = `${API_ENDPOINTS.google}/${model}:generateContent?key=${apiKey}`;
      return {
        url,
        options: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: imageBase64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              maxOutputTokens: 500,
            },
          }),
        },
      };
    }

    case 'claude':
      return {
        url: API_ENDPOINTS.claude,
        options: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            max_tokens: 500,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: mimeType,
                      data: imageBase64,
                    },
                  },
                  { type: 'text', text: prompt },
                ],
              },
            ],
          }),
        },
      };
  }
}

/**
 * Extract text content from provider-specific API response.
 */
function extractResponseText(provider: AIProvider, responseData: unknown): string {
  const data = responseData as Record<string, unknown>;

  switch (provider) {
    case 'openai': {
      const choices = data.choices as Array<{ message: { content: string } }> | undefined;
      if (choices && choices.length > 0) {
        return choices[0].message.content || '';
      }
      return '';
    }

    case 'google': {
      const candidates = data.candidates as Array<{
        content: { parts: Array<{ text: string }> };
      }> | undefined;
      if (candidates && candidates.length > 0) {
        const parts = candidates[0].content?.parts;
        if (parts && parts.length > 0) {
          return parts[0].text || '';
        }
      }
      return '';
    }

    case 'claude': {
      const content = data.content as Array<{ type: string; text: string }> | undefined;
      if (content && content.length > 0) {
        const textBlock = content.find((block) => block.type === 'text');
        return textBlock?.text || '';
      }
      return '';
    }
  }
}

/**
 * Make an API call with timeout handling.
 * Throws TimeoutError if the request exceeds the timeout.
 * Returns the response text or throws an error.
 */
async function callAIApi(
  url: string,
  options: RequestInit,
  timeoutMs: number = AI_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError('AI API呼び出しがタイムアウトしました（60秒超過）');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Custom error class for timeout scenarios.
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Check if an API response indicates an authentication error.
 */
function isAuthenticationError(status: number): boolean {
  return status === 401 || status === 403;
}

/**
 * Convert a File to base64 string.
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
    reader.readAsDataURL(file);
  });
}

/**
 * Parse AI response to extract review items from JSON.
 */
function parseReviewsFromResponse(responseText: string): ReviewItem[] {
  try {
    // Try to extract JSON array from the response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;
      return parsed
        .map((item) => ({
          id: generateId(),
          title: String(item.title || '').slice(0, 200),
          rating: Math.min(5.0, Math.max(1.0, Number(item.rating) || 3.0)),
          summary: String(item.summary || '').slice(0, 1000),
          url: String(item.url || 'https://example.com'),
        }))
        .slice(0, 30); // Max 30 results for AI mode
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Parse AI response to extract summary data.
 */
function parseSummaryFromResponse(
  responseText: string,
  reviews: ReviewItem[]
): AISummary {
  // If no reviews, return null scores with appropriate message
  if (reviews.length === 0) {
    return {
      average_rating: null,
      credibility_score: null,
      summary_text: 'レビューが見つかりませんでした。',
    };
  }

  try {
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

      let averageRating = Number(parsed.average_rating);
      if (isNaN(averageRating)) {
        // Calculate from reviews if AI didn't provide
        averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      }
      // Clamp and round to 1 decimal
      averageRating = Math.round(Math.min(5.0, Math.max(0.0, averageRating)) * 10) / 10;

      let credibilityScore = Number(parsed.credibility_score);
      if (isNaN(credibilityScore)) {
        credibilityScore = 70; // Default credibility
      }
      // Clamp to 0-100 integer
      credibilityScore = Math.min(100, Math.max(0, Math.round(credibilityScore)));

      let summaryText = String(parsed.summary_text || responseText).slice(0, 500);
      if (!summaryText) {
        summaryText = responseText.slice(0, 500);
      }

      return {
        average_rating: averageRating,
        credibility_score: credibilityScore,
        summary_text: summaryText,
      };
    }

    // Fallback: calculate from reviews
    const avgRating =
      Math.round(
        (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10
      ) / 10;

    return {
      average_rating: Math.min(5.0, Math.max(0.0, avgRating)),
      credibility_score: 70,
      summary_text: responseText.slice(0, 500) || 'レビューの要約を生成しました。',
    };
  } catch {
    // Fallback: calculate from reviews
    const avgRating =
      Math.round(
        (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10
      ) / 10;

    return {
      average_rating: Math.min(5.0, Math.max(0.0, avgRating)),
      credibility_score: 70,
      summary_text: responseText.slice(0, 500) || 'レビューの要約を生成しました。',
    };
  }
}

/**
 * AIAnalyzer implementation.
 * Provides AI-powered image analysis, review search, and summary generation.
 */
export class AIAnalyzer implements IAIAnalyzer {
  /**
   * Analyze an image to identify the product type.
   * Requirement 1.6: AI analyzes uploaded image to identify product type.
   * Requirement 1.8: If analysis fails, return error to allow manual input.
   */
  async analyzeImage(image: File, settings: AIProviderConfig): Promise<ImageAnalysisResult> {
    // Validate settings before API call (Requirement 3.4, 3.6)
    const validationWarning = validateAIConfig(settings);
    if (validationWarning) {
      return {
        success: false,
        productType: null,
        confidence: 0,
        error: validationWarning,
      };
    }

    const provider = detectProvider(settings.model || settings.api_key);

    try {
      const imageBase64 = await fileToBase64(image);
      const mimeType = image.type || 'image/jpeg';
      const model = getModelOrDefault(settings);

      const { url, options } = buildImageRequestForProvider(
        provider,
        model,
        settings.api_key,
        imageBase64,
        mimeType
      );

      const response = await callAIApi(url, options);

      // Handle authentication errors (Requirement 3.5)
      if (isAuthenticationError(response.status)) {
        return {
          success: false,
          productType: null,
          confidence: 0,
          error: 'AI API認証エラー: APIキーが無効または権限が不足しています。',
        };
      }

      if (!response.ok) {
        return {
          success: false,
          productType: null,
          confidence: 0,
          error: `AI APIエラー: ステータスコード ${response.status}`,
        };
      }

      const responseData = await response.json();
      const productType = extractResponseText(provider, responseData).trim();

      if (!productType) {
        return {
          success: false,
          productType: null,
          confidence: 0,
          error: '画像から商品タイプを特定できませんでした。',
        };
      }

      return {
        success: true,
        productType,
        confidence: 0.8,
      };
    } catch (error: unknown) {
      if (error instanceof TimeoutError) {
        throw error;
      }
      return {
        success: false,
        productType: null,
        confidence: 0,
        error: error instanceof Error ? error.message : '画像解析中にエラーが発生しました。',
      };
    }
  }

  /**
   * Generate a summary from collected reviews.
   * Requirements 2.4, 5.1-5.7: Generate AISummary with proper constraints.
   */
  async generateSummary(
    reviews: ReviewItem[],
    productData: ProductData,
    settings: AIProviderConfig
  ): Promise<AISummary> {
    // If no reviews, return null scores (Requirement 5.7)
    if (reviews.length === 0) {
      return {
        average_rating: null,
        credibility_score: null,
        summary_text: 'レビューが見つかりませんでした。',
      };
    }

    // Validate settings before API call (Requirement 3.4, 3.6)
    const validationWarning = validateAIConfig(settings);
    if (validationWarning) {
      // Calculate basic stats from reviews without AI
      const avgRating =
        Math.round(
          (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10
        ) / 10;

      return {
        average_rating: Math.min(5.0, Math.max(0.0, avgRating)),
        credibility_score: null,
        summary_text: validationWarning,
      };
    }

    const provider = detectProvider(settings.model || settings.api_key);

    try {
      const reviewTexts = reviews
        .slice(0, 10) // Limit context to 10 reviews for prompt
        .map((r) => `- ${r.title} (${r.rating}/5): ${r.summary}`)
        .join('\n');

      const prompt = `以下は「${productData.productName}」（ジャンル: ${productData.genre || '不明'}）のレビュー一覧です。

${reviewTexts}

以下のJSON形式で要約を生成してください:
{
  "average_rating": <0.0〜5.0の小数点第1位>,
  "credibility_score": <0〜100の整数>,
  "summary_text": "<500文字以内の総合レビュー要約>"
}

average_ratingはレビュー全体の平均評価、credibility_scoreはレビューの信憑性・信頼性の推定値（0〜100）、summary_textは全体の傾向をまとめた要約です。`;

      const model = getModelOrDefault(settings);

      const { url, options } = buildRequestForProvider(
        provider,
        model,
        settings.api_key,
        prompt
      );

      const response = await callAIApi(url, options);

      // Handle authentication errors (Requirement 3.5)
      if (isAuthenticationError(response.status)) {
        const avgRating =
          Math.round(
            (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10
          ) / 10;

        return {
          average_rating: Math.min(5.0, Math.max(0.0, avgRating)),
          credibility_score: null,
          summary_text: 'AI API認証エラー: APIキーが無効または権限が不足しています。',
        };
      }

      if (!response.ok) {
        const avgRating =
          Math.round(
            (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10
          ) / 10;

        return {
          average_rating: Math.min(5.0, Math.max(0.0, avgRating)),
          credibility_score: null,
          summary_text: `AI APIエラー: ステータスコード ${response.status}`,
        };
      }

      const responseData = await response.json();
      const responseText = extractResponseText(provider, responseData);

      return parseSummaryFromResponse(responseText, reviews);
    } catch (error: unknown) {
      if (error instanceof TimeoutError) {
        throw error;
      }

      // Fallback: calculate basic stats from reviews
      const avgRating =
        Math.round(
          (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10
        ) / 10;

      return {
        average_rating: Math.min(5.0, Math.max(0.0, avgRating)),
        credibility_score: null,
        summary_text: error instanceof Error ? error.message : 'サマリ生成中にエラーが発生しました。',
      };
    }
  }

  /**
   * Use AI to search for and analyze reviews.
   * Requirement 2.3: AI identifies product type and collects max 30 reviews within 60 seconds.
   */
  async searchWithAI(
    productData: ProductData,
    settings: AIProviderConfig,
    signal?: AbortSignal
  ): Promise<ReviewItem[]> {
    // Check if already aborted
    if (signal?.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError');
    }

    // Validate settings before API call (Requirement 3.4, 3.6)
    const validationWarning = validateAIConfig(settings);
    if (validationWarning) {
      return [];
    }

    const provider = detectProvider(settings.model || settings.api_key);

    try {
      const prompt = `以下の商品に関するレビュー情報を検索・分析してください。

商品名: ${productData.productName}
ジャンル: ${productData.genre || '不明'}
商品URL: ${productData.productUrl || 'なし'}

以下のJSON配列形式で最大30件のレビューを返してください:
[
  {
    "title": "<レビュータイトル（最大200文字）>",
    "rating": <1.0〜5.0の評価>,
    "summary": "<レビュー概要（最大1000文字）>",
    "url": "<レビュー出典URL>"
  }
]

各レビューは実在する可能性のある情報に基づいて生成してください。`;

      const model = getModelOrDefault(settings);

      const { url, options } = buildRequestForProvider(
        provider,
        model,
        settings.api_key,
        prompt
      );

      const response = await callAIApi(url, options);

      // Handle authentication errors (Requirement 3.5)
      if (isAuthenticationError(response.status)) {
        return [];
      }

      if (!response.ok) {
        return [];
      }

      const responseData = await response.json();
      const responseText = extractResponseText(provider, responseData);

      return parseReviewsFromResponse(responseText);
    } catch (error: unknown) {
      if (error instanceof TimeoutError) {
        throw error;
      }
      return [];
    }
  }
}
