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
const EMPTY_FX = () => ({ monthly: {}, daily: {}, days: [], last: null });

/** Series por tipo de dólar. FX apunta siempre a la casa elegida por el usuario. */
export const FXALL = {};
export const FX = { casa: store.get('fxCasa', 'bolsa'), ...EMPTY_FX(), state: 'cargando' };

async function loadCasa(casa) {
  const r = await cached(`fx2_${casa}`, `${BASE}/cotizaciones/dolares/${casa}`, (rows) => {
    const monthly = {}, daily = {};
    rows.forEach((x) => { if (x.fecha >= '2018') { monthly[x.fecha.slice(0, 7)] = x.venta; daily[x.fecha] = x.venta; } });
    const last = rows.at(-1);
    return { monthly, daily, last: last ? { fecha: last.fecha, venta: last.venta } : null };
  });
  FXALL[casa] = r.data ? { ...r.data, days: Object.keys(r.data.daily || {}).sort() } : EMPTY_FX();
  return r.ok;
}

export async function loadFx(casa = FX.casa) {
  FX.casa = casa;
  store.set('fxCasa', casa);
  FX.state = 'cargando';
  const ok = await loadCasa(casa);
  Object.assign(FX, FXALL[casa]);
  FX.state = ok ? 'ok' : 'error';
}

/** Carga en segundo plano los otros tipos de dólar (para auditar operaciones "OFICIAL", "MEP", "BLUE"). */
export async function loadFxOthers() {
  await Promise.all(Object.keys(CASAS).filter((c) => !FXALL[c]).map(loadCasa));
}

/** Tipo de dólar mencionado en un texto ("200 dolares OFICIAL" → 'oficial'), o null. */
export function casaFromText(text) {
  const t = String(text || '').toLowerCase();
  if (/\boficial\b/.test(t)) return 'oficial';
  if (/\bmep\b|\bbolsa\b/.test(t)) return 'bolsa';
  if (/\bblue\b/.test(t)) return 'blue';
  return null;
}

/** Cotización del día (o del día hábil anterior más cercano) para la casa indicada. */
export function fxOnDay(fecha, casa = FX.casa) {
  const d = FXALL[casa] || FX;
  if (d.daily[fecha]) return d.daily[fecha];
  let lo = 0, hi = d.days.length - 1, best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (d.days[mid] <= fecha) { best = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return best >= 0 ? d.daily[d.days[best]] : 0;
}

/** Cotización de mercado para una operación: usa el tipo de dólar que diga el comentario, si lo dice. */
export function marketRate(fecha, text) {
  const hinted = casaFromText(text);
  const casa = hinted && FXALL[hinted]?.days.length ? hinted : FX.casa;
  return { casa, rate: fxOnDay(fecha, casa) };
}

/** Cotización de fin de mes (o la más cercana anterior). */
export function fxAt(ym) {
  if (FX.monthly[ym]) return FX.monthly[ym];
  const ks = Object.keys(FX.monthly).sort();
  const prev = ks.filter((k) => k <= ym).at(-1);
  return prev ? FX.monthly[prev] : FX.last?.venta || 0;
}
