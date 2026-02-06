import { api } from '@/lib/api';
import type {
  CreateUrlPayload,
  CreateUrlResponse,
  UrlStatsResponse,
} from '@/types/api';

export function useUrls() {
  const createShortUrl = async (
    url: string,
    customSlug?: string,
  ): Promise<CreateUrlResponse> => {
    const response = await api.post('/api/urls', { url, customSlug });
    return response.data;
  };

  const getUrlStats = async (code: string): Promise<UrlStatsResponse> => {
    const response = await api.get(`/api/urls/${encodeURIComponent(code)}`);
    return response.data;
  };

  return { createShortUrl, getUrlStats };
}
