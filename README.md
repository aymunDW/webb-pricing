# The Webb Pricing — Cost & Pricing Studio

Tracks style-level cost basis (gold, stones, labor), price history over time, sales, and competitor comparisons. Gold price pulls live from a free public API.

## Stack
- **Backend**: Node.js + Express + PostgreSQL, JWT auth
- **Frontend**: React (Vite)
- **Gold price**: live from gold-api.com (free, no key needed), cached 5 minutes

## Structure
```
webb-pricing/
  server/     Express API
  client/     React frontend
```

## How pricing works
For each style you enter:
- Gold weight (grams) and karat
- Stone cost ($)
- Labor cost ($)
- Target markup (%)

The app fetches the live 24k gold spot price, converts it to your style's karat purity, multiplies by gold weight, adds stone + labor cost, and applies your markup to suggest a price. Every time you log a new price (e.g. an annual increase), it's saved with the gold price at that moment, so you can see exactly how much of a price change came from gold movement vs. a deliberate margin increase.

## 1. Local setup

### Backend
```bash
cd server
cp .env.example .env
# edit .env: set DATABASE_URL (a Postgres database) and a random JWT_SECRET
npm install
npm run migrate
npm start          # http://localhost:4000
```

### Frontend
```bash
cd client
cp .env.example .env
npm install
npm run dev         # http://localhost:5174
```

Register the first account — it becomes admin automatically, same pattern as The Webb Sourcing CRM.

## 2. Deploying (same pattern as the CRM)

### Backend + database on Railway
1. New Railway project → Database → PostgreSQL.
2. New service → GitHub Repo → this repo, set Root Directory to `server`.
3. Variables: `DATABASE_URL` (reference `${{Postgres.DATABASE_URL}}`), `JWT_SECRET`, `CLIENT_ORIGIN` (fill in after Vercel deploy).
4. Deploy, then run `npm run migrate` from the Console tab.
5. Settings → Networking → Generate Domain. Note the port your app logs on startup (Railway auto-assigns `PORT`) and set the domain's target port to match.

### Frontend on Vercel
1. Import this repo, Root Directory `client`.
2. Environment variable `VITE_API_URL` = `https://your-railway-url.up.railway.app/api`.
3. Deploy.
4. Back in Railway, set `CLIENT_ORIGIN` to the Vercel URL and redeploy.

## Notes on competitor prices
There's no automatic way to look up a competitor's price by style number — that data isn't publicly indexed. Competitor comparisons are entered manually per style (brand, item description, price, source link). If you want help sourcing comparable prices for specific pieces, that's something to look up case by case, not something the app can do on its own.
