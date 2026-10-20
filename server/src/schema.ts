export const PLATFORMS = ['google', 'facebook', 'instagram', 'linkedin', 'tiktok', 'twitter'] as const;
export const STATUSES = ['active', 'paused', 'completed', 'draft'] as const;

export type Platform = (typeof PLATFORMS)[number];
export type Status = (typeof STATUSES)[number];

const sqlList = (values: readonly string[]) => values.map((v) => `'${v}'`).join(',');

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS campaigns (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  platform     TEXT NOT NULL CHECK (platform IN (${sqlList(PLATFORMS)})),
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (${sqlList(STATUSES)})),
  objective    TEXT NOT NULL DEFAULT '',
  budget       NUMERIC(12,2) NOT NULL CHECK (budget >= 0),
  daily_budget NUMERIC(12,2) CHECK (daily_budget IS NULL OR daily_budget >= 0),
  start_date   DATE NOT NULL,
  end_date     DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS campaign_metrics (
  id          SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0 CHECK (impressions >= 0),
  clicks      INTEGER NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  conversions INTEGER NOT NULL DEFAULT 0 CHECK (conversions >= 0),
  spend       NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (spend >= 0),
  UNIQUE (campaign_id, date)
);

CREATE INDEX IF NOT EXISTS idx_metrics_date ON campaign_metrics(date);
CREATE INDEX IF NOT EXISTS idx_campaigns_status_platform ON campaigns(status, platform)
`;
