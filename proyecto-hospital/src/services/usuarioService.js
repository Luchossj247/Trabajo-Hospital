import { supabase } from '../lib/supabaseClient'

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

// ── Helper para llamar Edge Functions con el JWT del usuario actual ──
async function callFunction(name, body) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('No hay sesión activa')

  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `Error ${res.status}`)
  return json
}

// ── Obtener todos los usuarios ────────────────────────────────
export async function getUsuarios() {
  const { data, error } = await supabase
    .from('usuario')
    .select('*')
    .order('createdAt', { ascending: false })

  if (error) throw error
  return data
}

// ── Obtener un usuario por ID ─────────────────────────────────
export async function getUsuarioById(id) {
  const { data, error } = await supabase
    .from('usuario')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// ── Crear usuario (Auth + tabla) vía Edge Function ────────────
export async function createUsuario({ nombre, apellido, email, passwordHash, rol, activo = true }) {
  const { user } = await callFunction('create-user', {
    nombre, apellido, email,
    password: passwordHash,
    rol, activo,
  })
  return user
}

// ── Actualizar usuario (datos de perfil) ──────────────────────
export async function updateUsuario(id, campos) {
  const { passwordHash, ...rest } = campos

  const { data, error } = await supabase
    .from('usuario')
    .update(rest)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Resetear contraseña (solo admin) ─────────────────────────
export async function resetPassword(userId, newPassword) {
  await callFunction('update-password', { userId, newPassword })
}

// ── Eliminar usuario (Auth + tabla) vía Edge Function ─────────
export async function deleteUsuario(id) {
  await callFunction('delete-user', { userId: id })
}

// ── Togglear estado activo ────────────────────────────────────
export async function toggleUsuarioActivo(id, activo) {
  return updateUsuario(id, { activo: !activo })
}

// ── Buscar usuarios ───────────────────────────────────────────
export async function searchUsuarios(query) {
  const { data, error } = await supabase
    .from('usuario')
    .select('*')
    .or(`nombre.ilike.%${query}%,apellido.ilike.%${query}%,email.ilike.%${query}%`)
    .order('createdAt', { ascending: false })

  if (error) throw error
  return data
}

// ── Filtrar por rol ───────────────────────────────────────────
export async function getUsuariosByRol(rol) {
  const { data, error } = await supabase
    .from('usuario')
    .select('*')
    .eq('rol', rol)
    .order('createdAt', { ascending: false })

  if (error) throw error
  return data
}