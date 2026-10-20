import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { toISO } from '../lib/dates';
import type { DailyPoint } from '../lib/types';
import { Modal } from './Modal';

interface Props {
  campaignId: number;
  initial?: DailyPoint; // pre-fill when editing an existing day
  onClose: () => void;
  onSaved: () => void;
}

/** Record or overwrite one day's delivery numbers for a campaign. */
export function MetricsForm({ campaignId, initial, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    date: initial?.date ?? toISO(new Date()),
    impressions: String(initial?.impressions ?? ''),
    clicks: String(initial?.clicks ?? ''),
    conversions: String(initial?.conversions ?? ''),
    spend: String(initial?.spend ?? ''),
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const n = { impressions: Number(form.impressions), clicks: Number(form.clicks), conversions: Number(form.conversions), spend: Number(form.spend) };
  const preview = {
    ctr: n.impressions ? (n.clicks / n.impressions) * 100 : 0,
    cpc: n.clicks ? n.spend / n.clicks : 0,
    cvr: n.clicks ? (n.conversions / n.clicks) * 100 : 0,
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (n.clicks > n.impressions) return setError('Clicks cannot exceed impressions.');
    if (n.conversions > n.clicks) return setError('Conversions cannot exceed clicks.');
    setSaving(true);
    setError(null);
    try {
      await api.recordMetrics(campaignId, { date: form.date, ...n });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title="Record daily metrics" onClose={onClose} width={480}>
      <form className="form" onSubmit={submit}>
        <label className="span-2">
          Date
          <input type="date" value={form.date} max={toISO(new Date())} onChange={(e) => set('date', e.target.value)} required />
        </label>
        <label>
          Impressions
          <input type="number" min="0" step="1" value={form.impressions} onChange={(e) => set('impressions', e.target.value)} required />
        </label>
        <label>
          Clicks
          <input type="number" min="0" step="1" value={form.clicks} onChange={(e) => set('clicks', e.target.value)} required />
        </label>
        <label>
          Conversions
          <input type="number" min="0" step="1" value={form.conversions} onChange={(e) => set('conversions', e.target.value)} required />
        </label>
        <label>
          Spend ($)
          <input type="number" min="0" step="0.01" value={form.spend} onChange={(e) => set('spend', e.target.value)} required />
        </label>
        <p className="muted span-2 preview">
          CTR {preview.ctr.toFixed(2)}% · CPC ${preview.cpc.toFixed(2)} · Conv. rate {preview.cvr.toFixed(2)}%
        </p>
        <p className="muted span-2 small">Saving a date that already has data overwrites it.</p>
        {error && <p className="form-error span-2" role="alert">{error}</p>}
        <div className="modal-actions span-2">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={saving}>{saving ? 'Saving…' : 'Save metrics'}</button>
        </div>
      </form>
    </Modal>
  );
}
