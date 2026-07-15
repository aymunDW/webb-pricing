import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { getGoldPricePerOz } from '../lib/goldPrice.js';

const router = Router();
router.use(requireAuth);

router.post('/', async (req, res) => {
  const { styleId, price, effectiveDate, note } = req.body;
  if (!styleId || price == null) return res.status(400).json({ error: 'styleId and price are required' });
  const goldPrice = await getGoldPricePerOz();
  const result = await pool.query(
    `INSERT INTO price_history (style_id, price, effective_date, gold_price_at_time, note)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [styleId, price, effectiveDate || new Date().toISOString().slice(0,10), goldPrice, note]
  );
  res.json(result.rows[0]);
});

router.delete('/:id', async (req, res) => {
  const result = await pool.query('DELETE FROM price_history WHERE id=$1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Entry not found' });
  res.json({ ok: true });
});

export default router;
