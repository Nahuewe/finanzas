import { RAW, C, COLORS, A } from '../state.js';
import { fmt, fmtFull, esc, sum, mkChart, axX, axY, legendStyle, monthLabel, chartOpts } from '../helpers.js';
import { allAccounts, accountCurrency, loadSaldos, estimatedBalance, monthEndBalances } from '../accounts.js';
import { FX, CASAS, fxAt, fxOnDay, loadFx, inflBetween } from '../externalData.js';
import { matcher } from '../config.js';

const ymOf = (f) => f?.slice(0, 7);

/** Todos los meses entre el primer y el último movimiento del archivo (sin filtros ni exclusiones). */
function rawMonths() {
  const dates = [...RAW.gastos, ...RAW.ingresos, ...RAW.transferencias].map((r) => r.fecha).filter(Boolean).sort();
  if (!dates.length) return [];
  const out = [];
  let [y, m] = ymOf(dates[0]).split('-').map(Number);
  const last = ymOf(dates.at(-1));
  for (;;) {
    const ym = `${y}-${String(m).padStart(2, '0')}`;
    out.push(ym);
    if (ym >= last) break;
    if (++m > 12) { m = 1; y++; }
  }
  return out;
}

export function renderPatrimonio() {
  renderEvolucion();
  renderDolares();
  renderAudit();
  const sel = document.getElementById('fxSelect');
  if (sel && !sel.options.length) {
    sel.innerHTML = Object.entries(CASAS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  }
  if (sel) sel.value = FX.casa;
  const st = document.getElementById('fxStatus');
  if (st) {
    st.textContent = FX.state === 'ok' && FX.last
      ? `Dólar ${CASAS[FX.casa]}: $${FX.last.venta.toLocaleString('es-AR')} (${FX.last.fecha}) · argentinadatos.com`
      : FX.state === 'cargando' ? 'Cargando cotización…' : 'No se pudo consultar la cotización';
  }
}

// ── Evolución del patrimonio ──
function renderEvolucion() {
  const kpi = document.getElementById('kpiPatrimonio');
  if (!kpi) return;
  const saldos = loadSaldos();
  const accounts = allAccounts().filter((a) => saldos[a]);
  const months = rawMonths();

  if (!accounts.length || months.length < 2) {
    kpi.innerHTML = '<div class="empty-state" style="grid-column:1/-1">Cargá el saldo actual de tus cuentas en la pestaña <strong>Cuentas</strong> para ver la evolución de tu patrimonio mes a mes.</div>';
    mkChart('chartPatrimonio', { type: 'bar', data: { labels: [], datasets: [] } });
    return;
  }

  const cur = Object.fromEntries(accounts.map((a) => [a, accountCurrency(a)]));
  const series = accounts.map((a) => {
    const be = monthEndBalances(a, months, saldos, true);
    return { account: a, vals: months.map((m) => (cur[a] === 'USD' ? be[m] * fxAt(m) : be[m])) };
  });
  const total = months.map((_, k) => series.reduce((s, x) => s + x.vals[k], 0));

  const now = total.at(-1);
  const yAgoIdx = Math.max(0, months.length - 13);
  const yAgo = total[yAgoIdx];
  const nominal = yAgo ? (now / yAgo - 1) * 100 : null;
  const infl = inflBetween(months[yAgoIdx], months.at(-1));
  const real = nominal !== null ? ((1 + nominal / 100) / (1 + infl / 100) - 1) * 100 : null;
  const rate = FX.last?.venta || fxAt(months.at(-1));
  const best = Math.max(...total), worst = Math.min(...total);
  const span = months.length - 1 - yAgoIdx;

  kpi.innerHTML = `
    <div class="kpi purple"><div class="label">Patrimonio actual</div><div class="value">${fmt(now)}</div><div class="sub">${accounts.length} cuentas</div></div>
    <div class="kpi blue"><div class="label">En dólares</div><div class="value">${rate ? 'USD ' + Math.round(now / rate).toLocaleString('es-AR') : '—'}</div><div class="sub">al ${CASAS[FX.casa]} actual</div></div>
    <div class="kpi ${nominal >= 0 ? 'green' : 'red'}"><div class="label">Variación ${span} meses</div><div class="value">${nominal === null ? '—' : (nominal >= 0 ? '+' : '') + nominal.toFixed(0) + '%'}</div><div class="sub">nominal en pesos</div></div>
    <div class="kpi ${real >= 0 ? 'green' : 'red'}"><div class="label">Variación real</div><div class="value">${real === null ? '—' : (real >= 0 ? '+' : '') + real.toFixed(0) + '%'}</div><div class="sub">descontando inflación ${infl.toFixed(0)}%</div></div>
    <div class="kpi green"><div class="label">Máximo histórico</div><div class="value">${fmt(best)}</div><div class="sub">${months[total.indexOf(best)]}</div></div>
    <div class="kpi yellow"><div class="label">Mínimo</div><div class="value">${fmt(worst)}</div><div class="sub">${months[total.indexOf(worst)]}</div></div>`;

  mkChart('chartPatrimonio', {
    type: 'bar',
    data: {
      labels: months.map(monthLabel),
      datasets: [
        ...series.map((s, k) => ({ label: s.account + (cur[s.account] === 'USD' ? ' (USD→$)' : ''), data: s.vals, backgroundColor: COLORS[k % COLORS.length], stack: 'p', order: 2 })),
        { label: 'Total', type: 'line', data: total, borderColor: C.ink, backgroundColor: C.ink, borderWidth: 2, pointRadius: 0, tension: 0.25, order: 1 },
      ],
    },
    options: chartOpts({ legend: true, x: { ...axX, stacked: true }, y: { ...axY(), stacked: true } }),
  });
}

// ── Dólares ──
function renderDolares() {
  const kpi = document.getElementById('kpiUsd');
  if (!kpi) return;

  const T = RAW.transferencias;
  const transferBuys = T.filter((t) => t.monedaEntrante === 'USD' && t.monedaSaliente !== 'USD').map((t) => ({ fecha: t.fecha, usd: t.montoEntrante, ars: t.montoSaliente }));
  // compras de dólares registradas como gasto desde una cuenta en pesos (p. ej. categoría "Dolares")
  const isCompra = matcher('compraDolares');
  const gastoBuys = RAW.gastos.filter((r) => r.usd && r.monedaCuenta !== 'USD' && isCompra(r.cat)).map((r) => ({ fecha: r.fecha, usd: r.usd, ars: r.monto }));
  const buys = [...transferBuys, ...gastoBuys];
  const sells = T.filter((t) => t.monedaSaliente === 'USD' && t.monedaEntrante !== 'USD').map((t) => ({ fecha: t.fecha, usd: t.montoSaliente, ars: t.montoEntrante }));
  const usdIn = RAW.ingresos.filter((r) => r.monedaCuenta === 'USD').map((r) => ({ fecha: r.fecha, usd: r.montoCuenta }));
  const usdOut = RAW.gastos.filter((r) => r.monedaCuenta === 'USD').map((r) => ({ fecha: r.fecha, usd: r.montoCuenta }));

  const hasUsd = buys.length || sells.length || usdIn.length || usdOut.length;
  if (!hasUsd) {
    kpi.innerHTML = '<div class="empty-state" style="grid-column:1/-1">No se detectaron movimientos en dólares (cuentas en USD o transferencias ARS → USD) en el archivo.</div>';
    mkChart('chartUsdAcum', { type: 'line', data: { labels: [], datasets: [] } });
    mkChart('chartUsdCompras', { type: 'bar', data: { labels: [], datasets: [] } });
    document.getElementById('usdComprasList').innerHTML = '';
    document.getElementById('usdAudit').innerHTML = '';
    document.getElementById('usdAuditNote').textContent = '';
    return;
  }

  const months = rawMonths();
  const rate = FX.last?.venta || 0;
  const usdBought = sum(buys, 'usd'), arsPaid = sum(buys, 'ars');
  const usdSold = sum(sells, 'usd');
  const avgBuy = usdBought ? arsPaid / usdBought : 0;
  const net = usdBought + sum(usdIn, 'usd') - sum(usdOut, 'usd') - usdSold;

  // valor actual de lo comprado vs lo que costó (nominal y ajustado por inflación)
  const nowVal = usdBought * rate;
  const nominal = arsPaid ? (nowVal / arsPaid - 1) * 100 : null;
  const lastYm = months.at(-1);
  const adjusted = buys.reduce((a, b) => a + b.ars * (1 + inflBetween(ymOf(b.fecha), lastYm) / 100), 0);
  const real = adjusted ? (nowVal / adjusted - 1) * 100 : null;

  kpi.innerHTML = `
    <div class="kpi green"><div class="label">USD comprados</div><div class="value">${Math.round(usdBought).toLocaleString('es-AR')}</div><div class="sub">${buys.length} compras</div></div>
    <div class="kpi purple"><div class="label">Precio prom. de compra</div><div class="value">${avgBuy ? fmtFull(avgBuy) : '—'}</div><div class="sub">${rate ? 'hoy: ' + fmtFull(rate) : 'sin cotización'}</div></div>
    <div class="kpi blue"><div class="label">Invertido en pesos</div><div class="value">${fmt(arsPaid)}</div><div class="sub">valor hoy ${rate ? fmt(nowVal) : '—'}</div></div>
    <div class="kpi ${nominal >= 0 ? 'green' : 'red'}"><div class="label">Resultado nominal</div><div class="value">${nominal === null || !rate ? '—' : (nominal >= 0 ? '+' : '') + nominal.toFixed(0) + '%'}</div><div class="sub">en pesos</div></div>
    <div class="kpi ${real >= 0 ? 'green' : 'red'}"><div class="label">Resultado real</div><div class="value">${real === null || !rate ? '—' : (real >= 0 ? '+' : '') + real.toFixed(0) + '%'}</div><div class="sub">vs inflación acumulada</div></div>
    <div class="kpi yellow"><div class="label">USD netos en archivo</div><div class="value">${Math.round(net).toLocaleString('es-AR')}</div><div class="sub">+${Math.round(sum(usdIn, 'usd'))} recibidos · −${Math.round(sum(usdOut, 'usd') + usdSold)} usados</div></div>`;

  // USD acumulados por mes
  const delta = {};
  const add = (arr, sign) => arr.forEach((x) => { const m = ymOf(x.fecha); if (m) delta[m] = (delta[m] || 0) + sign * x.usd; });
  add(buys, 1); add(usdIn, 1); add(usdOut, -1); add(sells, -1);
  const first = months.findIndex((m) => delta[m]);
  const ms = months.slice(Math.max(0, first));
  let acc = 0;
  const cum = ms.map((m) => (acc += delta[m] || 0));
  mkChart('chartUsdAcum', {
    type: 'line',
    data: { labels: ms.map(monthLabel), datasets: [{ label: 'USD acumulados', data: cum, borderColor: C.green, backgroundColor: A('pos', .15), fill: true, borderWidth: 2, pointRadius: 0, tension: 0.2 }] },
    options: chartOpts({ tooltip: { callbacks: { label: (c) => 'USD ' + Math.round(c.raw).toLocaleString('es-AR') } }, y: axY((v) => 'USD ' + v) }),
  });

  // compras por mes + precio pagado vs cotización de mercado
  const bm = {}, pm = {};
  buys.forEach((b) => { const m = ymOf(b.fecha); bm[m] = (bm[m] || 0) + b.usd; pm[m] = (pm[m] || 0) + b.ars; });
  const bMonths = ms.filter((m) => bm[m]);
  const hasFx = Object.keys(FX.monthly).length > 0;
  mkChart('chartUsdCompras', {
    type: 'bar',
    data: {
      labels: bMonths.map(monthLabel),
      datasets: [
        { label: 'USD comprados', data: bMonths.map((m) => bm[m]), backgroundColor: C.purpleSoftBg, borderColor: C.purple, borderWidth: 1, yAxisID: 'y' },
        { label: 'Precio pagado', type: 'line', data: bMonths.map((m) => pm[m] / bm[m]), borderColor: C.red, backgroundColor: C.red, pointRadius: 2, tension: 0.2, yAxisID: 'y1' },
        ...(hasFx ? [{ label: `Dólar ${CASAS[FX.casa]} (fin de mes)`, type: 'line', data: bMonths.map((m) => fxAt(m)), borderColor: C.green, borderDash: [4, 3], pointRadius: 0, tension: 0.2, yAxisID: 'y1' }] : []),
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: legendStyle, tooltip: { callbacks: { label: (c) => (c.dataset.yAxisID === 'y1' ? c.dataset.label + ': ' + fmtFull(c.raw) : 'USD ' + Math.round(c.raw).toLocaleString('es-AR')) } } },
      scales: { x: axX, y: axY((v) => 'USD ' + v), y1: { ...axY(), position: 'right', grid: { drawOnChartArea: false } } },
    },
  });

  // últimas compras con ganancia/pérdida vs hoy
  const last = [...buys].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 8);
  document.getElementById('usdComprasList').innerHTML = last.length
    ? `<div class="receipt-list">${last.map((b) => {
        const p = b.ars / b.usd;
        const diff = rate ? (rate / p - 1) * 100 : null;
        return `<div class="receipt-row"><span class="receipt-date">${esc(b.fecha.slice(2))}</span><span class="receipt-name">USD ${Math.round(b.usd).toLocaleString('es-AR')} a ${fmtFull(p)}</span><span class="receipt-meta" style="color:${diff >= 0 ? 'var(--green)' : 'var(--red)'}">${diff === null ? '' : (diff >= 0 ? '+' : '') + diff.toFixed(0) + '% vs hoy'}</span><span class="receipt-amt">${fmt(b.ars)}</span></div>`;
      }).join('')}</div>`
    : '<div class="empty-state">Sin compras de dólares (transferencias ARS → USD).</div>';
}

