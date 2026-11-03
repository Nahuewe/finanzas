import { FILTERED, METRICS, C, COLORS, CAT_SEARCH, OPEN_CATS } from '../state.js';
import { fmt, fmtFull, slug, esc, groupByMon, sortedEntries, mkChart, chartOpts, monthLabel } from '../helpers.js';
import { groupConcepts, subscriptionChanges } from '../metrics.js';
import { matcher } from '../config.js';
import { INFL } from '../externalData.js';

export function renderGastos() {
  const g = FILTERED.gastos;
  const { tG, monG, gMonths: months, byCatG } = METRICS;
  const bycat = sortedEntries(byCatG);
  const avgMon = months.length ? tG / months.length : 0;
  const top1 = bycat[0];
  const isHormiga = matcher('hormiga');
  const hormiga = g.filter((r) => isHormiga(r.cat));
  const chatarra = hormiga.reduce((a, r) => a + r.monto, 0);

  document.getElementById('kpiGastos').innerHTML = `
    <div class="kpi red"><div class="label">Total Gastos</div><div class="value">${fmt(tG)}</div><div class="sub">${g.length} tx</div></div>
    <div class="kpi yellow"><div class="label">Mayor Categoría</div><div class="value">${top1 ? fmt(top1[1]) : '—'}</div><div class="sub">${top1 ? esc(top1[0]) : '—'}</div></div>
    <div class="kpi orange"><div class="label">Gasto hormiga</div><div class="value">${fmt(chatarra)}</div><div class="sub">${hormiga.length} compras</div></div>
    <div class="kpi blue"><div class="label">Promedio / mes</div><div class="value">${fmt(avgMon)}</div><div class="sub">${months.length} meses</div></div>`;

  mkChart('chartGasMensual', {
    type: 'line',
    data: {
      labels: months.map(monthLabel),
      datasets: [{ data: months.map((m) => monG[m] || 0), borderColor: C.red, backgroundColor: C.redSoftBg + '.08)', tension: .35, fill: true, pointRadius: 3, pointBackgroundColor: C.red }]
    },
    options: chartOpts()
  });

  renderMomStrip(g, months);
  renderCatAccordion(g, bycat, tG, months);
  renderSubsList(g);
  renderTopGastosList(g);
  renderRecurrentes(g);
  renderSubAlerts(g);
}

function renderMomStrip(g, months) {
  const el = document.getElementById('gasMomStrip');
  if (months.length < 2) {
    el.innerHTML = '<div class="mom-empty">Necesitás al menos 2 meses en el rango filtrado para comparar.</div>';
    return;
  }
  const curM = months[months.length - 1], prevM = months[months.length - 2];
  const cm = METRICS.catMonthG;
  const deltas = Object.keys(cm)
    .map((cat) => ({ cat, delta: (cm[cat][curM] || 0) - (cm[cat][prevM] || 0) }))
    .filter((d) => Math.abs(d.delta) > 1000)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 6);

  if (!deltas.length) {
    el.innerHTML = '<div class="mom-empty">Sin cambios significativos entre meses.</div>';
    return;
  }
  el.innerHTML = `<div style="width:100%;font-family:var(--font-mono);font-size:.7rem;color:var(--color-ink-faint);margin-bottom:8px">${prevM} → ${curM}</div>` +
    deltas.map((d) => {
      const up = d.delta > 0;
      return `<div class="mom-chip ${up ? 'up' : 'down'}"><span class="arrow">${up ? '▲' : '▼'}</span><span class="cat">${esc(d.cat)}</span><span class="delta">${up ? '+' : ''}${fmt(d.delta)}</span></div>`;
    }).join('');
}

export function renderCatAccordion(g, bycat, tG, months) {
  const container = document.getElementById('gasAccordion');
  const maxV = bycat[0]?.[1] || 1;
  const filtered = CAT_SEARCH ? bycat.filter(([cat]) => cat.toLowerCase().includes(CAT_SEARCH)) : bycat;

  if (!filtered.length) {
    container.innerHTML = '<div class="empty-state">Ninguna categoría coincide con tu búsqueda.</div>';
    return;
  }

  container.innerHTML = filtered.map(([cat, total], idx) => {
    const pct = (total / tG * 100).toFixed(1);
    const fillPct = (total / maxV * 100).toFixed(0);
    const color = COLORS[idx % COLORS.length];
    const id = 'acc-' + slug(cat);
    const isOpen = OPEN_CATS.has(cat);
    return `
    <div class="acc-item ${isOpen ? 'open' : ''}" data-cat="${esc(cat)}">
      <div class="acc-head">
        <div class="acc-rank">${String(idx + 1).padStart(2, '0')}</div>
        <div class="acc-name">${esc(cat)}</div>
        <div class="acc-bar-track"><div class="acc-bar-fill" style="width:${fillPct}%;background:${color}"></div></div>
        <div class="acc-total">${fmt(total)}</div>
        <div class="acc-pct">${pct}%</div>
        <div class="acc-chevron">▸</div>
      </div>
      <div class="acc-body" id="${esc(id)}"></div>
    </div>`;
  }).join('');

  OPEN_CATS.forEach((cat) => {
    if (filtered.some(([c]) => c === cat)) fillAccordionBody(cat, g, months);
  });
}

