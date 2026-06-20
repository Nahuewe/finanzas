import { RAW, EXCLUDED_GAS_CATS, EXCLUDED_ING_CATS, SKIP_CATS, setExcludedGasCats, setExcludedIngCats } from '../state.js';
import { applyFilters } from '../filters.js';

export function buildExcludePanel() {
  const gasCats = [...new Set(RAW.gastos.filter((r) => !SKIP_CATS.has(r.cat)).map((r) => r.cat).filter(Boolean))].sort();
  const ingCats = [...new Set(RAW.ingresos.map((r) => r.cat).filter(Boolean))].sort();

  const panel = document.getElementById('excludePanel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="exclude-group">
      <div class="exclude-label">EXCLUIR GASTOS</div>
      <div class="exclude-chips" id="excludeGasChips">
        ${gasCats.map((cat) => `
          <label class="exclude-chip ${EXCLUDED_GAS_CATS.has(cat) ? 'excluded' : ''}" data-cat="${cat}" data-type="gas">
            <input type="checkbox" ${EXCLUDED_GAS_CATS.has(cat) ? '' : 'checked'} />
            <span>${cat}</span>
          </label>
        `).join('')}
      </div>
    </div>
    <div class="exclude-group">
      <div class="exclude-label">EXCLUIR INGRESOS</div>
      <div class="exclude-chips" id="excludeIngChips">
        ${ingCats.map((cat) => `
          <label class="exclude-chip ${EXCLUDED_ING_CATS.has(cat) ? 'excluded' : ''}" data-cat="${cat}" data-type="ing">
            <input type="checkbox" ${EXCLUDED_ING_CATS.has(cat) ? '' : 'checked'} />
            <span>${cat}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `;

  panel.querySelectorAll('.exclude-chip input').forEach((cb) => {
    cb.addEventListener('change', (e) => {
      const chip = e.target.closest('.exclude-chip');
      const cat = chip.dataset.cat;
      const type = chip.dataset.type;

      if (type === 'gas') {
        const next = new Set(EXCLUDED_GAS_CATS);
        if (!e.target.checked) next.add(cat);
        else next.delete(cat);
        setExcludedGasCats(next);
      } else {
        const next = new Set(EXCLUDED_ING_CATS);
        if (!e.target.checked) next.add(cat);
        else next.delete(cat);
        setExcludedIngCats(next);
      }

      chip.classList.toggle('excluded', !e.target.checked);
      applyFilters();
    });
  });
}
