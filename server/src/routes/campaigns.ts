import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db.js';
import { asyncHandler, HttpError, isoDate, parseRange } from '../http.js';
import { derive, SUM_COLUMNS, type Totals } from '../metrics.js';
import { PLATFORMS, STATUSES } from '../schema.js';

export const campaignsRouter = Router();

const campaignBody = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(200),
    platform: z.enum(PLATFORMS),
    status: z.enum(STATUSES).default('draft'),
    objective: z.string().trim().max(200).default(''),
    budget: z.coerce.number().nonnegative(),
    dailyBudget: z.coerce.number().nonnegative().nullable().optional(),
    startDate: isoDate,
    endDate: isoDate.nullable().optional(),
  })
  .refine((c) => !c.endDate || c.endDate >= c.startDate, { message: 'End date must be after start date', path: ['endDate'] });

const metricsBody = z.object({
  date: isoDate,
  impressions: z.coerce.number().int().nonnegative(),
  clicks: z.coerce.number().int().nonnegative(),
  conversions: z.coerce.number().int().nonnegative(),
  spend: z.coerce.number().nonnegative(),
});

const idParam = z.coerce.number().int().positive();

const CAMPAIGN_COLUMNS = `
  c.id, c.name, c.platform, c.status, c.objective,
  c.budget::float8 AS budget,
  c.daily_budget::float8 AS "dailyBudget",
  to_char(c.start_date, 'YYYY-MM-DD') AS "startDate",
  to_char(c.end_date, 'YYYY-MM-DD') AS "endDate",
  c.created_at AS "createdAt",
  c.updated_at AS "updatedAt"`;

type CampaignRow = Totals & { id: number; budget: number; lifetimeSpend: number; [k: string]: unknown };

function shape(row: CampaignRow) {
  const { impressions, clicks, conversions, spend, lifetimeSpend, ...campaign } = row;
  return {
    ...campaign,
    lifetimeSpend,
    budgetUsed: row.budget > 0 ? Math.round((lifetimeSpend / row.budget) * 1000) / 10 : 0,
    metrics: derive({ impressions, clicks, conversions, spend }),
  };
}

async function fetchCampaigns(where: string[], params: unknown[], from: string, to: string) {
  const db = await getDb();
  params.push(from, to);
  const { rows } = await db.query<CampaignRow>(
    `SELECT ${CAMPAIGN_COLUMNS}, ${SUM_COLUMNS},
       (SELECT COALESCE(SUM(spend), 0)::float8 FROM campaign_metrics WHERE campaign_id = c.id) AS "lifetimeSpend"
     FROM campaigns c
     LEFT JOIN campaign_metrics m
       ON m.campaign_id = c.id AND m.date BETWEEN $${params.length - 1}::date AND $${params.length}::date
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     GROUP BY c.id
     ORDER BY c.created_at DESC, c.id DESC`,
    params,
  );
  return rows.map(shape);
}

// List campaigns with metrics aggregated over the date range. Filters: status, platform, search.
campaignsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { from, to } = parseRange(req.query);
    const filters = z
      .object({
        status: z.enum(STATUSES).optional(),
        platform: z.enum(PLATFORMS).optional(),
        search: z.string().trim().optional(),
      })
      .parse({ status: req.query.status || undefined, platform: req.query.platform || undefined, search: req.query.search || undefined });

    const where: string[] = [];
    const params: unknown[] = [];
    if (filters.status) {
      params.push(filters.status);
      where.push(`c.status = $${params.length}`);
    }
    if (filters.platform) {
      params.push(filters.platform);
      where.push(`c.platform = $${params.length}`);
    }
    if (filters.search) {
      params.push(`%${filters.search}%`);
      where.push(`c.name ILIKE $${params.length}`);
    }
    res.json({ from, to, campaigns: await fetchCampaigns(where, params, from, to) });
  }),
);

