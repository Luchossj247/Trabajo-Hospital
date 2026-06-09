import { supabase } from '../lib/supabaseClient'

// ── Obtener todas las camas ───────────────────────────────────
export async function getCamas() {
  const { data, error } = await supabase
    .from('cama')
    .select(`
      *,
      camaEquipamiento (
        asignadoAt,
        equipamiento (*)
      ),
      internacion (
        id,
        estado,
        inicio,
        usuario:medicoId ( nombre, apellido ),
        guardia (
          paciente ( nombre, apellido, dni )
        )
      )
    `)
    .order('sector')

  if (error) throw error
  return data
}

// ── Obtener camas por sector ──────────────────────────────────
export async function getCamasPorSector(sector) {
  const { data, error } = await supabase
    .from('cama')
    .select(`
      *,
      camaEquipamiento (
        equipamiento (*)
      ),
      internacion (
        estado,
        guardia (
          paciente ( nombre, apellido )
        )
      )
    `)
    .eq('sector', sector)
    .order('codigo')

  if (error) throw error
  return data
}

// ── Obtener camas disponibles ─────────────────────────────────
export async function getCamasDisponibles() {
  const { data, error } = await supabase
    .from('cama')
    .select('*')
    .eq('estado', 'disponible')
    .order('sector')

  if (error) throw error
  return data
}

// ── Estadísticas de camas ─────────────────────────────────────
export async function getEstadisticasCamas() {
  const { data, error } = await supabase
    .from('cama')
    .select('estado')

  if (error) throw error

  const stats = {
    total: data.length,
    disponible: 0,
    ocupada: 0,
    mantenimiento: 0,
    reservada: 0,
  }

  data.forEach(c => { stats[c.estado] = (stats[c.estado] || 0) + 1 })
  stats.ocupacionPct = stats.total ? Math.round((stats.ocupada / stats.total) * 100) : 0

  return stats
}

// ── Crear cama ────────────────────────────────────────────────
export async function createCama(cama) {
  const { data, error } = await supabase
    .from('cama')
    .insert([cama])
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Actualizar estado de cama ─────────────────────────────────
export async function updateEstadoCama(id, estado) {
  const { data, error } = await supabase
    .from('cama')
    .update({ estado })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Asignar equipamiento a una cama ──────────────────────────
export async function asignarEquipamiento(camaId, equipamientoId) {
  const { data, error } = await supabase
    .from('camaEquipamiento')
    .insert([{ camaId, equipamientoId }])
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Quitar equipamiento de una cama ──────────────────────────
export async function quitarEquipamiento(camaId, equipamientoId) {
  const { error } = await supabase
    .from('camaEquipamiento')
    .delete()
    .eq('camaId', camaId)
    .eq('equipamientoId', equipamientoId)

  if (error) throw error
}

// ── Sectores únicos ───────────────────────────────────────────
export async function getSectores() {
  const { data, error } = await supabase
    .from('cama')
    .select('sector')

  if (error) throw error
  return [...new Set(data.map(c => c.sector))]
}