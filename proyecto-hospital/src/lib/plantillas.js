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
