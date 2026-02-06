import type { Request, Response } from 'express';

const statusController = {
  async getStatus(req: Request, res: Response) {
    const timestamp = new Date().toISOString();
    return res.json({ status: 'ok', timestamp });
  },
};

export default statusController;
