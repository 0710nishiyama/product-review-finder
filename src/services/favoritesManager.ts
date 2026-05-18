/**
 * FavoritesManager Service
 * Manages favorite reviews with localStorage persistence.
 * Enforces a 200-entry maximum and provides ordered retrieval.
 */

import type { ReviewItem, FavoriteItem, SearchMode } from '../models/types.js';
import { generateId } from '../utils/helpers.js';

const STORAGE_KEY = 'review-finder-favorites';
const MAX_FAVORITES = 200;

export interface AddResult {
  success: boolean;
  error?: 'LIMIT_REACHED';
}

export interface IFavoritesManager {
  add(review: ReviewItem, searchContext?: { productName: string; searchMode: SearchMode }): AddResult;
  remove(reviewId: string): void;
  getAll(): FavoriteItem[];
  isFavorited(reviewId: string): boolean;
  getCount(): number;
}

export class FavoritesManager implements IFavoritesManager {
  /**
   * Add a review to favorites.
   * Creates a FavoriteItem with UUID and ISO timestamp.
   * Rejects additions when the 200-entry limit is reached.
   */
  add(review: ReviewItem, searchContext: { productName: string; searchMode: SearchMode } = { productName: '', searchMode: 'non-AI' }): AddResult {
    const favorites = this.loadFavorites();

    if (favorites.length >= MAX_FAVORITES) {
      return { success: false, error: 'LIMIT_REACHED' };
    }

    const favoriteItem: FavoriteItem = {
      id: generateId(),
      addedAt: new Date().toISOString(),
      review,
      searchContext,
    };

    favorites.push(favoriteItem);
    this.saveFavorites(favorites);

    return { success: true };
  }

  /**
   * Remove a favorite by review ID.
   * Finds the favorite containing the matching review and removes it.
   */
  remove(reviewId: string): void {
    const favorites = this.loadFavorites();
    const filtered = favorites.filter(fav => fav.review.id !== reviewId);
    this.saveFavorites(filtered);
  }

  /**
   * Get all favorites ordered by addedAt descending (newest first).
   */
  getAll(): FavoriteItem[] {
    const favorites = this.loadFavorites();
    return favorites.sort((a, b) => {
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
    });
  }

  /**
   * Check if a review exists in favorites by review ID.
   */
  isFavorited(reviewId: string): boolean {
    const favorites = this.loadFavorites();
    return favorites.some(fav => fav.review.id === reviewId);
  }

  /**
   * Get the current count of favorites.
   */
  getCount(): number {
    return this.loadFavorites().length;
  }

  /**
   * Load favorites from localStorage.
   */
  private loadFavorites(): FavoriteItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        return [];
      }
      return JSON.parse(data) as FavoriteItem[];
    } catch {
      return [];
    }
  }

  /**
   * Save favorites to localStorage.
   */
  private saveFavorites(favorites: FavoriteItem[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }
}
