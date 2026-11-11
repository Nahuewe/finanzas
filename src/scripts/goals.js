// Cálculo de metas de ahorro (función pura).

/** Meses calendario desde `from` hasta `to` (YYYY-MM-DD); 0 si ya pasó. */
export function monthsUntil(to, from) {
  if (!to) return null;
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  const n = (y2 - y1) * 12 + (m2 - m1) + (d2 >= d1 ? 0 : -1) + 1;
  return Math.max(0, n);
}

/**
 * @param goal    { objetivo, fecha }
 * @param actual  lo ya ahorrado (misma moneda que el objetivo)
 * @param ritmo   ahorro mensual reciente (misma moneda), o null si no se conoce
 * @param today   YYYY-MM-DD
 */
export function goalProgress(goal, actual, ritmo, today) {
  const objetivo = +goal.objetivo || 0;
  const falta = Math.max(0, objetivo - actual);
  const pct = objetivo ? Math.min(1, Math.max(0, actual / objetivo)) : 0;
  const meses = monthsUntil(goal.fecha, today);
  const porMes = falta === 0 ? 0 : meses === null ? null : falta / Math.max(1, meses);
  const eta = falta === 0 ? 0 : ritmo > 0 ? Math.ceil(falta / ritmo) : null;
  let estado;
  if (falta === 0) estado = 'lograda';
  else if (meses === 0) estado = 'vencida';
  else if (ritmo === null || ritmo === undefined || porMes === null) estado = 'sin-ritmo';
  else estado = ritmo >= porMes ? 'en-camino' : 'atrasada';
  return { objetivo, actual, falta, pct, meses, porMes, eta, estado };
}
