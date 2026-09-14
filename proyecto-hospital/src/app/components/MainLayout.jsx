import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity, LayoutDashboard, Settings, Search, LogOut,
  User, UserPlus, BedDouble, HeartPulse, FileText, Pill,
  Shield, BarChart2, Calendar, Loader2, Clock, Receipt, CalendarDays,
  ChevronDown, Stethoscope, ClipboardList, Building2, MessageSquare,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { hasAccess } from '../config/employeePermissions.js'
import { getTotalNoLeidos } from '../../services/mensajeriaService'

const ALL_NAV_ITEMS = [
  { name: 'Dashboard',          href: '/empleado',                   icon: LayoutDashboard, route: 'dashboard' },
  { name: 'Triaje y Urgencias', href: '/empleado/triaje',            icon: HeartPulse,      route: 'triaje' },
  { name: 'Control de Camas',   href: '/empleado/camas',             icon: BedDouble,       route: 'camas' },
  { name: 'Historial Clínico',  href: '/empleado/historial',         icon: FileText,        route: 'historial' },
  { name: 'Farmacia',           href: '/empleado/farmacia',          icon: Pill,            route: 'farmacia' },
  { name: 'Registro Pacientes', href: '/empleado/registro',          icon: UserPlus,        route: 'registro' },
  { name: 'Cobertura',          href: '/empleado/cobertura',         icon: UserPlus,        route: 'cobertura' },
  { name: 'Cola de Espera',     href: '/empleado/cola-espera',       icon: Clock,           route: 'cola-espera' },
  { name: 'Facturacion',        href: '/empleado/facturacion',       icon: Receipt,         route: 'facturacion' },
  { name: 'Historial',          href: '/empleado/historial-admin',   icon: FileText,        route: 'historial-admin' },
  { name: 'Gestión Personal',   href: '/empleado/gestion-empleados', icon: Shield,          route: 'gestion-empleados' },
  { name: 'Turnos',             href: '/empleado/turnos',            icon: Calendar,        route: 'turnos' },
  { name: 'Reportes',           href: '/empleado/reportes',          icon: BarChart2,       route: 'reportes' },
  { name: 'Agenda Médica',      href: '/empleado/agenda-medica',     icon: CalendarDays,    route: 'agenda-medica' },
  { name: 'Mensajes',           href: '/empleado/mensajes',          icon: MessageSquare,   route: 'mensajes' },
]

// Agrupamos los ítems en secciones temáticas y colapsables, en vez de una
// lista plana única — así el menú no se siente sobrecargado quienes tienen
// muchos permisos (admin/recepcionista), y roles con pocos ítems (enfermero,
// farmacia) simplemente no muestran las secciones vacías.
const SECTIONS = [
  { key: 'principal', label: null,                icon: null,         routes: ['dashboard', 'mensajes'] },
  { key: 'clinico',   label: 'Clínico',            icon: Stethoscope,  routes: ['triaje', 'camas', 'historial', 'farmacia'] },
  { key: 'pacientes', label: 'Pacientes',          icon: ClipboardList, routes: ['registro', 'cobertura', 'cola-espera', 'facturacion', 'historial-admin'] },
  { key: 'gestion',   label: 'Administración',     icon: Building2,    routes: ['gestion-empleados', 'turnos', 'reportes', 'agenda-medica'] },
]

const ROL_LABELS = {
  administrador: 'Administrador',
  medico:        'Médico',
  enfermero:     'Enfermero/a',
  farmacia:      'Farmacéutico',
  recepcionista: 'Recepcionista',
}

const COLLAPSE_STORAGE_KEY = 'hmspro-sidebar-collapsed-sections'

