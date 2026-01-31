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
  shortCode: string;
  originalUrl: string;
  totalClicks: number;
  uniqueClicks: number;
  createdAt: string;
  lastClickedAt?: string;
  clicks?: ClickDetail[];
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
