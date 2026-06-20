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
