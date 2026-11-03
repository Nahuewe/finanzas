// Única puerta de entrada a localStorage: claves con prefijo/versión, JSON y fallback si el storage está bloqueado.
const NS = 'finanzas:v1:';

// claves viejas que se migran automáticamente la primera vez que se leen
const LEGACY = {
  saldos: 'finanzas_saldos_v2',
  presupuestos: 'finanzas_presupuestos_v1',
  inflacionManual: 'finanzas_inflacion_v1',
  inflacionCache: 'finanzas_inflacion_api_v1',
};

export const store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(NS + key);
      if (raw !== null) return JSON.parse(raw);
      const old = LEGACY[key] && localStorage.getItem(LEGACY[key]);
      if (old !== null && old !== undefined) {
        const v = JSON.parse(old);
        this.set(key, v);
        return v;
      }
    } catch { /* storage bloqueado o JSON inválido */ }
    return fallback;
  },
  set(key, value) {
    try { localStorage.setItem(NS + key, JSON.stringify(value)); return true; } catch { return false; }
  },
  remove(key) {
    try {
      localStorage.removeItem(NS + key);
      if (LEGACY[key]) localStorage.removeItem(LEGACY[key]);
    } catch { /* nada */ }
  },
};