function loadCollapsedState() {
  try {
    const raw = localStorage.getItem(COLLAPSE_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { session, perfil, loading, signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(loadCollapsedState)
  const [noLeidos, setNoLeidos] = useState(0)

  useEffect(() => {
    if (!loading && !session) {
      navigate('/empleado-login', { replace: true })
    }
  }, [session, loading, navigate])

  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(collapsed)) } catch { /* noop */ }
  }, [collapsed])

  // Contador de mensajes sin leer para el badge del ítem "Mensajes".
  // Se refresca al entrar/salir de la pantalla de Mensajes y cada 30s.
  useEffect(() => {
    if (!perfil?.id) return
    let activo = true

    const fetchNoLeidos = async () => {
      try {
        const total = await getTotalNoLeidos(perfil.id)
        if (activo) setNoLeidos(total)
      } catch { /* noop */ }
    }

    fetchNoLeidos()
    const interval = setInterval(fetchNoLeidos, 30_000)
    return () => { activo = false; clearInterval(interval) }
  }, [perfil?.id, location.pathname])

  if (loading || !perfil) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-[#013FF6]" />
          <p className="text-sm font-medium">Cargando sistema...</p>
        </div>
      </div>
    )
  }

  const visibleItems = ALL_NAV_ITEMS
    .filter(item => hasAccess(perfil.rol, item.route))
    .map(item => item.route === 'mensajes' && noLeidos > 0
      ? { ...item, alert: noLeidos > 9 ? '9+' : noLeidos }
      : item)
  const visibleByRoute = Object.fromEntries(visibleItems.map(i => [i.route, i]))

  const sections = SECTIONS
    .map(section => ({ ...section, items: section.routes.map(r => visibleByRoute[r]).filter(Boolean) }))
    .filter(section => section.items.length > 0)

  const initials = `${perfil.nombre?.[0] || ''}${perfil.apellido?.[0] || ''}`.toUpperCase() || 'U'

  const handleLogout = async () => {
    await signOut()
    navigate('/')
  }

  const toggleSection = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))

  const NavLink = ({ item }) => {
    const isActive =
      location.pathname === item.href ||
      (item.href !== '/empleado' && location.pathname.startsWith(item.href + '/'))
    const Icon = item.icon

    return (
      <Link
        to={item.href}
        className={`flex items-center px-3 py-2.5 rounded-xl text-sm transition-all group
          ${isActive
            ? 'bg-[#ACEC00] text-[#013FF6] font-bold shadow-sm'
            : 'text-white/75 font-medium hover:bg-white/10 hover:text-white'}`}
      >
        <Icon
          className={`mr-3 flex-shrink-0 transition-colors ${isActive ? 'text-[#013FF6]' : 'text-white/60 group-hover:text-white'}`}
          style={{ width: '1.05rem', height: '1.05rem' }}
        />
        <span className="flex-1 leading-tight truncate">{item.name}</span>
        {item.alert && (
          <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
            {item.alert}
          </span>
        )}
      </Link>
    )
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans">

      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-[#013FF6] flex flex-col shadow-xl z-20">

        {/* Logo */}
        <div className="h-14 flex-shrink-0 flex items-center px-5 border-b border-white/10">
          <div className="h-7 w-7 bg-[#ACEC00] rounded-lg flex items-center justify-center mr-2.5 shadow-sm flex-shrink-0">
            <Activity className="h-4 w-4 text-[#013FF6]" strokeWidth={3} />
          </div>
          <span className="font-black text-lg tracking-tight text-white">
            HMS<span className="text-[#ACEC00]">Pro</span>
          </span>
        </div>

        {/* Nav — agrupado y con scroll propio */}
        <div className="relative flex-1 min-h-0">
          <div className="sidebar-scroll h-full overflow-y-auto py-4 px-3 space-y-4">
            {sections.map(section => {
              const isCollapsed = !!collapsed[section.key]
              return (
                <div key={section.key}>
                  {section.label && (
                    <button
                      onClick={() => toggleSection(section.key)}
                      className="w-full flex items-center gap-1.5 px-3 py-1.5 mb-0.5 text-white/40 hover:text-white/70 transition-colors"
                    >
                      {section.icon && <section.icon className="h-3 w-3 flex-shrink-0" />}
                      <span className="text-[10px] font-bold uppercase tracking-widest flex-1 text-left">
                        {section.label}
                      </span>
                      <ChevronDown className={`h-3 w-3 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                    </button>
                  )}
                  {!isCollapsed && (
                    <div className="space-y-0.5">
                      {section.items.map(item => <NavLink key={item.route} item={item} />)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {/* Fade sutil al pie del nav para indicar que hay más contenido al scrollear */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[#013FF6] to-transparent" />
        </div>

        {/* Footer usuario */}
        <div className="flex-shrink-0 p-3 border-t border-white/10">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-[#ACEC00] flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-black text-[#013FF6]">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">
                {perfil.nombre} {perfil.apellido}
              </p>
              <p className="text-[10px] text-white/40 truncate">
                {ROL_LABELS[perfil.rol] || perfil.rol}
              </p>
            </div>
            <Link to="/empleado/ajustes" title="Configuración" className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0">
              <Settings className="h-3.5 w-3.5" />
            </Link>
            <button onClick={handleLogout} title="Salir" className="p-1.5 rounded-lg text-white/40 hover:text-red-300 hover:bg-white/10 transition-colors flex-shrink-0">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <header className="h-14 flex-shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10 shadow-sm">
          <div className="flex-1 flex items-center">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                placeholder="Buscar pacientes, camas, personal..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40"
              />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>

      </div>
    </div>
  )
}