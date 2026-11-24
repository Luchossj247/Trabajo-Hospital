// Traduce un evento crudo de auditoría (tabla, acción, JSON antes/después) a texto que
// pueda leer cualquier administrador: "Ana Pérez (Recepcionista) modificó al paciente
// Juan Gómez: Teléfono cambió de «1111» a «2222»".
import { fmtFecha, fmtFechaHora, fmtMoneda, ESTADOS } from './documentos'

// Cómo se llama cada tipo de registro y cómo se lo describe en una frase.
export const TABLAS = {
  paciente:          { plural: 'Pacientes',               singular: 'un paciente' },
  usuario:           { plural: 'Personal y usuarios',     singular: 'un usuario del sistema' },
  guardia:           { plural: 'Guardia',                 singular: 'una guardia' },
  internacion:       { plural: 'Internaciones',           singular: 'una internación' },
  cama:              { plural: 'Camas',                   singular: 'una cama' },
  turno:             { plural: 'Turnos',                  singular: 'un turno' },
  historialClinico:  { plural: 'Historiales clínicos',    singular: 'un historial clínico' },
  atencionMedica:    { plural: 'Atenciones médicas',      singular: 'una atención médica' },
  documentoClinico:  { plural: 'Documentos clínicos',     singular: 'un documento clínico' },
  receta:            { plural: 'Recetas',                 singular: 'una receta' },
  pedidoMedicamento: { plural: 'Pedidos a farmacia',      singular: 'un pedido a farmacia' },
  medicamento:       { plural: 'Medicamentos (stock)',    singular: 'un medicamento' },
  facturacion:       { plural: 'Facturación',             singular: 'una factura' },
  horario:           { plural: 'Horarios del personal',   singular: 'un horario' },
  cambioHorario:     { plural: 'Cambios de horario',      singular: 'un cambio de horario' },
}

export const ACCIONES = {
  INSERT: { label: 'Alta',         verbo: 'creó',      bg: '#dcfce7', color: '#166534' },
  UPDATE: { label: 'Modificación', verbo: 'modificó',  bg: '#dbeafe', color: '#1e40af' },
  DELETE: { label: 'Baja',         verbo: 'eliminó',   bg: '#fee2e2', color: '#991b1b' },
}

export const ROLES = {
  administrador: 'Administrador/a', medico: 'Médico/a', enfermero: 'Enfermero/a',
  farmacia: 'Farmacia', recepcionista: 'Recepcionista', paciente: 'Paciente',
}

// Nombre legible de cada campo. Los que no estén acá y no sean técnicos se muestran con su nombre tal cual.
const CAMPOS = {
  nombre: 'Nombre', apellido: 'Apellido', dni: 'DNI', fechaNacimiento: 'Fecha de nacimiento', sexo: 'Sexo',
  telefono: 'Teléfono', email: 'Email', direccion: 'Dirección',
  contactoEmergenciaNombre: 'Contacto de emergencia', contactoEmergenciaTelefono: 'Teléfono de emergencia',
  grupoSanguineo: 'Grupo sanguíneo', alergias: 'Alergias',
  codigoActivacion: 'Código de activación del portal', codigoActivacionExpira: 'Vencimiento del código',
  rol: 'Rol', activo: 'Usuario activo',
  codigo: 'Código', sector: 'Sector', piso: 'Piso', estado: 'Estado',
  nivelTriage: 'Nivel de triaje', justificacionTriage: 'Justificación del triaje', reordenadoManual: 'Reordenado manualmente',
  comentarioTriage: 'Comentario de triaje', comentarioAnalisis: 'Comentario de análisis',
  medioIngreso: 'Medio de ingreso', estadoIngreso: 'Estado al ingresar', ingresoAt: 'Ingreso', egresoAt: 'Egreso',
  inicio: 'Inicio', fin: 'Fin', fecha: 'Fecha', horaInicio: 'Hora de inicio', horaFin: 'Hora de fin',
  motivo: 'Motivo', observaciones: 'Observaciones', observacionesGenerales: 'Observaciones generales',
  tipo: 'Tipo', esGuardia: 'Es guardia', descripcion: 'Descripción', nombreArchivo: 'Archivo',
  estadoCobertura: 'Estado de cobertura', estadoPago: 'Estado de pago',
  montoTotal: 'Monto total', montoObraSocial: 'Monto de la obra social', montoPaciente: 'Monto del paciente',
  stockActual: 'Stock actual', stockMinimo: 'Stock mínimo',
  solicitadoAt: 'Solicitado', resueltaAt: 'Resuelto', subidoAt: 'Fecha de carga',
  // referencias a otras personas / cosas (se muestran con el nombre)
  pacienteId: 'Paciente', medicoId: 'Médico/a', enfermeroId: 'Enfermero/a', recepcionistaId: 'Recepcionista',
  farmaciaUsuarioId: 'Farmacéutico/a', subidoPor: 'Cargado por', usuarioSolicitanteId: 'Solicitante',
  usuarioReceptorId: 'Quien recibe el cambio', camaId: 'Cama',
}

