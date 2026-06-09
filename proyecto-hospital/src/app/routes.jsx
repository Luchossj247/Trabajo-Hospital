import { createBrowserRouter, Navigate } from 'react-router-dom'
import { MainLayout } from './components/MainLayout.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'
import { TipoUsuario } from './pages/TipoUsuario.jsx'
import { LoginEmpleado } from './pages/LoginEmpleado.jsx'

// Dashboards
import { DashboardAdmin } from './pages/dashboards/DashboardAdmin.jsx'
import { ReceptionistDashboard } from './pages/dashboards/ReceptionistDashboard.jsx'

// Pages
import { RegistroPaciente } from './pages/RegistroPaciente.jsx'
import { GestionEmpleados } from './pages/GestionEmpleados.jsx'

function Placeholder({ title }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
      <div className="text-5xl mb-4">🔧</div>
      <p className="text-lg font-semibold">{title || 'Sección en construcción'}</p>
      <p className="text-sm mt-1">Esta sección estará disponible próximamente.</p>
    </div>
  )
}

function EmployeeDashboard() {
  const employeeType = sessionStorage.getItem('employeeType')
  switch (employeeType) {
    case 'admin':        return <DashboardAdmin />
    case 'receptionist': return <ReceptionistDashboard />
    default:             return <Placeholder title="Dashboard" />
  }
}

const protect = (route, element) => ({
  path: route,
  element: <ProtectedRoute requiredRoute={route}>{element}</ProtectedRoute>,
})

export const router = createBrowserRouter([
  { path: '/', Component: TipoUsuario },
  { path: '/empleado-login', Component: LoginEmpleado },
  {
    path: '/empleado',
    Component: MainLayout,
    children: [
      { index: true, Component: EmployeeDashboard },

      // ── Recepcionista ──────────────────────────────────────
      protect('registro',   <RegistroPaciente />),
      protect('perfil',     <Placeholder title="Mi Perfil" />),
      protect('ajustes',    <Placeholder title="Configuración" />),

      // ── Próximamente ───────────────────────────────────────
      protect('triaje',             <Placeholder title="Triaje y Urgencias" />),
      protect('camas',              <Placeholder title="Control de Camas" />),
      protect('historial',          <Placeholder title="Historial Clínico" />),
      protect('farmacia',           <Placeholder title="Farmacia" />),
      protect('gestion-empleados',  <GestionEmpleados />),
      protect('reportes',           <Placeholder title="Reportes" />),
      protect('turnos',             <Placeholder title="Turnos" />),
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])