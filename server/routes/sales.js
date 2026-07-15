import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.post('/', async (req, res) => {
  const { styleId, saleDate, quantity, unitPrice, notes } = req.body;
  if (!styleId || unitPrice == null) return res.status(400).json({ error: 'styleId and unitPrice are required' });
  const result = await pool.query(
    `INSERT INTO sales (style_id, sale_date, quantity, unit_price, notes)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [styleId, saleDate || new Date().toISOString().slice(0,10), quantity || 1, unitPrice, notes]
  );
  res.json(result.rows[0]);
});

router.delete('/:id', async (req, res) => {
  const result = await pool.query('DELETE FROM sales WHERE id=$1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Sale not found' });
  res.json({ ok: true });
});

export default router;
