import { FILTERED, RAW, C, COLORS } from '../state.js';
import { fmt, fmtFull, groupBy, groupByMon, mkChart, legendStyle } from '../helpers.js';

const LS_BUDGET = 'finanzas_presupuestos_v1';
const LS_SALDOS = 'finanzas_saldos_v2';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const load = (k) => { try { return JSON.parse(localStorage.getItem(k) || '{}'); } catch { return {}; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage bloqueado */ } };
const sum = (arr) => arr.reduce((a, r) => a + r.monto, 0);

function monthInfo(g) {
  const months = [...new Set(g.map((r) => r.fecha?.slice(0, 7)).filter(Boolean))].sort();
  const cur = months.at(-1);
  if (!cur) return null;
  const [y, m] = cur.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const lastDay = Math.max(...g.filter((r) => r.fecha.startsWith(cur)).map((r) => +r.fecha.slice(8, 10)));
  return { months, cur, daysInMonth, elapsed: Math.min(lastDay, daysInMonth) };
}

/** Gastos fijos: mismo concepto (cat + comentario) presente en la mayoría de los meses con monto estable. */
export function detectFixed(g) {
  const months = new Set(g.map((r) => r.fecha?.slice(0, 7)).filter(Boolean));
  const groups = {};
  g.forEach((r) => {
    const c = String(r.comentario || '').trim().toLowerCase();
    if (!c) return;
    const k = r.cat + '||' + c;
    (groups[k] = groups[k] || { cat: r.cat, name: r.comentario, items: [] }).items.push(r);
  });
  const minMonths = Math.max(3, Math.ceil(months.size * 0.6));
  const fixed = [];
  Object.values(groups).forEach((gr) => {
    const perMonth = groupByMon(gr.items);
    const vals = Object.values(perMonth);
    if (vals.length < minMonths) return;
    const mean = vals.reduce((a, v) => a + v, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length);
    // una serie con inflación sostenida también es "fija": se mide el desvío contra la tendencia mes a mes
    const steps = vals.slice(1).map((v, i) => Math.abs(v / vals[i] - 1));
    const stepAvg = steps.length ? steps.reduce((a, v) => a + v, 0) / steps.length : 1;
    if (sd / mean < 0.35 || stepAvg < 0.12) fixed.push({ ...gr, total: sum(gr.items), avg: mean, months: vals.length });
  });
  return fixed.sort((a, b) => b.total - a.total);
}