// Campos que son puramente técnicos: no aportan nada a quien lee.
const OCULTOS = new Set([
  'id', 'createdAt', 'updatedAt', 'urlArchivo', 'rutaStorage',
  'guardiaId', 'recetaId', 'historialClinicoId', 'horarioOriginalId',
])

const REFERENCIAS_USUARIO = new Set(['medicoId', 'enfermeroId', 'recepcionistaId', 'farmaciaUsuarioId', 'subidoPor', 'usuarioSolicitanteId', 'usuarioReceptorId'])
const CAMPOS_MONEDA = new Set(['montoTotal', 'montoObraSocial', 'montoPaciente'])
const CAMPOS_FECHA_HORA = new Set(['ingresoAt', 'egresoAt', 'inicio', 'fin', 'solicitadoAt', 'resueltaAt', 'subidoAt', 'codigoActivacionExpira', 'fecha'])
const SEXO = { M: 'Masculino', F: 'Femenino', X: 'Otro / no especifica' }

// Orden de lectura para listados de datos (alta / baja): lo más identificatorio primero.
const ORDEN = ['Nombre', 'Apellido', 'DNI', 'Paciente', 'Médico/a', 'Fecha', 'Hora de inicio', 'Hora de fin', 'Estado']

const humanizar = s => {
  const t = String(s).replace(/_/g, ' ')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

const nombreUsuario = (u) => (u ? `${u.nombre} ${u.apellido}` : null)
const nombrePaciente = (p) => (p ? `${p.nombre} ${p.apellido}` : null)

// ctx: { paciente, usuario, cama, guardia, receta, historial } → mapas id → fila
function valorLegible(campo, valor, ctx) {
  if (valor === null || valor === undefined || valor === '') return 'vacío'
  if (campo === 'codigoActivacion') return '(código generado)'
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No'
  if (campo === 'sexo') return SEXO[valor] || valor
  if (campo === 'rol') return ROLES[valor] || humanizar(valor)
  if (campo === 'pacienteId') return nombrePaciente(ctx.paciente?.[valor]) || 'un paciente que ya no existe'
  if (REFERENCIAS_USUARIO.has(campo)) return nombreUsuario(ctx.usuario?.[valor]) || 'un usuario que ya no existe'
  if (campo === 'camaId') return ctx.cama?.[valor] ? `Cama ${ctx.cama[valor].codigo}` : 'una cama que ya no existe'
  if (CAMPOS_MONEDA.has(campo)) return fmtMoneda(valor)
  if (campo === 'fechaNacimiento') return fmtFecha(valor)
  if (campo === 'fecha' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) return fmtFecha(valor)
  if (CAMPOS_FECHA_HORA.has(campo) && typeof valor === 'string' && valor.includes('T')) return fmtFechaHora(valor)
  if (/^horaInicio|^horaFin/.test(campo) && typeof valor === 'string') return valor.slice(0, 5)
  if (typeof valor === 'string' && ESTADOS[valor]) return ESTADOS[valor]
  if (typeof valor === 'string' && /^[a-z]+(_[a-z]+)+$/.test(valor)) return humanizar(valor)
  if (typeof valor === 'string' && /^[a-z]+$/.test(valor) && campo.startsWith('estado')) return humanizar(valor)
  if (typeof valor === 'object') return JSON.stringify(valor)
  return String(valor)
}

// Descripción corta del registro afectado ("Juan Gómez", "Cama B-12"…).
function describirRegistro(tabla, fila, ctx) {
  if (!fila) return null
  switch (tabla) {
    case 'paciente':   return `${fila.nombre} ${fila.apellido}${fila.dni ? ` (DNI ${fila.dni})` : ''}`
    case 'usuario':    return `${fila.nombre} ${fila.apellido}${fila.rol ? ` (${ROLES[fila.rol] || fila.rol})` : ''}`
    case 'cama':       return `Cama ${fila.codigo}${fila.sector ? ` – ${fila.sector}` : ''}`
    case 'medicamento':return fila.nombre
    case 'turno': {
      const p = nombrePaciente(ctx.paciente?.[fila.pacienteId])
      return `${p ? `de ${p}` : ''}${fila.fecha ? ` el ${fmtFecha(fila.fecha)}` : ''}${fila.horaInicio ? ` a las ${String(fila.horaInicio).slice(0, 5)}` : ''}`.trim() || null
    }
    case 'guardia': {
      const p = nombrePaciente(ctx.paciente?.[fila.pacienteId])
      return p ? `de ${p}` : null
    }
    case 'facturacion': {
      const p = nombrePaciente(ctx.paciente?.[fila.pacienteId])
      return `${p ? `de ${p}` : ''}${fila.montoTotal != null ? ` por ${fmtMoneda(fila.montoTotal)}` : ''}`.trim() || null
    }
    case 'receta': {
      const g = ctx.guardia?.[fila.guardiaId]
      const p = nombrePaciente(ctx.paciente?.[g?.pacienteId])
      return p ? `de ${p}` : null
    }
    case 'pedidoMedicamento': {
      const r = ctx.receta?.[fila.recetaId]
      const g = ctx.guardia?.[r?.guardiaId]
      const p = nombrePaciente(ctx.paciente?.[g?.pacienteId])
      return p ? `de ${p}` : null
    }
    case 'internacion': {
      const g = ctx.guardia?.[fila.guardiaId]
      const p = nombrePaciente(ctx.paciente?.[g?.pacienteId])
      return p ? `de ${p}` : null
    }
    case 'historialClinico': {
      const p = nombrePaciente(ctx.paciente?.[fila.pacienteId])
      return p ? `de ${p}` : null
    }
    case 'atencionMedica':
    case 'documentoClinico': {
      const h = ctx.historial?.[fila.historialClinicoId]
      const p = nombrePaciente(ctx.paciente?.[h?.pacienteId])
      const extra = fila.motivo || fila.nombreArchivo || fila.descripcion
      return [p ? `de ${p}` : null, extra ? `«${extra}»` : null].filter(Boolean).join(' ') || null
    }
    case 'horario': {
      const u = nombreUsuario(ctx.usuario?.[fila.usuarioId])
      return `${u ? `de ${u}` : ''}${fila.fecha ? ` el ${fmtFecha(fila.fecha)}` : ''}`.trim() || null
    }
    case 'cambioHorario': {
      const u = nombreUsuario(ctx.usuario?.[fila.usuarioSolicitanteId])
      return u ? `pedido por ${u}` : null
    }
    default: return null
  }
}

function cambiosDe(tabla, anterior, nuevo, accion, ctx) {
  const ref = accion === 'DELETE' ? anterior : nuevo
  if (!ref) return []
  const campos = Object.keys(ref).filter(k => !OCULTOS.has(k))
  const lista = []
  for (const campo of campos) {
    if (campo === 'usuarioId' && tabla === 'paciente') continue // vínculo interno con la cuenta del portal
    if (tabla === 'paciente' && campo === 'codigoActivacionExpira') continue
    const etiqueta = CAMPOS[campo] || (campo === 'usuarioId' ? 'Persona' : humanizar(campo.replace(/([A-Z])/g, ' $1').toLowerCase()))
    const refCampo = campo === 'usuarioId' ? 'medicoId' : campo // horario.usuarioId es una persona
    if (accion === 'UPDATE') {
      if (JSON.stringify(anterior?.[campo]) === JSON.stringify(nuevo?.[campo])) continue
      lista.push({
        campo: etiqueta,
        antes: valorLegible(refCampo, anterior?.[campo], ctx),
        despues: valorLegible(refCampo, nuevo?.[campo], ctx),
      })
    } else {
      const v = ref[campo]
      if (v === null || v === undefined || v === '') continue
      lista.push({ campo: etiqueta, valor: valorLegible(refCampo, v, ctx) })
    }
  }
  if (accion !== 'UPDATE') {
    const rango = c => { const i = ORDEN.indexOf(c.campo); return i === -1 ? ORDEN.length : i }
    lista.sort((a, b) => rango(a) - rango(b))
  }
  return lista
}

// Devuelve todo lo necesario para mostrar un evento sin tecnicismos.
export function describirEvento(r, ctx) {
  const accion = ACCIONES[r.accion] || ACCIONES.UPDATE
  const t = TABLAS[r.tablaAfectada] || { plural: r.tablaAfectada, singular: 'un registro' }
  const actor = r.usuario
    ? `${r.usuario.nombre} ${r.usuario.apellido}${r.usuario.rol ? ` (${ROLES[r.usuario.rol] || r.usuario.rol})` : ''}`
    : 'El sistema'
  const fila = r.accion === 'DELETE' ? r.datosAnteriores : (r.datosNuevos || r.datosAnteriores)
  const registro = describirRegistro(r.tablaAfectada, fila, ctx)
  const cambios = cambiosDe(r.tablaAfectada, r.datosAnteriores, r.datosNuevos, r.accion, ctx)
  return {
    actor,
    accion,
    seccion: t.plural,
    registro,
    // "...creó una factura de Marta Diaz" / "...modificó un paciente: Juan Pérez"
    separador: registro && /^(de|pedido)\b/.test(registro) ? ' ' : ': ',
    frase: `${actor} ${accion.verbo} ${t.singular}${registro ? `${/^(de|pedido)\b/.test(registro) ? ' ' : ': '}${registro}` : ''}`,
    cambios,
    resumenCambios: cambios
      .map(c => (r.accion === 'UPDATE' ? `${c.campo}: ${c.antes} → ${c.despues}` : `${c.campo}: ${c.valor}`))
      .join(' | '),
  }
}
