import { CHARTS } from './state.js';

export const fmt = (n) =>
  Math.abs(n) >= 1e6
    ? (n < 0 ? '-' : '') + '$' + (Math.abs(n) / 1e6).toFixed(1) + 'M'
    : Math.abs(n) >= 1e3
    ? (n < 0 ? '-' : '') + '$' + (Math.abs(n) / 1e3).toFixed(0) + 'K'
    : '$' + Math.round(n).toLocaleString('es-AR');

export const fmtFull = (n) => '$' + Math.round(n).toLocaleString('es-AR');
export const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-');

export function groupBy(arr, key) {
  return arr.reduce((a, r) => {
    const k = r[key] || '';
    a[k] = (a[k] || 0) + r.monto;
    return a;
  }, {});
}

export function groupByMon(arr) {
  return arr.reduce((a, r) => {
    const k = r.fecha?.slice(0, 7);
    if (k) a[k] = (a[k] || 0) + r.monto;
    return a;
  }, {});
}

export function sortedEntries(obj) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]);
}

export function allMonths(g, i) {
  return [...new Set([...Object.keys(groupByMon(g)), ...Object.keys(groupByMon(i))])].sort();
}

export function destroyChart(id) {
  if (CHARTS[id]) { CHARTS[id].destroy(); delete CHARTS[id]; }
}

export function mkChart(id, config) {
  destroyChart(id);
  const ctx = document.getElementById(id);
  if (!ctx) return;
  const Chart = window.Chart;
  CHARTS[id] = new Chart(ctx, config);
}

export const axX = {
  ticks: { color: '#8d7fb5', font: { size: 9, family: 'JetBrains Mono' }, maxRotation: 45 },
  grid: { color: '#251d40' }
};

export const axY = (cb) => ({
  ticks: { color: '#8d7fb5', callback: cb || ((v) => fmt(v)), font: { size: 9, family: 'JetBrains Mono' } },
  grid: { color: '#251d40' }
});

export const tooltipARS = { callbacks: { label: (ctx) => fmtFull(ctx.raw) } };

export const legendStyle = {
  labels: { color: '#b6abd6', font: { size: 10, family: 'JetBrains Mono' }, boxWidth: 10, padding: 8 }
};
