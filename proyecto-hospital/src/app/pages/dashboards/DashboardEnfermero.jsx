import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  HeartPulse, RefreshCw, BedDouble, Clock,
} from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'

const NIVEL_COLOR = { 1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#22c55e', 5: '#3b82f6' }

function minutosDesde(iso) {
  if (!iso) return 0
  return Math.floor((Date.now() - new Date(iso)) / 60000)
}

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

export function DashboardEnfermero() {
  const [cola, setCola]         = useState([])
  const [camas, setCamas]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [colaRes, camasRes] = await Promise.all([
        supabase
          .from('guardia')
          .select(`id, estado, nivelTriage, ingresoAt, comentarioTriage, paciente:pacienteId ( id, nombre, apellido, dni )`)
          .in('estado', ['en_espera', 'en_atencion'])
          .order('nivelTriage', { ascending: true, nullsFirst: false })
          .order('ingresoAt', { ascending: true }),

        supabase.from('cama').select('estado'),
      ])

      setCola(colaRes.data || [])
      setCamas(camasRes.data || [])
    } catch (err) {
      console.error('Error fetching dashboard enfermero:', err)
      setCola([])
      setCamas([])
    } finally {
      setLoading(false)
      setLastRefresh(new Date())
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const enEspera   = cola.filter(g => g.estado === 'en_espera').length
  const enAtencion = cola.filter(g => g.estado === 'en_atencion').length
  const camasLibres = camas.filter(c => c.estado === 'disponible').length
  const proximos = cola.filter(g => g.estado === 'en_espera').slice(0, 6)

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Panel de Enfermería</h1>
          <p className="text-slate-500 mt-1">Estado de la guardia en tiempo real</p>
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
        <StatCard label="En espera de triaje" value={enEspera} sub="pendientes de atención" icon={Clock} accent="#f59e0b" loading={loading} />
        <StatCard label="En atención" value={enAtencion} sub="siendo atendidos ahora" icon={HeartPulse} accent="#013FF6" loading={loading} />
        <StatCard label="Camas disponibles" value={camasLibres} sub={`de ${camas.length} totales`} icon={BedDouble} accent="#22c55e" loading={loading} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <span className="font-bold text-slate-900">Próximos en la cola de triaje</span>
          <Link to="/empleado/triaje" className="text-xs font-semibold text-[#013FF6] hover:underline">Ir a Triaje</Link>
        </div>
        <div className="p-2">
          {loading ? (
            <div className="space-y-2 p-3">{Array(4).fill(0).map((_, i) => <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg" />)}</div>
          ) : proximos.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No hay pacientes esperando triaje.</p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {proximos.map(item => (
                <li key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                    style={{ backgroundColor: NIVEL_COLOR[item.nivelTriage] || '#94a3b8' }}>
                    {item.nivelTriage || '?'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{item.paciente?.nombre} {item.paciente?.apellido}</p>
                    <p className="text-xs text-slate-400 truncate">DNI {item.paciente?.dni} · {item.comentarioTriage || 'sin motivo registrado'}</p>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">{minutosDesde(item.ingresoAt)} min</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Triaje',           icon: HeartPulse, href: '/empleado/triaje', color: '#013FF6' },
          { label: 'Control de Camas', icon: BedDouble,  href: '/empleado/camas',  color: '#ACEC00' },
        ].map(({ label, icon: Icon, href, color }) => (
          <Link key={label} to={href}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm bg-white hover:bg-slate-50/50 transition-all text-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
            <span className="text-xs font-semibold text-slate-700 leading-tight">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}