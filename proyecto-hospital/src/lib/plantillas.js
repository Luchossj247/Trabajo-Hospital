// Plantillas de los documentos que emite el hospital. Cada función arma el contenido y abre
// el diálogo de impresión / "Guardar como PDF" (ver lib/documentos.js).
import {
  imprimirDocumento, bloques, fmtFecha, fmtFechaHora, fmtMoneda, calcularEdad, etiquetaEstado, SEXO,
} from './documentos'

const nombreCompleto = (p) => (p ? `${p.apellido}, ${p.nombre}` : '—')
const nombreMedico = (m) => (m ? `Dr/a. ${m.apellido}, ${m.nombre}` : '—')
const codigoCorto = (id) => (id ? String(id).slice(0, 8).toUpperCase() : undefined)

// Datos de identificación que se repiten en todos los documentos clínicos.
function datosPaciente(paciente) {
  const edad = calcularEdad(paciente.fechaNacimiento)
  return bloques.datos([
    ['Paciente', nombreCompleto(paciente)],
    ['DNI', paciente.dni],
    ['Fecha de nacimiento', paciente.fechaNacimiento ? `${fmtFecha(paciente.fechaNacimiento)}${edad != null ? ` (${edad} años)` : ''}` : '—'],
    ['Sexo', SEXO[paciente.sexo] || '—'],
  ])
}

// ── Receta médica ────────────────────────────────────────────────
export function imprimirReceta({ receta, paciente, medico, items, generadoPor }) {
  imprimirDocumento({
    titulo: 'Receta médica',
    nombreArchivo: `Receta ${paciente.apellido} ${paciente.nombre}`,
    codigo: codigoCorto(receta?.id),
    generadoPor,
    secciones: [
      { titulo: 'Paciente', html: datosPaciente(paciente) },
      { titulo: 'Fecha de emisión', html: bloques.parrafo(fmtFechaHora(receta?.createdAt || new Date().toISOString())) },
      {
        titulo: 'Prescripción',
        html: bloques.tabla(
          ['N.º', 'Medicamento', 'Dosis', 'Frecuencia', 'Indicaciones'],
          items.map((it, i) => [i + 1, it.medicamentoNombre, it.dosis || '—', it.frecuencia || '—', it.indicaciones || '—'])),
      },
    ],
    firmas: [{ nombre: nombreMedico(medico), detalle: 'Firma y sello del profesional' }],
    pie: 'Receta emitida desde el sistema HMSPro. Requiere la firma y el sello del profesional para su entrega en farmacia.',
  })
}

// ── Historial clínico completo ───────────────────────────────────
export function imprimirHistorialClinico({ paciente, cobertura, historial, generadoPor }) {
  const atenciones = historial?.atencionMedica || []
  const documentos = historial?.documentoClinico || []
  imprimirDocumento({
    titulo: 'Historial clínico',
    nombreArchivo: `Historial clinico ${paciente.apellido} ${paciente.nombre}`,
    subtitulo: nombreCompleto(paciente),
    codigo: codigoCorto(historial?.id),
    generadoPor,
    secciones: [
      {
        titulo: 'Datos del paciente',
        html: bloques.datos([
          ['Paciente', nombreCompleto(paciente)],
          ['DNI', paciente.dni],
          ['Fecha de nacimiento', paciente.fechaNacimiento ? `${fmtFecha(paciente.fechaNacimiento)} (${calcularEdad(paciente.fechaNacimiento)} años)` : '—'],
          ['Sexo', SEXO[paciente.sexo] || '—'],
          ['Grupo sanguíneo', paciente.grupoSanguineo || '—'],
          ['Alergias', paciente.alergias || 'No registradas'],
          ['Teléfono', paciente.telefono || '—'],
          ['Dirección', paciente.direccion || '—'],
          ['Contacto de emergencia', paciente.contactoEmergenciaNombre ? `${paciente.contactoEmergenciaNombre}${paciente.contactoEmergenciaTelefono ? ` · ${paciente.contactoEmergenciaTelefono}` : ''}` : '—'],
        ]),
      },
      {
        titulo: 'Cobertura médica',
        html: cobertura
          ? bloques.datos([
              ['Obra social', cobertura.obraSocial || '—'],
              ['Plan', cobertura.plan || '—'],
              ['N.º de afiliado', cobertura.numeroAfiliado || '—'],
              ['Estado', etiquetaEstado(cobertura.estadoCobertura)],
            ])
          : bloques.parrafo('Sin cobertura cargada.'),
      },
      { titulo: 'Observaciones clínicas generales', html: bloques.parrafo(historial?.observacionesGenerales || 'Sin observaciones.') },
      {
        titulo: `Atenciones (${atenciones.length})`,
        html: bloques.tabla(
          ['Fecha', 'Motivo', 'Estado', 'Médico/a', 'Observaciones'],
          atenciones.map(a => [fmtFecha(a.fecha), a.motivo, etiquetaEstado(a.estado), a.medico ? nombreMedico(a.medico) : '—', a.observaciones || '—'])),
      },
      {
        titulo: `Documentos clínicos (${documentos.length})`,
        html: bloques.tabla(
          ['Fecha', 'Tipo', 'Descripción', 'Archivo'],
          documentos.map(d => [fmtFecha(d.subidoAt), etiquetaEstado(d.tipo), d.descripcion || '—', d.nombreArchivo || (d.urlArchivo ? 'Enlace externo' : '—')])),
      },
    ],
    pie: 'Resumen del historial clínico al momento de la emisión. Los archivos adjuntos no se incluyen: se consultan desde el sistema.',
  })
}

