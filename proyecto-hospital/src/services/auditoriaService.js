import { supabase } from '../lib/supabaseClient'

// Registro de auditoría generado automáticamente por triggers de PostgreSQL
// (INSERT / UPDATE / DELETE sobre las tablas sensibles). Solo lo ve un administrador.
export async function getAuditoria({ tabla, accion, desde, hasta, limit = 100, offset = 0 } = {}) {
  let q = supabase
    .from('auditoria')
    .select('*, usuario:usuarioId ( nombre, apellido, rol )', { count: 'exact' })
    .order('createdAt', { ascending: false })
    .range(offset, offset + limit - 1)
  if (tabla)  q = q.eq('tablaAfectada', tabla)
  if (accion) q = q.eq('accion', accion)
  if (desde)  q = q.gte('createdAt', desde)
  if (hasta)  q = q.lte('createdAt', hasta)
  const { data, error, count } = await q
  if (error) throw error
  return { rows: data, total: count ?? 0 }
}

export async function getTablasAuditadas() {
  const { data, error } = await supabase.from('auditoria').select('tablaAfectada').limit(1000)
  if (error) throw error
  return [...new Set((data || []).map(r => r.tablaAfectada))].sort()
}
