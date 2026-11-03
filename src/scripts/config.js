import { store } from './storage.js';

// Reglas de detección configurables (palabras clave separadas por coma, sin distinguir mayúsculas).
export const DEFAULT_CONFIG = {
  ahorro: 'ahorro, inversi',
  inversiones: 'inversi',
  compraDolares: 'dolar',
  suscripciones: 'suscrip',
  hormiga: 'chatarra, snack, kiosc, golosina, café, cafe',
  ocio: 'ocio',
  regalos: 'regalo',
  educacion: 'educaci',
  cuentasReserva: 'reserva',
  duplicados: 'onedrive|google drive|gdrive|icloud|dropbox; netflix|disney|hbo|prime|star+|paramount; spotify|youtube music|deezer|apple music',
  ocioGrande: 100000,
  objetivoAhorro: 20,
  mesesColchon: 3,
};

export const CONFIG_LABELS = {
  ahorro: 'Categorías de ahorro (no cuentan como consumo)',
  inversiones: 'Categorías de inversión',
  compraDolares: 'Categorías donde registrás compra de dólares (pagadas con cuentas en pesos)',
  suscripciones: 'Categorías de suscripciones',
  hormiga: 'Categorías de gasto hormiga',
  ocio: 'Categorías de ocio',
  regalos: 'Categorías de regalos',
  educacion: 'Categorías de educación',
  cuentasReserva: 'Cuentas a excluir (reservas)',
  duplicados: 'Servicios que se solapan (grupos separados por ; y servicios por |)',
  ocioGrande: 'Compra de ocio "grande" desde $',
  objetivoAhorro: 'Objetivo de tasa de ahorro (%)',
  mesesColchon: 'Meses de gasto para el colchón',
};

export function getConfig() {
  return { ...DEFAULT_CONFIG, ...(store.get('config', {}) || {}) };
}

export function setConfig(partial) {
  store.set('config', { ...(store.get('config', {}) || {}), ...partial });
}

export function resetConfig() {
  store.remove('config');
}

const norm = (s) => String(s || '').toLowerCase();

/** Devuelve un test (nombre) => boolean para una regla de palabras clave. */
export function matcher(key) {
  const words = norm(getConfig()[key]).split(',').map((w) => w.trim()).filter(Boolean);
  return (name) => {
    const n = norm(name);
    return words.some((w) => n.includes(w));
  };
}

export function duplicateGroups() {
  return String(getConfig().duplicados || '')
    .split(';')
    .map((g) => g.split('|').map((x) => norm(x).trim()).filter(Boolean))
    .filter((g) => g.length > 1);
}
