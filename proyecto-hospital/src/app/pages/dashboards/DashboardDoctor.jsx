import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Stethoscope, RefreshCw, HeartPulse, BedDouble, FileText,
  Clock, Calendar, User, ChevronRight,
} from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'

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

function SectionCard({ title, action, actionHref, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <span className="font-bold text-slate-900">{title}</span>
        {action && (
          <Link to={actionHref} className="text-xs font-semibold text-[#013FF6] hover:underline">{action}</Link>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export function DashboardDoctor() {
  const { perfil } = useAuth()
  const [misPacientes, setMisPacientes] = useState([])
  const [turnosHoy, setTurnosHoy]       = useState([])
  const [loading, setLoading]           = useState(true)
  const [lastRefresh, setLastRefresh]   = useState(new Date())

  const fetchAll = useCallback(async () => {
    if (!perfil?.id) return
    setLoading(true)
    try {
      const hoy = new Date().toISOString().split('T')[0]

      const [pacientesRes, turnosRes] = await Promise.all([
        supabase
          .from('guardia')
          .select(`id, nivelTriage, ingresoAt, comentarioTriage, paciente:pacienteId ( id, nombre, apellido, dni )`)
          .eq('medicoId', perfil.id)
          .in('estado', ['en_atencion'])
          .order('nivelTriage', { ascending: true, nullsFirst: false }),

        supabase
          .from('turno')
          .select(`id, horaInicio, horaFin, motivo, estado, paciente:pacienteId ( id, nombre, apellido, dni )`)
          .eq('medicoId', perfil.id)
          .eq('fecha', hoy)
          .neq('estado', 'cancelado')
          .order('horaInicio', { ascending: true }),
      ])

      setMisPacientes(pacientesRes.data || [])
      setTurnosHoy(turnosRes.data || [])
    } catch (err) {
      console.error('Error fetching dashboard médico:', err)
      setMisPacientes([])
      setTurnosHoy([])
    } finally {
      setLoading(false)
      setLastRefresh(new Date())
    }
  }, [perfil?.id])

  useEffect(() => { fetchAll() }, [fetchAll])

  const graves = misPacientes.filter(p => p.nivelTriage <= 2).length
  const turnosRealizados = turnosHoy.filter(t => t.estado === 'realizado').length

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Hola, Dr/a. {perfil?.apellido || ''}
          </h1>
          <p className="text-slate-500 mt-1">Tu actividad clínica de hoy</p>
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
        <StatCard label="Pacientes en atención" value={misPacientes.length} sub={graves > 0 ? `${graves} nivel grave` : 'sin urgencias'} icon={HeartPulse} accent="#013FF6" loading={loading} />
        <StatCard label="Turnos de hoy" value={turnosHoy.length} sub={`${turnosRealizados} realizados`} icon={Calendar} accent="#ACEC00" loading={loading} />
        <StatCard label="Hora actual" value={new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} sub={new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })} icon={Clock} accent="#8b5cf6" loading={false} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Mis pacientes en atención" action="Ir a Triaje" actionHref="/empleado/triaje">
          {loading ? (
            <div className="space-y-2">{Array(3).fill(0).map((_, i) => <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg" />)}</div>
          ) : misPacientes.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No tenés pacientes en atención en este momento.</p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {misPacientes.map(p => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                    style={{ backgroundColor: NIVEL_COLOR[p.nivelTriage] || '#94a3b8' }}>
                    {p.nivelTriage || '?'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{p.paciente?.nombre} {p.paciente?.apellido}</p>
                    <p className="text-xs text-slate-400 truncate">DNI {p.paciente?.dni} · {p.comentarioTriage || 'sin motivo registrado'}</p>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">{minutosDesde(p.ingresoAt)} min</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Turnos de hoy" action="Ver agenda" actionHref="/empleado/camas">
          {loading ? (
            <div className="space-y-2">{Array(3).fill(0).map((_, i) => <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg" />)}</div>
          ) : turnosHoy.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Sin turnos programados para hoy.</p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {turnosHoy.map(t => (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <span className="text-xs font-mono font-semibold text-slate-500 w-12 flex-shrink-0">{t.horaInicio?.slice(0, 5)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{t.paciente?.nombre} {t.paciente?.apellido}</p>
                    <p className="text-xs text-slate-400 truncate">{t.motivo || 'sin motivo especificado'}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0
                    ${t.estado === 'realizado' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                    {t.estado}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Accesos rápidos">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Triaje',           icon: HeartPulse, href: '/empleado/triaje',    color: '#013FF6' },
            { label: 'Control de Camas', icon: BedDouble,  href: '/empleado/camas',     color: '#ACEC00' },
            { label: 'Historial Clínico', icon: FileText,  href: '/empleado/historial', color: '#8b5cf6' },
          ].map(({ label, icon: Icon, href, color }) => (
            <Link key={label} to={href}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm bg-slate-50/50 hover:bg-white transition-all text-center">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              <span className="text-xs font-semibold text-slate-700 leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}