export function initGastosListeners() {
  document.getElementById('gasAccordion')?.addEventListener('click', (e) => {
    const head = e.target.closest('.acc-head');
    if (head) toggleAccordion(head.parentElement.dataset.cat);
  });
}

function toggleAccordion(cat) {
  const item = [...document.querySelectorAll('#gasAccordion .acc-item')].find((el) => el.dataset.cat === cat);
  if (!item) return;
  const isOpen = item.classList.contains('open');
  if (isOpen) {
    item.classList.remove('open');
    OPEN_CATS.delete(cat);
  } else {
    item.classList.add('open');
    OPEN_CATS.add(cat);
    fillAccordionBody(cat, FILTERED.gastos, METRICS.gMonths);
  }
}

function fillAccordionBody(cat, g, months) {
  const id = 'acc-' + slug(cat);
  const body = document.getElementById(id);
  if (!body) return;

  const items = g.filter((r) => r.cat === cat);
  const total = items.reduce((a, r) => a + r.monto, 0);
  const avg = items.length ? total / items.length : 0;
  const maxItem = [...items].sort((a, b) => b.monto - a.monto)[0];

  const subMap = {};
  items.forEach((r) => {
    const k = r.comentario || '—';
    if (!subMap[k]) subMap[k] = { t: 0, c: 0 };
    subMap[k].t += r.monto;
    subMap[k].c++;
  });
  const subSorted = Object.entries(subMap).sort((a, b) => b[1].t - a[1].t);
  const subTop = subSorted.slice(0, 6);
  const restCount = subSorted.length - subTop.length;
  const sparkId = id + '-spark';

  body.innerHTML = `
    <div class="acc-stats">
      <div class="acc-stat">Transacciones<strong>${items.length}</strong></div>
      <div class="acc-stat">Promedio<strong>${fmtFull(avg)}</strong></div>
      <div class="acc-stat">Mayor gasto<strong>${maxItem ? fmtFull(maxItem.monto) : '—'}</strong></div>
      <div class="acc-stat">Fecha<strong>${maxItem ? maxItem.fecha : '—'}</strong></div>
    </div>
    <div class="acc-spark-wrap"><canvas id="${sparkId}"></canvas></div>
    <div class="acc-sub-title">Top conceptos</div>
    <div class="receipt-list">
      ${subTop.map(([k, v]) => `<div class="receipt-row"><div class="receipt-name">${esc(k)}</div><div class="receipt-meta">${v.c}x</div><div class="receipt-amt">${fmtFull(v.t)}</div></div>`).join('')}
      ${restCount > 0 ? `<div class="receipt-row"><div class="receipt-name" style="color:var(--color-ink-faint)">+ ${restCount} más</div></div>` : ''}
    </div>`;

  const monThis = groupByMon(items);
  mkChart(sparkId, {
    type: 'line',
    data: { labels: months, datasets: [{ data: months.map((m) => monThis[m] || 0), borderColor: C.purple, backgroundColor: C.purpleSoftBg, tension: .35, fill: true, pointRadius: 0, borderWidth: 2 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => fmtFull(ctx.raw) } } }, scales: { x: { display: false }, y: { display: false } } }
  });
}

function renderSubsList(g) {
  const isSub = matcher('suscripciones');
  const subs = g.filter((r) => isSub(r.cat));
  const subMap = {};
  subs.forEach((r) => {
    const k = r.comentario || r.cat;
    if (!subMap[k]) subMap[k] = { total: 0, cnt: 0 };
    subMap[k].total += r.monto;
    subMap[k].cnt++;
  });
  const rows = Object.entries(subMap).sort((a, b) => b[1].total - a[1].total);
  document.getElementById('gasSubsList').innerHTML = rows.length
    ? rows.map(([k, v]) => `<div class="receipt-row"><div class="receipt-name">${esc(k)}</div><div class="receipt-meta">${v.cnt}x</div><div class="receipt-amt">${fmtFull(v.total)}</div></div>`).join('')
    : '<div class="empty-state">Sin suscripciones en el período.</div>';
}

