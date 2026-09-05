import urlRepository from './repositories/url';
import clickRepository from './repositories/click';
import { createUrlService } from './services/url';

/**
 * Composition root: the single place where the business rules are wired to a
 * concrete storage implementation.
 */
const urlService = createUrlService({ urlRepository, clickRepository });

export { urlService };
