import urlService from '../services/url';
import type { Request, Response, NextFunction } from 'express';

/**
 * Redirect handler - to be mounted at /:code in main router
 */
const handleRedirect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const code = req.params.code as string;
    const clientUrl = process.env.CLIENT_URL;

    const result = await urlService.recordClick(code, {
      userAgent: req.get('user-agent'),
      referer: req.get('referer'),
      ip: req.ip,
    });

    if (result.status === 'not_found') {
      res.redirect(301, `${clientUrl}/404`);
      return;
    }

    if (result.status === 'expired') {
      res.redirect(301, `${clientUrl}/expired/${code}`);
      return;
    }

    res.redirect(301, result.url.originalUrl);
  } catch (error) {
    next(error);
  }
};

export default handleRedirect;
