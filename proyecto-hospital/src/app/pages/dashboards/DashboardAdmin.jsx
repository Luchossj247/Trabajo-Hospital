import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getPacientes, getPacientesHoy } from '../../../services/pacienteService'
import { getUsuarios } from '../../../services/usuarioService'
import { getCamas, getEstadisticasCamas } from '../../../services/camaService'
import { getEstadisticasGuardia } from '../../../services/guardiaService'
import {
  Users, BedDouble, Activity, Pill, UserPlus, Shield,
  RefreshCw, ChevronRight, Heart, Calendar, BarChart2,
  Clock, AlertTriangle,
} from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0)

// ── Sub-componentes ───────────────────────────────────────────
const StatCard = ({ label, value, sub, icon: Icon, accent = '#013FF6', loading }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
    <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
      style={{ backgroundColor: `${accent}15` }}>
      <Icon className="h-6 w-6" style={{ color: accent }} />
    </div>
    <div className="min-w-0 flex-1">
      {loading
        ? <>
            <div className="h-8 w-20 bg-slate-100 animate-pulse rounded mb-1" />
            <div className="h-3 w-32 bg-slate-100 animate-pulse rounded" />
          </>
        : <>
            <p className="text-2xl font-extrabold text-slate-900 leading-none">{value ?? '—'}</p>
            <p className="text-sm font-medium text-slate-500 mt-1 leading-tight">{label}</p>
            {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
          </>
      }
    </div>
  </div>
)

const SectionCard = ({ title, action, actionHref, children }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
      <h3 className="font-bold text-slate-900">{title}</h3>
      {action && (
        <Link to={actionHref || '#'}
          className="text-sm text-[#013FF6] hover:underline flex items-center gap-1">
          {action} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
    <div className="p-5">{children}</div>
  </div>
)

const SkeletonList = ({ rows = 4 }) => (
  <div className="space-y-2">
    {Array(rows).fill(0).map((_, i) => (
      <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-xl" />
    ))}
  </div>
)

// ── Componente principal ──────────────────────────────────────
export function DashboardAdmin() {
  const [pacientes, setPacientes]         = useState([])
  const [pacientesHoy, setPacientesHoy]   = useState([])
  const [usuarios, setUsuarios]           = useState([])
  const [statsCamas, setStatsCamas]       = useState(null)
  const [statsGuardia, setStatsGuardia]   = useState(null)
  const [loading, setLoading]             = useState(true)
  const [lastRefresh, setLastRefresh]     = useState(new Date())
  const [error, setError]                 = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [
        pacientesData,
        pacientesHoyData,
        usuariosData,
        camasStats,
        guardiaStats,
      ] = await Promise.all([
        getPacientes(),
        getPacientesHoy(),
        getUsuarios(),
        getEstadisticasCamas(),
        getEstadisticasGuardia(),
      ])

      setPacientes(pacientesData)
      setPacientesHoy(pacientesHoyData)
      setUsuarios(usuariosData)
      setStatsCamas(camasStats)
      setStatsGuardia(guardiaStats)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err.message || 'Error al cargar el dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Stats cards ───────────────────────────────────────────
  const statItems = [
    {
      label:  'Pacientes Totales',
      value:  pacientes.length,
      sub:    `+${pacientesHoy.length} ingresados hoy`,
      icon:   Users,
      accent: '#013FF6',
    },
    {
      label:  'Personal Activo',
      value:  usuarios.filter(u => u.activo).length,
      sub:    `${usuarios.length} registrados en total`,
      icon:   Shield,
      accent: '#ACEC00',
    },
    {
      label:  'Camas Disponibles',
      value:  statsCamas?.disponible ?? '—',
      sub:    `${statsCamas?.ocupacionPct ?? 0}% de ocupación`,
      icon:   BedDouble,
      accent: '#013FF6',
    },
    {
      label:  'En Guardia Ahora',
      value:  statsGuardia ? (statsGuardia.enEspera + statsGuardia.enAtencion) : '—',
      sub:    statsGuardia?.criticos > 0
                ? `⚠ ${statsGuardia.criticos} caso${statsGuardia.criticos > 1 ? 's' : ''} crítico${statsGuardia.criticos > 1 ? 's' : ''}`
                : 'Sin casos críticos',
      icon:   Heart,
      accent: statsGuardia?.criticos > 0 ? '#ef4444' : '#013FF6',
    },
  ]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Panel de Administración
          </h1>
          <p className="text-slate-500 mt-1">Visión general del sistema hospitalario</p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600
            border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {lastRefresh.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
          <button onClick={fetchAll} className="ml-auto text-xs text-red-600 underline">Reintentar</button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((item, i) => (
          <StatCard key={i} {...item} loading={loading} />
        ))}
      </div>

      {/* Barra de ocupación de camas */}
      {!loading && statsCamas && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-slate-900">Ocupación de Camas</span>
            <span className="text-sm text-slate-500">
              {statsCamas.ocupada} ocupadas · {statsCamas.disponible} libres
              {statsCamas.mantenimiento > 0 && ` · ${statsCamas.mantenimiento} en mantenimiento`}
              {statsCamas.reservada > 0 && ` · ${statsCamas.reservada} reservadas`}
            </span>
          </div>
          <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
            <div className="bg-[#013FF6] rounded-l-full transition-all duration-700"
              style={{ width: `${pct(statsCamas.ocupada, statsCamas.total)}%` }} />
            <div className="bg-[#ACEC00] transition-all duration-700"
              style={{ width: `${pct(statsCamas.disponible, statsCamas.total)}%` }} />
            {statsCamas.mantenimiento > 0 && (
              <div className="bg-amber-300 transition-all duration-700"
                style={{ width: `${pct(statsCamas.mantenimiento, statsCamas.total)}%` }} />
            )}
            <div className="bg-slate-200 flex-1 rounded-r-full" />
          </div>
          <div className="flex gap-4 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#013FF6] inline-block" /> Ocupadas
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#ACEC00] inline-block" /> Disponibles
            </span>
            {statsCamas.mantenimiento > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-300 inline-block" /> Mantenimiento
              </span>
            )}
          </div>
        </div>
      )}

      {/* Estado de Guardia */}
      {!loading && statsGuardia && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" /> Estado de Guardia
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'En Espera',    value: statsGuardia.enEspera,   color: '#f59e0b' },
              { label: 'En Atención',  value: statsGuardia.enAtencion, color: '#013FF6' },
              { label: 'Internados',   value: statsGuardia.internados, color: '#8b5cf6' },
              { label: 'Críticos (T1)', value: statsGuardia.criticos,  color: '#ef4444' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <p className="text-2xl font-extrabold" style={{ color }}>{value}</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dos columnas: pacientes recientes + personal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Pacientes recientes */}
        <SectionCard
          title="Últimos Pacientes Registrados"
          action="Ver todos"
          actionHref="/empleado/registro"
        >
          {loading
            ? <SkeletonList />
            : pacientes.length === 0
              ? (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No hay pacientes registrados aún</p>
                </div>
              )
              : (
                <ul className="space-y-2">
                  {pacientes.slice(0, 5).map((p, i) => (
                    <li key={p.id || i}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-[#013FF6]/10 flex items-center
                        justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-[#013FF6]">
                          {(p.nombre || 'P')[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {p.nombre} {p.apellido}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          DNI: {p.dni || '—'}
                          {p.coberturaMedica?.[0]?.obraSocial
                            ? ` · ${p.coberturaMedica[0].obraSocial}`
                            : ' · Sin cobertura'}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400 flex-shrink-0">
                        {p.createdAt
                          ? new Date(p.createdAt).toLocaleDateString('es-AR', {
                              day: '2-digit', month: 'short',
                            })
                          : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              )
          }
        </SectionCard>

        {/* Personal */}
        <SectionCard
          title="Personal del Sistema"
          action="Gestionar"
          actionHref="/empleado/gestion-empleados"
        >
          {loading
            ? <SkeletonList />
            : usuarios.length === 0
              ? (
                <div className="text-center py-8">
                  <Shield className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No hay usuarios registrados aún</p>
                </div>
              )
              : (
                <ul className="space-y-2">
                  {usuarios.slice(0, 5).map((u, i) => (
                    <li key={u.id || i}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-[#ACEC00]/20 flex items-center
                        justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-slate-700">
                          {(u.nombre || 'U')[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {u.nombre} {u.apellido}
                        </p>
                        <p className="text-xs text-slate-400 capitalize truncate">{u.rol || '—'}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0
                        ${u.activo
                          ? 'bg-[#ACEC00]/30 text-slate-700'
                          : 'bg-slate-100 text-slate-400'}`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </li>
                  ))}
                </ul>
              )
          }
        </SectionCard>

      </div>

      {/* Acciones Rápidas */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Acciones Rápidas</h3>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[
            { label: 'Registrar Paciente',   icon: UserPlus,  href: '/empleado/registro',          color: '#013FF6' },
            { label: 'Control de Camas',     icon: BedDouble, href: '/empleado/camas',             color: '#ACEC00' },
            { label: 'Triaje',               icon: Heart,     href: '/empleado/triaje',            color: '#ef4444' },
            { label: 'Historial Clínico',    icon: Activity,  href: '/empleado/historial',         color: '#8b5cf6' },
            { label: 'Farmacia',             icon: Pill,      href: '/empleado/farmacia',          color: '#06b6d4' },
            { label: 'Gestión de Personal',  icon: Shield,    href: '/empleado/gestion-empleados', color: '#f59e0b' },
            { label: 'Turnos',               icon: Calendar,  href: '/empleado/turnos',            color: '#10b981' },
            { label: 'Reportes',             icon: BarChart2, href: '/empleado/reportes',          color: '#ec4899' },
          ].map(({ label, icon: Icon, href, color }) => (
            <Link
              key={label}
              to={href}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100
                hover:border-slate-200 hover:shadow-sm bg-slate-50/50 hover:bg-white transition-all text-center"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${color}18` }}>
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              <span className="text-xs font-semibold text-slate-700 leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Pacientes registrados hoy */}
      {!loading && pacientesHoy.length > 0 && (
        <SectionCard
          title={`Pacientes de Hoy (${pacientesHoy.length})`}
          action="Ver registro"
          actionHref="/empleado/registro"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {pacientesHoy.map((p, i) => (
              <div key={p.id || i}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#013FF6]/5 border border-[#013FF6]/10">
                <div className="w-8 h-8 rounded-full bg-[#013FF6] flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-white">
                    {(p.nombre || 'P')[0].toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {p.nombre} {p.apellido}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(p.createdAt).toLocaleTimeString('es-AR', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                    {p.coberturaMedica?.[0]?.obraSocial
                      ? ` · ${p.coberturaMedica[0].obraSocial}`
                      : ' · Sin cobertura'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

    </div>
  )
}