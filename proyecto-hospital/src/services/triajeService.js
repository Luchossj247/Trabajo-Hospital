import { supabase } from '../lib/supabaseClient'

// ── Cola de guardia (activos, ordenados por gravedad y luego llegada) ──
// nivelTriage: 1 = más grave (rojo) … 5 = menos grave (azul), estilo ESI/Manchester.
export async function getColaGuardia() {
  const { data, error } = await supabase
    .from('guardia')
    .select(`
      *,
      paciente:pacienteId ( id, nombre, apellido, dni, fechaNacimiento ),
      enfermero:enfermeroId ( id, nombre, apellido ),
      medico:medicoId ( id, nombre, apellido )
    `)
    .in('estado', ['en_espera', 'en_atencion'])
    .order('nivelTriage', { ascending: true, nullsFirst: false })
    .order('ingresoAt', { ascending: true })

  if (error) throw error
  return data
}

export async function getGuardiasCerradas(limit = 50) {
  const { data, error } = await supabase
    .from('guardia')
    .select(`
      *,
      paciente:pacienteId ( id, nombre, apellido, dni )
    `)
    .in('estado', ['alta', 'derivado'])
    .order('egresoAt', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

// ── Registrar ingreso a guardia (enfermería) ────────────────────────
export async function crearIngresoGuardia({
  pacienteId, medioIngreso, estadoIngreso, comentarioTriage,
  nivelTriage, comentarioAnalisis, enfermeroId,
}) {
  const { data, error } = await supabase
    .from('guardia')
    .insert([{
      pacienteId,
      medioIngreso,
      estadoIngreso: estadoIngreso || null,
      comentarioTriage: comentarioTriage || null,
      nivelTriage: nivelTriage || null,
      comentarioAnalisis: comentarioAnalisis || null,
      enfermeroId: enfermeroId || null,
      estado: 'en_espera',
    }])
    .select(`*, paciente:pacienteId ( id, nombre, apellido, dni )`)
    .single()

  if (error) throw error
  return data
}

// ── Actualizar el triaje de una guardia ─────────────────────────────
// Si se cambia el nivel calculado "a mano" (reordenamiento manual de la cola),
// reordenadoManual debe ir en true y justificacionTriage es obligatoria.
export async function actualizarTriaje(id, campos) {
  const { data, error } = await supabase
    .from('guardia')
    .update({ ...campos, updatedAt: new Date().toISOString() })
    .eq('id', id)
    .select(`*, paciente:pacienteId ( id, nombre, apellido, dni )`)
    .single()

  if (error) throw error
  return data
}

// ── Cambiar estado clínico (en_atencion / internado / alta / derivado) ──
export async function cambiarEstadoGuardia(id, estado, medicoId = null) {
  const campos = { estado, updatedAt: new Date().toISOString() }
  if (['alta', 'derivado'].includes(estado)) campos.egresoAt = new Date().toISOString()
  if (medicoId) campos.medicoId = medicoId

  const { data, error } = await supabase
    .from('guardia')
    .update(campos)
    .eq('id', id)
    .select(`*, paciente:pacienteId ( id, nombre, apellido, dni )`)
    .single()

  if (error) throw error
  return data
}

// ── Comentarios adicionales (con fecha y hora, según relevamiento) ──
export async function getComentarios(guardiaId) {
  const { data, error } = await supabase
    .from('comentarioGuardia')
    .select(`*, usuario:usuarioId ( nombre, apellido, rol )`)
    .eq('guardiaId', guardiaId)
    .order('createdAt', { ascending: true })

  if (error) throw error
  return data
}

export async function addComentario(guardiaId, usuarioId, contenido) {
  const { data, error } = await supabase
    .from('comentarioGuardia')
    .insert([{ guardiaId, usuarioId, contenido }])
    .select(`*, usuario:usuarioId ( nombre, apellido, rol )`)
    .single()

  if (error) throw error
  return data
}