import { supabase } from '../lib/supabaseClient'

// ── Obtener todas las guardias activas ────────────────────────
export async function getGuardias() {
  const { data, error } = await supabase
    .from('guardia')
    .select(`
      *,
      paciente ( id, nombre, apellido, dni, fechaNacimiento ),
      enfermero:enfermeroId ( id, nombre, apellido ),
      medico:medicoId ( id, nombre, apellido ),
      comentarioGuardia ( * )
    `)
    .order('ingresoAt', { ascending: false })

  if (error) throw error
  return data
}

// ── Obtener guardias en espera (sala de triaje) ───────────────
export async function getGuardiasEnEspera() {
  const { data, error } = await supabase
    .from('guardia')
    .select(`
      *,
      paciente ( id, nombre, apellido, dni, fechaNacimiento )
    `)
    .eq('estado', 'en_espera')
    .order('nivelTriage', { ascending: true })
    .order('ingresoAt', { ascending: true })

  if (error) throw error
  return data
}

// ── Obtener una guardia por ID ────────────────────────────────
export async function getGuardiaById(id) {
  const { data, error } = await supabase
    .from('guardia')
    .select(`
      *,
      paciente ( * ),
      enfermero:enfermeroId ( * ),
      medico:medicoId ( * ),
      comentarioGuardia ( *, usuario:usuarioId ( nombre, apellido, rol ) ),
      internacion ( *, cama (*) ),
      receta ( *, recetaItem (*) )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// ── Crear guardia (ingreso de paciente) ───────────────────────
export async function createGuardia(guardia) {
  const { data, error } = await supabase
    .from('guardia')
    .insert([guardia])
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Actualizar estado de guardia ──────────────────────────────
export async function updateEstadoGuardia(id, estado, extras = {}) {
  const campos = { estado, ...extras }
  if (estado === 'alta' || estado === 'derivado') {
    campos.egresoAt = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('guardia')
    .update(campos)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Actualizar nivel de triaje ────────────────────────────────
export async function updateTriage(id, nivelTriage, justificacion) {
  const { data, error } = await supabase
    .from('guardia')
    .update({ nivelTriage, justificacionTriage: justificacion })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Agregar comentario a guardia ──────────────────────────────
export async function addComentario(guardiaId, usuarioId, contenido) {
  const { data, error } = await supabase
    .from('comentarioGuardia')
    .insert([{ guardiaId, usuarioId, contenido }])
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Internar paciente (guardia → internacion) ─────────────────
export async function internarPaciente(guardiaId, camaId, medicoId) {
  // 1. Crear internación
  const { data: internacion, error: intError } = await supabase
    .from('internacion')
    .insert([{ guardiaId, camaId, medicoId }])
    .select()
    .single()

  if (intError) throw intError

  // 2. Actualizar estado de guardia
  await updateEstadoGuardia(guardiaId, 'internado')

  // 3. Ocupar la cama
  const { error: camaError } = await supabase
    .from('cama')
    .update({ estado: 'ocupada' })
    .eq('id', camaId)

  if (camaError) throw camaError

  return internacion
}

// ── Dar alta a internación ────────────────────────────────────
export async function darAlta(guardiaId, internacionId, camaId) {
  // 1. Cerrar internación
  const { error: intError } = await supabase
    .from('internacion')
    .update({ estado: 'alta', fin: new Date().toISOString() })
    .eq('id', internacionId)

  if (intError) throw intError

  // 2. Actualizar guardia
  await updateEstadoGuardia(guardiaId, 'alta')

  // 3. Liberar cama
  const { error: camaError } = await supabase
    .from('cama')
    .update({ estado: 'disponible' })
    .eq('id', camaId)

  if (camaError) throw camaError
}

// ── Estadísticas de guardia ───────────────────────────────────
export async function getEstadisticasGuardia() {
  const { data, error } = await supabase
    .from('guardia')
    .select('estado, nivelTriage')

  if (error) throw error

  return {
    total: data.length,
    enEspera: data.filter(g => g.estado === 'en_espera').length,
    enAtencion: data.filter(g => g.estado === 'en_atencion').length,
    internados: data.filter(g => g.estado === 'internado').length,
    criticos: data.filter(g => g.nivelTriage === 1).length,
  }
}