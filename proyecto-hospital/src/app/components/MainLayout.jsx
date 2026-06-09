import { useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity, LayoutDashboard, Settings, Bell, Search, LogOut,
  User, UserPlus, BedDouble, HeartPulse, FileText, Pill,
  Shield, BarChart2, Calendar, Loader2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { hasAccess } from '../config/employeePermissions.js'

const ALL_NAV_ITEMS = [
  { name: 'Dashboard',          href: '/empleado',                   icon: LayoutDashboard, route: 'dashboard',         section: 'main'  },
  { name: 'Triaje y Urgencias', href: '/empleado/triaje',            icon: HeartPulse,      route: 'triaje',            section: 'main'},
  { name: 'Registro Pacientes', href: '/empleado/registro',          icon: UserPlus,        route: 'registro',          section: 'main'  },
  { name: 'Control de Camas',   href: '/empleado/camas',             icon: BedDouble,       route: 'camas',             section: 'main'  },
  { name: 'Historial Clínico',  href: '/empleado/historial',         icon: FileText,        route: 'historial',         section: 'main'  },
  { name: 'Farmacia',           href: '/empleado/farmacia',          icon: Pill,            route: 'farmacia',          section: 'main'  },
  // Admin-only
  { name: 'Gestión Personal',   href: '/empleado/gestion-empleados', icon: Shield,          route: 'gestion-empleados', section: 'admin' },
  { name: 'Turnos',             href: '/empleado/turnos',            icon: Calendar,        route: 'turnos',            section: 'admin' },
  { name: 'Reportes',           href: '/empleado/reportes',          icon: BarChart2,       route: 'reportes',          section: 'admin' },
]

const ROL_LABELS = {
  administrador: 'Administrador',
  medico:        'Médico',
  enfermero:     'Enfermero/a',
  farmacia:      'Farmacéutico',
  recepcionista: 'Recepcionista',
}

export function MainLayout() {
  const location             = useLocation()
  const navigate             = useNavigate()
  const { session, perfil, loading, signOut } = useAuth()

  // Redirigir si no hay sesión
  useEffect(() => {
    if (!loading && !session) {
      navigate('/empleado-login', { replace: true })
    }
  }, [session, loading, navigate])

  // Pantalla de carga mientras resuelve la sesión
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

  const navItems   = ALL_NAV_ITEMS.filter(item => hasAccess(perfil.rol, item.route))
  const mainItems  = navItems.filter(i => i.section === 'main')
  const adminItems = navItems.filter(i => i.section === 'admin')

  const handleLogout = async () => {
    await signOut()
    navigate('/')
  }

  const NavLink = ({ item }) => {
    const isActive =
      location.pathname === item.href ||
      (item.href !== '/empleado' && location.pathname.startsWith(item.href))
    const Icon = item.icon

    return (
      <Link
        to={item.href}
        className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group
          ${isActive
            ? 'bg-[#ACEC00] text-[#013FF6] shadow-sm'
            : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
      >
        <Icon
          className={`mr-3 flex-shrink-0 transition-colors ${isActive ? 'text-[#013FF6]' : 'text-white/70 group-hover:text-white'}`}
          style={{ width: '1.1rem', height: '1.1rem' }}
        />
        <span className="flex-1 leading-tight">{item.name}</span>
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
        <div className="h-14 flex items-center px-5 border-b border-white/10">
          <div className="h-7 w-7 bg-[#ACEC00] rounded-lg flex items-center justify-center mr-2.5 shadow-sm flex-shrink-0">
            <Activity className="h-4 w-4 text-[#013FF6]" strokeWidth={3} />
          </div>
          <span className="font-black text-lg tracking-tight text-white">
            HMS<span className="text-[#ACEC00]">Pro</span>
          </span>
        </div>

        {/* Nav */}
        <div className="flex-1 py-4 px-3 overflow-y-auto space-y-0.5">
          {mainItems.map(item => <NavLink key={item.route} item={item} />)}

          {adminItems.length > 0 && (
            <>
              <div className="pt-4 pb-1.5 px-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                  Administración
                </p>
              </div>
              {adminItems.map(item => <NavLink key={item.route} item={item} />)}
            </>
          )}
        </div>

        {/* Footer usuario */}
        <div className="p-3 border-t border-white/10 space-y-0.5">
          <div className="px-3 py-2">
            <p className="text-xs font-semibold text-white/90 truncate">
              {perfil.nombre} {perfil.apellido}
            </p>
            <p className="text-[10px] text-white/40">
              {ROL_LABELS[perfil.rol] || perfil.rol}
            </p>
          </div>
          <Link
            to="/empleado/perfil"
            className="flex items-center px-3 py-2 text-xs font-medium text-white/60 rounded-lg hover:bg-white/10 transition-colors"
          >
            <User className="h-3.5 w-3.5 mr-2 text-white/40" />
            Mi Perfil
          </Link>
          <Link
            to="/empleado/ajustes"
            className="flex items-center px-3 py-2 text-xs font-medium text-white/60 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Settings className="h-3.5 w-3.5 mr-2 text-white/40" />
            Configuración
          </Link>
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
          <div className="flex items-center space-x-4">
            <button className="relative p-2 text-slate-400 hover:bg-slate-100 hover:text-[#013FF6] rounded-xl transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border-2 border-white" />
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <button
              onClick={handleLogout}
              className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors gap-1.5"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </button>
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