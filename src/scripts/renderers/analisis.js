import { FILTERED, RAW, METRICS, EXCLUDED_ACCOUNTS, C, COLORS, A } from '../state.js';
import { fmt, fmtFull, esc, sum, avg, sortedEntries, mkChart, axX, axY, legendStyle, chartOpts, monthLabel } from '../helpers.js';
import { store } from '../storage.js';
import { matcher } from '../config.js';
import { INFL, inflOf, lastInflation } from '../externalData.js';

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const getManual = () => +store.get('inflacionManual', 0) || 0;

export function renderAnalisis() {
  const g = FILTERED.gastos, i = FILTERED.ingresos;
  const { months, monG, monI, tG, tI, byCatG } = METRICS;
  const kpi = document.getElementById('kpiAnalisis');
  if (months.length < 2) {
    kpi.innerHTML = '<div class="empty-state">Necesitás al menos 2 meses de datos para este análisis.</div>';
    return;
  }
  const isSave = matcher('ahorro');
  const gSave = g.filter((r) => isSave(r.cat));
  const monS = {};
  gSave.forEach((r) => { const m = r.fecha?.slice(0, 7); if (m) monS[m] = (monS[m] || 0) + r.monto; });
  const labels = months.map(monthLabel);

  // ── KPIs: ahorro real incluyendo lo que se destina a dólares/inversiones ──
  const tS = sum(gSave);
  const rawRate = tI ? (tI - tG) / tI * 100 : 0;
  const realRate = tI ? (tI - tG + tS) / tI * 100 : 0;
  const cons = g.length - gSave.length ? tG - tS : tG;

  // ── Inflación ──
  // mes a mes con datos reales; los meses sin publicar usan el valor manual o el último dato conocido
  const manual = getManual();
  const known = Object.keys(INFL.data).sort();
  const inflInput = document.getElementById('inflInput');
  if (inflInput && document.activeElement !== inflInput) inflInput.value = manual || '';
  const factors = months.map(() => 1);
  for (let k = months.length - 2; k >= 0; k--) factors[k] = factors[k + 1] * (1 + inflOf(months[k + 1], manual) / 100);
  const realG = months.map((m, k) => (monG[m] || 0) * factors[k]);
  const infl = INFL.state === 'ok' || manual ? (Math.pow(factors[0], 1 / Math.max(1, months.length - 1)) - 1) * 100 : 0;
  const stEl = document.getElementById('inflStatus');
  if (stEl) {
    const last = lastInflation();
    stEl.textContent = INFL.state === 'ok' && last ? `INDEC (argentinadatos.com) · último dato ${last.ym}: ${last.valor}%`
      : INFL.state === 'cargando' ? 'Cargando inflación…' : 'No se pudo consultar la API; usando el valor manual';
  }
  const half = Math.max(1, Math.floor(months.length / 2));
  const nomChange = (avg(months.slice(-half).map((m) => monG[m] || 0)) / (avg(months.slice(0, half).map((m) => monG[m] || 0)) || 1) - 1) * 100;
  const realChange = (avg(realG.slice(-half)) / (avg(realG.slice(0, half)) || 1) - 1) * 100;

  kpi.innerHTML = `
    <div class="kpi purple"><div class="label">Ahorro (contable)</div><div class="value">${Math.round(rawRate)}%</div><div class="sub">ingresos − gastos</div></div>
    <div class="kpi ${realRate >= 20 ? 'green' : realRate >= 10 ? 'yellow' : 'red'}"><div class="label">Ahorro real</div><div class="value">${Math.round(realRate)}%</div><div class="sub">incluye ${fmt(tS)} en ahorro/dólares</div></div>
    <div class="kpi blue"><div class="label">Consumo mensual</div><div class="value">${fmt(cons / months.length)}</div><div class="sub">sin ahorro ni inversión</div></div>
    <div class="kpi orange"><div class="label">Gasto: variación nominal</div><div class="value">${nomChange >= 0 ? '+' : ''}${nomChange.toFixed(0)}%</div><div class="sub">2ª mitad vs 1ª mitad</div></div>
    <div class="kpi ${realChange <= 0 ? 'green' : 'red'}"><div class="label">Gasto: variación real</div><div class="value">${realChange >= 0 ? '+' : ''}${realChange.toFixed(0)}%</div><div class="sub">${infl ? `inflación prom. ${infl.toFixed(1)}%/mes` : 'sin datos de inflación'}</div></div>
    <div class="kpi green"><div class="label">Ahorro acumulado</div><div class="value">${fmt(tI - tG + tS)}</div><div class="sub">neto + ahorro/dólares</div></div>`;

  // ── Tasa de ahorro contable vs real ──
  const rate = (m, withSave) => { const ing = monI[m] || 0; return ing ? Math.round(((ing - (monG[m] || 0) + (withSave ? monS[m] || 0 : 0)) / ing) * 100) : null; };
  mkChart('chartAhorroReal', {
    type: 'line',
    data: { labels, datasets: [
      { label: 'Contable', data: months.map((m) => rate(m, false)), borderColor: C.inkFaint, borderDash: [4, 4], borderWidth: 2, pointRadius: 0, tension: 0.25 },
      { label: 'Real (con ahorro/dólares)', data: months.map((m) => rate(m, true)), borderColor: C.green, backgroundColor: A('pos', .12), fill: true, borderWidth: 2, pointRadius: 0, tension: 0.25 }
    ] },
    options: chartOpts({ legend: true, tooltip: { callbacks: { label: (c) => c.dataset.label + ': ' + c.raw + '%' } }, y: axY((v) => v + '%') })
  });

  // ── Gasto nominal vs real ──
  mkChart('chartReal', {
    type: 'line',
    data: { labels, datasets: [
      { label: 'Nominal', data: months.map((m) => monG[m] || 0), borderColor: C.red, borderWidth: 2, pointRadius: 0, tension: 0.25 },
      { label: `Real (pesos de ${monthLabel(months.at(-1))})`, data: realG, borderColor: C.purple, backgroundColor: C.purpleSoftBg, fill: true, borderWidth: 2, pointRadius: 0, tension: 0.25 }
    ] },
    options: chartOpts({ legend: true })
  });

  // ── Año contra año ──
  const years = [...new Set(months.map((m) => m.slice(0, 4)))];
  mkChart('chartYoY', {
    type: 'line',
    data: { labels: MONTH_NAMES, datasets: years.map((y, k) => ({
      label: y, data: MONTH_NAMES.map((_, mi) => { const v = monG[`${y}-${String(mi + 1).padStart(2, '0')}`]; return v === undefined ? null : v; }),
      borderColor: COLORS[k % COLORS.length], backgroundColor: COLORS[k % COLORS.length], borderWidth: 2, pointRadius: 2, tension: 0.25, spanGaps: false
    })) },
    options: chartOpts({ legend: true })
  });

  // ── Pareto ──
  const cats = sortedEntries(byCatG);
  let acc = 0;
  const cum = cats.map(([, v]) => Math.round((acc += v) / (tG || 1) * 100));
  const n80 = cum.findIndex((v) => v >= 80) + 1;
  document.getElementById('paretoNote').textContent = cats.length
    ? `${n80} de ${cats.length} categorías concentran el 80% del gasto.` : '';
  mkChart('chartPareto', {
    type: 'bar',
    data: { labels: cats.map((c) => c[0]), datasets: [
      { label: 'Gasto', data: cats.map((c) => c[1]), backgroundColor: C.purpleSoftBg, borderColor: C.purple, borderWidth: 1, yAxisID: 'y' },
      { label: '% acumulado', type: 'line', data: cum, borderColor: C.red, backgroundColor: C.red, pointRadius: 2, tension: 0.2, yAxisID: 'y1' }
    ] },
    options: { responsive: true, plugins: { legend: legendStyle, tooltip: { callbacks: { label: (c) => (c.dataset.yAxisID === 'y1' ? c.raw + '%' : fmtFull(c.raw)) } } },
      scales: { x: axX, y: axY(), y1: { ...axY((v) => v + '%'), position: 'right', min: 0, max: 100, grid: { drawOnChartArea: false } } } }
  });

  // ── Gasto por cuenta (apilado) ──
  const accounts = [...new Set(g.map((r) => r.cuenta).filter(Boolean))].sort();
  const accMonth = {};
  g.forEach((r) => { const k = r.cuenta + '|' + r.fecha?.slice(0, 7); accMonth[k] = (accMonth[k] || 0) + r.monto; });
  mkChart('chartCuentaMes', {
    type: 'bar',
    data: { labels, datasets: accounts.map((a, k) => ({
      label: a, backgroundColor: COLORS[k % COLORS.length],
      data: months.map((m) => accMonth[a + '|' + m] || 0)
    })) },
    options: chartOpts({ legend: true, x: { ...axX, stacked: true }, y: { ...axY(), stacked: true } })
  });

  // ── Anomalías ──
  const mvals = months.map((m) => monG[m] || 0);
  const mean = avg(mvals);
  const sd = Math.sqrt(avg(mvals.map((v) => (v - mean) ** 2)));
  const hotMonths = months.filter((m) => sd && (monG[m] || 0) > mean + 1.2 * sd).sort((a, b) => monG[b] - monG[a]);
  const byCat = {};
  g.forEach((r) => (byCat[r.cat] = byCat[r.cat] || []).push(r.monto));
  const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] || 0; };
  // referencia: mismo concepto recurrente (cat + comentario) si hay ≥4 repeticiones; si no, la categoría completa
  const byConcept = {};
  g.forEach((r) => { const k = r.cat + '||' + String(r.comentario || '').toLowerCase(); (byConcept[k] = byConcept[k] || []).push(r.monto); });
  const refOf = (r) => {
    const c = byConcept[r.cat + '||' + String(r.comentario || '').toLowerCase()];
    return c.length >= 4 ? c : byCat[r.cat];
  };
  const outliers = g.filter((r) => { const a = refOf(r); return a.length >= 8 && r.monto > med(a) * 4 && r.monto > mean * 0.08; })
    .sort((a, b) => b.monto - a.monto).slice(0, 8);
  document.getElementById('anomaliasBox').innerHTML = `
    ${hotMonths.length ? hotMonths.map((m) => `<div class="insight i-warn"><div class="ico">📈</div><div class="body"><strong>${m}: gasto inusualmente alto</strong>${fmtFull(monG[m])} · ${(monG[m] / mean).toFixed(1)}× tu promedio mensual (${fmt(mean)}).</div></div>`).join('') : '<div class="insight i-tip"><div class="ico">✅</div><div class="body"><strong>Sin meses atípicos</strong>Tus gastos mensuales son consistentes.</div></div>'}
    ${outliers.length ? `<div class="receipt-list" style="margin-top:10px">${outliers.map((r) => `<div class="receipt-row"><span class="receipt-date">${r.fecha.slice(2)}</span><span class="receipt-name">${esc(r.comentario || r.cat)}</span><span class="receipt-meta">${esc(r.cat)} · ${(r.monto / med(refOf(r))).toFixed(0)}× lo habitual</span><span class="receipt-amt">${fmt(r.monto)}</span></div>`).join('')}</div>` : ''}`;

  // ── Flujo entre cuentas ──
  const dates = [...g, ...i].map((r) => r.fecha).filter(Boolean).sort();
  const [d0, d1] = [dates[0], dates.at(-1)];
  const tr = RAW.transferencias.filter((r) => r.fecha >= d0 && r.fecha <= d1 && !EXCLUDED_ACCOUNTS.has(r.cuentaOrigen) && !EXCLUDED_ACCOUNTS.has(r.cuentaDestino));
  const flows = {};
  tr.forEach((r) => { const k = r.cuentaOrigen + '→' + r.cuentaDestino; flows[k] = flows[k] || { o: r.cuentaOrigen, d: r.cuentaDestino, t: 0, n: 0 }; flows[k].t += r.monto; flows[k].n++; });
  const fl = Object.values(flows).sort((a, b) => b.t - a.t);
  document.getElementById('flujoCuentas').innerHTML = fl.length
    ? `<div class="receipt-list">${fl.map((f) => `<div class="receipt-row"><span class="receipt-name">${esc(f.o)} → ${esc(f.d)}</span><span class="receipt-meta">${f.n} mov. · prom. ${fmt(f.t / f.n)}</span><span class="receipt-amt">${fmt(f.t)}</span></div>`).join('')}</div>`
    : '<div class="empty-state">Sin transferencias en el período.</div>';
}

export function initAnalisisListeners() {
  document.getElementById('inflInput')?.addEventListener('change', (e) => {
    store.set('inflacionManual', Math.max(0, +e.target.value || 0));
    document.dispatchEvent(new CustomEvent('external-data'));
  });
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function exportCSV() {
  const rows = [['tipo', 'fecha', 'categoria', 'cuenta', 'monto', 'comentario']];
  FILTERED.gastos.forEach((r) => rows.push(['gasto', r.fecha, r.cat, r.cuenta, r.monto, r.comentario]));
  FILTERED.ingresos.forEach((r) => rows.push(['ingreso', r.fecha, r.cat, r.cuenta, r.monto, r.comentario]));
  const csv = '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'finanzas-filtrado.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}
