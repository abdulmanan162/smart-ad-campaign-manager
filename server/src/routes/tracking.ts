import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db.js';
import { asyncHandler, HttpError } from '../http.js';

// Lightweight event endpoints an ad server / landing page can call to increment today's counters.
//   POST /api/track/:campaignId/impression
//   POST /api/track/:campaignId/click        body: { cost?: number }
//   POST /api/track/:campaignId/conversion
export const trackingRouter = Router();

const COLUMN = { impression: 'impressions', click: 'clicks', conversion: 'conversions' } as const;

trackingRouter.post(
  '/:id/:event',
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const event = z.enum(['impression', 'click', 'conversion']).parse(req.params.event);
    const { cost } = z.object({ cost: z.coerce.number().nonnegative().default(0) }).parse(req.body ?? {});
    const column = COLUMN[event];
    const db = await getDb();

    const { rows } = await db.query<{ status: string }>(`SELECT status FROM campaigns WHERE id=$1`, [id]);
    if (!rows.length) throw new HttpError(404, 'Campaign not found');
    if (rows[0].status !== 'active') throw new HttpError(409, `Campaign is ${rows[0].status}; events are only recorded for active campaigns`);

    await db.query(
      `INSERT INTO campaign_metrics (campaign_id, date, ${column}, spend)
       VALUES ($1, CURRENT_DATE, 1, $2)
       ON CONFLICT (campaign_id, date) DO UPDATE SET
         ${column} = campaign_metrics.${column} + 1,
         spend = campaign_metrics.spend + EXCLUDED.spend`,
      [id, cost],
    );
    res.status(202).json({ ok: true });
  }),
);
