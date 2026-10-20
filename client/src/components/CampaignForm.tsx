import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { toISO } from '../lib/dates';
import { PLATFORM_LABEL, STATUS_LABEL } from '../lib/format';
import { PLATFORMS, STATUSES, type Campaign, type CampaignInput } from '../lib/types';
import { Modal } from './Modal';

interface Props {
  campaign?: Campaign; // edit mode when provided
  onClose: () => void;
  onSaved: (id: number) => void;
}

export function CampaignForm({ campaign, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: campaign?.name ?? '',
    platform: campaign?.platform ?? 'google',
    status: campaign?.status ?? 'draft',
    objective: campaign?.objective ?? '',
    budget: campaign ? String(campaign.budget) : '',
    dailyBudget: campaign?.dailyBudget != null ? String(campaign.dailyBudget) : '',
    startDate: campaign?.startDate ?? toISO(new Date()),
    endDate: campaign?.endDate ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (form.endDate && form.endDate < form.startDate) return setError('End date must be on or after the start date.');
    if (form.dailyBudget && Number(form.dailyBudget) > Number(form.budget)) return setError('Daily budget cannot exceed the total budget.');

    const input: CampaignInput = {
      name: form.name.trim(),
      platform: form.platform,
      status: form.status,
      objective: form.objective.trim(),
      budget: Number(form.budget),
      dailyBudget: form.dailyBudget === '' ? null : Number(form.dailyBudget),
      startDate: form.startDate,
      endDate: form.endDate || null,
    };
    setSaving(true);
    setError(null);
    try {
      const { id } = campaign ? await api.updateCampaign(campaign.id, input) : await api.createCampaign(input);
      onSaved(id);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title={campaign ? 'Edit campaign' : 'New campaign'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label className="span-2">
          Campaign name
          <input value={form.name} onChange={(e) => set('name', e.target.value)} required maxLength={200} autoFocus placeholder="e.g. Spring Sale – Search" />
        </label>
        <label>
          Platform
          <select value={form.platform} onChange={(e) => set('platform', e.target.value as CampaignInput['platform'])}>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={form.status} onChange={(e) => set('status', e.target.value as CampaignInput['status'])}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </label>
        <label className="span-2">
          Objective
          <input value={form.objective} onChange={(e) => set('objective', e.target.value)} placeholder="Sales, Leads, Awareness…" maxLength={200} />
        </label>
        <label>
          Total budget ($)
          <input type="number" min="0" step="0.01" value={form.budget} onChange={(e) => set('budget', e.target.value)} required />
        </label>
        <label>
          Daily budget ($) <span className="muted">optional</span>
          <input type="number" min="0" step="0.01" value={form.dailyBudget} onChange={(e) => set('dailyBudget', e.target.value)} />
        </label>
        <label>
          Start date
          <input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} required />
        </label>
        <label>
          End date <span className="muted">optional</span>
          <input type="date" value={form.endDate} min={form.startDate} onChange={(e) => set('endDate', e.target.value)} />
        </label>
        {error && <p className="form-error span-2" role="alert">{error}</p>}
        <div className="modal-actions span-2">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saving…' : campaign ? 'Save changes' : 'Create campaign'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
