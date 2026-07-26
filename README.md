# Kitchen

Performance-focused kitchen appliances store (FE + BE in one Next.js app) for Vercel.

Repo: [Mohankumar2032/kitchen](https://github.com/Mohankumar2032/kitchen)

## Stack

- **Frontend:** Next.js App Router, React, Tailwind, Font Awesome, Inter
- **Backend:** Next.js Route Handlers (`/api/*`) in the same repo
- **Data (temporary):** JSON file store at `data/db.json` — swap for a real DB after git/Vercel setup
- **Deploy:** Vercel

## Features (v0)

- Storefront with one seeded product from Meesho share link
- Admin (Crackaro-style):
  - Products table with inline **Cost / Sell / Platform (original) / Stock**
  - Live **Profit** + commission preview
  - Per-product **% commission** override
  - Global **% Commission** settings
  - Orders / Enquiries placeholders

## Seed product

Meesho listing used for the first SKU:

https://www.meesho.com/s/p/fuij6i?utm_source=s_w

Update name, images, cost, sell price, and platform price in **Admin → Products**.

## Local development

```bash
npm install
npm run dev
```

- Store: http://localhost:3000
- Admin: http://localhost:3000/admin/products

## Performance notes (images)

- `next/image` with AVIF/WebP
- Priority load only for the hero / active gallery image
- Lazy thumbnails
- Long cache TTL for optimized images
- Local placeholders for now; Meesho/CDN remote patterns ready in `next.config.ts`

## Next steps

1. Connect DB (e.g. Vercel Postgres / Neon / Supabase)
2. Replace `data/db.json` store with Prisma/Drizzle
3. Product image uploads (Vercel Blob)
4. Auth for `/admin`
5. Orders + enquiries APIs
6. Deploy to Vercel from this repo

## Design tokens

- Background `#ffffff`
- Font Inter / 13px / `#111827`
- Theme `#2C71E2`
- Button & input radius `6px`
- Icons: Font Awesome
