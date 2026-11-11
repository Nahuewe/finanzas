// Proyección por escenarios (funciones puras).
// Separa gastos fijos de variables, trabaja en pesos constantes del último mes y vuelve a inflar hacia adelante.

export function percentile(values, p) {
  const s = [...values].sort((a, b) => a - b);
  if (!s.length) return 0;
  const idx = (s.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

export function nextMonths(fromYM, count) {
  const [y, m] = fromYM.split('-').map(Number);
  return Array.from({ length: count }, (_, k) => {
    const d = new Date(y, m + k, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

/**
 * @param months        meses con datos, ordenados
 * @param monG, monI    gasto e ingreso por mes
 * @param fixedByMonth  parte fija del gasto por mes
 * @param inflOf        (ym) => inflación mensual % de ese mes
 * @param expectedInfl  inflación mensual % esperada hacia adelante
 */
export function projectScenarios({ months, monG, monI, fixedByMonth = {}, inflOf = () => 0, expectedInfl = 0, horizon = 6, window = 12 }) {
  const win = months.slice(-window);
  // factor para llevar cada mes a pesos del último mes
  const factor = {};
  let f = 1;
  for (let k = win.length - 1; k >= 0; k--) {
    factor[win[k]] = f;
    f *= 1 + inflOf(win[k]) / 100;
  }
  const real = (obj, m) => (obj[m] || 0) * factor[m];
  const incReal = win.map((m) => real(monI, m));
  const fixReal = win.map((m) => real(fixedByMonth, m));
  const varReal = win.map((m) => Math.max(0, real(monG, m) - real(fixedByMonth, m)));

  const last3 = fixReal.slice(-3);
  const fixedBase = last3.length ? last3.reduce((a, v) => a + v, 0) / last3.length : 0;
  const levels = {
    pesimista: { ing: percentile(incReal, 0.25), variables: percentile(varReal, 0.75) },
    base: { ing: percentile(incReal, 0.5), variables: percentile(varReal, 0.5) },
    optimista: { ing: percentile(incReal, 0.75), variables: percentile(varReal, 0.25) },
  };

  const projMonths = months.length ? nextMonths(months.at(-1), horizon) : [];
  const grow = (k) => Math.pow(1 + expectedInfl / 100, k + 1);
  const scenarios = {};
  Object.entries(levels).forEach(([name, lv]) => {
    let acc = 0;
    const s = { ing: [], fijos: [], variables: [], gasto: [], neto: [], acum: [] };
    projMonths.forEach((_, k) => {
      const g = grow(k);
      const ing = lv.ing * g, fijos = fixedBase * g, variables = lv.variables * g;
      const neto = ing - fijos - variables;
      acc += neto;
      s.ing.push(ing); s.fijos.push(fijos); s.variables.push(variables); s.gasto.push(fijos + variables); s.neto.push(neto); s.acum.push(acc);
    });
    scenarios[name] = s;
  });

  return { projMonths, fixedBase, levels, scenarios, window: win.length };
}
