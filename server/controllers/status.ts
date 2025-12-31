const statusController = {
  async getStatus(req, res) {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  },
};

export default statusController;
