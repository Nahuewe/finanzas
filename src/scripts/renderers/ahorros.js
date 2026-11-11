import { FILTERED, METRICS, DAY_NAMES } from '../state.js';
import { fmt, fmtFull, esc, sortedEntries, sum } from '../helpers.js';
import { getConfig, setConfig, resetConfig, matcher, duplicateGroups, DEFAULT_CONFIG, CONFIG_LABELS } from '../config.js';
import { subscriptionChanges } from '../metrics.js';
import { INFL } from '../externalData.js';
import { effectiveBudgets, budgetStatus } from '../budget.js';

export function renderAhorros() {
  const g = FILTERED.gastos, i = FILTERED.ingresos;
  const cfg = getConfig();
  const { months, monG, monI, tG, tI, byCatG, byCatI } = METRICS;
  const avgMon = months.length ? tG / months.length : 0;
  const bycatSorted = sortedEntries(byCatG);
  const catsOf = (test) => Object.keys(byCatG).filter(test);
  const totalOf = (test) => catsOf(test).reduce((a, c) => a + byCatG[c], 0);

  const savings = [], alerts = [], positives = [], plan = [];
  let alertCount = 0;
  const saveRate = tI > 0 ? (tI - tG) / tI : 0;
  const target = (+cfg.objetivoAhorro || 20) / 100;

  const goalEl = document.getElementById('savingsGoal');
  if (months.length > 0 && tI > 0) {
    const label = `🎯 Objetivo: ahorrar ${Math.round(target * 100)}% de tus ingresos`;
    if (saveRate < target) {
      const neededCutMonthly = (tG - tI * (1 - target)) / months.length;
      goalEl.innerHTML = `<div class="goal-card"><div class="goal-label">${label}</div><div class="goal-text">Hoy estás ahorrando <strong>${Math.round(saveRate * 100)}%</strong>. Para llegar al ${Math.round(target * 100)}% necesitarías reducir tus gastos en <strong>${fmtFull(neededCutMonthly)}/mes</strong> (o aumentar tus ingresos en una magnitud similar).</div></div>`;
    } else {
      goalEl.innerHTML = `<div class="goal-card"><div class="goal-label">${label}</div><div class="goal-text">¡Superado! Estás ahorrando <strong>${Math.round(saveRate * 100)}%</strong> de tus ingresos en el período filtrado. Mantener esto te da margen para imprevistos e inversión.</div></div>`;
    }
  } else {
    goalEl.innerHTML = '';
  }

  // gasto hormiga: categorías definidas en la configuración
  const isHormiga = matcher('hormiga');
  const hormigaTx = g.filter((r) => isHormiga(r.cat));
  const hormiga = sum(hormigaTx);
  if (hormiga > 0) {
    savings.push({ dot: 'orange', label: 'Reducir gasto hormiga 50%', desc: `${hormigaTx.length} compras · ${fmtFull(hormiga / hormigaTx.length)} promedio`, amount: hormiga * 0.5 });
    alertCount++;
  }

  // suscripciones: servicios que se solapan (grupos configurables) + auditoría general
  const isSub = matcher('suscripciones');
  const subTx = g.filter((r) => isSub(r.cat));
  duplicateGroups().forEach((group) => {
    const hits = group
      .map((svc) => ({ svc, total: sum(subTx.filter((r) => String(r.comentario || '').toLowerCase().includes(svc))) }))
      .filter((h) => h.total > 0);
    if (hits.length > 1) {
      const cheapest = hits.reduce((a, b) => (b.total < a.total ? b : a));
      savings.push({ dot: 'yellow', label: `Servicios que se solapan: ${hits.map((h) => h.svc).join(' + ')}`, desc: 'Tenés más de uno del mismo tipo — elegí uno', amount: cheapest.total });
      alertCount++;
    }
  });
  const subTotal = totalOf(isSub);
  if (subTotal > 0 && months.length > 0) {
    savings.push({ dot: 'yellow', label: 'Auditar suscripciones inactivas (10%)', desc: `${fmtFull(subTotal / months.length)}/mes · revisar cuáles usás`, amount: subTotal * 0.1 });
  }

  // suscripciones que subieron más que la inflación
  subscriptionChanges(g).filter((c) => INFL.state === 'ok' && c.excess > 3).forEach((c) => {
    alertCount++;
    alerts.push({ type: 'i-warn', ico: '📈', title: `${esc(c.name)} subió ${c.pct.toFixed(0)}% (inflación ${c.infl.toFixed(0)}%)`, body: `De ${fmtFull(c.prevAmt)} a ${fmtFull(c.lastAmt)} entre ${c.prev} y ${c.last}. Costo anual a este precio: ${fmt(c.yearly)}. Revisá si sigue valiendo la pena o si hay un plan más barato.` });
  });

  // presupuesto del último mes: categorías excedidas o cerca del tope (≥80%)
  const lastM = METRICS.gMonths.at(-1);
  if (lastM) {
    const spentLast = Object.fromEntries(Object.entries(METRICS.catMonthG).map(([c, m]) => [c, m[lastM] || 0]));
    const st = budgetStatus(spentLast, effectiveBudgets(lastM));
    const over = st.filter((x) => x.state === 'over'), near = st.filter((x) => x.state === 'near');
    if (over.length) {
      alertCount++;
      alerts.push({ type: 'i-warn', ico: '🧾', title: `${over.length} categoría(s) pasaron su tope en ${lastM}`, body: over.map((x) => `${esc(x.cat)} (+${fmt(x.gastado - x.tope)})`).join(', ') + '.' });
    }
    if (near.length) {
      alerts.push({ type: 'i-info', ico: '⏳', title: `${near.length} categoría(s) cerca del tope en ${lastM}`, body: near.map((x) => `${esc(x.cat)} (${Math.round(x.pct * 100)}%, quedan ${fmt(x.tope - x.gastado)})`).join(', ') + '.' });
    }
  }

  const bigOcio = +cfg.ocioGrande || 100000;
  const isOcio = matcher('ocio');
  const ocioSpikes = g.filter((r) => isOcio(r.cat) && r.monto > bigOcio);
  if (ocioSpikes.length > 0) {
    const spikeTotal = sum(ocioSpikes);
    savings.push({ dot: 'orange', label: `Regla 72hs en compras de ocio >${fmt(bigOcio)}`, desc: `${ocioSpikes.length} compras grandes por ${fmtFull(spikeTotal)}`, amount: spikeTotal * 0.3 });
    alertCount++;
  }

  const regalosT = totalOf(matcher('regalos'));
  if (regalosT > 0 && months.length > 0) {
    savings.push({ dot: 'yellow', label: 'Crear fondo mensual de regalos', desc: `Gastás ${fmtFull(regalosT / months.length)}/mes en promedio`, amount: regalosT * 0.15 });
  }

  if (saveRate < 0.1) {
    alertCount++;
    alerts.push({ type: 'i-warn', ico: '⚠️', title: 'Tasa de ahorro baja (' + Math.round(saveRate * 100) + '%)', body: `Estás ahorrando menos del 10% de tus ingresos. El objetivo configurado es ${Math.round(target * 100)}%.` });
  }

  const negMonths = months.filter((m) => (monI[m] || 0) < (monG[m] || 0));
  if (negMonths.length > months.length / 3) {
    alertCount++;
    alerts.push({ type: 'i-warn', ico: '📉', title: `${negMonths.length} meses en negativo (de ${months.length})`, body: 'Más de un tercio de los meses gastás más de lo que ingresás. Considerá un fondo de emergencia líquido.' });
  }

  const ingMeses = Object.values(monI).filter((v) => v > 0);
  if (ingMeses.length > 1) {
    const meanIng = tI / ingMeses.length;
    const std = Math.sqrt(ingMeses.reduce((a, v) => a + Math.pow(v - meanIng, 2), 0) / ingMeses.length);
    if (std > meanIng * 0.5) {
      alerts.push({ type: 'i-info', ico: '📊', title: 'Ingresos muy variables', body: `Desviación alta entre meses. Un colchón de ${cfg.mesesColchon} meses de gastos (≈${fmt(avgMon * cfg.mesesColchon)}) te protege en los meses bajos.` });
    }
  }

  if (tG > 0 && hormiga / tG > 0.08) {
    alertCount++;
    alerts.push({ type: 'i-warn', ico: '🍬', title: `Gasto hormiga = ${(hormiga / tG * 100).toFixed(1)}% de tus gastos`, body: `${hormigaTx.length} transacciones pequeñas suman ${fmtFull(hormiga)}. El típico gasto hormiga.` });
  }

  const edu = totalOf(matcher('educacion'));
  if (tG > 0 && edu / tG < 0.01) {
    alerts.push({ type: 'i-info', ico: '📚', title: 'Educación: menos del 1% de tus gastos', body: 'Invertir en formación técnica tiene el ROI más alto posible. Incluso un monto chico mensual en cursos puede multiplicar tus ingresos.' });
  }

  const byWeekday = {};
  g.forEach((r) => {
    if (!r.fecha) return;
    const wd = new Date(r.fecha + 'T00:00:00').getDay();
    byWeekday[wd] = (byWeekday[wd] || 0) + r.monto;
  });
  const wdEntries = Object.entries(byWeekday).sort((a, b) => b[1] - a[1]);
  if (wdEntries.length && tG > 0) {
    const topWd = DAY_NAMES[+wdEntries[0][0]];
    const wdPct = (wdEntries[0][1] / tG * 100).toFixed(0);
    alerts.push({ type: 'i-info', ico: '📅', title: `Gastás más los ${topWd}`, body: `Acumula ${fmtFull(wdEntries[0][1])} (${wdPct}% del total) — el día con mayor gasto de la semana.` });
  }

  if (bycatSorted.length >= 3 && tG > 0) {
    const top3 = bycatSorted.slice(0, 3);
    const pct = (top3.reduce((a, [, v]) => a + v, 0) / tG * 100).toFixed(0);
    alerts.push({ type: 'i-info', ico: '🎯', title: `Tus 3 categorías principales son el ${pct}% del gasto`, body: `${top3.map(([c]) => esc(c)).join(', ')} concentran la mayor parte. Enfocar ahí rinde más que optimizar categorías chicas.` });
  }

  if (saveRate > Math.min(0.15, target)) positives.push({ type: 'i-tip', ico: '✅', title: 'Tasa de ahorro saludable (' + Math.round(saveRate * 100) + '%)', body: 'Estás guardando una buena parte de tus ingresos. Seguí así.' });

  const freelanceT = sum(i.filter((r) => /freelance/i.test(r.cat)));
  if (freelanceT > 0) positives.push({ type: 'i-tip', ico: '💻', title: 'Ingresos freelance activos: ' + fmt(freelanceT), body: 'Tenés una fuente de ingreso adicional al salario. Eso es diversificación real y es valioso.' });
  if (Object.keys(byCatI).length > 2) positives.push({ type: 'i-tip', ico: '🌱', title: `${Object.keys(byCatI).length} fuentes de ingreso distintas`, body: 'Diversificar ingresos reduce el riesgo si una fuente se interrumpe.' });

  const invT = totalOf(matcher('inversiones'));
  if (invT > 0) positives.push({ type: 'i-tip', ico: '📈', title: 'Tenés inversiones registradas: ' + fmt(invT), body: 'Ya estás invirtiendo aunque sea en pequeña escala. La consistencia importa más que el monto inicial.' });

  if (g.length > 100) positives.push({ type: 'i-tip', ico: '📋', title: `Registro financiero impecable (${g.length} gastos)`, body: 'Llevar las cuentas detalladas con comentarios es el primer paso — y el más difícil. Ya lo tenés.' });

  const salarios = i.filter((r) => /salario|sueldo/i.test(r.cat)).sort((a, b) => (a.fecha > b.fecha ? 1 : -1));
  if (salarios.length >= 2) {
    const first = salarios[0].monto, last = salarios[salarios.length - 1].monto;
    if (last > first * 1.5) positives.push({ type: 'i-tip', ico: '🚀', title: `Salario creció ${((last / first - 1) * 100).toFixed(0)}% en el período`, body: `De ${fmtFull(first)} a ${fmtFull(last)}. Crecimiento real de ingresos.` });
  }

  if (hormiga > avgMon * 0.05 && months.length > 0) plan.push({ type: 'i-info', ico: '🎯', title: 'Presupuesto semanal de antojos', body: `Fijate un tope de ${fmtFull(hormiga / months.length / 4 * 0.5)}/semana para gasto hormiga. Cuando se acaba, se acaba.` });
  if (!catsOf(matcher('ahorro')).length) plan.push({ type: 'i-info', ico: '💵', title: 'Automatizá un ahorro mensual', body: 'Aunque sea un monto chico el día que te pagan. En 12 meses tenés una reserva sin esfuerzo.' });
  if (edu < avgMon * 0.05) plan.push({ type: 'purple', ico: '📚', title: 'Asigná un monto fijo a educación', body: 'Un curso técnico, certificación o libro relevante. Mejorar tus skills impacta directo en lo que podés cobrar.' });
  if (freelanceT > 0) plan.push({ type: 'purple', ico: '💼', title: 'Proponer contrato anual a tu cliente fijo', body: 'En vez de cobrar por proyecto, ofrecé un retainer mensual. Eso te da ingresos previsibles.' });
  plan.push({ type: 'i-tip', ico: '🏦', title: `Fondo de emergencia: apuntá a ${fmt(avgMon * cfg.mesesColchon)}`, body: `${cfg.mesesColchon} meses de gastos en un instrumento de alta liquidez (FCI money market). Te protege sin tocar las inversiones.` });

  document.getElementById('alertCount').textContent = alertCount;

  savings.sort((a, b) => b.amount - a.amount);
  const medals = ['🥇', '🥈', '🥉'];
  const sl = document.getElementById('savingsList');
  sl.innerHTML = '';

  if (savings.length && months.length) {
    const annualSavings = savings.reduce((a, s) => a + s.amount, 0) * (12 / months.length);
    sl.insertAdjacentHTML('beforeend', `<div class="saving-item" style="background:rgb(var(--c-pos) / .14);border-color:rgb(var(--c-pos))"><div class="dot"></div><div class="label"><strong style="color:var(--green)">Potencial de ahorro anualizado</strong><div class="desc">Sumando todas las oportunidades identificadas, proyectado a 12 meses</div></div><div class="amount">${fmtFull(annualSavings)}/año</div></div>`);
  }
  savings.forEach((s, idx) => {
    const medal = medals[idx] ? `<span style="margin-right:6px">${medals[idx]}</span>` : '';
    sl.insertAdjacentHTML('beforeend', `<div class="saving-item"><div class="dot ${s.dot}"></div><div class="label">${medal}<strong>${esc(s.label)}</strong><div class="desc">${esc(s.desc)}</div></div><div class="amount">${fmtFull(s.amount)}</div></div>`);
  });
  if (!savings.length) sl.innerHTML = '<div class="empty-state">Sin oportunidades detectadas en el período filtrado.</div>';

  // los textos con datos del usuario ya vienen escapados al armar cada alerta
  const card = (a) => `<div class="insight ${a.type}"><div class="ico">${a.ico}</div><div class="body"><strong>${a.title}</strong>${a.body}</div></div>`;
  document.getElementById('alertsList').innerHTML = alerts.length
    ? alerts.map(card).join('')
    : `<div class="insight i-tip"><div class="ico">✅</div><div class="body"><strong>Sin alertas críticas</strong>Todo en orden en el período seleccionado.</div></div>`;
  document.getElementById('positivesList').innerHTML = positives.map(card).join('') || '<div class="empty-state">Sin datos suficientes.</div>';
  document.getElementById('planList').innerHTML = plan.map(card).join('');
}

