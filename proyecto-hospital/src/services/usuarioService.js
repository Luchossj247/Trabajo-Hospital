import { supabase } from '../lib/supabaseClient'

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

// ── Crear usuario ─────────────────────────────────────────────
export async function createUsuario(usuario) {
  const { data, error } = await supabase
    .from('usuario')
    .insert([usuario])
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Actualizar usuario ────────────────────────────────────────
export async function updateUsuario(id, campos) {
  const { data, error } = await supabase
    .from('usuario')
    .update(campos)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Eliminar usuario ──────────────────────────────────────────
export async function deleteUsuario(id) {
  const { error } = await supabase
    .from('usuario')
    .delete()
    .eq('id', id)

  if (error) throw error
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