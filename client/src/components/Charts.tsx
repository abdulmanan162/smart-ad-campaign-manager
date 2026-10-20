import { useState, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import { useChartTheme } from '../lib/chartTheme';
import { fmtDate, METRICS } from '../lib/format';
import type { DailyPoint, MetricKey, Metrics } from '../lib/types';

/** Card wrapper with a Chart / Table toggle so every chart has an accessible table view. */
export function ChartCard({ title, subtitle, actions, chart, table }: { title: string; subtitle?: ReactNode; actions?: ReactNode; chart: ReactNode; table: ReactNode }) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h3>{title}</h3>
          {subtitle && <p className="muted small">{subtitle}</p>}
        </div>
        <div className="card-actions">
          {actions}
          <div className="segmented sm" role="group" aria-label="View">
            <button className={view === 'chart' ? 'on' : ''} onClick={() => setView('chart')}>Chart</button>
            <button className={view === 'table' ? 'on' : ''} onClick={() => setView('table')}>Table</button>
          </div>
        </div>
      </div>
      {view === 'chart' ? chart : <div className="table-wrap chart-table">{table}</div>}
    </section>
  );
}

export function MetricPicker({ value, onChange, options }: { value: MetricKey; onChange: (m: MetricKey) => void; options: MetricKey[] }) {
  return (
    <select aria-label="Metric" value={value} onChange={(e) => onChange(e.target.value as MetricKey)}>
      {options.map((k) => (
        <option key={k} value={k}>{METRICS[k].label}</option>
      ))}
    </select>
  );
}

