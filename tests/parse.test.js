import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, toNumber, rowsToObjects, buildData } from '../src/scripts/parse.js';

const HEAD = ['Fecha y hora', 'Categoría', 'Cuenta', 'Cantidad en la divisa predeterminada', 'Divisa predeterminada', 'Cantidad en la divisa de la cuenta', 'Divisa de la cuenta', 'Cantidad de la transacción en la divisa de la transacción', 'Divisa de la transacción', 'Etiquetas', 'Comentario'];
const T_HEAD = ['Fecha y hora', 'Saliente', 'Entrante', 'Cantidad en divisa saliente', 'Divisa saliente', 'Cantidad en divisa entrante', 'Divisa entrante', 'Comentario'];

test('formatDate acepta serial de Excel, ISO, día/mes/año y Date', () => {
  assert.equal(formatDate(46302), '2026-10-07');
  assert.equal(formatDate('2026-10-07 12:30:00'), '2026-10-07');
  assert.equal(formatDate('7/10/2026'), '2026-10-07');
  assert.equal(formatDate('07-10-26'), '2026-10-07');
  assert.equal(formatDate(new Date('2026-10-07T12:00:00Z')), '2026-10-07');
  assert.equal(formatDate(''), '');
});

test('toNumber entiende formato argentino e inglés', () => {
  assert.equal(toNumber('1.234,56'), 1234.56);
  assert.equal(toNumber('$ 1,234.56'), 1234.56);
  assert.equal(toNumber('-500'), -500);
  assert.equal(toNumber('10,98'), 10.98);
  assert.equal(toNumber(42), 42);
  assert.equal(toNumber('abc'), 0);
});

test('rowsToObjects usa la fila de encabezados indicada y saltea filas vacías', () => {
  const rows = [['Título'], ['A', 'B'], [1, 2], [], [3, 4]];
  assert.deepEqual(rowsToObjects(rows, 2), [{ A: 1, B: 2 }, { A: 3, B: 4 }]);
});

test('buildData lee el formato de Spendee (3 hojas)', () => {
  const sheets = {
    Gastos: [['Lista de gastos'], HEAD,
      [46302, 'Dolares', 'Naranja X', 924000, 'ARS', 924000, 'ARS', 600, 'USD', '', '600 dolares para completar el pasaje'],
      [46302, 'Vacaciones', 'Reserva Dolares', 303998.84, 'ARS', 200, 'USD', '', '', '', 'Pasaje (200 USD)'],
      [45356, 'Dolares', 'Naranja X', 11000, 'ARS', 11000, 'ARS', 11, 'USD', '', '10,98 USD MEP'],
      [46302, 'Casa', 'Banco', 0, 'ARS', 0, 'ARS', '', '', '', 'monto cero se descarta']],
    Ingresos: [['Lista de ingresos'], HEAD, [46302, 'Salario', 'Banco', 1500000, 'ARS', 1500000, 'ARS', '', '', '', 'Sueldo']],
    Transferencias: [['Lista de transferencias'], T_HEAD,
      [45687, 'Reserva Pesos', 'Reserva Dolares', 3050000, 'ARS', 2500, 'USD', ''],
      [45700, 'Reserva Dolares', 'Banco', 100, 'USD', 120000, 'ARS', 'venta']],
  };
  const d = buildData(sheets);
  assert.equal(d.info.mode, 'hojas');
  assert.equal(d.gastos.length, 3);
  assert.equal(d.ingresos.length, 1);

  const [compra, enUsd, redondeado] = d.gastos;
  assert.equal(compra.fecha, '2026-10-07');
  assert.equal(compra.usd, 600, 'USD de la transacción pagada desde una cuenta en pesos');
  assert.equal(enUsd.usd, 200, 'USD de una cuenta en dólares');
  assert.equal(enUsd.monedaCuenta, 'USD');
  assert.equal(redondeado.usd, 10.98, 'usa el monto exacto del comentario cuando la app lo redondeó');

  const [aUsd, aPesos] = d.transferencias;
  assert.equal(aUsd.monto, 3050000);
  assert.equal(aUsd.montoEntrante, 2500);
  assert.equal(aUsd.monedaEntrante, 'USD');
  assert.equal(aPesos.monto, 120000, 'el monto queda siempre en pesos aunque salga en dólares');
});

test('buildData separa por signo cuando hay una sola hoja (export de banco)', () => {
  const sheets = { Movimientos: [['Fecha', 'Concepto', 'Importe'], ['01/11/2026', 'Supermercado', '-12.500,50'], ['05/11/2026', 'Sueldo', '900.000,00']] };
  const d = buildData(sheets, { headerRow: 1 });
  assert.equal(d.info.mode, 'una-hoja');
  assert.deepEqual(d.gastos.map((r) => [r.fecha, r.monto, r.comentario]), [['2026-11-01', 12500.5, 'Supermercado']]);
  assert.deepEqual(d.ingresos.map((r) => [r.fecha, r.monto]), [['2026-11-05', 900000]]);
});

test('buildData respeta un mapeo de columnas propio', () => {
  const sheets = { Egresos: [['Dia', 'Rubro', 'Total'], ['2026-01-02', 'Comida', 100]], Entradas: [['Dia', 'Rubro', 'Total'], ['2026-01-03', 'Sueldo', 500]] };
  const d = buildData(sheets, { headerRow: 1, sheets: { gastos: 'Egresos', ingresos: 'Entradas' }, cols: { fecha: 'Dia', categoria: 'Rubro', monto: 'Total' } });
  assert.equal(d.gastos[0].cat, 'Comida');
  assert.equal(d.ingresos[0].monto, 500);
});
