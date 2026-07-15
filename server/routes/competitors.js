import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.post('/', async (req, res) => {
  const { styleId, brand, itemDescription, price, sourceUrl, notes, checkedDate } = req.body;
  if (!styleId || !brand) return res.status(400).json({ error: 'styleId and brand are required' });
  const result = await pool.query(
    `INSERT INTO competitor_prices (style_id, brand, item_description, price, source_url, notes, checked_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [styleId, brand, itemDescription, price || null, sourceUrl, notes, checkedDate || new Date().toISOString().slice(0,10)]
  );
  res.json(result.rows[0]);
});

router.delete('/:id', async (req, res) => {
  const result = await pool.query('DELETE FROM competitor_prices WHERE id=$1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Entry not found' });
  res.json({ ok: true });
});

export default router;
