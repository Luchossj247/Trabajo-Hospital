// Generación de documentos del hospital: PDF (vía impresión del navegador) y CSV.
//
// Los PDF se arman como una página HTML con formato A4 y se abre el diálogo de impresión;
// el usuario elige "Guardar como PDF" o imprime en papel. No necesita librerías externas
// y respeta tildes y caracteres del español.

export const HOSPITAL = {
  nombre: 'HMSPro',
  subtitulo: 'Sistema de Gestión Hospitalaria',
}

// ── Utilidades de texto ──────────────────────────────────────────
export function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const fmtFecha = (v) => {
  if (!v) return '—'
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + 'T00:00:00') : new Date(v)
  return isNaN(d) ? String(v) : d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const fmtFechaHora = (v) => {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d) ? String(v) : d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

export const fmtMoneda = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(Number(n) || 0)

export function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null
  const nac = new Date(fechaNacimiento + 'T00:00:00')
  const hoy = new Date()
  let edad = hoy.getFullYear() - nac.getFullYear()
  const m = hoy.getMonth() - nac.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
  return edad
}

// Valores de estado con sus tildes y redacción correctas.
export const ESTADOS = {
  en_atencion: 'En atención', en_espera: 'En espera', en_proceso: 'En proceso', derivado: 'Derivado', alta: 'Alta',
  cubre: 'Cubre', cubre_total: 'Cubre total', cubre_parcial: 'Cubre parcialmente', no_cubre: 'No cubre',
  pendiente_verificacion: 'Pendiente de verificación', pendiente: 'Pendiente', completado: 'Completado',
  entregada: 'Entregada', programado: 'Programado', confirmado: 'Confirmado', cancelado: 'Cancelado',
  ausente: 'Ausente', realizado: 'Realizado', disponible: 'Disponible', ocupada: 'Ocupada',
  mantenimiento: 'En mantenimiento', pagado: 'Pagado', deuda: 'Con deuda', derivacion: 'Derivación',
  ambulatorio: 'Por sus propios medios', ambulancia: 'Ambulancia', estable: 'Estable', critico: 'Crítico',
  sin_cobertura: 'Sin cobertura', parcial: 'Parcial',
  en_curso: 'En curso', aceptado: 'Aceptado', rechazado: 'Rechazado',
}

export const etiquetaEstado = (v) => (v == null || v === '' ? '—' : ESTADOS[v] || (String(v).replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())))

export const SEXO = { M: 'Masculino', F: 'Femenino', X: 'Otro / No especifica' }