function renderTopGastosList(g) {
  const top = [...g].sort((a, b) => b.monto - a.monto).slice(0, 10);
  document.getElementById('gasTopList').innerHTML = top.length
    ? top.map((r) => `<div class="receipt-row"><div class="receipt-date">${r.fecha?.slice(5)}</div><div class="receipt-name">${esc(r.comentario || r.cat)}</div><div class="receipt-meta">${esc(r.cat)}</div><div class="receipt-amt">${fmtFull(r.monto)}</div></div>`).join('')
    : '<div class="empty-state">Sin datos.</div>';
}

function renderRecurrentes(g) {
  const el = document.getElementById('gasRecurrentesList');
  if (!el) return;

  const recurrentes = groupConcepts(g)
    .map((gr) => ({ ...gr, months: new Set(gr.items.map((r) => r.fecha?.slice(0, 7)).filter(Boolean)), amounts: gr.items.map((r) => r.monto) }))
    .filter((v) => v.months.size >= 2)
    .map((v) => ({ ...v, total: v.amounts.reduce((a, x) => a + x, 0) }))
    .sort((a, b) => b.total - a.total);

  if (!recurrentes.length) {
    el.innerHTML = '<div class="empty-state">No se detectaron gastos recurrentes (mismo concepto en 2+ meses).</div>';
    return;
  }

  el.innerHTML = recurrentes.map((v) => {
    const avg = v.total / v.amounts.length;
    const variacion = Math.max(...v.amounts) - Math.min(...v.amounts);
    const badge = v.months.size >= 4 ? 'recur-badge-high' : 'recur-badge-med';
    return `
      <div class="recur-row">
        <div class="recur-main">
          <div class="recur-name">${esc(v.name)}</div>
          <div class="recur-cat">${esc(v.cat)}</div>
        </div>
        <div class="recur-stats">
          <div class="recur-stat"><span class="recur-stat-label">Promedio</span><span class="recur-stat-val">${fmtFull(avg)}</span></div>
          <div class="recur-stat"><span class="recur-stat-label">Total</span><span class="recur-stat-val">${fmtFull(v.total)}</span></div>
          ${variacion > 0 ? `<div class="recur-stat"><span class="recur-stat-label">Variación</span><span class="recur-stat-val">${fmtFull(variacion)}</span></div>` : ''}
        </div>
        <div class="recur-badge ${badge}">${v.months.size} meses</div>
      </div>`;
  }).join('');
}

/** Suscripciones cuyo precio subió por encima de la inflación (INDEC) entre los dos últimos cobros. */
function renderSubAlerts(g) {
  const el = document.getElementById('gasSubAlerts');
  if (!el) return;
  const changes = subscriptionChanges(g);
  if (!changes.length) {
    el.innerHTML = '<div class="empty-state">Sin suscripciones con al menos 2 cobros en el período.</div>';
    return;
  }
  const noInfl = INFL.state !== 'ok';
  const rows = changes.map((c) => {
    const bad = !noInfl && c.excess > 3;
    const same = Math.abs(c.pct) < 0.5;
    const cls = bad ? 'i-warn' : same ? 'i-info' : 'i-tip';
    const ico = bad ? '📈' : same ? '➖' : '✅';
    const detail = same
      ? `Se mantuvo en ${fmtFull(c.lastAmt)} (${c.prev} → ${c.last})`
      : `${fmtFull(c.prevAmt)} → ${fmtFull(c.lastAmt)} (${c.pct >= 0 ? '+' : ''}${c.pct.toFixed(1)}%)${noInfl ? '' : ` vs inflación ${c.infl.toFixed(1)}%`}`;
    const verdict = bad ? `Subió ${c.excess.toFixed(1)} pts por encima de la inflación. ` : !same && !noInfl && c.excess < -3 ? 'Perdió valor real frente a la inflación. ' : '';
    return `<div class="insight ${cls}"><div class="ico">${ico}</div><div class="body"><strong>${esc(c.name)}</strong>${detail}. ${verdict}Costo anual: ${fmt(c.yearly)}.</div></div>`;
  }).join('');
  el.innerHTML = rows + (noInfl ? '<div class="bud-note">Sin conexión con la API de inflación: solo se muestra la variación nominal.</div>' : '');
}
