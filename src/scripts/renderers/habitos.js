import { FILTERED, METRICS, C, COLORS, DAY_NAMES, A } from '../state.js';
import { fmt, fmtFull, esc, mkChart, axX, axY, tooltipARS, legendStyle, chartOpts, monthLabel, sortedEntries } from '../helpers.js';

const day = (f) => new Date(f + 'T12:00:00');

export function renderHabitos() {
  const g = FILTERED.gastos;
  const { tG: total, byDateG: byDate } = METRICS;
  const dates = [...new Set(g.map((r) => r.fecha).filter(Boolean))].sort();
  const span = dates.length ? Math.max(1, Math.round((day(dates.at(-1)) - day(dates[0])) / 864e5) + 1) : 1;

  const dow = Array(7).fill(0), dowN = Array(7).fill(0), dom = Array(31).fill(0);
  g.forEach((r) => {
    if (!r.fecha) return;
    const d = day(r.fecha);
    dow[d.getDay()] += r.monto;
    dowN[d.getDay()]++;
    dom[d.getDate() - 1] += r.monto;
  });
  const worst = sortedEntries(byDate)[0];
  const topDow = dow.indexOf(Math.max(...dow));

  document.getElementById('kpiHabitos').innerHTML = `
    <div class="kpi yellow"><div class="label">Gasto diario</div><div class="value">${fmt(total / span)}</div><div class="sub">promedio por día</div></div>
    <div class="kpi purple"><div class="label">Ticket medio</div><div class="value">${fmt(g.length ? total / g.length : 0)}</div><div class="sub">por compra</div></div>
    <div class="kpi blue"><div class="label">Compras por día</div><div class="value">${(g.length / span).toFixed(1)}</div><div class="sub">${g.length} en ${span} días</div></div>
    <div class="kpi red"><div class="label">Día más caro</div><div class="value">${worst ? fmt(worst[1]) : '-'}</div><div class="sub">${worst ? worst[0] : ''}</div></div>
    <div class="kpi orange"><div class="label">Día fuerte</div><div class="value">${g.length ? DAY_NAMES[topDow].slice(0, 3) : '-'}</div><div class="sub">más gasto acumulado</div></div>
    <div class="kpi green"><div class="label">Días sin gasto</div><div class="value">${Math.max(0, span - dates.length)}</div><div class="sub">de ${span}</div></div>`;

  const order = [1, 2, 3, 4, 5, 6, 0];
  mkChart('chartDow', {
    type: 'bar',
    data: { labels: order.map((i) => DAY_NAMES[i].slice(0, 3)), datasets: [{ data: order.map((i) => (dowN[i] ? dow[i] : 0)), backgroundColor: order.map((i) => (i === topDow ? C.purple : C.purpleSoftBg)), borderColor: C.purple, borderWidth: 1 }] },
    options: { responsive: true, plugins: { legend: { display: false }, tooltip: tooltipARS }, scales: { x: axX, y: axY() } }
  });

  mkChart('chartDom', {
    type: 'bar',
    data: { labels: dom.map((_, i) => i + 1), datasets: [{ data: dom, backgroundColor: C.purpleSoftBg, borderColor: C.purple, borderWidth: 1 }] },
    options: { responsive: true, plugins: { legend: { display: false }, tooltip: tooltipARS }, scales: { x: axX, y: axY() } }
  });

  const months = METRICS.gMonths.slice(-12);
  const top = sortedEntries(METRICS.byCatG).slice(0, 6).map((e) => e[0]);
  const series = top.map((c, k) => ({
    label: c,
    backgroundColor: COLORS[k],
    data: months.map((m) => METRICS.catMonthG[c]?.[m] || 0)
  }));
  mkChart('chartCatMes', {
    type: 'bar',
    data: { labels: months.map(monthLabel), datasets: series },
    options: chartOpts({ legend: true, x: { ...axX, stacked: true }, y: { ...axY(), stacked: true } })
  });

  const edges = [5000, 10000, 20000, 50000, 100000, Infinity];
  const names = ['< $5K', '$5K–10K', '$10K–20K', '$20K–50K', '$50K–100K', '> $100K'];
  const cnt = edges.map(() => 0), sum = edges.map(() => 0);
  g.forEach((r) => { const k = edges.findIndex((e) => r.monto < e); cnt[k]++; sum[k] += r.monto; });
  mkChart('chartTicket', {
    type: 'bar',
    data: { labels: names, datasets: [
      { label: 'Cantidad de compras', data: cnt, backgroundColor: C.purpleSoftBg, borderColor: C.purple, borderWidth: 1, yAxisID: 'y' },
      { label: 'Monto total', data: sum, type: 'line', borderColor: C.red, backgroundColor: C.red, pointRadius: 3, tension: 0.25, yAxisID: 'y1' }
    ] },
    options: { responsive: true, plugins: { legend: legendStyle, tooltip: { callbacks: { label: (c) => (c.dataset.yAxisID === 'y1' ? fmtFull(c.raw) : c.raw + ' compras') } } },
      scales: { x: axX, y: axY((v) => v), y1: { ...axY(), position: 'right', grid: { drawOnChartArea: false } } } }
  });

  const com = {};
  g.forEach((r) => {
    const k = (r.comentario || '').toString().trim();
    if (!k) return;
    com[k] = com[k] || { n: 0, t: 0 };
    com[k].n++;
    com[k].t += r.monto;
  });
  const rows = Object.entries(com).filter(([, v]) => v.n > 1).sort((a, b) => b[1].t - a[1].t).slice(0, 10);
  document.getElementById('habTopComercios').innerHTML = rows.length
    ? rows.map(([k, v]) => `<div class="receipt-row"><span class="receipt-name">${esc(k)}</span><span class="receipt-meta">${v.n}x · ${fmt(v.t / v.n)}</span><span class="receipt-amt">${fmt(v.t)}</span></div>`).join('')
    : '<div class="empty-state">Sin repeticiones en el período.</div>';
}

