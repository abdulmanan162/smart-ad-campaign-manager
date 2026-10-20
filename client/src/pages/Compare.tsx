import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChartCard, CompareChart, MetricPicker } from '../components/Charts';
import { DateRangeControl } from '../components/FilterBar';
import { PlatformTag, StatusBadge } from '../components/StatusBadge';
import { api } from '../lib/api';
import { useChartTheme } from '../lib/chartTheme';
import { fmtDate, METRIC_KEYS, METRICS } from '../lib/format';
import { useRange } from '../lib/RangeContext';
import type { MetricKey } from '../lib/types';
import { useAsync } from '../lib/useAsync';

const MAX = 4;

export function Compare() {
  const { range } = useRange();
  const theme = useChartTheme();
  const [params, setParams] = useSearchParams();
  const [metric, setMetric] = useState<MetricKey>('conversions');
  const ids = (params.get('ids') ?? '').split(',').map(Number).filter((n) => n > 0).slice(0, MAX);

  const all = useAsync(() => api.listCampaigns(range), [range.from, range.to]);
  const details = useAsync(
    () => Promise.all(ids.map((id) => api.getCampaign(id, range))),
    [ids.join(','), range.from, range.to],
  );

  const setIds = (next: number[]) => setParams(next.length ? { ids: next.join(',') } : {});
  const toggle = (id: number) => {
    if (ids.includes(id)) setIds(ids.filter((x) => x !== id));
    else if (ids.length < MAX) setIds([...ids, id]);
  };

  // Color follows the campaign's position in the selection, so a campaign keeps its color while selected.
  const series = (details.data ?? []).map((d, i) => ({
    id: d.campaign.id,
    name: d.campaign.name,
    color: theme.series[i],
    daily: d.daily,
    campaign: d.campaign,
  }));

  // Best value per metric among the selection, to highlight the winner in the table.
  const best = Object.fromEntries(
    METRIC_KEYS.map((m) => {
      const vals = series.map((s) => s.campaign.metrics[m]).filter((v) => v > 0);
      const pick = METRICS[m].higherIsBetter === false ? Math.min(...vals) : Math.max(...vals);
      return [m, METRICS[m].higherIsBetter === null || !vals.length ? null : pick];
    }),
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Compare campaigns</h1>
          <p className="muted">Pick 2–{MAX} campaigns to compare their performance side by side.</p>
        </div>
      </div>

      <div className="filterbar"><DateRangeControl /></div>

      <section className="card">
        <div className="card-head"><h3>Campaigns</h3><span className="muted small">{ids.length}/{MAX} selected</span></div>
        <div className="chips">
          {all.data?.map((c) => {
            const idx = ids.indexOf(c.id);
            return (
              <button
                key={c.id}
                className={`chip ${idx >= 0 ? 'on' : ''}`}
                onClick={() => toggle(c.id)}
                disabled={idx < 0 && ids.length >= MAX}
                aria-pressed={idx >= 0}
              >
                {idx >= 0 && <span className="swatch" style={{ background: theme.series[idx] }} />}
                {c.name}
              </button>
            );
          })}
        </div>
      </section>

      {ids.length < 2 && <p className="empty">Select at least two campaigns above.</p>}
      {details.error && <p className="form-error" role="alert">{details.error}</p>}

      {ids.length >= 2 && series.length >= 2 && (
        <>
          <ChartCard
            title={`${METRICS[metric].label} over time`}
            actions={<MetricPicker value={metric} onChange={setMetric} options={METRIC_KEYS} />}
            chart={<CompareChart series={series} metric={metric} />}
            table={
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    {series.map((s) => <th key={s.id} className="num">{s.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[...series[0].daily].reverse().map((d, ri) => {
                    const i = series[0].daily.length - 1 - ri;
                    return (
                      <tr key={d.date}>
                        <td>{fmtDate(d.date)}</td>
                        {series.map((s) => <td key={s.id} className="num">{METRICS[metric].format(s.daily[i]?.[metric] ?? 0)}</td>)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            }
          />

          <section className="card">
            <div className="card-head">
              <h3>Head-to-head</h3>
              <span className="muted small">★ marks the best value in each row</span>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    {series.map((s) => (
                      <th key={s.id} className="num">
                        <span className="swatch" style={{ background: s.color }} /> <Link to={`/campaigns/${s.id}`}>{s.name}</Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Status / platform</td>
                    {series.map((s) => (
                      <td key={s.id} className="num">
                        <StatusBadge status={s.campaign.status} /> <PlatformTag platform={s.campaign.platform} />
                      </td>
                    ))}
                  </tr>
                  {METRIC_KEYS.map((m) => (
                    <tr key={m}>
                      <td title={METRICS[m].description}>{METRICS[m].label}</td>
                      {series.map((s) => {
                        const v = s.campaign.metrics[m];
                        const isBest = best[m] !== null && v === best[m];
                        return (
                          <td key={s.id} className={`num ${isBest ? 'best' : ''}`}>
                            {METRICS[m].format(v)} {isBest && <span aria-label="best">★</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
