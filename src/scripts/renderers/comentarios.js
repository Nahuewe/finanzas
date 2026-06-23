import { RAW } from '../state.js';
import { fmtFull, sortedEntries } from '../helpers.js';

let COM_SEARCH = '';
let COM_TYPE = 'gastos';

export function renderComentarios() {
  buildComentariosUI();
}

function buildComentariosUI() {
  const container = document.getElementById('comCatList');
  if (!container) return;

  const data = COM_TYPE === 'gastos' ? RAW.gastos : RAW.ingresos;
  const search = COM_SEARCH.toLowerCase();

  const bycat = {};
  data.forEach((r) => {
    const cat = r.cat || '—';
    const com = (r.comentario || '').trim();
    if (!com) return;
    if (!bycat[cat]) bycat[cat] = {};
    if (!bycat[cat][com]) bycat[cat][com] = { total: 0, count: 0, dates: [] };
    bycat[cat][com].total += r.monto;
    bycat[cat][com].count++;
    bycat[cat][com].dates.push(r.fecha);
  });

  const cats = Object.entries(bycat)
    .filter(([cat, comments]) => {
      if (!search) return true;
      return cat.toLowerCase().includes(search) ||
        Object.keys(comments).some((c) => c.toLowerCase().includes(search));
    })
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
    const rows = sortedEntries(
      Object.fromEntries(Object.entries(comments).map(([k, v]) => [k, v.total]))
    );

    const commentRows = rows.map(([com, total]) => {
      const info = comments[com];
      const lastDate = [...info.dates].sort().reverse()[0];
      const highlighted = search && com.toLowerCase().includes(search)
        ? com.replace(new RegExp(`(${search})`, 'gi'), '<mark class="com-highlight">$1</mark>')
        : com;
      return `
        <div class="com-row">
          <div class="com-text">${highlighted}</div>
          <div class="com-meta">${info.count}x · ${lastDate?.slice(0) || '—'}</div>
          <div class="com-amt">${fmtFull(total)}</div>
        </div>`;
    }).join('');

    const safeCat = cat.replace(/'/g, "\\'");
    return `
      <div class="com-cat-block" id="comcat-${safeCat}">
        <div class="com-cat-head" onclick="toggleComCat('${safeCat}')">
          <span class="com-cat-name">${cat}</span>
          <span class="com-cat-count">${catCount} comentarios</span>
          <span class="com-cat-total">${fmtFull(catTotal)}</span>
          <span class="com-cat-chevron">▸</span>
        </div>
        <div class="com-cat-body">${commentRows}</div>
      </div>`;
  }).join('');
}

window.toggleComCat = function(cat) {
  const block = document.querySelector(`.com-cat-block[id="comcat-${cat}"]`);
  if (!block) return;
  block.classList.toggle('open');
};

export function initComentariosListeners() {
  const searchEl = document.getElementById('comSearch');
  const typeEl = document.getElementById('comType');

  if (searchEl) {
    searchEl.addEventListener('input', (e) => {
      COM_SEARCH = e.target.value.trim();
      buildComentariosUI();
    });
  }

  if (typeEl) {
    typeEl.addEventListener('change', (e) => {
      COM_TYPE = e.target.value;
      buildComentariosUI();
    });
  }
}