function TooltipBox({ title, rows }: { title: string; rows: { color: string; label: string; value: string }[] }) {
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="chart-tooltip-row">
          <span className="swatch" style={{ background: r.color }} />
          <span className="chart-tooltip-label">{r.label}</span>
          <span className="chart-tooltip-value">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

const axisProps = (color: string) => ({
  tick: { fill: color, fontSize: 12 },
  tickLine: false,
  axisLine: false,
});

/** Single metric over time (one series, one axis). */
export function TrendChart({ data, metric, height = 280 }: { data: DailyPoint[]; metric: MetricKey; height?: number }) {
  const t = useChartTheme();
  const def = METRICS[metric];
  const color = t.series[0];
  const gradientId = `trend-${metric}`;

  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={t.grid} />
          <XAxis dataKey="date" {...axisProps(t.muted)} tickFormatter={(d) => fmtDate(d)} minTickGap={32} stroke={t.axis} axisLine={{ stroke: t.axis }} />
          <YAxis {...axisProps(t.muted)} tickFormatter={def.axis} width={64} />
          <Tooltip
            cursor={{ stroke: t.cursor, strokeWidth: 1 }}
            content={({ active, payload, label }: TooltipProps<number, string>) =>
              active && payload?.length ? (
                <TooltipBox
                  title={fmtDate(String(label), { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  rows={[{ color, label: def.label, value: def.format(Number(payload[0].value)) }]}
                />
              ) : null
            }
          />
          <Area
            type="monotone"
            dataKey={metric}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            activeDot={{ r: 5, stroke: t.surface, strokeWidth: 2, fill: color }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailyTable({ data, metrics }: { data: DailyPoint[]; metrics: MetricKey[] }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Date</th>
          {metrics.map((m) => <th key={m} className="num">{METRICS[m].label}</th>)}
        </tr>
      </thead>
      <tbody>
        {[...data].reverse().map((d) => (
          <tr key={d.date}>
            <td>{fmtDate(d.date, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
            {metrics.map((m) => <td key={m} className="num">{METRICS[m].format(d[m])}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Horizontal bars for comparing one metric across categories; one series, one color. */
export function BarBreakdown<T extends Metrics>({ data, metric, labelOf, onSelect }: { data: T[]; metric: MetricKey; labelOf: (d: T) => string; onSelect?: (d: T) => void }) {
  const t = useChartTheme();
  const def = METRICS[metric];
  const rows = [...data].sort((a, b) => b[metric] - a[metric]).map((d) => ({ ...d, __label: labelOf(d), __src: d }));
  const height = Math.max(120, rows.length * 36 + 32);

  if (!rows.length) return <p className="empty">No data for this selection.</p>;

  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }} barCategoryGap={8}>
          <CartesianGrid horizontal={false} stroke={t.grid} />
          <XAxis type="number" {...axisProps(t.muted)} tickFormatter={def.axis} />
          <YAxis type="category" dataKey="__label" {...axisProps(t.muted)} width={170} tickFormatter={(s: string) => (s.length > 24 ? `${s.slice(0, 23)}…` : s)} />
          <Tooltip
            cursor={{ fill: t.grid, opacity: 0.5 }}
            content={({ active, payload }: TooltipProps<number, string>) =>
              active && payload?.length ? (
                <TooltipBox
                  title={String(payload[0].payload.__label)}
                  rows={[{ color: t.series[0], label: def.label, value: def.format(Number(payload[0].value)) }]}
                />
              ) : null
            }
          />
          <Bar
            dataKey={metric}
            fill={t.series[0]}
            radius={[0, 4, 4, 0]}
            maxBarSize={22}
            isAnimationActive={false}
            cursor={onSelect ? 'pointer' : undefined}
            onClick={onSelect ? (d: { __src: T }) => onSelect(d.__src) : undefined}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface CompareSeries {
  id: number;
  name: string;
  color: string;
  daily: DailyPoint[];
}

/** Up to 4 campaigns over time on one shared axis. Legend + direct end labels; color follows the campaign. */
export function CompareChart({ series, metric, height = 320 }: { series: CompareSeries[]; metric: MetricKey; height?: number }) {
  const t = useChartTheme();
  const def = METRICS[metric];
  const dates = series[0]?.daily.map((d) => d.date) ?? [];
  const data = dates.map((date, i) => {
    const row: Record<string, number | string> = { date };
    for (const s of series) row[`s${s.id}`] = s.daily[i]?.[metric] ?? 0;
    return row;
  });
  const short = (n: string) => (n.length > 16 ? `${n.slice(0, 15)}…` : n);

  return (
    <>
      <ul className="legend">
        {series.map((s) => (
          <li key={s.id}>
            <span className="swatch line" style={{ background: s.color }} />
            {s.name}
          </li>
        ))}
      </ul>
      <div className="chart" style={{ height }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 120, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={t.grid} />
            <XAxis dataKey="date" {...axisProps(t.muted)} tickFormatter={(d) => fmtDate(d)} minTickGap={32} axisLine={{ stroke: t.axis }} />
            <YAxis {...axisProps(t.muted)} tickFormatter={def.axis} width={64} />
            <Tooltip
              cursor={{ stroke: t.cursor, strokeWidth: 1 }}
              content={({ active, payload, label }: TooltipProps<number, string>) =>
                active && payload?.length ? (
                  <TooltipBox
                    title={fmtDate(String(label), { weekday: 'short', month: 'short', day: 'numeric' })}
                    rows={series.map((s) => ({
                      color: s.color,
                      label: s.name,
                      value: def.format(Number(payload.find((p) => p.dataKey === `s${s.id}`)?.value ?? 0)),
                    }))}
                  />
                ) : null
              }
            />
            {series.map((s) => (
              <Line
                key={s.id}
                type="monotone"
                dataKey={`s${s.id}`}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, stroke: t.surface, strokeWidth: 2 }}
                isAnimationActive={false}
                label={({ x, y, index }: { x: number; y: number; index: number }) =>
                  index === data.length - 1 ? (
                    <text x={x + 8} y={y} dy={4} fontSize={12} fill={t.muted}>{short(s.name)}</text>
                  ) : (
                    <g />
                  )
                }
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
