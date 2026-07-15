import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import goldRoutes from './routes/gold.js';
import styleRoutes from './routes/styles.js';
import priceHistoryRoutes from './routes/priceHistory.js';
import salesRoutes from './routes/sales.js';
import competitorRoutes from './routes/competitors.js';

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/gold-price', goldRoutes);
app.use('/api/styles', styleRoutes);
app.use('/api/price-history', priceHistoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/competitors', competitorRoutes);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`The Webb Pricing API running on port ${port}`));