// ── Constancia de atención médica ────────────────────────────────
export function imprimirConstanciaAtencion({ paciente, atencion, generadoPor }) {
  const texto =
    `Se deja constancia de que ${nombreCompleto(paciente)}, DNI ${paciente.dni}, fue atendido/a el ${fmtFecha(atencion.fecha)} ` +
    `en el establecimiento, en el marco de una atención médica por el siguiente motivo: ${atencion.motivo}.`
  imprimirDocumento({
    titulo: 'Constancia de atención médica',
    nombreArchivo: `Constancia ${paciente.apellido} ${paciente.nombre} ${fmtFecha(atencion.fecha)}`,
    codigo: codigoCorto(atencion.id),
    generadoPor,
    secciones: [
      { titulo: 'Paciente', html: datosPaciente(paciente) },
      { titulo: 'Constancia', html: bloques.parrafo(texto) },
      {
        titulo: 'Detalle',
        html: bloques.datos([
          ['Fecha de atención', fmtFechaHora(atencion.fecha)],
          ['Estado', etiquetaEstado(atencion.estado)],
          ['Profesional', atencion.medico ? nombreMedico(atencion.medico) : '—'],
        ]),
      },
      ...(atencion.observaciones ? [{ titulo: 'Observaciones', html: bloques.parrafo(atencion.observaciones) }] : []),
    ],
    firmas: [{ nombre: atencion.medico ? nombreMedico(atencion.medico) : ' ', detalle: 'Firma y sello del profesional' }],
    pie: 'Esta constancia certifica la atención recibida. Se emite a pedido del paciente y no incluye diagnóstico.',
  })
}

// ── Comprobante de facturación ───────────────────────────────────
export function imprimirComprobanteFactura({ factura, generadoPor }) {
  const p = factura.datosPaciente || factura.paciente
  imprimirDocumento({
    titulo: 'Comprobante de facturación',
    nombreArchivo: `Comprobante ${p?.apellido ?? ''} ${p?.nombre ?? ''}`.trim(),
    codigo: codigoCorto(factura.id),
    generadoPor,
    secciones: [
      {
        titulo: 'Paciente',
        html: bloques.datos([['Paciente', nombreCompleto(p)], ['DNI', p?.dni], ['Fecha de emisión', fmtFecha(factura.createdAt)]]),
      },
      {
        titulo: 'Detalle',
        html: bloques.tabla(['Concepto', 'Importe'], [
          ['Atención en guardia — monto total', fmtMoneda(factura.montoTotal)],
          ['Cubierto por la obra social', fmtMoneda(factura.montoObraSocial)],
          ['A cargo del paciente', fmtMoneda(factura.montoPaciente)],
        ], { alinearDerecha: [1] }),
      },
      {
        titulo: 'Estado',
        html: bloques.datos([
          ['Cobertura', etiquetaEstado(factura.estadoCobertura)],
          ['Pago', etiquetaEstado(factura.estadoPago)],
        ]),
      },
      ...(factura.observaciones ? [{ titulo: 'Observaciones', html: bloques.parrafo(factura.observaciones) }] : []),
    ],
    pie: 'Comprobante interno de gestión hospitalaria: no reemplaza a la factura fiscal.',
  })
}

