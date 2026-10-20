import 'dotenv/config';
import { getDb } from './db.js';
import type { Platform, Status } from './schema.js';

const DAYS = 120;
const DAY_MS = 864e5;

interface SeedCampaign {
  name: string;
  platform: Platform;
  status: Status;
  objective: string;
  budget: number;
  daily: number;
  ctr: number;
  cvr: number;
  cpc: number;
  volume: number; // baseline daily impressions
}

const campaigns: SeedCampaign[] = [
  { name: 'Summer Sale - Search', platform: 'google', status: 'active', objective: 'Sales', budget: 25000, daily: 250, ctr: 0.045, cvr: 0.06, cpc: 1.8, volume: 3000 },
  { name: 'Brand Awareness Q3', platform: 'facebook', status: 'active', objective: 'Awareness', budget: 18000, daily: 180, ctr: 0.012, cvr: 0.02, cpc: 0.65, volume: 20000 },
  { name: 'Influencer Reels Push', platform: 'instagram', status: 'active', objective: 'Engagement', budget: 12000, daily: 120, ctr: 0.018, cvr: 0.03, cpc: 0.9, volume: 7000 },
  { name: 'B2B Lead Gen - CTOs', platform: 'linkedin', status: 'active', objective: 'Leads', budget: 30000, daily: 300, ctr: 0.007, cvr: 0.09, cpc: 6.5, volume: 6000 },
  { name: 'Gen Z App Installs', platform: 'tiktok', status: 'paused', objective: 'App installs', budget: 9000, daily: 100, ctr: 0.021, cvr: 0.04, cpc: 0.45, volume: 9000 },
  { name: 'Product Launch Threads', platform: 'twitter', status: 'completed', objective: 'Traffic', budget: 6000, daily: 80, ctr: 0.015, cvr: 0.025, cpc: 0.7, volume: 6000 },
  { name: 'Retargeting - Cart Abandoners', platform: 'facebook', status: 'active', objective: 'Conversions', budget: 15000, daily: 150, ctr: 0.028, cvr: 0.11, cpc: 1.1, volume: 4000 },
  { name: 'Holiday Shopping Ads', platform: 'google', status: 'draft', objective: 'Sales', budget: 40000, daily: 400, ctr: 0.05, cvr: 0.07, cpc: 1.5, volume: 0 },
];

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const rand = (min: number, max: number) => min + Math.random() * (max - min);

async function main() {
  const db = await getDb();
  await db.query('TRUNCATE campaign_metrics, campaigns RESTART IDENTITY CASCADE');

  const today = new Date();
  const start = new Date(today.getTime() - (DAYS - 1) * DAY_MS);

  for (const c of campaigns) {
    const startDate = c.status === 'draft' ? isoDate(new Date(today.getTime() + 14 * DAY_MS)) : isoDate(start);
    const endDate = c.status === 'completed' ? isoDate(new Date(today.getTime() - 30 * DAY_MS)) : null;
    const { rows } = await db.query<{ id: number }>(
      `INSERT INTO campaigns (name, platform, status, objective, budget, daily_budget, start_date, end_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [c.name, c.platform, c.status, c.objective, c.budget, c.daily, startDate, endDate],
    );
    const id = rows[0].id;
    if (c.volume === 0) continue;

    const values: unknown[] = [];
    const tuples: string[] = [];
    for (let i = 0; i < DAYS; i++) {
      const d = new Date(start.getTime() + i * DAY_MS);
      if (endDate && isoDate(d) > endDate) break;
      // Paused campaigns stopped delivering 10 days ago.
      if (c.status === 'paused' && d.getTime() > today.getTime() - 10 * DAY_MS) break;
      const weekendFactor = d.getDay() === 0 || d.getDay() === 6 ? 0.75 : 1;
      const trend = 0.8 + (i / DAYS) * 0.4;
      const impressions = Math.round(c.volume * weekendFactor * trend * rand(0.85, 1.15));
      const clicks = Math.round(impressions * c.ctr * rand(0.8, 1.2));
      const conversions = Math.round(clicks * c.cvr * rand(0.7, 1.3));
      const spend = Math.min(c.daily * 1.2, clicks * c.cpc * rand(0.85, 1.15));
      const n = values.length;
      tuples.push(`($${n + 1},$${n + 2},$${n + 3},$${n + 4},$${n + 5},$${n + 6})`);
      values.push(id, isoDate(d), impressions, clicks, conversions, spend.toFixed(2));
    }
    if (tuples.length) {
      await db.query(
        `INSERT INTO campaign_metrics (campaign_id, date, impressions, clicks, conversions, spend) VALUES ${tuples.join(',')}`,
        values,
      );
    }
  }

  console.log(`Seeded ${campaigns.length} campaigns with up to ${DAYS} days of metrics (${db.kind}).`);
  await db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
