import { RAW, EXCLUDED_ACCOUNTS } from '../state.js';
import { fmtFull, sortedEntries, esc, escRegExp } from '../helpers.js';

let COM_SEARCH = '';
let COM_TYPE = 'gastos';
const OPEN_COMS = new Set();
const OPEN_CATS = new Set();

export function renderComentarios() {
  buildComentariosUI();
}

function highlight(text, search) {
  const safe = esc(text);
  if (!search) return safe;
  // se escapa el HTML primero y la búsqueda como texto literal, así ningún carácter rompe la regex ni el markup
  return safe.replace(new RegExp(`(${escRegExp(esc(search))})`, 'gi'), '<mark class="com-highlight">$1</mark>');
}

function buildComentariosUI() {
  const container = document.getElementById('comCatList');
  if (!container) return;

  const data = (COM_TYPE === 'gastos' ? RAW.gastos : RAW.ingresos).filter((r) => !EXCLUDED_ACCOUNTS.has(r.cuenta));
  const search = COM_SEARCH.toLowerCase();

  const bycat = {};
  data.forEach((r) => {
    const cat = r.cat || '—';
    const com = (r.comentario || '').trim();
    if (!com) return;
    if (!bycat[cat]) bycat[cat] = {};
    if (!bycat[cat][com]) bycat[cat][com] = { total: 0, count: 0, txs: [] };
    bycat[cat][com].total += r.monto;
    bycat[cat][com].count++;
    bycat[cat][com].txs.push({ fecha: r.fecha, monto: r.monto, comentario: r.comentario });
  });

  const cats = Object.entries(bycat)
    .filter(([cat, comments]) => !search || cat.toLowerCase().includes(search) || Object.keys(comments).some((c) => c.toLowerCase().includes(search)))
    .sort((a, b) => {
      const ta = Object.values(a[1]).reduce((s, v) => s + v.total, 0);
      const tb = Object.values(b[1]).reduce((s, v) => s + v.total, 0);
      return tb - ta;
    });

  if (!cats.length) {
    container.innerHTML = '<div class="empty-state">Sin comentarios para mostrar.</div>';
    return;
  }

  container.innerHTML = cats.map(([cat, comments]) => {
    const catTotal = Object.values(comments).reduce((s, v) => s + v.total, 0);
    const catCount = Object.values(comments).reduce((s, v) => s + v.count, 0);
    const rows = sortedEntries(Object.fromEntries(Object.entries(comments).map(([k, v]) => [k, v.total])));

    const commentRows = rows.map(([com, total]) => {
      const info = comments[com];
      const comKey = `${cat}|||${com}`;
      const isOpen = OPEN_COMS.has(comKey);
      const txRows = [...info.txs].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).map((tx) => `
        <div class="com-tx-row">
          <div class="com-tx-date">${esc(tx.fecha || '—')}</div>
          <div class="com-tx-comment">${esc(tx.comentario || '—')}</div>
          <div class="com-tx-amt">${fmtFull(tx.monto)}</div>
        </div>`).join('');

      const clickable = info.count > 1;
      return `
        <div class="com-row ${clickable ? 'com-row-clickable' : ''} ${isOpen ? 'open' : ''}" ${clickable ? `data-key="${esc(comKey)}"` : ''}>
          <div class="com-row-head">
            <div class="com-text">${highlight(com, search && com.toLowerCase().includes(search) ? COM_SEARCH : '')}</div>
            <div class="com-meta">${info.count}x</div>
            <div class="com-amt">${fmtFull(total)}</div>
            ${clickable ? '<div class="com-row-chevron">▸</div>' : ''}
          </div>
          ${clickable ? `<div class="com-tx-list">${txRows}</div>` : ''}
        </div>`;
    }).join('');

    return `
      <div class="com-cat-block ${OPEN_CATS.has(cat) ? 'open' : ''}" data-cat="${esc(cat)}">
        <div class="com-cat-head">
          <span class="com-cat-name">${esc(cat)}</span>
          <span class="com-cat-count">${catCount} comentarios</span>
          <span class="com-cat-total">${fmtFull(catTotal)}</span>
          <span class="com-cat-chevron">▸</span>
        </div>
        <div class="com-cat-body">${commentRows}</div>
      </div>`;
  }).join('');
}

export function initComentariosListeners() {
  document.getElementById('comSearch')?.addEventListener('input', (e) => {
    COM_SEARCH = e.target.value.trim();
    buildComentariosUI();
  });

  document.getElementById('comType')?.addEventListener('change', (e) => {
    COM_TYPE = e.target.value;
    buildComentariosUI();
  });

  // un solo listener delegado en lugar de onclick inline por fila
  document.getElementById('comCatList')?.addEventListener('click', (e) => {
    const row = e.target.closest('.com-row-clickable');
    if (row) {
      const key = row.dataset.key;
      if (OPEN_COMS.has(key)) OPEN_COMS.delete(key); else OPEN_COMS.add(key);
      row.classList.toggle('open');
      return;
    }
    const head = e.target.closest('.com-cat-head');
    if (head) {
      const block = head.parentElement;
      block.classList.toggle('open');
      if (block.classList.contains('open')) OPEN_CATS.add(block.dataset.cat); else OPEN_CATS.delete(block.dataset.cat);
    }
  });
}
