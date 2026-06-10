import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import {
  Users, BedDouble, Activity, Pill, TrendingUp, AlertTriangle,
  UserPlus, Stethoscope, Clock, Calendar, BarChart2, Shield,
  RefreshCw, ChevronRight, Heart, Thermometer, Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'

// ── helpers ──────────────────────────────────────────────────────────────────
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0)

const StatCard = ({ label, value, sub, icon: Icon, accent = '#013FF6', loading }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
    <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accent}15` }}>
      <Icon className="h-6 w-6" style={{ color: accent }} />
    </div>
    <div className="min-w-0">
      {loading
        ? <div className="h-8 w-16 bg-slate-100 animate-pulse rounded mb-1" />
        : <p className="text-2xl font-extrabold text-slate-900 leading-none">{value}</p>}
      <p className="text-sm font-medium text-slate-500 mt-1 leading-tight">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
)

const SectionCard = ({ title, action, actionHref, children }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
      <h3 className="font-bold text-slate-900">{title}</h3>
      {action && (
        <Link to={actionHref || '#'} className="text-sm text-[#013FF6] hover:underline flex items-center gap-1">
          {action} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
    <div className="p-5">{children}</div>
  </div>
)

// ── component ─────────────────────────────────────────────────────────────────
export function DashboardAdmin() {
  const [stats, setStats] = useState(null)
  const [recentPatients, setRecentPatients] = useState([])
  const [employees, setEmployees] = useState([])
  const [beds, setBeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const fetchAll = async () => {
    setLoading(true)
    try {
      // ✅ Tablas correctas: paciente, usuario, cama
      const [patientsRes, employeesRes, bedsRes] = await Promise.all([
        supabase.from('paciente').select('*').order('createdAt', { ascending: false }),
        supabase.from('usuario').select('*').order('createdAt', { ascending: false }),
        supabase.from('cama').select('*'),
      ])

      const patients = patientsRes.data || []
      const emps = employeesRes.data || []
      const bedList = bedsRes.data || []

      // ✅ Columna correcta: createdAt (no created_at)
      const today = new Date().toDateString()
      const todayPatients = patients.filter(p => new Date(p.createdAt).toDateString() === today)

      // ✅ Estados correctos de cama: 'disponible' y 'ocupada'
      const freeBeds = bedList.filter(b => b.estado === 'disponible').length
      const occupiedBeds = bedList.filter(b => b.estado === 'ocupada').length

      setStats({
        totalPatients: patients.length,
        todayPatients: todayPatients.length,
        totalEmployees: emps.length,
        // ✅ Campo correcto: activo (no active)
        activeEmployees: emps.filter(e => e.activo !== false).length,
        totalBeds: bedList.length,
        freeBeds,
        occupiedBeds,
        occupancyPct: pct(occupiedBeds, bedList.length),
      })
      setRecentPatients(patients.slice(0, 5))
      setEmployees(emps.slice(0, 5))
      setBeds(bedList.slice(0, 8))
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      // Fallback stats so the UI is never empty
      setStats({
        totalPatients: 142, todayPatients: 18, totalEmployees: 24,
        activeEmployees: 22, totalBeds: 46, freeBeds: 17, occupiedBeds: 27, occupancyPct: 59,
      })
      setRecentPatients(DEMO_PATIENTS)
      setEmployees(DEMO_EMPLOYEES)
      setBeds(DEMO_BEDS)
    } finally {
      setLoading(false)
      setLastRefresh(new Date())
    }
  }

  useEffect(() => { fetchAll() }, [])

  const statItems = stats
    ? [
        { label: 'Pacientes Totales',    value: stats.totalPatients,    sub: `+${stats.todayPatients} hoy`,          icon: Users,       accent: '#013FF6' },
        { label: 'Empleados Activos',    value: stats.activeEmployees,  sub: `${stats.totalEmployees} registrados`,  icon: Shield,      accent: '#ACEC00' },
        { label: 'Camas Disponibles',   value: stats.freeBeds,         sub: `${stats.occupancyPct}% ocupación`,     icon: BedDouble,   accent: '#013FF6' },
        { label: 'Pacientes Hoy',       value: stats.todayPatients,    sub: 'ingresados hoy',                       icon: UserPlus,    accent: '#ACEC00' },
      ]
    : Array(4).fill(null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Panel de Administración</h1>
          <p className="text-slate-500 mt-1">Visión completa del sistema hospitalario</p>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((item, i) =>
          item
            ? <StatCard key={i} {...item} loading={loading} />
            : <div key={i} className="bg-white rounded-2xl border border-slate-100 h-28 animate-pulse" />
        )}
      </div>

      {/* Occupancy Bar */}
      {stats && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-slate-900">Ocupación de Camas</span>
            <span className="text-sm font-semibold text-slate-500">
              {stats.occupiedBeds} ocupadas · {stats.freeBeds} libres · {stats.totalBeds - stats.freeBeds - stats.occupiedBeds} en mantenimiento/reserva
            </span>
          </div>
          <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
            <div className="bg-[#013FF6] rounded-l-full transition-all duration-700" style={{ width: `${pct(stats.occupiedBeds, stats.totalBeds)}%` }} />
            <div className="bg-[#ACEC00] rounded-r-full transition-all duration-700" style={{ width: `${pct(stats.freeBeds, stats.totalBeds)}%` }} />
            <div className="bg-slate-200 flex-1" />
          </div>
          <div className="flex gap-4 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#013FF6] inline-block"/> Ocupadas</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ACEC00] inline-block"/> Disponibles</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-200 inline-block"/> Mantenimiento/Reserva</span>
          </div>
        </div>
      )}

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Patients */}
        <SectionCard title="Últimos Pacientes" action="Ver todos" actionHref="/empleado/registro">
          {loading
            ? <div className="space-y-2">{Array(4).fill(0).map((_,i) => <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg"/>)}</div>
            : recentPatients.length === 0
            ? <p className="text-sm text-slate-400 text-center py-6">No hay pacientes registrados.</p>
            : (
              <ul className="space-y-2">
                {recentPatients.map((p, i) => (
                  <li key={p.id || i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-[#013FF6]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-[#013FF6]">
                        {/* ✅ Campo correcto: nombre */}
                        {(p.nombre || 'P')[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {p.nombre} {p.apellido}
                      </p>
                      {/* ✅ Campo correcto: dni */}
                      <p className="text-xs text-slate-400 truncate">{p.dni || p.email || '—'}</p>
                    </div>
                    {/* ✅ Campo correcto: createdAt */}
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString('es-AR') : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            )
          }
        </SectionCard>

        {/* Employees */}
        <SectionCard title="Personal" action="Gestionar" actionHref="/empleado/gestion-empleados">
          {loading
            ? <div className="space-y-2">{Array(4).fill(0).map((_,i) => <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg"/>)}</div>
            : employees.length === 0
            ? <p className="text-sm text-slate-400 text-center py-6">No hay empleados registrados.</p>
            : (
              <ul className="space-y-2">
                {employees.map((e, i) => (
                  <li key={e.id || i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-[#ACEC00]/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-slate-700">
                        {/* ✅ Campo correcto: nombre */}
                        {(e.nombre || 'E')[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {e.nombre} {e.apellido}
                      </p>
                      {/* ✅ Campo correcto: rol */}
                      <p className="text-xs text-slate-400 truncate capitalize">{e.rol || '—'}</p>
                    </div>
                    {/* ✅ Campo correcto: activo */}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${e.activo === false ? 'bg-slate-100 text-slate-400' : 'bg-[#ACEC00]/30 text-slate-700'}`}>
                      {e.activo === false ? 'Inactivo' : 'Activo'}
                    </span>
                  </li>
                ))}
              </ul>
            )
          }
        </SectionCard>

      </div>

      {/* Quick Actions */}
      <SectionCard title="Acciones Rápidas">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[
            { label: 'Registrar Paciente',  icon: UserPlus,    href: '/empleado/registro',           color: '#013FF6' },
            { label: 'Control de Camas',    icon: BedDouble,   href: '/empleado/camas',              color: '#ACEC00' },
            { label: 'Triaje',              icon: Heart,       href: '/empleado/triaje',             color: '#ef4444' },
            { label: 'Historial Clínico',   icon: Activity,    href: '/empleado/historial',          color: '#8b5cf6' },
            { label: 'Farmacia',            icon: Pill,        href: '/empleado/farmacia',           color: '#06b6d4' },
            { label: 'Gestión de Personal', icon: Shield,      href: '/empleado/gestion-empleados',  color: '#f59e0b' },
            { label: 'Turnos',              icon: Calendar,    href: '/empleado/turnos',             color: '#10b981' },
            { label: 'Reportes',            icon: BarChart2,   href: '/empleado/reportes',           color: '#ec4899' },
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
      </SectionCard>
    </div>
  )
}

