export const C = {
  ink: '#f1edfb',
  inkDim: '#b6abd6',
  inkFaint: '#8d7fb5',
  grid: '#251d40',
  bg: '#0f0a1a',
  purple: '#a78bfa',
  purpleSoftBg: 'rgba(167,139,250,.12)',
  green: '#4ade80',
  greenSoftBg: 'rgba(74,222,128,',
  red: '#fb7185',
  redSoftBg: 'rgba(251,113,133,',
};

export const COLORS = [
  '#a78bfa','#c084fc','#8b5cf6','#fb7185','#818cf8',
  '#fbbf24','#ddd6fe','#f472b6','#60a5fa','#4ade80','#fb923c','#e879f9'
];

export const DAY_NAMES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

export let RAW = { gastos: [], ingresos: [], transferencias: [] };
export let FILTERED = { gastos: [], ingresos: [] };
export let FILTERS = { year: 'all', month: 'all', period: 'all', account: 'all', category: 'all', minAmount: 0 };
export let CHARTS = {};
export let CAT_SEARCH = '';
export const OPEN_CATS = new Set();
export const SKIP_CATS = new Set(['']);

export let EXCLUDED_GAS_CATS = new Set();
export let EXCLUDED_ING_CATS = new Set();

export function setRaw(data) { RAW = data; }
export function setFiltered(data) { FILTERED = data; }
export function setFilters(data) { FILTERS = data; }
export function setCatSearch(v) { CAT_SEARCH = v; }
export function setExcludedGasCats(s) { EXCLUDED_GAS_CATS = s; }
export function setExcludedIngCats(s) { EXCLUDED_ING_CATS = s; }
