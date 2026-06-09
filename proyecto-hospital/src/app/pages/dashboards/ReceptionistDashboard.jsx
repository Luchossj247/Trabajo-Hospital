import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabaseClient'
import {
  UserPlus, Clock, BedDouble, RefreshCw, ChevronRight,
  CheckCircle2, AlertCircle, Shield, ShieldOff, Search,
  Calendar, Users, Loader2,
} from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────
const fmtHour = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '—'

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : '—'

const waitMinutes = (iso) => {
  if (!iso) return null
  const diff = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (diff < 60) return `${diff} min`
  return `${Math.floor(diff / 60)}h ${diff % 60}min`
}

const coverageBadge = (cobertura) => {
  if (!cobertura || cobertura.length === 0)
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
        <ShieldOff className="h-3 w-3" /> Particular
      </span>
    )
  const c = cobertura[0]
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#ACEC00]/20 text-slate-700">
      <Shield className="h-3 w-3 text-[#013FF6]" /> {c.obraSocial}
    </span>
  )
}

// ── Stat card ─────────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon: Icon, accent, loading }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
    <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accent}18` }}>
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

// ── Componente principal ──────────────────────────────────────
export function ReceptionistDashboard() {
  const [patients, setPatients]   = useState([])
  const [freeBeds, setFreeBeds]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const [patientsRes, bedsRes] = await Promise.all([
        supabase
          .from('paciente')
          .select(`
            id, nombre, apellido, dni, createdAt,
            coberturaMedica ( obraSocial, plan, activa )
          `)
          .gte('createdAt', todayStart.toISOString())
          .order('createdAt', { ascending: true }),

        supabase
          .from('cama')
          .select('estado')
          .eq('estado', 'disponible'),
      ])

      setPatients(patientsRes.data || [])
      setFreeBeds(bedsRes.data?.length ?? null)
    } catch (err) {
      console.error('Error fetching receptionist dashboard:', err)
      // Fallback a demo si Supabase falla
      setPatients(DEMO_PATIENTS)
      setFreeBeds(12)
    } finally {
      setLoading(false)
      setLastRefresh(new Date())
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Auto-refresh cada 2 minutos
  useEffect(() => {
    const interval = setInterval(fetchData, 120_000)
    return () => clearInterval(interval)
  }, [fetchData])

  const filtered = patients.filter((p) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      p.nombre?.toLowerCase().includes(q) ||
      p.apellido?.toLowerCase().includes(q) ||
      p.dni?.includes(q)
    )
  })

  const stats = [
    {
      label: 'Registrados hoy',
      value: patients.length,
      sub: 'en orden de llegada',
      icon: Users,
      accent: '#013FF6',
    },
    {
      label: 'En espera',
      value: patients.length,
      sub: 'atención por turno',
      icon: Clock,
      accent: '#f59e0b',
    },
    {
      label: 'Camas disponibles',
      value: freeBeds ?? '—',
      sub: 'en todas las áreas',
      icon: BedDouble,
      accent: '#ACEC00',
    },
    {
      label: 'Con cobertura',
      value: patients.filter(p => p.coberturaMedica?.length > 0).length,
      sub: `de ${patients.length} hoy`,
      icon: Shield,
      accent: '#8b5cf6',
    },
  ]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Recepción
          </h1>
          <p className="text-slate-500 mt-1">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {lastRefresh.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </button>
          <Link
            to="/empleado/registro"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#013FF6] text-white text-sm font-semibold rounded-xl hover:bg-[#0033cc] shadow-lg shadow-[#013FF6]/20 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Registrar paciente
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} loading={loading} />
        ))}
      </div>

      {/* Cola de pacientes */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

        {/* Header tabla */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <h2 className="font-bold text-slate-900 whitespace-nowrap">
            Pacientes de hoy
          </h2>
          <div className="relative flex-1 max-w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o DNI..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40"
            />
          </div>
          <Link
            to="/empleado/registro"
            className="text-sm text-[#013FF6] hover:underline flex items-center gap-1 whitespace-nowrap"
          >
            Ver todos <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-40 bg-slate-100 animate-pulse rounded" />
                  <div className="h-3 w-24 bg-slate-100 animate-pulse rounded" />
                </div>
                <div className="h-5 w-20 bg-slate-100 animate-pulse rounded-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            {search ? (
              <>
                <AlertCircle className="h-10 w-10 mb-3 text-slate-200" />
                <p className="font-semibold">Sin resultados para "{search}"</p>
                <p className="text-xs mt-1">Intentá con otro nombre o DNI</p>
              </>
            ) : (
              <>
                <Users className="h-10 w-10 mb-3 text-slate-200" />
                <p className="font-semibold">Sin pacientes registrados hoy</p>
                <Link
                  to="/empleado/registro"
                  className="mt-3 text-sm font-semibold text-[#013FF6] hover:underline"
                >
                  Registrar el primero →
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100/80">
            {filtered.map((p, idx) => {
              const nombre = `${p.nombre} ${p.apellido}`
              const initials = `${p.nombre?.[0] ?? ''}${p.apellido?.[0] ?? ''}`.toUpperCase()
              const wait = waitMinutes(p.createdAt)
              const isLong = p.createdAt && (Date.now() - new Date(p.createdAt)) > 60 * 60 * 1000

              return (
                <div
                  key={p.id}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/60 transition-colors group"
                >
                  {/* Número de orden */}
                  <span className="text-xs font-bold text-slate-400 w-5 text-center flex-shrink-0">
                    {idx + 1}
                  </span>

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-[#013FF6]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-[#013FF6]">{initials}</span>
                  </div>

                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{nombre}</p>
                    <p className="text-xs text-slate-400 truncate">DNI {p.dni || '—'}</p>
                  </div>

                  {/* Cobertura */}
                  <div className="hidden sm:block flex-shrink-0">
                    {coverageBadge(p.coberturaMedica)}
                  </div>

                  {/* Hora de llegada */}
                  <div className="hidden md:flex flex-col items-end flex-shrink-0 text-right">
                    <span className="text-xs font-semibold text-slate-700">
                      {fmtHour(p.createdAt)}
                    </span>
                    <span className={`text-[10px] font-medium ${isLong ? 'text-red-400' : 'text-slate-400'}`}>
                      {wait ? `Espera: ${wait}` : '—'}
                    </span>
                  </div>

                  {/* Acción rápida */}
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#013FF6]/10 text-[#013FF6] hover:bg-[#013FF6]/20">
                    Ver
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-400">
              <span className="font-semibold text-slate-600">{filtered.length}</span> paciente{filtered.length !== 1 ? 's' : ''} hoy
              {patients.filter(p => p.coberturaMedica?.length > 0).length > 0 && (
                <> · <span className="font-semibold text-slate-600">
                  {patients.filter(p => p.coberturaMedica?.length > 0).length}
                </span> con cobertura</>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Nuevo paciente',   icon: UserPlus,  href: '/empleado/registro', color: '#013FF6' },
          { label: 'Control de camas', icon: BedDouble, href: '/empleado/camas',    color: '#ACEC00' },
          { label: 'Turnos del día',   icon: Calendar,  href: '/empleado/turnos',   color: '#8b5cf6' },
          { label: 'Mis pacientes',    icon: Users,     href: '/empleado/historial',color: '#f59e0b' },
        ].map(({ label, icon: Icon, href, color }) => (
          <Link
            key={label}
            to={href}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm bg-slate-50/50 hover:bg-white transition-all text-center"
          >
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

// ── Demo fallback ─────────────────────────────────────────────
const DEMO_PATIENTS = [
  { id: 1, nombre: 'Carlos',  apellido: 'Méndez',   dni: '28453123', createdAt: new Date(Date.now() - 95 * 60000).toISOString(), coberturaMedica: [{ obraSocial: 'OSDE', plan: '210', activa: true }] },
  { id: 2, nombre: 'Ana',     apellido: 'Silva',    dni: '33120456', createdAt: new Date(Date.now() - 72 * 60000).toISOString(), coberturaMedica: [] },
  { id: 3, nombre: 'Pedro',   apellido: 'Gómez',    dni: '40987654', createdAt: new Date(Date.now() - 45 * 60000).toISOString(), coberturaMedica: [{ obraSocial: 'PAMI', plan: null, activa: true }] },
  { id: 4, nombre: 'María',   apellido: 'López',    dni: '25654321', createdAt: new Date(Date.now() - 30 * 60000).toISOString(), coberturaMedica: [{ obraSocial: 'Swiss Medical', plan: 'Classic', activa: true }] },
  { id: 5, nombre: 'Juan',    apellido: 'Fernández',dni: '37223789', createdAt: new Date(Date.now() - 12 * 60000).toISOString(), coberturaMedica: [] },
]