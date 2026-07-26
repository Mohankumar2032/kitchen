# Kitchen

E-commerce store for kitchen appliances (FE + BE in one Next.js app) for Vercel.

Repo: [Mohankumar2032/kitchen](https://github.com/Mohankumar2032/kitchen)

## Business model

- Customers shop on **Kitchen** like a normal store — they do **not** see Meesho or other sources.
- You list mainly Meesho products (and can add from any other platform).
- When a customer orders here, you **manually fulfill** by ordering from Meesho / the source platform.
- Admin keeps source URL, source price, cost, sell price, stock, and commission for margin control.

## Stack

- **Frontend:** Next.js App Router, React, Tailwind, Font Awesome, Inter
- **Backend:** Next.js Route Handlers (`/api/*`) in the same repo
- **Data (temporary):** JSON file store at `data/db.json` — swap for a real DB next
- **Deploy:** Vercel

## Features (v0)

- Customer shop: product listing + product detail (no source leakage)
- Admin (Crackaro-style):
  - Products with Cost / Sell / Source ₹ / Stock
  - Profit + commission
  - Per-product % commission + global default
  - Source fulfill link (admin only)
  - Orders page documents manual fulfillment flow

## Local development

```bash
npm install
npm run dev
```

- Shop: http://localhost:3005
- Admin: http://localhost:3005/admin/products

## Deploy (Vercel)

Project: [kitchora/kitchen-b527](https://vercel.com/kitchora/kitchen-b527)

```bash
# one-time (already linked locally via .vercel/)
vercel link --yes --project=kitchen-b527 --scope=kitchora

# production deploy
vercel deploy --prod
```

Optional for image uploads in production (Vercel → Storage → Blob):

```bash
vercel env add BLOB_READ_WRITE_TOKEN
```

Note: `data/db.json` is fine for demos; writes on Vercel serverless are not durable — swap to a real DB before relying on admin/order changes in production.

## Design tokens

- Background `#ffffff`
- Font Inter / 13px / `#111827`
- Theme `#2C71E2`
- Button & input radius `6px`
- Icons: Font Awesome

## Images

Admin → Products → click the thumbnail or the images icon:

- **Paste URL** — Meesho / other CDN `https://` links (recommended for sourced products)
- **Upload** — own photos via Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set; otherwise saved under `public/uploads/` locally
- Reorder with ↑↓, **Make cover** for the storefront thumbnail

```bash
# Production (Vercel project → Storage → Blob)
BLOB_READ_WRITE_TOKEN=vercel_blob_...
```

## Next steps

1. DB (Vercel Postgres / Neon / Supabase)
2. Admin auth
3. Deploy to Vercel
