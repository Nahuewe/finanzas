// Topes de presupuesto. Los montos se guardan en pesos del "mes base"; si el ajuste automático está activo,
// el tope de cada mes se indexa por la inflación (INDEC) acumulada desde ese mes base.
import { store } from './storage.js';
import { inflBetween } from './externalData.js';

export const NEAR = 0.8; // desde 80% del tope se avisa

export const loadBudgets = () => store.get('presupuestos', {}) || {};
export const saveBudgets = (b) => store.set('presupuestos', b);
export const loadBudgetMeta = () => ({ auto: false, base: null, ...(store.get('presupuestosMeta', {}) || {}) });
export const saveBudgetMeta = (m) => store.set('presupuestosMeta', m);

/** Factor por el que se multiplica un tope guardado para llevarlo al mes `ym`. */
export function budgetFactor(ym, meta = loadBudgetMeta(), infl = inflBetween) {
  if (!meta.auto || !meta.base || ym === meta.base) return 1;
  return ym > meta.base ? 1 + infl(meta.base, ym) / 100 : 1 / (1 + infl(ym, meta.base) / 100);
}

/** Topes vigentes para un mes (ya ajustados). */
export function effectiveBudgets(ym, budgets = loadBudgets(), meta = loadBudgetMeta(), infl = inflBetween) {
  const f = budgetFactor(ym, meta, infl);
  return Object.fromEntries(Object.entries(budgets).map(([c, v]) => [c, Math.round(v * f)]));
}

/** Estado de cada categoría con tope: 'over' (excedida), 'near' (≥80%), 'ok'. */
export function budgetStatus(spentByCat, budgets) {
  return Object.entries(budgets).map(([cat, tope]) => {
    const gastado = spentByCat[cat] || 0;
    const pct = tope ? gastado / tope : 0;
    return { cat, tope, gastado, pct, state: gastado > tope ? 'over' : pct >= NEAR ? 'near' : 'ok' };
  }).sort((a, b) => b.pct - a.pct);
}
