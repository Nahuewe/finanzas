import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffData, signature } from '../src/scripts/diff.js';
import { percentile, nextMonths, projectScenarios } from '../src/scripts/projection.js';
import { budgetFactor, effectiveBudgets, budgetStatus } from '../src/scripts/budget.js';
import { monthsUntil, goalProgress } from '../src/scripts/goals.js';
import { buildMetrics, normConcept, groupConcepts, detectFixed } from '../src/scripts/metrics.js';
import { setRaw } from '../src/scripts/state.js';
import { accountCurrency, flowAfter, estimatedBalance, countedBalance, monthEndBalances } from '../src/scripts/accounts.js';
import { casaFromText } from '../src/scripts/externalData.js';

const g = (fecha, cat, monto, comentario = '', cuenta = 'Banco') => ({ fecha, cat, cuenta, monto, comentario });

// ── diff ──
test('diffData detecta altas, bajas y ediciones', () => {
  const prev = { gastos: [g('2026-01-01', 'Casa', 100, 'Alquiler'), g('2026-01-02', 'Comida', 50)], ingresos: [], transferencias: [] };
  const cur = { gastos: [g('2026-01-01', 'Casa', 100, 'Alquiler'), g('2026-01-02', 'Comida', 60), g('2026-01-05', 'Ocio', 30)], ingresos: [g('2026-01-31', 'Salario', 900)], transferencias: [] };
  const d = diffData(prev, cur);
  assert.equal(d.empty, false);
  assert.equal(d.added.gastos.length, 2, 'el editado y el nuevo');
  assert.equal(d.removed.gastos.length, 1, 'la versión vieja del editado');
  assert.equal(d.totals.gastos.added, 90);
  assert.equal(d.added.ingresos.length, 1);
});

test('diffData trata bien los duplicados exactos y los archivos iguales', () => {
  const two = { gastos: [g('2026-01-01', 'Café', 10), g('2026-01-01', 'Café', 10)], ingresos: [], transferencias: [] };
  const three = { gastos: [...two.gastos, g('2026-01-01', 'Café', 10)], ingresos: [], transferencias: [] };
  assert.equal(diffData(two, three).added.gastos.length, 1);
  assert.equal(diffData(two, two).empty, true);
  assert.equal(signature(two), signature(structuredClone(two)));
  assert.notEqual(signature(two), signature(three));
});

// ── proyección ──
test('percentile y nextMonths', () => {
  assert.equal(percentile([1, 2, 3, 4, 5], 0.5), 3);
  assert.equal(percentile([10, 20], 0.25), 12.5);
  assert.equal(percentile([], 0.5), 0);
  assert.deepEqual(nextMonths('2026-11', 3), ['2026-12', '2027-01', '2027-02']);
});

test('projectScenarios: sin inflación, serie constante → proyección constante', () => {
  const months = ['2026-01', '2026-02', '2026-03', '2026-04'];
  const monG = Object.fromEntries(months.map((m) => [m, 700]));
  const monI = Object.fromEntries(months.map((m) => [m, 1000]));
  const fixedByMonth = Object.fromEntries(months.map((m) => [m, 300]));
  const p = projectScenarios({ months, monG, monI, fixedByMonth, horizon: 3 });
  assert.equal(p.fixedBase, 300);
  assert.equal(p.levels.base.variables, 400);
  assert.deepEqual(p.scenarios.base.neto, [300, 300, 300]);
  assert.deepEqual(p.scenarios.base.acum, [300, 600, 900]);
  assert.deepEqual(p.projMonths, ['2026-05', '2026-06', '2026-07']);
});

test('projectScenarios: los escenarios quedan ordenados y la inflación esperada hace crecer los montos', () => {
  const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
  const monG = { '2026-01': 500, '2026-02': 900, '2026-03': 600, '2026-04': 800, '2026-05': 700, '2026-06': 750 };
  const monI = { '2026-01': 1000, '2026-02': 1200, '2026-03': 900, '2026-04': 1100, '2026-05': 1000, '2026-06': 1300 };
  const p = projectScenarios({ months, monG, monI, expectedInfl: 2, horizon: 6 });
  const end = (s) => p.scenarios[s].acum.at(-1);
  assert.ok(end('pesimista') < end('base') && end('base') < end('optimista'));
  assert.ok(p.scenarios.base.ing[5] > p.scenarios.base.ing[0], 'los montos nominales crecen con la inflación');
  assert.ok(Math.abs(p.scenarios.base.ing[0] / p.levels.base.ing - 1.02) < 1e-9);
});

