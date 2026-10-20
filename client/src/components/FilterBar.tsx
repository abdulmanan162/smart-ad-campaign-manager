import { useState, type ReactNode } from 'react';
import { PRESETS } from '../lib/dates';
import { PLATFORM_LABEL, STATUS_LABEL } from '../lib/format';
import { useRange } from '../lib/RangeContext';
import { PLATFORMS, STATUSES, type Platform, type Status } from '../lib/types';

export function DateRangeControl() {
  const { range, preset, setPreset, setCustom } = useRange();
  const [draft, setDraft] = useState(range);
  const [open, setOpen] = useState(false);

  return (
    <div className="range">
      <div className="segmented" role="group" aria-label="Date range">
        {PRESETS.map((p) => (
          <button key={p.key} className={preset === p.key ? 'on' : ''} onClick={() => setPreset(p.key)}>
            {p.label.replace('Last ', '')}
          </button>
        ))}
        <button
          className={preset === 'custom' ? 'on' : ''}
          onClick={() => {
            setDraft(range);
            setOpen((o) => !o);
          }}
        >
          Custom
        </button>
      </div>
      {open && (
        <form
          className="range-custom"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.from <= draft.to) {
              setCustom(draft);
              setOpen(false);
            }
          }}
        >
          <input type="date" value={draft.from} max={draft.to} onChange={(e) => setDraft({ ...draft, from: e.target.value })} required />
          <span>to</span>
          <input type="date" value={draft.to} min={draft.from} onChange={(e) => setDraft({ ...draft, to: e.target.value })} required />
          <button className="btn primary sm" type="submit">Apply</button>
        </form>
      )}
    </div>
  );
}

interface FilterBarProps {
  status?: Status | '';
  platform?: Platform | '';
  onStatus?: (s: Status | '') => void;
  onPlatform?: (p: Platform | '') => void;
  children?: ReactNode;
}

/** One row of filters above the content: date range, then dimension filters. */
export function FilterBar({ status, platform, onStatus, onPlatform, children }: FilterBarProps) {
  return (
    <div className="filterbar">
      <DateRangeControl />
      {onStatus && (
        <select aria-label="Status" value={status} onChange={(e) => onStatus(e.target.value as Status | '')}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      )}
      {onPlatform && (
        <select aria-label="Platform" value={platform} onChange={(e) => onPlatform(e.target.value as Platform | '')}>
          <option value="">All platforms</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>
          ))}
        </select>
      )}
      {children}
    </div>
  );
}
