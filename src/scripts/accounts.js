import { RAW } from './state.js';
import { store } from './storage.js';

export const loadSaldos = () => store.get('saldos', {}) || {};
export const saveSaldos = (o) => store.set('saldos', o);

const inAcc = (r) => r.montoCuenta ?? r.monto;

export function allAccounts() {
  return [...new Set([
    ...RAW.gastos.map((r) => r.cuenta),
    ...RAW.ingresos.map((r) => r.cuenta),
    ...RAW.transferencias.map((r) => r.cuentaOrigen),
    ...RAW.transferencias.map((r) => r.cuentaDestino),
  ].filter(Boolean))].sort();
}

/** Divisa de la cuenta: la más frecuente en sus movimientos (por defecto ARS). */
export function accountCurrency(cuenta) {
  const n = {};
  const add = (c) => { if (c) n[c] = (n[c] || 0) + 1; };
  RAW.gastos.forEach((r) => r.cuenta === cuenta && add(r.monedaCuenta));
  RAW.ingresos.forEach((r) => r.cuenta === cuenta && add(r.monedaCuenta));
  RAW.transferencias.forEach((r) => {
    if (r.cuentaOrigen === cuenta) add(r.monedaSaliente);
    if (r.cuentaDestino === cuenta) add(r.monedaEntrante || r.monedaSaliente);
  });
  const top = Object.entries(n).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : 'ARS';
}

/** Movimientos de una cuenta en su propia divisa (+ entra, − sale). */
export function accountMovements(cuenta) {
  const out = [];
  RAW.gastos.forEach((r) => r.cuenta === cuenta && out.push({ fecha: r.fecha, delta: -inAcc(r) }));
  RAW.ingresos.forEach((r) => r.cuenta === cuenta && out.push({ fecha: r.fecha, delta: inAcc(r) }));
  RAW.transferencias.forEach((r) => {
    if (r.cuentaOrigen === cuenta) out.push({ fecha: r.fecha, delta: -(r.montoSaliente ?? r.monto) });
    if (r.cuentaDestino === cuenta) out.push({ fecha: r.fecha, delta: r.montoEntrante ?? r.montoSaliente ?? r.monto });
  });
  return out;
}

export function flowAfter(cuenta, corte) {
  if (!corte) return null;
  return accountMovements(cuenta).filter((m) => m.fecha > corte).reduce((a, m) => a + m.delta, 0);
}

/** Saldo estimado hoy = saldo cargado + movimientos posteriores a su fecha de corte. */
export function estimatedBalance(cuenta, saldos = loadSaldos()) {
  const e = saldos[cuenta];
  if (!e) return null;
  return e.monto + (flowAfter(cuenta, e.fecha) || 0);
}

/**
 * Saldo que suma a los totales. Si la cuenta tiene "no sumar mi saldo", el monto cargado a mano queda afuera
 * y solo cuentan los movimientos registrados después de la fecha de corte.
 */
export function countedBalance(cuenta, saldos = loadSaldos()) {
  const e = saldos[cuenta];
  if (!e) return null;
  const est = estimatedBalance(cuenta, saldos);
  return e.noSumar ? est - e.monto : est;
}

/** Saldo a fin de cada mes, reconstruido hacia atrás desde el saldo estimado actual. */
export function monthEndBalances(cuenta, months, saldos = loadSaldos(), counted = false) {
  const e = saldos[cuenta];
  const est = estimatedBalance(cuenta, saldos);
  if (est === null) return null;
  const mv = accountMovements(cuenta);
  const out = {};
  months.forEach((m) => {
    const [y, mo] = m.split('-').map(Number);
    const end = `${m}-${String(new Date(y, mo, 0).getDate()).padStart(2, '0')}`;
    if (counted && e.noSumar) {
      // solo lo que se movió después del corte; antes del corte esta cuenta no aporta nada
      out[m] = end <= e.fecha ? 0 : mv.filter((x) => x.fecha > e.fecha && x.fecha <= end).reduce((a, x) => a + x.delta, 0);
    } else {
      out[m] = est - mv.filter((x) => x.fecha > end).reduce((a, x) => a + x.delta, 0);
    }
  });
  return out;
}
