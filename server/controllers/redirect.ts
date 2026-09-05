import { urlService } from '../container';
import { env } from '../configs/env';
import type { Request, Response } from 'express';

/**
 * Redirect handler - to be mounted at /:code in main router.
 *
 * Answers 302 rather than 301: a permanent redirect is cached by the browser,
 * which would hide repeat clicks from the statistics and keep a deleted or
 * expired link working for anyone who visited it before.
 */
const handleRedirect = async (req: Request, res: Response) => {
  const code = req.params.code as string;

  const { status, url } = await urlService.resolveRedirect(code, {
    userAgent: req.get('user-agent'),
    referer: req.get('referer'),
    ip: req.ip,
  });

  if (status === 'not_found') {
    res.redirect(302, `${env.CLIENT_URL}/404`);
    return;
  }

  if (status === 'expired') {
    res.redirect(302, `${env.CLIENT_URL}/expired/${code}`);
    return;
  }

  res.redirect(302, url.originalUrl);
};

export default handleRedirect;
