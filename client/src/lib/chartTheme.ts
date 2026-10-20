import { useEffect, useState } from 'react';

// Validated reference palette (dataviz skill). SVG attributes can't reliably resolve CSS
// variables, so charts read concrete hex values for the active color scheme.
const LIGHT = {
  series: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'],
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  muted: '#898781',
  surface: '#fcfcfb',
  cursor: '#52514e',
};

const DARK: typeof LIGHT = {
  series: ['#3987e5', '#d95926', '#199e70', '#c98500'],
  grid: '#2c2c2a',
  axis: '#383835',
  muted: '#898781',
  surface: '#1a1a19',
  cursor: '#c3c2b7',
};

export type ChartTheme = typeof LIGHT;

export function useChartTheme(): ChartTheme {
  const query = '(prefers-color-scheme: dark)';
  const [dark, setDark] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return dark ? DARK : LIGHT;
}
