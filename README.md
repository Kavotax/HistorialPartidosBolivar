# ⚽ HistorialPartidosBolivar

Pequeña aplicación web para guardar el historial de los partidos del **Club Bolívar** a los que fuiste al estadio.

> **¿A quién le dicen papá?** 🔵⚪

## ✨ Características

- **Registro de partidos:** fecha, rival, torneo, goles, estadio y notas.
- **Estadísticas automáticas:** partidos, victorias, empates, derrotas, porcentaje de victorias y balance de goles.
- **Historial ordenado por año**, con colores según el resultado.
- **Búsqueda y filtros** por rival, torneo, estadio y resultado.
- **Edición y eliminación** de cada partido.
- **Datos 100% locales:** se guardan en el navegador con `localStorage`, sin cuentas ni servidores.
- **Exportar e importar** el historial en formato JSON para hacer respaldos o pasarlo a otro dispositivo.
- **PWA instalable:** se puede agregar a la pantalla de inicio y funciona sin conexión.
- **Diseño responsive** para computadora y teléfono.

## 🚀 Cómo usarla

Clona el repositorio:

```bash
git clone https://github.com/Kavotax/HistorialPartidosBolivar.git
cd HistorialPartidosBolivar
```

Luego abre `index.html` con doble clic en tu navegador. No necesita instalación, servidor ni conexión a internet.


## 💾 Tus datos

- Los partidos se guardan **solo en el dispositivo**, en el almacenamiento local del navegador.
- No se envían a internet ni se sincronizan automáticamente entre dispositivos.
- Cada teléfono o computadora tiene su propio historial.
- Usa **Exportar** para descargar un respaldo en JSON e **Importar** para restaurarlo en otro dispositivo.
- Si borras los datos del navegador o cambias la URL donde está publicada la app, el historial local se pierde. Por eso conviene exportar una copia de vez en cuando.

## 🗂️ Estructura del proyecto

```text
.
├── index.html              # Estructura de la página
├── styles.css              # Estilos y diseño responsive
├── app.js                  # Lógica, filtros, estadísticas y localStorage
├── manifest.webmanifest    # Configuración de la PWA
├── sw.js                   # Service worker para uso sin conexión
├── icons/                  # Escudo del club e íconos de la app
└── docs/                   # Capturas para el README
```

## 🛠️ Tecnologías

- **HTML5** semántico.
- **CSS3** con Grid, Flexbox y media queries.
- **JavaScript vanilla**, sin frameworks ni dependencias.
- **Web Storage API** (`localStorage`) para persistencia local.
- **PWA**: manifest, service worker y funcionamiento offline.

---

Hecho por [Kavotax](https://github.com/Kavotax). Proyecto personal, no oficial, sin relación con el Club Bolívar.