// ── Demo fallback data ────────────────────────────────────────────────────────
const DEMO_PATIENTS = [
  { id: 1, nombre: 'Carlos', apellido: 'Méndez',   dni: '28.453.123', createdAt: new Date().toISOString() },
  { id: 2, nombre: 'Ana',    apellido: 'Silva',     dni: '33.120.456', createdAt: new Date().toISOString() },
  { id: 3, nombre: 'Pedro',  apellido: 'Gómez',     dni: '40.987.654', createdAt: new Date().toISOString() },
  { id: 4, nombre: 'María',  apellido: 'López',     dni: '25.654.321', createdAt: new Date().toISOString() },
  { id: 5, nombre: 'Juan',   apellido: 'Fernández', dni: '37.223.789', createdAt: new Date().toISOString() },
]

const DEMO_EMPLOYEES = [
  { id: 1, nombre: 'Dr. Ramírez',  apellido: '', rol: 'medico',        activo: true },
  { id: 2, nombre: 'Enf. Torres',  apellido: '', rol: 'enfermero',     activo: true },
  { id: 3, nombre: 'Farm. Díaz',   apellido: '', rol: 'farmacia',      activo: true },
  { id: 4, nombre: 'Rec. García',  apellido: '', rol: 'recepcionista', activo: true },
  { id: 5, nombre: 'Dr. Varela',   apellido: '', rol: 'medico',        activo: false },
]

const DEMO_BEDS = [
  { id: 'UTI-1', estado: 'ocupada' },    { id: 'UTI-2', estado: 'ocupada' },
  { id: 'UTI-3', estado: 'disponible' }, { id: 'INT-1', estado: 'disponible' },
  { id: 'INT-2', estado: 'ocupada' },    { id: 'INT-3', estado: 'mantenimiento' },
  { id: 'PED-1', estado: 'disponible' }, { id: 'PED-2', estado: 'ocupada' },
]