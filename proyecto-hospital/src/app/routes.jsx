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
import { ListadoPacientes } from './pages/ListadoPaciente.jsx'
import { DetallePaciente } from './pages/DetallePaciente.jsx'
import { RegistroPaciente } from './pages/RegistroPaciente.jsx'
import { GestionEmpleados } from './pages/GestionEmpleados.jsx'
import { VerificacionCobertura } from './pages/VerificacionCobertura.jsx'
import { Facturacion } from './pages/Facturacion.jsx'
import { ColaEspera } from './pages/ColaEspera.jsx'
import { HistorialAdmin } from './pages/HistorialAdmin.jsx'

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

// Todas las subrutas de registro usan 'registro' como requiredRoute
// para que hasAccess evalúe el mismo permiso en las tres variantes
const protect = (route, element, requiredRoute) => ({
  path: route,
  element: (
    <ProtectedRoute requiredRoute={requiredRoute ?? route}>
      {element}
    </ProtectedRoute>
  ),
})

export const router = createBrowserRouter([
  { path: '/', Component: TipoUsuario },
  { path: '/empleado-login', Component: LoginEmpleado },
  {
    path: '/empleado',
    Component: MainLayout,
    children: [
      { index: true, Component: EmployeeDashboard },

      // ── Registro de pacientes ──────────────────────────────
      // Las tres rutas usan requiredRoute='registro' para que
      // hasAccess verifique el mismo permiso
      protect('registro',        <ListadoPacientes />,  'registro'),
      protect('registro/nuevo',  <RegistroPaciente />,  'registro'),
      protect('registro/:id',    <DetallePaciente />,   'registro'),

      // ── Módulos clínicos ───────────────────────────────────
      protect('triaje',          <Placeholder title="Triaje y Urgencias" />),
      protect('camas',           <Placeholder title="Control de Camas" />),
      protect('historial',       <Placeholder title="Historial Clínico — Médico" />),
      protect('farmacia',        <Placeholder title="Farmacia" />),

      // ── Recepción / Admin ──────────────────────────────────
      protect('cola-espera',     <ColaEspera />),
      protect('cobertura',       <VerificacionCobertura />),
      protect('facturacion',     <Facturacion />),
      protect('historial-admin', <HistorialAdmin />),

      // ── Admin-only ─────────────────────────────────────────
      protect('gestion-empleados', <GestionEmpleados />),
      protect('reportes',          <Placeholder title="Reportes" />),
      protect('turnos',            <Placeholder title="Turnos" />),

      // ── Usuario ────────────────────────────────────────────
      protect('perfil',   <Placeholder title="Mi Perfil" />),
      protect('ajustes',  <Placeholder title="Configuración" />),
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])