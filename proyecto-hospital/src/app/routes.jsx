import { createBrowserRouter, Navigate } from 'react-router-dom'
import { MainLayout } from './components/MainLayout.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'
import { TipoUsuario } from './pages/TipoUsuario.jsx'
import { LoginEmpleado } from './pages/LoginEmpleado.jsx'
import { useAuth } from './context/AuthContext.jsx'

// Dashboards
import { DashboardAdmin } from './pages/dashboards/DashboardAdmin.jsx'
import { ReceptionistDashboard } from './pages/dashboards/ReceptionistDashboard.jsx'

// Pages
import { RegistroPaciente } from './pages/RegistroPaciente.jsx'
import { ControlCamas } from './pages/ControlCamas.jsx'
import { GestionEmpleados } from './pages/GestionEmpleados.jsx'
import { Reportes } from './pages/Reportes.jsx'
import { Turnos } from './pages/Turnos.jsx'

function Placeholder({ title }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
      <div className="text-5xl mb-4">🔧</div>
      <p className="text-lg font-semibold">{title || 'Sección en construcción'}</p>
      <p className="text-sm mt-1">Esta sección estará disponible próximamente.</p>
    </div>
  )
}

// Dashboard dinámico según rol del perfil
function EmployeeDashboard() {
  const { perfil } = useAuth()
  switch (perfil?.rol) {
    case 'administrador': return <DashboardAdmin />
    case 'recepcionista': return <ReceptionistDashboard />
    default:              return <Placeholder title="Dashboard" />
  }
}

const protect = (route, element) => ({
  path: route,
  element: <ProtectedRoute requiredRoute={route}>{element}</ProtectedRoute>,
})

export const router = createBrowserRouter([
  { path: '/',               Component: TipoUsuario   },
  { path: '/empleado-login', Component: LoginEmpleado },
  {
    path: '/empleado',
    Component: MainLayout,
    children: [
      { index: true, Component: EmployeeDashboard },
      protect('registro',          <RegistroPaciente />),
      protect('camas',             <ControlCamas />),
      protect('triaje',            <Placeholder title="Triaje y Urgencias" />),
      protect('historial',         <Placeholder title="Historial Clínico" />),
      protect('farmacia',          <Placeholder title="Farmacia" />),
      protect('perfil',            <Placeholder title="Mi Perfil" />),
      protect('ajustes',           <Placeholder title="Configuración" />),
      // Admin-only
      protect('gestion-empleados', <GestionEmpleados />),
      protect('reportes',          <Reportes />),
      protect('turnos',            <Turnos />),
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])