import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabaseClient'
import {
  UserPlus, Clock, RefreshCw, ChevronRight,
  CheckCircle2, AlertCircle, Shield, ShieldOff, Search,
  Calendar, Users, X, Phone, User,
  Activity,
} from 'lucide-react'

const fmtHour = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '—'

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

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

// ── Helper: obtener la guardia activa de HOY ──────────────────
function getGuardiaActivaHoy(guardias, todayStr) {
  if (!guardias?.length) return null
  return guardias
    .filter(g =>
      ['en_espera', 'en_atencion'].includes(g.estado) &&
      // la guardia fue creada hoy (ingresoAt o createdAt comienza con la fecha de hoy)
      (g.ingresoAt || g.createdAt || '').startsWith(todayStr)
    )
    .sort((a, b) =>
      new Date(b.ingresoAt ?? b.createdAt) - new Date(a.ingresoAt ?? a.createdAt)
    )[0] ?? null
}

// ── Modal paciente ─────────────────────────────────────────────
function ModalPaciente({ paciente, onClose, todayStr }) {
  const initials = `${paciente.nombre?.[0] ?? ''}${paciente.apellido?.[0] ?? ''}`.toUpperCase()
  const wait = waitMinutes(paciente.createdAt)
  const isLong = paciente.createdAt && (Date.now() - new Date(paciente.createdAt)) > 60 * 60 * 1000
  const cobertura = paciente.coberturaMedica?.[0]
  const guardias = paciente.guardia || []

  const GUARDIA_ESTADO = {
    en_espera:   { label: 'En espera',   color: '#92400e', bg: '#fef3c7' },
    en_atencion: { label: 'En atención', color: '#013FF6', bg: '#dbeafe' },
    atendido:    { label: 'Atendido',    color: '#059669', bg: '#d1fae5' },
    derivado:    { label: 'Derivado',    color: '#5b21b6', bg: '#ede9fe' },
    alta:        { label: 'Alta',        color: '#059669', bg: '#d1fae5' },
  }

  const guardiaActiva = getGuardiaActivaHoy(guardias, todayStr)

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#013FF6]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-[#013FF6]">{initials}</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {paciente.nombre} {paciente.apellido}
              </h2>
              <p className="text-sm text-slate-400">DNI {paciente.dni || '—'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Estado actual de guardia */}
          {guardiaActiva && (() => {
            const est = GUARDIA_ESTADO[guardiaActiva.estado]
            return (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm"
                style={{ backgroundColor: est.bg, color: est.color }}
              >
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span>{est.label}</span>
                {guardiaActiva.ingresoAt && (
                  <span className="ml-auto text-xs font-medium opacity-70">
                    desde {fmtHour(guardiaActiva.ingresoAt)}
                  </span>
                )}
              </div>
            )
          })()}

          {/* Sin guardia hoy */}
          {!guardiaActiva && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 text-slate-500 text-sm font-medium">
              <Clock className="h-4 w-4 flex-shrink-0" />
              Sin guardia activa hoy
            </div>
          )}

          {/* Datos personales */}
          <section>
            <h3 className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              <User className="h-3.5 w-3.5" /> Datos personales
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Nombre completo</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{paciente.nombre} {paciente.apellido}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">DNI</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{paciente.dni || '—'}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Fecha de nacimiento</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{fmtDate(paciente.fechaNacimiento)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Registrado</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{fmtDate(paciente.createdAt)}</p>
              </div>
            </div>
          </section>

          {/* Tiempo de espera */}
          <section>
            <h3 className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              <Clock className="h-3.5 w-3.5" /> Llegada y espera
            </h3>
            <div className="flex gap-3">
              <div className="flex-1 bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Hora de llegada</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{fmtHour(paciente.createdAt)}</p>
              </div>
              <div className={`flex-1 rounded-xl p-3 ${isLong ? 'bg-red-50' : 'bg-slate-50'}`}>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tiempo en espera</p>
                <p className={`text-sm font-semibold mt-0.5 ${isLong ? 'text-red-500' : 'text-slate-800'}`}>
                  {wait || '—'}{isLong && ' ⚠️'}
                </p>
              </div>
            </div>
          </section>

          {/* Cobertura */}
          <section>
            <h3 className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              <Shield className="h-3.5 w-3.5" /> Cobertura médica
            </h3>
            {cobertura ? (
              <div className="bg-[#ACEC00]/10 border border-[#ACEC00]/30 rounded-xl p-3 space-y-1">
                <p className="text-sm font-bold text-slate-800">{cobertura.obraSocial}</p>
                {cobertura.numeroAfiliado && (
                  <p className="text-xs text-slate-500">N° afiliado: {cobertura.numeroAfiliado}</p>
                )}
                <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  cobertura.estadoCobertura === 'cubre'
                    ? 'bg-green-100 text-green-700'
                    : cobertura.estadoCobertura === 'no_cubre'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {cobertura.estadoCobertura === 'cubre'
                    ? 'Cubre'
                    : cobertura.estadoCobertura === 'no_cubre'
                    ? 'No cubre'
                    : 'Por verificar'}
                </span>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2 text-slate-500">
                <ShieldOff className="h-4 w-4" />
                <span className="text-sm font-medium">Particular — sin cobertura</span>
              </div>
            )}
          </section>

          {/* Contacto de emergencia */}
          <section>
            <h3 className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              <Phone className="h-3.5 w-3.5" /> Contacto de emergencia
            </h3>
            {paciente.contactoEmergenciaNombre || paciente.contactoEmergenciaTelefono ? (
              <div className="bg-slate-50 rounded-xl p-3 space-y-1">
                {paciente.contactoEmergenciaNombre && (
                  <p className="text-sm font-semibold text-slate-800">{paciente.contactoEmergenciaNombre}</p>
                )}
                {paciente.contactoEmergenciaTelefono && (
                  <a
                    href={`tel:${paciente.contactoEmergenciaTelefono}`}
                    className="text-sm text-[#013FF6] font-medium hover:underline"
                  >
                    {paciente.contactoEmergenciaTelefono}
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400 bg-slate-50 rounded-xl p-3">Sin contacto registrado</p>
            )}
          </section>

          {/* Historial de guardias */}
          <section>
            <h3 className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              <Activity className="h-3.5 w-3.5" /> Guardias
            </h3>
            {guardias.length === 0 ? (
              <p className="text-sm text-slate-400 bg-slate-50 rounded-xl p-3">Sin guardias registradas</p>
            ) : (
              <div className="space-y-2">
                {guardias
                  .slice()
                  .sort((a, b) => new Date(b.ingresoAt ?? b.createdAt) - new Date(a.ingresoAt ?? a.createdAt))
                  .map(g => {
                    const est = GUARDIA_ESTADO[g.estado] ?? GUARDIA_ESTADO.en_espera
                    return (
                      <div key={g.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
                        <div>
                          <p className="text-xs font-semibold text-slate-700">
                            {fmtDate(g.ingresoAt ?? g.createdAt)}
                          </p>
                          {g.motivo && (
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{g.motivo}</p>
                          )}
                        </div>
                        <span
                          className="text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0"
                          style={{ backgroundColor: est.bg, color: est.color }}
                        >
                          {est.label}
                        </span>
                      </div>
                    )
                  })}
              </div>
            )}
          </section>

        </div>

        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
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
  const [patients, setPatients]               = useState([])
  const [turnosHoy, setTurnosHoy]             = useState([])
  const [loading, setLoading]                 = useState(true)
  const [search, setSearch]                   = useState('')
  const [lastRefresh, setLastRefresh]         = useState(new Date())
  const [selectedPatient, setSelectedPatient] = useState(null)

  // String de fecha de hoy en formato "YYYY-MM-DD" para comparar con ISO timestamps
  const todayStr = new Date().toISOString().split('T')[0]

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const [patientsRes, turnosRes] = await Promise.all([
        supabase
          .from('paciente')
          .select(`
            id, nombre, apellido, dni, "fechaNacimiento",
            "contactoEmergenciaNombre", "contactoEmergenciaTelefono", "createdAt",
            "coberturaMedica" ( "obraSocial", "numeroAfiliado", "estadoCobertura" ),
            guardia ( id, estado, "ingresoAt", "createdAt" )
          `)
          .gte('"createdAt"', todayStart.toISOString())
          .order('"createdAt"', { ascending: true }),

        supabase
          .from('turno')
          .select('id, estado')
          .eq('fecha', todayStr)
          .neq('estado', 'cancelado'),
      ])

      setPatients(patientsRes.data || [])
      setTurnosHoy(turnosRes.data || [])
    } catch (err) {
      console.error('Error fetching receptionist dashboard:', err)
      setPatients([])
      setTurnosHoy([])
    } finally {
      setLoading(false)
      setLastRefresh(new Date())
    }
  }, [todayStr])

  useEffect(() => { fetchData() }, [fetchData])

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

  // Contar pacientes con guardia activa HOY (en_espera o en_atencion)
  const enEspera = patients.filter(p =>
    getGuardiaActivaHoy(p.guardia, todayStr) !== null
  ).length

  const conCobertura = patients.filter(p => p.coberturaMedica?.length > 0).length

  const stats = [
    { label: 'Registrados hoy', value: patients.length,        sub: 'desde las 00:00',         icon: Users,    accent: '#013FF6' },
    { label: 'En guardia',      value: enEspera,                sub: 'en espera o en atención', icon: Clock,    accent: '#f59e0b' },
    { label: 'Turnos hoy',      value: turnosHoy.length,        sub: 'consultas programadas',   icon: Calendar, accent: '#ACEC00' },
    { label: 'Con cobertura',   value: conCobertura,            sub: `de ${patients.length} hoy`, icon: Shield, accent: '#8b5cf6' },
  ]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Recepción</h1>
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
        {stats.map((s) => <StatCard key={s.label} {...s} loading={loading} />)}
      </div>

      {/* Cola de pacientes */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <h2 className="font-bold text-slate-900 whitespace-nowrap">Pacientes de hoy</h2>
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
                <Link to="/empleado/registro" className="mt-3 text-sm font-semibold text-[#013FF6] hover:underline">
                  Registrar el primero →
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100/80">
            {filtered.map((p, idx) => {
              const nombre   = `${p.nombre} ${p.apellido}`
              const initials = `${p.nombre?.[0] ?? ''}${p.apellido?.[0] ?? ''}`.toUpperCase()
              const wait     = waitMinutes(p.createdAt)
              const isLong   = p.createdAt && (Date.now() - new Date(p.createdAt)) > 60 * 60 * 1000

              // Solo considerar guardia activa de hoy
              const guardiaActiva = getGuardiaActivaHoy(p.guardia, todayStr)

              const ESTADO_PILL = {
                en_espera:   { label: 'En espera',   bg: '#fef3c7', color: '#92400e' },
                en_atencion: { label: 'En atención', bg: '#dbeafe', color: '#1e40af' },
              }
              const pill = guardiaActiva ? ESTADO_PILL[guardiaActiva.estado] : null

              return (
                <div
                  key={p.id}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/60 transition-colors group"
                >
                  <span className="text-xs font-bold text-slate-400 w-5 text-center flex-shrink-0">{idx + 1}</span>
                  <div className="w-9 h-9 rounded-full bg-[#013FF6]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-[#013FF6]">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{nombre}</p>
                    <p className="text-xs text-slate-400 truncate">DNI {p.dni || '—'}</p>
                  </div>
                  <div className="hidden sm:block flex-shrink-0">
                    {coverageBadge(p.coberturaMedica)}
                  </div>

                  {/* Pill de estado: si tiene guardia activa hoy la muestra, si no muestra "Sin guardia" */}
                  {pill ? (
                    <span
                      className="hidden md:inline-flex text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                      style={{ backgroundColor: pill.bg, color: pill.color }}
                    >
                      {pill.label}
                    </span>
                  ) : (
                    <span className="hidden md:inline-flex text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 bg-slate-100 text-slate-400">
                      Sin guardia
                    </span>
                  )}

                  <div className="hidden md:flex flex-col items-end flex-shrink-0 text-right">
                    <span className="text-xs font-semibold text-slate-700">{fmtHour(p.createdAt)}</span>
                    <span className={`text-[10px] font-medium ${isLong ? 'text-red-400' : 'text-slate-400'}`}>
                      {wait ? `Espera: ${wait}` : '—'}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedPatient(p)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#013FF6]/10 text-[#013FF6] hover:bg-[#013FF6]/20"
                  >
                    Ver
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-400">
              <span className="font-semibold text-slate-600">{filtered.length}</span> paciente{filtered.length !== 1 ? 's' : ''} hoy
              {enEspera > 0 && (
                <> · <span className="font-semibold text-amber-600">{enEspera} en guardia</span></>
              )}
              {conCobertura > 0 && (
                <> · <span className="font-semibold text-slate-600">{conCobertura}</span> con cobertura</>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Nuevo paciente',       icon: UserPlus,  href: '/empleado/registro',    color: '#013FF6' },
          { label: 'Turnos del día',       icon: Calendar,  href: '/empleado/turnos',       color: '#ACEC00' },
          { label: 'Cola de espera',       icon: Users,     href: '/empleado/cola-espera',  color: '#f59e0b' },
          { label: 'Verificar coberturas', icon: Shield,    href: '/empleado/cobertura',    color: '#8b5cf6' },
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

      {/* Modal */}
      {selectedPatient && (
        <ModalPaciente
          paciente={selectedPatient}
          onClose={() => setSelectedPatient(null)}
          todayStr={todayStr}
        />
      )}
    </div>
  )
}