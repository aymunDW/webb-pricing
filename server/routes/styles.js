import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { getGoldPricePerOz, pricePerGramForKarat } from '../lib/goldPrice.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const result = await pool.query(`
    SELECT s.*,
      (SELECT price FROM price_history WHERE style_id = s.id ORDER BY effective_date DESC, created_at DESC LIMIT 1) AS current_price,
      (SELECT effective_date FROM price_history WHERE style_id = s.id ORDER BY effective_date DESC, created_at DESC LIMIT 1) AS current_price_date,
      (SELECT COALESCE(SUM(quantity),0) FROM sales WHERE style_id = s.id) AS total_units_sold,
      (SELECT COALESCE(SUM(quantity * unit_price),0) FROM sales WHERE style_id = s.id) AS total_revenue
    FROM styles s
    ORDER BY s.created_at DESC
  `);
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const { styleNumber, description, category, goldWeightG, goldKarat, stoneCost, laborCost, targetMarginPct, notes } = req.body;
  if (!styleNumber) return res.status(400).json({ error: 'Style number is required' });
  try {
    const result = await pool.query(
      `INSERT INTO styles (style_number, description, category, gold_weight_g, gold_karat, stone_cost, labor_cost, target_margin_pct, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [styleNumber, description, category, goldWeightG || 0, goldKarat || 18, stoneCost || 0, laborCost || 0, targetMarginPct || 100, notes]
    );
    res.json(result.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'That style number already exists' });
    console.error(e);
    res.status(500).json({ error: 'Failed to create style' });
  }
});

router.put('/:id', async (req, res) => {
  const { styleNumber, description, category, goldWeightG, goldKarat, stoneCost, laborCost, targetMarginPct, notes } = req.body;
  const result = await pool.query(
    `UPDATE styles SET style_number=$1, description=$2, category=$3, gold_weight_g=$4, gold_karat=$5,
     stone_cost=$6, labor_cost=$7, target_margin_pct=$8, notes=$9, updated_at=now() WHERE id=$10 RETURNING *`,
    [styleNumber, description, category, goldWeightG || 0, goldKarat || 18, stoneCost || 0, laborCost || 0, targetMarginPct || 100, notes, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Style not found' });
  res.json(result.rows[0]);
});

router.delete('/:id', async (req, res) => {
  const result = await pool.query('DELETE FROM styles WHERE id=$1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Style not found' });
  res.json({ ok: true });
});

// Full detail for one style: cost breakdown, price history, sales, competitor prices
router.get('/:id/detail', async (req, res) => {
  const styleRes = await pool.query('SELECT * FROM styles WHERE id=$1', [req.params.id]);
  const style = styleRes.rows[0];
  if (!style) return res.status(404).json({ error: 'Style not found' });

  const [priceHistory, sales, competitors] = await Promise.all([
    pool.query('SELECT * FROM price_history WHERE style_id=$1 ORDER BY effective_date DESC, created_at DESC', [req.params.id]),
    pool.query('SELECT * FROM sales WHERE style_id=$1 ORDER BY sale_date DESC, created_at DESC', [req.params.id]),
    pool.query('SELECT * FROM competitor_prices WHERE style_id=$1 ORDER BY checked_date DESC', [req.params.id]),
  ]);

  const goldPricePerOz = await getGoldPricePerOz();
  const goldPricePerGram = pricePerGramForKarat(goldPricePerOz, style.gold_karat);
  const goldCost = Number(style.gold_weight_g) * goldPricePerGram;
  const totalCost = goldCost + Number(style.stone_cost) + Number(style.labor_cost);
  const suggestedPrice = totalCost * (1 + Number(style.target_margin_pct) / 100);

  const totalUnitsSold = sales.rows.reduce((sum, s) => sum + s.quantity, 0);
  const totalRevenue = sales.rows.reduce((sum, s) => sum + s.quantity * Number(s.unit_price), 0);
  const currentPrice = priceHistory.rows[0]?.price || null;

  res.json({
    style,
    costBreakdown: { goldPricePerOz, goldPricePerGram, goldCost, stoneCost: Number(style.stone_cost), laborCost: Number(style.labor_cost), totalCost, suggestedPrice },
    priceHistory: priceHistory.rows,
    sales: sales.rows,
    competitors: competitors.rows,
    currentPrice,
    totalUnitsSold,
    totalRevenue,
  });
});

export default router;
