import {
  createUrl,
  deleteUrl,
  findAllUrls,
  getUrlStats,
} from '../use-cases/url';
import { currentUser } from '../middlewares/auth';
import { toUrlResponse, toStatsResponse } from '../mappers/url';
import type { Request, Response } from 'express';

const urlController = {
  async findAll(req: Request, res: Response) {
    const urls = await findAllUrls(currentUser(req).id);
    res.json(urls.map(toUrlResponse));
  },

  async create(req: Request, res: Response) {
    const { url, customSlug, expiresIn } = req.body;

    const shortUrl = await createUrl(
      { url, customSlug, expiresIn },
      currentUser(req).id,
    );

    res.status(201).json(toUrlResponse(shortUrl));
  },

  async stats(req: Request, res: Response) {
    const code = req.params.code as string;
    const stats = await getUrlStats(code, currentUser(req).id);

    res.json(toStatsResponse(stats));
  },

  async remove(req: Request, res: Response) {
    const code = req.params.code as string;
    await deleteUrl(code, currentUser(req).id);

    res.json({ message: 'URL deleted successfully' });
  },
};

export default urlController;
