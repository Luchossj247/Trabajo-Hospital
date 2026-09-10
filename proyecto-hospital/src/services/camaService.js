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
    .in('estado', ['en_atencion', 'internado'])
    .order('nivelTriage', { ascending: true, nullsFirst: false })

  if (error) throw error
  return data
}

// ── Internación (asignar cama a un paciente) ─────────────────────
export async function crearInternacion({ guardiaId, camaId, medicoId }) {
  const { data, error } = await supabase
    .from('internacion')
    .insert([{ guardiaId, camaId, medicoId, estado: 'activa' }])
    .select()
    .single()
  if (error) throw error

  await supabase.from('cama').update({ estado: 'ocupada' }).eq('id', camaId)
  await supabase.from('guardia').update({ estado: 'internado' }).eq('id', guardiaId)

  return data
}

export async function finalizarInternacion(internacionId, camaId) {
  const { data, error } = await supabase
    .from('internacion')
    .update({ estado: 'alta', fin: new Date().toISOString() })
    .eq('id', internacionId)
    .select()
    .single()
  if (error) throw error

  await supabase.from('cama').update({ estado: 'disponible' }).eq('id', camaId)

  return data
}