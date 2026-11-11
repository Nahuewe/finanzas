import { esc, fmtFull } from '../helpers.js';
import { store } from '../storage.js';
import { allAccounts, accountCurrency, accountMovements, estimatedBalance, loadSaldos } from '../accounts.js';
import { FX } from '../externalData.js';
import { goalProgress } from '../goals.js';

const loadGoals = () => store.get('metas', []) || [];
const saveGoals = (g) => store.set('metas', g);
const today = () => new Date().toISOString().split('T')[0];
const money = (n, cur) => (cur === 'USD' ? `USD ${Math.round(n).toLocaleString('es-AR')}` : fmtFull(n));

/** Convierte entre pesos y dólares con la cotización elegida en Patrimonio (0 si todavía no cargó). */
function convert(n, from, to) {
  if (from === to) return n;
  const rate = FX.last?.venta || 0;
  if (!rate) return 0;
  return from === 'USD' ? n * rate : n / rate;
}

/** Ahorro mensual promedio de una cuenta en los últimos 3 meses con movimientos. */
function accountPace(cuenta) {
  const byMonth = {};
  accountMovements(cuenta).forEach((m) => { const k = m.fecha?.slice(0, 7); if (k) byMonth[k] = (byMonth[k] || 0) + m.delta; });
  const ms = Object.keys(byMonth).sort().slice(-3);
  return ms.length ? ms.reduce((a, k) => a + byMonth[k], 0) / ms.length : null;
}

const ESTADOS = {
  lograda: ['i-tip', '🏆', '¡Meta lograda!'],
  'en-camino': ['i-tip', '✅', 'En camino'],
  atrasada: ['i-warn', '⚠️', 'Atrasada'],
  vencida: ['i-warn', '⌛', 'Fecha vencida'],
  'sin-ritmo': ['i-info', '🎯', 'En curso'],
};

export function renderMetas() {
  const list = document.getElementById('metasList');
  if (!list) return;

  // opciones de cuentas para el formulario
  const sel = document.getElementById('metaCuenta');
  if (sel) {
    const keep = sel.value;
    sel.innerHTML = '<option value="">— Sin cuenta: cargo el avance a mano —</option>' +
      allAccounts().map((a) => `<option value="${esc(a)}">${esc(a)} (${esc(accountCurrency(a))})</option>`).join('');
    sel.value = keep;
  }

  const goals = loadGoals();
  if (!goals.length) {
    list.innerHTML = '<div class="empty-state">Todavía no creaste metas. Usá el formulario de arriba: por ejemplo «Viajesito», USD 3.000, para marzo.</div>';
    return;
  }

  const saldos = loadSaldos();
  list.innerHTML = goals.map((g) => {
    const linked = g.cuenta && saldos[g.cuenta] && allAccounts().includes(g.cuenta);
    const accCur = linked ? accountCurrency(g.cuenta) : g.moneda;
    const actual = linked ? convert(estimatedBalance(g.cuenta, saldos), accCur, g.moneda) : +g.actual || 0;
    const paceAcc = linked ? accountPace(g.cuenta) : null;
    const ritmo = paceAcc === null ? null : convert(paceAcc, accCur, g.moneda);
    const p = goalProgress(g, actual, ritmo, today());
    const [cls, ico, label] = ESTADOS[p.estado];

    const lines = [];
    if (p.estado === 'lograda') lines.push(`Llegaste a ${money(p.objetivo, g.moneda)}.`);
    else {
      lines.push(`Faltan <strong>${money(p.falta, g.moneda)}</strong>.`);
      if (p.meses === null) lines.push('Sin fecha límite.');
      else if (p.meses === 0) lines.push(`La fecha (${esc(g.fecha)}) ya pasó.`);
      else lines.push(`Quedan ${p.meses} mes(es): necesitás apartar <strong>${money(p.porMes, g.moneda)} por mes</strong>.`);
      if (ritmo !== null) {
        lines.push(ritmo > 0
          ? `Tu ritmo reciente en ${esc(g.cuenta)} es ${money(ritmo, g.moneda)}/mes${p.eta ? `: a ese paso llegás en ${p.eta} mes(es)` : ''}.`
          : `En los últimos meses ${esc(g.cuenta)} no creció (${money(ritmo, g.moneda)}/mes).`);
      }
    }
    const source = linked
      ? `Avance tomado del saldo de <strong>${esc(g.cuenta)}</strong>.`
      : g.cuenta
        ? `Cargá el saldo de <strong>${esc(g.cuenta)}</strong> en la pestaña Cuentas para que el avance se calcule solo.`
        : '';

    return `
      <div class="meta-card">
        <div class="meta-head">
          <div class="meta-name">${esc(g.nombre)}</div>
          <span class="meta-badge insight ${cls}">${ico} ${label}</span>
          <button type="button" class="reset-btn meta-del" data-id="${esc(g.id)}" title="Eliminar meta">✕</button>
        </div>
        <div class="meta-amounts"><strong>${money(p.actual, g.moneda)}</strong> de ${money(p.objetivo, g.moneda)}${g.fecha ? ` · para el ${esc(g.fecha)}` : ''}</div>
        <div class="bud-track meta-track"><div class="bud-fill" style="width:${(p.pct * 100).toFixed(1)}%;background:rgb(var(--c-${p.estado === 'atrasada' || p.estado === 'vencida' ? 'gold' : 'pos'}))"></div></div>
        <div class="meta-pct">${Math.round(p.pct * 100)}%</div>
        <div class="bud-note">${lines.join(' ')} ${source}</div>
        ${linked ? '' : `<label class="cuenta-field-label">Ya ahorrado (${esc(g.moneda)}) <input class="cuenta-input meta-actual" data-id="${esc(g.id)}" type="number" min="0" value="${+g.actual || ''}" placeholder="0" /></label>`}
      </div>`;
  }).join('');
}

export function initMetasListeners() {
  document.getElementById('metaForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = (id) => document.getElementById(id).value.trim();
    const objetivo = +val('metaObjetivo');
    if (!val('metaNombre') || !(objetivo > 0)) return;
    const goals = loadGoals();
    goals.push({
      id: Date.now().toString(36),
      nombre: val('metaNombre'),
      objetivo,
      moneda: val('metaMoneda') || 'ARS',
      fecha: val('metaFecha') || '',
      cuenta: val('metaCuenta') || '',
      actual: +val('metaActual') || 0,
    });
    saveGoals(goals);
    e.target.reset();
    renderMetas();
  });

  const list = document.getElementById('metasList');
  list?.addEventListener('click', (e) => {
    const del = e.target.closest('.meta-del');
    if (del && confirm('¿Eliminar esta meta?')) {
      saveGoals(loadGoals().filter((g) => g.id !== del.dataset.id));
      renderMetas();
    }
  });
  list?.addEventListener('change', (e) => {
    const inp = e.target.closest('.meta-actual');
    if (!inp) return;
    const goals = loadGoals();
    const g = goals.find((x) => x.id === inp.dataset.id);
    if (g) { g.actual = Math.max(0, +inp.value || 0); saveGoals(goals); renderMetas(); }
  });
}