// ── Comprobante de turno ─────────────────────────────────────────
export function imprimirComprobanteTurno({ turno, generadoPor }) {
  const p = turno.paciente
  const fecha = turno.fecha ? new Date(turno.fecha + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'
  imprimirDocumento({
    titulo: 'Comprobante de turno',
    nombreArchivo: `Turno ${p?.apellido ?? ''} ${turno.fecha ?? ''}`.trim(),
    codigo: codigoCorto(turno.id),
    generadoPor,
    secciones: [
      { titulo: 'Paciente', html: bloques.datos([['Paciente', nombreCompleto(p)], ['DNI', p?.dni]]) },
      {
        titulo: 'Turno',
        html: bloques.datos([
          ['Fecha', fecha],
          ['Horario', turno.horaInicio ? `${turno.horaInicio.slice(0, 5)}${turno.horaFin ? ` a ${turno.horaFin.slice(0, 5)}` : ''} hs` : '—'],
          ['Profesional', nombreMedico(turno.medico)],
          ['Motivo', turno.motivo || 'Consulta general'],
          ['Estado', etiquetaEstado(turno.estado)],
        ]),
      },
    ],
    pie: 'Presentate con tu DNI y la credencial de tu cobertura médica. Si no podés asistir, cancelá el turno con anticipación.',
  })
}

// ── Ficha del paciente ───────────────────────────────────────────
export function imprimirFichaPaciente({ paciente, cobertura, generadoPor }) {
  imprimirDocumento({
    titulo: 'Ficha del paciente',
    nombreArchivo: `Ficha ${paciente.apellido} ${paciente.nombre}`,
    codigo: codigoCorto(paciente.id),
    generadoPor,
    secciones: [
      {
        titulo: 'Datos personales',
        html: bloques.datos([
          ['Apellido y nombre', nombreCompleto(paciente)],
          ['DNI', paciente.dni],
          ['Fecha de nacimiento', paciente.fechaNacimiento ? `${fmtFecha(paciente.fechaNacimiento)} (${calcularEdad(paciente.fechaNacimiento)} años)` : '—'],
          ['Sexo', SEXO[paciente.sexo] || '—'],
          ['Teléfono', paciente.telefono || '—'],
          ['Email', paciente.email || '—'],
          ['Dirección', paciente.direccion || '—'],
          ['Alta en el sistema', fmtFecha(paciente.createdAt)],
        ]),
      },
      {
        titulo: 'Datos clínicos básicos',
        html: bloques.datos([
          ['Grupo sanguíneo', paciente.grupoSanguineo || '—'],
          ['Alergias', paciente.alergias || 'No registradas'],
        ]),
      },
      {
        titulo: 'Contacto de emergencia',
        html: bloques.datos([
          ['Nombre', paciente.contactoEmergenciaNombre || '—'],
          ['Teléfono', paciente.contactoEmergenciaTelefono || '—'],
        ]),
      },
      {
        titulo: 'Cobertura médica',
        html: cobertura
          ? bloques.datos([
              ['Obra social', cobertura.obraSocial || '—'],
              ['Plan', cobertura.plan || '—'],
              ['N.º de afiliado', cobertura.numeroAfiliado || '—'],
              ['Estado', etiquetaEstado(cobertura.estadoCobertura)],
            ])
          : bloques.parrafo('Sin cobertura cargada.'),
      },
    ],
  })
}

// ── Agenda semanal de atención de los médicos (franjas configuradas) ──
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0]
const hhmm = (h) => (h ? String(h).slice(0, 5) : '—')
const cantidadTurnos = (a) => {
  const min = (h) => { const [x, y] = hhmm(h).split(':').map(Number); return x * 60 + y }
  const total = min(a.horaFin) - min(a.horaInicio)
  return total > 0 && a.duracionSlot ? Math.floor(total / a.duracionSlot) : 0
}

export function filasAgenda(agendas) {
  return [...agendas]
    .sort((a, b) => ORDEN_DIAS.indexOf(a.diaSemana) - ORDEN_DIAS.indexOf(b.diaSemana) || String(a.horaInicio).localeCompare(String(b.horaInicio)))
    .map(a => [DIAS[a.diaSemana], `${hhmm(a.horaInicio)} a ${hhmm(a.horaFin)} hs`, `${a.duracionSlot} min`, cantidadTurnos(a), a.activo ? 'Activa' : 'Pausada'])
}

