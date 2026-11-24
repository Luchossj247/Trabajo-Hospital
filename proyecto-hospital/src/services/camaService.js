import { supabase } from '../lib/supabaseClient'

// ── Camas ────────────────────────────────────────────────────────
export async function getCamas() {
  const { data, error } = await supabase
    .from('cama')
    .select(`
      *,
      camaEquipamiento ( asignadoAt, equipamiento ( id, nombre, estado ) ),
      internacion ( id, estado, inicio, guardia ( id, paciente ( nombre, apellido, dni ) ) )
    `)
    .order('sector')
    .order('codigo')

  if (error) throw error
  return data
}

export async function crearCama(cama) {
  const { data, error } = await supabase.from('cama').insert([cama]).select().single()
  if (error) throw error
  return data
}

export async function actualizarCama(id, campos) {
  const { data, error } = await supabase
    .from('cama')
    .update({ ...campos, updatedAt: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Equipamiento ─────────────────────────────────────────────────
export async function getEquipamiento() {
  const { data, error } = await supabase.from('equipamiento').select('*').order('nombre')
  if (error) throw error
  return data
}

export async function asignarEquipamiento(camaId, equipamientoId) {
  const { error } = await supabase.from('camaEquipamiento').insert([{ camaId, equipamientoId }])
  if (error) throw error
}

export async function quitarEquipamiento(camaId, equipamientoId) {
  const { error } = await supabase
    .from('camaEquipamiento')
    .delete()
    .eq('camaId', camaId)
    .eq('equipamientoId', equipamientoId)
  if (error) throw error
}

// ── Guardias en espera de internación (sin cama asignada aún) ────
export async function getGuardiasSinCama() {
  const { data, error } = await supabase
    .from('guardia')
    .select(`id, nivelTriage, paciente:pacienteId ( id, nombre, apellido, dni )`)
    .in('estado', ['en_espera', 'en_atencion'])
    .order('nivelTriage', { ascending: true, nullsFirst: false })

  if (error) throw error
  return data
}

// ── Internación: operaciones atómicas en el servidor (RPC) ───────
// crear_internacion: bloquea la cama, valida estados, crea la internación,
// marca la cama "ocupada" y la guardia "internado" en una sola transacción.
export async function crearInternacion({ guardiaId, camaId, medicoId }) {
  const { data, error } = await supabase.rpc('crear_internacion', {
    p_guardia: guardiaId, p_cama: camaId, p_medico: medicoId,
  })
  if (error) throw new Error(error.message)
  return data
}

// finalizar_internacion: cierra la internación, libera la cama y pasa la
// guardia a "alta" con fecha de egreso (así Reportes no queda inconsistente).
export async function finalizarInternacion(internacionId) {
  const { data, error } = await supabase.rpc('finalizar_internacion', { p_internacion: internacionId })
  if (error) throw new Error(error.message)
  return data
}
