import { urlService } from '../container';
import { NotFoundError } from '../errors';
import { toUrlResponse, toStatsResponse } from '../mappers/url';
import type { Request, Response } from 'express';

const urlController = {
  async findAll(req: Request, res: Response) {
    const urls = await urlService.findAll();
    res.json(urls.map(toUrlResponse));
  },

  async create(req: Request, res: Response) {
    const { url, customSlug, expiresIn } = req.body;

    const shortUrl = await urlService.create({ url, customSlug, expiresIn });

    res.status(201).json(toUrlResponse(shortUrl));
  },

  async stats(req: Request, res: Response) {
    const code = req.params.code as string;
    const stats = await urlService.getStats(code);

    if (!stats) throw new NotFoundError('URL not found');

    res.json(toStatsResponse(stats));
  },

  async remove(req: Request, res: Response) {
    const code = req.params.code as string;
    const deleted = await urlService.delete(code);

    if (!deleted) throw new NotFoundError('URL not found');

    res.json({ message: 'URL deleted successfully' });
  },
};

export default urlController;
