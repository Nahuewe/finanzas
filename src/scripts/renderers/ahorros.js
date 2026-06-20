import { FILTERED, DAY_NAMES } from '../state.js';
import { fmt, fmtFull, groupBy, groupByMon, sortedEntries, allMonths } from '../helpers.js';

export function renderAhorros() {
  const g = FILTERED.gastos, i = FILTERED.ingresos;
  const months = allMonths(g, i);
  const tG = g.reduce((a, r) => a + r.monto, 0);
  const tI = i.reduce((a, r) => a + r.monto, 0);
  const avgMon = months.length ? tG / months.length : 0;
  const bycatObj = groupBy(g, 'cat');
  const bycatSorted = sortedEntries(bycatObj);

  const savings = [], alerts = [], positives = [], plan = [];
  let alertCount = 0;
  const saveRate = tI > 0 ? (tI - tG) / tI : 0;

  const goalEl = document.getElementById('savingsGoal');
  if (months.length > 0 && tI > 0) {
    const targetRate = 0.20;
    if (saveRate < targetRate) {
      const neededCutMonthly = (tG - tI * (1 - targetRate)) / months.length;
      goalEl.innerHTML = `<div class="goal-card"><div class="goal-label">🎯 Objetivo: ahorrar 20% de tus ingresos</div><div class="goal-text">Hoy estás ahorrando <strong>${Math.round(saveRate * 100)}%</strong>. Para llegar al 20% necesitarías reducir tus gastos en <strong>${fmtFull(neededCutMonthly)}/mes</strong> (o aumentar tus ingresos en una magnitud similar).</div></div>`;
    } else {
      goalEl.innerHTML = `<div class="goal-card"><div class="goal-label">🎯 Objetivo: ahorrar 20% de tus ingresos</div><div class="goal-text">¡Superado! Estás ahorrando <strong>${Math.round(saveRate * 100)}%</strong> de tus ingresos en el período filtrado. Mantener esto te da margen para imprevistos e inversión.</div></div>`;
    }
  } else {
    goalEl.innerHTML = '';
  }

  const chatarra = bycatObj['Chatarra'] || 0;
  if (chatarra > 0) {
    const visits = g.filter((r) => r.cat === 'Chatarra').length;
    savings.push({ dot: 'orange', label: 'Reducir chatarra/kiosko 50%', desc: `${visits} visitas · ${fmtFull(chatarra / visits)} promedio/visita`, amount: chatarra * 0.5 });
    alertCount++;
  }

  const subComments = g.filter((r) => r.cat === 'Suscripciones').map((r) => String(r.comentario || '').toLowerCase());
  if (subComments.some((c) => c.includes('onedrive')) && subComments.some((c) => c.includes('google drive') || c.includes('gdrive'))) {
    const amt = g.filter((r) => r.cat === 'Suscripciones' && String(r.comentario || '').toLowerCase().includes('onedrive')).reduce((a, r) => a + r.monto, 0);
    savings.push({ dot: 'yellow', label: 'Cancelar duplicado de almacenamiento', desc: 'Tenés OneDrive Y Google Drive — elegí uno', amount: amt });
    alertCount++;
  }

  const subTotal = bycatObj['Suscripciones'] || 0;
  if (subTotal > 0 && months.length > 0) {
    savings.push({ dot: 'yellow', label: 'Auditar suscripciones inactivas (10%)', desc: `${fmtFull(subTotal / months.length)}/mes · revisar cuáles usás`, amount: subTotal * 0.1 });
  }

  const ocioSpikes = g.filter((r) => r.cat === 'Ocio' && r.monto > 100000);
  if (ocioSpikes.length > 0) {
    const spikeTotal = ocioSpikes.reduce((a, r) => a + r.monto, 0);
    savings.push({ dot: 'orange', label: 'Regla 72hs en compras de ocio >$100K', desc: `${ocioSpikes.length} compras grandes por ${fmtFull(spikeTotal)}`, amount: spikeTotal * 0.3 });
    alertCount++;
  }

  const regalosT = bycatObj['Regalos'] || 0;
  if (regalosT > 0 && months.length > 0) {
    savings.push({ dot: 'yellow', label: 'Crear fondo mensual de regalos', desc: `Gastás ${fmtFull(regalosT / months.length)}/mes en promedio`, amount: regalosT * 0.15 });
  }

  if (saveRate < 0.1) {
    alertCount++;
    alerts.push({ type: 'i-warn', ico: '⚠️', title: 'Tasa de ahorro baja (' + Math.round(saveRate * 100) + '%)', body: 'Estás ahorrando menos del 10% de tus ingresos. El objetivo recomendado es 20%.' });
  }

  const monG = groupByMon(g), monI = groupByMon(i);
  const negMonths = months.filter((m) => (monI[m] || 0) < (monG[m] || 0));
  if (negMonths.length > months.length / 3) {
    alertCount++;
    alerts.push({ type: 'i-warn', ico: '📉', title: `${negMonths.length} meses en negativo (de ${months.length})`, body: 'Más de un tercio de los meses gastás más de lo que ingresás. Considerá un fondo de emergencia líquido.' });
  }

  const ingMeses = Object.values(groupByMon(i)).filter((v) => v > 0);
  if (ingMeses.length > 1) {
    const meanIng = tI / ingMeses.length;
    const std = Math.sqrt(ingMeses.reduce((a, v) => a + Math.pow(v - meanIng, 2), 0) / ingMeses.length);
    if (std > meanIng * 0.5) {
      alerts.push({ type: 'i-info', ico: '📊', title: 'Ingresos muy variables', body: `Desviación alta entre meses. Un colchón de 3 meses de gastos (≈${fmt(avgMon * 3)}) te protege en los meses bajos.` });
    }
  }

  if (tG > 0 && chatarra / tG > 0.08) {
    alertCount++;
    alerts.push({ type: 'i-warn', ico: '🍬', title: `Chatarra = ${(chatarra / tG * 100).toFixed(1)}% de tus gastos`, body: `${g.filter((r) => r.cat === 'Chatarra').length} transacciones pequeñas suman ${fmtFull(chatarra)}. El típico gasto hormiga.` });
  }

  const edu = bycatObj['Educación'] || 0;
  if (tG > 0 && edu / tG < 0.01) {
    alerts.push({ type: 'i-info', ico: '📚', title: 'Educación: menos del 1% de tus gastos', body: 'Invertir en formación técnica tiene el ROI más alto posible. Incluso $50K/mes en cursos puede multiplicar tus ingresos freelance.' });
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
    const top3Sum = top3.reduce((a, [, v]) => a + v, 0);
    const pct = (top3Sum / tG * 100).toFixed(0);
    alerts.push({ type: 'i-info', ico: '🎯', title: `Tus 3 categorías principales son el ${pct}% del gasto`, body: `${top3.map(([c]) => c).join(', ')} concentran la mayor parte. Enfocar ahí rinde más que optimizar categorías chicas.` });
  }

  if (saveRate > 0.15) positives.push({ type: 'i-tip', ico: '✅', title: 'Tasa de ahorro saludable (' + Math.round(saveRate * 100) + '%)', body: 'Estás guardando una buena parte de tus ingresos. Seguí así.' });

  const freelanceT = i.filter((r) => r.cat === 'Freelance').reduce((a, r) => a + r.monto, 0);
  if (freelanceT > 0) positives.push({ type: 'i-tip', ico: '💻', title: 'Ingresos freelance activos: ' + fmt(freelanceT), body: 'Tenés una fuente de ingreso adicional al salario. Eso es diversificación real y es valioso.' });

  const invT = bycatObj['Inversiones'] || 0;
  if (invT > 0) positives.push({ type: 'i-tip', ico: '📈', title: 'Tenés inversiones registradas: ' + fmt(invT), body: 'Ya estás invirtiendo aunque sea en pequeña escala. La consistencia importa más que el monto inicial.' });

  if (g.length > 100) positives.push({ type: 'i-tip', ico: '📋', title: `Registro financiero impecable (${g.length} gastos)`, body: 'Llevar las cuentas detalladas con comentarios es el primer paso — y el más difícil. Ya lo tenés.' });

  const salarios = i.filter((r) => r.cat === 'Salario').sort((a, b) => (a.fecha > b.fecha ? 1 : -1));
  if (salarios.length >= 2) {
    const first = salarios[0].monto, last = salarios[salarios.length - 1].monto;
    if (last > first * 1.5) positives.push({ type: 'i-tip', ico: '🚀', title: `Salario creció ${((last / first - 1) * 100).toFixed(0)}% en el período`, body: `De ${fmtFull(first)} a ${fmtFull(last)}. Crecimiento real de ingresos.` });
  }

  if (chatarra > avgMon * 0.05 && months.length > 0) plan.push({ type: 'i-info', ico: '🎯', title: 'Presupuesto semanal de antojos', body: `Fijate un tope de ${fmtFull(chatarra / months.length / 4 * 0.5)}/semana para snacks/kiosko. Cuando se acaba, se acaba.` });
  plan.push({ type: 'i-info', ico: '💵', title: 'Automatizá 1 compra de dólares por mes', body: 'Aunque sea 20-30 USD MEP el día que te pagan. En 12 meses tenés reserva sin esfuerzo.' });
  if (edu < avgMon * 0.05) plan.push({ type: 'purple', ico: '📚', title: 'Asigná $50-80K/mes a educación', body: 'Un curso técnico, certificación o libro relevante. Con freelance activo, mejorar tus skills impacta directo en las tarifas que podés cobrar.' });
  if (freelanceT > 0) plan.push({ type: 'purple', ico: '💼', title: 'Proponer contrato anual a tu cliente fijo', body: 'En vez de cobrar por proyecto, ofrecé un retainer mensual. Eso te da ingresos previsibles.' });
  plan.push({ type: 'i-tip', ico: '🏦', title: `Fondo de emergencia: apuntá a ${fmt(avgMon * 3)}`, body: 'Tres meses de gastos en un FCI money market (alta liquidez). Te protege sin tocar las inversiones.' });

  document.getElementById('alertCount').textContent = alertCount;

  savings.sort((a, b) => b.amount - a.amount);
  const medals = ['🥇', '🥈', '🥉'];
  const sl = document.getElementById('savingsList');
  sl.innerHTML = '';

  if (savings.length && months.length) {
    const annualSavings = savings.reduce((a, s) => a + s.amount, 0) * (12 / months.length);
    sl.insertAdjacentHTML('beforeend', `<div class="saving-item" style="background:var(--color-emerald-fin/14);border-color:var(--color-emerald-fin)"><div class="dot"></div><div class="label"><strong style="color:#4ade80">Potencial de ahorro anualizado</strong><div class="desc">Sumando todas las oportunidades identificadas, proyectado a 12 meses</div></div><div class="amount">${fmtFull(annualSavings)}/año</div></div>`);
  }
  savings.forEach((s, idx) => {
    const medal = medals[idx] ? `<span style="margin-right:6px">${medals[idx]}</span>` : '';
    sl.insertAdjacentHTML('beforeend', `<div class="saving-item"><div class="dot ${s.dot}"></div><div class="label">${medal}<strong>${s.label}</strong><div class="desc">${s.desc}</div></div><div class="amount">${fmtFull(s.amount)}</div></div>`);
  });
  if (!savings.length) sl.innerHTML = '<div class="empty-state">Sin oportunidades detectadas en el período filtrado.</div>';

  document.getElementById('alertsList').innerHTML = alerts.length
    ? alerts.map((a) => `<div class="insight ${a.type}"><div class="ico">${a.ico}</div><div class="body"><strong>${a.title}</strong>${a.body}</div></div>`).join('')
    : `<div class="insight tip"><div class="ico">✅</div><div class="body"><strong>Sin alertas críticas</strong>Todo en orden en el período seleccionado.</div></div>`;

  document.getElementById('positivesList').innerHTML = positives.map((p) =>
    `<div class="insight ${p.type}"><div class="ico">${p.ico}</div><div class="body"><strong>${p.title}</strong>${p.body}</div></div>`
  ).join('') || '<div class="empty-state">Sin datos suficientes.</div>';

  document.getElementById('planList').innerHTML = plan.map((p) =>
    `<div class="insight ${p.type}"><div class="ico">${p.ico}</div><div class="body"><strong>${p.title}</strong>${p.body}</div></div>`
  ).join('');
}