// ── Bloques de contenido (devuelven HTML ya escapado) ────────────
export const bloques = {
  // Pares etiqueta / valor en dos columnas
  datos(pares) {
    const celdas = pares
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `<div class="dato"><span class="k">${esc(k)}</span><span class="v">${esc(v === null || v === '' ? '—' : v)}</span></div>`)
      .join('')
    return `<div class="datos">${celdas}</div>`
  },
  parrafo(texto) {
    return `<p class="texto">${esc(texto || '—').replace(/\n/g, '<br>')}</p>`
  },
  tabla(encabezados, filas, { alinearDerecha = [] } = {}) {
    if (!filas.length) return '<p class="vacio">Sin registros.</p>'
    const th = encabezados.map((h, i) => `<th class="${alinearDerecha.includes(i) ? 'der' : ''}">${esc(h)}</th>`).join('')
    const tr = filas.map(f => `<tr>${f.map((c, i) => `<td class="${alinearDerecha.includes(i) ? 'der' : ''}">${esc(c ?? '—')}</td>`).join('')}</tr>`).join('')
    return `<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`
  },
  // Cajas lado a lado: [{ titulo, nombre, lineas: [] }]
  cajas(lista) {
    return `<div class="cajas">${lista.map(c => `<div class="caja"><div class="t">${esc(c.titulo)}</div>${c.nombre ? `<div class="n">${esc(c.nombre)}</div>` : ''}${(c.lineas || []).map(l => `<p>${esc(l)}</p>`).join('')}</div>`).join('')}</div>`
  },
  // Cuadro de totales de una factura: [[etiqueta, valor], ...]; la última fila va destacada.
  totales(filas) {
    return `<div class="totales">${filas.map(([k, v]) => `<div><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join('')}</div>`
  },
  sello(texto, color = '#047857') {
    return `<div style="text-align:center;margin:18px 0 0"><span class="sello" style="color:${esc(color)}">${esc(texto)}</span></div>`
  },
  // Tarjeta de identificación del paciente (documentos clínicos).
  banner({ nombre, detalle, alerta, grupo }) {
    return `<div class="banner"><div><div class="nom">${esc(nombre)}</div><div class="det">${esc(detalle)}</div>${alerta ? `<span class="alerta">Alergias: ${esc(alerta)}</span>` : ''}</div>${grupo ? `<div class="sangre">Grupo<b>${esc(grupo)}</b></div>` : ''}</div>`
  },
  // Tarjeta tipo ticket centrada: [{ clase: 'grande'|'medio'|'', texto }]
  ticket(lineas) {
    return `<div class="ticket">${lineas.map(l => `<p class="${esc(l.clase || '')}">${esc(l.texto)}</p>`).join('')}</div>`
  },
  // Tabla semanal (lunes a domingo) con una fila de franjas: celdas = { 0..6: ['09:00 a 13:00', ...] }
  semana(celdas) {
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    const orden = [1, 2, 3, 4, 5, 6, 0]
    return `<table class="semana"><thead><tr>${dias.map(d => `<th>${d}</th>`).join('')}</tr></thead><tbody><tr>${orden.map(n => {
      const l = celdas[n] || []
      return l.length ? `<td>${l.map(t => `<div>${esc(t)}</div>`).join('')}</td>` : '<td class="libre">—</td>'
    }).join('')}</tr></tbody></table>`
  },
  lista(items) {
    if (!items.length) return '<p class="vacio">Sin registros.</p>'
    return `<ul>${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`
  },
}

// Formatos de documento: cada tipo tiene su propia hoja, color y encabezado.
//   estandar    A4 vertical, azul HMSPro
//   factura     A4 con cajas emisor/paciente, cuadro de totales y sello de estado
//   receta      A5 tipo talonario con ℞ grande
//   clinico     A4 con tarjeta del paciente (historial, ficha, epicrisis, órdenes)
//   formal      A4 serif, sin colores (constancias y consentimientos)
//   comprobante A5 tipo ticket (turnos, entregas)
//   agenda      A4 horizontal (agendas, horarios, listas de turnos)
//   informe     A4 horizontal gris (reportes, auditoría, stock)
export const FORMATOS = {
  estandar:    { hoja: 'A4',           ac: '#0B2A8F' },
  factura:     { hoja: 'A4',           ac: '#047857' },
  receta:      { hoja: 'A5',           ac: '#1d4ed8' },
  clinico:     { hoja: 'A4',           ac: '#0f766e' },
  formal:      { hoja: 'A4',           ac: '#111827' },
  comprobante: { hoja: 'A5',           ac: '#0B2A8F' },
  agenda:      { hoja: 'A4 landscape', ac: '#6d28d9' },
  informe:     { hoja: 'A4 landscape', ac: '#334155' },
}

const ESTILOS_BASE = `
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; color: #0f172a; font-size: 12px; line-height: 1.45; margin: 0; }
  header.enc { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid var(--ac); padding-bottom: 8px; margin-bottom: 14px; }
  header.enc .marca { font-size: 22px; font-weight: 800; color: var(--ac); letter-spacing: -0.5px; }
  header.enc .marca small { display: block; font-size: 10px; font-weight: 600; color: #475569; letter-spacing: 0; }
  header.enc .meta { text-align: right; font-size: 10px; color: #475569; }
  h1 { font-size: 18px; margin: 4px 0 2px; color: #0f172a; }
  .sub { color: #475569; margin: 0 0 12px; font-size: 12px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: var(--ac); border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; margin: 16px 0 8px; }
  .datos { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; }
  .dato { display: flex; gap: 6px; padding: 2px 0; }
  .dato .k { color: #475569; min-width: 120px; }
  .dato .v { font-weight: 600; }
  .texto { margin: 0; white-space: normal; }
  .vacio { color: #64748b; font-style: italic; margin: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { text-align: left; background: color-mix(in srgb, var(--ac) 9%, white); color: var(--ac); padding: 5px 6px; border: 1px solid #cbd5e1; }
  td { padding: 5px 6px; border: 1px solid #e2e8f0; vertical-align: top; }
  tr { page-break-inside: avoid; }
  .der { text-align: right; }
  ul { margin: 0; padding-left: 18px; }
  .item { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; margin-bottom: 8px; page-break-inside: avoid; }
  .item .cab { font-weight: 700; margin-bottom: 3px; }
  .firmas { display: flex; justify-content: space-around; gap: 30px; margin-top: 60px; page-break-inside: avoid; }
  .firma { flex: 1; text-align: center; border-top: 1px solid #0f172a; padding-top: 4px; font-size: 11px; }
  .firma small { display: block; color: #475569; }
  footer.pie { margin-top: 22px; border-top: 1px solid #cbd5e1; padding-top: 6px; font-size: 9.5px; color: #64748b; }
  .aviso { background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; padding: 6px 8px; border-radius: 6px; font-size: 10.5px; margin-top: 10px; }

  /* Bloques reutilizables */
  .cajas { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 4px; }
  .caja { border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 12px; }
  .caja .t { font-size: 9.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--ac); margin-bottom: 4px; }
  .caja .n { font-size: 14px; font-weight: 800; }
  .caja p { margin: 1px 0; color: #334155; }
  .totales { margin-left: auto; width: 56%; margin-top: 10px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; }
  .totales div { display: flex; justify-content: space-between; padding: 6px 12px; border-bottom: 1px solid #e2e8f0; }
  .totales div:last-child { border-bottom: 0; background: var(--ac); color: #fff; font-size: 14px; font-weight: 800; }
  .sello { display: inline-block; border: 3px solid currentColor; border-radius: 8px; padding: 4px 16px; font-size: 18px; font-weight: 900; letter-spacing: .12em; transform: rotate(-6deg); opacity: .85; }
  .banner { display: flex; justify-content: space-between; gap: 16px; background: color-mix(in srgb, var(--ac) 8%, white); border: 1px solid color-mix(in srgb, var(--ac) 35%, white); border-left: 6px solid var(--ac); border-radius: 8px; padding: 10px 14px; margin-bottom: 6px; }
  .banner .nom { font-size: 17px; font-weight: 800; }
  .banner .det { color: #334155; margin-top: 2px; }
  .banner .alerta { margin-top: 5px; display: inline-block; background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; border-radius: 5px; padding: 1px 7px; font-weight: 700; font-size: 10.5px; }
  .banner .sangre { text-align: center; border-left: 1px solid #cbd5e1; padding-left: 14px; }
  .banner .sangre b { display: block; font-size: 20px; color: var(--ac); }
  .semana th, .semana td { text-align: center; width: 14.28%; }
  .semana td { font-size: 10.5px; height: 46px; }
  .semana td.libre { color: #cbd5e1; }
  .semana td div { background: color-mix(in srgb, var(--ac) 12%, white); border-radius: 4px; padding: 2px 4px; margin: 2px 0; font-weight: 600; }
`

const ESTILOS_FORMATO = {
  estandar: '',
  factura: `
    header.enc { border-bottom: 0; background: var(--ac); color: #fff; padding: 12px 16px; border-radius: 8px; align-items: center; }
    header.enc .marca, header.enc .marca small, header.enc .meta { color: #fff; }
    header.enc .meta { font-size: 11px; line-height: 1.5; }
    h1 { text-transform: uppercase; letter-spacing: .08em; font-size: 15px; margin-top: 14px; }
    th { background: #f1f5f9; color: #0f172a; }
  `,
  receta: `
    body { font-size: 12.5px; }
    header.enc { border-bottom: 2px solid var(--ac); }
    header.enc .marca { font-size: 17px; }
    .rx { font-size: 54px; font-weight: 700; color: var(--ac); line-height: 1; margin: 6px 0 2px; font-family: Georgia, serif; }
    .med { display: flex; gap: 10px; padding: 9px 0; border-bottom: 1px dashed #94a3b8; page-break-inside: avoid; }
    .med .num { font-weight: 800; color: var(--ac); font-size: 15px; width: 18px; }
    .med .nombre { font-size: 15px; font-weight: 800; }
    .med .pos { color: #334155; }
    .med .ind { color: #64748b; font-style: italic; }
    h1 { display: none; }
    .firmas { margin-top: 44px; }
  `,
  clinico: `
    h2 { border-bottom: 0; background: color-mix(in srgb, var(--ac) 10%, white); padding: 4px 8px; border-left: 4px solid var(--ac); }
    header.enc { border-bottom: 1px solid #cbd5e1; }
  `,
  formal: `
    body { font-family: Georgia, 'Times New Roman', serif; font-size: 13px; line-height: 1.65; }
    header.enc { border-bottom: 1px solid #111827; }
    header.enc .marca { font-size: 18px; letter-spacing: 1px; text-transform: uppercase; }
    h1 { text-align: center; text-transform: uppercase; letter-spacing: .1em; font-size: 16px; margin: 24px 0 16px; }
    h2 { color: #111827; border-bottom: 1px solid #111827; text-transform: none; font-size: 13px; letter-spacing: 0; }
    th { background: transparent; color: #111827; }
    .texto { text-align: justify; }
    .firmas { margin-top: 90px; }
  `,
  comprobante: `
    body { font-size: 12.5px; }
    header.enc { border-bottom: 2px dashed #94a3b8; }
    h1 { text-align: center; font-size: 17px; text-transform: uppercase; letter-spacing: .06em; }
    .ticket { border: 2px dashed var(--ac); border-radius: 12px; padding: 14px 16px; margin: 8px 0; text-align: center; }
    .ticket .grande { font-size: 24px; font-weight: 800; color: var(--ac); }
    .ticket .medio { font-size: 15px; font-weight: 700; }
    .ticket p { margin: 3px 0; color: #334155; }
  `,
  agenda: `
    h1 { font-size: 20px; }
    header.enc { border-bottom: 0; background: color-mix(in srgb, var(--ac) 10%, white); padding: 8px 12px; border-radius: 8px; align-items: center; }
    th { background: var(--ac); color: #fff; border-color: var(--ac); }
    tbody tr:nth-child(even) td { background: #f8fafc; }
  `,
  informe: `
    header.enc { border-bottom: 2px solid #94a3b8; }
    h1 { font-size: 20px; letter-spacing: -.3px; }
    th { background: #e2e8f0; color: #0f172a; }
    tbody tr:nth-child(even) td { background: #f8fafc; }
  `,
}

export function construirHtml({ titulo, subtitulo, codigo, secciones = [], firmas = [], generadoPor, pie, formato = 'estandar' }) {
  const fmt = FORMATOS[formato] || FORMATOS.estandar
  const ahora = new Date().toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' })
  const cuerpo = secciones
    .map(s => `${s.titulo ? `<h2>${esc(s.titulo)}</h2>` : ''}${s.html}`)
    .join('')
  const bloqueFirmas = firmas.length
    ? `<div class="firmas">${firmas.map(f => `<div class="firma">${esc(f.nombre || ' ')}${f.detalle ? `<small>${esc(f.detalle)}</small>` : ''}</div>`).join('')}</div>`
    : ''
  const esFactura = formato === 'factura'
  const meta = esFactura
    ? `<strong>${esc(titulo).toUpperCase()}</strong><br>${codigo ? `N.º ${esc(codigo)}<br>` : ''}Fecha: ${esc(ahora)}`
    : `${codigo ? `N.º ${esc(codigo)}<br>` : ''}Emitido: ${esc(ahora)}`
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>
    @page { size: ${fmt.hoja}; margin: ${fmt.hoja === 'A5' ? '10mm' : '16mm 14mm'}; }
    :root { --ac: ${fmt.ac}; }
    ${ESTILOS_BASE}
    ${ESTILOS_FORMATO[formato] || ''}
  </style></head><body class="f-${esc(formato)}">
    <header class="enc">
      <div class="marca">${esc(HOSPITAL.nombre)}<small>${esc(HOSPITAL.subtitulo)}</small></div>
      <div class="meta">${meta}</div>
    </header>
    ${esFactura ? '' : `<h1>${esc(titulo)}</h1>`}
    ${subtitulo ? `<p class="sub">${esc(subtitulo)}</p>` : ''}
    ${cuerpo}
    ${bloqueFirmas}
    <footer class="pie">${esc(pie || 'Documento generado por el sistema HMSPro.')}${generadoPor ? ` Generado por: ${esc(generadoPor)}.` : ''} Contiene datos personales y de salud: tratar con confidencialidad.</footer>
  </body></html>`
}

// Abre el diálogo de impresión / "Guardar como PDF" con el documento armado.
// `secciones`: [{ titulo?, html }] (html se arma con `bloques.*`).
export function imprimirDocumento(doc) {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  document.body.appendChild(iframe)

  const w = iframe.contentWindow
  w.document.open()
  w.document.write(construirHtml(doc))
  w.document.close()

  // Chrome toma el nombre sugerido del PDF del título de la página principal.
  const tituloOriginal = document.title
  document.title = doc.nombreArchivo || doc.titulo
  const limpiar = () => { document.title = tituloOriginal; setTimeout(() => iframe.remove(), 500) }
  w.addEventListener('afterprint', limpiar)

  setTimeout(() => {
    try { w.focus(); w.print() } catch { limpiar() }
  }, 250)
}

// ── CSV (se abre bien en Excel en español: separador ";" y BOM UTF-8) ──
export function descargarCSV(nombreBase, encabezados, filas) {
  // Los números llevan coma decimal (Excel en español) y no se entrecomillan.
  const celda = v => typeof v === 'number' ? String(v).replace('.', ',') : `"${String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`
  const csv = [encabezados, ...filas].map(r => r.map(celda).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['﻿' + 'sep=;\r\n' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombreBase}_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// "Nombre Apellido" de un perfil de usuario (para el pie "Generado por: …")
export const nombreDe = (perfil) => (perfil ? `${perfil.nombre} ${perfil.apellido}` : undefined)
