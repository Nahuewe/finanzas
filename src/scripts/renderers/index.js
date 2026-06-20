import { renderResumen } from './resumen.js';
import { renderGastos } from './gastos.js';
import { renderIngresos } from './ingresos.js';
import { renderFlujo } from './flujo.js';
import { renderAhorros } from './ahorros.js';

export function renderAll() {
  renderResumen();
  renderGastos();
  renderIngresos();
  renderFlujo();
  renderAhorros();
}

export { renderResumen, renderGastos, renderIngresos, renderFlujo, renderAhorros };
