import { FILTERED, METRICS, C, A } from '../state.js';
import { fmt, fmtFull, mkChart, axY, chartOpts } from '../helpers.js';
import { store } from '../storage.js';
import { detectFixed } from '../metrics.js';
import { projectScenarios } from '../projection.js';
import { INFL, inflOf } from '../externalData.js';

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MONTH_FULL  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const short = (m) => MONTH_NAMES[+m.slice(5) - 1] + ' ' + m.slice(2, 4);

/** Inflación mensual esperada: la que cargó el usuario o el promedio de los últimos 3 datos del INDEC. */
function expectedInflation() {
  const manual = store.get('projInfl', null);
  if (manual !== null && manual !== '') return { value: +manual || 0, source: 'manual' };
  const ks = Object.keys(INFL.data).sort().slice(-3);
  if (!ks.length) return { value: 0, source: 'sin datos' };
  return { value: ks.reduce((a, k) => a + INFL.data[k], 0) / ks.length, source: `promedio INDEC ${ks[0]} a ${ks.at(-1)}` };
}

export function renderProyeccion() {
  const { months, monG, monI } = METRICS;
  const kpiEl = document.getElementById('kpiProyeccion');
  const tablaEl = document.getElementById('proyeccionTabla');

  if (months.length < 2) {
    kpiEl.innerHTML = '<div class="empty-state">Necesitás al menos 2 meses de datos para proyectar.</div>';
    tablaEl.innerHTML = '';
    return;
  }

  // parte fija del gasto por mes (conceptos repetidos casi todos los meses)
  const fixedByMonth = {};
  detectFixed(FILTERED.gastos).forEach((f) => f.items.forEach((r) => {
    const m = r.fecha?.slice(0, 7);
    if (m) fixedByMonth[m] = (fixedByMonth[m] || 0) + r.monto;
  }));

  const exp = expectedInflation();
  const inp = document.getElementById('projInfl');
  if (inp && document.activeElement !== inp) inp.value = exp.source === 'manual' ? exp.value : '';
  if (inp) inp.placeholder = exp.source === 'manual' ? '' : exp.value.toFixed(1);
  const note = document.getElementById('projInflNote');
  if (note) note.textContent = `Inflación mensual esperada: ${exp.value.toFixed(1)}% (${exp.source}). Los montos proyectados están en pesos de cada mes.`;

  const HORIZON = 6;
  const p = projectScenarios({ months, monG, monI, fixedByMonth, inflOf: (m) => inflOf(m), expectedInfl: exp.value, horizon: HORIZON });
  const { base, pesimista, optimista } = p.scenarios;
  const projMonths = p.projMonths;
  const last = (arr) => arr[arr.length - 1];
  const sign = (v) => (v >= 0 ? '+' : '');
  const cls = (v) => (v >= 0 ? 'green' : 'red');

  kpiEl.innerHTML = `
    <div class="kpi blue"><div class="label">Ingreso base</div><div class="value">${fmt(p.levels.base.ing)}</div><div class="sub">mediana ${p.window} meses, pesos de hoy</div></div>
    <div class="kpi purple"><div class="label">Gastos fijos</div><div class="value">${fmt(p.fixedBase)}</div><div class="sub">por mes, pesos de hoy</div></div>
    <div class="kpi orange"><div class="label">Gastos variables</div><div class="value">${fmt(p.levels.base.variables)}</div><div class="sub">entre ${fmt(p.levels.optimista.variables)} y ${fmt(p.levels.pesimista.variables)}</div></div>
    <div class="kpi ${cls(last(base.acum))}"><div class="label">Neto ${HORIZON} meses (base)</div><div class="value">${sign(last(base.acum))}${fmt(last(base.acum))}</div><div class="sub">${last(base.acum) >= 0 ? 'superávit' : 'déficit'}</div></div>
    <div class="kpi ${cls(last(pesimista.acum))}"><div class="label">Escenario pesimista</div><div class="value">${sign(last(pesimista.acum))}${fmt(last(pesimista.acum))}</div><div class="sub">ingresos bajos, gastos altos</div></div>
    <div class="kpi ${cls(last(optimista.acum))}"><div class="label">Escenario optimista</div><div class="value">${sign(last(optimista.acum))}${fmt(last(optimista.acum))}</div><div class="sub">ingresos altos, gastos bajos</div></div>`;

  const nullH = months.map(() => null);
  const nullP = projMonths.map(() => null);
  const lastG = monG[months.at(-1)] || 0;
  const lastI = monI[months.at(-1)] || 0;
  const joint = (first, arr) => [...nullH.slice(0, -1), first, ...arr];
  const dot = (ctx) => (ctx.dataIndex >= months.length - 1 ? 3 : 0);

  mkChart('chartProyeccion', {
    type: 'bar',
    data: {
      labels: [...months.map(short), ...projMonths.map(short)],
      datasets: [
        { label: 'Ingresos reales', data: [...months.map((m) => monI[m] || 0), ...nullP], backgroundColor: A('pos', .2), borderColor: C.green, borderWidth: 1.5, borderRadius: 2, order: 2 },
        { label: 'Gastos reales', data: [...months.map((m) => monG[m] || 0), ...nullP], backgroundColor: A('neg', .2), borderColor: C.red, borderWidth: 1.5, borderRadius: 2, order: 2 },
        { label: 'Ingresos proy. (base)', data: joint(lastI, base.ing), type: 'line', borderColor: C.green, borderDash: [5, 4], borderWidth: 2, pointRadius: dot, pointBackgroundColor: C.green, backgroundColor: 'transparent', tension: 0.3, order: 1 },
        { label: 'Gastos proy. (base)', data: joint(lastG, base.gasto), type: 'line', borderColor: C.red, borderDash: [5, 4], borderWidth: 2, pointRadius: dot, pointBackgroundColor: C.red, backgroundColor: 'transparent', tension: 0.3, order: 1 },
        { label: 'De los cuales fijos', data: joint(null, base.fijos), type: 'line', borderColor: C.purple, borderDash: [2, 3], borderWidth: 1.5, pointRadius: 0, backgroundColor: 'transparent', tension: 0.3, order: 1 },
      ],
    },
    options: chartOpts({ legend: true }),
  });

  const line = (label, data, color, dash) => ({ label, data, borderColor: color, backgroundColor: 'transparent', borderWidth: 2, borderDash: dash, tension: 0.3, pointRadius: 3, pointBackgroundColor: color });
  mkChart('chartAcumuladoProy', {
    type: 'line',
    data: {
      labels: projMonths.map(short),
      datasets: [
        line('Optimista', optimista.acum, C.green, [4, 3]),
        { ...line('Base', base.acum, C.purple), backgroundColor: C.purpleSoftBg, fill: true },
        line('Pesimista', pesimista.acum, C.red, [4, 3]),
      ],
    },
    options: chartOpts({
      legend: true,
      tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${sign(c.raw)}${fmtFull(c.raw)}` } },
      y: axY((v) => sign(v) + fmt(v)),
    }),
  });

  const money = (v) => `<td style="text-align:right;color:${v >= 0 ? 'var(--green)' : 'var(--red)'}">${sign(v)}${fmtFull(v)}</td>`;
  tablaEl.innerHTML = `
    <table class="tbl">
      <thead><tr>
        <th>Mes</th>
        <th style="text-align:right">Ingresos</th>
        <th style="text-align:right">Fijos</th>
        <th style="text-align:right">Variables</th>
        <th style="text-align:right">Neto (base)</th>
        <th style="text-align:right">Acum. pesimista</th>
        <th style="text-align:right">Acum. base</th>
        <th style="text-align:right">Acum. optimista</th>
      </tr></thead>
      <tbody>
        ${projMonths.map((m, k) => `<tr>
            <td>${MONTH_FULL[+m.slice(5) - 1]} ${m.slice(0, 4)}</td>
            <td style="text-align:right;color:var(--green)">${fmtFull(base.ing[k])}</td>
            <td style="text-align:right">${fmtFull(base.fijos[k])}</td>
            <td style="text-align:right">${fmtFull(base.variables[k])}</td>
            ${money(base.neto[k])}${money(pesimista.acum[k])}${money(base.acum[k])}${money(optimista.acum[k])}
          </tr>`).join('')}
      </tbody>
    </table>`;
}

export function initProyeccionListeners() {
  document.getElementById('projInfl')?.addEventListener('change', (e) => {
    if (e.target.value === '') store.remove('projInfl'); else store.set('projInfl', Math.max(0, +e.target.value || 0));
    renderProyeccion();
  });
}
