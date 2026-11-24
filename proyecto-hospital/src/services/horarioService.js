import { supabase } from '../lib/supabaseClient'

// ── Horarios de trabajo ──────────────────────────────────────────────
export async function getHorarios({ desde, hasta, usuarioId } = {}) {
  let q = supabase
    .from('horario')
    .select('*, usuario:usuarioId ( id, nombre, apellido, rol )')
    .order('fecha', { ascending: true })
    .order('horaInicio', { ascending: true })
  if (desde) q = q.gte('fecha', desde)
  if (hasta) q = q.lte('fecha', hasta)
  if (usuarioId) q = q.eq('usuarioId', usuarioId)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function crearHorario(h) {
  const { data, error } = await supabase.from('horario').insert([h]).select('*, usuario:usuarioId ( id, nombre, apellido, rol )').single()
  if (error) throw error
  return data
}

export async function eliminarHorario(id) {
  const { error } = await supabase.from('horario').delete().eq('id', id)
  if (error) throw error
}

// Personal activo (para asignar horarios)
export async function getPersonal() {
  const { data, error } = await supabase
    .from('usuario')
    .select('id, nombre, apellido, rol')
    .neq('rol', 'paciente')
    .eq('activo', true)
    .order('apellido')
  if (error) throw error
  return data
}

// ── Cambios de turno entre personal ──────────────────────────────────
const CAMBIO_SELECT = `
  *,
  horario:horarioOriginalId ( id, fecha, horaInicio, horaFin, tipo ),
  solicitante:usuarioSolicitanteId ( id, nombre, apellido ),
  receptor:usuarioReceptorId ( id, nombre, apellido )
`

export async function getCambiosHorario() {
  const { data, error } = await supabase
    .from('cambioHorario')
    .select(CAMBIO_SELECT)
    .order('solicitadoAt', { ascending: false })
  if (error) throw error
  return data
}

export async function solicitarCambio({ horarioOriginalId, usuarioSolicitanteId, usuarioReceptorId }) {
  const { data, error } = await supabase
    .from('cambioHorario')
    .insert([{ horarioOriginalId, usuarioSolicitanteId, usuarioReceptorId }])
    .select(CAMBIO_SELECT)
    .single()
  if (error) throw error
  return data
}

// El receptor (o un administrador) aprueba o rechaza; al aprobar, el horario pasa al receptor.
export async function resolverCambio(id, aprobar) {
  const { data, error } = await supabase.rpc('resolver_cambio_horario', { p_cambio: id, p_aprobar: aprobar })
  if (error) throw new Error(error.message)
  return data
}