test('projectScenarios: lleva los meses viejos a pesos de hoy con la inflación pasada', () => {
  const months = ['2026-01', '2026-02'];
  const p = projectScenarios({ months, monG: { '2026-01': 100, '2026-02': 110 }, monI: {}, inflOf: () => 10, horizon: 1 });
  // 100 de enero equivalen a 110 de febrero: en términos reales el gasto no cambió
  assert.ok(Math.abs(p.levels.base.variables - 110) < 1e-9);
});

// ── presupuesto ──
test('budgetFactor indexa por inflación solo si el ajuste está activo', () => {
  const infl = () => 10; // 10% acumulado entre cualquier par de meses
  assert.equal(budgetFactor('2026-05', { auto: false, base: '2026-01' }, infl), 1);
  assert.equal(budgetFactor('2026-01', { auto: true, base: '2026-01' }, infl), 1);
  assert.ok(Math.abs(budgetFactor('2026-05', { auto: true, base: '2026-01' }, infl) - 1.1) < 1e-9);
  assert.ok(Math.abs(budgetFactor('2025-11', { auto: true, base: '2026-01' }, infl) - 1 / 1.1) < 1e-9);
  assert.deepEqual(effectiveBudgets('2026-05', { Comida: 1000 }, { auto: true, base: '2026-01' }, infl), { Comida: 1100 });
});

test('budgetStatus marca excedidas y las que pasan el 80%', () => {
  const st = budgetStatus({ Comida: 1200, Ocio: 85, Casa: 10 }, { Comida: 1000, Ocio: 100, Casa: 100, Viajes: 500 });
  const by = Object.fromEntries(st.map((x) => [x.cat, x.state]));
  assert.deepEqual(by, { Comida: 'over', Ocio: 'near', Casa: 'ok', Viajes: 'ok' });
  assert.equal(st[0].cat, 'Comida', 'ordenadas de mayor a menor uso');
});

// ── metas ──
test('monthsUntil cuenta meses calendario restantes', () => {
  assert.equal(monthsUntil('2027-03-31', '2026-11-11'), 5);
  assert.equal(monthsUntil('2026-11-30', '2026-11-11'), 1);
  assert.equal(monthsUntil('2026-10-01', '2026-11-11'), 0);
  assert.equal(monthsUntil('', '2026-11-11'), null);
});

test('goalProgress calcula faltante, aporte mensual y estado', () => {
  const goal = { objetivo: 3000, fecha: '2027-03-31' };
  const p = goalProgress(goal, 1000, 500, '2026-11-11');
  assert.equal(p.falta, 2000);
  assert.equal(p.porMes, 400);
  assert.equal(p.eta, 4);
  assert.equal(p.estado, 'en-camino');
  assert.equal(goalProgress(goal, 1000, 100, '2026-11-11').estado, 'atrasada');
  assert.equal(goalProgress(goal, 3500, 0, '2026-11-11').estado, 'lograda');
  assert.equal(goalProgress(goal, 1000, null, '2026-11-11').estado, 'sin-ritmo');
  assert.equal(goalProgress({ objetivo: 3000, fecha: '2026-01-01' }, 1000, 500, '2026-11-11').estado, 'vencida');
});

// ── métricas ──
test('buildMetrics agrega por mes, categoría y día', () => {
  const gastos = [g('2026-01-10', 'Casa', 100), g('2026-01-10', 'Comida', 50), g('2026-02-01', 'Casa', 120)];
  const ingresos = [g('2026-01-31', 'Salario', 1000)];
  const m = buildMetrics(gastos, ingresos);
  assert.deepEqual(m.months, ['2026-01', '2026-02']);
  assert.equal(m.tG, 270);
  assert.equal(m.tI, 1000);
  assert.equal(m.monG['2026-01'], 150);
  assert.equal(m.byCatG.Casa, 220);
  assert.equal(m.catMonthG.Casa['2026-02'], 120);
  assert.equal(m.byDateG['2026-01-10'], 150);
});

