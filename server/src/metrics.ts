export interface Totals {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
}

export interface Derived {
  ctr: number; // clicks / impressions, %
  cpc: number; // spend / clicks
  conversionRate: number; // conversions / clicks, %
  cpa: number; // spend / conversions
}

const ratio = (a: number, b: number) => (b > 0 ? a / b : 0);
const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

export function derive(t: Totals): Totals & Derived {
  return {
    impressions: t.impressions,
    clicks: t.clicks,
    conversions: t.conversions,
    spend: round(t.spend),
    ctr: round(ratio(t.clicks, t.impressions) * 100),
    cpc: round(ratio(t.spend, t.clicks)),
    conversionRate: round(ratio(t.conversions, t.clicks) * 100),
    cpa: round(ratio(t.spend, t.conversions)),
  };
}

// Sums cast to float8 so both pg and PGlite return plain JS numbers (not bigint strings).
export const SUM_COLUMNS = `
  COALESCE(SUM(m.impressions), 0)::float8 AS impressions,
  COALESCE(SUM(m.clicks), 0)::float8 AS clicks,
  COALESCE(SUM(m.conversions), 0)::float8 AS conversions,
  COALESCE(SUM(m.spend), 0)::float8 AS spend`;
