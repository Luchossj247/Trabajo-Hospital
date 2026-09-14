import { useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Activity, FileText, Calendar, FlaskConical, LogOut, User } from 'lucide-react'
import { usePacienteAuth } from '../context/PacienteAuthContext'

const NAV_ITEMS = [
  { name: 'Mi Historial',   href: '/paciente/historial',  icon: FileText },
  { name: 'Mis Turnos',     href: '/paciente/turnos',     icon: Calendar },
  { name: 'Mis Resultados', href: '/paciente/resultados', icon: FlaskConical },
]

export function PacienteLayout() {
  const { paciente, logout } = usePacienteAuth()
  const location = useLocation()
  const navigate  = useNavigate()

  // Sin "sesión" de paciente → al login del portal
  useEffect(() => {
    if (!paciente) navigate('/paciente-login', { replace: true })
  }, [paciente, navigate])

  if (!paciente) return null

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const initials = `${paciente.nombre?.[0] || ''}${paciente.apellido?.[0] || ''}`.toUpperCase() || 'P'

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans">

      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-[#013FF6] flex flex-col shadow-xl z-20">
        <div className="h-14 flex-shrink-0 flex items-center px-5 border-b border-white/10">
          <div className="h-7 w-7 bg-[#ACEC00] rounded-lg flex items-center justify-center mr-2.5 shadow-sm flex-shrink-0">
            <Activity className="h-4 w-4 text-[#013FF6]" strokeWidth={3} />
          </div>
          <span className="font-black text-lg tracking-tight text-white">
            HMS<span className="text-[#ACEC00]">Pro</span>
          </span>
        </div>

        <div className="flex-1 py-4 px-3 space-y-0.5">
          {NAV_ITEMS.map(item => {
            const isActive = location.pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center px-3 py-2.5 rounded-xl text-sm transition-all group
                  ${isActive ? 'bg-[#ACEC00] text-[#013FF6] font-bold shadow-sm' : 'text-white/75 font-medium hover:bg-white/10 hover:text-white'}`}
              >
                <Icon className={`mr-3 h-4 w-4 flex-shrink-0 ${isActive ? 'text-[#013FF6]' : 'text-white/60 group-hover:text-white'}`} />
                {item.name}
              </Link>
            )
          })}
        </div>

        <div className="flex-shrink-0 p-3 border-t border-white/10">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-[#ACEC00] flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-black text-[#013FF6]">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{paciente.nombre} {paciente.apellido}</p>
              <p className="text-[10px] text-white/40 truncate">DNI {paciente.dni}</p>
            </div>
            <button onClick={handleLogout} title="Salir" className="p-1.5 rounded-lg text-white/40 hover:text-red-300 hover:bg-white/10 transition-colors flex-shrink-0">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex-shrink-0 bg-white border-b border-slate-200 flex items-center px-6 z-10 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
            <User className="h-4 w-4" /> Portal del Paciente
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}