import { supabase } from '../lib/supabaseClient'

// ── Obtener horarios de la semana ─────────────────────────────
export async function getHorariosSemana(fechaInicio, fechaFin) {
  const { data, error } = await supabase
    .from('horario')
    .select(`
      *,
      usuario ( id, nombre, apellido, rol )
    `)
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin)
    .order('fecha')
    .order('horaInicio')

  if (error) throw error
  return data
}

// ── Obtener horarios de un usuario ────────────────────────────
export async function getHorariosByUsuario(usuarioId) {
  const { data, error } = await supabase
    .from('horario')
    .select('*')
    .eq('usuarioId', usuarioId)
    .order('fecha')

  if (error) throw error
  return data
}

// ── Crear horario ─────────────────────────────────────────────
export async function createHorario(horario) {
  const { data, error } = await supabase
    .from('horario')
    .insert([horario])
    .select(`
      *,
      usuario ( nombre, apellido, rol )
    `)
    .single()

  if (error) throw error
  return data
}

// ── Eliminar horario ──────────────────────────────────────────
export async function deleteHorario(id) {
  const { error } = await supabase
    .from('horario')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ── Solicitar cambio de horario ───────────────────────────────
export async function solicitarCambio(horarioOriginalId, solicitanteId, receptorId) {
  const { data, error } = await supabase
    .from('cambioHorario')
    .insert([{
      horarioOriginalId,
      usuarioSolicitanteId: solicitanteId,
      usuarioReceptorId: receptorId,
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Aprobar / rechazar cambio ─────────────────────────────────
export async function resolverCambio(id, estado) {
  const { data, error } = await supabase
    .from('cambioHorario')
    .update({ estado, resueltaAt: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Cambios pendientes para un usuario ────────────────────────
export async function getCambiosPendientes(usuarioId) {
  const { data, error } = await supabase
    .from('cambioHorario')
    .select(`
      *,
      horario:horarioOriginalId (*),
      solicitante:usuarioSolicitanteId ( nombre, apellido ),
      receptor:usuarioReceptorId ( nombre, apellido )
    `)
    .eq('usuarioReceptorId', usuarioId)
    .eq('estado', 'pendiente')

  if (error) throw error
  return data
}