import express from 'express';
import urlController from '../controllers/url';

const router = express.Router();

router.get('/', urlController.findAll);
router.post('/', urlController.create);
router.get('/:code', urlController.stats);
router.delete('/:code', urlController.remove);

export default router;
