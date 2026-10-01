export const C = {
  ink: '#efeaff',
  inkDim: '#b9b0d9',
  inkFaint: '#8b81b0',
  grid: '#221c3b',
  bg: '#0e0b17',
  purple: '#a78bfa',
  purpleSoftBg: 'rgba(167,139,250,.12)',
  green: '#4ade80',
  greenSoftBg: 'rgba(74,222,128,',
  red: '#fb7185',
  redSoftBg: 'rgba(251,113,133,',
};

export const COLORS = [
  '#a78bfa','#f472b6','#2dd4bf','#818cf8','#e879f9','#60a5fa',
  '#c4b5fd','#fb7185','#7c5cf0','#34d399','#fbbf24','#d946ef'
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
