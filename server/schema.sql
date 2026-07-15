-- The Webb Pricing schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_number TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT,
  gold_weight_g NUMERIC(10,3) DEFAULT 0,
  gold_karat INTEGER DEFAULT 18,   -- 24, 22, 18, 14, 10
  stone_cost NUMERIC(12,2) DEFAULT 0,
  labor_cost NUMERIC(12,2) DEFAULT 0,
  target_margin_pct NUMERIC(6,2) DEFAULT 100,  -- markup % over cost
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id UUID REFERENCES styles(id) ON DELETE CASCADE,
  price NUMERIC(12,2) NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  gold_price_at_time NUMERIC(12,2),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id UUID REFERENCES styles(id) ON DELETE CASCADE,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS competitor_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id UUID REFERENCES styles(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  item_description TEXT,
  price NUMERIC(12,2),
  source_url TEXT,
  notes TEXT,
  checked_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_history_style ON price_history(style_id, effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_style ON sales(style_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_competitor_style ON competitor_prices(style_id);
