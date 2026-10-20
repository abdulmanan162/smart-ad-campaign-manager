export const PLATFORMS = ['google', 'facebook', 'instagram', 'linkedin', 'tiktok', 'twitter'] as const;
export const STATUSES = ['active', 'paused', 'completed', 'draft'] as const;

export type Platform = (typeof PLATFORMS)[number];
export type Status = (typeof STATUSES)[number];

export interface Metrics {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
  cpc: number;
  conversionRate: number;
  cpa: number;
}

export type MetricKey = keyof Metrics;

export interface Campaign {
  id: number;
  name: string;
  platform: Platform;
  status: Status;
  objective: string;
  budget: number;
  dailyBudget: number | null;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  lifetimeSpend: number;
  budgetUsed: number; // % of total budget spent (lifetime)
  metrics: Metrics; // aggregated over the requested date range
}

export interface DailyPoint extends Metrics {
  date: string;
}

export interface CampaignInput {
  name: string;
  platform: Platform;
  status: Status;
  objective: string;
  budget: number;
  dailyBudget: number | null;
  startDate: string;
  endDate: string | null;
}

export interface MetricsInput {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
}

export interface Overview {
  from: string;
  to: string;
  totals: Metrics;
  previous: Metrics;
  daily: DailyPoint[];
  byPlatform: (Metrics & { platform: Platform })[];
  statusCounts: Partial<Record<Status, number>>;
}

export interface DateRange {
  from: string;
  to: string;
}
