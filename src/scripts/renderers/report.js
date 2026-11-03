import { FILTERED, METRICS } from '../state.js';
import { fmt, fmtFull, esc, sum, sortedEntries } from '../helpers.js';
import { store } from '../storage.js';
import { subscriptionChanges } from '../metrics.js';
import { INFL } from '../externalData.js';

const MES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const mesLargo = (ym) => `${MES[+ym.slice(5) - 1]} ${ym.slice(0, 4)}`;
const pct = (a, b) => (b ? ((a / b - 1) * 100) : null);
const delta = (p) => (p === null ? '' : `<span class="rp-delta ${p > 0 ? 'up' : 'down'}">${p > 0 ? '▲' : '▼'} ${Math.abs(p).toFixed(0)}%</span>`);

function buildReport(ym) {
  const { months, monG, monI, catMonthG } = METRICS;
  const idx = months.indexOf(ym);
  const prev = idx > 0 ? months[idx - 1] : null;
  const gMes = FILTERED.gastos.filter((r) => r.fecha?.startsWith(ym));
  const iMes = FILTERED.ingresos.filter((r) => r.fecha?.startsWith(ym));
  const tG = monG[ym] || 0, tI = monI[ym] || 0, neto = tI - tG;
  const pG = prev ? monG[prev] || 0 : null, pI = prev ? monI[prev] || 0 : null;
  const last3 = months.slice(Math.max(0, idx - 3), idx);
  const avg3 = last3.length ? sum(last3.map((m) => ({ monto: monG[m] || 0 }))) / last3.length : null;

  const cats = sortedEntries(Object.fromEntries(Object.entries(catMonthG).map(([c, m]) => [c, m[ym] || 0]).filter(([, v]) => v > 0))).slice(0, 8);
  const maxC = cats[0]?.[1] || 1;
  const catRows = cats.map(([c, v]) => {
    const before = prev ? catMonthG[c]?.[prev] || 0 : 0;
    return `<div class="rp-bar"><span class="rp-bar-name">${esc(c)}</span><span class="rp-bar-track"><span style="width:${(v / maxC * 100).toFixed(0)}%"></span></span><span class="rp-bar-val">${fmt(v)}</span><span class="rp-bar-delta">${prev && before ? delta(pct(v, before)) : ''}</span></div>`;
  }).join('');

  const top = [...gMes].sort((a, b) => b.monto - a.monto).slice(0, 5);
  const budgets = store.get('presupuestos', {}) || {};
  const over = Object.entries(budgets).map(([c, b]) => ({ c, b, s: catMonthG[c]?.[ym] || 0 })).filter((x) => x.s > x.b).sort((a, b) => (b.s - b.b) - (a.s - a.b));
  const subs = subscriptionChanges(FILTERED.gastos.filter((r) => r.fecha <= ym + '-31')).filter((c) => c.last === ym && Math.abs(c.pct) >= 0.5);

  const days = new Set(gMes.map((r) => r.fecha)).size;
  const rate = tI ? Math.round(neto / tI * 100) : null;

  return `
    <header class="rp-head">
      <div class="rp-kicker">Informe mensual</div>
      <h1>${mesLargo(ym)}</h1>
      <div class="rp-sub">Generado el ${new Date().toLocaleDateString('es-AR')} · ${gMes.length} gastos · ${iMes.length} ingresos</div>
    </header>

    <section class="rp-kpis">
      <div><span>Ingresos</span><strong>${fmt(tI)}</strong>${pI !== null ? delta(pct(tI, pI)) : ''}</div>
      <div><span>Gastos</span><strong>${fmt(tG)}</strong>${pG !== null ? delta(pct(tG, pG)) : ''}</div>
      <div><span>Neto</span><strong class="${neto >= 0 ? 'pos' : 'neg'}">${neto >= 0 ? '+' : ''}${fmt(neto)}</strong></div>
      <div><span>Tasa de ahorro</span><strong>${rate === null ? '—' : rate + '%'}</strong></div>
    </section>

    <section>
      <h2>Resumen</h2>
      <p>${tG ? `Gastaste <strong>${fmtFull(tG)}</strong> repartidos en ${days} días con movimientos (≈ ${fmt(tG / days)} por día activo).` : 'No hay gastos registrados este mes.'}
      ${avg3 ? ` Es <strong>${Math.abs(pct(tG, avg3)).toFixed(0)}% ${tG > avg3 ? 'por encima' : 'por debajo'}</strong> de tu promedio de los ${last3.length} meses anteriores (${fmt(avg3)}).` : ''}
      ${neto < 0 ? ` El mes cerró en <strong>déficit de ${fmt(-neto)}</strong>.` : tI ? ` El mes cerró con un <strong>superávit de ${fmt(neto)}</strong>.` : ''}</p>
    </section>

    <section>
      <h2>Gastos por categoría${prev ? ` <small>(variación vs ${mesLargo(prev)})</small>` : ''}</h2>
      ${catRows || '<p class="rp-empty">Sin gastos.</p>'}
    </section>

    <section class="rp-two">
      <div>
        <h2>Mayores gastos</h2>
        ${top.length ? top.map((r) => `<div class="rp-row"><span>${esc(r.fecha.slice(5))} · ${esc(r.comentario || r.cat)}</span><strong>${fmt(r.monto)}</strong></div>`).join('') : '<p class="rp-empty">Sin gastos.</p>'}
      </div>
      <div>
        <h2>Presupuesto</h2>
        ${Object.keys(budgets).length
          ? (over.length ? over.map((x) => `<div class="rp-row"><span>${esc(x.c)}</span><strong class="neg">+${fmt(x.s - x.b)} sobre ${fmt(x.b)}</strong></div>`).join('') : '<p class="rp-empty">Ninguna categoría superó su tope. 👍</p>')
          : '<p class="rp-empty">No definiste topes (pestaña Presupuesto).</p>'}
      </div>
    </section>

    ${subs.length ? `<section><h2>Suscripciones que cambiaron de precio</h2>${subs.map((c) => `<div class="rp-row"><span>${esc(c.name)}: ${fmt(c.prevAmt)} → ${fmt(c.lastAmt)}</span><strong class="${c.excess > 3 ? 'neg' : ''}">${c.pct >= 0 ? '+' : ''}${c.pct.toFixed(1)}%${INFL.state === 'ok' ? ` (inflación ${c.infl.toFixed(1)}%)` : ''}</strong></div>`).join('')}</section>` : ''}

    <footer class="rp-foot">Mis Finanzas · informe generado localmente en tu navegador</footer>`;
}

function openReport() {
  const months = METRICS.months;
  if (!months.length) { alert('No hay datos para generar el informe.'); return; }
  const sel = document.getElementById('reportMonth');
  const cur = months.includes(sel.value) ? sel.value : months.at(-1);
  sel.innerHTML = [...months].reverse().map((m) => `<option value="${m}" ${m === cur ? 'selected' : ''}>${mesLargo(m)}</option>`).join('');
  document.getElementById('reportBody').innerHTML = buildReport(cur);
  document.getElementById('reportOverlay').hidden = false;
  document.body.classList.add('report-open');
}

export function initReportListeners() {
  document.getElementById('reportBtn')?.addEventListener('click', openReport);
  document.getElementById('reportMonth')?.addEventListener('change', (e) => {
    document.getElementById('reportBody').innerHTML = buildReport(e.target.value);
  });
  document.getElementById('reportPrint')?.addEventListener('click', () => window.print());
  document.getElementById('reportClose')?.addEventListener('click', () => {
    document.getElementById('reportOverlay').hidden = true;
    document.body.classList.remove('report-open');
  });
}
