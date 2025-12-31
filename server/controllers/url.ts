import urlService from '../services/url';

const urlController = {
  async findAll(req, res) {
    try {
      const urls = await urlService.findAll();
      res.json(urls);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get URLs' });
    }
  },

  async create(req, res) {
    try {
      const { url, expiresIn } = req.body;

      if (!url) {
        res.status(400).json({ error: 'URL is required' });
        return;
      }

      try {
        new URL(url);
      } catch {
        res.status(400).json({ error: 'Invalid URL format' });
        return;
      }

      let expiresAt: Date | undefined;
      if (expiresIn && typeof expiresIn === 'number' && expiresIn > 0) {
        expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + expiresIn);
      }

      const shortUrl = await urlService.create(url, expiresAt);

      res.status(201).json({
        id: shortUrl.id,
        shortCode: shortUrl.shortCode,
        originalUrl: shortUrl.originalUrl,
        expiresAt: shortUrl.expiresAt,
        createdAt: shortUrl.createdAt,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create URL';
      res.status(400).json({ error: message });
    }
  },

  async stats(req, res) {
    try {
      const { code } = req.params;
      const stats = await urlService.getStats(code);

      if (!stats) {
        res.status(404).json({ error: 'URL not found' });
        return;
      }

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get stats' });
    }
  },

  async remove(req, res) {
    try {
      const { code } = req.params;
      const deleted = await urlService.delete(code);

      if (!deleted) {
        res.status(404).json({ error: 'URL not found' });
        return;
      }

      res.json({ message: 'URL deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete URL' });
    }
  },
};

export default urlController;
