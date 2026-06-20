import { FILTERED, C } from '../state.js';
import { fmt, fmtFull, groupByMon, allMonths, mkChart, axX, axY } from '../helpers.js';

export function renderFlujo() {
  const g = FILTERED.gastos, i = FILTERED.ingresos;
  const months = allMonths(g, i);
  const monG = groupByMon(g), monI = groupByMon(i);
  const netos = months.map((m) => (monI[m] || 0) - (monG[m] || 0));
  const positivos = netos.filter((v) => v >= 0).length;
  const negativos = netos.filter((v) => v < 0).length;
  const best  = months.length ? Math.max(...netos) : 0;
  const worst = months.length ? Math.min(...netos) : 0;
  const bestM  = months[netos.indexOf(best)];
  const worstM = months[netos.indexOf(worst)];
  const tG = g.reduce((a, r) => a + r.monto, 0);
  const tI = i.reduce((a, r) => a + r.monto, 0);

  document.getElementById('kpiFlujo').innerHTML = `
    <div class="kpi green"><div class="label">Meses Positivos</div><div class="value">${positivos}</div><div class="sub">de ${months.length}</div></div>
    <div class="kpi red"><div class="label">Meses Negativos</div><div class="value">${negativos}</div><div class="sub">de ${months.length}</div></div>
    <div class="kpi green"><div class="label">Mejor Mes</div><div class="value">${fmt(best)}</div><div class="sub">${bestM || '—'}</div></div>
    <div class="kpi red"><div class="label">Peor Mes</div><div class="value">${fmt(worst)}</div><div class="sub">${worstM || '—'}</div></div>
    <div class="kpi blue"><div class="label">Prom. Ingreso</div><div class="value">${fmt(months.length ? tI / months.length : 0)}</div><div class="sub">/mes</div></div>
    <div class="kpi yellow"><div class="label">Prom. Gasto</div><div class="value">${fmt(months.length ? tG / months.length : 0)}</div><div class="sub">/mes</div></div>`;

  mkChart('chartFlujo', {
    type: 'bar',
    data: {
      labels: months.map((m) => m.slice(5) + '/' + m.slice(2, 4)),
      datasets: [{
        data: netos,
        backgroundColor: netos.map((v) => v >= 0 ? C.greenSoftBg + '.5)' : C.redSoftBg + '.5)'),
        borderColor: netos.map((v) => v >= 0 ? C.green : C.red),
        borderWidth: 1.5,
        borderRadius: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => (ctx.raw >= 0 ? '+' : '') + fmtFull(ctx.raw) } }
      },
      scales: { x: axX, y: axY((v) => (v >= 0 ? '+' : '') + fmt(v)) }
    }
  });

  const maxAbsNeto = Math.max(...netos.map(Math.abs), 1);
  let html = `<thead><tr><th>Mes</th><th class="r">Ingresos</th><th class="r">Gastos</th><th class="r">Neto</th><th></th></tr></thead><tbody>`;
  months.forEach((m) => {
    const ng = monG[m] || 0, ni = monI[m] || 0, neto = ni - ng;
    const cls = neto >= 0 ? 'pos' : 'neg';
    const barW = Math.min(Math.abs(neto) / maxAbsNeto * 80, 80);
    const bar = `<div style="display:inline-block;width:${barW}px;height:6px;background:${neto >= 0 ? C.green : C.red};border-radius:2px;vertical-align:middle"></div>`;
    html += `<tr><td class="muted">${m}</td><td class="r pos">${fmtFull(ni)}</td><td class="r neg">${fmtFull(ng)}</td><td class="r ${cls}">${neto >= 0 ? '+' : ''}${fmtFull(neto)}</td><td>${bar}</td></tr>`;
  });
  html += '</tbody>';
  document.getElementById('tblFlujo').innerHTML = html;
}
