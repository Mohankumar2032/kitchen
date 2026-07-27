# Storefront performance budget

Targets for ~100 concurrent shoppers and 200+ products (JSON/Blob catalog).

## Payload

- Shop initial HTML/RSC catalog slice: **≤ 50–80 KB** (one page of products only)
- Product card image (card WebP): **≤ 40–80 KB**
- LCP image (hero / first card): **≤ 150–200 KB**

## Core Web Vitals

- **LCP** ≤ 2.5s (home + shop)
- **INP** ≤ 200ms (category clicks, add-to-cart)
- **CLS** ≤ 0.1

## Verification

```bash
npm run build && npm start
```

Use Lighthouse or Chrome DevTools Performance on `http://localhost:3005` (production mode). Dev compile lag is not representative.

Web Vitals are reported via `WebVitalsReporter` → `/api/vitals` in production.
