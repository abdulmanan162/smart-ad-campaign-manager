import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CampaignForm } from '../components/CampaignForm';
import { ChartCard, DailyTable, MetricPicker, TrendChart } from '../components/Charts';
import { DateRangeControl } from '../components/FilterBar';
import { KpiTile } from '../components/KpiTile';
import { MetricsForm } from '../components/MetricsForm';
import { ConfirmDialog } from '../components/Modal';
import { PlatformTag, StatusBadge } from '../components/StatusBadge';
import { api } from '../lib/api';
import { fmtDate, fmtMoney, METRIC_KEYS, METRICS } from '../lib/format';
import { useRange } from '../lib/RangeContext';
import type { DailyPoint, MetricKey, Status } from '../lib/types';
import { useAsync } from '../lib/useAsync';

export function CampaignDetail() {
  const id = Number(useParams().id);
  const { range } = useRange();
  const navigate = useNavigate();
  const [metric, setMetric] = useState<MetricKey>('clicks');
  const [editing, setEditing] = useState(false);
  const [recording, setRecording] = useState<DailyPoint | 'new' | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, error, reload } = useAsync(() => api.getCampaign(id, range), [id, range.from, range.to]);

  if (error) {
    return (
      <div className="page">
        <p className="form-error" role="alert">{error}</p>
        <Link to="/campaigns">← Back to campaigns</Link>
      </div>
    );
  }
  if (!data) return <div className="page"><p className="empty">Loading…</p></div>;

  const { campaign: c, daily } = data;
  const daysActive = daily.filter((d) => d.impressions > 0).length;
  const avgDailySpend = daysActive ? c.metrics.spend / daysActive : 0;

  async function setStatus(next: Status) {
    setBusy(true);
    setActionError(null);
    try {
      await api.setStatus(c.id, next);
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.deleteCampaign(c.id);
      navigate('/campaigns');
    } catch (e) {
      setActionError((e as Error).message);
      setBusy(false);
      setDeleting(false);
    }
  }

  return (
    <div className="page">
      <Link to="/campaigns" className="back">← Campaigns</Link>
      <div className="page-head">
        <div>
          <h1>{c.name}</h1>
          <div className="row-sub">
            <StatusBadge status={c.status} />
            <PlatformTag platform={c.platform} />
            {c.objective && <span className="muted">{c.objective}</span>}
            <span className="muted">
              {fmtDate(c.startDate, { month: 'short', day: 'numeric', year: 'numeric' })}
              {' → '}
              {c.endDate ? fmtDate(c.endDate, { month: 'short', day: 'numeric', year: 'numeric' }) : 'ongoing'}
            </span>
          </div>
        </div>
        <div className="row-actions">
          {c.status === 'active' && <button className="btn" disabled={busy} onClick={() => setStatus('paused')}>Pause</button>}
          {c.status === 'paused' && <button className="btn" disabled={busy} onClick={() => setStatus('active')}>Resume</button>}
          {c.status === 'draft' && <button className="btn" disabled={busy} onClick={() => setStatus('active')}>Launch</button>}
          {c.status !== 'completed' && c.status !== 'draft' && (
            <button className="btn ghost" disabled={busy} onClick={() => setStatus('completed')}>Mark completed</button>
          )}
          <button className="btn" onClick={() => setRecording('new')}>+ Record metrics</button>
          <button className="btn" onClick={() => setEditing(true)}>Edit</button>
          <button className="btn ghost danger-text" onClick={() => setDeleting(true)}>Delete</button>
        </div>
      </div>
      {actionError && <p className="form-error" role="alert">{actionError}</p>}

      <div className="filterbar"><DateRangeControl /></div>

      <section className="card budget-card">
        <div className="budget-stats">
          <div><span className="muted small">Total budget</span><strong>{fmtMoney(c.budget)}</strong></div>
          <div><span className="muted small">Lifetime spend</span><strong>{fmtMoney(c.lifetimeSpend)}</strong></div>
          <div><span className="muted small">Remaining</span><strong>{fmtMoney(Math.max(0, c.budget - c.lifetimeSpend))}</strong></div>
          <div><span className="muted small">Daily budget</span><strong>{c.dailyBudget != null ? fmtMoney(c.dailyBudget) : '—'}</strong></div>
          <div><span className="muted small">Avg. daily spend (range)</span><strong>{fmtMoney(avgDailySpend)}</strong></div>
        </div>
        <div className="meter lg" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(c.budgetUsed)} aria-label="Budget used">
          <span style={{ width: `${Math.min(100, c.budgetUsed)}%` }} className={c.budgetUsed >= 100 ? 'over' : ''} />
        </div>
        <p className="small muted">
          {c.budgetUsed.toFixed(1)}% of budget used
          {c.budgetUsed >= 100 && <strong className="warn-text"> · ⚠ Budget exhausted</strong>}
          {c.dailyBudget != null && avgDailySpend > c.dailyBudget && <strong className="warn-text"> · ⚠ Averaging above daily budget</strong>}
        </p>
      </section>

      <div className="kpi-grid">
        {METRIC_KEYS.map((m) => (
          <KpiTile key={m} metric={m} current={c.metrics} active={metric === m} onClick={() => setMetric(m)} />
        ))}
      </div>

      <ChartCard
        title={`${METRICS[metric].label} over time`}
        actions={<MetricPicker value={metric} onChange={setMetric} options={METRIC_KEYS} />}
        chart={<TrendChart data={daily} metric={metric} />}
        table={<DailyTable data={daily} metrics={METRIC_KEYS} />}
      />

      <section className="card">
        <div className="card-head">
          <h3>Daily log</h3>
          <span className="muted small">Click a row to edit that day</span>
        </div>
        <div className="table-wrap tall">
          <table className="table clickable">
            <thead>
              <tr>
                <th>Date</th>
                {(['impressions', 'clicks', 'conversions', 'spend', 'ctr', 'cpc', 'conversionRate'] as MetricKey[]).map((m) => (
                  <th key={m} className="num">{METRICS[m].short}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...daily].reverse().map((d) => (
                <tr key={d.date} onClick={() => setRecording(d)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setRecording(d)}>
                  <td>{fmtDate(d.date, { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                  {(['impressions', 'clicks', 'conversions', 'spend', 'ctr', 'cpc', 'conversionRate'] as MetricKey[]).map((m) => (
                    <td key={m} className={`num ${d.impressions === 0 ? 'muted' : ''}`}>{METRICS[m].format(d[m])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editing && <CampaignForm campaign={c} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload(); }} />}
      {recording && (
        <MetricsForm
          campaignId={c.id}
          initial={recording === 'new' ? undefined : recording}
          onClose={() => setRecording(null)}
          onSaved={() => { setRecording(null); reload(); }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete campaign?"
          message={<>“{c.name}” and all of its recorded metrics will be permanently deleted. This can’t be undone.</>}
          confirmLabel="Delete campaign"
          danger
          busy={busy}
          onConfirm={remove}
          onCancel={() => setDeleting(false)}
        />
      )}
    </div>
  );
}
