import type {
  NewClick,
  NewUrl,
  Url,
  UrlWithClickCount,
  UrlWithClickEvents,
} from '../entities/url';

/**
 * Contracts the service layer requires from storage. The repositories depend on
 * these, not the other way around, so the business rules stay the inner layer.
 */
type UrlRepository = {
  findAll(): Promise<UrlWithClickCount[]>;
  create(url: NewUrl): Promise<Url>;
  findByShortCode(shortCode: string): Promise<Url | null>;
  findByShortCodeWithClicks(
    shortCode: string,
  ): Promise<UrlWithClickEvents | null>;
  delete(shortCode: string): Promise<number>;
};

type ClickRepository = {
  create(click: NewClick): Promise<unknown>;
};

export type { UrlRepository, ClickRepository };
