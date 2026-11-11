import { FILTERS, setFilters, setCatSearch, setRaw, FILTERED, setExcludedGasCats, setExcludedIngCats } from './state.js';
import { applyFilters, resetFilters, buildMonthOptions } from './filters.js';
import { renderCatAccordion } from './renderers/gastos.js';
import { groupBy, groupByMon, sortedEntries } from './helpers.js';
import { processFile, initApp, loadData, initUploadListeners, renderSavedBox } from './upload.js';
import { loadSnapshot, SESSION } from './persist.js';
import { initProyeccionListeners } from './renderers/proyeccion.js';
import { initMetasListeners } from './renderers/metas.js';
import { DEMO_DATA } from './demo.js';
import { initComentariosListeners } from './renderers/comentarios.js';
import { initAnalisisListeners, exportCSV } from './renderers/analisis.js';
import { initPresupuestoListeners } from './renderers/presupuesto.js';
import { initPatrimonioListeners } from './renderers/patrimonio.js';
import { initCuentasListeners } from './renderers/cuentas.js';
import { initGastosListeners } from './renderers/gastos.js';
import { initAhorrosListeners } from './renderers/ahorros.js';
import { initReportListeners } from './renderers/report.js';
import { loadInflation, loadFx, loadFxOthers } from './externalData.js';
import { refreshExclusions } from './filters.js';
import { initThemes } from './themes.js';

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  });

  const box = document.getElementById('uploadBox');
  box.addEventListener('dragover', (e) => { e.preventDefault(); box.classList.add('drag'); });
  box.addEventListener('dragleave', () => box.classList.remove('drag'));
  box.addEventListener('drop', (e) => {
    e.preventDefault();
    box.classList.remove('drag');
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  });

  document.getElementById('demoBtn').addEventListener('click', () => {
    SESSION.current = SESSION.previous = null;
    setRaw(DEMO_DATA);
    setExcludedGasCats(new Set());
    setExcludedIngCats(new Set());
    initApp();
  });

  document.getElementById('reloadBtn').addEventListener('click', () => {
    document.getElementById('app').style.display = 'none';
    document.getElementById('uploadScreen').style.display = 'flex';
    setRaw({ gastos: [], ingresos: [], transferencias: [] });
    loadSnapshot().then(renderSavedBox);
  });

  // rango de fechas libre y búsqueda de texto (aplican a todas las pestañas)
  ['filterFrom', 'filterTo'].forEach((id) => document.getElementById(id).addEventListener('change', (e) => {
    setFilters({ ...FILTERS, [id === 'filterFrom' ? 'from' : 'to']: e.target.value });
    applyFilters();
  }));
  let textTimer;
  document.getElementById('filterText').addEventListener('input', (e) => {
    clearTimeout(textTimer);
    textTimer = setTimeout(() => { setFilters({ ...FILTERS, text: e.target.value.trim() }); applyFilters(); }, 300);
  });

  document.getElementById('filterYear').addEventListener('change', (e) => {
    setFilters({ ...FILTERS, year: e.target.value, month: 'all' });
    buildMonthOptions();
    applyFilters();
  });

  document.getElementById('filterMonth').addEventListener('change', (e) => {
    setFilters({ ...FILTERS, month: e.target.value });
    applyFilters();
  });

  document.getElementById('filterAccount').addEventListener('change', (e) => {
    setFilters({ ...FILTERS, account: e.target.value });
    applyFilters();
  });

  document.getElementById('filterCategory').addEventListener('change', (e) => {
    setFilters({ ...FILTERS, category: e.target.value });
    applyFilters();
  });

  let minAmountTimer;
  document.getElementById('filterMinAmount').addEventListener('input', (e) => {
    clearTimeout(minAmountTimer);
    minAmountTimer = setTimeout(() => {
      setFilters({ ...FILTERS, minAmount: +e.target.value || 0 });
      applyFilters();
    }, 350);
  });

  document.querySelectorAll('[data-period]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-period]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      setFilters({ ...FILTERS, period: btn.dataset.period });
      applyFilters();
    });
  });

  document.getElementById('resetFiltersBtn').addEventListener('click', resetFilters);

  document.getElementById('gasCatSearch').addEventListener('input', (e) => {
    setCatSearch(e.target.value.toLowerCase().trim());
    const g = FILTERED.gastos;
    renderCatAccordion(g, sortedEntries(groupBy(g, 'cat')), g.reduce((a, r) => a + r.monto, 0), Object.keys(groupByMon(g)).sort());
  });

  // pestañas: barra en escritorio, menú desplegable en celular (los dos quedan sincronizados)
  const tabSelect = document.getElementById('tabSelect');
  const tabs = [...document.querySelectorAll('.tab-btn')];
  tabSelect.innerHTML = tabs.map((b) => `<option value="${b.dataset.tab}">${b.firstChild.textContent.trim()}</option>`).join('');
  const activateTab = (name) => {
    tabs.forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.page').forEach((p) => p.classList.toggle('active', p.id === 'page-' + name));
    tabSelect.value = name;
  };
  tabs.forEach((btn) => btn.addEventListener('click', () => activateTab(btn.dataset.tab)));
  tabSelect.addEventListener('change', (e) => { activateTab(e.target.value); window.scrollTo(0, 0); });

  document.getElementById('filtersToggle').addEventListener('click', () => {
    document.getElementById('filtersBar').classList.toggle('open');
  });

  const excludeToggle = document.getElementById('excludeToggle');
  const excludePanel = document.getElementById('excludePanel');
  if (excludeToggle && excludePanel) {
    excludeToggle.addEventListener('click', () => {
      const open = excludePanel.classList.toggle('open');
      excludeToggle.textContent = open ? '✕ Cerrar' : '⊘ Excluir categorías';
    });
  }

  initComentariosListeners();
  initAnalisisListeners();
  initPresupuestoListeners();
  initPatrimonioListeners();
  initCuentasListeners();
  initGastosListeners();
  initAhorrosListeners();
  initReportListeners();
  initThemes();
  initProyeccionListeners();
  initMetasListeners();
  initUploadListeners();

  // si hay un archivo guardado en este navegador, se abre directo
  loadSnapshot().then((snap) => { if (snap) loadData(snap.raw); });

  // las reglas y los datos externos (inflación, dólar) re-renderizan todo cuando cambian
  const refresh = () => { if (document.getElementById('app').style.display === 'block') applyFilters(); };
  document.addEventListener('config-changed', () => { refreshExclusions(); refresh(); });
  document.addEventListener('external-data', refresh);
  Promise.all([loadInflation(), loadFx()]).then(refresh).then(loadFxOthers).then(refresh);
  document.getElementById('exportBtn').addEventListener('click', exportCSV);
});
