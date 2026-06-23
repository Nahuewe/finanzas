import { RAW } from '../state.js';
import { fmtFull } from '../helpers.js';

const LS_KEY = 'finanzas_saldos_v2';

function loadSaldos() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveSaldos(obj) {
  localStorage.setItem(LS_KEY, JSON.stringify(obj));
}

function today() {
  return new Date().toISOString().split('T')[0];
}

export function renderCuentas() {
  buildCuentasUI();
}

function calcFlujoPosterior(cuenta, fechaCorte) {
  if (!fechaCorte) return null;
  const gastos = RAW.gastos
    .filter((r) => r.cuenta === cuenta && r.fecha > fechaCorte)
    .reduce((a, r) => a + r.monto, 0);
  const ingresos = RAW.ingresos
    .filter((r) => r.cuenta === cuenta && r.fecha > fechaCorte)
    .reduce((a, r) => a + r.monto, 0);
  return ingresos - gastos;
}

function buildCuentasUI() {
  const container = document.getElementById('cuentasPanel');
  if (!container) return;

  const saldos = loadSaldos();

  const allAccounts = [
    ...new Set([
      ...RAW.gastos.map((r) => r.cuenta),
      ...RAW.ingresos.map((r) => r.cuenta),
    ].filter(Boolean))
  ].sort();

  const gastosPorCuenta = {};
  const ingresosPorCuenta = {};
  RAW.gastos.forEach((r) => {
    gastosPorCuenta[r.cuenta] = (gastosPorCuenta[r.cuenta] || 0) + r.monto;
  });
  RAW.ingresos.forEach((r) => {
    ingresosPorCuenta[r.cuenta] = (ingresosPorCuenta[r.cuenta] || 0) + r.monto;
  });

  if (!allAccounts.length) {
    container.innerHTML = '<div class="empty-state">No hay cuentas registradas en el archivo actual.</div>';
    return;
  }

  const rows = allAccounts.map((cuenta) => {
    const entry = saldos[cuenta];
    const saldoNum = entry ? entry.monto : null;
    const fechaCorte = entry ? entry.fecha : null;
    const gastosTotales = gastosPorCuenta[cuenta] || 0;
    const ingresosTotales = ingresosPorCuenta[cuenta] || 0;
    const netoTotal = ingresosTotales - gastosTotales;

    const flujoPosterior = calcFlujoPosterior(cuenta, fechaCorte);
    const saldoEstimado = saldoNum !== null && flujoPosterior !== null
      ? saldoNum + flujoPosterior
      : saldoNum;

    const flujoPosteriorLabel = flujoPosterior !== null
      ? `${flujoPosterior >= 0 ? '+' : ''}${fmtFull(flujoPosterior)}`
      : '—';
    const flujoPosteriorClass = flujoPosterior === null ? '' : flujoPosterior >= 0 ? 'pos' : 'neg';

    const safeCuenta = cuenta.replace(/'/g, "\\'");

    return `
      <div class="cuenta-row">
        <div class="cuenta-name">${cuenta}</div>
        <div class="cuenta-fields">
          <div class="cuenta-field">
            <label class="cuenta-field-label">Saldo actual</label>
            <input
              class="cuenta-input"
              type="number"
              placeholder="$0"
              value="${saldoNum !== null ? saldoNum : ''}"
              onchange="updateSaldo('${safeCuenta}', this.value)"
            />
          </div>
          ${fechaCorte ? `
          <div class="cuenta-stat ${flujoPosteriorClass}">
            <div class="cuenta-stat-label">Flujo posterior</div>
            <div class="cuenta-stat-val">${flujoPosteriorLabel}</div>
          </div>
          <div class="cuenta-stat ${saldoEstimado === null ? '' : saldoEstimado >= 0 ? 'pos' : 'neg'}">
            <div class="cuenta-stat-label">Saldo estimado</div>
            <div class="cuenta-stat-val">${saldoEstimado !== null ? fmtFull(saldoEstimado) : '—'}</div>
          </div>` : `
          <div class="cuenta-stat">
            <div class="cuenta-stat-label">Saldo estimado</div>
            <div class="cuenta-stat-val">${saldoNum !== null ? fmtFull(saldoNum) : '—'}</div>
          </div>`}
        </div>
        <div class="cuenta-detail">
          <span class="cuenta-detail-chip neg">Gastos ${fmtFull(gastosTotales)}</span>
          <span class="cuenta-detail-chip pos">Ingresos ${fmtFull(ingresosTotales)}</span>
          ${fechaCorte ? `<span class="cuenta-corte-chip">Corte: ${fechaCorte}</span>` : ''}
        </div>
      </div>`;
  }).join('');

  const cuentasConSaldo = allAccounts.filter((c) => saldos[c] !== undefined);
  const totalEstimado = cuentasConSaldo.reduce((sum, cuenta) => {
    const entry = saldos[cuenta];
    if (!entry) return sum;
    const flujo = calcFlujoPosterior(cuenta, entry.fecha) || 0;
    return sum + entry.monto + flujo;
  }, 0);

  container.innerHTML = `
    <div class="cuentas-header">
      <div class="cuentas-tip">Ingresá el saldo actual de cada cuenta. Se guarda con la fecha de hoy como corte — los próximos Excel que subas solo sumarán las transacciones posteriores a esa fecha.</div>
      ${cuentasConSaldo.length ? `
        <div class="cuentas-total">
          <span class="cuentas-total-label">Total estimado (${cuentasConSaldo.length} cuentas)</span>
          <span class="cuentas-total-val ${totalEstimado >= 0 ? 'pos' : 'neg'}">${fmtFull(totalEstimado)}</span>
        </div>` : ''}
    </div>
    <div class="cuentas-list">${rows}</div>
    <button class="cuentas-clear-btn" onclick="clearSaldos()">✕ Borrar todos los saldos</button>`;
}

window.updateSaldo = function(cuenta, value) {
  const saldos = loadSaldos();
  const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  if (isNaN(num) || value === '') {
    delete saldos[cuenta];
  } else {
    saldos[cuenta] = { monto: num, fecha: today() };
  }
  saveSaldos(saldos);
  buildCuentasUI();
};

window.clearSaldos = function() {
  if (confirm('¿Borrar todos los saldos guardados?')) {
    localStorage.removeItem(LS_KEY);
    buildCuentasUI();
  }
};
