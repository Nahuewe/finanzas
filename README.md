# 📊 Mis Finanzas

Dashboard personal de finanzas construido con **Astro**. Subís tu Excel de gastos/ingresos/transferencias y obtenés un análisis completo: categorías, flujo mensual, comparativas mes a mes y oportunidades de ahorro calculadas en vivo sobre tus propios datos.

Todo el procesamiento ocurre **en el navegador** — el archivo nunca se sube a ningún servidor.

## ✨ Funcionalidades

- **Carga dinámica de Excel** (drag & drop o selector de archivo) con 3 hojas: `Gastos`, `Ingresos`, `Transferencias`.
- **Filtros en tiempo real**: por año, período (3/6 meses/todo) y cuenta.
- **5 vistas**: Resumen, Gastos, Ingresos, Flujo neto y Ahorros.
- **Gastos**: ranking de categorías en formato acordeón (con sparkline mensual y top de conceptos por categoría), comparativa mes a mes, lista de suscripciones detectadas y top 10 de gastos individuales.
- **Ahorros**: alertas y oportunidades de ahorro calculadas dinámicamente (gasto hormiga, suscripciones duplicadas, compras impulsivas, tasa de ahorro, meses en negativo, etc.) — no son textos fijos, se recalculan según el archivo y los filtros activos.
- **100% responsive**, pensado mobile-first.
- Modo demo incluido para probar sin subir un archivo propio.

## 🗂 Formato del Excel esperado

El archivo debe tener tres hojas, con los encabezados en la **segunda fila** (fila 1 vacía o de título):

| Fecha y hora | Categoría | Cuenta | Cantidad en la divisa predeterminada | Comentario |
|---|---|---|---|---|

Esto corresponde al formato de exportación estándar de apps como **Spendee**. Si tu export tiene otro formato, ajustá el mapeo de columnas en `src/scripts/app.js` (función `processFile`).

## 🚀 Cómo correrlo

```bash
npm install
npm run dev
```

Abrí `http://localhost:4321`.

## 📦 Build de producción

```bash
npm run build
npm run preview   # para previsualizar el build localmente
```

El resultado queda en `dist/`.

## 🌐 Deploy

### Opción A — Netlify
Conectá el repo en Netlify (o arrastrá la carpeta `dist/` luego de buildear). Build command: `npm run build`. Publish directory: `dist`.

### Opción B — GitHub Pages
Ya incluye un workflow listo en `.github/workflows/deploy.yml` usando la acción oficial de Astro.

1. En GitHub: **Settings → Pages → Source → GitHub Actions**.
2. Si el repo **no** se llama `tu-usuario.github.io`, descomentá y completá `site` y `base` en `astro.config.mjs`:
   ```js
   site: 'https://tu-usuario.github.io',
   base: '/nombre-del-repo',
   ```
3. Hacé push a `main` — el workflow builda y despliega automáticamente.

## 🧱 Stack

- [Astro](https://astro.build) — framework estático, sin runtime pesado.
- [Chart.js](https://www.chartjs.org) — gráficos (vía CDN).
- [SheetJS / xlsx](https://sheetjs.com) — parseo del Excel en el cliente (vía CDN).
- CSS plano con variables — sin frameworks de estilos.

## 📁 Estructura

```
src/
├── layouts/
│   └── Layout.astro       # head, fuentes, import de estilos globales
├── pages/
│   └── index.astro        # markup de la app (upload screen + dashboard)
├── scripts/
│   └── app.js             # toda la lógica: parseo, filtros, render, gráficos
└── styles/
    └── global.css         # sistema de diseño (tema "ledger")
```

## 📝 Licencia

MIT — ver [LICENSE](./LICENSE).
