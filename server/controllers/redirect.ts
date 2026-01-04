import urlService from '../services/url';

/**
 * Redirect handler - to be mounted at /:code in main router
 */
const handleRedirect = async (req, res, next) => {
  try {
    const { code } = req.params;

    const url = await urlService.recordClick(code, {
      userAgent: req.get('user-agent'),
      referer: req.get('referer'),
      ip: req.ip,
    });

    if (!url) {
      res.status(404).json({ error: 'URL not found or expired' });
      return;
    }

    res.redirect(301, url.originalUrl);
  } catch (error) {
    next(error);
  }
};

export default handleRedirect;
