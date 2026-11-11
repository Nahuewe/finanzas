import { FILTERED, METRICS } from '../state.js';
import { fmt, fmtFull, esc, sortedEntries } from '../helpers.js';
import { subscriptionChanges } from '../metrics.js';
import { INFL, inflBetween } from '../externalData.js';
import { effectiveBudgets, loadBudgets } from '../budget.js';

const MES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const mesLargo = (ym) => `${MES[+ym.slice(5) - 1]} ${ym.slice(0, 4)}`;
const mesCorto = (ym) => MES[+ym.slice(5) - 1].slice(0, 3);
const pct = (a, b) => (b ? ((a / b - 1) * 100) : null);
const delta = (p) => (p === null ? '' : `<span class="rp-delta ${p > 0 ? 'up' : 'down'}">${p > 0 ? '▲' : '▼'} ${Math.abs(p).toFixed(0)}%</span>`);
const sumOf = (obj, keys) => keys.reduce((a, k) => a + (obj[k] || 0), 0);

/** Barras agrupadas ingresos/gastos en SVG puro: se imprime nítido y no depende de Chart.js. */
function svgBars(labels, ing, gas) {
  const W = 720, H = 210, L = 46, B = 24, T = 8;
  const max = Math.max(1, ...ing, ...gas);
  const slot = (W - L) / labels.length;
  const bw = Math.min(26, slot * 0.36);
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const grid = [0, 0.5, 1].map((f) => `<line x1="${L}" x2="${W}" y1="${y(max * f)}" y2="${y(max * f)}" stroke="#e4e0f1"/><text x="${L - 6}" y="${y(max * f) + 4}" text-anchor="end" font-size="10" fill="#777">${fmt(max * f)}</text>`).join('');
  const bars = labels.map((lb, k) => {
    const cx = L + slot * k + slot / 2;
    return `<rect x="${cx - bw - 1}" y="${y(ing[k])}" width="${bw}" height="${H - B - y(ing[k])}" fill="#15803d" rx="2"/>
      <rect x="${cx + 1}" y="${y(gas[k])}" width="${bw}" height="${H - B - y(gas[k])}" fill="#be123c" rx="2"/>
      <text x="${cx}" y="${H - 8}" text-anchor="middle" font-size="10" fill="#555">${esc(lb)}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="rp-chart" role="img" aria-label="Ingresos y gastos por mes">${grid}${bars}</svg>
    <div class="rp-legend"><span><i style="background:#15803d"></i>Ingresos</span><span><i style="background:#be123c"></i>Gastos</span></div>`;
}

const head = (kicker, title, sub) => `
    <header class="rp-head">
      <div class="rp-kicker">${kicker}</div>
      <h1>${title}</h1>
      <div class="rp-sub">Generado el ${new Date().toLocaleDateString('es-AR')} · ${sub}</div>
    </header>`;
const foot = '<footer class="rp-foot">Mis Finanzas · informe generado localmente en tu navegador</footer>';

function catBars(cats, prevOf) {
  const maxC = cats[0]?.[1] || 1;
  return cats.map(([c, v]) => {
    const before = prevOf(c);
    return `<div class="rp-bar"><span class="rp-bar-name">${esc(c)}</span><span class="rp-bar-track"><span style="width:${(v / maxC * 100).toFixed(0)}%"></span></span><span class="rp-bar-val">${fmt(v)}</span><span class="rp-bar-delta">${before ? delta(pct(v, before)) : ''}</span></div>`;
  }).join('');
}

// ── informe mensual ──
function buildMonthly(ym) {
  const { months, monG, monI, catMonthG } = METRICS;
  const idx = months.indexOf(ym);
  const prev = idx > 0 ? months[idx - 1] : null;
  const gMes = FILTERED.gastos.filter((r) => r.fecha?.startsWith(ym));
  const iMes = FILTERED.ingresos.filter((r) => r.fecha?.startsWith(ym));
  const tG = monG[ym] || 0, tI = monI[ym] || 0, neto = tI - tG;
  const pG = prev ? monG[prev] || 0 : null, pI = prev ? monI[prev] || 0 : null;
  const last3 = months.slice(Math.max(0, idx - 3), idx);
  const avg3 = last3.length ? sumOf(monG, last3) / last3.length : null;
  const trail = months.slice(Math.max(0, idx - 5), idx + 1);

  const cats = sortedEntries(Object.fromEntries(Object.entries(catMonthG).map(([c, m]) => [c, m[ym] || 0]).filter(([, v]) => v > 0))).slice(0, 8);
  const top = [...gMes].sort((a, b) => b.monto - a.monto).slice(0, 5);
  const hasBudgets = Object.keys(loadBudgets()).length > 0;
  const over = Object.entries(effectiveBudgets(ym)).map(([c, b]) => ({ c, b, s: catMonthG[c]?.[ym] || 0 })).filter((x) => x.s > x.b).sort((a, b) => (b.s - b.b) - (a.s - a.b));
  const subs = subscriptionChanges(FILTERED.gastos.filter((r) => r.fecha <= ym + '-31')).filter((c) => c.last === ym && Math.abs(c.pct) >= 0.5);

  const days = new Set(gMes.map((r) => r.fecha)).size;
  const rate = tI ? Math.round(neto / tI * 100) : null;

  return `${head('Informe mensual', mesLargo(ym), `${gMes.length} gastos · ${iMes.length} ingresos`)}

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

    ${trail.length > 1 ? `<section><h2>Últimos ${trail.length} meses</h2>${svgBars(trail.map(mesCorto), trail.map((m) => monI[m] || 0), trail.map((m) => monG[m] || 0))}</section>` : ''}

    <section>
      <h2>Gastos por categoría${prev ? ` <small>(variación vs ${mesLargo(prev)})</small>` : ''}</h2>
      ${catBars(cats, (c) => (prev ? catMonthG[c]?.[prev] || 0 : 0)) || '<p class="rp-empty">Sin gastos.</p>'}
    </section>

    <section class="rp-two">
      <div>
        <h2>Mayores gastos</h2>
        ${top.length ? top.map((r) => `<div class="rp-row"><span>${esc(r.fecha.slice(5))} · ${esc(r.comentario || r.cat)}</span><strong>${fmt(r.monto)}</strong></div>`).join('') : '<p class="rp-empty">Sin gastos.</p>'}
      </div>
      <div>
        <h2>Presupuesto</h2>
        ${hasBudgets
          ? (over.length ? over.map((x) => `<div class="rp-row"><span>${esc(x.c)}</span><strong class="neg">+${fmt(x.s - x.b)} sobre ${fmt(x.b)}</strong></div>`).join('') : '<p class="rp-empty">Ninguna categoría superó su tope. 👍</p>')
          : '<p class="rp-empty">No definiste topes (pestaña Presupuesto).</p>'}
      </div>
    </section>

    ${subs.length ? `<section><h2>Suscripciones que cambiaron de precio</h2>${subs.map((c) => `<div class="rp-row"><span>${esc(c.name)}: ${fmt(c.prevAmt)} → ${fmt(c.lastAmt)}</span><strong class="${c.excess > 3 ? 'neg' : ''}">${c.pct >= 0 ? '+' : ''}${c.pct.toFixed(1)}%${INFL.state === 'ok' ? ` (inflación ${c.infl.toFixed(1)}%)` : ''}</strong></div>`).join('')}</section>` : ''}

    ${foot}`;
}

// ── informe anual ──
function buildAnnual(year) {
  const { months, monG, monI, catMonthG } = METRICS;
  const ms = months.filter((m) => m.startsWith(year));
  const prevYear = String(+year - 1);
  // se compara contra los mismos meses del año anterior (un año en curso no se compara contra uno completo)
  const prevMs = ms.map((m) => prevYear + m.slice(4)).filter((m) => months.includes(m));
  const tG = sumOf(monG, ms), tI = sumOf(monI, ms), neto = tI - tG;
  const pG = prevMs.length ? sumOf(monG, prevMs) : null, pI = prevMs.length ? sumOf(monI, prevMs) : null;
  const rate = tI ? Math.round(neto / tI * 100) : null;
  const gYear = FILTERED.gastos.filter((r) => r.fecha?.startsWith(year));

  const catTot = (list) => Object.fromEntries(Object.entries(catMonthG).map(([c, m]) => [c, sumOf(m, list)]));
  const cur = catTot(ms), before = catTot(prevMs);
  const cats = sortedEntries(Object.fromEntries(Object.entries(cur).filter(([, v]) => v > 0))).slice(0, 10);
  const netos = ms.map((m) => ({ m, v: (monI[m] || 0) - (monG[m] || 0) }));
  const best = netos.reduce((a, b) => (b.v > a.v ? b : a), netos[0]);
  const worst = netos.reduce((a, b) => (b.v < a.v ? b : a), netos[0]);
  const top = [...gYear].sort((a, b) => b.monto - a.monto).slice(0, 10);

  // inflación entre el mismo mes del año anterior y el último mes con datos
  const infl = INFL.state === 'ok' && prevMs.length ? inflBetween(prevYear + ms.at(-1).slice(4), ms.at(-1)) : null;
  const nomG = pG ? pct(tG, pG) : null;
  const realG = nomG !== null && infl !== null ? ((1 + nomG / 100) / (1 + infl / 100) - 1) * 100 : null;

  return `${head('Informe anual', year, `${ms.length} meses con datos · ${gYear.length} gastos`)}

    <section class="rp-kpis">
      <div><span>Ingresos</span><strong>${fmt(tI)}</strong>${pI ? delta(pct(tI, pI)) : ''}</div>
      <div><span>Gastos</span><strong>${fmt(tG)}</strong>${pG ? delta(pct(tG, pG)) : ''}</div>
      <div><span>Neto</span><strong class="${neto >= 0 ? 'pos' : 'neg'}">${neto >= 0 ? '+' : ''}${fmt(neto)}</strong></div>
      <div><span>Tasa de ahorro</span><strong>${rate === null ? '—' : rate + '%'}</strong></div>
    </section>

    <section>
      <h2>Resumen</h2>
      <p>En ${year} gastaste en promedio <strong>${fmt(tG / (ms.length || 1))} por mes</strong> e ingresaste <strong>${fmt(tI / (ms.length || 1))}</strong>.
      ${best ? ` El mejor mes fue <strong>${mesLargo(best.m)}</strong> (${best.v >= 0 ? '+' : ''}${fmt(best.v)}) y el más ajustado <strong>${mesLargo(worst.m)}</strong> (${worst.v >= 0 ? '+' : ''}${fmt(worst.v)}).` : ''}
      ${nomG !== null ? ` Frente a los mismos meses de ${prevYear}, el gasto ${nomG >= 0 ? 'subió' : 'bajó'} <strong>${Math.abs(nomG).toFixed(0)}%</strong> en pesos${realG !== null ? `; descontando la inflación del período (${infl.toFixed(0)}%), es <strong>${realG >= 0 ? '+' : ''}${realG.toFixed(0)}% en términos reales</strong>` : ''}.` : ''}</p>
    </section>

    <section><h2>Ingresos y gastos por mes</h2>${svgBars(ms.map(mesCorto), ms.map((m) => monI[m] || 0), ms.map((m) => monG[m] || 0))}</section>

    <section>
      <h2>Detalle mensual</h2>
      <table class="rp-table"><thead><tr><th>Mes</th><th>Ingresos</th><th>Gastos</th><th>Neto</th><th>Ahorro</th></tr></thead><tbody>
        ${ms.map((m) => { const i = monI[m] || 0, g = monG[m] || 0, n = i - g; return `<tr><td>${MES[+m.slice(5) - 1]}</td><td>${fmtFull(i)}</td><td>${fmtFull(g)}</td><td class="${n >= 0 ? 'pos' : 'neg'}">${n >= 0 ? '+' : '−'}${fmtFull(Math.abs(n))}</td><td>${i ? Math.round(n / i * 100) + '%' : '—'}</td></tr>`; }).join('')}
        <tr class="rp-total"><td>Total</td><td>${fmtFull(tI)}</td><td>${fmtFull(tG)}</td><td class="${neto >= 0 ? 'pos' : 'neg'}">${neto >= 0 ? '+' : '−'}${fmtFull(Math.abs(neto))}</td><td>${rate === null ? '—' : rate + '%'}</td></tr>
      </tbody></table>
    </section>

    <section>
      <h2>Categorías del año${prevMs.length ? ` <small>(variación vs ${prevYear})</small>` : ''}</h2>
      ${catBars(cats, (c) => before[c] || 0) || '<p class="rp-empty">Sin gastos.</p>'}
    </section>

    <section>
      <h2>Los 10 gastos más grandes</h2>
      ${top.length ? top.map((r) => `<div class="rp-row"><span>${esc(r.fecha)} · ${esc(r.comentario || r.cat)}</span><strong>${fmt(r.monto)}</strong></div>`).join('') : '<p class="rp-empty">Sin gastos.</p>'}
    </section>

    ${foot}`;
}

function refresh() {
  const type = document.getElementById('reportType').value;
  const sel = document.getElementById('reportMonth');
  const months = METRICS.months;
  const opts = type === 'anual' ? [...new Set(months.map((m) => m.slice(0, 4)))].reverse() : [...months].reverse();
  const cur = opts.includes(sel.value) ? sel.value : opts[0];
  sel.innerHTML = opts.map((o) => `<option value="${o}" ${o === cur ? 'selected' : ''}>${type === 'anual' ? o : mesLargo(o)}</option>`).join('');
  document.getElementById('reportBody').innerHTML = type === 'anual' ? buildAnnual(cur) : buildMonthly(cur);
}

function openReport() {
  if (!METRICS.months.length) { alert('No hay datos para generar el informe.'); return; }
  refresh();
  document.getElementById('reportOverlay').hidden = false;
  document.body.classList.add('report-open');
}

export function initReportListeners() {
  document.getElementById('reportBtn')?.addEventListener('click', openReport);
  document.getElementById('reportType')?.addEventListener('change', refresh);
  document.getElementById('reportMonth')?.addEventListener('change', refresh);
  document.getElementById('reportPrint')?.addEventListener('click', () => window.print());
  document.getElementById('reportClose')?.addEventListener('click', () => {
    document.getElementById('reportOverlay').hidden = true;
    document.body.classList.remove('report-open');
  });
}
