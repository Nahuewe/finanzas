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

let acumSel = null;

const MNAMES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function monthLabel(ym) {
  const [y, m] = ym.split('-');
  return `${MNAMES_FULL[parseInt(m, 10) - 1]} ${y}`;
}

function ymDays(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function renderAcumuladoMes(g) {
  const el = document.getElementById('acumuladoMesWrap');
  if (!el) return;

  const today = new Date();
  const curYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const prevDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevYM = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  const monthsSet = new Set(g.map((r) => r.fecha?.slice(0, 7)).filter(Boolean));
  monthsSet.add(curYM);
  monthsSet.add(prevYM);
  const monthsDesc = Array.from(monthsSet).sort().reverse();

  if (!acumSel) acumSel = { a: curYM, b: prevYM };

  function buildAccum(ym) {
    const days = ymDays(ym);
    const items = g.filter((r) => r.fecha?.startsWith(ym));
    const byDay = {};
    items.forEach((r) => {
      const day = parseInt(r.fecha?.slice(8) || '0', 10);
      if (day >= 1 && day <= days) byDay[day] = (byDay[day] || 0) + r.monto;
    });
    let cum = 0;
    const cumArr = [];
    const dayArr = [];
    for (let d = 1; d <= days; d++) {
      const spent = byDay[d] || 0;
      cum += spent;
      cumArr.push(cum);
      dayArr.push(spent);
    }
    const total = items.reduce((a, r) => a + r.monto, 0);
    return { cumArr, dayArr, total, days, items };
  }

  function buildOptions(selectedYm) {
    return monthsDesc.map((ym) => `<option value="${ym}" ${ym === selectedYm ? 'selected' : ''}>${monthLabel(ym)}</option>`).join('');
  }

  el.innerHTML = `
    <div class="acum-compare">
      <div class="acum-card acum-card-a">
        <div class="acum-card-tag">MES A</div>
        <div class="acum-card-control">
          <button type="button" class="acum-step" id="acumStepAPrev" aria-label="Mes anterior">‹</button>
          <div class="acum-card-select-wrap">
            <select class="acum-select" id="acumSelA">${buildOptions(acumSel.a)}</select>
          </div>
          <button type="button" class="acum-step" id="acumStepANext" aria-label="Mes siguiente">›</button>
        </div>
      </div>

      <div class="acum-divider">
        <span class="acum-divider-tick"></span>
        <span class="acum-divider-vs">VS</span>
        <span class="acum-divider-tick"></span>
      </div>

      <div class="acum-card acum-card-b">
        <div class="acum-card-tag">MES B</div>
        <div class="acum-card-control">
          <button type="button" class="acum-step" id="acumStepBPrev" aria-label="Mes anterior">‹</button>
          <div class="acum-card-select-wrap">
            <select class="acum-select" id="acumSelB">${buildOptions(acumSel.b)}</select>
          </div>
          <button type="button" class="acum-step" id="acumStepBNext" aria-label="Mes siguiente">›</button>
        </div>
      </div>
    </div>
    <div class="acum-kpis" id="acumKpis"></div>
    <canvas id="chartAcumuladoMes"></canvas>`;

  const selA = document.getElementById('acumSelA');
  const selB = document.getElementById('acumSelB');

  selA.addEventListener('change', (e) => {
    acumSel.a = e.target.value;
    drawAcumChart();
  });
  selB.addEventListener('change', (e) => {
    acumSel.b = e.target.value;
    drawAcumChart();
  });

  function step(side, dir) {
    const sel = side === 'a' ? selA : selB;
    const idx = monthsDesc.indexOf(acumSel[side]);
    const newIdx = idx - dir;
    if (newIdx < 0 || newIdx >= monthsDesc.length) return;
    acumSel[side] = monthsDesc[newIdx];
    sel.value = acumSel[side];
    drawAcumChart();
  }

  document.getElementById('acumStepAPrev').addEventListener('click', () => step('a', -1));
  document.getElementById('acumStepANext').addEventListener('click', () => step('a', 1));
  document.getElementById('acumStepBPrev').addEventListener('click', () => step('b', -1));
  document.getElementById('acumStepBNext').addEventListener('click', () => step('b', 1));

  drawAcumChart();

  function drawAcumChart() {
    const a = buildAccum(acumSel.a);
    const b = buildAccum(acumSel.b);
    const isCurrentA = acumSel.a === curYM;
    const todayDay = today.getDate();
    const maxDays = Math.max(a.days, b.days);

    const idxA = monthsDesc.indexOf(acumSel.a);
    const idxB = monthsDesc.indexOf(acumSel.b);
    document.getElementById('acumStepAPrev').disabled = idxA >= monthsDesc.length - 1;
    document.getElementById('acumStepANext').disabled = idxA <= 0;
    document.getElementById('acumStepBPrev').disabled = idxB >= monthsDesc.length - 1;
    document.getElementById('acumStepBNext').disabled = idxB <= 0;

    const dataA = Array.from({ length: maxDays }, (_, i) => (i < a.days && (!isCurrentA || i + 1 <= todayDay) ? a.cumArr[i] : null));
    const dataB = Array.from({ length: maxDays }, (_, i) => (i < b.days ? b.cumArr[i] : null));
    const dayDataA = Array.from({ length: maxDays }, (_, i) => (i < a.days ? a.dayArr[i] : null));
    const dayDataB = Array.from({ length: maxDays }, (_, i) => (i < b.days ? b.dayArr[i] : null));

    const diffPct = b.total > 0 ? (((a.total - b.total) / b.total) * 100).toFixed(0) : null;

    const kpisEl = document.getElementById('acumKpis');
    if (!a.items.length && !b.items.length) {
      kpisEl.innerHTML = '<div class="empty-state">Sin datos para los meses seleccionados.</div>';
    } else {
      kpisEl.innerHTML = `
        <div class="acum-kpi">
          <span class="acum-kpi-label">${monthLabel(acumSel.a)}${isCurrentA ? ' (hasta hoy)' : ''}</span>
          <span class="acum-kpi-val" style="color:var(--red)">${fmtFull(a.total)}</span>
        </div>
        <div class="acum-kpi">
          <span class="acum-kpi-label">${monthLabel(acumSel.b)}</span>
          <span class="acum-kpi-val" style="color:var(--color-ink-dim)">${fmtFull(b.total)}</span>
        </div>
        ${diffPct !== null ? `<div class="acum-kpi">
          <span class="acum-kpi-label">Diferencia</span>
          <span class="acum-kpi-val" style="color:${+diffPct >= 0 ? 'var(--red)' : 'var(--green)'}">${+diffPct >= 0 ? '+' : ''}${diffPct}%</span>
        </div>` : ''}`;
    }

    mkChart('chartAcumuladoMes', {
      type: 'line',
      data: {
        labels: Array.from({ length: maxDays }, (_, i) => String(i + 1)),
        datasets: [
          {
            label: monthLabel(acumSel.a),
            data: dataA,
            dayAmounts: dayDataA,
            borderColor: C.red,
            backgroundColor: 'rgba(251,113,133,.08)',
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 4,
            spanGaps: false,
          },
          {
            label: monthLabel(acumSel.b),
            data: dataB,
            dayAmounts: dayDataB,
            borderColor: C.inkFaint,
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderDash: [4, 3],
            fill: false,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 4,
            spanGaps: false,
          },
        ],
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, labels: { color: '#b6abd6', font: { size: 10, family: 'JetBrains Mono' }, boxWidth: 10, padding: 8 } },
          tooltip: {
            callbacks: {
              title: (items) => `Día ${items[0].label}`,
              label: (ctx) => {
                const dayAmounts = ctx.dataset.dayAmounts;
                const gastoDelDia = dayAmounts ? dayAmounts[ctx.dataIndex] : null;
                if (ctx.raw === null || gastoDelDia === null) return `${ctx.dataset.label}: sin datos`;
                return `${ctx.dataset.label} — acumulado: ${fmtFull(ctx.raw)} · ese día: ${fmtFull(gastoDelDia)}`;
              },
            },
          },
        },
        scales: {
          x: { ticks: { color: '#8d7fb5', font: { size: 9, family: 'JetBrains Mono' } }, grid: { color: '#251d40' } },
          y: { ticks: { color: '#8d7fb5', callback: (v) => fmt(v), font: { size: 9, family: 'JetBrains Mono' } }, grid: { color: '#251d40' } },
        },
      },
    });
  }
}