/** Revisa cada operación en dólares: cotización implícita (ARS ÷ USD) contra la del mercado ese día. */
function renderAudit() {
  const el = document.getElementById('usdAudit');
  const note = document.getElementById('usdAuditNote');
  if (!el) return;
  const rows = [
    ...RAW.gastos.filter((r) => r.usd).map((r) => ({ fecha: r.fecha, nombre: `${r.cat} · ${r.comentario || ''}`, usd: r.usd, ars: r.monto, tipo: 'gasto' })),
    ...RAW.ingresos.filter((r) => r.usd).map((r) => ({ fecha: r.fecha, nombre: `${r.cat} · ${r.comentario || ''}`, usd: r.usd, ars: r.monto, tipo: 'ingreso' })),
    ...RAW.transferencias.filter((t) => t.monedaEntrante === 'USD' && t.monedaSaliente !== 'USD').map((t) => ({ fecha: t.fecha, nombre: `${t.cuentaOrigen} → ${t.cuentaDestino}`, usd: t.montoEntrante, ars: t.montoSaliente, tipo: 'transf.' })),
  ].filter((r) => r.usd > 0 && r.ars > 0).map((r) => {
    const imp = r.ars / r.usd;
    const mkt = FX.state === 'ok' ? fxOnDay(r.fecha) : 0;
    return { ...r, imp, mkt, dif: mkt ? (imp / mkt - 1) * 100 : null };
  }).sort((a, b) => b.fecha.localeCompare(a.fecha));

  const flagged = rows.filter((r) => r.dif !== null && Math.abs(r.dif) > 10);
  note.textContent = rows.length
    ? `${rows.length} operaciones en dólares · ${flagged.length} con cotización implícita a más de 10% del dólar ${CASAS[FX.casa]} del día (pueden ser impuestos/recargos, otro tipo de cambio o un error de carga).`
    : '';
  el.innerHTML = rows.length ? `<table class="tbl"><thead><tr><th>Fecha</th><th>Operación</th><th class="r">USD</th><th class="r">ARS</th><th class="r">Implícita</th><th class="r">Mercado</th><th class="r">Dif.</th></tr></thead><tbody>${rows.map((r) => {
    const bad = r.dif !== null && Math.abs(r.dif) > 10;
    return `<tr><td class="muted">${esc(r.fecha)}</td><td>${esc(r.nombre).slice(0, 70)}</td><td class="r">${r.usd.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</td><td class="r">${fmtFull(r.ars)}</td><td class="r">${fmtFull(r.imp)}</td><td class="r muted">${r.mkt ? fmtFull(r.mkt) : '—'}</td><td class="r ${bad ? 'neg' : 'pos'}">${r.dif === null ? '—' : (r.dif >= 0 ? '+' : '') + r.dif.toFixed(0) + '%'}</td></tr>`;
  }).join('')}</tbody></table>` : '<div class="empty-state">Sin operaciones en dólares.</div>';
}

export function initPatrimonioListeners() {
  document.getElementById('fxSelect')?.addEventListener('change', async (e) => {
    await loadFx(e.target.value);
    renderPatrimonio();
  });
}
