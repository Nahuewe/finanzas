import { groupBy, groupByMon, sum, esc } from './helpers.js';
import { matcher } from './config.js';
import { inflBetween } from './externalData.js';

/** Todos los agregados que usan los renderers, calculados una sola vez por cambio de filtros. */
export function buildMetrics(g, i) {
  const monG = groupByMon(g);
  const monI = groupByMon(i);
  const months = [...new Set([...Object.keys(monG), ...Object.keys(monI)])].sort();
  const catMonthG = {};
  const byDateG = {};
  g.forEach((r) => {
    const m = r.fecha?.slice(0, 7);
    if (m) {
      const c = (catMonthG[r.cat] = catMonthG[r.cat] || {});
      c[m] = (c[m] || 0) + r.monto;
    }
    if (r.fecha) byDateG[r.fecha] = (byDateG[r.fecha] || 0) + r.monto;
  });
  return {
    monG, monI, months,
    gMonths: Object.keys(monG).sort(),
    iMonths: Object.keys(monI).sort(),
    tG: sum(g), tI: sum(i),
    byCatG: groupBy(g, 'cat'), byCatI: groupBy(i, 'cat'),
    catMonthG, byDateG,
  };
}

export const EMPTY_METRICS = buildMetrics([], []);

/** Normaliza un concepto: "Pasaje a japon (2334 USD)" y "pasaje a japon" son el mismo. */
export const normConcept = (s) =>
  String(s || '').toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[0-9.,$]+/g, ' ').replace(/[^\p{L}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

/** Agrupa gastos por concepto normalizado (categoría + comentario). */
export function groupConcepts(g) {
  const groups = {};
  g.forEach((r) => {
    const c = normConcept(r.comentario);
    if (c.length < 2) return;
    const k = r.cat + '||' + c;
    (groups[k] = groups[k] || { cat: r.cat, name: r.comentario, key: c, items: [] }).items.push(r);
  });
  return Object.values(groups);
}

/** Gastos fijos: concepto presente en la mayoría de los meses con monto estable. */
export function detectFixed(g) {
  const months = new Set(g.map((r) => r.fecha?.slice(0, 7)).filter(Boolean));
  const minMonths = Math.max(3, Math.ceil(months.size * 0.6));
  const fixed = [];
  groupConcepts(g).forEach((gr) => {
    const vals = Object.values(groupByMon(gr.items));
    if (vals.length < minMonths) return;
    const mean = vals.reduce((a, v) => a + v, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length);
    // una serie con inflación sostenida también es "fija": se mide el desvío mes a mes
    const steps = vals.slice(1).map((v, k) => Math.abs(v / vals[k] - 1));
    const stepAvg = steps.length ? steps.reduce((a, v) => a + v, 0) / steps.length : 1;
    if (sd / mean < 0.35 || stepAvg < 0.12) fixed.push({ ...gr, total: sum(gr.items), avg: mean, months: vals.length });
  });
  return fixed.sort((a, b) => b.total - a.total);
}

/**
 * Suscripciones cuyo precio subió más que la inflación acumulada entre el cobro anterior y el último.
 * Devuelve una fila por suscripción con su evolución.
 */
export function subscriptionChanges(g, fallbackInfl = 0) {
  const isSub = matcher('suscripciones');
  const subs = g.filter((r) => isSub(r.cat));
  const out = [];
  groupConcepts(subs).forEach((gr) => {
    const byMonth = groupByMon(gr.items);
    const ms = Object.keys(byMonth).sort();
    if (ms.length < 2) return;
    const last = ms.at(-1), prev = ms.at(-2);
    const pct = (byMonth[last] / byMonth[prev] - 1) * 100;
    const infl = inflBetween(prev, last, fallbackInfl);
    out.push({
      name: gr.name, cat: gr.cat, last, prev,
      lastAmt: byMonth[last], prevAmt: byMonth[prev],
      pct, infl, excess: pct - infl, months: ms.length,
      yearly: byMonth[last] * 12,
    });
  });
  return out.sort((a, b) => b.excess - a.excess);
}

