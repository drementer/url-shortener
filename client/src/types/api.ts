export interface ShortUrl {
  id: string;
  shortCode: string;
  originalUrl: string;
  shortUrl: string;
  createdAt: string;
  expiresAt?: string;
}

export interface CreateUrlPayload {
  url: string;
  customCode?: string;
  expiresAt?: string;
}

export interface UrlStats {
  clicks: number;
  uniqueClicks: number;
  createdAt: string;
  lastClickedAt: string;
  clickEvents?: ClickDetail[];
}

export interface ClickDetail {
  timestamp: string;
  userAgent?: string;
  referer?: string;
  country?: string;
  city?: string;
}

export interface ApiError {
  success: false;
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

/** Backend create response (POST /api/urls) */
export interface CreateUrlResponse {
  id: string;
  shortCode: string;
  originalUrl: string;
  expiresAt: string | null;
  createdAt: string;
}

/** Backend stats response (GET /api/urls/:code) */
export interface UrlStatsResponse {
  id: string;
  shortCode: string;
  originalUrl: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  clicks: number;
  clickEvents: Array<{
    id: string;
    urlId: string;
    userAgent: string | null;
    referer: string | null;
    ip: string | null;
    createdAt: string;
  }>;
}
