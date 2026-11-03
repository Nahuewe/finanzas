import { RAW } from '../state.js';
import { fmtFull, esc } from '../helpers.js';
import { allAccounts, accountCurrency, loadSaldos, saveSaldos, flowAfter, estimatedBalance, countedBalance } from '../accounts.js';
import { FX, CASAS } from '../externalData.js';
import { renderPatrimonio } from './patrimonio.js';

const today = () => new Date().toISOString().split('T')[0];

const money = (n, cur) => (cur === 'ARS' ? fmtFull(n) : `${cur} ${Math.round(n).toLocaleString('es-AR')}`);

export function renderCuentas() {
  buildCuentasUI();
}

function buildCuentasUI() {
  const container = document.getElementById('cuentasPanel');
  if (!container) return;

  const saldos = loadSaldos();
  const accounts = allAccounts();
  if (!accounts.length) {
    container.innerHTML = '<div class="empty-state">No hay cuentas registradas en el archivo actual.</div>';
    return;
  }

  const by = (arr, key) => arr.reduce((o, r) => ((o[r[key]] = (o[r[key]] || 0) + r.monto), o), {});
  const gastosPorCuenta = by(RAW.gastos, 'cuenta');
  const ingresosPorCuenta = by(RAW.ingresos, 'cuenta');
  const transfSale = by(RAW.transferencias, 'cuentaOrigen');
  const transfEntra = by(RAW.transferencias, 'cuentaDestino');

  let totalArs = 0;
  let counted = 0;

  const rows = accounts.map((cuenta) => {
    const cur = accountCurrency(cuenta);
    const entry = saldos[cuenta];
    const corte = entry ? entry.fecha : null;
    const flujo = flowAfter(cuenta, corte);
    const estimado = estimatedBalance(cuenta, saldos);
    const noSumar = !!entry?.noSumar;
    const suma = countedBalance(cuenta, saldos); // lo que realmente aporta al total
    if (suma !== null) {
      counted++;
      totalArs += cur === 'USD' ? suma * (FX.last?.venta || 0) : suma;
    }
    const flujoLabel = flujo !== null ? `${flujo >= 0 ? '+' : ''}${money(flujo, cur)}` : '—';

    return `
      <div class="cuenta-row">
        <div class="cuenta-name">${esc(cuenta)}${cur !== 'ARS' ? ` <span class="cuenta-corte-chip">${esc(cur)}</span>` : ''}</div>
        <div class="cuenta-fields">
          <div class="cuenta-field">
            <label class="cuenta-field-label">Saldo actual (${esc(cur)})</label>
            <input class="cuenta-input" type="number" placeholder="0" data-cuenta="${esc(cuenta)}" value="${entry ? entry.monto : ''}" />
          </div>
          ${corte ? `
          <div class="cuenta-stat ${flujo >= 0 ? 'pos' : 'neg'}">
            <div class="cuenta-stat-label">Flujo posterior</div>
            <div class="cuenta-stat-val">${flujoLabel}</div>
          </div>
          <div class="cuenta-stat ${estimado >= 0 ? 'pos' : 'neg'}">
            <div class="cuenta-stat-label">Saldo estimado</div>
            <div class="cuenta-stat-val">${money(estimado, cur)}</div>
          </div>
          <div class="cuenta-stat">
            <div class="cuenta-stat-label">Suma al total</div>
            <div class="cuenta-stat-val">${money(suma, cur)}</div>
          </div>` : `
          <div class="cuenta-stat">
            <div class="cuenta-stat-label">Saldo estimado</div>
            <div class="cuenta-stat-val">—</div>
          </div>`}
        </div>
        <div class="cuenta-detail">
          <span class="cuenta-detail-chip neg">Gastos ${fmtFull(gastosPorCuenta[cuenta] || 0)}</span>
          <span class="cuenta-detail-chip pos">Ingresos ${fmtFull(ingresosPorCuenta[cuenta] || 0)}</span>
          ${transfEntra[cuenta] ? `<span class="cuenta-detail-chip transfer">↘ Recibido ${fmtFull(transfEntra[cuenta])}</span>` : ''}
          ${transfSale[cuenta] ? `<span class="cuenta-detail-chip transfer">↗ Transferido ${fmtFull(transfSale[cuenta])}</span>` : ''}
          ${corte ? `<span class="cuenta-corte-chip">Corte: ${esc(corte)}</span>` : ''}
          ${entry ? `<button type="button" class="cuenta-toggle ${noSumar ? 'on' : ''}" data-cuenta="${esc(cuenta)}" title="Si está activado, el saldo que escribiste no se suma al total; solo suman los movimientos que cargues después.">${noSumar ? '🚫 Mi saldo no suma al total' : '✓ Mi saldo suma al total'}</button>` : ''}
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="cuentas-header">
      <div class="cuentas-tip">Ingresá el saldo actual de cada cuenta (en su propia divisa). Se guarda con la fecha de hoy como corte — los próximos Excel que subas solo sumarán las transacciones posteriores a esa fecha. Con «Mi saldo no suma al total» el monto que escribís queda como referencia y no entra en los totales, pero los ingresos, gastos y transferencias que cargues después sí. Las cuentas en dólares se valorizan al dólar ${esc(CASAS[FX.casa] || FX.casa)} actual.</div>
      ${counted ? `
        <div class="cuentas-total">
          <span class="cuentas-total-label">Total estimado en pesos (${counted} cuentas)</span>
          <span class="cuentas-total-val ${totalArs >= 0 ? 'pos' : 'neg'}">${fmtFull(totalArs)}</span>
        </div>` : ''}
    </div>
    <div class="cuentas-list">${rows}</div>
    <button class="cuentas-clear-btn" id="clearSaldosBtn">✕ Borrar todos los saldos</button>`;
}

export function initCuentasListeners() {
  const panel = document.getElementById('cuentasPanel');
  panel?.addEventListener('change', (e) => {
    const inp = e.target.closest('.cuenta-input');
    if (!inp) return;
    const saldos = loadSaldos();
    const num = parseFloat(String(inp.value).replace(/[^0-9.-]/g, ''));
    if (isNaN(num) || inp.value === '') delete saldos[inp.dataset.cuenta];
    else saldos[inp.dataset.cuenta] = { monto: num, fecha: today(), ...(saldos[inp.dataset.cuenta]?.noSumar ? { noSumar: true } : {}) };
    saveSaldos(saldos);
    buildCuentasUI();
    renderPatrimonio();
  });
  panel?.addEventListener('click', (e) => {
    const tog = e.target.closest('.cuenta-toggle');
    if (tog) {
      const saldos = loadSaldos();
      const entry = saldos[tog.dataset.cuenta];
      if (!entry) return;
      entry.noSumar = !entry.noSumar;
      saveSaldos(saldos);
      buildCuentasUI();
      renderPatrimonio();
      document.dispatchEvent(new CustomEvent('external-data')); // recalcula colchón y demás vistas
      return;
    }
    if (e.target.id === 'clearSaldosBtn' && confirm('¿Borrar todos los saldos guardados?')) {
      saveSaldos({});
      buildCuentasUI();
      renderPatrimonio();
    }
  });
}
