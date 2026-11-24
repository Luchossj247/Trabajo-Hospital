import { supabase } from '../lib/supabaseClient'

const REGISTER_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portal-register`

// Trae el paciente vinculado a la sesión actual (RLS ya filtra a "el propio").
export async function getMiPaciente() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null
  const { data, error } = await supabase
    .from('paciente')
    .select('*')
    .eq('usuarioId', session.user.id)
    .maybeSingle()
  if (error) throw error
  return data
}

// Login con Supabase Auth (email + contraseña). Rechaza cuentas que no sean de paciente.
export async function loginPaciente(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
  if (error) throw new Error('Email o contraseña incorrectos.')

  const paciente = await getMiPaciente()
  if (!paciente) {
    await supabase.auth.signOut()
    throw new Error('Esta cuenta no pertenece a un paciente. Si sos empleado, ingresá por el acceso de empleados.')
  }
  return paciente
}

// Alta de cuenta del portal vía Edge Function (usa service_role en el servidor).
// - Paciente nuevo: se crean paciente + historial + cuenta.
// - Paciente ya cargado por el hospital: requiere `codigo` de activación entregado en recepción.
export async function registrarPaciente(datos) {
  const res = await fetch(REGISTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(datos),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'No se pudo completar el registro.')

  // Cuenta creada: iniciamos sesión automáticamente
  return loginPaciente(datos.email, datos.password)
}

export async function logoutPaciente() {
  await supabase.auth.signOut()
}

// El paciente solo puede cambiar sus datos de contacto; la base lo impone con un trigger
// (cualquier otro campo es rechazado), así que acá se envía únicamente esa lista.
export async function actualizarMisDatos(pacienteId, { telefono, email, direccion, contactoEmergenciaNombre, contactoEmergenciaTelefono }) {
  const limpio = v => (v?.trim() ? v.trim() : null)
  const { data, error } = await supabase
    .from('paciente')
    .update({
      telefono: limpio(telefono),
      email: limpio(email),
      direccion: limpio(direccion),
      contactoEmergenciaNombre: limpio(contactoEmergenciaNombre),
      contactoEmergenciaTelefono: limpio(contactoEmergenciaTelefono),
    })
    .eq('id', pacienteId)
    .select()
    .single()
  if (error) throw new Error('No se pudieron guardar los cambios.')
  return data
}
