import { supabase } from '../lib/supabaseClient'

// ── "Login" simplificado del portal paciente ─────────────────────────
// No usa Supabase Auth: verifica DNI + fecha de nacimiento contra la
// tabla `paciente` y devuelve el registro si coincide. Es un mockup
// para navegar las pantallas, no un mecanismo de seguridad real —
// documentado como deuda técnica en la arquitectura.
export async function loginPaciente(dni, fechaNacimiento) {
  const { data, error } = await supabase
    .from('paciente')
    .select('id, nombre, apellido, dni, fechaNacimiento, sexo, telefono, email, grupoSanguineo, alergias')
    .eq('dni', dni.trim())
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('No encontramos ningún paciente con ese DNI.')
  if (data.fechaNacimiento !== fechaNacimiento) {
    throw new Error('La fecha de nacimiento no coincide con la registrada.')
  }
  return data
}

// ── Auto-registro de un paciente nuevo desde el portal ────────────────
// Pensado para quien quiere sacar un turno por primera vez sin pasar
// por Recepción. Mismo mockup sin autenticación real que loginPaciente:
// no hay verificación de identidad más allá de que el DNI no exista ya.
export async function registrarPaciente({ nombre, apellido, dni, fechaNacimiento, sexo, telefono, email }) {
  const dniLimpio = dni.trim()

  const { data: existente, error: errCheck } = await supabase
    .from('paciente')
    .select('id')
    .eq('dni', dniLimpio)
    .maybeSingle()

  if (errCheck) throw errCheck
  if (existente) throw new Error('Ya existe un paciente registrado con ese DNI. Probá ingresar en vez de registrarte.')

  const { data, error } = await supabase
    .from('paciente')
    .insert([{
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      dni: dniLimpio,
      fechaNacimiento,
      sexo,
      telefono: telefono?.trim() || null,
      email: email?.trim() || null,
    }])
    .select('id, nombre, apellido, dni, fechaNacimiento, sexo, telefono, email, grupoSanguineo, alergias')
    .single()

  if (error) throw error

  // Igual que el alta por Recepción (createPacienteConCobertura): se crea un
  // historial clínico vacío automáticamente. Sin esto, Historial Clínico
  // (vista del médico) no tiene dónde guardar observaciones/atenciones para
  // un paciente que se auto-registró desde el portal.
  const { error: histError } = await supabase
    .from('historialClinico')
    .insert([{ pacienteId: data.id }])

  if (histError) throw histError

  return data
}