// ── panel de reglas configurables ──
export function renderConfigForm() {
  const form = document.getElementById('cfgForm');
  if (!form) return;
  const cfg = getConfig();
  form.innerHTML = `
    <div class="cfg-grid">
      ${Object.keys(DEFAULT_CONFIG).map((k) => `
        <label class="cfg-field">
          <span class="cfg-label">${esc(CONFIG_LABELS[k])}</span>
          <input class="cuenta-input cfg-input" data-key="${k}" type="${typeof DEFAULT_CONFIG[k] === 'number' ? 'number' : 'text'}" value="${esc(cfg[k])}" />
        </label>`).join('')}
    </div>
    <div class="bud-toolbar">
      <button class="header-btn" id="cfgSave">Guardar reglas</button>
      <button class="header-btn" id="cfgReset">Restaurar valores por defecto</button>
    </div>
    <div class="bud-note">Las categorías se comparan por palabras clave separadas por coma (sin distinguir mayúsculas).</div>`;
}

export function initAhorrosListeners() {
  renderConfigForm();
  document.getElementById('cfgForm')?.addEventListener('click', (e) => {
    if (e.target.id === 'cfgSave') {
      const next = {};
      document.querySelectorAll('#cfgForm .cfg-input').forEach((inp) => {
        const k = inp.dataset.key;
        next[k] = typeof DEFAULT_CONFIG[k] === 'number' ? +inp.value || DEFAULT_CONFIG[k] : inp.value;
      });
      setConfig(next);
      document.dispatchEvent(new CustomEvent('config-changed'));
    } else if (e.target.id === 'cfgReset') {
      resetConfig();
      renderConfigForm();
      document.dispatchEvent(new CustomEvent('config-changed'));
    }
  });
}
