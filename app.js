'use strict';

const STORAGE_KEY = 'historial-bolivar-v1';
const TORNEOS = ['Primera División', 'Copa Bolivia', 'Copa Libertadores', 'Copa Sudamericana', 'Amistoso'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ETIQUETAS = { victoria: 'Victoria', empate: 'Empate', derrota: 'Derrota' };
const TONOS = { victoria: 'win', empate: 'draw', derrota: 'loss' };

const ICONO_EDITAR = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
const ICONO_BORRAR = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>';

const $ = (selector) => document.querySelector(selector);

const el = {
  stats: $('#stats'),
  statsNote: $('#statsNote'),
  list: $('#list'),
  search: $('#search'),
  filterResultado: $('#filterResult'),
  filterTorneo: $('#filterTorneo'),
  dialog: $('#dialog'),
  form: $('#form'),
  dlgTitle: $('#dlgTitle'),
  fecha: $('#fecha'),
  torneo: $('#torneo'),
  rival: $('#rival'),
  gf: $('#gf'),
  gc: $('#gc'),
  estadio: $('#estadio'),
  notas: $('#notas'),
  preview: $('#preview'),
  btnSave: $('#btnSave'),
  btnCancel: $('#btnCancel'),
  btnClose: $('#btnClose'),
  btnAdd: $('#btnAdd'),
  btnExport: $('#btnExport'),
  btnInstall: $('#btnInstall'),
  btnClear: $('#btnClear'),
  importInput: $('#importInput'),
  toast: $('#toast'),
};

let partidos = cargarPartidos();
let editandoId = null;
let toastTimer = null;

const filtros = {
  texto: '',
  resultado: 'todas',
  torneo: 'todos',
};

/* ---------- Utilidades ---------- */

function uid() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function esc(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (caracter) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[caracter]));
}

function norm(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function hoyISO() {
  const ahora = new Date();
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function fechaLarga(iso) {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return `${dia} de ${MESES_LARGOS[mes - 1]} de ${anio}`;
}

function fechaValida(iso) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!partes) return false;

  const [anio, mes, dia] = partes.slice(1).map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));

  return fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia;
}

function resultado(partido) {
  if (partido.gf > partido.gc) return 'victoria';
  if (partido.gf < partido.gc) return 'derrota';
  return 'empate';
}

function normalizarPartido(dato) {
  if (!dato || typeof dato !== 'object') return null;

  const rival = String(dato.rival ?? '').trim().slice(0, 80);
  const fecha = String(dato.fecha ?? '').slice(0, 10);
  if (!rival || !fechaValida(fecha)) return null;

  const gf = Number.parseInt(dato.gf, 10);
  const gc = Number.parseInt(dato.gc, 10);
  if (!Number.isFinite(gf) || !Number.isFinite(gc) || gf < 0 || gc < 0 || gf > 99 || gc > 99) return null;

  const idValido = typeof dato.id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(dato.id);

  return {
    id: idValido ? dato.id : uid(),
    fecha,
    rival,
    torneo: String(dato.torneo ?? '').trim().slice(0, 60),
    gf,
    gc,
    estadio: String(dato.estadio ?? '').trim().slice(0, 80),
    notas: String(dato.notas ?? '').trim().slice(0, 500),
    creado: Number.isFinite(Number(dato.creado)) ? Number(dato.creado) : Date.now(),
  };
}

/* ---------- Almacenamiento ---------- */

function cargarPartidos() {
  try {
    const crudo = localStorage.getItem(STORAGE_KEY);
    if (!crudo) return [];
    const datos = JSON.parse(crudo);
    if (!Array.isArray(datos)) return [];
    return datos.map(normalizarPartido).filter(Boolean);
  } catch (error) {
    console.error('No se pudo cargar el historial:', error);
    return [];
  }
}

function guardarPartidos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(partidos));
  } catch (error) {
    console.error('No se pudo guardar el historial:', error);
    toast('No se pudo guardar. Revisa el espacio del navegador.');
  }
}

/* ---------- Render ---------- */

function render() {
  renderEstadisticas();
  renderOpcionesTorneo();
  renderLista();
}

