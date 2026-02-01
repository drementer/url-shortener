import { api } from '@/lib/api';
import type {
  CreateUrlPayload,
  CreateUrlResponse,
  UrlStatsResponse,
} from '@/types/api';

export function useUrls() {
  const createShortUrl = async (
    payload: CreateUrlPayload
  ): Promise<CreateUrlResponse> => {
    const body: { url: string } = payload;
    return api.post('/api/urls', body);
  };

  const getUrlStats = async (code: string): Promise<UrlStatsResponse> => {
    return api.get(`/api/urls/${encodeURIComponent(code)}`);
  };

  return { createShortUrl, getUrlStats };
}
