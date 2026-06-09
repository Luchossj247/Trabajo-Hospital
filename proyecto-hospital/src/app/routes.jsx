import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import { MainLayout } from './components/MainLayout.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'
import { TipoUsuario } from './pages/TipoUsuario.jsx'
import { LoginEmpleado } from './pages/LoginEmpleado.jsx'

// Dashboards
import { DashboardAdmin } from './pages/dashboards/DashboardAdmin.jsx'
import { ReceptionistDashboard } from './pages/dashboards/ReceptionistDashboard.jsx'

// Pages
import { RegistroPaciente }      from './pages/RegistroPaciente.jsx'
import { GestionEmpleados }      from './pages/GestionEmpleados.jsx'
import { VerificacionCobertura } from './pages/VerificacionCobertura.jsx'
import { Facturacion }           from './pages/Facturacion.jsx'
import { HistorialAdmin }        from './pages/HistorialAdmin.jsx'
import { ColaEspera }            from './pages/ColaEspera.jsx'

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
  const { perfil } = useAuth()
  switch (perfil?.rol) {
    case 'administrador':  return <DashboardAdmin />
    case 'recepcionista':  return <ReceptionistDashboard />
    default:               return <Placeholder title="Dashboard" />
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
      protect('registro',              <RegistroPaciente />),
      protect('cobertura',             <VerificacionCobertura />),
      protect('facturacion',           <Facturacion />),
      protect('perfil',                <Placeholder title="Mi Perfil" />),
      protect('ajustes',               <Placeholder title="Configuración" />),

      // ── Clínico ────────────────────────────────────────────
      protect('triaje',                <ColaEspera />),
      protect('camas',                 <Placeholder title="Control de Camas" />),
      protect('historial',             <HistorialAdmin />),
      protect('farmacia',              <Placeholder title="Farmacia" />),

      // ── Admin ──────────────────────────────────────────────
      protect('gestion-empleados',     <GestionEmpleados />),
      protect('reportes',              <Placeholder title="Reportes" />),
      protect('turnos',                <Placeholder title="Turnos" />),
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])