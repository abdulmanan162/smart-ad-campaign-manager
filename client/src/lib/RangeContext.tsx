import { createContext, useContext, useState, type ReactNode } from 'react';
import { presetRange, type PresetKey } from './dates';
import type { DateRange } from './types';

interface RangeState {
  range: DateRange;
  preset: PresetKey;
  setPreset: (p: Exclude<PresetKey, 'custom'>) => void;
  setCustom: (r: DateRange) => void;
}

const RangeContext = createContext<RangeState | null>(null);

/** Shares the selected date range across every page so it survives navigation. */
export function RangeProvider({ children }: { children: ReactNode }) {
  const [preset, setPresetKey] = useState<PresetKey>('30d');
  const [range, setRange] = useState<DateRange>(() => presetRange('30d'));

  const value: RangeState = {
    range,
    preset,
    setPreset: (p) => {
      setPresetKey(p);
      setRange(presetRange(p));
    },
    setCustom: (r) => {
      setPresetKey('custom');
      setRange(r);
    },
  };
  return <RangeContext.Provider value={value}>{children}</RangeContext.Provider>;
}

export function useRange() {
  const ctx = useContext(RangeContext);
  if (!ctx) throw new Error('useRange must be used inside RangeProvider');
  return ctx;
}
