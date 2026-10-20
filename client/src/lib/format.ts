import type { MetricKey, Platform, Status } from './types';

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat('en-US');
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const usdCompact = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });

export const fmtNumber = (n: number) => whole.format(Math.round(n));
export const fmtCompact = (n: number) => compact.format(n);
export const fmtMoney = (n: number) => usd.format(n);
export const fmtMoneyCompact = (n: number) => usdCompact.format(n);
export const fmtPct = (n: number) => `${n.toFixed(2)}%`;

export interface MetricDef {
  key: MetricKey;
  label: string;
  short: string;
  format: (n: number) => string;
  axis: (n: number) => string;
  /** Whether an increase is good (true), bad (false), or neither (null). */
  higherIsBetter: boolean | null;
  description: string;
}

export const METRICS: Record<MetricKey, MetricDef> = {
  impressions: { key: 'impressions', label: 'Impressions', short: 'Impr.', format: fmtNumber, axis: fmtCompact, higherIsBetter: true, description: 'Times an ad was shown' },
  clicks: { key: 'clicks', label: 'Clicks', short: 'Clicks', format: fmtNumber, axis: fmtCompact, higherIsBetter: true, description: 'Times an ad was clicked' },
  conversions: { key: 'conversions', label: 'Conversions', short: 'Conv.', format: fmtNumber, axis: fmtCompact, higherIsBetter: true, description: 'Completed goal actions' },
  spend: { key: 'spend', label: 'Spend', short: 'Spend', format: fmtMoney, axis: fmtMoneyCompact, higherIsBetter: null, description: 'Total amount spent' },
  ctr: { key: 'ctr', label: 'CTR', short: 'CTR', format: fmtPct, axis: (n) => `${n.toFixed(1)}%`, higherIsBetter: true, description: 'Click-through rate = clicks / impressions' },
  cpc: { key: 'cpc', label: 'CPC', short: 'CPC', format: fmtMoney, axis: (n) => `$${n.toFixed(2)}`, higherIsBetter: false, description: 'Cost per click = spend / clicks' },
  conversionRate: { key: 'conversionRate', label: 'Conversion rate', short: 'CVR', format: fmtPct, axis: (n) => `${n.toFixed(1)}%`, higherIsBetter: true, description: 'Conversions / clicks' },
  cpa: { key: 'cpa', label: 'Cost / conversion', short: 'CPA', format: fmtMoney, axis: (n) => `$${n.toFixed(0)}`, higherIsBetter: false, description: 'Spend / conversions' },
};

export const METRIC_KEYS = Object.keys(METRICS) as MetricKey[];

export const PLATFORM_LABEL: Record<Platform, string> = {
  google: 'Google Ads',
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  twitter: 'X / Twitter',
};

export const STATUS_LABEL: Record<Status, string> = {
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  draft: 'Draft',
};

export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', opts);
}

/** % change from prev to curr, or null if there is no baseline. */
export function pctChange(curr: number, prev: number): number | null {
  if (!prev) return null;
  return ((curr - prev) / prev) * 100;
}
