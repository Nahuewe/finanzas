// Los colores viven en src/styles/themes.css (una paleta por tema). Acá se leen del tema activo
// para los gráficos de Chart.js, que no entiende variables CSS.
export const C = {};
export const COLORS = [];

const triple = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim().replace(/\s+/g, ',');

/** Vuelve a leer la paleta del tema activo (llamar después de cambiar data-theme). */
export function syncTheme() {
  if (typeof document === 'undefined') return;
  const rgb = {};
  ['bg', 'ink', 'ink-dim', 'ink-faint', 'line-soft', 'accent', 'pos', 'neg', 'gold', 'indigo', 'orange'].forEach((n) => { rgb[n.replace(/-(\w)/g, (_, c) => c.toUpperCase())] = triple('--c-' + n); });
  const c = (n) => `rgb(${rgb[n]})`;
  Object.assign(C, {
    ink: c('ink'), inkDim: c('inkDim'), inkFaint: c('inkFaint'), grid: c('lineSoft'), bg: c('bg'),
    purple: c('accent'), purpleSoftBg: `rgba(${rgb.accent},.12)`,
    green: c('pos'), greenSoftBg: `rgba(${rgb.pos},`,
    red: c('neg'), redSoftBg: `rgba(${rgb.neg},`,
    gold: c('gold'), indigo: c('indigo'), orange: c('orange'),
    rgb,
  });
  COLORS.length = 0;
  for (let i = 1; i <= 12; i++) COLORS.push(`rgb(${triple('--cat-' + i)})`);
}

/** rgba(<color del tema>, alpha) — p. ej. A('accent', .5). */
export const A = (name, alpha) => `rgba(${C.rgb[name]},${alpha})`;

syncTheme();

export const DAY_NAMES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

export let RAW = { gastos: [], ingresos: [], transferencias: [] };
export let FILTERED = { gastos: [], ingresos: [] };
export let FILTERS = { year: 'all', month: 'all', period: 'all', account: 'all', category: 'all', minAmount: 0, from: '', to: '', text: '' };
export let CHARTS = {};
export let METRICS = null;
export let CAT_SEARCH = '';
export const OPEN_CATS = new Set();
export const SKIP_CATS = new Set(['']);

export let EXCLUDED_GAS_CATS = new Set();
export let EXCLUDED_ING_CATS = new Set();
export let EXCLUDED_ACCOUNTS = new Set();

export function setRaw(data) { RAW = data; }
export function setFiltered(data) { FILTERED = data; }
export function setMetrics(m) { METRICS = m; }
export function setFilters(data) { FILTERS = data; }
export function setCatSearch(v) { CAT_SEARCH = v; }
export function setExcludedGasCats(s) { EXCLUDED_GAS_CATS = s; }
export function setExcludedIngCats(s) { EXCLUDED_ING_CATS = s; }
export function setExcludedAccounts(s) { EXCLUDED_ACCOUNTS = s; }
export const isExcludedAcc = (r) => EXCLUDED_ACCOUNTS.has(r.cuenta);
