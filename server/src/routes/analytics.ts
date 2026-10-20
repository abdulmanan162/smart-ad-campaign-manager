import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db.js';
import { asyncHandler, parseRange } from '../http.js';
import { derive, SUM_COLUMNS, type Totals } from '../metrics.js';
import { PLATFORMS, STATUSES } from '../schema.js';

export const analyticsRouter = Router();

// Portfolio overview: totals, previous-period totals, daily series and per-platform breakdown.
analyticsRouter.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const { from, to } = parseRange(req.query);
    const filters = z
      .object({ status: z.enum(STATUSES).optional(), platform: z.enum(PLATFORMS).optional() })
      .parse({ status: req.query.status || undefined, platform: req.query.platform || undefined });

    // Builds "AND c.status = $n ..." with placeholders numbered after `base` existing params.
    const buildFilter = (base: unknown[]) => {
      const params = [...base];
      const where: string[] = [];
      if (filters.status) {
        params.push(filters.status);
        where.push(`c.status = $${params.length}`);
      }
      if (filters.platform) {
        params.push(filters.platform);
        where.push(`c.platform = $${params.length}`);
      }
      return { params, sql: where.length ? `AND ${where.join(' AND ')}` : '' };
    };
    const { params, sql: campaignFilter } = buildFilter([from, to]);
    const countFilter = buildFilter([]);
    const db = await getDb();

    const totalsQuery = (fromExpr: string, toExpr: string) =>
      db.query<Totals>(
        `SELECT ${SUM_COLUMNS}
         FROM campaign_metrics m JOIN campaigns c ON c.id = m.campaign_id
         WHERE m.date BETWEEN ${fromExpr} AND ${toExpr} ${campaignFilter}`,
        params,
      );

    // Previous period = same length, immediately before `from`.
    const [current, previous, daily, byPlatform, counts] = await Promise.all([
      totalsQuery('$1::date', '$2::date'),
      totalsQuery('($1::date - ($2::date - $1::date + 1))', '($1::date - 1)'),
      db.query<Totals & { date: string }>(
        `SELECT to_char(d, 'YYYY-MM-DD') AS date, ${SUM_COLUMNS}
         FROM generate_series($1::date, $2::date, interval '1 day') AS d
         LEFT JOIN (campaign_metrics m JOIN campaigns c ON c.id = m.campaign_id ${campaignFilter})
           ON m.date = d::date
         GROUP BY d ORDER BY d`,
        params,
      ),
      db.query<Totals & { platform: string }>(
        `SELECT c.platform, ${SUM_COLUMNS}
         FROM campaign_metrics m JOIN campaigns c ON c.id = m.campaign_id
         WHERE m.date BETWEEN $1::date AND $2::date ${campaignFilter}
         GROUP BY c.platform ORDER BY spend DESC`,
        params,
      ),
      db.query<{ status: string; count: number }>(
        `SELECT c.status, COUNT(*)::int AS count FROM campaigns c WHERE TRUE ${countFilter.sql} GROUP BY c.status`,
        countFilter.params,
      ),
    ]);

    res.json({
      from,
      to,
      totals: derive(current.rows[0]),
      previous: derive(previous.rows[0]),
      daily: daily.rows.map((r) => ({ date: r.date, ...derive(r) })),
      byPlatform: byPlatform.rows.map((r) => ({ platform: r.platform, ...derive(r) })),
      statusCounts: Object.fromEntries(counts.rows.map((r) => [r.status, r.count])),
    });
  }),
);
