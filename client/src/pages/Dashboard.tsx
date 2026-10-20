import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarBreakdown, ChartCard, DailyTable, MetricPicker, TrendChart } from '../components/Charts';
import { FilterBar } from '../components/FilterBar';
import { KpiTile } from '../components/KpiTile';
import { PlatformTag, StatusBadge } from '../components/StatusBadge';
import { api } from '../lib/api';
import { fmtDate, METRIC_KEYS, METRICS, PLATFORM_LABEL, STATUS_LABEL } from '../lib/format';
import { useRange } from '../lib/RangeContext';
import { STATUSES, type MetricKey, type Platform, type Status } from '../lib/types';
import { useAsync } from '../lib/useAsync';

const BREAKDOWN_METRICS: MetricKey[] = ['spend', 'impressions', 'clicks', 'conversions', 'ctr', 'cpc', 'conversionRate', 'cpa'];

export function Dashboard() {
  const { range } = useRange();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status | ''>('');
  const [platform, setPlatform] = useState<Platform | ''>('');
  const [trendMetric, setTrendMetric] = useState<MetricKey>('clicks');
  const [platformMetric, setPlatformMetric] = useState<MetricKey>('spend');
  const [campaignMetric, setCampaignMetric] = useState<MetricKey>('conversions');

  const overview = useAsync(() => api.overview(range, { status, platform }), [range.from, range.to, status, platform]);
  const campaigns = useAsync(() => api.listCampaigns(range, { status, platform }), [range.from, range.to, status, platform]);
  const o = overview.data;
  const rangeLabel = `${fmtDate(range.from, { month: 'short', day: 'numeric', year: 'numeric' })} – ${fmtDate(range.to, { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Performance overview</h1>
          <p className="muted">{rangeLabel} · compared with the previous period of equal length</p>
        </div>
        <Link className="btn primary" to="/campaigns?new=1">+ New campaign</Link>
      </div>

      <FilterBar status={status} platform={platform} onStatus={setStatus} onPlatform={setPlatform} />

      {overview.error && <p className="form-error" role="alert">Couldn't load analytics: {overview.error}</p>}

      {o && (
        <>
          <div className="status-strip">
            {STATUSES.map((s) => (
              <span key={s} className="status-count">
                <StatusBadge status={s} /> <strong>{o.statusCounts[s] ?? 0}</strong>
                <span className="sr-only"> {STATUS_LABEL[s]} campaigns</span>
              </span>
            ))}
          </div>

          <div className="kpi-grid">
            {METRIC_KEYS.map((m) => (
              <KpiTile key={m} metric={m} current={o.totals} previous={o.previous} active={trendMetric === m} onClick={() => setTrendMetric(m)} />
            ))}
          </div>

          <ChartCard
            title={`${METRICS[trendMetric].label} over time`}
            subtitle="Select a KPI tile above or pick a metric to change the trend."
            actions={<MetricPicker value={trendMetric} onChange={setTrendMetric} options={METRIC_KEYS} />}
            chart={<TrendChart data={o.daily} metric={trendMetric} />}
            table={<DailyTable data={o.daily} metrics={METRIC_KEYS} />}
          />

          <div className="grid-2">
            <ChartCard
              title={`${METRICS[platformMetric].label} by platform`}
              actions={<MetricPicker value={platformMetric} onChange={setPlatformMetric} options={BREAKDOWN_METRICS} />}
              chart={
                <BarBreakdown
                  data={o.byPlatform}
                  metric={platformMetric}
                  labelOf={(d) => PLATFORM_LABEL[d.platform]}
                  onSelect={(d) => setPlatform(d.platform)}
                />
              }
              table={
                <table className="table">
                  <thead>
                    <tr>
                      <th>Platform</th>
                      {BREAKDOWN_METRICS.map((m) => <th key={m} className="num">{METRICS[m].short}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {o.byPlatform.map((p) => (
                      <tr key={p.platform}>
                        <td>{PLATFORM_LABEL[p.platform]}</td>
                        {BREAKDOWN_METRICS.map((m) => <td key={m} className="num">{METRICS[m].format(p[m])}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              }
            />

            <ChartCard
              title={`${METRICS[campaignMetric].label} by campaign`}
              subtitle="Click a bar to open the campaign."
              actions={<MetricPicker value={campaignMetric} onChange={setCampaignMetric} options={BREAKDOWN_METRICS} />}
              chart={
                campaigns.data ? (
                  <BarBreakdown
                    data={campaigns.data.map((c) => ({ ...c.metrics, id: c.id, name: c.name }))}
                    metric={campaignMetric}
                    labelOf={(d) => d.name}
                    onSelect={(d) => navigate(`/campaigns/${d.id}`)}
                  />
                ) : (
                  <p className="empty">Loading…</p>
                )
              }
              table={
                <table className="table">
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th>Status</th>
                      {BREAKDOWN_METRICS.map((m) => <th key={m} className="num">{METRICS[m].short}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.data?.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <Link to={`/campaigns/${c.id}`}>{c.name}</Link> <PlatformTag platform={c.platform} />
                        </td>
                        <td><StatusBadge status={c.status} /></td>
                        {BREAKDOWN_METRICS.map((m) => <td key={m} className="num">{METRICS[m].format(c.metrics[m])}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              }
            />
          </div>
        </>
      )}
      {!o && overview.loading && <p className="empty">Loading analytics…</p>}
    </div>
  );
}
