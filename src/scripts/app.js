import { FILTERS, setFilters, setCatSearch, setRaw, FILTERED, setExcludedGasCats, setExcludedIngCats } from './state.js';
import { applyFilters, resetFilters, buildMonthOptions } from './filters.js';
import { renderCatAccordion } from './renderers/gastos.js';
import { groupBy, groupByMon, sortedEntries } from './helpers.js';
import { processFile, initApp } from './upload.js';
import { DEMO_DATA } from './demo.js';
import { initComentariosListeners } from './renderers/comentarios.js';

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
    setRaw(DEMO_DATA);
    setExcludedGasCats(new Set());
    setExcludedIngCats(new Set());
    initApp();
  });

  document.getElementById('reloadBtn').addEventListener('click', () => {
    document.getElementById('app').style.display = 'none';
    document.getElementById('uploadScreen').style.display = 'flex';
    setRaw({ gastos: [], ingresos: [], transferencias: [] });
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

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('page-' + btn.dataset.tab).classList.add('active');
    });
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
});
