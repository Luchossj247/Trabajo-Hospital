import { supabase } from '../lib/supabaseClient'

const contar = async (query) => {
  const { count, error } = await query
  if (error) return 0
  return count || 0
}

// Avisos pendientes según el rol. Cada uno: { id, texto, ruta, cantidad }.
export async function getNotificaciones(perfil) {
  if (!perfil?.id) return []
  const hoy = new Date().toISOString().slice(0, 10)
  const rol = perfil.rol
  const pedidos = []

  pedidos.push(contar(
    supabase.from('mensajeInterno').select('id', { count: 'exact', head: true }).eq('receptorId', perfil.id).eq('leido', false),
  ).then(n => ({ id: 'mensajes', texto: 'Mensajes sin leer', ruta: '/empleado/mensajes', cantidad: n })))

  pedidos.push(contar(
    supabase.from('cambioHorario').select('id', { count: 'exact', head: true }).eq('usuarioReceptorId', perfil.id).eq('estado', 'pendiente'),
  ).then(n => ({ id: 'cambios', texto: 'Pedidos de cambio de horario por resolver', ruta: '/empleado/horarios', cantidad: n })))

  if (['administrador', 'medico', 'enfermero'].includes(rol)) {
    pedidos.push(contar(
      supabase.from('guardia').select('id', { count: 'exact', head: true }).eq('estado', 'en_espera'),
    ).then(n => ({ id: 'espera', texto: 'Pacientes en espera en guardia', ruta: '/empleado/triaje', cantidad: n })))
  }

  if (['administrador', 'farmacia'].includes(rol)) {
    pedidos.push(contar(
      supabase.from('pedidoMedicamento').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
    ).then(n => ({ id: 'pedidos', texto: 'Pedidos de farmacia pendientes', ruta: '/empleado/farmacia', cantidad: n })))
    pedidos.push(
      supabase.from('medicamento').select('stockActual, stockMinimo').then(({ data }) => ({
        id: 'stock', texto: 'Medicamentos con stock bajo', ruta: '/empleado/farmacia',
        cantidad: (data || []).filter(m => m.stockActual <= m.stockMinimo).length,
      })),
    )
  }

  if (['administrador', 'recepcionista'].includes(rol)) {
    pedidos.push(contar(
      supabase.from('turno').select('id', { count: 'exact', head: true }).eq('fecha', hoy).eq('estado', 'programado'),
    ).then(n => ({ id: 'turnos', texto: 'Turnos de hoy sin confirmar', ruta: '/empleado/turnos', cantidad: n })))
    pedidos.push(contar(
      supabase.from('facturacion').select('id', { count: 'exact', head: true }).eq('estadoPago', 'deuda'),
    ).then(n => ({ id: 'deuda', texto: 'Facturas con deuda', ruta: '/empleado/facturacion', cantidad: n })))
  }

  if (rol === 'medico') {
    pedidos.push(contar(
      supabase.from('turno').select('id', { count: 'exact', head: true }).eq('medicoId', perfil.id).eq('fecha', hoy).in('estado', ['programado', 'confirmado']),
    ).then(n => ({ id: 'agenda', texto: 'Turnos que tenés hoy', ruta: '/empleado/turnos', cantidad: n })))
  }

  const lista = await Promise.all(pedidos)
  return lista.filter(n => n.cantidad > 0)
}
