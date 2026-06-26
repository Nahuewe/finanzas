import { FILTERED, C, COLORS } from '../state.js';
import { fmt, fmtFull, groupBy, groupByMon, sortedEntries, allMonths, mkChart, axX, axY, tooltipARS, legendStyle } from '../helpers.js';

export function renderResumen() {
  const g = FILTERED.gastos, i = FILTERED.ingresos;
  const tG = g.reduce((a, r) => a + r.monto, 0);
  const tI = i.reduce((a, r) => a + r.monto, 0);
  const neto = tI - tG;
  const months = allMonths(g, i);
  const avgG = months.length ? tG / months.length : 0;

  document.getElementById('kpiResumen').innerHTML = `
    <div class="kpi blue"><div class="label">Ingresos</div><div class="value">${fmt(tI)}</div><div class="sub">${i.length} tx</div></div>
    <div class="kpi red"><div class="label">Gastos</div><div class="value">${fmt(tG)}</div><div class="sub">${g.length} tx</div></div>
    <div class="kpi ${neto >= 0 ? 'green' : 'red'}"><div class="label">Neto</div><div class="value">${neto >= 0 ? '+' : ''}${fmt(neto)}</div><div class="sub">${neto >= 0 ? 'superávit' : 'déficit'}</div></div>
    <div class="kpi yellow"><div class="label">Prom. Mensual</div><div class="value">${fmt(avgG)}</div><div class="sub">gasto / mes</div></div>
    <div class="kpi purple"><div class="label">Tasa Ahorro</div><div class="value">${tI ? ((neto / tI) * 100).toFixed(0) : '0'}%</div><div class="sub">de ingresos</div></div>
    <div class="kpi orange"><div class="label">Meses</div><div class="value">${months.length}</div><div class="sub">registrados</div></div>`;

  const monG = groupByMon(g), monI = groupByMon(i);

  mkChart('chartResumen', {
    type: 'bar',
    data: {
      labels: months.map((m) => m.slice(5) + '/' + m.slice(2, 4)),
      datasets: [
        { label: 'Ingresos', data: months.map((m) => monI[m] || 0), backgroundColor: C.greenSoftBg + '.25)', borderColor: C.green, borderWidth: 1.5, borderRadius: 2 },
        { label: 'Gastos',   data: months.map((m) => monG[m] || 0), backgroundColor: C.redSoftBg  + '.25)', borderColor: C.red,   borderWidth: 1.5, borderRadius: 2 }
      ]
    },
    options: { responsive: true, plugins: { legend: { display: true, labels: legendStyle.labels }, tooltip: tooltipARS }, scales: { x: axX, y: axY() } }
  });

  const ingCats = sortedEntries(groupBy(i, 'cat')).slice(0, 7);
  const gasCats = sortedEntries(groupBy(g, 'cat')).slice(0, 8);

  mkChart('chartIngDonut', {
    type: 'doughnut',
    data: { labels: ingCats.map((e) => e[0]), datasets: [{ data: ingCats.map((e) => e[1]), backgroundColor: COLORS, borderWidth: 2, borderColor: C.bg }] },
    options: { responsive: true, cutout: '62%', plugins: { legend: { position: 'bottom', labels: legendStyle.labels }, tooltip: tooltipARS } }
  });

  mkChart('chartGasDonut', {
    type: 'doughnut',
    data: { labels: gasCats.map((e) => e[0]), datasets: [{ data: gasCats.map((e) => e[1]), backgroundColor: COLORS, borderWidth: 2, borderColor: C.bg }] },
    options: { responsive: true, cutout: '62%', plugins: { legend: { position: 'bottom', labels: legendStyle.labels }, tooltip: tooltipARS } }
  });

  renderHeatmap(months, monG, monI);
  renderAcumuladoMes(g);
}

function renderHeatmap(months, monG, monI) {
  const hm = document.getElementById('heatmap');
  if (!hm) return;
  hm.innerHTML = '';

  const netMap = {};
  months.forEach((m) => (netMap[m] = (monI[m] || 0) - (monG[m] || 0)));
  const maxAbs = Math.max(...Object.values(netMap).map(Math.abs), 1);

  const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  months.forEach((m) => {
    const v = netMap[m];
    const intensity = Math.min(Math.abs(v) / maxAbs, 1);
    const pos = v >= 0;
    const bgAlpha = (0.10 + intensity * 0.55).toFixed(2);
    const bg = pos
      ? `rgba(74,222,128,${bgAlpha})`
      : `rgba(251,113,133,${bgAlpha})`;
    const borderColor = pos
      ? `rgba(74,222,128,${(0.15 + intensity * 0.5).toFixed(2)})`
      : `rgba(251,113,133,${(0.15 + intensity * 0.5).toFixed(2)})`;

    const [year, month] = m.split('-');
    const monthName = MONTH_NAMES[parseInt(month, 10) - 1];
    const shortYear = year.slice(2);
    const sign = pos ? '+' : '-';
    const color = pos ? C.green : C.red;

    const cell = document.createElement('div');
    cell.className = 'hm-cell';
    cell.style.cssText = `background:${bg};border:1px solid ${borderColor};`;
    cell.title = `${monthName} ${year}: ${pos ? '+' : ''}${fmtFull(v)}`;
    cell.innerHTML = `
      <div class="hm-year">${shortYear}</div>
      <div class="hm-month">${monthName}</div>
      <div class="hm-bar-wrap"><div class="hm-bar" style="height:${Math.round(intensity * 28)}px;background:${color};opacity:0.6"></div></div>
      <div class="hm-value" style="color:${color}">${sign}${fmt(Math.abs(v))}</div>
    `;
    hm.appendChild(cell);
  });
}


