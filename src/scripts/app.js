// ══════════════════════════════════════════
// MIS FINANZAS — app logic
// Usa los globals `XLSX` y `Chart` cargados por <script src="cdn..."> antes de este archivo.
// ══════════════════════════════════════════

// ---- paleta centralizada (sincronizada con global.css) ----
const C = {
  ink: '#f1edfb',
  inkDim: '#b6abd6',
  inkFaint: '#8d7fb5',
  grid: '#251d40',
  bg: '#0f0a1a',
  purple: '#a78bfa',
  purpleSoftBg: 'rgba(167,139,250,.12)',
  green: '#4ade80',
  greenSoftBg: 'rgba(74,222,128,',
  red: '#fb7185',
  redSoftBg: 'rgba(251,113,133,',
};

const COLORS = ['#a78bfa', '#c084fc', '#8b5cf6', '#fb7185', '#818cf8', '#fbbf24', '#ddd6fe', '#f472b6', '#60a5fa', '#4ade80', '#fb923c', '#e879f9'];

// ---- demo data (mismo formato que se espera del Excel) ----
const DEMO_DATA = {
  gastos: [
    {fecha:'2023-11-03',cat:'Chatarra',cuenta:'Personal Pay',monto:4200,comentario:'Kiosko'},
    {fecha:'2023-11-10',cat:'Alimentación',cuenta:'Naranja X',monto:8500,comentario:'Morfi'},
    {fecha:'2023-11-15',cat:'Transporte',cuenta:'Personal Pay',monto:3200,comentario:'SUBE'},
    {fecha:'2023-11-20',cat:'Suscripciones',cuenta:'Naranja X',monto:38000,comentario:'YouTube Premium'},
    {fecha:'2023-11-25',cat:'Chatarra',cuenta:'Personal Pay',monto:3800,comentario:'Kiosko'},
    {fecha:'2023-12-05',cat:'Salud',cuenta:'Naranja X',monto:45000,comentario:'Médico'},
    {fecha:'2023-12-10',cat:'Regalos',cuenta:'Naranja X',monto:35000,comentario:'Regalo navidad'},
    {fecha:'2023-12-15',cat:'Suscripciones',cuenta:'Naranja X',monto:12000,comentario:'Spotify'},
    {fecha:'2023-12-20',cat:'Alimentación',cuenta:'Personal Pay',monto:22000,comentario:'Sushi'},
    {fecha:'2024-01-08',cat:'Chatarra',cuenta:'Personal Pay',monto:5100,comentario:'Kiosko'},
    {fecha:'2024-01-12',cat:'Ocio',cuenta:'Naranja X',monto:80000,comentario:'Entradas recital'},
    {fecha:'2024-01-18',cat:'Alimentación',cuenta:'Personal Pay',monto:15000,comentario:'Delivery'},
    {fecha:'2024-01-25',cat:'Suscripciones',cuenta:'Naranja X',monto:38000,comentario:'YouTube Premium'},
    {fecha:'2024-02-05',cat:'Casa',cuenta:'Naranja X',monto:55000,comentario:'Monotributo'},
    {fecha:'2024-02-14',cat:'Regalos',cuenta:'Personal Pay',monto:42000,comentario:'San Valentín'},
    {fecha:'2024-02-20',cat:'Chatarra',cuenta:'Personal Pay',monto:4600,comentario:'Kiosko YPF'},
    {fecha:'2024-03-10',cat:'Salud',cuenta:'Naranja X',monto:65000,comentario:'Dentista'},
    {fecha:'2024-03-15',cat:'Alimentación',cuenta:'Personal Pay',monto:18000,comentario:'Morfi'},
    {fecha:'2024-04-08',cat:'Jueguitos',cuenta:'Naranja X',monto:25000,comentario:'Steam'},
    {fecha:'2024-04-20',cat:'Suscripciones',cuenta:'Naranja X',monto:38000,comentario:'YouTube Premium'},
    {fecha:'2024-05-12',cat:'Ocio',cuenta:'Naranja X',monto:120000,comentario:'FanGamer'},
    {fecha:'2024-06-15',cat:'Casa',cuenta:'Naranja X',monto:85000,comentario:'Plomero'},
    {fecha:'2024-07-10',cat:'Alimentación',cuenta:'Personal Pay',monto:32000,comentario:'Sushi'},
    {fecha:'2024-08-20',cat:'Ocio',cuenta:'Naranja X',monto:200000,comentario:'Samsung Watch'},
    {fecha:'2024-09-05',cat:'Regalos',cuenta:'Naranja X',monto:500000,comentario:'Parte abuela'},
    {fecha:'2024-10-12',cat:'Chatarra',cuenta:'Personal Pay',monto:6200,comentario:'Kiosko'},
    {fecha:'2024-11-18',cat:'Suscripciones',cuenta:'Naranja X',monto:85000,comentario:'Discord Nitro'},
    {fecha:'2024-12-24',cat:'Regalos',cuenta:'Personal Pay',monto:80000,comentario:'Navidad'},
    {fecha:'2025-01-15',cat:'Jueguitos',cuenta:'Naranja X',monto:45000,comentario:'Fortnite'},
    {fecha:'2025-02-10',cat:'Vacaciones',cuenta:'Naranja X',monto:1200000,comentario:'Vuelo Paraguay'},
    {fecha:'2025-03-20',cat:'Chatarra',cuenta:'Personal Pay',monto:7500,comentario:'Kiosko'},
    {fecha:'2025-04-08',cat:'Alimentación',cuenta:'Personal Pay',monto:38000,comentario:'Morfi'},
    {fecha:'2025-05-15',cat:'Suscripciones',cuenta:'Naranja X',monto:45000,comentario:'Prime Video'},
    {fecha:'2025-06-10',cat:'Ocio',cuenta:'Naranja X',monto:370000,comentario:'FanGamer peluches'},
    {fecha:'2025-07-22',cat:'Casa',cuenta:'Naranja X',monto:95000,comentario:'Reparaciones'},
    {fecha:'2025-08-14',cat:'Salud',cuenta:'Naranja X',monto:120000,comentario:'Oftalmólogo'},
    {fecha:'2025-09-05',cat:'Chatarra',cuenta:'Personal Pay',monto:8100,comentario:'Kiosko'},
    {fecha:'2025-10-18',cat:'Regalos',cuenta:'Personal Pay',monto:500000,comentario:'Día madre'},
    {fecha:'2025-11-12',cat:'Jueguitos',cuenta:'Naranja X',monto:35000,comentario:'Marvel Rivals'},
    {fecha:'2025-12-03',cat:'Vacaciones',cuenta:'Naranja X',monto:1162791,comentario:'Pasaje Punta Cana'},
    {fecha:'2025-12-22',cat:'Vacaciones',cuenta:'Naranja X',monto:350000,comentario:'Valija extra'},
    {fecha:'2026-01-06',cat:'Vacaciones',cuenta:'Naranja X',monto:1997063,comentario:'Gastos Punta Cana'},
    {fecha:'2026-02-18',cat:'Dolares',cuenta:'Banco Nacion',monto:287589,comentario:'198 USD MEP'},
    {fecha:'2026-03-10',cat:'Alimentación',cuenta:'Personal Pay',monto:45000,comentario:'Sushi'},
    {fecha:'2026-04-15',cat:'Chatarra',cuenta:'Personal Pay',monto:9200,comentario:'Kiosko'},
    {fecha:'2026-05-06',cat:'Jueguitos',cuenta:'Naranja X',monto:10000,comentario:'Neverness to Everness'},
  ],
  ingresos: [
    {fecha:'2023-11-30',cat:'Salario',cuenta:'Banco Nacion',monto:46000,comentario:'Sueldo Nov'},
    {fecha:'2023-12-31',cat:'Salario',cuenta:'Banco Nacion',monto:284500,comentario:'Sueldo Dic'},
    {fecha:'2024-01-31',cat:'Salario',cuenta:'Banco Nacion',monto:350000,comentario:'Sueldo Ene'},
    {fecha:'2024-05-14',cat:'Freelance',cuenta:'Personal Pay',monto:350000,comentario:'Pago SUTEPA'},
    {fecha:'2024-06-28',cat:'Freelance',cuenta:'Personal Pay',monto:250000,comentario:'SUTEPA final'},
    {fecha:'2024-07-31',cat:'Salario',cuenta:'Banco Nacion',monto:600000,comentario:'Sueldo Jul'},
    {fecha:'2024-08-15',cat:'Freelance',cuenta:'Personal Pay',monto:400000,comentario:'Mantenimiento SUTEPA'},
    {fecha:'2024-08-20',cat:'Ventas',cuenta:'Banco Nacion',monto:12500000,comentario:'Venta camioneta'},
    {fecha:'2024-09-30',cat:'Salario',cuenta:'Banco Nacion',monto:700000,comentario:'Sueldo Sep'},
    {fecha:'2024-12-31',cat:'Salario',cuenta:'Banco Nacion',monto:1032053,comentario:'Sueldo Dic'},
    {fecha:'2025-01-31',cat:'Salario',cuenta:'Banco Nacion',monto:962053,comentario:'Sueldo Ene'},
    {fecha:'2025-01-13',cat:'Freelance',cuenta:'Personal Pay',monto:700000,comentario:'Refact SUTEPA 1/2'},
    {fecha:'2025-02-10',cat:'Freelance',cuenta:'Personal Pay',monto:700000,comentario:'Refact SUTEPA 2/2'},
    {fecha:'2025-02-28',cat:'Salario',cuenta:'Banco Nacion',monto:934053,comentario:'Sueldo Feb'},
    {fecha:'2025-04-30',cat:'Salario',cuenta:'Banco Nacion',monto:3194462,comentario:'Sueldo Abril (ajuste)'},
    {fecha:'2025-06-30',cat:'Salario',cuenta:'Banco Nacion',monto:1677231,comentario:'Sueldo Jun'},
    {fecha:'2025-07-30',cat:'Freelance',cuenta:'Personal Pay',monto:1000000,comentario:'Sistema votaciones 1/2'},
    {fecha:'2025-07-31',cat:'Salario',cuenta:'Banco Nacion',monto:1597231,comentario:'Sueldo Jul'},
    {fecha:'2025-09-10',cat:'Freelance',cuenta:'Personal Pay',monto:1000000,comentario:'Sistema votaciones 2/2'},
    {fecha:'2025-10-31',cat:'Salario',cuenta:'Banco Nacion',monto:1224544,comentario:'Sueldo Oct'},
    {fecha:'2025-11-04',cat:'Freelance',cuenta:'Personal Pay',monto:250000,comentario:'Seccionales 1/2'},
    {fecha:'2025-12-01',cat:'Freelance',cuenta:'Personal Pay',monto:250000,comentario:'Seccionales 2/2'},
    {fecha:'2025-12-31',cat:'Salario',cuenta:'Banco Nacion',monto:1304544,comentario:'Sueldo Dic'},
    {fecha:'2026-01-31',cat:'Salario',cuenta:'Banco Nacion',monto:1224544,comentario:'Sueldo Ene'},
    {fecha:'2026-02-28',cat:'Salario',cuenta:'Banco Nacion',monto:1224549,comentario:'Sueldo Feb'},
    {fecha:'2026-03-31',cat:'Salario',cuenta:'Banco Nacion',monto:1274677,comentario:'Sueldo Mar'},
    {fecha:'2026-04-30',cat:'Salario',cuenta:'Banco Nacion',monto:2632770,comentario:'Sueldo Abr'},
  ],
  transferencias: []
};

