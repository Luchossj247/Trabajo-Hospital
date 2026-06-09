import { supabase } from '../lib/supabaseClient'

// ── Obtener todas las recetas ─────────────────────────────────
export async function getRecetas() {
  const { data, error } = await supabase
    .from('receta')
    .select(`
      *,
      recetaItem (*),
      medico:medicoId ( nombre, apellido ),
      guardia (
        paciente ( nombre, apellido, dni )
      )
    `)
    .order('createdAt', { ascending: false })

  if (error) throw error
  return data
}

// ── Obtener recetas pendientes ────────────────────────────────
export async function getRecetasPendientes() {
  const { data, error } = await supabase
    .from('receta')
    .select(`
      *,
      recetaItem (*),
      medico:medicoId ( nombre, apellido ),
      guardia (
        paciente ( nombre, apellido, dni )
      )
    `)
    .eq('estado', 'pendiente')
    .order('createdAt', { ascending: true })

  if (error) throw error
  return data
}

// ── Crear receta con items ────────────────────────────────────
export async function createReceta(guardiaId, medicoId, items) {
  // 1. Crear la receta
  const { data: receta, error: recetaError } = await supabase
    .from('receta')
    .insert([{ guardiaId, medicoId }])
    .select()
    .single()

  if (recetaError) throw recetaError

  // 2. Crear los items
  const itemsConId = items.map(item => ({ ...item, recetaId: receta.id }))
  const { error: itemsError } = await supabase
    .from('recetaItem')
    .insert(itemsConId)

  if (itemsError) throw itemsError

  return receta
}

// ── Actualizar estado de receta ───────────────────────────────
export async function updateEstadoReceta(id, estado) {
  const { data, error } = await supabase
    .from('receta')
    .update({ estado })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Pedidos de medicamentos ───────────────────────────────────
export async function getPedidosPendientes() {
  const { data, error } = await supabase
    .from('pedidoMedicamento')
    .select(`
      *,
      pedidoItem (
        *,
        recetaItem (*)
      ),
      receta (
        guardia (
          paciente ( nombre, apellido )
        )
      )
    `)
    .in('estado', ['pendiente', 'en_proceso'])
    .order('createdAt', { ascending: true })

  if (error) throw error
  return data
}

// ── Crear pedido de medicamento ───────────────────────────────
export async function createPedido(recetaId, farmaciaUsuarioId, items) {
  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidoMedicamento')
    .insert([{ recetaId, farmaciaUsuarioId, estado: 'en_proceso' }])
    .select()
    .single()

  if (pedidoError) throw pedidoError

  const itemsConId = items.map(item => ({ ...item, pedidoId: pedido.id }))
  const { error: itemsError } = await supabase
    .from('pedidoItem')
    .insert(itemsConId)

  if (itemsError) throw itemsError

  return pedido
}

// ── Completar pedido ──────────────────────────────────────────
export async function completarPedido(pedidoId, recetaId) {
  const { error: pedidoError } = await supabase
    .from('pedidoMedicamento')
    .update({ estado: 'completado', resueltaAt: new Date().toISOString() })
    .eq('id', pedidoId)

  if (pedidoError) throw pedidoError

  await updateEstadoReceta(recetaId, 'entregada')
}

// ── Estadísticas de farmacia ──────────────────────────────────
export async function getEstadisticasFarmacia() {
  const { data, error } = await supabase
    .from('pedidoMedicamento')
    .select('estado')

  if (error) throw error

  return {
    pendientes: data.filter(p => p.estado === 'pendiente').length,
    enProceso: data.filter(p => p.estado === 'en_proceso').length,
    completados: data.filter(p => p.estado === 'completado').length,
    cancelados: data.filter(p => p.estado === 'cancelado').length,
  }
}