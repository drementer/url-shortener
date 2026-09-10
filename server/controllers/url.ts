import {
  createUrl,
  deleteUrl,
  findAllUrls,
  getUrlStats,
} from '../use-cases/url';
import { currentUser } from '../middlewares/auth';
import {
  toUrlResponse,
  toStatsResponse,
  toPagedUrlsResponse,
} from '../mappers/url';
import type { Request, Response } from 'express';
import type { ListUrlsQuery } from '../validators/url';

const urlController = {
  async findAll(req: Request, res: Response) {
    const page = res.locals.query as ListUrlsQuery;
    const urls = await findAllUrls(currentUser(req).id, page);

    res.json(toPagedUrlsResponse(urls, page));
  },

  async create(req: Request, res: Response) {
    const { url, customSlug, expiresIn } = req.body;

    const shortUrl = await createUrl(
      { url, customSlug, expiresIn },
      currentUser(req).id,
    );

    res
      .location(`/api/urls/${shortUrl.shortCode}`)
      .status(201)
      .json(toUrlResponse(shortUrl));
  },

  async stats(req: Request, res: Response) {
    const code = req.params.code as string;
    const stats = await getUrlStats(code, currentUser(req).id);

    res.json(toStatsResponse(stats));
  },

  async remove(req: Request, res: Response) {
    const code = req.params.code as string;
    await deleteUrl(code, currentUser(req).id);

    res.status(204).end();
  },
};

export default urlController;
