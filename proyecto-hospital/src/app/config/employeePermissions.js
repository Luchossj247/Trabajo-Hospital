export const menuPermissions = {
  administrador: {
    fullAccess: true,
    routes: [
      'dashboard', 'triaje', 'registro', 'camas', 'historial',
      'farmacia', 'perfil', 'ajustes',
      'gestion-empleados', 'reportes', 'turnos',
    ],
  },
  medico: {
    fullAccess: false,
    routes: ['dashboard', 'triaje', 'registro', 'historial', 'perfil'],
  },
  enfermero: {
    fullAccess: false,
    routes: ['dashboard', 'triaje', 'camas', 'historial', 'perfil'],
  },
  farmacia: {
    fullAccess: false,
    routes: ['dashboard', 'farmacia', 'perfil'],
  },
  recepcionista: {
    fullAccess: false,
    routes: ['dashboard', 'registro', 'camas', 'perfil'],
  },
}

export function hasAccess(rol, route) {
  const permissions = menuPermissions[rol]
  if (!permissions) return false
  if (permissions.fullAccess) return true
  return permissions.routes.includes(route)
}

export function getDefaultRoute(rol) {
  switch (rol) {
    case 'farmacia':      return '/empleado/farmacia'
    case 'recepcionista': return '/empleado/registro'
    default:              return '/empleado'
  }
}