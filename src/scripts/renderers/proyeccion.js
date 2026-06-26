import { FILTERED, C } from '../state.js';
import { fmt, fmtFull, groupByMon, allMonths, mkChart, axX, axY, tooltipARS, legendStyle } from '../helpers.js';

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MONTH_FULL  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function linealTrend(values) {
  const n = values.length;
  if (n < 2) return 0;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, v) => a + v, 0) / n;
  const num = values.reduce((a, v, i) => a + (i - meanX) * (v - meanY), 0);
  const den = values.reduce((a, _, i) => a + (i - meanX) ** 2, 0);
  return den === 0 ? 0 : num / den;
}

function nextMonths(fromYM, count) {
  const [y, m] = fromYM.split('-').map(Number);
  return Array.from({ length: count }, (_, k) => {
    const d = new Date(y, m - 1 + k + 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

export function renderProyeccion() {
  const g = FILTERED.gastos, i = FILTERED.ingresos;
  const months = allMonths(g, i);

  const kpiEl    = document.getElementById('kpiProyeccion');
  const tablaEl  = document.getElementById('proyeccionTabla');

  if (months.length < 2) {
    kpiEl.innerHTML = '<div class="empty-state">Necesitás al menos 2 meses de datos para proyectar.</div>';
    tablaEl.innerHTML = '';
    return;
  }

  const monG = groupByMon(g);
  const monI = groupByMon(i);

  const WIN = Math.min(months.length, 6);
  const recent = months.slice(-WIN);
  const avgG = recent.reduce((a, m) => a + (monG[m] || 0), 0) / WIN;
  const avgI = recent.reduce((a, m) => a + (monI[m] || 0), 0) / WIN;
  const trendG = linealTrend(recent.map((m) => monG[m] || 0));
  const trendI = linealTrend(recent.map((m) => monI[m] || 0));

  const PROJ = 6;
  const projMonths = nextMonths(months[months.length - 1], PROJ);
  const projG = projMonths.map((_, k) => Math.max(0, avgG + trendG * (k + 1)));
  const projI = projMonths.map((_, k) => Math.max(0, avgI + trendI * (k + 1)));
  const projNeto = projI.map((v, k) => v - projG[k]);
  let cum = 0;
  const projAcum = projNeto.map((n) => { cum += n; return cum; });

  const totalProjNeto = projNeto.reduce((a, v) => a + v, 0);
  const avgSave = totalProjNeto / PROJ;

  kpiEl.innerHTML = `
    <div class="kpi blue"><div class="label">Ingreso prom. proy.</div><div class="value">${fmt(avgI)}</div><div class="sub">por mes</div></div>
    <div class="kpi red"><div class="label">Gasto prom. proy.</div><div class="value">${fmt(avgG)}</div><div class="sub">por mes</div></div>
    <div class="kpi ${totalProjNeto >= 0 ? 'green' : 'red'}"><div class="label">Neto acumulado (6m)</div><div class="value">${totalProjNeto >= 0 ? '+' : ''}${fmt(totalProjNeto)}</div><div class="sub">${totalProjNeto >= 0 ? 'superávit' : 'déficit'}</div></div>
    <div class="kpi ${avgSave >= 0 ? 'green' : 'red'}"><div class="label">Ahorro prom. proy.</div><div class="value">${avgSave >= 0 ? '+' : ''}${fmt(avgSave)}</div><div class="sub">por mes</div></div>
    <div class="kpi purple"><div class="label">Tendencia gastos</div><div class="value">${trendG >= 0 ? '▲' : '▼'} ${fmt(Math.abs(trendG))}</div><div class="sub">por mes</div></div>
    <div class="kpi ${trendI >= 0 ? 'green' : 'red'}"><div class="label">Tendencia ingresos</div><div class="value">${trendI >= 0 ? '▲' : '▼'} ${fmt(Math.abs(trendI))}</div><div class="sub">por mes</div></div>`;

  const histLabels = months.map((m) => MONTH_NAMES[+m.slice(5) - 1] + ' ' + m.slice(2, 4));
  const projLabels = projMonths.map((m) => MONTH_NAMES[+m.slice(5) - 1] + ' ' + m.slice(2, 4));
  const allLabels  = [...histLabels, ...projLabels];
  const nullH = months.map(() => null);
  const nullP = projMonths.map(() => null);
  const lastG = monG[months[months.length - 1]] || 0;
  const lastI = monI[months[months.length - 1]] || 0;

  mkChart('chartProyeccion', {
    type: 'bar',
    data: {
      labels: allLabels,
      datasets: [
        { label: 'Ingresos reales', data: [...months.map((m) => monI[m] || 0), ...nullP], backgroundColor: 'rgba(74,222,128,.2)', borderColor: C.green, borderWidth: 1.5, borderRadius: 2, order: 2 },
        { label: 'Gastos reales',   data: [...months.map((m) => monG[m] || 0), ...nullP], backgroundColor: 'rgba(251,113,133,.2)', borderColor: C.red,   borderWidth: 1.5, borderRadius: 2, order: 2 },
        { label: 'Ingresos proy.',  data: [...nullH.slice(0, -1), lastI, ...projI], type: 'line', borderColor: C.green, borderDash: [5,4], borderWidth: 2, pointRadius: (ctx) => ctx.dataIndex >= months.length - 1 ? 3 : 0, pointBackgroundColor: C.green, backgroundColor: 'transparent', tension: 0.3, order: 1 },
        { label: 'Gastos proy.',    data: [...nullH.slice(0, -1), lastG, ...projG], type: 'line', borderColor: C.red,   borderDash: [5,4], borderWidth: 2, pointRadius: (ctx) => ctx.dataIndex >= months.length - 1 ? 3 : 0, pointBackgroundColor: C.red,   backgroundColor: 'transparent', tension: 0.3, order: 1 },
      ],
    },
    options: { responsive: true, plugins: { legend: { display: true, labels: legendStyle.labels }, tooltip: tooltipARS }, scales: { x: axX, y: axY() } },
  });

  mkChart('chartAcumuladoProy', {
    type: 'line',
    data: {
      labels: projLabels,
      datasets: [{
        label: 'Neto acumulado proy.',
        data: projAcum,
        borderColor: C.purple,
        backgroundColor: C.purpleSoftBg,
        borderWidth: 2,
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: projAcum.map((v) => v >= 0 ? C.green : C.red),
        pointBorderColor:     projAcum.map((v) => v >= 0 ? C.green : C.red),
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: tooltipARS },
      scales: {
        x: axX,
        y: { ticks: { color: '#8d7fb5', callback: (v) => (v >= 0 ? '+' : '') + fmt(v), font: { size: 9, family: 'JetBrains Mono' } }, grid: { color: '#251d40' } },
      },
    },
  });

  tablaEl.innerHTML = `
    <table class="tbl">
      <thead><tr>
        <th>Mes</th>
        <th style="text-align:right">Ingresos proy.</th>
        <th style="text-align:right">Gastos proy.</th>
        <th style="text-align:right">Neto</th>
        <th style="text-align:right">Acumulado</th>
      </tr></thead>
      <tbody>
        ${projMonths.map((m, k) => {
          const [y, mo] = m.split('-').map(Number);
          const neto = projNeto[k], acum = projAcum[k];
          return `<tr>
            <td>${MONTH_FULL[mo - 1]} ${y}</td>
            <td style="text-align:right;color:var(--green)">${fmtFull(projI[k])}</td>
            <td style="text-align:right;color:var(--red)">${fmtFull(projG[k])}</td>
            <td style="text-align:right;color:${neto >= 0 ? 'var(--green)' : 'var(--red)'}">${neto >= 0 ? '+' : ''}${fmtFull(neto)}</td>
            <td style="text-align:right;color:${acum >= 0 ? 'var(--green)' : 'var(--red)'}">${acum >= 0 ? '+' : ''}${fmtFull(acum)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}