export function imprimirAgendaMedica({ agendas, generadoPor }) {
  const porMedico = new Map()
  agendas.forEach(a => {
    const k = a.medicoId
    if (!porMedico.has(k)) porMedico.set(k, { medico: a.medico, franjas: [] })
    porMedico.get(k).franjas.push(a)
  })
  const secciones = [...porMedico.values()]
    .sort((x, y) => String(x.medico?.apellido).localeCompare(String(y.medico?.apellido)))
    .map(({ medico, franjas }) => ({
      titulo: nombreMedico(medico),
      html: bloques.tabla(['Día', 'Franja horaria', 'Duración del turno', 'Turnos por franja', 'Estado'], filasAgenda(franjas), { alinearDerecha: [3] }),
    }))
  imprimirDocumento({
    titulo: 'Agenda de atención médica',
    nombreArchivo: 'Agenda medica',
    subtitulo: 'Días y franjas horarias de atención por profesional',
    generadoPor,
    secciones: secciones.length ? secciones : [{ html: bloques.parrafo('No hay franjas cargadas.') }],
  })
}

// ── Horarios del personal (turnos de trabajo) ───────────────────────
export function imprimirHorariosPersonal({ horarios, desde, hasta, titulo = 'Horarios del personal', generadoPor }) {
  const TIPOS = { fijo: 'Fijo', guardia: 'Guardia', asignado: 'Asignado' }
  const fecha = (f) => new Date(f + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: '2-digit' })
  imprimirDocumento({
    titulo,
    nombreArchivo: titulo,
    subtitulo: desde && hasta ? `Período: ${fmtFecha(desde)} al ${fmtFecha(hasta)}` : undefined,
    generadoPor,
    secciones: [{
      html: bloques.tabla(
        ['Fecha', 'Horario', 'Persona', 'Rol', 'Tipo'],
        horarios.map(h => [fecha(h.fecha), `${hhmm(h.horaInicio)} a ${hhmm(h.horaFin)} hs`, h.usuario ? `${h.usuario.apellido}, ${h.usuario.nombre}` : '—', h.usuario?.rol || '—', TIPOS[h.tipo] || h.tipo])),
    }],
  })
}

// ── Listado de turnos de un día o de una semana (hoja de trabajo) ───
export function imprimirListaTurnos({ turnos, titulo, subtitulo, generadoPor }) {
  const ordenados = [...turnos].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio))
  imprimirDocumento({
    titulo,
    nombreArchivo: titulo,
    subtitulo,
    generadoPor,
    secciones: [{
      titulo: `${ordenados.length} ${ordenados.length === 1 ? 'turno' : 'turnos'}`,
      html: bloques.tabla(
        ['Fecha', 'Hora', 'Paciente', 'DNI', 'Teléfono', 'Profesional', 'Motivo', 'Estado'],
        ordenados.map(t => [fmtFecha(t.fecha), hhmm(t.horaInicio), nombreCompleto(t.paciente), t.paciente?.dni || '—', t.paciente?.telefono || '—', nombreMedico(t.medico), t.motivo || '—', etiquetaEstado(t.estado)])),
    }],
  })
}


