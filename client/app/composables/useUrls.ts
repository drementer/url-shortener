import type {
  ShortUrl,
  CreateUrlPayload,
  UrlStats,
} from '~/types/api';

/**
 * URL Shortener API service composable
 * Handles all URL-related API operations
 */
export const useUrls = () => {
  const { api } = useApi();

  const createShortUrl = (payload: CreateUrlPayload) => {
    return api<ShortUrl>('/api/urls', {
      method: 'POST',
      body: payload,
    });
  };

  const getUrl = (shortCode: string) => {
    return api<ShortUrl>(`/api/urls/${shortCode}`);
  };

  const getUrlStats = (shortCode: string) => {
    return api<UrlStats>(`/api/urls/${shortCode}`);
  };

  const listUrls = () => {
    return api<ShortUrl[]>('/api/urls');
  };

  const deleteUrl = (shortCode: string) => {
    return api<null>(`/api/urls/${shortCode}`, {
      method: 'DELETE',
    });
  };

  return {
    createShortUrl,
    getUrl,
    getUrlStats,
    listUrls,
    deleteUrl,
  };
};