export function renderPresupuesto() {
  const g = FILTERED.gastos;
  const kpi = document.getElementById('kpiPresupuesto');
  const tbl = document.getElementById('presupuestoTabla');
  const info = monthInfo(g);

  if (!info) {
    kpi.innerHTML = '';
    tbl.innerHTML = '<div class="empty-state">Sin gastos en el período filtrado.</div>';
    document.getElementById('fijosList').innerHTML = '';
    document.getElementById('runwayBox').innerHTML = '';
    return;
  }

  const budgets = load(LS_BUDGET);
  const { cur, months, daysInMonth, elapsed } = info;
  const inMonth = g.filter((r) => r.fecha.startsWith(cur));
  const spent = groupBy(inMonth, 'cat');
  const cats = [...new Set([...Object.keys(spent), ...Object.keys(budgets)])].sort((a, b) => (spent[b] || 0) - (spent[a] || 0));
  const pace = elapsed < daysInMonth ? daysInMonth / elapsed : 1;

  let totB = 0, totS = 0, over = 0;
  const rows = cats.map((c) => {
    const b = budgets[c] || 0;
    const s = spent[c] || 0;
    const proj = s * pace;
    if (b) { totB += b; totS += s; if (s > b) over++; }
    const pct = b ? s / b * 100 : 0;
    const state = !b ? '' : s > b ? 'neg' : proj > b ? 'warn' : 'pos';
    const msg = !b ? 'sin tope' : s > b ? `+${fmt(s - b)} excedido` : proj > b ? `ritmo: ${fmt(proj)}` : `quedan ${fmt(b - s)}`;
    const color = state === 'neg' ? C.red : state === 'warn' ? '#fbbf24' : C.green;
    return `<tr>
      <td><strong>${esc(c)}</strong></td>
      <td><input class="cuenta-input bud-input" data-cat="${esc(c)}" type="number" min="0" step="1000" placeholder="$0" value="${b || ''}" /></td>
      <td class="r">${fmtFull(s)}</td>
      <td style="min-width:140px"><div class="bud-track"><div class="bud-fill" style="width:${Math.min(pct, 100)}%;background:${color}"></div></div></td>
      <td class="r ${state === 'neg' ? 'neg' : state === 'pos' ? 'pos' : 'muted'}" style="white-space:nowrap">${b ? Math.round(pct) + '% · ' : ''}${msg}</td>
    </tr>`;
  }).join('');

  kpi.innerHTML = `
    <div class="kpi purple"><div class="label">Mes analizado</div><div class="value">${cur}</div><div class="sub">día ${elapsed} de ${daysInMonth}</div></div>
    <div class="kpi blue"><div class="label">Presupuesto total</div><div class="value">${totB ? fmt(totB) : '-'}</div><div class="sub">${Object.keys(budgets).length} categorías</div></div>
    <div class="kpi yellow"><div class="label">Gastado (c/ tope)</div><div class="value">${fmt(totS)}</div><div class="sub">${totB ? Math.round(totS / totB * 100) + '% del tope' : 'definí topes'}</div></div>
    <div class="kpi ${totB - totS >= 0 ? 'green' : 'red'}"><div class="label">Disponible</div><div class="value">${totB ? fmt(totB - totS) : '-'}</div><div class="sub">restante del mes</div></div>
    <div class="kpi ${over ? 'red' : 'green'}"><div class="label">Categorías excedidas</div><div class="value">${over}</div><div class="sub">${over ? 'revisá los topes' : 'todo en orden'}</div></div>
    <div class="kpi orange"><div class="label">Gasto total del mes</div><div class="value">${fmt(sum(inMonth))}</div><div class="sub">proyección ${fmt(sum(inMonth) * pace)}</div></div>`;

  tbl.innerHTML = `<table class="tbl"><thead><tr><th>Categoría</th><th>Tope mensual</th><th class="r">Gastado</th><th>Avance</th><th class="r">Estado</th></tr></thead><tbody>${rows}</tbody></table>`;
  tbl.querySelectorAll('.bud-input').forEach((inp) => inp.addEventListener('change', () => {
    const b = load(LS_BUDGET);
    const v = parseFloat(inp.value);
    if (v > 0) b[inp.dataset.cat] = v; else delete b[inp.dataset.cat];
    save(LS_BUDGET, b);
    renderPresupuesto();
  }));

  // ── gastos fijos vs variables ──
  const fixed = detectFixed(g);
  const fixedTotal = fixed.reduce((a, f) => a + f.total, 0);
  const total = sum(g);
  const variable = Math.max(0, total - fixedTotal);
  const fijosEl = document.getElementById('fijosList');
  const nM = months.length || 1;
  fijosEl.innerHTML = fixed.length
    ? `<div class="receipt-list">${fixed.slice(0, 8).map((f) => `<div class="receipt-row"><span class="receipt-name">${esc(f.name)}</span><span class="receipt-meta">${esc(f.cat)} · ${f.months} meses</span><span class="receipt-amt">${fmt(f.avg)}/mes</span></div>`).join('')}</div>
       <div class="bud-note">Fijos ≈ <strong>${fmt(fixedTotal / nM)}/mes</strong> (${total ? Math.round(fixedTotal / total * 100) : 0}% del gasto). Variables ≈ <strong>${fmt(variable / nM)}/mes</strong>. Es el piso que necesitás cubrir cada mes.</div>`
    : '<div class="empty-state">No se detectaron gastos fijos (se buscan conceptos repetidos en la mayoría de los meses).</div>';
  mkChart('chartFijos', {
    type: 'doughnut',
    data: { labels: ['Fijos', 'Variables'], datasets: [{ data: [fixedTotal, variable], backgroundColor: [COLORS[0], COLORS[2]], borderColor: '#0e0b17', borderWidth: 2 }] },
    options: { responsive: true, cutout: '62%', plugins: { legend: legendStyle, tooltip: { callbacks: { label: (c) => c.label + ': ' + fmtFull(c.raw) } } } }
  });

  // ── colchón / runway ──
  const saldos = load(LS_SALDOS);
  const entries = Object.entries(saldos);
  const recent = months.slice(-3);
  const avgSpend = recent.length ? sum(g.filter((r) => recent.some((m) => r.fecha.startsWith(m)))) / recent.length : 0;
  const avgFixed = fixedTotal / nM;
  const runway = document.getElementById('runwayBox');
  if (!entries.length) {
    runway.innerHTML = `<div class="empty-state">Cargá los saldos en la pestaña <strong>Cuentas</strong> para calcular cuántos meses de gasto cubre tu colchón.</div>`;
    return;
  }
  const flujoPost = (cuenta, corte) => {
    const f = (a, k) => a.filter((r) => r[k] === cuenta && r.fecha > corte);
    return sum(f(RAW.ingresos, 'cuenta')) - sum(f(RAW.gastos, 'cuenta')) - sum(f(RAW.transferencias, 'cuentaOrigen')) + sum(f(RAW.transferencias, 'cuentaDestino'));
  };
  const patrimonio = entries.reduce((a, [c, e]) => a + e.monto + flujoPost(c, e.fecha), 0);
  const mesesTot = avgSpend ? patrimonio / avgSpend : 0;
  const mesesFijos = avgFixed ? patrimonio / avgFixed : 0;
  const level = mesesTot >= 6 ? 'tip' : mesesTot >= 3 ? 'info' : 'warn';
  runway.innerHTML = `
    <div class="insight i-${level}"><div class="ico">🛟</div><div class="body"><strong>${mesesTot.toFixed(1)} meses de colchón</strong>Con ${fmtFull(patrimonio)} en ${entries.length} cuenta(s) y un gasto promedio de ${fmt(avgSpend)}/mes (últimos ${recent.length} meses).${avgFixed ? ` Cubriendo solo los gastos fijos (${fmt(avgFixed)}/mes) alcanzaría para ${mesesFijos.toFixed(1)} meses.` : ''} Meta sugerida: 3 a 6 meses.</div></div>`;
}

export function initPresupuestoListeners() {
  document.getElementById('budSuggestBtn')?.addEventListener('click', () => {
    const g = FILTERED.gastos;
    const info = monthInfo(g);
    if (!info) return;
    const prev = info.months.slice(-4, -1);
    const base = prev.length ? prev : info.months.slice(-1);
    const b = load(LS_BUDGET);
    Object.entries(groupBy(g.filter((r) => base.some((m) => r.fecha.startsWith(m))), 'cat')).forEach(([c, v]) => {
      b[c] = Math.round(v / base.length * 1.05 / 1000) * 1000 || 1000;
    });
    save(LS_BUDGET, b);
    renderPresupuesto();
  });
  document.getElementById('budClearBtn')?.addEventListener('click', () => {
    if (confirm('¿Borrar todos los topes?')) { save(LS_BUDGET, {}); renderPresupuesto(); }
  });
}
