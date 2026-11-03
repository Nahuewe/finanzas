import { setRaw, setExcludedGasCats, setExcludedIngCats } from './state.js';
import { buildFilterOptions, applyFilters, refreshExclusions } from './filters.js';

export function showLoading(v) {
  document.getElementById('loadingOverlay').classList.toggle('show', v);
}

export function formatDate(v) {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().split('T')[0];
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
      const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
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

      // "10,98 USD MEP" / "600 dolares ..." — la app a veces redondea el monto de la transacción
      const USD_RE = /(\d+(?:[.,]\d+)?)\s*(?:usd|u\$s|d[oó]lares|dolarukos)/i;
      const mapRow = (r) => {
        const comentario = r['Comentario'] || '';
        const montoCuenta = +r['Cantidad en la divisa de la cuenta'] || undefined;
        const monedaCuenta = r['Divisa de la cuenta'] || undefined;
        const montoTrans = +r['Cantidad de la transacción en la divisa de la transacción'] || undefined;
        const monedaTrans = r['Divisa de la transacción'] || undefined;
        // usd: dólares reales de la operación, ya sea porque la cuenta es en USD o porque se pagó en USD desde una cuenta en pesos
        let usd;
        if (monedaCuenta === 'USD') usd = montoCuenta;
        else if (monedaTrans === 'USD' && montoTrans) {
          usd = montoTrans;
          const m = String(comentario).match(USD_RE);
          const exact = m ? parseFloat(m[1].replace(',', '.')) : 0;
          if (exact && Math.abs(exact - usd) / usd < 0.06) usd = exact;
        }
        return {
          fecha: formatDate(r['Fecha y hora']),
          cat: r['Categoría'] || '',
          cuenta: r['Cuenta'] || '',
          monto: +r['Cantidad en la divisa predeterminada'] || 0,
          montoCuenta,
          monedaCuenta,
          usd,
          comentario
        };
      };
      const gastos = (parsed['Gastos'] || []).map(mapRow).filter((r) => r.monto > 0);
      const ingresos = (parsed['Ingresos'] || []).map(mapRow).filter((r) => r.monto > 0);

      const pick = (r, keys) => {
        for (const k of keys) {
          if (r[k] !== undefined && r[k] !== '') return r[k];
        }
        return undefined;
      };

      const transferencias = (parsed['Transferencias'] || []).map((r) => {
        const sal = +pick(r, ['Cantidad en divisa saliente', 'Cantidad en la divisa predeterminada', 'Cantidad']) || 0;
        const ent = +pick(r, ['Cantidad en divisa entrante']) || 0;
        const monedaSaliente = pick(r, ['Divisa saliente']) || 'ARS';
        const monedaEntrante = pick(r, ['Divisa entrante']) || monedaSaliente;
        // `monto` siempre en pesos: si la salida es en otra divisa, se toma el lado en ARS
        const monto = monedaSaliente !== 'ARS' && monedaEntrante === 'ARS' ? ent : sal;
        return {
          fecha: formatDate(pick(r, ['Fecha y hora', 'Fecha'])),
          cuentaOrigen: pick(r, ['Saliente', 'Cuenta de origen', 'Cuenta origen', 'Origen', 'Desde']) || '',
          cuentaDestino: pick(r, ['Entrante', 'Cuenta de destino', 'Cuenta destino', 'Destino', 'Hacia']) || '',
          monto,
          montoSaliente: sal,
          montoEntrante: ent || sal,
          monedaSaliente,
          monedaEntrante,
          comentario: pick(r, ['Comentario']) || ''
        };
      }).filter((r) => r.monto > 0 && r.cuentaOrigen && r.cuentaDestino);

      setRaw({ gastos, ingresos, transferencias });
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
  // las cuentas de reserva (ahorro) no cuentan como flujo de gastos/ingresos
  refreshExclusions();
  buildFilterOptions();
  applyFilters();
}
