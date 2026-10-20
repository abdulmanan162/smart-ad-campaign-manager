import { METRICS, pctChange } from '../lib/format';
import type { MetricKey, Metrics } from '../lib/types';

interface Props {
  metric: MetricKey;
  current: Metrics;
  previous?: Metrics;
  active?: boolean;
  onClick?: () => void;
}

export function KpiTile({ metric, current, previous, active, onClick }: Props) {
  const def = METRICS[metric];
  const change = previous ? pctChange(current[metric], previous[metric]) : null;
  let tone = 'neutral';
  if (change !== null && def.higherIsBetter !== null && Math.abs(change) >= 0.05) {
    tone = change > 0 === def.higherIsBetter ? 'good' : 'bad';
  }

  return (
    <button className={`kpi ${active ? 'on' : ''}`} onClick={onClick} title={def.description} aria-pressed={active}>
      <span className="kpi-label">{def.label}</span>
      <span className="kpi-value">{def.format(current[metric])}</span>
      {change !== null ? (
        <span className={`kpi-delta ${tone}`}>
          <span aria-hidden>{change > 0 ? '▲' : change < 0 ? '▼' : '–'}</span> {Math.abs(change).toFixed(1)}%
          <span className="muted"> vs prev.</span>
        </span>
      ) : (
        previous && <span className="kpi-delta neutral muted">No prior data</span>
      )}
    </button>
  );
}
