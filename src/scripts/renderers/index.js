import { renderResumen } from './resumen.js';
import { renderGastos } from './gastos.js';
import { renderIngresos } from './ingresos.js';
import { renderFlujo } from './flujo.js';
import { renderAhorros } from './ahorros.js';
import { renderComentarios } from './comentarios.js';
import { renderCuentas } from './cuentas.js';
import { renderProyeccion } from './proyeccion.js';

export function renderAll() {
  renderResumen();
  renderGastos();
  renderIngresos();
  renderFlujo();
  renderAhorros();
  renderComentarios();
  renderCuentas();
  renderProyeccion();
}

export { renderResumen, renderGastos, renderIngresos, renderFlujo, renderAhorros, renderComentarios, renderCuentas, renderProyeccion };
