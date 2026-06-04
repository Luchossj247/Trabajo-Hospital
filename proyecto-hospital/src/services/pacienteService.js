import { supabase } from '../lib/supabaseClient'

// ── Obtener todos los pacientes ───────────────────────────────
export async function getPacientes() {
  const { data, error } = await supabase
    .from('paciente')
    .select(`
      *,
      coberturaMedica (*)
    `)
    .order('createdAt', { ascending: false })

  if (error) throw error
  return data
}

// ── Obtener un paciente por ID ────────────────────────────────
export async function getPacienteById(id) {
  const { data, error } = await supabase
    .from('paciente')
    .select(`
      *,
      coberturaMedica (*),
      historialClinico (*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// ── Crear paciente ────────────────────────────────────────────
export async function createPaciente(paciente) {
  const { data, error } = await supabase
    .from('paciente')
    .insert([paciente])
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Crear paciente con cobertura (transacción manual) ─────────
export async function createPacienteConCobertura(paciente, cobertura) {
  const nuevoPaciente = await createPaciente(paciente)

  if (cobertura?.obraSocial) {
    const { error } = await supabase
      .from('coberturaMedica')
      .insert([{ ...cobertura, pacienteId: nuevoPaciente.id }])

    if (error) throw error
  }

  // Crear historial clínico vacío automáticamente
  const { error: histError } = await supabase
    .from('historialClinico')
    .insert([{ pacienteId: nuevoPaciente.id }])

  if (histError) throw histError

  return nuevoPaciente
}

// ── Actualizar paciente ───────────────────────────────────────
export async function updatePaciente(id, campos) {
  const { data, error } = await supabase
    .from('paciente')
    .update(campos)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Eliminar paciente ─────────────────────────────────────────
export async function deletePaciente(id) {
  const { error } = await supabase
    .from('paciente')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ── Buscar pacientes ──────────────────────────────────────────
export async function searchPacientes(query) {
  const { data, error } = await supabase
    .from('paciente')
    .select(`*, coberturaMedica (*)`)
    .or(`nombre.ilike.%${query}%,apellido.ilike.%${query}%,dni.ilike.%${query}%`)
    .order('createdAt', { ascending: false })

  if (error) throw error
  return data
}

// ── Pacientes registrados hoy ─────────────────────────────────
export async function getPacientesHoy() {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('paciente')
    .select('*')
    .gte('createdAt', hoy.toISOString())
    .order('createdAt', { ascending: false })

  if (error) throw error
  return data
}

// ── Cobertura médica ──────────────────────────────────────────
export async function updateCobertura(pacienteId, cobertura) {
  // Verificar si ya existe
  const { data: existing } = await supabase
    .from('coberturaMedica')
    .select('id')
    .eq('pacienteId', pacienteId)
    .single()

  if (existing) {
    const { data, error } = await supabase
      .from('coberturaMedica')
      .update(cobertura)
      .eq('pacienteId', pacienteId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('coberturaMedica')
      .insert([{ ...cobertura, pacienteId }])
      .select()
      .single()

    if (error) throw error
    return data
  }
}