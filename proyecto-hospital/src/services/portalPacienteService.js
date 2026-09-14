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