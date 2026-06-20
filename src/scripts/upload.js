import { setRaw, EXCLUDED_GAS_CATS, EXCLUDED_ING_CATS, setExcludedGasCats, setExcludedIngCats } from './state.js';
import { buildFilterOptions } from './filters.js';
import { applyFilters } from './filters.js';

export function showLoading(v) {
  document.getElementById('loadingOverlay').classList.toggle('show', v);
}

export function formatDate(v) {
  if (!v) return '';
  if (typeof v === 'number') {
    const d = new Date((v - 25569) * 86400000);
    return d.toISOString().split('T')[0];
  }
  return String(v).split(' ')[0];
}

export function processFile(file) {
  showLoading(true);
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const XLSX = window.XLSX;
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const parsed = {};
      wb.SheetNames.forEach((name) => {
        const ws = wb.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (rows.length < 2) return;
        const header = rows[1];
        parsed[name] = rows.slice(2).map((r) => {
          const o = {};
          header.forEach((h, i) => (o[h] = r[i]));
          return o;
        });
      });

      const gastos = (parsed['Gastos'] || []).map((r) => ({
        fecha: formatDate(r['Fecha y hora']),
        cat: r['Categoría'] || '',
        cuenta: r['Cuenta'] || '',
        monto: +r['Cantidad en la divisa predeterminada'] || 0,
        comentario: r['Comentario'] || ''
      })).filter((r) => r.monto > 0);

      const ingresos = (parsed['Ingresos'] || []).map((r) => ({
        fecha: formatDate(r['Fecha y hora']),
        cat: r['Categoría'] || '',
        cuenta: r['Cuenta'] || '',
        monto: +r['Cantidad en la divisa predeterminada'] || 0,
        comentario: r['Comentario'] || ''
      })).filter((r) => r.monto > 0);

      setRaw({ gastos, ingresos, transferencias: parsed['Transferencias'] || [] });
      setExcludedGasCats(new Set());
      setExcludedIngCats(new Set());
      initApp();
    } catch (err) {
      alert('Error al leer el archivo. Asegurate que tenga el formato correcto (hojas Gastos / Ingresos / Transferencias).');
      console.error(err);
    }
    showLoading(false);
  };
  reader.readAsArrayBuffer(file);
}

export function initApp() {
  showLoading(false);
  document.getElementById('uploadScreen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  buildFilterOptions();
  applyFilters();
}
