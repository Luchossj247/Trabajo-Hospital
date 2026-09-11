import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Pill, RefreshCw, Clock, CheckCircle2, User, Stethoscope } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'

function StatCard({ label, value, sub, icon: Icon, accent, loading }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${accent}18` }}>
        <Icon className="h-5 w-5" style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        {loading
          ? <div className="h-7 w-14 bg-slate-100 animate-pulse rounded mb-1" />
          : <p className="text-2xl font-extrabold text-slate-900 leading-none">{value}</p>}
        <p className="text-sm font-medium text-slate-500 mt-1 leading-tight">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export function DashboardFarmacia() {
  const [pedidos, setPedidos]   = useState([])
  const [resueltosHoy, setResueltosHoy] = useState(0)
  const [loading, setLoading]   = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const inicioHoy = new Date()
      inicioHoy.setHours(0, 0, 0, 0)

      const [pendientesRes, resueltosRes] = await Promise.all([
        supabase
          .from('pedidoMedicamento')
          .select(`
            id, estado, createdAt,
            receta:recetaId (
              medico:medicoId ( id, nombre, apellido ),
              guardia:guardiaId ( paciente:pacienteId ( id, nombre, apellido, dni ) ),
              recetaItem ( id )
            )
          `)
          .in('estado', ['pendiente', 'en_proceso'])
          .order('createdAt', { ascending: true }),

        supabase
          .from('pedidoMedicamento')
          .select('id', { count: 'exact', head: true })
          .eq('estado', 'completado')
          .gte('resueltaAt', inicioHoy.toISOString()),
      ])

      setPedidos(pendientesRes.data || [])
      setResueltosHoy(resueltosRes.count || 0)
    } catch (err) {
      console.error('Error fetching dashboard farmacia:', err)
      setPedidos([])
      setResueltosHoy(0)
    } finally {
      setLoading(false)
      setLastRefresh(new Date())
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const pendientes = pedidos.filter(p => p.estado === 'pendiente').length
  const enProceso  = pedidos.filter(p => p.estado === 'en_proceso').length

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Panel de Farmacia</h1>
          <p className="text-slate-500 mt-1">Cola de pedidos de medicamentos</p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {lastRefresh.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Pendientes de tomar" value={pendientes} sub="esperando ser tomados" icon={Clock} accent="#f59e0b" loading={loading} />
        <StatCard label="En proceso" value={enProceso} sub="siendo resueltos" icon={Pill} accent="#013FF6" loading={loading} />
        <StatCard label="Resueltos hoy" value={resueltosHoy} sub="completados en el día" icon={CheckCircle2} accent="#22c55e" loading={loading} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <span className="font-bold text-slate-900">Cola de pedidos</span>
          <Link to="/empleado/farmacia" className="text-xs font-semibold text-[#013FF6] hover:underline">Ir a Farmacia</Link>
        </div>
        <div className="p-2">
          {loading ? (
            <div className="space-y-2 p-3">{Array(4).fill(0).map((_, i) => <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-lg" />)}</div>
          ) : pedidos.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No hay pedidos pendientes.</p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {pedidos.slice(0, 8).map(p => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-3">
                  <div className="w-9 h-9 rounded-xl bg-[#013FF6]/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-[#013FF6]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {p.receta?.guardia?.paciente?.nombre} {p.receta?.guardia?.paciente?.apellido}
                    </p>
                    <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                      <Stethoscope className="h-3 w-3" /> Dr/a. {p.receta?.medico?.apellido} · {p.receta?.recetaItem?.length || 0} medicamento(s)
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0
                    ${p.estado === 'pendiente' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {p.estado === 'pendiente' ? 'Pendiente' : 'En proceso'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Link to="/empleado/farmacia"
        className="flex items-center justify-center gap-2 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm bg-white hover:bg-slate-50/50 transition-all">
        <div className="w-9 h-9 rounded-xl bg-[#013FF6]/10 flex items-center justify-center">
          <Pill className="h-4 w-4 text-[#013FF6]" />
        </div>
        <span className="text-sm font-semibold text-slate-700">Ir a Farmacia</span>
      </Link>
    </div>
  )
}