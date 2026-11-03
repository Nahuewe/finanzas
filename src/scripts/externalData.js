// Datos públicos (argentinadatos.com): inflación mensual INDEC y cotización del dólar.
import { store } from './storage.js';

const BASE = 'https://api.argentinadatos.com/v1';
const CACHE_MS = 12 * 3600 * 1000;

async function cached(key, url, reduce) {
  const c = store.get(key);
  if (c && Date.now() - c.t < CACHE_MS) return { data: c.data, ok: true };
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    const data = reduce(await res.json());
    store.set(key, { t: Date.now(), data });
    return { data, ok: true };
  } catch {
    return c ? { data: c.data, ok: true } : { data: null, ok: false };
  }
}

// ── Inflación ──
export const INFL = { data: {}, state: 'cargando' };

export async function loadInflation() {
  const r = await cached('inflacionCache', `${BASE}/finanzas/indices/inflacion`, (rows) => {
    const out = {};
    rows.forEach((x) => { if (x.fecha >= '2015' && typeof x.valor === 'number') out[x.fecha.slice(0, 7)] = x.valor; });
    return out;
  });
  INFL.data = r.data || {};
  INFL.state = r.ok ? 'ok' : 'error';
}

export const lastInflation = () => {
  const k = Object.keys(INFL.data).sort();
  return k.length ? { ym: k.at(-1), valor: INFL.data[k.at(-1)] } : null;
};

/** Inflación mensual de un mes; los meses sin publicar usan `fallback` o el último dato conocido. */
export function inflOf(ym, fallback = 0) {
  if (INFL.data[ym] !== undefined) return INFL.data[ym];
  return fallback || lastInflation()?.valor || 0;
}

/** Inflación acumulada (en %) de los meses posteriores a `from` hasta `to` inclusive. */
export function inflBetween(from, to, fallback = 0) {
  let f = 1;
  let [y, m] = from.split('-').map(Number);
  for (;;) {
    m++;
    if (m > 12) { m = 1; y++; }
    const ym = `${y}-${String(m).padStart(2, '0')}`;
    if (ym > to) break;
    f *= 1 + inflOf(ym, fallback) / 100;
  }
  return (f - 1) * 100;
}

// ── Dólar ──
export const CASAS = { bolsa: 'MEP', blue: 'Blue', oficial: 'Oficial' };
export const FX = { casa: store.get('fxCasa', 'bolsa'), monthly: {}, daily: {}, days: [], last: null, state: 'cargando' };

export async function loadFx(casa = FX.casa) {
  FX.casa = casa;
  store.set('fxCasa', casa);
  FX.state = 'cargando';
  const r = await cached(`fx2_${casa}`, `${BASE}/cotizaciones/dolares/${casa}`, (rows) => {
    const monthly = {}, daily = {};
    rows.forEach((x) => { if (x.fecha >= '2018') { monthly[x.fecha.slice(0, 7)] = x.venta; daily[x.fecha] = x.venta; } });
    const last = rows.at(-1);
    return { monthly, daily, last: last ? { fecha: last.fecha, venta: last.venta } : null };
  });
  FX.monthly = r.data?.monthly || {};
  FX.daily = r.data?.daily || {};
  FX.days = Object.keys(FX.daily).sort();
  FX.last = r.data?.last || null;
  FX.state = r.ok ? 'ok' : 'error';
}

/** Cotización del día (o del día hábil anterior más cercano). */
export function fxOnDay(fecha) {
  if (FX.daily[fecha]) return FX.daily[fecha];
  let lo = 0, hi = FX.days.length - 1, best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (FX.days[mid] <= fecha) { best = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return best >= 0 ? FX.daily[FX.days[best]] : 0;
}

/** Cotización de fin de mes (o la más cercana anterior). */
export function fxAt(ym) {
  if (FX.monthly[ym]) return FX.monthly[ym];
  const ks = Object.keys(FX.monthly).sort();
  const prev = ks.filter((k) => k <= ym).at(-1);
  return prev ? FX.monthly[prev] : FX.last?.venta || 0;
}
