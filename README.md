# Offer18 Admin Panel (Next.js + MySQL)

This is a starter foundation for an Offer18-style performance marketing admin panel:
- Next.js App Router + TypeScript + Tailwind
- MySQL + Prisma
- Admin auth (sessions) + RBAC
- Offer builder (wizard) + rules
- Tracking endpoints:
  - `GET /t/click` (creates click + redirects)
  - `GET|POST /t/conv` (S2S conversion ingest + dedup + attribution)

## Quick start

1) Install deps

```bash
npm i
```

2) Create `.env` from `.env.example`

3) Create database + tables

Option A (recommended): Prisma

```bash
npx prisma generate
npx prisma db push
```

Option B: Raw SQL

Run `database/schema.sql` in your MySQL client.

4) Run dev server

```bash
npm run dev
```

## Tracking

### Click

```
/t/click?offer_id=OFFER_ID&aff_id=AFF_ID&subid1=campA&source=fb
```

### Conversion

```
/t/conv?offer_id=OFFER_ID&click_id=CLICK_ID&transaction_id=TXN123&status=approved&payout=2.5&revenue=3.5
```

## Notes

- Geo is read from CDN headers first (Cloudflare/Vercel). For accurate geo without CDN headers, integrate GeoIP.
- Caps/targeting are implemented in the click endpoint.
- Conversion dedup uses unique `(offerId, transactionId)`.