test('normConcept ignora montos, paréntesis y mayúsculas', () => {
  assert.equal(normConcept('Pasaje a Japon (2334 USD)'), normConcept('pasaje a japon'));
  assert.equal(normConcept('Sueldo 1.500.000'), 'sueldo');
  const groups = groupConcepts([g('2026-01-01', 'Casa', 100, 'Alquiler enero 2026'), g('2026-02-01', 'Casa', 110, 'alquiler ENERO')]);
  assert.equal(groups.length, 1);
});

test('detectFixed encuentra gastos que se repiten casi todos los meses, aunque suban por inflación', () => {
  const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05'];
  const gastos = [
    ...months.map((m, k) => g(`${m}-03`, 'Casa', 100000 * 1.03 ** k, 'Alquiler')),
    g('2026-02-10', 'Ocio', 5000, 'Cine'), g('2026-04-11', 'Ocio', 90000, 'Recital'),
  ];
  const fixed = detectFixed(gastos);
  assert.deepEqual(fixed.map((f) => f.name), ['Alquiler']);
  assert.equal(fixed[0].months, 5);
});

// ── cuentas ──
test('saldos por cuenta: divisa, flujo posterior al corte y "no sumar mi saldo"', () => {
  setRaw({
    gastos: [{ ...g('2026-11-05', 'Vacaciones', 300000, '', 'Reserva USD'), montoCuenta: 200, monedaCuenta: 'USD' }],
    ingresos: [{ ...g('2026-11-08', 'Regalo', 150000, '', 'Reserva USD'), montoCuenta: 100, monedaCuenta: 'USD' }],
    transferencias: [
      { fecha: '2026-10-20', cuentaOrigen: 'Banco', cuentaDestino: 'Reserva USD', monto: 1500000, montoSaliente: 1500000, montoEntrante: 1000, monedaSaliente: 'ARS', monedaEntrante: 'USD' },
      { fecha: '2026-11-09', cuentaOrigen: 'Banco', cuentaDestino: 'Reserva USD', monto: 750000, montoSaliente: 750000, montoEntrante: 500, monedaSaliente: 'ARS', monedaEntrante: 'USD' },
    ],
  });
  assert.equal(accountCurrency('Reserva USD'), 'USD');
  assert.equal(accountCurrency('Banco'), 'ARS');
  assert.equal(flowAfter('Reserva USD', '2026-11-01'), -200 + 100 + 500);

  const saldos = { 'Reserva USD': { monto: 1000, fecha: '2026-11-01' } };
  assert.equal(estimatedBalance('Reserva USD', saldos), 1400);
  assert.equal(countedBalance('Reserva USD', saldos), 1400);
  assert.equal(estimatedBalance('Banco', saldos), null);

  const oculto = { 'Reserva USD': { monto: 1000, fecha: '2026-11-01', noSumar: true } };
  assert.equal(estimatedBalance('Reserva USD', oculto), 1400, 'el saldo de la cuenta sigue mostrándose completo');
  assert.equal(countedBalance('Reserva USD', oculto), 400, 'al total solo entran los movimientos posteriores al corte');

  const hist = monthEndBalances('Reserva USD', ['2026-10', '2026-11'], saldos);
  assert.equal(hist['2026-11'], 1400);
  assert.equal(hist['2026-10'], 1000, 'antes de los movimientos de noviembre');
  const histOculto = monthEndBalances('Reserva USD', ['2026-10', '2026-11'], oculto, true);
  assert.deepEqual(histOculto, { '2026-10': 0, '2026-11': 400 });
});

// ── dólar ──
test('casaFromText reconoce el tipo de dólar en el comentario', () => {
  assert.equal(casaFromText('200 dolares OFICIAL'), 'oficial');
  assert.equal(casaFromText('10,98 USD MEP'), 'bolsa');
  assert.equal(casaFromText('compré blue'), 'blue');
  assert.equal(casaFromText('Pasaje a Japón'), null);
});
