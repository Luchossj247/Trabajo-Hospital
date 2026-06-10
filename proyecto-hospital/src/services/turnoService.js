import { supabase } from '../lib/supabaseClient'

// ── Agenda Médico ─────────────────────────────────────────────

export async function getAgendasMedico(medicoId) {
  const { data, error } = await supabase
    .from('agendaMedico')
    .select('*, medico:medicoId ( id, nombre, apellido )')
    .eq('medicoId', medicoId)
    .order('diaSemana')
    .order('horaInicio')

  if (error) throw error
  return data
}

export async function getTodasAgendas() {
  const { data, error } = await supabase
    .from('agendaMedico')
    .select('*, medico:medicoId ( id, nombre, apellido, rol )')
    .order('diaSemana')
    .order('horaInicio')

  if (error) throw error
  return data
}

export async function createAgenda(agenda) {
  const { data, error } = await supabase
    .from('agendaMedico')
    .insert([agenda])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateAgenda(id, campos) {
  const { data, error } = await supabase
    .from('agendaMedico')
    .update(campos)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteAgenda(id) {
  const { error } = await supabase
    .from('agendaMedico')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ── Turnos ────────────────────────────────────────────────────

export async function getTurnos({ fecha, medicoId, pacienteId, estado } = {}) {
  let query = supabase
    .from('turno')
    .select(`
      *,
      paciente:pacienteId ( id, nombre, apellido, dni, telefono ),
      medico:medicoId    ( id, nombre, apellido ),
      recepcionista:recepcionistaId ( id, nombre, apellido )
    `)

  if (fecha)      query = query.eq('fecha', fecha)
  if (medicoId)   query = query.eq('medicoId', medicoId)
  if (pacienteId) query = query.eq('pacienteId', pacienteId)
  if (estado)     query = query.eq('estado', estado)

  query = query
    .order('fecha',      { ascending: true })
    .order('horaInicio', { ascending: true })

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getTurnosByRango(desde, hasta, medicoId = null) {
  let query = supabase
    .from('turno')
    .select(`
      *,
      paciente:pacienteId ( id, nombre, apellido, dni, telefono ),
      medico:medicoId    ( id, nombre, apellido )
    `)
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .neq('estado', 'cancelado')

  if (medicoId) query = query.eq('medicoId', medicoId)

  query = query
    .order('fecha',      { ascending: true })
    .order('horaInicio', { ascending: true })

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createTurno(turno) {
  const { data, error } = await supabase
    .from('turno')
    .insert([turno])
    .select(`
      *,
      paciente:pacienteId ( id, nombre, apellido, dni ),
      medico:medicoId    ( id, nombre, apellido )
    `)
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('Ese horario ya está reservado.')
    throw error
  }
  return data
}

export async function updateTurno(id, campos) {
  const { data, error } = await supabase
    .from('turno')
    .update({ ...campos, updatedAt: new Date().toISOString() })
    .eq('id', id)
    .select(`
      *,
      paciente:pacienteId ( id, nombre, apellido, dni ),
      medico:medicoId    ( id, nombre, apellido )
    `)
    .single()

  if (error) throw error
  return data
}

export async function cancelarTurno(id, observaciones = '') {
  return updateTurno(id, { estado: 'cancelado', observaciones })
}

/**
 * Dado un médico y una fecha, genera todos los slots posibles
 * según su agenda y marca cuáles ya están ocupados.
 * @returns Array<{ horaInicio, horaFin, disponible, turnoId? }>
 */
export async function getSlotsDisponibles(medicoId, fecha) {
  const fechaDate = new Date(fecha + 'T00:00:00')
  const diaSemana = fechaDate.getDay() // 0=Dom

  const { data: agendas, error: agError } = await supabase
    .from('agendaMedico')
    .select('*')
    .eq('medicoId', medicoId)
    .eq('diaSemana', diaSemana)
    .eq('activo', true)

  if (agError) throw agError
  if (!agendas || agendas.length === 0) return []

  const { data: turnosOcupados, error: tError } = await supabase
    .from('turno')
    .select('horaInicio, horaFin, id')
    .eq('medicoId', medicoId)
    .eq('fecha', fecha)
    .neq('estado', 'cancelado')

  if (tError) throw tError

  // Normalizar horas a "HH:MM" para comparar
  const normalize = (t) => t ? t.slice(0, 5) : ''
  const ocupadosSet = new Set((turnosOcupados || []).map(t => normalize(t.horaInicio)))

  const slots = []
  for (const agenda of agendas) {
    const slotMinutes = agenda.duracionSlot
    let [hh, mm] = agenda.horaInicio.split(':').map(Number)
    const [endHH, endMM] = agenda.horaFin.split(':').map(Number)
    const endTotal = endHH * 60 + endMM

    while (hh * 60 + mm + slotMinutes <= endTotal) {
      const inicio = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`
      const finMin = hh * 60 + mm + slotMinutes
      const fin    = `${String(Math.floor(finMin/60)).padStart(2,'0')}:${String(finMin%60).padStart(2,'0')}`

      const turnoExistente = (turnosOcupados || []).find(
        t => normalize(t.horaInicio) === inicio
      )

      slots.push({
        horaInicio: inicio,
        horaFin:    fin,
        disponible: !ocupadosSet.has(inicio),
        turnoId:    turnoExistente?.id || null,
      })

      mm += slotMinutes
      if (mm >= 60) { hh += Math.floor(mm / 60); mm = mm % 60 }
    }
  }

  return slots
}

export async function getMedicos() {
  const { data, error } = await supabase
    .from('usuario')
    .select('id, nombre, apellido')
    .eq('rol', 'medico')
    .eq('activo', true)
    .order('apellido')

  if (error) throw error
  return data
}