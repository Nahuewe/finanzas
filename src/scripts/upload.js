import { setRaw, setExcludedGasCats, setExcludedIngCats } from './state.js';
import { buildFilterOptions, applyFilters, refreshExclusions } from './filters.js';
import { buildData, mergeColmap, DEFAULT_COLMAP, COLMAP_LABELS } from './parse.js';
import { store } from './storage.js';
import { saveSnapshot, forgetSnapshots, SESSION } from './persist.js';
import { esc } from './helpers.js';

export function showLoading(v) {
  document.getElementById('loadingOverlay').classList.toggle('show', v);
}

export function processFile(file) {
  showLoading(true);
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const XLSX = window.XLSX;
      const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
      const sheets = {};
      wb.SheetNames.forEach((name) => { sheets[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 }); });

      const { gastos, ingresos, transferencias } = buildData(sheets, store.get('colmap', {}) || {});
      if (!gastos.length && !ingresos.length) throw new Error('sin-filas');

      const raw = { gastos, ingresos, transferencias };
      await saveSnapshot(file.name, raw);
      loadData(raw);
    } catch (err) {
      alert(err.message === 'sin-filas'
        ? 'No se encontraron movimientos en el archivo. Si tu Excel tiene otro formato, ajustá el mapeo de columnas (⚙ debajo del botón de carga).'
        : 'Error al leer el archivo. Asegurate que tenga el formato correcto (hojas Gastos / Ingresos / Transferencias).');
      console.error(err);
    }
    showLoading(false);
  };
  reader.readAsArrayBuffer(file);
}

/** Pone los datos en uso y abre el tablero. */
export function loadData(raw) {
  setRaw(raw);
  setExcludedGasCats(new Set());
  setExcludedIngCats(new Set());
  initApp();
}

export function initApp() {
  showLoading(false);
  document.getElementById('uploadScreen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  // las cuentas de reserva (ahorro) no cuentan como flujo de gastos/ingresos
  refreshExclusions();
  buildFilterOptions();
  applyFilters();
}

// ── archivo guardado en este navegador ──
export function renderSavedBox() {
  const box = document.getElementById('savedFileBox');
  if (!box) return;
  const cur = SESSION.current;
  if (!cur) { box.innerHTML = ''; return; }
  const n = cur.raw.gastos.length + cur.raw.ingresos.length;
  box.innerHTML = `
    <div class="saved-file">
      <div class="saved-file-info">📄 <strong>${esc(cur.name)}</strong><span>guardado el ${new Date(cur.savedAt).toLocaleDateString('es-AR')} · ${n} movimientos</span></div>
      <div class="saved-file-actions">
        <button class="header-btn" id="savedContinue">↩ Continuar con este archivo</button>
        <button class="reset-btn" id="savedForget">Olvidar</button>
      </div>
    </div>`;
}

// ── mapeo de columnas ──
const flatKeys = () => ['headerRow', ...Object.keys(DEFAULT_COLMAP.sheets).map((k) => 'sheets.' + k), ...Object.keys(COLMAP_LABELS).filter((k) => k.startsWith('cols.'))];

function renderColmapForm() {
  const form = document.getElementById('colmapForm');
  if (!form) return;
  const cm = mergeColmap(store.get('colmap', {}) || {});
  const val = (k) => (k === 'headerRow' ? cm.headerRow : k.split('.').reduce((o, p) => o[p], cm));
  form.innerHTML = `
    <div class="cfg-grid">
      ${flatKeys().map((k) => `
        <label class="cfg-field">
          <span class="cfg-label">${esc(COLMAP_LABELS[k])}</span>
          <input class="cuenta-input cfg-input" data-key="${k}" type="${k === 'headerRow' ? 'number' : 'text'}" value="${esc(val(k))}" />
        </label>`).join('')}
    </div>
    <div class="bud-toolbar">
      <button class="header-btn" id="colmapSave">Guardar formato</button>
      <button class="header-btn" id="colmapReset">Volver al formato de Spendee</button>
      <span class="bud-note" id="colmapMsg" style="margin:0"></span>
    </div>
    <div class="bud-note">Escribí el nombre exacto del encabezado de tu Excel. Podés poner varias alternativas separadas por <strong>|</strong>. Si tu banco exporta una sola hoja con montos negativos para los gastos, poné el mismo nombre de hoja en gastos e ingresos.</div>`;
}

export function initUploadListeners() {
  renderColmapForm();
  document.getElementById('colmapForm')?.addEventListener('click', (e) => {
    const msg = () => document.getElementById('colmapMsg');
    if (e.target.id === 'colmapSave') {
      const next = { sheets: {}, cols: {} };
      document.querySelectorAll('#colmapForm .cfg-input').forEach((inp) => {
        const [a, b] = inp.dataset.key.split('.');
        if (a === 'headerRow') next.headerRow = Math.max(1, +inp.value || 2);
        else next[a][b] = inp.value.trim();
      });
      store.set('colmap', next);
      msg().textContent = 'Guardado. Se usa en la próxima carga.';
    } else if (e.target.id === 'colmapReset') {
      store.remove('colmap');
      renderColmapForm();
      msg().textContent = 'Restaurado.';
    }
  });

  document.getElementById('savedFileBox')?.addEventListener('click', async (e) => {
    if (e.target.id === 'savedContinue' && SESSION.current) loadData(SESSION.current.raw);
    if (e.target.id === 'savedForget' && confirm('¿Borrar el archivo guardado en este navegador? Tus saldos, topes y metas no se tocan.')) {
      await forgetSnapshots();
      renderSavedBox();
    }
  });
}
