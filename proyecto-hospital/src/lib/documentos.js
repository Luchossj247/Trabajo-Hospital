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
  lista(items) {
    if (!items.length) return '<p class="vacio">Sin registros.</p>'
    return `<ul>${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`
  },
}

const ESTILOS = `
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; color: #0f172a; font-size: 12px; line-height: 1.45; margin: 0; }
  header.enc { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0B2A8F; padding-bottom: 8px; margin-bottom: 14px; }
  header.enc .marca { font-size: 22px; font-weight: 800; color: #0B2A8F; letter-spacing: -0.5px; }
  header.enc .marca small { display: block; font-size: 10px; font-weight: 600; color: #475569; letter-spacing: 0; }
  header.enc .meta { text-align: right; font-size: 10px; color: #475569; }
  h1 { font-size: 18px; margin: 4px 0 2px; color: #0f172a; }
  .sub { color: #475569; margin: 0 0 12px; font-size: 12px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #0B2A8F; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; margin: 16px 0 8px; }
  .datos { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; }
  .dato { display: flex; gap: 6px; padding: 2px 0; }
  .dato .k { color: #475569; min-width: 120px; }
  .dato .v { font-weight: 600; }
  .texto { margin: 0; white-space: normal; }
  .vacio { color: #64748b; font-style: italic; margin: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { text-align: left; background: #eef2ff; color: #0B2A8F; padding: 5px 6px; border: 1px solid #cbd5e1; }
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
`

export function construirHtml({ titulo, subtitulo, codigo, secciones = [], firmas = [], generadoPor, pie }) {
  const ahora = new Date().toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' })
  const cuerpo = secciones
    .map(s => `${s.titulo ? `<h2>${esc(s.titulo)}</h2>` : ''}${s.html}`)
    .join('')
  const bloqueFirmas = firmas.length
    ? `<div class="firmas">${firmas.map(f => `<div class="firma">${esc(f.nombre || ' ')}${f.detalle ? `<small>${esc(f.detalle)}</small>` : ''}</div>`).join('')}</div>`
    : ''
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>${ESTILOS}</style></head><body>
    <header class="enc">
      <div class="marca">${esc(HOSPITAL.nombre)}<small>${esc(HOSPITAL.subtitulo)}</small></div>
      <div class="meta">${codigo ? `N.º ${esc(codigo)}<br>` : ''}Emitido: ${esc(ahora)}</div>
    </header>
    <h1>${esc(titulo)}</h1>
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
