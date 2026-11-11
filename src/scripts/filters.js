import {
  RAW, FILTERS, SKIP_CATS, EXCLUDED_GAS_CATS, EXCLUDED_ING_CATS, EXCLUDED_ACCOUNTS,
  setFiltered, setMetrics, setFilters, setExcludedAccounts, OPEN_CATS,
} from './state.js';
import { buildMetrics } from './metrics.js';
import { matcher } from './config.js';
import { esc } from './helpers.js';
import { store } from './storage.js';
import { FX, marketRate } from './externalData.js';
import { renderAll } from './renderers/index.js';
import { buildExcludePanel } from './renderers/excludePanel.js';

export const DEFAULT_FILTERS = { year: 'all', month: 'all', period: 'all', account: 'all', category: 'all', minAmount: 0, from: '', to: '', text: '' };

/** Cantidad de filtros distintos del valor por defecto (para el botón de filtros en celular). */
export const activeFilterCount = () => Object.keys(DEFAULT_FILTERS).filter((k) => FILTERS[k] !== DEFAULT_FILTERS[k] && FILTERS[k] !== undefined).length;

export function applyFilters() {
  // opcional: valuar en pesos las operaciones en USD al dólar de mercado del día (en vez del tipo de cambio que cargó la app)
  const revalue = store.get('fxRevalue', false) && FX.state === 'ok';
  const reval = (r) => {
    if (!revalue || !r.usd) return r;
    const { rate } = marketRate(r.fecha, r.comentario);
    return rate ? { ...r, monto: r.usd * rate, montoOriginal: r.monto } : r;
  };

  let gasto = RAW.gastos.filter((r) => !SKIP_CATS.has(r.cat)).map(reval);
  let ingreso = RAW.ingresos.map(reval);

  if (FILTERS.from) {
    gasto = gasto.filter((r) => r.fecha >= FILTERS.from);
    ingreso = ingreso.filter((r) => r.fecha >= FILTERS.from);
  }
  if (FILTERS.to) {
    gasto = gasto.filter((r) => r.fecha <= FILTERS.to);
    ingreso = ingreso.filter((r) => r.fecha <= FILTERS.to);
  }
  if (FILTERS.text) {
    const q = FILTERS.text.toLowerCase();
    const hit = (r) => `${r.comentario} ${r.cat} ${r.cuenta}`.toLowerCase().includes(q);
    gasto = gasto.filter(hit);
    ingreso = ingreso.filter(hit);
  }

  if (EXCLUDED_ACCOUNTS.size > 0) {
    gasto = gasto.filter((r) => !EXCLUDED_ACCOUNTS.has(r.cuenta));
    ingreso = ingreso.filter((r) => !EXCLUDED_ACCOUNTS.has(r.cuenta));
  }

  if (FILTERS.year !== 'all') {
    gasto = gasto.filter((r) => r.fecha?.startsWith(FILTERS.year));
    ingreso = ingreso.filter((r) => r.fecha?.startsWith(FILTERS.year));
  }

  if (FILTERS.month !== 'all') {
    gasto = gasto.filter((r) => r.fecha?.startsWith(FILTERS.month));
    ingreso = ingreso.filter((r) => r.fecha?.startsWith(FILTERS.month));
  } else if (FILTERS.period !== 'all') {
    const months = +FILTERS.period;
    const allDates = [...gasto, ...ingreso].map((r) => r.fecha).filter(Boolean).sort();
    const maxDate = allDates[allDates.length - 1] || new Date().toISOString().split('T')[0];
    const d = new Date(maxDate);
    d.setMonth(d.getMonth() - months);
    const cutoff = d.toISOString().split('T')[0];
    gasto = gasto.filter((r) => r.fecha >= cutoff);
    ingreso = ingreso.filter((r) => r.fecha >= cutoff);
  }

  if (FILTERS.account !== 'all') {
    gasto = gasto.filter((r) => r.cuenta === FILTERS.account);
    ingreso = ingreso.filter((r) => r.cuenta === FILTERS.account);
  }

  if (FILTERS.category !== 'all') {
    gasto = gasto.filter((r) => r.cat === FILTERS.category);
  }

  if (FILTERS.minAmount > 0) {
    gasto = gasto.filter((r) => r.monto >= FILTERS.minAmount);
  }

  if (EXCLUDED_GAS_CATS.size > 0) {
    gasto = gasto.filter((r) => !EXCLUDED_GAS_CATS.has(r.cat));
  }

  if (EXCLUDED_ING_CATS.size > 0) {
    ingreso = ingreso.filter((r) => !EXCLUDED_ING_CATS.has(r.cat));
  }

  setFiltered({ gastos: gasto, ingresos: ingreso });
  setMetrics(buildMetrics(gasto, ingreso));

  const all = [...gasto, ...ingreso].map((r) => r.fecha).filter(Boolean).sort();
  document.getElementById('dateRangeLabel').textContent =
    all.length ? `${all[0]} → ${all[all.length - 1]}` : 'sin resultados';

  const n = activeFilterCount();
  const tog = document.getElementById('filtersToggle');
  if (tog) tog.textContent = n ? `⚙ Filtros (${n})` : '⚙ Filtros';

  OPEN_CATS.clear();
  renderAll();
}

