#  Smart Ad Campaign Manager

A full-stack dashboard where marketers can create ad campaigns, manage budgets, track performance, and compare results across platforms like Google Ads, Facebook, Instagram, LinkedIn, TikTok and X.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)

##  Highlights

- **Campaign management:** create, edit, pause, resume and delete campaigns
- **Budget tracking:** total and daily budgets, spend progress, overspend warnings
- **Performance tracking:** impressions, clicks, conversions and spend, entered daily or sent live through a tracking API
- **Calculated metrics:** CTR, CPC, conversion rate and cost per conversion
- **Interactive analytics:** trend charts, platform and campaign breakdowns, change vs. the previous period
- **Campaign comparison:** compare 2–4 campaigns side by side
- **Filters:** date range, status, platform, search and sorting
- **Accessible design:** a table view for every chart, colorblind-safe colors, light and dark mode

## Tech stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite, React Router, Recharts |
| Backend | Node.js, Express, TypeScript, Zod validation |
| Database | PostgreSQL (node-postgres), with embedded PGlite for zero-setup local development |

## Quick start

```bash
npm install
npm run seed     # 8 sample campaigns with 120 days of metrics
npm run dev      # API on :4000, UI on http://localhost:5173
```

### Database

- **With PostgreSQL:** copy `server/.env.example` to `server/.env` and set `DATABASE_URL=postgres://user:pass@localhost:5432/ad_campaigns`. The app creates its tables on startup.
- **Without PostgreSQL:** if `DATABASE_URL` is unset, the server runs an embedded Postgres ([PGlite](https://pglite.dev)), stored in `server/pgdata/`. It uses the same SQL, so no setup is needed.

### Production

```bash
npm run build
npm start        # serves API + built UI on http://localhost:4000
```

## API

| Method | Path | Description |
|---|---|---|
| GET | `/api/campaigns?from&to&status&platform&search` | Campaigns with metrics for the date range |
| GET | `/api/campaigns/:id?from&to` | Campaign and a gap-filled daily series |
| POST | `/api/campaigns` | Create |
| PUT | `/api/campaigns/:id` | Update |
| PATCH | `/api/campaigns/:id/status` | `{ status: "active" \| "paused" \| "completed" \| "draft" }` |
| DELETE | `/api/campaigns/:id` | Delete (and its metrics) |
| PUT | `/api/campaigns/:id/metrics` | Upsert one day: `{ date, impressions, clicks, conversions, spend }` |
| POST | `/api/track/:id/impression\|click\|conversion` | Increment today's counter (active campaigns only); clicks accept `{ cost }` |
| GET | `/api/analytics/overview?from&to&status&platform` | Totals, previous-period totals, daily series, per-platform breakdown |

Dates are `YYYY-MM-DD`; the range defaults to the last 30 days.

## Structure

```
server/src/
  index.ts            Express app (also serves client/dist in production)
  db.ts               pg Pool or embedded PGlite, behind one query() interface
  schema.ts           Tables, constraints, indexes
  metrics.ts          CTR / CPC / CVR / CPA calculations
  routes/             campaigns, analytics, tracking
  seed.ts             Sample data
client/src/
  pages/              Dashboard, Campaigns, CampaignDetail, Compare
  components/         Charts, FilterBar, KpiTile, forms, modals
  lib/                API client, types, formatting, date range context
```
