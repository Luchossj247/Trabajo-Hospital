import { supabase } from '../lib/supabaseClient'

// Registro de auditoría generado automáticamente por triggers de PostgreSQL
// (INSERT / UPDATE / DELETE sobre las tablas sensibles). Solo lo ve un administrador.
export async function getAuditoria({ tabla, accion, usuarioId, desde, hasta, limit = 100, offset = 0 } = {}) {
  let q = supabase
    .from('auditoria')
    .select('*, usuario:usuarioId ( nombre, apellido, rol )', { count: 'exact' })
    .order('createdAt', { ascending: false })
    .range(offset, offset + limit - 1)
  if (tabla)     q = q.eq('tablaAfectada', tabla)
  if (accion)    q = q.eq('accion', accion)
  if (usuarioId) q = q.eq('usuarioId', usuarioId)
  if (desde)     q = q.gte('createdAt', new Date(`${desde}T00:00:00`).toISOString())
  if (hasta)     q = q.lte('createdAt', new Date(`${hasta}T23:59:59.999`).toISOString())
  const { data, error, count } = await q
  if (error) throw error
  return { rows: data, total: count ?? 0 }
}

const unicos = (arr) => [...new Set(arr.filter(Boolean))]

async function traer(tabla, columnas, ids) {
  if (!ids.length) return {}
  const { data } = await supabase.from(tabla).select(columnas).in('id', ids)
  return Object.fromEntries((data || []).map(f => [f.id, f]))
}

// Los eventos guardan identificadores (UUID). Para mostrarlos como nombres se buscan en bloque
// las personas, camas y demás registros a los que apuntan (una consulta por tipo, no por evento).
export async function resolverReferencias(rows) {
  const filas = rows.flatMap(r => [r.datosAnteriores, r.datosNuevos].filter(Boolean).map(d => ({ ...d, __tabla: r.tablaAfectada })))
  const de = (campo) => filas.map(f => f[campo])

  // 1.er nivel: recetas e historiales (apuntan a guardias / pacientes)
  const [receta, historial] = await Promise.all([
    traer('receta', 'id, guardiaId', unicos(de('recetaId'))),
    traer('historialClinico', 'id, pacienteId', unicos(de('historialClinicoId'))),
  ])
  // 2.º nivel: guardias (apuntan a pacientes)
  const guardiaIds = unicos([...de('guardiaId'), ...Object.values(receta).map(r => r.guardiaId)])
  const guardia = await traer('guardia', 'id, pacienteId', guardiaIds)

  const pacienteIds = unicos([
    ...de('pacienteId'),
    ...Object.values(guardia).map(g => g.pacienteId),
    ...Object.values(historial).map(h => h.pacienteId),
  ])
  const usuarioIds = unicos([
    ...['medicoId', 'enfermeroId', 'recepcionistaId', 'farmaciaUsuarioId', 'subidoPor', 'usuarioSolicitanteId', 'usuarioReceptorId']
      .flatMap(de),
    ...filas.filter(f => f.__tabla === 'horario').map(f => f.usuarioId),
  ])

  const [paciente, usuario, cama] = await Promise.all([
    traer('paciente', 'id, nombre, apellido, dni', pacienteIds),
    traer('usuario', 'id, nombre, apellido, rol', usuarioIds),
    traer('cama', 'id, codigo', unicos(de('camaId'))),
  ])
  return { paciente, usuario, cama, guardia, receta, historial }
}
