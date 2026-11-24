import { supabase } from '../lib/supabaseClient'

// Los agregados se calculan en PostgreSQL (funciones reporte_*), no en el navegador:
// escalan con el volumen de datos y devuelven siempre la misma forma de respuesta.

// ── Ocupación de camas, agrupada por sector ──────────────────────────
// → { porSector: [{ sector, total, disponible, ocupada, mantenimiento, reservada }], totales }
export async function getOcupacionCamas() {
  const { data, error } = await supabase.rpc('reporte_ocupacion_camas')
  if (error) throw error
  return data
}

// ── Pacientes atendidos desde una fecha ──────────────────────────────
// → { total, porEstado, porNivel, porMedioIngreso }
export async function getPacientesAtendidos(desdeISO) {
  const { data, error } = await supabase.rpc('reporte_pacientes_atendidos', { p_desde: desdeISO })
  if (error) throw error
  return data
}

// ── Resumen de facturación desde una fecha ───────────────────────────
// → { cantidadFacturas, totales, porEstadoPago, porCobertura }
export async function getFacturacionResumen(desdeISO) {
  const { data, error } = await supabase.rpc('reporte_facturacion', { p_desde: desdeISO })
  if (error) throw error
  return data
}
