import { esc, fmt, fmtFull } from '../helpers.js';
import { SESSION } from '../persist.js';
import { diffData } from '../diff.js';

const day = (t) => new Date(t).toLocaleDateString('es-AR');

/** Tarjeta del Resumen: qué cambió entre la carga anterior del Excel y la actual. */
export function renderFileDiff() {
  const el = document.getElementById('fileDiff');
  if (!el) return;
  const { current, previous } = SESSION;
  if (!current) { el.innerHTML = ''; return; }

  const fileLine = `📄 <strong>${esc(current.name)}</strong> · guardado en este navegador el ${day(current.savedAt)}`;
  if (!previous) {
    el.innerHTML = `<div class="card card-mb"><div class="bud-note" style="margin:0">${fileLine}. La próxima vez que subas un archivo vas a ver acá qué cambió.</div></div>`;
    return;
  }

  const d = diffData(previous.raw, current.raw);
  if (d.empty) {
    el.innerHTML = `<div class="card card-mb"><div class="bud-note" style="margin:0">${fileLine}. Sin cambios respecto de la carga anterior (${esc(previous.name)}).</div></div>`;
    return;
  }

  const chip = (label, rows, total, cls) => (rows.length ? `<span class="cuenta-detail-chip ${cls}">${label}: ${rows.length} · ${fmt(total)}</span>` : '');
  const removed = d.removed.gastos.length + d.removed.ingresos.length + d.removed.transferencias.length;
  const rows = [
    ...d.added.gastos.map((r) => ({ ...r, tipo: 'gasto', sign: '−' })),
    ...d.added.ingresos.map((r) => ({ ...r, tipo: 'ingreso', sign: '+' })),
    ...d.added.transferencias.map((r) => ({ ...r, tipo: 'transf.', sign: '', cat: `${r.cuentaOrigen} → ${r.cuentaDestino}` })),
  ].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const gone = [...d.removed.gastos, ...d.removed.ingresos].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const netNew = d.totals.ingresos.added - d.totals.gastos.added;

  el.innerHTML = `
    <div class="card card-mb">
      <h3>Novedades desde tu carga anterior</h3>
      <div class="bud-note">${fileLine}. Comparado con <strong>${esc(previous.name)}</strong> (${day(previous.savedAt)}).</div>
      <div class="cuenta-detail" style="margin-bottom:8px">
        ${chip('Gastos nuevos', d.added.gastos, d.totals.gastos.added, 'neg')}
        ${chip('Ingresos nuevos', d.added.ingresos, d.totals.ingresos.added, 'pos')}
        ${chip('Transferencias nuevas', d.added.transferencias, d.totals.transferencias.added, 'transfer')}
        ${removed ? `<span class="cuenta-corte-chip">${removed} quitados o editados</span>` : ''}
        <span class="cuenta-corte-chip">Neto de lo nuevo: ${netNew >= 0 ? '+' : ''}${fmt(netNew)}</span>
      </div>
      <details>
        <summary class="bud-note" style="cursor:pointer;margin:0">Ver los ${rows.length} movimientos nuevos${gone.length ? ` y los ${gone.length} que ya no están` : ''}</summary>
        <div class="receipt-list" style="max-height:340px;overflow-y:auto;margin-top:8px">
          ${rows.slice(0, 200).map((r) => `<div class="receipt-row"><span class="receipt-date">${esc((r.fecha || '').slice(5))}</span><span class="receipt-name">${esc(r.comentario || r.cat)}</span><span class="receipt-meta">${esc(r.tipo)} · ${esc(r.cat)}</span><span class="receipt-amt" style="color:${r.tipo === 'ingreso' ? 'var(--green)' : r.tipo === 'gasto' ? 'var(--red)' : 'inherit'}">${r.sign}${fmtFull(r.monto)}</span></div>`).join('')}
          ${gone.slice(0, 100).map((r) => `<div class="receipt-row" style="opacity:.6;text-decoration:line-through"><span class="receipt-date">${esc((r.fecha || '').slice(5))}</span><span class="receipt-name">${esc(r.comentario || r.cat)}</span><span class="receipt-meta">ya no está · ${esc(r.cat)}</span><span class="receipt-amt">${fmtFull(r.monto)}</span></div>`).join('')}
        </div>
      </details>
    </div>`;
}
