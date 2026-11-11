// Guarda la última carga (y la anterior) en IndexedDB del navegador: nada sale del equipo.
import { signature } from './diff.js';

const DB = 'finanzas';
const STORE = 'cargas';

/** Carga en uso y la anterior (para comparar). null si se está usando el demo o no hay nada guardado. */
export const SESSION = { current: null, previous: null };

function open() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('sin IndexedDB')); return; }
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); resolve(req?.result); };
    t.onerror = () => { db.close(); reject(t.error); };
  });
}

const get = (key) => tx('readonly', (s) => s.get(key)).catch(() => null);
const set = (key, val) => tx('readwrite', (s) => s.put(val, key)).catch(() => null);
const del = (key) => tx('readwrite', (s) => s.delete(key)).catch(() => null);

/** Guarda una carga nueva. Si el contenido cambió, la que estaba pasa a ser "la anterior". */
export async function saveSnapshot(name, raw) {
  const sig = signature(raw);
  const cur = await get('current');
  if (cur && cur.sig !== sig) {
    await set('previous', cur);
    SESSION.previous = cur;
  } else {
    SESSION.previous = (await get('previous')) || null;
  }
  const snap = { name, savedAt: cur && cur.sig === sig ? cur.savedAt : Date.now(), sig, raw };
  await set('current', snap);
  SESSION.current = snap;
  return snap;
}

export async function loadSnapshot() {
  const cur = await get('current');
  if (!cur?.raw) return null;
  SESSION.current = cur;
  SESSION.previous = (await get('previous')) || null;
  return cur;
}

export async function forgetSnapshots() {
  await del('current');
  await del('previous');
  SESSION.current = SESSION.previous = null;
}
