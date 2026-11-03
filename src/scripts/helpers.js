import { CHARTS, C } from './state.js';

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

// getters: el color se resuelve al usarse, así respeta el tema activo
export const axX = {
  get ticks() { return { color: C.inkFaint, font: { size: 9, family: 'JetBrains Mono' }, maxRotation: 45 }; },
  get grid() { return { color: C.grid }; }
};

export const axY = (cb) => ({
  ticks: { color: C.inkFaint, callback: cb || ((v) => fmt(v)), font: { size: 9, family: 'JetBrains Mono' } },
  grid: { color: C.grid }
});

export const tooltipARS = { callbacks: { label: (ctx) => fmtFull(ctx.raw) } };

export const legendStyle = {
  get labels() { return { color: C.inkDim, font: { size: 10, family: 'JetBrains Mono' }, boxWidth: 10, padding: 8 }; }
};

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const escRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const sum = (arr, key = 'monto') => arr.reduce((a, r) => a + r[key], 0);
export const monthLabel = (m) => m.slice(5) + '/' + m.slice(2, 4);
export const avg = (arr) => (arr.length ? arr.reduce((a, v) => a + v, 0) / arr.length : 0);

/** Opciones base de Chart.js; `extra` pisa/une plugins y scales. */
export function chartOpts({ legend = false, tooltip = tooltipARS, x = axX, y = axY(), extra = {} } = {}) {
  return {
    responsive: true,
    ...extra,
    plugins: { legend: legend ? legendStyle : { display: false }, tooltip, ...(extra.plugins || {}) },
    scales: { x, y, ...(extra.scales || {}) },
  };
}
