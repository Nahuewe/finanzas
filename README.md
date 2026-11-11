# 📊 Mis Finanzas

Dashboard personal de finanzas construido con **Astro**. Subís tu Excel de gastos/ingresos/transferencias y obtenés un análisis completo: categorías, flujo mensual, comparativas mes a mes y oportunidades de ahorro calculadas en vivo sobre tus propios datos.

Todo el procesamiento ocurre **en el navegador** — el archivo nunca se sube a ningún servidor.

## ✨ Funcionalidades

- **Carga dinámica de Excel** (drag & drop o selector de archivo) con 3 hojas: `Gastos`, `Ingresos`, `Transferencias`.
- **Filtros en tiempo real**: año, mes, período (3/6 meses/todo), cuenta, categoría y monto mínimo. Se pueden excluir categorías y cuentas (las cuentas "Reserva" se excluyen por defecto del flujo de gastos/ingresos).
- **Vistas**: Resumen, Gastos, Ingresos, Flujo, Proyección, Ahorros, Presupuesto, Análisis, Patrimonio, Hábitos, Comentarios y Cuentas.
- **Gastos**: ranking de categorías en acordeón, comparativa mes a mes, suscripciones, top 10, gastos recurrentes y **alertas de suscripciones que subieron más que la inflación**.
- **Presupuesto**: topes mensuales por categoría con avance y proyección al cierre, gastos fijos vs variables y meses de colchón.
- **Análisis**: ahorro real vs contable, gasto nominal vs real (inflación INDEC mes a mes), año contra año, Pareto, anomalías y transferencias entre cuentas.
- **Patrimonio**: evolución del saldo por cuenta (reconstruido desde el saldo actual) y panel de **dólares** (compras, precio promedio vs mercado, resultado nominal y real).
- **Ahorros**: alertas y oportunidades calculadas dinámicamente; las reglas (qué categorías son hormiga, suscripciones, ahorro, etc.) son **configurables** desde la misma pestaña.
- **Informe imprimible mensual o anual** (botón 🖨 Informe → guardar como PDF), con gráfico incluido, y **exportación CSV** de los datos filtrados.
- **El último Excel queda guardado en el navegador** (IndexedDB): la app abre directo en tu tablero. Al subir uno nuevo, el Resumen muestra **qué cambió** respecto de la carga anterior.
- **Metas de ahorro** en pesos o dólares, con avance, aporte mensual necesario y fecha estimada; se pueden ligar a una cuenta.
- **Proyección por escenarios** (pesimista / base / optimista) separando gastos fijos de variables y ajustando por inflación esperada.
- **Presupuesto indexado**: los topes pueden ajustarse solos por inflación y avisan al llegar al 80%.
- **Dólares**: auditoría de conversiones contra el dólar que nombre el comentario (Oficial, MEP, Blue) y opción de valuar las operaciones al dólar de mercado del día.
- **Otros formatos de Excel**: mapeo de columnas configurable en la pantalla de carga (incluye exportaciones de banco de una sola hoja con montos + y −).
- **Instalable (PWA)**: en el build de producción funciona sin conexión y se puede instalar en el celular.
- **Datos públicos** (API argentinadatos.com): inflación mensual y cotización del dólar (MEP/Blue/Oficial), con caché de 12 h.
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
npm run preview   # para previsualizar el build localmente (acá ya funciona el modo instalable / sin conexión)
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

## 🧪 Pruebas

```bash
npm test
```

Corre las pruebas de los cálculos (lectura del Excel, comparación de archivos, métricas, proyección, presupuesto, metas y saldos por cuenta) con el runner nativo de Node, sin dependencias extra.

## 🔒 Privacidad

El Excel nunca sale del navegador. Lo único que se consulta afuera son datos públicos (inflación y dólar). Saldos, topes, metas y reglas se guardan solo en `localStorage`, y el último Excel en IndexedDB, ambos en tu navegador.

## 📁 Estructura

```
src/
├── layouts/Layout.astro        # head, fuentes, estilos globales
├── pages/index.astro           # markup (upload screen + dashboard)
├── scripts/
│   ├── app.js                  # arranque y listeners globales
│   ├── upload.js               # carga del archivo y mapeo de columnas
│   ├── parse.js                # lectura del Excel (funciones puras)
│   ├── persist.js / diff.js    # archivo guardado en el navegador y comparación entre cargas
│   ├── projection.js           # proyección por escenarios
│   ├── budget.js / goals.js    # topes indexados y metas de ahorro
│   ├── filters.js              # filtros y exclusiones
│   ├── state.js                # estado compartido
│   ├── metrics.js              # agregados calculados una vez por filtro + detección (fijos, suscripciones)
│   ├── accounts.js             # saldos, divisas y movimientos por cuenta
│   ├── externalData.js         # inflación INDEC y dólar (argentinadatos.com)
│   ├── config.js               # reglas de detección configurables
│   ├── storage.js              # localStorage versionado
│   ├── helpers.js              # formato, escape de HTML, opciones de Chart.js
│   └── renderers/              # una vista por archivo
└── styles/global.css           # sistema de diseño (tema "ledger")
```

## 📝 Licencia

MIT — ver [LICENSE](./LICENSE).
