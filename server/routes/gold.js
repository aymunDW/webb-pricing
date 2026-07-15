import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getGoldPricePerOz, pricePerGramForKarat, KARAT_PURITY } from '../lib/goldPrice.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const pricePerOz = await getGoldPricePerOz();
  const perGramByKarat = {};
  Object.keys(KARAT_PURITY).forEach(k => {
    perGramByKarat[k] = pricePerGramForKarat(pricePerOz, Number(k));
  });
  res.json({ pricePerOz, perGramByKarat, updatedAt: new Date().toISOString() });
});

export default router;
