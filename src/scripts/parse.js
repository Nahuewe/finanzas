// Lectura del Excel como funciones puras (sin DOM), para poder probarlas y soportar otros formatos.
// Cada columna acepta alternativas separadas por "|": se usa la primera que exista en la hoja.

export const DEFAULT_COLMAP = {
  headerRow: 2,
  sheets: {
    gastos: 'Gastos',
    ingresos: 'Ingresos',
    transferencias: 'Transferencias',
  },
  cols: {
    fecha: 'Fecha y hora|Fecha',
    categoria: 'Categoría|Categoria',
    cuenta: 'Cuenta',
    monto: 'Cantidad en la divisa predeterminada|Monto|Importe',
    montoCuenta: 'Cantidad en la divisa de la cuenta',
    monedaCuenta: 'Divisa de la cuenta',
    montoTrans: 'Cantidad de la transacción en la divisa de la transacción',
    monedaTrans: 'Divisa de la transacción',
    comentario: 'Comentario|Descripción|Descripcion|Concepto',
    tOrigen: 'Saliente|Cuenta de origen|Cuenta origen|Origen|Desde',
    tDestino: 'Entrante|Cuenta de destino|Cuenta destino|Destino|Hacia',
    tMontoSal: 'Cantidad en divisa saliente|Cantidad en la divisa predeterminada|Cantidad',
    tMonedaSal: 'Divisa saliente',
    tMontoEnt: 'Cantidad en divisa entrante',
    tMonedaEnt: 'Divisa entrante',
  },
};

export const COLMAP_LABELS = {
  headerRow: 'Fila donde están los encabezados',
  'sheets.gastos': 'Hoja de gastos',
  'sheets.ingresos': 'Hoja de ingresos (igual a la de gastos = una sola hoja con montos + y −)',
  'sheets.transferencias': 'Hoja de transferencias (opcional)',
  'cols.fecha': 'Columna de fecha',
  'cols.categoria': 'Columna de categoría',
  'cols.cuenta': 'Columna de cuenta',
  'cols.monto': 'Columna de monto (en pesos)',
  'cols.comentario': 'Columna de comentario / descripción',
  'cols.montoCuenta': 'Monto en la divisa de la cuenta (opcional)',
  'cols.monedaCuenta': 'Divisa de la cuenta (opcional)',
  'cols.montoTrans': 'Monto en la divisa de la transacción (opcional)',
  'cols.monedaTrans': 'Divisa de la transacción (opcional)',
  'cols.tOrigen': 'Transferencias: cuenta de origen',
  'cols.tDestino': 'Transferencias: cuenta de destino',
  'cols.tMontoSal': 'Transferencias: monto que sale',
  'cols.tMonedaSal': 'Transferencias: divisa que sale (opcional)',
  'cols.tMontoEnt': 'Transferencias: monto que entra (opcional)',
  'cols.tMonedaEnt': 'Transferencias: divisa que entra (opcional)',
};

export function mergeColmap(over = {}) {
  return {
    headerRow: +over.headerRow || DEFAULT_COLMAP.headerRow,
    sheets: { ...DEFAULT_COLMAP.sheets, ...(over.sheets || {}) },
    cols: { ...DEFAULT_COLMAP.cols, ...(over.cols || {}) },
  };
}

const pad = (n) => String(n).padStart(2, '0');