function renderEstadisticas() {
  const total = partidos.length;
  const conteo = { victoria: 0, empate: 0, derrota: 0 };

  for (const partido of partidos) {
    conteo[resultado(partido)] += 1;
  }

  const golesFavor = partidos.reduce((suma, p) => suma + p.gf, 0);
  const golesContra = partidos.reduce((suma, p) => suma + p.gc, 0);
  const porcentaje = total ? Math.round((conteo.victoria / total) * 100) : 0;

  const tarjetas = [
    { clase: 'total', etiqueta: 'Partidos', valor: total },
    { clase: 'win', etiqueta: 'Victorias', valor: conteo.victoria },
    { clase: 'draw', etiqueta: 'Empates', valor: conteo.empate },
    { clase: 'loss', etiqueta: 'Derrotas', valor: conteo.derrota },
    { clase: 'pct', etiqueta: '% Victorias', valor: `${porcentaje}%` },
  ];

  el.stats.innerHTML = tarjetas.map((t) => `
    <div class="stat stat--${t.clase}">
      <div class="stat__value">${t.valor}</div>
      <div class="stat__label">${t.etiqueta}</div>
    </div>
  `).join('');

  if (total) {
    el.statsNote.textContent = `${golesFavor} goles a favor · ${golesContra} en contra`;
    el.statsNote.hidden = false;
  } else {
    el.statsNote.textContent = '';
    el.statsNote.hidden = true;
  }
}

function renderOpcionesTorneo() {
  const seleccionado = el.filterTorneo.value || 'todos';
  const otros = [...new Set(partidos.map((p) => p.torneo))]
    .filter((torneo) => torneo && !TORNEOS.includes(torneo))
    .sort((a, b) => a.localeCompare(b, 'es'));
  const torneos = [...TORNEOS, ...otros];

  el.filterTorneo.innerHTML = '<option value="todos">Todos los torneos</option>' +
    torneos.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join('');

  el.filterTorneo.value = torneos.includes(seleccionado) ? seleccionado : 'todos';
  filtros.torneo = el.filterTorneo.value;
}

