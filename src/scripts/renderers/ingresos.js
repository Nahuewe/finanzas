import { FILTERED, C, COLORS } from '../state.js';
import { fmt, fmtFull, groupBy, groupByMon, sortedEntries, mkChart, axX, axY, tooltipARS } from '../helpers.js';

export function renderIngresos() {
  const i = FILTERED.ingresos;
  const tI = i.reduce((a, r) => a + r.monto, 0);
  const bycat = sortedEntries(groupBy(i, 'cat'));
  const months = Object.keys(groupByMon(i)).sort();
  const salario = i.filter((r) => r.cat === 'Salario');
  const lastSal = salario.sort((a, b) => (b.fecha > a.fecha ? 1 : -1))[0]?.monto || 0;
  const freelance = i.filter((r) => r.cat === 'Freelance').reduce((a, r) => a + r.monto, 0);

  document.getElementById('kpiIngresos').innerHTML = `
    <div class="kpi green"><div class="label">Total Ingresos</div><div class="value">${fmt(tI)}</div><div class="sub">${i.length} tx</div></div>
    <div class="kpi blue"><div class="label">Salario Último</div><div class="value">${fmt(lastSal)}</div><div class="sub">más reciente</div></div>
    <div class="kpi purple"><div class="label">Freelance</div><div class="value">${fmt(freelance)}</div><div class="sub">${i.filter((r) => r.cat === 'Freelance').length} pagos</div></div>
    <div class="kpi yellow"><div class="label">Promedio Mensual</div><div class="value">${fmt(months.length ? tI / months.length : 0)}</div><div class="sub">${months.length} meses</div></div>`;

  const monI = groupByMon(i);
  mkChart('chartIngMensual', {
    type: 'bar',
    data: {
      labels: months.map((m) => m.slice(5) + '/' + m.slice(2, 4)),
      datasets: [{
        data: months.map((m) => monI[m] || 0),
        backgroundColor: months.map((m) => (monI[m] || 0) > 2000000 ? C.greenSoftBg + '.7)' : C.greenSoftBg + '.3)'),
        borderColor: C.green,
        borderWidth: 1,
        borderRadius: 3
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false }, tooltip: tooltipARS }, scales: { x: axX, y: axY() } }
  });

  const barEl = document.getElementById('ingBarras');
  barEl.innerHTML = '';
  const maxV = bycat[0]?.[1] || 1;
  bycat.forEach(([cat, v], ci) => {
    const pct = (v / tI * 100).toFixed(1);
    const fill = (v / maxV * 100).toFixed(0);
    barEl.insertAdjacentHTML('beforeend', `
      <div class="bar-row">
        <div class="name">${cat}</div>
        <div class="track"><div class="fill" style="width:${fill}%;background:${COLORS[ci % COLORS.length]}">${fmt(v)}</div></div>
        <div class="pct">${pct}%</div>
      </div>`);
  });

  const cats = [...new Set(i.map((r) => r.cat))].sort();
  let html = `<thead><tr><th>Categoría</th><th>Top comentario</th><th class="r">Total</th><th class="r">Veces</th></tr></thead><tbody>`;
  cats.forEach((cat) => {
    const sub = i.filter((r) => r.cat === cat);
    const subDetail = {};
    sub.forEach((r) => { const k = r.comentario || '—'; if (!subDetail[k]) subDetail[k] = 0; subDetail[k] += r.monto; });
    const top1 = Object.entries(subDetail).sort((a, b) => b[1] - a[1])[0];
    const catT = sub.reduce((a, r) => a + r.monto, 0);
    html += `<tr><td><strong>${cat}</strong></td><td class="muted">${String(top1?.[0] || '').slice(0, 30)}</td><td class="r pos">${fmtFull(catT)}</td><td class="r muted">${sub.length}x</td></tr>`;
  });
  html += '</tbody>';
  document.getElementById('tblIngDetalle').innerHTML = html;
}
