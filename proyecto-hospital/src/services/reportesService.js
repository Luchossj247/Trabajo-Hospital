import { supabase } from '../lib/supabaseClient'

// ── Ocupación de camas, agrupada por sector ──────────────────────────
export async function getOcupacionCamas() {
  const { data, error } = await supabase.from('cama').select('sector, estado')
  if (error) throw error

  const porSector = {}
  for (const c of data || []) {
    if (!porSector[c.sector]) porSector[c.sector] = { sector: c.sector, total: 0, disponible: 0, ocupada: 0, mantenimiento: 0, reservada: 0 }
    porSector[c.sector].total++
    porSector[c.sector][c.estado] = (porSector[c.sector][c.estado] || 0) + 1
  }

  const lista = Object.values(porSector).sort((a, b) => a.sector.localeCompare(b.sector))
  const totales = lista.reduce((acc, s) => ({
    total: acc.total + s.total,
    disponible: acc.disponible + s.disponible,
    ocupada: acc.ocupada + s.ocupada,
    mantenimiento: acc.mantenimiento + s.mantenimiento,
    reservada: acc.reservada + (s.reservada || 0),
  }), { total: 0, disponible: 0, ocupada: 0, mantenimiento: 0, reservada: 0 })

  return { porSector: lista, totales }
}

// ── Pacientes atendidos en un rango de fechas ────────────────────────
// desdeISO: fecha ISO desde la cual contar (inclusive)
export async function getPacientesAtendidos(desdeISO) {
  const { data, error } = await supabase
    .from('guardia')
    .select('id, estado, nivelTriage, medioIngreso, createdAt')
    .gte('createdAt', desdeISO)

  if (error) throw error

  const total = data.length
  const porEstado = data.reduce((acc, g) => {
    acc[g.estado] = (acc[g.estado] || 0) + 1
    return acc
  }, {})
  const porNivel = data.reduce((acc, g) => {
    const nivel = g.nivelTriage || 'sin_evaluar'
    acc[nivel] = (acc[nivel] || 0) + 1
    return acc
  }, {})
  const porMedioIngreso = data.reduce((acc, g) => {
    acc[g.medioIngreso] = (acc[g.medioIngreso] || 0) + 1
    return acc
  }, {})

  return { total, porEstado, porNivel, porMedioIngreso }
}

// ── Resumen de facturación en un rango de fechas ─────────────────────
export async function getFacturacionResumen(desdeISO) {
  const { data, error } = await supabase
    .from('facturacion')
    .select('estadoCobertura, estadoPago, montoTotal, montoObraSocial, montoPaciente, createdAt')
    .gte('createdAt', desdeISO)

  if (error) throw error

  const totales = data.reduce((acc, f) => ({
    montoTotal: acc.montoTotal + (f.montoTotal || 0),
    montoObraSocial: acc.montoObraSocial + (f.montoObraSocial || 0),
    montoPaciente: acc.montoPaciente + (f.montoPaciente || 0),
  }), { montoTotal: 0, montoObraSocial: 0, montoPaciente: 0 })

  const porEstadoPago = data.reduce((acc, f) => {
    acc[f.estadoPago] = (acc[f.estadoPago] || 0) + 1
    return acc
  }, {})

  const porCobertura = data.reduce((acc, f) => {
    acc[f.estadoCobertura] = (acc[f.estadoCobertura] || 0) + 1
    return acc
  }, {})

  return { cantidadFacturas: data.length, totales, porEstadoPago, porCobertura }
}