function renderAcumuladoMes(g) {
  const el = document.getElementById('acumuladoMesWrap');
  if (!el) return;

  const today = new Date();
  const curYM  = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const prevDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevYM = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  const curItems  = g.filter((r) => r.fecha?.startsWith(curYM));
  const prevItems = g.filter((r) => r.fecha?.startsWith(prevYM));

  if (!curItems.length && !prevItems.length) {
    el.innerHTML = '<div class="empty-state">Sin datos del mes actual ni del anterior.</div>';
    return;
  }

  const daysInCur  = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysInPrev = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).getDate();
  const maxDays    = Math.max(daysInCur, daysInPrev);
  const todayDay   = today.getDate();

  const MNAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  function buildAccum(items, ym, days) {
    const byDay = {};
    items.forEach((r) => {
      const day = parseInt(r.fecha?.slice(8) || '0', 10);
      if (day >= 1 && day <= days) byDay[day] = (byDay[day] || 0) + r.monto;
    });
    let cum = 0;
    return Array.from({ length: days }, (_, i) => { cum += byDay[i + 1] || 0; return cum; });
  }

  const acumCur  = buildAccum(curItems,  curYM,  daysInCur);
  const acumPrev = buildAccum(prevItems, prevYM, daysInPrev);

  const dataCur  = Array.from({ length: maxDays }, (_, i) => (i < daysInCur  && i + 1 <= todayDay ? acumCur[i]  : null));
  const dataPrev = Array.from({ length: maxDays }, (_, i) => (i < daysInPrev                      ? acumPrev[i] : null));

  const totalCur  = curItems.reduce((a, r) => a + r.monto, 0);
  const totalPrev = prevItems.reduce((a, r) => a + r.monto, 0);
  const diffPct   = totalPrev > 0 ? ((totalCur - totalPrev) / totalPrev * 100).toFixed(0) : null;

  el.innerHTML = `
    <div class="acum-kpis">
      <div class="acum-kpi">
        <span class="acum-kpi-label">${MNAMES[today.getMonth()]} (hasta hoy)</span>
        <span class="acum-kpi-val" style="color:var(--red)">${fmtFull(totalCur)}</span>
      </div>
      <div class="acum-kpi">
        <span class="acum-kpi-label">${MNAMES[prevDate.getMonth()]} (total)</span>
        <span class="acum-kpi-val" style="color:var(--color-ink-dim)">${fmtFull(totalPrev)}</span>
      </div>
      ${diffPct !== null ? `<div class="acum-kpi">
        <span class="acum-kpi-label">Diferencia</span>
        <span class="acum-kpi-val" style="color:${+diffPct >= 0 ? 'var(--red)' : 'var(--green)'}">${+diffPct >= 0 ? '+' : ''}${diffPct}%</span>
      </div>` : ''}
    </div>
    <canvas id="chartAcumuladoMes"></canvas>`;

  mkChart('chartAcumuladoMes', {
    type: 'line',
    data: {
      labels: Array.from({ length: maxDays }, (_, i) => String(i + 1)),
      datasets: [
        { label: MNAMES[today.getMonth()], data: dataCur,  borderColor: C.red,      backgroundColor: 'rgba(251,113,133,.08)', borderWidth: 2, fill: true,  tension: 0.3, pointRadius: 0, spanGaps: false },
        { label: MNAMES[prevDate.getMonth()], data: dataPrev, borderColor: C.inkFaint, backgroundColor: 'transparent',           borderWidth: 1.5, borderDash: [4,3], fill: false, tension: 0.3, pointRadius: 0, spanGaps: false },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true, labels: { color: '#b6abd6', font: { size: 10, family: 'JetBrains Mono' }, boxWidth: 10, padding: 8 } },
        tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtFull(ctx.raw)}` } },
      },
      scales: {
        x: { ticks: { color: '#8d7fb5', font: { size: 9, family: 'JetBrains Mono' } }, grid: { color: '#251d40' } },
        y: { ticks: { color: '#8d7fb5', callback: (v) => fmt(v), font: { size: 9, family: 'JetBrains Mono' } }, grid: { color: '#251d40' } },
      },
    },
  });
}
