function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const START = new Date(2023, 10, 1);
const END = new Date(2026, 8, 30);
const INFLATION = 1.028;

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const round = (n) => Math.max(100, Math.round(n / 100) * 100);

const COMMENTS = {
  Snacks: ['Almacén esquina', 'Kiosco de la facultad', 'Golosinas', 'Máquina expendedora'],
  Café: ['Café de la oficina', 'Cafetería centro', 'Medialunas y café'],
  Alimentación: ['Resto del barrio', 'Pedido a domicilio', 'Cena japonesa', 'Supermercado', 'Verdulería', 'Almuerzo menú ejecutivo'],
  Transporte: ['Recarga tarjeta bus', 'Viaje en app', 'Combustible'],
  Salud: ['Consulta médica', 'Farmacia', 'Odontólogo', 'Análisis clínicos'],
  Ocio: ['Entradas cine', 'Salida con amigos', 'Entradas show en vivo', 'Compra tienda online'],
  'Entretenimiento digital': ['Tienda de juegos PC', 'Pase de batalla', 'Juego online nuevo', 'DLC descuento'],
  Regalos: ['Cumpleaños amigo', 'Regalo familiar', 'Presente especial'],
  Tecnología: ['Accesorio PC', 'Auriculares', 'Cable y cargador'],
  Casa: ['Ferretería', 'Reparación hogar', 'Artículos de limpieza']
};

const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

