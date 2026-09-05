import urlService from '../services/url';
import { NotFoundError } from '../errors';
import { currentUser } from '../middlewares/auth';
import { toUrlResponse, toStatsResponse } from '../mappers/url';
import type { Request, Response } from 'express';

const urlController = {
  async findAll(req: Request, res: Response) {
    const urls = await urlService.findAll(currentUser(req).id);
    res.json(urls.map(toUrlResponse));
  },

  async create(req: Request, res: Response) {
    const { url, customSlug, expiresIn } = req.body;

    const shortUrl = await urlService.create(
      { url, customSlug, expiresIn },
      currentUser(req).id,
    );

    res.status(201).json(toUrlResponse(shortUrl));
  },

  async stats(req: Request, res: Response) {
    const code = req.params.code as string;
    const stats = await urlService.getStats(code, currentUser(req).id);

    if (!stats) throw new NotFoundError('URL not found');

    res.json(toStatsResponse(stats));
  },

  async remove(req: Request, res: Response) {
    const code = req.params.code as string;
    const deleted = await urlService.delete(code, currentUser(req).id);

    if (!deleted) throw new NotFoundError('URL not found');

    res.json({ message: 'URL deleted successfully' });
  },
};

export default urlController;
