import { supabase } from '../lib/supabaseClient'

// ── Cola de pedidos (pendientes + en proceso) ────────────────────────
export async function getPedidosPendientes() {
  const { data, error } = await supabase
    .from('pedidoMedicamento')
    .select(`
      *,
      receta:recetaId (
        id, estado, createdAt,
        medico:medicoId ( id, nombre, apellido ),
        guardia:guardiaId ( id, paciente:pacienteId ( id, nombre, apellido, dni ) ),
        recetaItem ( * )
      ),
      farmaciaUsuario:farmaciaUsuarioId ( id, nombre, apellido ),
      pedidoItem ( * )
    `)
    .in('estado', ['pendiente', 'en_proceso'])
    .order('createdAt', { ascending: true })

  if (error) throw error
  return data
}

export async function getPedidosResueltos(limit = 30) {
  const { data, error } = await supabase
    .from('pedidoMedicamento')
    .select(`
      *,
      receta:recetaId (
        id,
        guardia:guardiaId ( id, paciente:pacienteId ( id, nombre, apellido, dni ) )
      ),
      pedidoItem ( * )
    `)
    .in('estado', ['completado', 'cancelado'])
    .order('resueltaAt', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

// ── Tomar un pedido (pasa a en_proceso y se asigna el usuario de farmacia) ──
export async function tomarPedido(pedidoId, farmaciaUsuarioId) {
  const { data, error } = await supabase
    .from('pedidoMedicamento')
    .update({ estado: 'en_proceso', farmaciaUsuarioId })
    .eq('id', pedidoId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Resolver un ítem de la receta: entregar / reemplazar / agregar / cancelar ──
export async function resolverItem(pedidoId, recetaItemId, { accion, medicamentoEntregado, motivoReemplazo }) {
  const { data, error } = await supabase
    .from('pedidoItem')
    .insert([{
      pedidoId,
      recetaItemId,
      accion,
      medicamentoEntregado: medicamentoEntregado || null,
      motivoReemplazo: motivoReemplazo || null,
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Cerrar el pedido una vez resueltos todos los ítems ───────────────
// Genera la receta final para el paciente (estado 'entregada' salvo que se haya cancelado todo).
export async function finalizarPedido(pedidoId, recetaId, { observaciones, cancelado = false } = {}) {
  const { error: errPedido } = await supabase
    .from('pedidoMedicamento')
    .update({
      estado: cancelado ? 'cancelado' : 'completado',
      observaciones: observaciones || null,
      resueltaAt: new Date().toISOString(),
    })
    .eq('id', pedidoId)

  if (errPedido) throw errPedido

  const { error: errReceta } = await supabase
    .from('receta')
    .update({ estado: cancelado ? 'cancelada' : 'entregada', updatedAt: new Date().toISOString() })
    .eq('id', recetaId)

  if (errReceta) throw errReceta
}