/** Recalcula qué cuentas se excluyen (reservas) según la configuración y reconstruye el panel. */
export function refreshExclusions() {
  const isReserva = matcher('cuentasReserva');
  const accs = new Set([...RAW.gastos, ...RAW.ingresos].map((r) => r.cuenta).filter(Boolean));
  setExcludedAccounts(new Set([...accs].filter(isReserva)));
  buildExcludePanel();
}

export function resetFilters() {
  setFilters({ ...DEFAULT_FILTERS });
  ['filterFrom', 'filterTo', 'filterText'].forEach((id) => { document.getElementById(id).value = ''; });
  document.getElementById('filterYear').value = 'all';
  document.getElementById('filterAccount').value = 'all';
  document.getElementById('filterCategory').value = 'all';
  document.getElementById('filterMinAmount').value = '';
  document.querySelectorAll('[data-period]').forEach((b) =>
    b.classList.toggle('active', b.dataset.period === 'all')
  );
  buildMonthOptions();
  document.getElementById('filterMonth').value = 'all';
  applyFilters();
}

export function buildFilterOptions() {
  const years = [
    ...new Set(RAW.gastos.concat(RAW.ingresos).map((r) => r.fecha?.split('-')[0]).filter(Boolean))
  ].sort();
  const sel = document.getElementById('filterYear');
  sel.innerHTML = '<option value="all">Todos</option>';
  years.forEach((y) => sel.insertAdjacentHTML('beforeend', `<option value="${esc(y)}">${esc(y)}</option>`));

  const accounts = [
    ...new Set(RAW.gastos.concat(RAW.ingresos).map((r) => r.cuenta).filter(Boolean))
  ].sort();
  const acSel = document.getElementById('filterAccount');
  acSel.innerHTML = '<option value="all">Todas</option>';
  accounts.forEach((a) => acSel.insertAdjacentHTML('beforeend', `<option value="${esc(a)}">${esc(a)}</option>`));

  const cats = [
    ...new Set(RAW.gastos.filter((r) => !SKIP_CATS.has(r.cat)).map((r) => r.cat).filter(Boolean))
  ].sort();
  const catSel = document.getElementById('filterCategory');
  catSel.innerHTML = '<option value="all">Todas</option>';
  cats.forEach((c) => catSel.insertAdjacentHTML('beforeend', `<option value="${esc(c)}">${esc(c)}</option>`));

  buildMonthOptions();
  buildExcludePanel();
}

export function buildMonthOptions() {
  let months = [
    ...new Set(RAW.gastos.concat(RAW.ingresos).map((r) => r.fecha?.slice(0, 7)).filter(Boolean))
  ].sort();
  if (FILTERS.year !== 'all') months = months.filter((m) => m.startsWith(FILTERS.year));
  const sel = document.getElementById('filterMonth');
  sel.innerHTML = '<option value="all">Todos</option>';
  months.forEach((m) => sel.insertAdjacentHTML('beforeend', `<option value="${m}">${m}</option>`));
}