export function renderResumenExtra() {
  const { months, monG, monI, byDateG: by, catMonthG, gMonths: ms } = METRICS;
  const labels = months.map(monthLabel);
  let acc = 0;
  const bal = months.map((m) => (acc += (monI[m] || 0) - (monG[m] || 0)));
  const tasa = months.map((m) => { const ing = monI[m] || 0; return ing ? Math.round(((ing - (monG[m] || 0)) / ing) * 100) : null; });

  mkChart('chartBalance', {
    type: 'line',
    data: { labels, datasets: [{ data: bal, borderColor: C.purple, backgroundColor: A('accent', .18), fill: true, tension: 0.25, pointRadius: 0, borderWidth: 2 }] },
    options: { responsive: true, plugins: { legend: { display: false }, tooltip: tooltipARS }, scales: { x: axX, y: axY() } }
  });

  mkChart('chartTasa', {
    type: 'bar',
    data: { labels, datasets: [{ data: tasa, backgroundColor: tasa.map((v) => (v >= 0 ? A('accent', .55) : A('neg', .6))), borderColor: tasa.map((v) => (v >= 0 ? C.purple : C.red)), borderWidth: 1 }] },
    options: { responsive: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => c.raw + '%' } } }, scales: { x: axX, y: axY((v) => v + '%') } }
  });

  const cal = document.getElementById('calGasto');
  if (cal) {
    const dates = Object.keys(by).sort();
    cal.innerHTML = '';
    if (dates.length) {
      const end = day(dates.at(-1));
      const start = new Date(end);
      start.setDate(start.getDate() - 52 * 7 + 1);
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      const vals = Object.values(by).sort((a, b) => a - b);
      const cap = vals[Math.floor(vals.length * 0.95)] || 1;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const k = d.toISOString().slice(0, 10);
        const v = by[k] || 0;
        const a = v ? (0.18 + Math.min(v / cap, 1) * 0.82).toFixed(2) : 0;
        const cell = document.createElement('div');
        cell.className = 'cal-cell';
        cell.style.background = v ? `rgba(${C.rgb.accent},${a})` : A('accent', .07);
        cell.title = `${k}: ${v ? fmtFull(v) : 'sin gasto'}`;
        cal.appendChild(cell);
      }
    }
  }

  const [cur, prev] = [ms.at(-1), ms.at(-2)];
  if (cur && prev) {
    const rows = Object.keys(catMonthG)
      .map((k) => [k, (catMonthG[k][cur] || 0) - (catMonthG[k][prev] || 0)])
      .filter((r) => r[1] !== 0)
      .sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]))
      .slice(0, 10);
    mkChart('chartVar', {
      type: 'bar',
      data: { labels: rows.map((r) => r[0]), datasets: [{ data: rows.map((r) => r[1]), backgroundColor: rows.map((r) => (r[1] > 0 ? A('neg', .6) : A('accent', .6))), borderColor: rows.map((r) => (r[1] > 0 ? C.red : C.purple)), borderWidth: 1 }] },
      options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => (c.raw > 0 ? '+' : '') + fmtFull(c.raw) } } }, scales: { x: axY(), y: { ...axX, ticks: { ...axX.ticks, maxRotation: 0, font: { size: 10, family: 'JetBrains Mono' } } } } }
    });
  }
}