function partidosFiltrados() {
  const texto = norm(filtros.texto);

  return partidos
    .filter((p) => {
      if (filtros.resultado !== 'todas' && resultado(p) !== filtros.resultado) return false;
      if (filtros.torneo !== 'todos' && p.torneo !== filtros.torneo) return false;
      if (texto) {
        const coincide = [p.rival, p.torneo, p.estadio, p.notas].some((campo) => norm(campo).includes(texto));
        if (!coincide) return false;
      }
      return true;
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creado - a.creado);
}

function renderLista() {
  const lista = partidosFiltrados();

  if (!lista.length) {
    const hayHistorial = partidos.length > 0;
    el.list.innerHTML = `
      <div class="empty">
        <div class="empty__icon" aria-hidden="true">⚽</div>
        <h2>${hayHistorial ? 'Sin resultados para esa búsqueda' : 'Tu historial empieza acá'}</h2>
        <p>${hayHistorial
          ? 'Prueba con otro rival, torneo o resultado.'
          : 'Registra cada partido del Bolívar al que vayas al estadio y mira cómo crece tu historial.'}</p>
        ${hayHistorial
          ? '<button class="btn btn--ghost" type="button" data-action="reset">Limpiar filtros</button>'
          : '<button class="btn btn--primary" type="button" data-action="add">Registrar mi primer partido</button>'}
      </div>
    `;
    return;
  }

  let html = '';
  let anioActual = null;

  for (const partido of lista) {
    const anio = partido.fecha.slice(0, 4);
    if (anio !== anioActual) {
      html += `<div class="year"><h2>${anio}</h2></div>`;
      anioActual = anio;
    }
    html += tarjetaPartido(partido);
  }

  el.list.innerHTML = html;
}

function tarjetaPartido(partido) {
  const tipo = resultado(partido);
  const tono = TONOS[tipo];
  const [, mes, dia] = partido.fecha.split('-');
  const meta = [];

  if (partido.torneo) meta.push(`<span class="chip">${esc(partido.torneo)}</span>`);
  if (partido.estadio) meta.push(`<span>${esc(partido.estadio)}</span>`);

  return `
    <article class="match match--${tono}">
      <div class="match__date" title="${esc(fechaLarga(partido.fecha))}">
        <span class="match__day">${Number(dia)}</span>
        <span class="match__month">${MESES[Number(mes) - 1]}</span>
      </div>

      <div class="match__body">
        <h3 class="match__title">
          <span class="home">Bolívar</span> <span class="vs">vs</span> ${esc(partido.rival)}
        </h3>
        ${meta.length ? `<div class="match__meta">${meta.join('')}</div>` : ''}
        ${partido.notas ? `<p class="match__notes">${esc(partido.notas)}</p>` : ''}
      </div>

      <div class="match__result">
        <div class="score">${partido.gf}<em>–</em>${partido.gc}</div>
        <span class="pill pill--${tono}">${ETIQUETAS[tipo]}</span>
      </div>

      <div class="match__actions">
        <button class="icon-btn" type="button" data-action="edit" data-id="${partido.id}" title="Editar" aria-label="Editar partido contra ${esc(partido.rival)}">
          ${ICONO_EDITAR}
        </button>
        <button class="icon-btn icon-btn--danger" type="button" data-action="delete" data-id="${partido.id}" title="Eliminar" aria-label="Eliminar partido contra ${esc(partido.rival)}">
          ${ICONO_BORRAR}
        </button>
      </div>
    </article>
  `;
}

/* ---------- Formulario ---------- */

function seleccionarTorneo(valor) {
  const opcionAnterior = el.torneo.querySelector('option[data-legado]');
  if (opcionAnterior) opcionAnterior.remove();

  const existe = Array.from(el.torneo.options).some((opcion) => opcion.value === valor);

  if (!existe) {
    const opcion = document.createElement('option');
    opcion.value = valor;
    opcion.textContent = valor || 'Sin torneo';
    opcion.dataset.legado = 'true';
    el.torneo.appendChild(opcion);
  }

  el.torneo.value = valor;
}

function abrirFormulario(partido = null) {
  editandoId = partido ? partido.id : null;
  el.form.reset();

  el.dlgTitle.textContent = partido ? 'Editar partido' : 'Registrar partido';
  el.btnSave.textContent = partido ? 'Guardar cambios' : 'Guardar partido';

  if (partido) {
    el.fecha.value = partido.fecha;
    seleccionarTorneo(partido.torneo);
    el.rival.value = partido.rival;
    el.gf.value = partido.gf;
    el.gc.value = partido.gc;
    el.estadio.value = partido.estadio;
    el.notas.value = partido.notas;
  } else {
    el.fecha.value = hoyISO();
    seleccionarTorneo('Primera División');
    el.estadio.value = 'Estadio Hernando Siles';
  }

  actualizarPreview();
  el.dialog.showModal();
  requestAnimationFrame(() => el.rival.focus());
}

function actualizarPreview() {
  const gf = el.gf.value;
  const gc = el.gc.value;

  if (gf === '' || gc === '') {
    el.preview.textContent = 'Completa los goles para ver el resultado.';
    return;
  }

  const tipo = resultado({ gf: Number(gf), gc: Number(gc) });
  el.preview.innerHTML = `Resultado: <span class="pill pill--${TONOS[tipo]}">${ETIQUETAS[tipo]}</span> <strong>${esc(gf)} – ${esc(gc)}</strong>`;
}

function guardarDesdeFormulario(evento) {
  evento.preventDefault();

  const fecha = el.fecha.value;
  const rival = el.rival.value.trim();

  if (!fecha || !rival) return;

  const gf = Math.min(99, Math.max(0, Number.parseInt(el.gf.value, 10) || 0));
  const gc = Math.min(99, Math.max(0, Number.parseInt(el.gc.value, 10) || 0));

  const datos = {
    fecha,
    rival: rival.slice(0, 80),
    torneo: el.torneo.value.trim().slice(0, 60),
    gf,
    gc,
    estadio: el.estadio.value.trim().slice(0, 80),
    notas: el.notas.value.trim().slice(0, 500),
  };

  if (editandoId) {
    const indice = partidos.findIndex((p) => p.id === editandoId);
    if (indice >= 0) {
      partidos[indice] = { ...partidos[indice], ...datos };
    }
    toast('Partido actualizado');
  } else {
    partidos.push({ id: uid(), creado: Date.now(), ...datos });
    toast('Partido guardado');
  }

  guardarPartidos();
  render();
  el.dialog.close();
}

/* ---------- Acciones de datos ---------- */

function exportar() {
  if (!partidos.length) {
    toast('No hay partidos para exportar');
    return;
  }

  const contenido = JSON.stringify(partidos, null, 2);
  const blob = new Blob([contenido], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');

  enlace.href = url;
  enlace.download = `historial-bolivar-${hoyISO()}.json`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Copia exportada');
}

async function importar(archivo) {
  try {
    const contenido = await archivo.text();
    const datos = JSON.parse(contenido);

    if (!Array.isArray(datos)) throw new Error('El archivo no contiene una lista de partidos');

    const limpios = datos.map(normalizarPartido).filter(Boolean);
    if (!limpios.length) throw new Error('No se encontraron partidos válidos');

    const mensaje = `Se importarán ${limpios.length} partido(s) y se reemplazarán los ${partidos.length} actuales. ¿Continuar?`;
    if (!window.confirm(mensaje)) return;

    partidos = limpios;
    guardarPartidos();
    limpiarFiltros();
    render();
    toast(`Importados ${limpios.length} partido(s)`);
  } catch (error) {
    console.error('Error al importar:', error);
    window.alert('No pudimos leer ese archivo. Asegúrate de que sea un JSON exportado desde esta app.');
  }
}

function borrarTodo() {
  if (!partidos.length) {
    toast('No hay partidos para borrar');
    return;
  }

  const mensaje = `¿Borrar los ${partidos.length} partidos guardados? Esta acción no se puede deshacer.`;
  if (!window.confirm(mensaje)) return;

  partidos = [];
  guardarPartidos();
  render();
  toast('Historial borrado');
}

function limpiarFiltros() {
  filtros.texto = '';
  filtros.resultado = 'todas';
  filtros.torneo = 'todos';
  el.search.value = '';
  el.filterResultado.value = 'todas';
  el.filterTorneo.value = 'todos';
  renderLista();
}

/* ---------- Toast ---------- */

function toast(mensaje) {
  el.toast.textContent = mensaje;
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2400);
}

/* ---------- Eventos ---------- */

el.btnAdd.addEventListener('click', () => abrirFormulario());
el.btnClose.addEventListener('click', () => el.dialog.close());
el.btnCancel.addEventListener('click', () => el.dialog.close());

el.dialog.addEventListener('click', (evento) => {
  if (evento.target === el.dialog) el.dialog.close();
});

el.form.addEventListener('submit', guardarDesdeFormulario);
el.gf.addEventListener('input', actualizarPreview);
el.gc.addEventListener('input', actualizarPreview);

el.search.addEventListener('input', () => {
  filtros.texto = el.search.value;
  renderLista();
});

el.filterResultado.addEventListener('change', () => {
  filtros.resultado = el.filterResultado.value;
  renderLista();
});

el.filterTorneo.addEventListener('change', () => {
  filtros.torneo = el.filterTorneo.value;
  renderLista();
});

el.list.addEventListener('click', (evento) => {
  const boton = evento.target.closest('button[data-action]');
  if (!boton) return;

  const accion = boton.dataset.action;

  if (accion === 'add') {
    abrirFormulario();
    return;
  }

  if (accion === 'reset') {
    limpiarFiltros();
    return;
  }

  const partido = partidos.find((p) => p.id === boton.dataset.id);
  if (!partido) return;

  if (accion === 'edit') {
    abrirFormulario(partido);
    return;
  }

  if (accion === 'delete') {
    const mensaje = `¿Eliminar el partido contra ${partido.rival} del ${fechaLarga(partido.fecha)}?`;
    if (window.confirm(mensaje)) {
      partidos = partidos.filter((p) => p.id !== partido.id);
      guardarPartidos();
      render();
      toast('Partido eliminado');
    }
  }
});

el.btnExport.addEventListener('click', exportar);

el.importInput.addEventListener('change', async () => {
  const archivo = el.importInput.files && el.importInput.files[0];
  if (archivo) await importar(archivo);
  el.importInput.value = '';
});

el.btnClear.addEventListener('click', borrarTodo);

window.addEventListener('storage', (evento) => {
  if (evento.key !== STORAGE_KEY) return;
  partidos = cargarPartidos();
  render();
});

/* ---------- PWA ---------- */

let promptInstalacion = null;

window.addEventListener('beforeinstallprompt', (evento) => {
  evento.preventDefault();
  promptInstalacion = evento;
  el.btnInstall.hidden = false;
});

el.btnInstall.addEventListener('click', async () => {
  if (!promptInstalacion) return;

  promptInstalacion.prompt();
  await promptInstalacion.userChoice;

  promptInstalacion = null;
  el.btnInstall.hidden = true;
});

window.addEventListener('appinstalled', () => {
  promptInstalacion = null;
  el.btnInstall.hidden = true;
  toast('App instalada');
});

if ('serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('No se pudo registrar el service worker:', error);
    });
  });
}

/* ---------- Inicio ---------- */

render();