// ══════════════════════════════════════════
// STATE
// ══════════════════════════════════════════
let RAW = { gastos: [], ingresos: [], transferencias: [] };
let FILTERED = { gastos: [], ingresos: [] };
let FILTERS = { year: 'all', month: 'all', period: 'all', account: 'all', category: 'all', minAmount: 0 };
let CHARTS = {};
let CAT_SEARCH = '';
const OPEN_CATS = new Set();
const SKIP_CATS = new Set(['']);
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// ══════════════════════════════════════════
// UPLOAD
// ══════════════════════════════════════════
function showLoading(v) { document.getElementById('loadingOverlay').classList.toggle('show', v); }

function formatDate(v) {
  if (!v) return '';
  if (typeof v === 'number') {
    const d = new Date((v - 25569) * 86400000);
    return d.toISOString().split('T')[0];
  }
  return String(v).split(' ')[0];
}

function processFile(file) {
  showLoading(true);
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const parsed = {};
      wb.SheetNames.forEach((name) => {
        const ws = wb.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (rows.length < 2) return;
        const header = rows[1];
        parsed[name] = rows.slice(2).map((r) => {
          const o = {};
          header.forEach((h, i) => (o[h] = r[i]));
          return o;
        });
      });

      RAW.gastos = (parsed['Gastos'] || []).map((r) => ({
        fecha: formatDate(r['Fecha y hora']),
        cat: r['Categoría'] || '',
        cuenta: r['Cuenta'] || '',
        monto: +r['Cantidad en la divisa predeterminada'] || 0,
        comentario: r['Comentario'] || ''
      })).filter((r) => r.monto > 0);

      RAW.ingresos = (parsed['Ingresos'] || []).map((r) => ({
        fecha: formatDate(r['Fecha y hora']),
        cat: r['Categoría'] || '',
        cuenta: r['Cuenta'] || '',
        monto: +r['Cantidad en la divisa predeterminada'] || 0,
        comentario: r['Comentario'] || ''
      })).filter((r) => r.monto > 0);

      RAW.transferencias = parsed['Transferencias'] || [];
      initApp();
    } catch (err) {
      alert('Error al leer el archivo. Asegurate que tenga el formato correcto (hojas Gastos / Ingresos / Transferencias).');
      console.error(err);
    }
    showLoading(false);
  };
  reader.readAsArrayBuffer(file);
}