// Single campaign with totals and a gap-filled daily series for the range.
campaignsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = idParam.parse(req.params.id);
    const { from, to } = parseRange(req.query);
    const [campaign] = await fetchCampaigns(['c.id = $1'], [id], from, to);
    if (!campaign) throw new HttpError(404, 'Campaign not found');

    const db = await getDb();
    const { rows } = await db.query<Totals & { date: string }>(
      `SELECT to_char(d, 'YYYY-MM-DD') AS date, ${SUM_COLUMNS}
       FROM generate_series($2::date, $3::date, interval '1 day') AS d
       LEFT JOIN campaign_metrics m ON m.campaign_id = $1 AND m.date = d::date
       GROUP BY d ORDER BY d`,
      [id, from, to],
    );
    res.json({ from, to, campaign, daily: rows.map((r) => ({ date: r.date, ...derive(r) })) });
  }),
);

campaignsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const c = campaignBody.parse(req.body);
    const db = await getDb();
    const { rows } = await db.query<{ id: number }>(
      `INSERT INTO campaigns (name, platform, status, objective, budget, daily_budget, start_date, end_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [c.name, c.platform, c.status, c.objective, c.budget, c.dailyBudget ?? null, c.startDate, c.endDate ?? null],
    );
    res.status(201).json({ id: rows[0].id });
  }),
);

campaignsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = idParam.parse(req.params.id);
    const c = campaignBody.parse(req.body);
    const db = await getDb();
    const { rows } = await db.query(
      `UPDATE campaigns SET name=$2, platform=$3, status=$4, objective=$5, budget=$6, daily_budget=$7,
         start_date=$8, end_date=$9, updated_at=now()
       WHERE id=$1 RETURNING id`,
      [id, c.name, c.platform, c.status, c.objective, c.budget, c.dailyBudget ?? null, c.startDate, c.endDate ?? null],
    );
    if (!rows.length) throw new HttpError(404, 'Campaign not found');
    res.json({ id });
  }),
);

// Pause / resume / complete without resending the whole campaign.
campaignsRouter.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const id = idParam.parse(req.params.id);
    const { status } = z.object({ status: z.enum(STATUSES) }).parse(req.body);
    const db = await getDb();
    const { rows } = await db.query(`UPDATE campaigns SET status=$2, updated_at=now() WHERE id=$1 RETURNING id`, [id, status]);
    if (!rows.length) throw new HttpError(404, 'Campaign not found');
    res.json({ id, status });
  }),
);

campaignsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = idParam.parse(req.params.id);
    const db = await getDb();
    const { rows } = await db.query(`DELETE FROM campaigns WHERE id=$1 RETURNING id`, [id]);
    if (!rows.length) throw new HttpError(404, 'Campaign not found');
    res.status(204).end();
  }),
);

// Record (or overwrite) one day's metrics for a campaign.
campaignsRouter.put(
  '/:id/metrics',
  asyncHandler(async (req, res) => {
    const id = idParam.parse(req.params.id);
    const m = metricsBody.parse(req.body);
    if (m.clicks > m.impressions) throw new HttpError(400, 'Clicks cannot exceed impressions');
    if (m.conversions > m.clicks) throw new HttpError(400, 'Conversions cannot exceed clicks');
    const db = await getDb();
    const exists = await db.query(`SELECT 1 FROM campaigns WHERE id=$1`, [id]);
    if (!exists.rows.length) throw new HttpError(404, 'Campaign not found');
    await db.query(
      `INSERT INTO campaign_metrics (campaign_id, date, impressions, clicks, conversions, spend)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (campaign_id, date) DO UPDATE SET
         impressions=EXCLUDED.impressions, clicks=EXCLUDED.clicks,
         conversions=EXCLUDED.conversions, spend=EXCLUDED.spend`,
      [id, m.date, m.impressions, m.clicks, m.conversions, m.spend],
    );
    res.json({ ok: true });
  }),
);
