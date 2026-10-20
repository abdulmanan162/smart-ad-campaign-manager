import type { DateRange } from './types';

export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export type PresetKey = '7d' | '30d' | '90d' | 'mtd' | 'custom';

export const PRESETS: { key: Exclude<PresetKey, 'custom'>; label: string }[] = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: 'mtd', label: 'Month to date' },
];

export function presetRange(key: Exclude<PresetKey, 'custom'>): DateRange {
  const today = new Date();
  const to = toISO(today);
  if (key === 'mtd') return { from: toISO(new Date(today.getFullYear(), today.getMonth(), 1)), to };
  const days = { '7d': 7, '30d': 30, '90d': 90 }[key];
  const from = new Date(today);
  from.setDate(from.getDate() - days + 1);
  return { from: toISO(from), to };
}
