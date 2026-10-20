import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CampaignForm } from '../components/CampaignForm';
import { FilterBar } from '../components/FilterBar';
import { MetricsForm } from '../components/MetricsForm';
import { ConfirmDialog } from '../components/Modal';
import { PlatformTag, StatusBadge } from '../components/StatusBadge';
import { api } from '../lib/api';
import { fmtMoney, METRICS } from '../lib/format';
import { useRange } from '../lib/RangeContext';
import type { Campaign, MetricKey, Platform, Status } from '../lib/types';
import { useAsync } from '../lib/useAsync';

const COLUMNS: MetricKey[] = ['impressions', 'clicks', 'conversions', 'spend', 'ctr', 'cpc', 'conversionRate'];
const MAX_COMPARE = 4;

type SortKey = 'name' | 'budgetUsed' | MetricKey;

export function Campaigns() {
  const { range } = useRange();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState<Status | ''>((params.get('status') as Status) ?? '');
  const [platform, setPlatform] = useState<Platform | ''>((params.get('platform') as Platform) ?? '');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'spend', dir: -1 });
  const [selected, setSelected] = useState<number[]>([]);
  const [editing, setEditing] = useState<Campaign | 'new' | null>(params.get('new') ? 'new' : null);
  const [recording, setRecording] = useState<Campaign | null>(null);
  const [deleting, setDeleting] = useState<Campaign | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Keep filters shareable via the URL.
  useEffect(() => {
    const next = new URLSearchParams();
    if (status) next.set('status', status);
    if (platform) next.set('platform', platform);
    setParams(next, { replace: true });
  }, [status, platform, setParams]);

  const { data, error, loading, reload } = useAsync(
    () => api.listCampaigns(range, { status, platform, search: debounced }),
    [range.from, range.to, status, platform, debounced],
  );

  const rows = [...(data ?? [])].sort((a, b) => {
    const va = sort.key === 'name' ? a.name.toLowerCase() : sort.key === 'budgetUsed' ? a.budgetUsed : a.metrics[sort.key];
    const vb = sort.key === 'name' ? b.name.toLowerCase() : sort.key === 'budgetUsed' ? b.budgetUsed : b.metrics[sort.key];
    return va < vb ? -sort.dir : va > vb ? sort.dir : 0;
  });

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  async function changeStatus(c: Campaign, next: Status) {
    setBusy(c.id);
    try {
      await api.setStatus(c.id, next);
      flash(`“${c.name}” is now ${next}.`);
      reload();
    } catch (e) {
      flash((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(deleting.id);
    try {
      await api.deleteCampaign(deleting.id);
      flash(`Deleted “${deleting.name}”.`);
      setSelected((s) => s.filter((id) => id !== deleting.id));
      setDeleting(null);
      reload();
    } catch (e) {
      flash((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const toggleSelect = (id: number) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < MAX_COMPARE ? [...s, id] : s));

  const header = (key: SortKey, label: string, num = true) => (
    <th className={num ? 'num' : ''} aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button className="th-sort" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (-s.dir as 1 | -1) : -1 }))}>
        {label}
        {sort.key === key && <span aria-hidden>{sort.dir === 1 ? ' ↑' : ' ↓'}</span>}
      </button>
    </th>
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Campaigns</h1>
          <p className="muted">Metrics reflect the selected date range. Budget used is lifetime spend vs. total budget.</p>
        </div>
        <button className="btn primary" onClick={() => setEditing('new')}>+ New campaign</button>
      </div>

      <FilterBar status={status} platform={platform} onStatus={setStatus} onPlatform={setPlatform}>
        <input type="search" placeholder="Search campaigns…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search campaigns" />
      </FilterBar>

      {selected.length > 0 && (
        <div className="selection-bar">
          <span>{selected.length} selected (max {MAX_COMPARE})</span>
          <button className="btn primary sm" disabled={selected.length < 2} onClick={() => navigate(`/compare?ids=${selected.join(',')}`)}>
            Compare {selected.length >= 2 ? selected.length : ''} campaigns
          </button>
          <button className="btn sm" onClick={() => setSelected([])}>Clear</button>
        </div>
      )}

      {notice && <div className="toast" role="status">{notice}</div>}
      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="card table-card">
        <div className="table-wrap">
          <table className="table campaigns">
            <thead>
              <tr>
                <th className="check"><span className="sr-only">Select to compare</span></th>
                {header('name', 'Campaign', false)}
                <th>Status</th>
                {header('budgetUsed', 'Budget used')}
                {COLUMNS.map((m) => header(m, METRICS[m].short))}
                <th className="actions-col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className={busy === c.id ? 'busy' : ''}>
                  <td className="check">
                    <input
                      type="checkbox"
                      checked={selected.includes(c.id)}
                      disabled={!selected.includes(c.id) && selected.length >= MAX_COMPARE}
                      onChange={() => toggleSelect(c.id)}
                      aria-label={`Select ${c.name} to compare`}
                    />
                  </td>
                  <td>
                    <Link className="row-title" to={`/campaigns/${c.id}`}>{c.name}</Link>
                    <div className="row-sub">
                      <PlatformTag platform={c.platform} />
                      {c.objective && <span className="muted small">{c.objective}</span>}
                    </div>
                  </td>
                  <td><StatusBadge status={c.status} /></td>
                  <td className="num">
                    <div className="budget">
                      <div className="meter" aria-hidden>
                        <span style={{ width: `${Math.min(100, c.budgetUsed)}%` }} className={c.budgetUsed >= 100 ? 'over' : ''} />
                      </div>
                      <span className="small">{c.budgetUsed.toFixed(0)}% of {fmtMoney(c.budget)}</span>
                    </div>
                  </td>
                  {COLUMNS.map((m) => <td key={m} className="num">{METRICS[m].format(c.metrics[m])}</td>)}
                  <td className="actions-col">
                    <div className="row-actions">
                      {c.status === 'active' && <button className="btn sm" onClick={() => changeStatus(c, 'paused')}>Pause</button>}
                      {c.status === 'paused' && <button className="btn sm" onClick={() => changeStatus(c, 'active')}>Resume</button>}
                      {c.status === 'draft' && <button className="btn sm" onClick={() => changeStatus(c, 'active')}>Launch</button>}
                      <button className="btn sm ghost" onClick={() => setRecording(c)} title="Record daily metrics">+ Metrics</button>
                      <button className="btn sm ghost" onClick={() => setEditing(c)}>Edit</button>
                      <button className="btn sm ghost danger-text" onClick={() => setDeleting(c)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && rows.length === 0 && (
            <p className="empty">No campaigns match these filters. <button className="link" onClick={() => setEditing('new')}>Create one</button></p>
          )}
          {loading && !data && <p className="empty">Loading campaigns…</p>}
        </div>
      </div>

      {editing && (
        <CampaignForm
          campaign={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={(id) => {
            const created = editing === 'new';
            setEditing(null);
            if (created) navigate(`/campaigns/${id}`);
            else {
              flash('Campaign updated.');
              reload();
            }
          }}
        />
      )}
      {recording && (
        <MetricsForm
          campaignId={recording.id}
          onClose={() => setRecording(null)}
          onSaved={() => {
            flash(`Metrics recorded for “${recording.name}”.`);
            setRecording(null);
            reload();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete campaign?"
          message={<>“{deleting.name}” and all of its recorded metrics will be permanently deleted. This can’t be undone.</>}
          confirmLabel="Delete campaign"
          danger
          busy={busy === deleting.id}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
