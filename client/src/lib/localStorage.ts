import type { CreateUrlResponse } from '@/types/api';

const STORAGE_KEY = 'shortened-urls';

export const urlStorage = {
  /**
   * Save a new URL to localStorage
   * Adds the URL to the beginning of the array (most recent first)
   */
  saveUrl(url: CreateUrlResponse): void {
    try {
      const urls = this.getUrls();
      urls.unshift(url); // Add to beginning
      localStorage.setItem(STORAGE_KEY, JSON.stringify(urls));
    } catch (error) {
      console.error('Failed to save URL to localStorage:', error);
    }
  },

  /**
   * Get all saved URLs from localStorage
   * Returns empty array if no URLs exist or on error
   */
  getUrls(): CreateUrlResponse[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data) as CreateUrlResponse[];
    } catch (error) {
      console.error('Failed to get URLs from localStorage:', error);
      return [];
    }
  },

  /**
   * Clear all saved URLs from localStorage
   */
  clearUrls(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear URLs from localStorage:', error);
    }
  },
};
