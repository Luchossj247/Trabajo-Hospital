import { supabase } from '../lib/supabaseClient'

// ── Recetas de una guardia puntual ───────────────────────────────
export async function getRecetasByGuardia(guardiaId) {
  const { data, error } = await supabase
    .from('receta')
    .select(`*, recetaItem ( * ), medico:medicoId ( id, nombre, apellido )`)
    .eq('guardiaId', guardiaId)
    .order('createdAt', { ascending: false })

  if (error) throw error
  return data
}

// ── Crear una receta con sus ítems, y disparar el pedido a Farmacia ──
// items: [{ medicamentoNombre, dosis, frecuencia, indicaciones }]
export async function crearReceta({ guardiaId, medicoId, items }) {
  if (!items?.length) throw new Error('Agregá al menos un medicamento.')

  const { data: receta, error: errReceta } = await supabase
    .from('receta')
    .insert([{ guardiaId, medicoId, estado: 'pendiente' }])
    .select()
    .single()

  if (errReceta) throw errReceta

  const itemsPayload = items.map(it => ({ ...it, recetaId: receta.id }))
  const { data: recetaItems, error: errItems } = await supabase
    .from('recetaItem')
    .insert(itemsPayload)
    .select()

  if (errItems) throw errItems

  // El pedido se envía automáticamente al área de Farmacia (según relevamiento, punto 5)
  const { error: errPedido } = await supabase
    .from('pedidoMedicamento')
    .insert([{ recetaId: receta.id, estado: 'pendiente' }])

  if (errPedido) throw errPedido

  return { ...receta, recetaItem: recetaItems }
}