/**
 * HistoryManager Service
 * Manages search history entries in localStorage.
 * Enforces a 100-entry maximum and provides reverse chronological retrieval.
 */

import type { HistoryEntry, SearchMode } from '../models/types.js';
import { generateId } from '../utils/helpers.js';

const STORAGE_KEY = 'review-finder-history';
const MAX_ENTRIES = 100;
const DEFAULT_LIMIT = 50;

export interface IHistoryManager {
  addEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): void;
  getEntries(limit?: number): HistoryEntry[];
  clearAll(): void;
}

export class HistoryManager implements IHistoryManager {
  /**
   * Add a new history entry.
   * Creates a HistoryEntry with a UUID and ISO timestamp.
   * If the store exceeds 100 entries, the oldest entry is removed.
   */
  addEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): void {
    const entries = this.loadEntries();

    const newEntry: HistoryEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      productData: entry.productData,
      searchMode: entry.searchMode,
      totalHits: entry.totalHits,
    };

    entries.push(newEntry);

    // Enforce 100-entry maximum, removing oldest first
    while (entries.length > MAX_ENTRIES) {
      entries.shift();
    }

    this.saveEntries(entries);
  }

  /**
   * Get history entries in reverse chronological order.
   * @param limit Maximum number of entries to return (default 50)
   */
  getEntries(limit: number = DEFAULT_LIMIT): HistoryEntry[] {
    const entries = this.loadEntries();

    // Sort by timestamp descending (newest first).
    // For entries with the same timestamp, preserve insertion order (later index = newer).
    const indexed = entries.map((entry, idx) => ({ entry, idx }));
    indexed.sort((a, b) => {
      const timeDiff = new Date(b.entry.timestamp).getTime() - new Date(a.entry.timestamp).getTime();
      if (timeDiff !== 0) return timeDiff;
      return b.idx - a.idx; // Higher index = added later = newer
    });

    return indexed.slice(0, limit).map(item => item.entry);
  }

  /**
   * Clear all history entries.
   */
  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  private loadEntries(): HistoryEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        return [];
      }
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed;
    } catch {
      return [];
    }
  }

  private saveEntries(entries: HistoryEntry[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }
}
