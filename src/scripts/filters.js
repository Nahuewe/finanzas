import {
  RAW, FILTERS, SKIP_CATS, EXCLUDED_GAS_CATS, EXCLUDED_ING_CATS,
  setFiltered, setFilters, setCatSearch, OPEN_CATS,
} from './state.js';
import { groupByMon } from './helpers.js';
import { renderAll } from './renderers/index.js';
import { buildExcludePanel } from './renderers/excludePanel.js';

export function applyFilters() {
  let gasto = RAW.gastos.filter((r) => !SKIP_CATS.has(r.cat));
  let ingreso = [...RAW.ingresos];

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

  const all = [...gasto, ...ingreso].map((r) => r.fecha).filter(Boolean).sort();
  document.getElementById('dateRangeLabel').textContent =
    all.length ? `${all[0]} → ${all[all.length - 1]}` : 'sin resultados';

  OPEN_CATS.clear();
  renderAll();
}

export function resetFilters() {
  setFilters({ year: 'all', month: 'all', period: 'all', account: 'all', category: 'all', minAmount: 0 });
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
  years.forEach((y) => sel.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`));

  const accounts = [
    ...new Set(RAW.gastos.concat(RAW.ingresos).map((r) => r.cuenta).filter(Boolean))
  ].sort();
  const acSel = document.getElementById('filterAccount');
  acSel.innerHTML = '<option value="all">Todas</option>';
  accounts.forEach((a) => acSel.insertAdjacentHTML('beforeend', `<option value="${a}">${a}</option>`));

  const cats = [
    ...new Set(RAW.gastos.filter((r) => !SKIP_CATS.has(r.cat)).map((r) => r.cat).filter(Boolean))
  ].sort();
  const catSel = document.getElementById('filterCategory');
  catSel.innerHTML = '<option value="all">Todas</option>';
  cats.forEach((c) => catSel.insertAdjacentHTML('beforeend', `<option value="${c}">${c}</option>`));

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