function build() {
  const r = rng(20260930);
  const gastos = [];
  const ingresos = [];
  const transferencias = [];
  const add = (fecha, cat, cuenta, monto, comentario) => gastos.push({ fecha, cat, cuenta, monto: round(monto), comentario });

  let monthIdx = -1;
  for (let d = new Date(START); d <= END; d.setDate(d.getDate() + 1)) {
    const day = d.getDate();
    const dow = d.getDay();
    const f = iso(d);
    const weekend = dow === 0 || dow === 6;
    const fri = dow === 5;

    if (day === 1) monthIdx++;
    const k = Math.pow(INFLATION, Math.max(monthIdx, 0));
    const ym = f.slice(0, 7);

    if (r() < (weekend || fri ? 0.7 : 0.45)) add(f, 'Snacks', 'Billetera A', (800 + r() * 2200) * k, pick(r, COMMENTS.Snacks));
    if (!weekend && r() < 0.5) add(f, 'Café', 'Billetera A', (1800 + r() * 1800) * k, pick(r, COMMENTS['Café']));
    if (r() < (weekend ? 0.7 : 0.3)) add(f, 'Alimentación', r() < 0.6 ? 'Tarjeta B' : 'Billetera A', (6000 + r() * 12000) * (weekend ? 1.5 : 1) * k, pick(r, COMMENTS['Alimentación']));
    if (!weekend && r() < 0.55) add(f, 'Transporte', 'Billetera A', (900 + r() * 2200) * k, r() < 0.7 ? 'Recarga tarjeta bus' : pick(r, COMMENTS.Transporte));
    if (r() < 0.04) add(f, 'Salud', 'Tarjeta B', (12000 + r() * 40000) * k, pick(r, COMMENTS.Salud));
    if (r() < (weekend ? 0.09 : 0.03)) add(f, 'Ocio', 'Tarjeta B', (10000 + r() * 45000) * k, pick(r, COMMENTS.Ocio));
    if (r() < 0.05) add(f, 'Entretenimiento digital', 'Tarjeta B', (5000 + r() * 22000) * k, pick(r, COMMENTS['Entretenimiento digital']));
    if (r() < 0.03) add(f, 'Casa', 'Tarjeta B', (8000 + r() * 30000) * k, pick(r, COMMENTS.Casa));
    if (r() < 0.012) add(f, 'Tecnología', 'Tarjeta B', (25000 + r() * 120000) * k, pick(r, COMMENTS['Tecnología']));
    if (r() < 0.02) add(f, 'Regalos', 'Billetera A', (12000 + r() * 40000) * k, pick(r, COMMENTS.Regalos));

    if (day === 3) add(f, 'Casa', 'Banco C', 140000 * k, 'Alquiler');
    if (day === 5) add(f, 'Salud', 'Tarjeta B', 18000 * k, 'Gimnasio');
    if (day === 8) add(f, 'Casa', 'Tarjeta B', 14000 * k, 'Internet hogar');
    if (day === 10 && monthIdx >= 4) {
      const ars = round((60000 + r() * 60000) * k);
      add(f, 'Ahorro dólares', 'Banco C', ars, 'Compra divisa MEP');
      const rate = 900 * Math.pow(1.012, monthIdx);
      transferencias.push({ fecha: f, cuentaOrigen: 'Banco C', cuentaDestino: 'Cuenta USD', monto: ars, montoSaliente: ars, montoEntrante: Math.round((ars / rate) * 100) / 100, monedaSaliente: 'ARS', monedaEntrante: 'USD', comentario: 'Compra divisa MEP' });
    }
    if (day === 20) add(f, 'Suscripciones', 'Tarjeta B', 9000 * k, 'Plataforma video 1');
    if (day === 22) add(f, 'Suscripciones', 'Tarjeta B', 5200 * k, 'Plataforma música');
    if (day === 25) add(f, 'Casa', 'Tarjeta B', 22000 * k, 'Impuesto mensual');
    if (day === 12 && monthIdx >= 18) add(f, 'Suscripciones', 'Tarjeta B', 7500 * k, 'Plataforma video 2');
    if (ym === '2024-11' && day === 18) add(f, 'Suscripciones', 'Tarjeta B', 85000, 'Membresía gaming anual');
    if (ym === '2025-02' && day === 10) add(f, 'Viajes', 'Tarjeta B', 520000 * k, 'Pasaje aéreo ida y vuelta');
    if (ym === '2025-02' && day === 14) add(f, 'Viajes', 'Tarjeta B', 180000 * k, 'Alojamiento fin de semana');
    if (ym === '2025-12' && day === 3) add(f, 'Viajes', 'Tarjeta B', 780000 * k, 'Pasaje destino internacional');
    if (ym === '2026-01' && [6, 9, 12, 15, 18].includes(day)) add(f, 'Viajes', 'Tarjeta B', (160000 + r() * 120000) * k, 'Gastos estadía exterior');
    if (ym === '2024-09' && day === 5) add(f, 'Regalos', 'Tarjeta B', 150000 * k, 'Evento familiar');
    if (ym === '2025-06' && day === 10) add(f, 'Ocio', 'Tarjeta B', 110000 * k, 'Coleccionables tienda online');
    if (ym === '2026-05' && day === 12) add(f, 'Salud', 'Tarjeta B', 90000 * k, 'Odontólogo');
  }

  let m = -1;
  for (let y = 2023, mo = 10; y < 2026 || mo <= 8; mo++) {
    if (mo > 11) { mo = 0; y++; }
    if (y === 2026 && mo > 8) break;
    m++;
    const k = Math.pow(INFLATION, m);
    const last = new Date(y, mo + 1, 0).getDate();
    const ym = `${y}-${String(mo + 1).padStart(2, '0')}`;
    const mes = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][mo];
    const sueldo = 800000 * k * (1 + (m > 17 ? 0.06 : 0));
    ingresos.push({ fecha: `${ym}-${last}`, cat: 'Salario', cuenta: 'Banco C', monto: round(sueldo), comentario: `Sueldo ${mes}` });
    if (mo === 5 || mo === 11) ingresos.push({ fecha: `${ym}-${last - 3}`, cat: 'Salario', cuenta: 'Banco C', monto: round(sueldo * 0.5), comentario: `Aguinaldo ${mes}` });
    if (m % 4 === 2) ingresos.push({ fecha: `${ym}-14`, cat: 'Freelance', cuenta: 'Billetera A', monto: round((180000 + r() * 220000) * k), comentario: `Proyecto cliente ${'ABCDEFGHIJ'[Math.floor(m / 4)]}` });
    if (m >= 3) ingresos.push({ fecha: `${ym}-28`, cat: 'Intereses', cuenta: 'Banco C', monto: round((3000 + r() * 4000) * k), comentario: 'Rendimiento cuenta remunerada' });
    if (ym === '2024-08') ingresos.push({ fecha: '2024-08-20', cat: 'Ventas', cuenta: 'Banco C', monto: 2200000, comentario: 'Venta bien propio' });

    const sd = `${ym}-04`;
    transferencias.push({ fecha: sd, cuentaOrigen: 'Banco C', cuentaDestino: 'Tarjeta B', monto: round(180000 * k), comentario: 'Fondeo tarjeta' });
    transferencias.push({ fecha: sd, cuentaOrigen: 'Banco C', cuentaDestino: 'Billetera A', monto: round(90000 * k), comentario: 'Gastos diarios' });
    if (m % 3 === 0) transferencias.push({ fecha: `${ym}-16`, cuentaOrigen: 'Billetera A', cuentaDestino: 'Banco C', monto: round(40000 * k), comentario: 'Devolución sobrante' });
  }

  const byDate = (a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0);
  return { gastos: gastos.sort(byDate), ingresos: ingresos.sort(byDate), transferencias: transferencias.sort(byDate) };
}

export const DEMO_DATA = build();