// ── Comprobante de entrega de medicamentos (farmacia) ────────────
export function imprimirComprobanteEntrega({ pedido, generadoPor }) {
  const receta = pedido.receta || {}
  const paciente = receta.guardia?.paciente || {}
  const items = receta.recetaItem || []
  const resueltos = pedido.pedidoItem || []
  const filas = items.map((it, i) => {
    const r = resueltos.find(x => x.recetaItemId === it.id)
    const accion = r ? ({ entregar: 'Entregado', reemplazar: 'Reemplazado', agregar: 'Agregado', cancelar: 'No entregado' }[r.accion] || r.accion) : 'Sin resolver'
    const detalle = r?.accion === 'reemplazar' ? `${r.medicamentoEntregado}${r.motivoReemplazo ? ` (${r.motivoReemplazo})` : ''}` : (r?.medicamentoEntregado || '—')
    return [i + 1, it.medicamentoNombre, `${it.dosis || '—'} · ${it.frecuencia || '—'}`, accion, detalle]
  })
  imprimirDocumento({
    titulo: 'Comprobante de entrega de medicamentos',
    nombreArchivo: `Entrega farmacia ${paciente.apellido || ''} ${paciente.nombre || ''}`.trim(),
    codigo: codigoCorto(pedido.id),
    generadoPor,
    secciones: [
      { titulo: 'Paciente', html: datosPaciente(paciente) },
      {
        titulo: 'Pedido',
        html: bloques.datos([
          ['Estado', etiquetaEstado(pedido.estado)],
          ['Receta emitida', fmtFechaHora(receta.createdAt)],
          ['Médico', nombreMedico(receta.medico)],
          ['Atendido por', pedido.farmaciaUsuario ? `${pedido.farmaciaUsuario.nombre} ${pedido.farmaciaUsuario.apellido}` : '—'],
          ['Resuelto', fmtFechaHora(pedido.resueltaAt)],
        ]),
      },
      { titulo: 'Detalle de la entrega', html: bloques.tabla(['N.º', 'Medicamento recetado', 'Dosis y frecuencia', 'Resultado', 'Detalle'], filas) },
      ...(pedido.observaciones ? [{ titulo: 'Observaciones', html: bloques.parrafo(pedido.observaciones) }] : []),
    ],
    firmas: [
      { nombre: pedido.farmaciaUsuario ? `${pedido.farmaciaUsuario.nombre} ${pedido.farmaciaUsuario.apellido}` : ' ', detalle: 'Farmacia — firma y sello' },
      { nombre: nombreCompleto(paciente), detalle: 'Recibí conforme (paciente o responsable)' },
    ],
    pie: 'Comprobante de entrega emitido por la farmacia del hospital.',
  })
}

// ── Reposición de stock (medicamentos en o bajo el mínimo) ───────
export function imprimirReposicionStock({ medicamentos, generadoPor }) {
  const faltantes = medicamentos.filter(m => m.stockActual <= m.stockMinimo)
  imprimirDocumento({
    titulo: 'Informe de reposición de stock',
    nombreArchivo: 'Reposicion de stock',
    subtitulo: `${faltantes.length} medicamento(s) en o por debajo del stock mínimo`,
    generadoPor,
    secciones: [{
      html: bloques.tabla(
        ['Medicamento', 'Stock actual', 'Stock mínimo', 'A reponer (sugerido)', 'Situación'],
        faltantes.map(m => [m.nombre, m.stockActual, m.stockMinimo, Math.max(m.stockMinimo * 2 - m.stockActual, 0), m.stockActual === 0 ? 'Sin stock' : 'Stock bajo']),
        { alinearDerecha: [1, 2, 3] }),
    }],
  })
}


// ── Epicrisis / resumen de internación ───────────────────────────
export function imprimirEpicrisis({ internacion, paciente, cobertura, comentarios = [], recetas = [], generadoPor }) {
  const guardia = internacion.guardia || {}
  const cama = internacion.cama
  const activa = internacion.estado === 'activa'
  const dias = internacion.inicio
    ? Math.max(1, Math.ceil(((internacion.fin ? new Date(internacion.fin) : new Date()) - new Date(internacion.inicio)) / 86400000))
    : null
  imprimirDocumento({
    titulo: activa ? 'Resumen de internación' : 'Epicrisis',
    nombreArchivo: `${activa ? 'Resumen internacion' : 'Epicrisis'} ${paciente.apellido} ${paciente.nombre}`,
    subtitulo: nombreCompleto(paciente),
    codigo: codigoCorto(internacion.id),
    generadoPor,
    secciones: [
      { titulo: 'Paciente', html: datosPaciente(paciente) },
      {
        titulo: 'Cobertura',
        html: bloques.datos([
          ['Obra social', cobertura?.obraSocial || 'Sin cobertura registrada'],
          ['N.º de afiliado', cobertura?.numeroAfiliado || '—'],
        ]),
      },
      {
        titulo: 'Datos de la internación',
        html: bloques.datos([
          ['Ingreso a guardia', fmtFechaHora(guardia.ingresoAt)],
          ['Inicio de internación', fmtFechaHora(internacion.inicio)],
          [activa ? 'Estado' : 'Egreso', activa ? 'Internación en curso' : fmtFechaHora(internacion.fin)],
          ['Días de internación', dias != null ? String(dias) : '—'],
          ['Cama', cama ? `${cama.codigo} · ${cama.sector}` : '—'],
          ['Médico responsable', nombreMedico(internacion.medico)],
          ['Nivel de triaje', guardia.nivelTriage ? `Nivel ${guardia.nivelTriage}` : '—'],
          ['Medio de ingreso', etiquetaEstado(guardia.medioIngreso)],
        ]),
      },
      { titulo: 'Motivo de ingreso', html: bloques.parrafo(guardia.comentarioAnalisis || guardia.justificacionTriage) },
      {
        titulo: 'Evolución',
        html: comentarios.length
          ? comentarios.map(c => `<div class="item"><div class="cab">${fmtFechaHora(c.createdAt)} — ${c.usuario ? `${c.usuario.nombre} ${c.usuario.apellido}` : 'Personal'}</div>${bloques.parrafo(c.contenido)}</div>`).join('')
          : '<p class="vacio">Sin registros de evolución.</p>',
      },
      {
        titulo: 'Medicación indicada',
        html: bloques.tabla(
          ['Medicamento', 'Dosis', 'Frecuencia', 'Indicaciones'],
          recetas.flatMap(r => (r.recetaItem || []).map(it => [it.medicamentoNombre, it.dosis || '—', it.frecuencia || '—', it.indicaciones || '—']))),
      },
      ...(paciente.alergias ? [{ titulo: 'Alergias', html: bloques.parrafo(paciente.alergias) }] : []),
      { titulo: 'Indicaciones al egreso', html: '<p class="vacio">A completar por el médico responsable.</p><div style="height:60px"></div>' },
    ],
    firmas: [{ nombre: nombreMedico(internacion.medico), detalle: 'Firma y sello del médico responsable' }],
    pie: activa ? 'Resumen parcial: la internación continúa en curso.' : 'Epicrisis emitida desde el sistema HMSPro.',
  })
}

