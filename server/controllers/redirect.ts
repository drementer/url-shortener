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

    const url = await urlService.recordClick(code, {
      userAgent: req.get('user-agent'),
      referer: req.get('referer'),
      ip: req.ip,
    });

    if (!url) {
      res.redirect(301, `${process.env.CLIENT_URL}/404`);
      return;
    }

    res.redirect(301, url.originalUrl);
  } catch (error) {
    next(error);
  }
};

export default handleRedirect;
