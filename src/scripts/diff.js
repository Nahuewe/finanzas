// Comparación entre dos cargas del Excel (funciones puras).

const TYPES = ['gastos', 'ingresos', 'transferencias'];

const keyOf = (r) => [
  r.fecha,
  r.cat ?? r.cuentaOrigen ?? '',
  r.cuenta ?? r.cuentaDestino ?? '',
  Math.round((r.monto || 0) * 100),
  r.comentario || '',
].join('|');

/** Huella del contenido: sirve para saber si dos cargas son el mismo archivo. */
export function signature(raw) {
  return TYPES.map((t) => {
    const rows = raw?.[t] || [];
    const total = rows.reduce((a, r) => a + (r.monto || 0), 0);
    const last = rows.reduce((a, r) => (r.fecha > a ? r.fecha : a), '');
    return `${rows.length}:${Math.round(total)}:${last}`;
  }).join('/');
}

/**
 * Movimientos agregados y quitados entre la carga anterior y la actual.
 * Un movimiento editado aparece como uno quitado + uno agregado.
 */
export function diffData(prev, cur) {
  const out = { added: {}, removed: {}, totals: {}, empty: true };
  TYPES.forEach((t) => {
    const left = new Map();
    (prev?.[t] || []).forEach((r) => {
      const k = keyOf(r);
      const e = left.get(k);
      if (e) e.push(r); else left.set(k, [r]);
    });
    const added = [];
    (cur?.[t] || []).forEach((r) => {
      const e = left.get(keyOf(r));
      if (e && e.length) e.pop(); else added.push(r);
    });
    const removed = [...left.values()].flat();
    out.added[t] = added;
    out.removed[t] = removed;
    out.totals[t] = {
      added: added.reduce((a, r) => a + r.monto, 0),
      removed: removed.reduce((a, r) => a + r.monto, 0),
    };
    if (added.length || removed.length) out.empty = false;
  });
  return out;
}