/** Normaliza cualquier fecha (Date, serial de Excel, "2026-10-07 12:30", "7/10/2026") a YYYY-MM-DD. */
export function formatDate(v) {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date) return isNaN(v) ? '' : v.toISOString().split('T')[0];
  if (typeof v === 'number') return new Date(Math.round((v - 25569) * 86400000)).toISOString().split('T')[0];
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/); // día/mes/año
  if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${pad(m[2])}-${pad(m[1])}`;
  return s.split(' ')[0];
}

/** Convierte "1.234,56", "$ 1,234.56", "-500" o un número en Number (0 si no se puede). */
export function toNumber(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  if (v === null || v === undefined) return 0;
  let s = String(v).replace(/[^\d,.-]/g, '');
  if (!s) return 0;
  const lastComma = s.lastIndexOf(','), lastDot = s.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    // el separador que aparece último es el decimal
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lastComma > -1) {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

const alts = (spec) => String(spec || '').split('|').map((x) => x.trim()).filter(Boolean);

function pick(row, spec) {
  for (const k of alts(spec)) {
    if (row[k] !== undefined && row[k] !== '' && row[k] !== null) return row[k];
  }
  return undefined;
}

/** Filas crudas (matriz) → objetos usando la fila de encabezados indicada (1 = primera fila). */
export function rowsToObjects(rows, headerRow = 2) {
  if (!rows || rows.length < headerRow) return [];
  const header = (rows[headerRow - 1] || []).map((h) => String(h ?? '').trim());
  return rows.slice(headerRow).filter((r) => r && r.some((c) => c !== undefined && c !== null && c !== '')).map((r) => {
    const o = {};
    header.forEach((h, i) => { if (h) o[h] = r[i]; });
    return o;
  });
}

function findSheet(sheets, spec) {
  const names = Object.keys(sheets);
  for (const want of alts(spec)) {
    const hit = names.find((n) => n.trim().toLowerCase() === want.toLowerCase());
    if (hit) return hit;
  }
  return null;
}

// "10,98 USD MEP" / "600 dolares ..." — la app a veces redondea el monto de la transacción
const USD_RE = /(\d+(?:[.,]\d+)?)\s*(?:usd|u\$s|d[oó]lares|dolarukos)/i;

function mapRow(r, cols) {
  const comentario = String(pick(r, cols.comentario) ?? '');
  const montoCuenta = toNumber(pick(r, cols.montoCuenta)) || undefined;
  const monedaCuenta = pick(r, cols.monedaCuenta) || undefined;
  const montoTrans = toNumber(pick(r, cols.montoTrans)) || undefined;
  const monedaTrans = pick(r, cols.monedaTrans) || undefined;
  // usd: dólares reales de la operación, porque la cuenta es en USD o porque se pagó en USD desde una cuenta en pesos
  let usd;
  if (monedaCuenta === 'USD') usd = montoCuenta;
  else if (monedaTrans === 'USD' && montoTrans) {
    usd = montoTrans;
    const m = comentario.match(USD_RE);
    const exact = m ? parseFloat(m[1].replace(',', '.')) : 0;
    if (exact && Math.abs(exact - usd) / usd < 0.06) usd = exact;
  }
  return {
    fecha: formatDate(pick(r, cols.fecha)),
    cat: String(pick(r, cols.categoria) ?? ''),
    cuenta: String(pick(r, cols.cuenta) ?? ''),
    monto: toNumber(pick(r, cols.monto)),
    montoCuenta,
    monedaCuenta,
    usd,
    comentario,
  };
}

function mapTransfer(r, cols) {
  const sal = toNumber(pick(r, cols.tMontoSal));
  const ent = toNumber(pick(r, cols.tMontoEnt));
  const monedaSaliente = pick(r, cols.tMonedaSal) || 'ARS';
  const monedaEntrante = pick(r, cols.tMonedaEnt) || monedaSaliente;
  return {
    fecha: formatDate(pick(r, cols.fecha)),
    cuentaOrigen: String(pick(r, cols.tOrigen) ?? ''),
    cuentaDestino: String(pick(r, cols.tDestino) ?? ''),
    // `monto` siempre en pesos: si la salida es en otra divisa, se toma el lado en ARS
    monto: monedaSaliente !== 'ARS' && monedaEntrante === 'ARS' ? ent : sal,
    montoSaliente: sal,
    montoEntrante: ent || sal,
    monedaSaliente,
    monedaEntrante,
    comentario: String(pick(r, cols.comentario) ?? ''),
  };
}

/**
 * sheets: { nombreDeHoja: matriz de filas }.
 * Devuelve { gastos, ingresos, transferencias, info } con info.mode = 'hojas' | 'una-hoja'.
 */
export function buildData(sheets, colmap = DEFAULT_COLMAP) {
  const cm = mergeColmap(colmap);
  const names = Object.keys(sheets);
  let sg = findSheet(sheets, cm.sheets.gastos);
  let si = findSheet(sheets, cm.sheets.ingresos);
  const st = findSheet(sheets, cm.sheets.transferencias);

  // un solo libro sin las hojas esperadas: se toma la primera hoja y se separa por signo
  if (!sg && !si && names.length) sg = si = names.find((n) => n !== st) || names[0];
  const single = sg && sg === si;
  const objs = (name) => (name ? rowsToObjects(sheets[name], cm.headerRow) : []);

  let gastos, ingresos;
  if (single) {
    const all = objs(sg).map((r) => mapRow(r, cm.cols)).filter((r) => r.monto !== 0 && r.fecha);
    gastos = all.filter((r) => r.monto < 0).map((r) => ({ ...r, monto: -r.monto }));
    ingresos = all.filter((r) => r.monto > 0);
  } else {
    gastos = objs(sg).map((r) => mapRow(r, cm.cols)).map((r) => ({ ...r, monto: Math.abs(r.monto) })).filter((r) => r.monto > 0);
    ingresos = objs(si).map((r) => mapRow(r, cm.cols)).map((r) => ({ ...r, monto: Math.abs(r.monto) })).filter((r) => r.monto > 0);
  }
  const transferencias = objs(st).map((r) => mapTransfer(r, cm.cols)).filter((r) => r.monto > 0 && r.cuentaOrigen && r.cuentaDestino);

  return { gastos, ingresos, transferencias, info: { mode: single ? 'una-hoja' : 'hojas', sheets: { gastos: sg, ingresos: si, transferencias: st } } };
}
