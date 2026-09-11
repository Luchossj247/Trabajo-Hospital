import { supabase } from '../lib/supabaseClient'

// ── Lista de otros usuarios (para iniciar o elegir una conversación) ──
export async function getUsuariosParaMensajear(propioId) {
  const { data, error } = await supabase
    .from('usuario')
    .select('id, nombre, apellido, rol, activo')
    .neq('id', propioId)
    .eq('activo', true)
    .order('nombre')

  if (error) throw error
  return data
}

// ── Conversaciones del usuario actual, con último mensaje y no leídos ──
// Devuelve una lista agrupada por el "otro" usuario de la conversación.
export async function getConversaciones(propioId) {
  const { data, error } = await supabase
    .from('mensajeInterno')
    .select(`
      id, contenido, leido, "enviadoAt", "emisorId", "receptorId",
      emisor:emisorId ( id, nombre, apellido, rol ),
      receptor:receptorId ( id, nombre, apellido, rol )
    `)
    .or(`emisorId.eq.${propioId},receptorId.eq.${propioId}`)
    .order('enviadoAt', { ascending: false })

  if (error) throw error

  const porContacto = {}
  for (const m of data) {
    const esEmisor = m.emisorId === propioId
    const contacto = esEmisor ? m.receptor : m.emisor
    if (!contacto) continue

    if (!porContacto[contacto.id]) {
      porContacto[contacto.id] = {
        contacto,
        ultimoMensaje: m,
        noLeidos: 0,
      }
    }
    // No leídos: mensajes que ME enviaron a mí y todavía no marqué como leídos
    if (!esEmisor && !m.leido) {
      porContacto[contacto.id].noLeidos++
    }
  }

  return Object.values(porContacto).sort(
    (a, b) => new Date(b.ultimoMensaje.enviadoAt) - new Date(a.ultimoMensaje.enviadoAt)
  )
}

// ── Hilo completo de mensajes entre el usuario actual y otro ─────────
export async function getHiloMensajes(propioId, otroId) {
  const { data, error } = await supabase
    .from('mensajeInterno')
    .select(`id, contenido, leido, "enviadoAt", "emisorId", "receptorId"`)
    .or(`and(emisorId.eq.${propioId},receptorId.eq.${otroId}),and(emisorId.eq.${otroId},receptorId.eq.${propioId})`)
    .order('enviadoAt', { ascending: true })

  if (error) throw error
  return data
}

// ── Enviar un mensaje ──────────────────────────────────────────────
export async function enviarMensaje(emisorId, receptorId, contenido) {
  const { data, error } = await supabase
    .from('mensajeInterno')
    .insert([{ emisorId, receptorId, contenido }])
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Marcar como leídos todos los mensajes recibidos de un contacto ───
export async function marcarConversacionLeida(propioId, otroId) {
  const { error } = await supabase
    .from('mensajeInterno')
    .update({ leido: true })
    .eq('emisorId', otroId)
    .eq('receptorId', propioId)
    .eq('leido', false)

  if (error) throw error
}

// ── Total de mensajes sin leer (para el badge del sidebar) ───────────
export async function getTotalNoLeidos(propioId) {
  const { count, error } = await supabase
    .from('mensajeInterno')
    .select('id', { count: 'exact', head: true })
    .eq('receptorId', propioId)
    .eq('leido', false)

  if (error) throw error
  return count || 0
}