// ── Orden de estudios ────────────────────────────────────────────
export function imprimirOrdenEstudios({ paciente, cobertura, medico, estudios, diagnostico, prioridad, indicaciones, generadoPor }) {
  imprimirDocumento({
    titulo: 'Orden de estudios',
    nombreArchivo: `Orden de estudios ${paciente.apellido} ${paciente.nombre}`,
    generadoPor,
    secciones: [
      { titulo: 'Paciente', html: datosPaciente(paciente) },
      { html: bloques.datos([['Obra social', cobertura?.obraSocial || '—'], ['N.º de afiliado', cobertura?.numeroAfiliado || '—'], ['Prioridad', prioridad || 'Normal']]) },
      { titulo: 'Diagnóstico presuntivo', html: bloques.parrafo(diagnostico) },
      { titulo: 'Estudios solicitados', html: bloques.lista(estudios) },
      ...(indicaciones ? [{ titulo: 'Indicaciones', html: bloques.parrafo(indicaciones) }] : []),
    ],
    firmas: [{ nombre: nombreMedico(medico), detalle: 'Firma y sello del profesional' }],
    pie: 'Orden válida con firma y sello del profesional solicitante.',
  })
}

// ── Consentimiento informado ─────────────────────────────────────
export function imprimirConsentimiento({ paciente, medico, procedimiento, riesgos, alternativas, generadoPor }) {
  imprimirDocumento({
    titulo: 'Consentimiento informado',
    nombreArchivo: `Consentimiento ${paciente.apellido} ${paciente.nombre}`,
    generadoPor,
    secciones: [
      { titulo: 'Paciente', html: datosPaciente(paciente) },
      { titulo: 'Procedimiento propuesto', html: bloques.parrafo(procedimiento) },
      { titulo: 'Riesgos y beneficios explicados', html: bloques.parrafo(riesgos) },
      ...(alternativas ? [{ titulo: 'Alternativas', html: bloques.parrafo(alternativas) }] : []),
      {
        titulo: 'Declaración',
        html: bloques.parrafo(`Declaro haber sido informado/a por el profesional de manera clara sobre el procedimiento, sus riesgos, beneficios y alternativas, haber podido hacer preguntas y que éstas fueron respondidas. Comprendo que puedo revocar este consentimiento en cualquier momento antes del procedimiento. En consecuencia, autorizo su realización.`),
      },
    ],
    firmas: [
      { nombre: nombreCompleto(paciente), detalle: `Paciente o responsable · DNI ${paciente.dni}` },
      { nombre: nombreMedico(medico), detalle: 'Médico interviniente' },
    ],
    pie: 'Documento de consentimiento informado. Conservar firmado en la historia clínica.',
  })
}
