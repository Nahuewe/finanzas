import { FILTERED, C, COLORS, CAT_SEARCH, OPEN_CATS } from '../state.js';
import { fmt, fmtFull, slug, groupBy, groupByMon, sortedEntries, mkChart, axX, axY, tooltipARS } from '../helpers.js';

export function renderGastos() {
  const g = FILTERED.gastos;
  const tG = g.reduce((a, r) => a + r.monto, 0);
  const bycat = sortedEntries(groupBy(g, 'cat'));
  const months = Object.keys(groupByMon(g)).sort();
  const avgMon = months.length ? tG / months.length : 0;
  const top1 = bycat[0];
  const chatarra = g.filter((r) => r.cat === 'Chatarra').reduce((a, r) => a + r.monto, 0);

  document.getElementById('kpiGastos').innerHTML = `
    <div class="kpi red"><div class="label">Total Gastos</div><div class="value">${fmt(tG)}</div><div class="sub">${g.length} tx</div></div>
    <div class="kpi yellow"><div class="label">Mayor Categoría</div><div class="value">${top1 ? fmt(top1[1]) : '—'}</div><div class="sub">${top1 ? top1[0] : '—'}</div></div>
    <div class="kpi orange"><div class="label">Chatarra</div><div class="value">${fmt(chatarra)}</div><div class="sub">${g.filter((r) => r.cat === 'Chatarra').length} visitas</div></div>
    <div class="kpi blue"><div class="label">Promedio / mes</div><div class="value">${fmt(avgMon)}</div><div class="sub">${months.length} meses</div></div>`;

  const monG = groupByMon(g);
  mkChart('chartGasMensual', {
    type: 'line',
    data: {
      labels: months.map((m) => m.slice(5) + '/' + m.slice(2, 4)),
      datasets: [{ data: months.map((m) => monG[m] || 0), borderColor: C.red, backgroundColor: C.redSoftBg + '.08)', tension: .35, fill: true, pointRadius: 3, pointBackgroundColor: C.red }]
    },
    options: { responsive: true, plugins: { legend: { display: false }, tooltip: tooltipARS }, scales: { x: axX, y: axY() } }
  });

  renderMomStrip(g, months);
  renderCatAccordion(g, bycat, tG, months);
  renderSubsList(g);
  renderTopGastosList(g);
}

function renderMomStrip(g, months) {
  const el = document.getElementById('gasMomStrip');
  if (months.length < 2) {
    el.innerHTML = '<div class="mom-empty">Necesitás al menos 2 meses en el rango filtrado para comparar.</div>';
    return;
  }
  const curM = months[months.length - 1], prevM = months[months.length - 2];
  const curCats  = groupBy(g.filter((r) => r.fecha.startsWith(curM)),  'cat');
  const prevCats = groupBy(g.filter((r) => r.fecha.startsWith(prevM)), 'cat');
  const allCats = new Set([...Object.keys(curCats), ...Object.keys(prevCats)]);
  const deltas = [...allCats]
    .map((cat) => ({ cat, delta: (curCats[cat] || 0) - (prevCats[cat] || 0) }))
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
      return `<div class="mom-chip ${up ? 'up' : 'down'}"><span class="arrow">${up ? '▲' : '▼'}</span><span class="cat">${d.cat}</span><span class="delta">${up ? '+' : ''}${fmt(d.delta)}</span></div>`;
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
    <div class="acc-item ${isOpen ? 'open' : ''}" data-cat="${cat}">
      <div class="acc-head" onclick="toggleAccordion('${cat.replace(/'/g, "\\'")}')">
        <div class="acc-rank">${String(idx + 1).padStart(2, '0')}</div>
        <div class="acc-name">${cat}</div>
        <div class="acc-bar-track"><div class="acc-bar-fill" style="width:${fillPct}%;background:${color}"></div></div>
        <div class="acc-total">${fmt(total)}</div>
        <div class="acc-pct">${pct}%</div>
        <div class="acc-chevron">▸</div>
      </div>
      <div class="acc-body" id="${id}"></div>
    </div>`;
  }).join('');

  OPEN_CATS.forEach((cat) => {
    if (filtered.some(([c]) => c === cat)) fillAccordionBody(cat, g, months);
  });
}

export function toggleAccordion(cat) {
  const item = document.querySelector(`.acc-item[data-cat="${cat.replace(/"/g, '\\"')}"]`);
  if (!item) return;
  const isOpen = item.classList.contains('open');
  if (isOpen) {
    item.classList.remove('open');
    OPEN_CATS.delete(cat);
  } else {
    item.classList.add('open');
    OPEN_CATS.add(cat);
    fillAccordionBody(cat, FILTERED.gastos, Object.keys(groupByMon(FILTERED.gastos)).sort());
  }
}
window.toggleAccordion = toggleAccordion;

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
      ${subTop.map(([k, v]) => `<div class="receipt-row"><div class="receipt-name">${k}</div><div class="receipt-meta">${v.c}x</div><div class="receipt-amt">${fmtFull(v.t)}</div></div>`).join('')}
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
  const subs = g.filter((r) => r.cat === 'Suscripciones');
  const subMap = {};
  subs.forEach((r) => {
    const k = r.comentario || r.cat;
    if (!subMap[k]) subMap[k] = { total: 0, cnt: 0 };
    subMap[k].total += r.monto;
    subMap[k].cnt++;
  });
  const rows = Object.entries(subMap).sort((a, b) => b[1].total - a[1].total);
  document.getElementById('gasSubsList').innerHTML = rows.length
    ? rows.map(([k, v]) => `<div class="receipt-row"><div class="receipt-name">${k}</div><div class="receipt-meta">${v.cnt}x</div><div class="receipt-amt">${fmtFull(v.total)}</div></div>`).join('')
    : '<div class="empty-state">Sin suscripciones en el período.</div>';
}

function renderTopGastosList(g) {
  const top = [...g].sort((a, b) => b.monto - a.monto).slice(0, 10);
  document.getElementById('gasTopList').innerHTML = top.length
    ? top.map((r) => `<div class="receipt-row"><div class="receipt-date">${r.fecha?.slice(5)}</div><div class="receipt-name">${String(r.comentario || r.cat)}</div><div class="receipt-meta">${r.cat}</div><div class="receipt-amt">${fmtFull(r.monto)}</div></div>`).join('')
    : '<div class="empty-state">Sin datos.</div>';
}