// ══════════════════════════════════════════
// INIT
// ══════════════════════════════════════════
function initApp() {
  showLoading(false);
  document.getElementById('uploadScreen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  buildFilterOptions();
  applyFilters();
}

function buildFilterOptions() {
  const years = [...new Set(RAW.gastos.concat(RAW.ingresos).map((r) => r.fecha?.split('-')[0]).filter(Boolean))].sort();
  const sel = document.getElementById('filterYear');
  sel.innerHTML = '<option value="all">Todos</option>';
  years.forEach((y) => sel.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`));

  const accounts = [...new Set(RAW.gastos.concat(RAW.ingresos).map((r) => r.cuenta).filter(Boolean))].sort();
  const acSel = document.getElementById('filterAccount');
  acSel.innerHTML = '<option value="all">Todas</option>';
  accounts.forEach((a) => acSel.insertAdjacentHTML('beforeend', `<option value="${a}">${a}</option>`));

  const cats = [...new Set(RAW.gastos.filter((r) => !SKIP_CATS.has(r.cat)).map((r) => r.cat).filter(Boolean))].sort();
  const catSel = document.getElementById('filterCategory');
  catSel.innerHTML = '<option value="all">Todas</option>';
  cats.forEach((c) => catSel.insertAdjacentHTML('beforeend', `<option value="${c}">${c}</option>`));

  buildMonthOptions();
}

function buildMonthOptions() {
  let months = [...new Set(RAW.gastos.concat(RAW.ingresos).map((r) => r.fecha?.slice(0, 7)).filter(Boolean))].sort();
  if (FILTERS.year !== 'all') months = months.filter((m) => m.startsWith(FILTERS.year));
  const sel = document.getElementById('filterMonth');
  sel.innerHTML = '<option value="all">Todos</option>';
  months.forEach((m) => sel.insertAdjacentHTML('beforeend', `<option value="${m}">${m}</option>`));
}

// ══════════════════════════════════════════
// FILTERS
// ══════════════════════════════════════════
function applyFilters() {
  let gasto = RAW.gastos.filter((r) => !SKIP_CATS.has(r.cat));
  let ingreso = [...RAW.ingresos];

  if (FILTERS.year !== 'all') {
    gasto = gasto.filter((r) => r.fecha?.startsWith(FILTERS.year));
    ingreso = ingreso.filter((r) => r.fecha?.startsWith(FILTERS.year));
  }

  if (FILTERS.month !== 'all') {
    gasto = gasto.filter((r) => r.fecha?.startsWith(FILTERS.month));
    ingreso = ingreso.filter((r) => r.fecha?.startsWith(FILTERS.month));
  } else if (FILTERS.period !== 'all') {
    const months = +FILTERS.period;
    const allDates = [...gasto, ...ingreso].map((r) => r.fecha).filter(Boolean).sort();
    const maxDate = allDates[allDates.length - 1] || new Date().toISOString().split('T')[0];
    const d = new Date(maxDate);
    d.setMonth(d.getMonth() - months);
    const cutoff = d.toISOString().split('T')[0];
    gasto = gasto.filter((r) => r.fecha >= cutoff);
    ingreso = ingreso.filter((r) => r.fecha >= cutoff);
  }

  if (FILTERS.account !== 'all') {
    gasto = gasto.filter((r) => r.cuenta === FILTERS.account);
    ingreso = ingreso.filter((r) => r.cuenta === FILTERS.account);
  }

  if (FILTERS.category !== 'all') {
    gasto = gasto.filter((r) => r.cat === FILTERS.category);
  }

  if (FILTERS.minAmount > 0) {
    gasto = gasto.filter((r) => r.monto >= FILTERS.minAmount);
  }

  FILTERED.gastos = gasto;
  FILTERED.ingresos = ingreso;

  const all = [...gasto, ...ingreso].map((r) => r.fecha).filter(Boolean).sort();
  document.getElementById('dateRangeLabel').textContent = all.length ? `${all[0]} → ${all[all.length - 1]}` : 'sin resultados';

  OPEN_CATS.clear();
  renderAll();
}

function resetFilters() {
  FILTERS = { year: 'all', month: 'all', period: 'all', account: 'all', category: 'all', minAmount: 0 };
  document.getElementById('filterYear').value = 'all';
  document.getElementById('filterAccount').value = 'all';
  document.getElementById('filterCategory').value = 'all';
  document.getElementById('filterMinAmount').value = '';
  document.querySelectorAll('[data-period]').forEach((b) => b.classList.toggle('active', b.dataset.period === 'all'));
  buildMonthOptions();
  document.getElementById('filterMonth').value = 'all';
  applyFilters();
}

// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════
const fmt = (n) => (Math.abs(n) >= 1e6 ? (n < 0 ? '-' : '') + '$' + (Math.abs(n) / 1e6).toFixed(1) + 'M' : Math.abs(n) >= 1e3 ? (n < 0 ? '-' : '') + '$' + (Math.abs(n) / 1e3).toFixed(0) + 'K' : '$' + Math.round(n).toLocaleString('es-AR'));
const fmtFull = (n) => '$' + Math.round(n).toLocaleString('es-AR');
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-');

function groupBy(arr, key) {
  return arr.reduce((a, r) => { const k = r[key] || ''; a[k] = (a[k] || 0) + r.monto; return a; }, {});
}
function groupByMon(arr) {
  return arr.reduce((a, r) => { const k = r.fecha?.slice(0, 7); if (k) a[k] = (a[k] || 0) + r.monto; return a; }, {});
}
function sortedEntries(obj) { return Object.entries(obj).sort((a, b) => b[1] - a[1]); }
function allMonths(g, i) {
  return [...new Set([...Object.keys(groupByMon(g)), ...Object.keys(groupByMon(i))])].sort();
}
function destroyChart(id) { if (CHARTS[id]) { CHARTS[id].destroy(); delete CHARTS[id]; } }
function mkChart(id, config) {
  destroyChart(id);
  const ctx = document.getElementById(id);
  if (!ctx) return;
  CHARTS[id] = new Chart(ctx, config);
}

const axX = { ticks: { color: C.inkFaint, font: { size: 9, family: 'JetBrains Mono' }, maxRotation: 45 }, grid: { color: C.grid } };
const axY = (cb) => ({ ticks: { color: C.inkFaint, callback: cb || ((v) => fmt(v)), font: { size: 9, family: 'JetBrains Mono' } }, grid: { color: C.grid } });
const tooltipARS = { callbacks: { label: (ctx) => fmtFull(ctx.raw) } };
const legendStyle = { labels: { color: C.inkDim, font: { size: 10, family: 'JetBrains Mono' }, boxWidth: 10, padding: 8 } };

// ══════════════════════════════════════════
// RENDER ALL
// ══════════════════════════════════════════
function renderAll() {
  renderResumen();
  renderGastos();
  renderIngresos();
  renderFlujo();
  renderAhorros();
}

// ── RESUMEN ──
function renderResumen() {
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
  mkChart('chartResumen', { type: 'bar', data: { labels: months.map((m) => m.slice(5) + '/' + m.slice(2, 4)), datasets: [
    { label: 'Ingresos', data: months.map((m) => monI[m] || 0), backgroundColor: C.greenSoftBg + '.25)', borderColor: C.green, borderWidth: 1.5, borderRadius: 2 },
    { label: 'Gastos', data: months.map((m) => monG[m] || 0), backgroundColor: C.redSoftBg + '.25)', borderColor: C.red, borderWidth: 1.5, borderRadius: 2 }
  ] }, options: { responsive: true, plugins: { legend: { display: true, labels: legendStyle.labels }, tooltip: tooltipARS }, scales: { x: axX, y: axY() } } });

  const ingCats = sortedEntries(groupBy(i, 'cat')).slice(0, 7);
  const gasCats = sortedEntries(groupBy(g, 'cat')).slice(0, 8);
  mkChart('chartIngDonut', { type: 'doughnut', data: { labels: ingCats.map((e) => e[0]), datasets: [{ data: ingCats.map((e) => e[1]), backgroundColor: COLORS, borderWidth: 2, borderColor: C.bg }] }, options: { responsive: true, cutout: '62%', plugins: { legend: { position: 'bottom', labels: legendStyle.labels }, tooltip: tooltipARS } } });
  mkChart('chartGasDonut', { type: 'doughnut', data: { labels: gasCats.map((e) => e[0]), datasets: [{ data: gasCats.map((e) => e[1]), backgroundColor: COLORS, borderWidth: 2, borderColor: C.bg }] }, options: { responsive: true, cutout: '62%', plugins: { legend: { position: 'bottom', labels: legendStyle.labels }, tooltip: tooltipARS } } });

  const hm = document.getElementById('heatmap');
  hm.innerHTML = '';
  const netMap = {};
  months.forEach((m) => (netMap[m] = (monI[m] || 0) - (monG[m] || 0)));
  const maxAbs = Math.max(...Object.values(netMap).map(Math.abs), 1);
  months.forEach((m) => {
    const v = netMap[m];
    const intensity = Math.min(Math.abs(v) / maxAbs, 1);
    const bg = v >= 0 ? `${C.greenSoftBg}${0.12 + intensity * .45})` : `${C.redSoftBg}${0.12 + intensity * .45})`;
    const label = m.slice(5) + '/' + m.slice(2, 4);
    hm.insertAdjacentHTML('beforeend', `<div class="hm-cell" style="background:${bg}" title="${m}: ${v >= 0 ? '+' : ''}${fmtFull(v)}"><div class="hm-m">${label}</div><div class="hm-v" style="color:${v >= 0 ? C.green : C.red}">${v >= 0 ? '+' : '-'}${fmt(Math.abs(v))}</div></div>`);
  });
}

// ── GASTOS ──
function renderGastos() {
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
  mkChart('chartGasMensual', { type: 'line', data: { labels: months.map((m) => m.slice(5) + '/' + m.slice(2, 4)), datasets: [{ data: months.map((m) => monG[m] || 0), borderColor: C.red, backgroundColor: C.redSoftBg + '.08)', tension: .35, fill: true, pointRadius: 3, pointBackgroundColor: C.red }] }, options: { responsive: true, plugins: { legend: { display: false }, tooltip: tooltipARS }, scales: { x: axX, y: axY() } } });

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
  const curCats = groupBy(g.filter((r) => r.fecha.startsWith(curM)), 'cat');
  const prevCats = groupBy(g.filter((r) => r.fecha.startsWith(prevM)), 'cat');
  const allCats = new Set([...Object.keys(curCats), ...Object.keys(prevCats)]);
  const deltas = [...allCats].map((cat) => ({ cat, delta: (curCats[cat] || 0) - (prevCats[cat] || 0) }))
    .filter((d) => Math.abs(d.delta) > 1000)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 6);

  if (!deltas.length) {
    el.innerHTML = '<div class="mom-empty">Sin cambios significativos entre meses.</div>';
    return;
  }
  el.innerHTML = `<div style="width:100%;font-family:var(--mono);font-size:.7rem;color:var(--ink-faint);margin-bottom:8px">${prevM} → ${curM}</div>` + deltas.map((d) => {
    const up = d.delta > 0;
    return `<div class="mom-chip ${up ? 'up' : 'down'}"><span class="arrow">${up ? '▲' : '▼'}</span><span class="cat">${d.cat}</span><span class="delta">${up ? '+' : ''}${fmt(d.delta)}</span></div>`;
  }).join('');
}

function renderCatAccordion(g, bycat, tG, months) {
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

function toggleAccordion(cat) {
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
  items.forEach((r) => { const k = r.comentario || '—'; if (!subMap[k]) subMap[k] = { t: 0, c: 0 }; subMap[k].t += r.monto; subMap[k].c++; });
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
      ${restCount > 0 ? `<div class="receipt-row"><div class="receipt-name" style="color:var(--ink-faint)">+ ${restCount} más</div></div>` : ''}
    </div>`;

  const monThis = groupByMon(items);
  mkChart(sparkId, { type: 'line', data: { labels: months, datasets: [{ data: months.map((m) => monThis[m] || 0), borderColor: C.purple, backgroundColor: C.purpleSoftBg, tension: .35, fill: true, pointRadius: 0, borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: tooltipARS }, scales: { x: { display: false }, y: { display: false } } } });
}

function renderSubsList(g) {
  const subs = g.filter((r) => r.cat === 'Suscripciones');
  const subMap = {};
  subs.forEach((r) => { const k = r.comentario || r.cat; if (!subMap[k]) subMap[k] = { total: 0, cnt: 0 }; subMap[k].total += r.monto; subMap[k].cnt++; });
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

// ── INGRESOS ──
function renderIngresos() {
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
  mkChart('chartIngMensual', { type: 'bar', data: { labels: months.map((m) => m.slice(5) + '/' + m.slice(2, 4)), datasets: [{ data: months.map((m) => monI[m] || 0), backgroundColor: months.map((m) => (monI[m] || 0) > 2000000 ? C.greenSoftBg + '.7)' : C.greenSoftBg + '.3)'), borderColor: C.green, borderWidth: 1, borderRadius: 3 }] }, options: { responsive: true, plugins: { legend: { display: false }, tooltip: tooltipARS }, scales: { x: axX, y: axY() } } });

  const barEl = document.getElementById('ingBarras');
  barEl.innerHTML = '';
  const maxV = bycat[0]?.[1] || 1;
  bycat.forEach(([cat, v], ci) => {
    const pct = (v / tI * 100).toFixed(1);
    const fill = (v / maxV * 100).toFixed(0);
    barEl.insertAdjacentHTML('beforeend', `<div class="bar-row"><div class="name">${cat}</div><div class="track"><div class="fill" style="width:${fill}%;background:${COLORS[ci % COLORS.length]}">${fmt(v)}</div></div><div class="pct">${pct}%</div></div>`);
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

// ── FLUJO ──
function renderFlujo() {
  const g = FILTERED.gastos, i = FILTERED.ingresos;
  const months = allMonths(g, i);
  const monG = groupByMon(g), monI = groupByMon(i);
  const netos = months.map((m) => (monI[m] || 0) - (monG[m] || 0));
  const positivos = netos.filter((v) => v >= 0).length;
  const negativos = netos.filter((v) => v < 0).length;
  const best = months.length ? Math.max(...netos) : 0, worst = months.length ? Math.min(...netos) : 0;
  const bestM = months[netos.indexOf(best)], worstM = months[netos.indexOf(worst)];
  const tG = g.reduce((a, r) => a + r.monto, 0), tI = i.reduce((a, r) => a + r.monto, 0);

  document.getElementById('kpiFlujo').innerHTML = `
    <div class="kpi green"><div class="label">Meses Positivos</div><div class="value">${positivos}</div><div class="sub">de ${months.length}</div></div>
    <div class="kpi red"><div class="label">Meses Negativos</div><div class="value">${negativos}</div><div class="sub">de ${months.length}</div></div>
    <div class="kpi green"><div class="label">Mejor Mes</div><div class="value">${fmt(best)}</div><div class="sub">${bestM || '—'}</div></div>
    <div class="kpi red"><div class="label">Peor Mes</div><div class="value">${fmt(worst)}</div><div class="sub">${worstM || '—'}</div></div>
    <div class="kpi blue"><div class="label">Prom. Ingreso</div><div class="value">${fmt(months.length ? tI / months.length : 0)}</div><div class="sub">/mes</div></div>
    <div class="kpi yellow"><div class="label">Prom. Gasto</div><div class="value">${fmt(months.length ? tG / months.length : 0)}</div><div class="sub">/mes</div></div>`;

  mkChart('chartFlujo', { type: 'bar', data: { labels: months.map((m) => m.slice(5) + '/' + m.slice(2, 4)), datasets: [{ data: netos, backgroundColor: netos.map((v) => v >= 0 ? C.greenSoftBg + '.5)' : C.redSoftBg + '.5)'), borderColor: netos.map((v) => v >= 0 ? C.green : C.red), borderWidth: 1.5, borderRadius: 2 }] }, options: { responsive: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => (ctx.raw >= 0 ? '+' : '') + fmtFull(ctx.raw) } } }, scales: { x: axX, y: axY((v) => (v >= 0 ? '+' : '') + fmt(v)) } } });

  let html = `<thead><tr><th>Mes</th><th class="r">Ingresos</th><th class="r">Gastos</th><th class="r">Neto</th><th></th></tr></thead><tbody>`;
  months.forEach((m) => {
    const ng = monG[m] || 0, ni = monI[m] || 0, neto = ni - ng;
    const cls = neto >= 0 ? 'pos' : 'neg';
    const bar = `<div style="display:inline-block;width:${Math.min(Math.abs(neto) / Math.max(...netos.map(Math.abs), 1) * 80, 80)}px;height:6px;background:${neto >= 0 ? C.green : C.red};border-radius:2px;vertical-align:middle"></div>`;
    html += `<tr><td class="muted">${m}</td><td class="r pos">${fmtFull(ni)}</td><td class="r neg">${fmtFull(ng)}</td><td class="r ${cls}">${neto >= 0 ? '+' : ''}${fmtFull(neto)}</td><td>${bar}</td></tr>`;
  });
  html += '</tbody>';
  document.getElementById('tblFlujo').innerHTML = html;
}

// ── AHORROS ──
function renderAhorros() {
  const g = FILTERED.gastos, i = FILTERED.ingresos;
  const months = allMonths(g, i);
  const tG = g.reduce((a, r) => a + r.monto, 0);
  const tI = i.reduce((a, r) => a + r.monto, 0);
  const avgMon = months.length ? tG / months.length : 0;
  const bycatObj = groupBy(g, 'cat');
  const bycatSorted = sortedEntries(bycatObj);

  const savings = [];
  const alerts = [];
  const positives = [];
  const plan = [];
  let alertCount = 0;
  const saveRate = tI > 0 ? (tI - tG) / tI : 0;

  // ── Objetivo de ahorro (20%) ──
  const goalEl = document.getElementById('savingsGoal');
  if (months.length > 0 && tI > 0) {
    const targetRate = 0.20;
    if (saveRate < targetRate) {
      const targetExpense = tI * (1 - targetRate);
      const neededCutTotal = tG - targetExpense;
      const neededCutMonthly = neededCutTotal / months.length;
      goalEl.innerHTML = `<div class="goal-card"><div class="goal-label">🎯 Objetivo: ahorrar 20% de tus ingresos</div><div class="goal-text">Hoy estás ahorrando <strong>${Math.round(saveRate * 100)}%</strong>. Para llegar al 20% necesitarías reducir tus gastos en <strong>${fmtFull(neededCutMonthly)}/mes</strong> (o aumentar tus ingresos en una magnitud similar).</div></div>`;
    } else {
      goalEl.innerHTML = `<div class="goal-card"><div class="goal-label">🎯 Objetivo: ahorrar 20% de tus ingresos</div><div class="goal-text">¡Superado! Estás ahorrando <strong>${Math.round(saveRate * 100)}%</strong> de tus ingresos en el período filtrado. Mantener esto te da margen para imprevistos e inversión.</div></div>`;
    }
  } else {
    goalEl.innerHTML = '';
  }

  // ── Oportunidades dinámicas ──
  const chatarra = bycatObj['Chatarra'] || 0;
  if (chatarra > 0) {
    const visits = g.filter((r) => r.cat === 'Chatarra').length;
    const perVisit = chatarra / visits;
    savings.push({ dot: 'orange', label: 'Reducir chatarra/kiosko 50%', desc: `${visits} visitas · ${fmtFull(perVisit)} promedio/visita`, amount: chatarra * 0.5 });
    alertCount++;
  }

  const subComments = g.filter((r) => r.cat === 'Suscripciones').map((r) => String(r.comentario || '').toLowerCase());
  const hasOneDrive = subComments.some((c) => c.includes('onedrive'));
  const hasGDrive = subComments.some((c) => c.includes('google drive') || c.includes('gdrive'));
  if (hasOneDrive && hasGDrive) {
    const oneDriveAmt = g.filter((r) => r.cat === 'Suscripciones' && String(r.comentario || '').toLowerCase().includes('onedrive')).reduce((a, r) => a + r.monto, 0);
    savings.push({ dot: 'yellow', label: 'Cancelar duplicado de almacenamiento', desc: 'Tenés OneDrive Y Google Drive — elegí uno', amount: oneDriveAmt });
    alertCount++;
  }

  const subTotal = bycatObj['Suscripciones'] || 0;
  if (subTotal > 0 && months.length > 0) {
    savings.push({ dot: 'yellow', label: 'Auditar suscripciones inactivas (10%)', desc: `${fmtFull(subTotal / months.length)}/mes · revisar cuáles usás`, amount: subTotal * 0.1 });
  }

  const ocioSpikes = g.filter((r) => r.cat === 'Ocio' && r.monto > 100000);
  if (ocioSpikes.length > 0) {
    const spikeTotal = ocioSpikes.reduce((a, r) => a + r.monto, 0);
    savings.push({ dot: 'orange', label: 'Regla 72hs en compras de ocio >$100K', desc: `${ocioSpikes.length} compras grandes por ${fmtFull(spikeTotal)}`, amount: spikeTotal * 0.3 });
    alertCount++;
  }

  const regalosT = bycatObj['Regalos'] || 0;
  if (regalosT > 0 && months.length > 0) {
    savings.push({ dot: 'yellow', label: 'Crear fondo mensual de regalos', desc: `Gastás ${fmtFull(regalosT / months.length)}/mes en promedio`, amount: regalosT * 0.15 });
  }

  // ── Alertas ──
  if (saveRate < 0.1) {
    alertCount++;
    alerts.push({ type: 'warn', ico: '⚠️', title: 'Tasa de ahorro baja (' + Math.round(saveRate * 100) + '%)', body: 'Estás ahorrando menos del 10% de tus ingresos. El objetivo recomendado es 20%.' });
  }

  const monG = groupByMon(g), monI = groupByMon(i);
  const negMonths = months.filter((m) => (monI[m] || 0) < (monG[m] || 0));
  if (negMonths.length > months.length / 3) {
    alertCount++;
    alerts.push({ type: 'warn', ico: '📉', title: `${negMonths.length} meses en negativo (de ${months.length})`, body: 'Más de un tercio de los meses gastás más de lo que ingresás. Considerá un fondo de emergencia líquido.' });
  }

  const ingMeses = Object.values(groupByMon(i)).filter((v) => v > 0);
  if (ingMeses.length > 1) {
    const meanIng = tI / ingMeses.length;
    const std = Math.sqrt(ingMeses.reduce((a, v) => a + Math.pow(v - meanIng, 2), 0) / ingMeses.length);
    if (std > meanIng * 0.5) {
      alerts.push({ type: 'info', ico: '📊', title: 'Ingresos muy variables', body: `Desviación alta entre meses. Un colchón de 3 meses de gastos (≈${fmt(avgMon * 3)}) te protege en los meses bajos.` });
    }
  }

  if (tG > 0 && chatarra / tG > 0.08) {
    alertCount++;
    alerts.push({ type: 'warn', ico: '🍬', title: `Chatarra = ${(chatarra / tG * 100).toFixed(1)}% de tus gastos`, body: `${g.filter((r) => r.cat === 'Chatarra').length} transacciones pequeñas suman ${fmtFull(chatarra)}. El típico gasto hormiga.` });
  }

  const edu = bycatObj['Educación'] || 0;
  if (tG > 0 && edu / tG < 0.01) {
    alerts.push({ type: 'info', ico: '📚', title: 'Educación: menos del 1% de tus gastos', body: 'Invertir en formación técnica tiene el ROI más alto posible. Incluso $50K/mes en cursos puede multiplicar tus ingresos freelance.' });
  }

  // día de la semana con más gasto
  const byWeekday = {};
  g.forEach((r) => { if (!r.fecha) return; const d = new Date(r.fecha + 'T00:00:00'); const wd = d.getDay(); byWeekday[wd] = (byWeekday[wd] || 0) + r.monto; });
  const wdEntries = Object.entries(byWeekday).sort((a, b) => b[1] - a[1]);
  if (wdEntries.length && tG > 0) {
    const topWd = DAY_NAMES[+wdEntries[0][0]];
    const wdPct = (wdEntries[0][1] / tG * 100).toFixed(0);
    alerts.push({ type: 'info', ico: '📅', title: `Gastás más los ${topWd}`, body: `Acumula ${fmtFull(wdEntries[0][1])} (${wdPct}% del total) — el día con mayor gasto de la semana.` });
  }

  // concentración top 3 categorías (Pareto)
  if (bycatSorted.length >= 3 && tG > 0) {
    const top3 = bycatSorted.slice(0, 3);
    const top3Sum = top3.reduce((a, [, v]) => a + v, 0);
    const pct = (top3Sum / tG * 100).toFixed(0);
    alerts.push({ type: 'info', ico: '🎯', title: `Tus 3 categorías principales son el ${pct}% del gasto`, body: `${top3.map(([c]) => c).join(', ')} concentran la mayor parte. Enfocar ahí rinde más que optimizar categorías chicas.` });
  }

  // ── Positivos ──
  if (saveRate > 0.15) positives.push({ type: 'tip', ico: '✅', title: 'Tasa de ahorro saludable (' + Math.round(saveRate * 100) + '%)', body: 'Estás guardando una buena parte de tus ingresos. Seguí así.' });

  const freelanceT = i.filter((r) => r.cat === 'Freelance').reduce((a, r) => a + r.monto, 0);
  if (freelanceT > 0) positives.push({ type: 'tip', ico: '💻', title: 'Ingresos freelance activos: ' + fmt(freelanceT), body: 'Tenés una fuente de ingreso adicional al salario. Eso es diversificación real y es valioso.' });

  const invT = bycatObj['Inversiones'] || 0;
  if (invT > 0) positives.push({ type: 'tip', ico: '📈', title: 'Tenés inversiones registradas: ' + fmt(invT), body: 'Ya estás invirtiendo aunque sea en pequeña escala. La consistencia importa más que el monto inicial.' });

  if (g.length > 100) positives.push({ type: 'tip', ico: '📋', title: `Registro financiero impecable (${g.length} gastos)`, body: 'Llevar las cuentas detalladas con comentarios es el primer paso — y el más difícil. Ya lo tenés.' });

  const salarios = i.filter((r) => r.cat === 'Salario').sort((a, b) => (a.fecha > b.fecha ? 1 : -1));
  if (salarios.length >= 2) {
    const first = salarios[0].monto, last = salarios[salarios.length - 1].monto;
    if (last > first * 1.5) positives.push({ type: 'tip', ico: '🚀', title: `Salario creció ${((last / first - 1) * 100).toFixed(0)}% en el período`, body: `De ${fmtFull(first)} a ${fmtFull(last)}. Crecimiento real de ingresos.` });
  }

  // ── Plan ──
  if (chatarra > avgMon * 0.05 && months.length > 0) plan.push({ type: 'info', ico: '🎯', title: 'Presupuesto semanal de antojos', body: `Fijate un tope de ${fmtFull(chatarra / months.length / 4 * 0.5)}/semana para snacks/kiosko. Cuando se acaba, se acaba.` });
  plan.push({ type: 'info', ico: '💵', title: 'Automatizá 1 compra de dólares por mes', body: 'Aunque sea 20-30 USD MEP el día que te pagan. En 12 meses tenés reserva sin esfuerzo.' });
  if (edu < avgMon * 0.05) plan.push({ type: 'purple', ico: '📚', title: 'Asigná $50-80K/mes a educación', body: 'Un curso técnico, certificación o libro relevante. Con freelance activo, mejorar tus skills impacta directo en las tarifas que podés cobrar.' });
  if (freelanceT > 0) plan.push({ type: 'purple', ico: '💼', title: 'Proponer contrato anual a tu cliente fijo', body: 'En vez de cobrar por proyecto, ofrecé un retainer mensual. Eso te da ingresos previsibles.' });
  plan.push({ type: 'tip', ico: '🏦', title: `Fondo de emergencia: apuntá a ${fmt(avgMon * 3)}`, body: 'Tres meses de gastos en un FCI money market (alta liquidez). Te protege sin tocar las inversiones.' });

  document.getElementById('alertCount').textContent = alertCount;

  // ordenar oportunidades por impacto (mayor a menor) + medallas para el top 3
  savings.sort((a, b) => b.amount - a.amount);
  const medals = ['🥇', '🥈', '🥉'];

  const sl = document.getElementById('savingsList');
  sl.innerHTML = '';
  if (savings.length && months.length) {
    const annualSavings = savings.reduce((a, s) => a + s.amount, 0) * (12 / months.length);
    sl.insertAdjacentHTML('beforeend', `<div class="saving-item" style="background:var(--green-soft);border-color:var(--green)"><div class="dot"></div><div class="label"><strong style="color:var(--green)">Potencial de ahorro anualizado</strong><div class="desc">Sumando todas las oportunidades identificadas, proyectado a 12 meses</div></div><div class="amount">${fmtFull(annualSavings)}/año</div></div>`);
  }
  savings.forEach((s, idx) => {
    const medal = medals[idx] ? `<span style="margin-right:6px">${medals[idx]}</span>` : '';
    sl.insertAdjacentHTML('beforeend', `<div class="saving-item"><div class="dot ${s.dot}"></div><div class="label">${medal}<strong>${s.label}</strong><div class="desc">${s.desc}</div></div><div class="amount">${fmtFull(s.amount)}</div></div>`);
  });
  if (!savings.length) sl.innerHTML = '<div class="empty-state">Sin oportunidades detectadas en el período filtrado.</div>';

  const al = document.getElementById('alertsList');
  al.innerHTML = alerts.length ? alerts.map((a) => `<div class="insight ${a.type}"><div class="ico">${a.ico}</div><div class="body"><strong>${a.title}</strong>${a.body}</div></div>`).join('') : `<div class="insight tip"><div class="ico">✅</div><div class="body"><strong>Sin alertas críticas</strong>Todo en orden en el período seleccionado.</div></div>`;

  const pl = document.getElementById('positivesList');
  pl.innerHTML = positives.map((p) => `<div class="insight ${p.type}"><div class="ico">${p.ico}</div><div class="body"><strong>${p.title}</strong>${p.body}</div></div>`).join('') || '<div class="empty-state">Sin datos suficientes.</div>';

  const planL = document.getElementById('planList');
  planL.innerHTML = plan.map((p) => `<div class="insight ${p.type}"><div class="ico">${p.ico}</div><div class="body"><strong>${p.title}</strong>${p.body}</div></div>`).join('');
}

// ══════════════════════════════════════════
// EVENTS
// ══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  });

  const box = document.getElementById('uploadBox');
  box.addEventListener('dragover', (e) => { e.preventDefault(); box.classList.add('drag'); });
  box.addEventListener('dragleave', () => box.classList.remove('drag'));
  box.addEventListener('drop', (e) => { e.preventDefault(); box.classList.remove('drag'); const f = e.dataTransfer.files[0]; if (f) processFile(f); });

  document.getElementById('demoBtn').addEventListener('click', () => {
    RAW = DEMO_DATA;
    initApp();
  });

  document.getElementById('reloadBtn').addEventListener('click', () => {
    document.getElementById('app').style.display = 'none';
    document.getElementById('uploadScreen').style.display = 'flex';
    RAW = { gastos: [], ingresos: [], transferencias: [] };
  });

  document.getElementById('filterYear').addEventListener('change', (e) => {
    FILTERS.year = e.target.value;
    FILTERS.month = 'all';
    buildMonthOptions();
    applyFilters();
  });
  document.getElementById('filterMonth').addEventListener('change', (e) => { FILTERS.month = e.target.value; applyFilters(); });
  document.getElementById('filterAccount').addEventListener('change', (e) => { FILTERS.account = e.target.value; applyFilters(); });
  document.getElementById('filterCategory').addEventListener('change', (e) => { FILTERS.category = e.target.value; applyFilters(); });

  let minAmountTimer;
  document.getElementById('filterMinAmount').addEventListener('input', (e) => {
    clearTimeout(minAmountTimer);
    minAmountTimer = setTimeout(() => { FILTERS.minAmount = +e.target.value || 0; applyFilters(); }, 350);
  });

  document.querySelectorAll('[data-period]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-period]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      FILTERS.period = btn.dataset.period;
      applyFilters();
    });
  });

  document.getElementById('resetFiltersBtn').addEventListener('click', resetFilters);

  document.getElementById('gasCatSearch').addEventListener('input', (e) => {
    CAT_SEARCH = e.target.value.toLowerCase().trim();
    renderCatAccordion(FILTERED.gastos, sortedEntries(groupBy(FILTERED.gastos, 'cat')), FILTERED.gastos.reduce((a, r) => a + r.monto, 0), Object.keys(groupByMon(FILTERED.gastos)).sort());
  });

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('page-' + btn.dataset.tab).classList.add('active');
    });
  });
});
