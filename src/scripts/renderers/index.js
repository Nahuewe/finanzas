import { renderResumen } from './resumen.js';
import { renderGastos } from './gastos.js';
import { renderIngresos } from './ingresos.js';
import { renderFlujo } from './flujo.js';
import { renderAhorros } from './ahorros.js';
import { renderComentarios } from './comentarios.js';
import { renderCuentas } from './cuentas.js';
import { renderProyeccion } from './proyeccion.js';
import { renderPresupuesto } from './presupuesto.js';
import { renderPatrimonio } from './patrimonio.js';
import { renderAnalisis } from './analisis.js';
import { renderHabitos, renderResumenExtra } from './habitos.js';
import { renderMetas } from './metas.js';
import { renderFileDiff } from './fileDiff.js';

export function renderAll() {
  renderResumen();
  renderGastos();
  renderIngresos();
  renderFlujo();
  renderAhorros();
  renderComentarios();
  renderCuentas();
  renderProyeccion();
  renderPresupuesto();
  renderPatrimonio();
  renderAnalisis();
  renderHabitos();
  renderResumenExtra();
  renderMetas();
  renderFileDiff();
}

export { renderResumen, renderGastos, renderIngresos, renderFlujo, renderAhorros, renderComentarios, renderCuentas, renderProyeccion };
