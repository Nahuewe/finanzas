import { syncTheme } from './state.js';
import { store } from './storage.js';

// Las paletas están en src/styles/themes.css; acá solo el listado y el selector.
export const THEMES = [
  { id: 'violeta', label: 'Violeta' },
  { id: 'dorado', label: 'Dorado' },
  { id: 'bosque', label: 'Esmeralda' },
  { id: 'oceano', label: 'Océano' },
  { id: 'grafito', label: 'Grafito' },
  { id: 'claro', label: 'Claro' },
];

const current = () => document.documentElement.getAttribute('data-theme') || 'violeta';

export function setTheme(id) {
  document.documentElement.setAttribute('data-theme', id);
  store.set('theme', id);
  syncTheme();
  markActive();
  document.dispatchEvent(new CustomEvent('external-data')); // re-dibuja los gráficos con la nueva paleta
}

function markActive() {
  document.querySelectorAll('.theme-opt').forEach((b) => b.classList.toggle('active', b.dataset.id === current()));
}

export function initThemes() {
  const swatch = (id) => `<span class="theme-swatch" data-theme="${id}"><i style="background:rgb(var(--c-bg))"></i><i style="background:rgb(var(--c-raised2))"></i><i style="background:rgb(var(--c-accent))"></i><i style="background:rgb(var(--c-pos))"></i><i style="background:rgb(var(--c-neg))"></i></span>`;

  document.querySelectorAll('.theme-wrap').forEach((wrap) => {
    const menu = wrap.querySelector('.theme-menu');
    menu.innerHTML = THEMES.map((t) => `<button type="button" class="theme-opt" data-id="${t.id}">${swatch(t.id)}<span>${t.label}</span></button>`).join('');
    wrap.querySelector('.theme-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('open');
    });
    menu.addEventListener('click', (e) => {
      const opt = e.target.closest('.theme-opt');
      if (!opt) return;
      setTheme(opt.dataset.id);
      menu.classList.remove('open');
    });
  });

  document.addEventListener('click', () => document.querySelectorAll('.theme-menu.open').forEach((m) => m.classList.remove('open')));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('.theme-menu.open').forEach((m) => m.classList.remove('open'));
  });
  markActive();
}
