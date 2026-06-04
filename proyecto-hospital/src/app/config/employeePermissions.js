export const menuPermissions = {
  admin: {
    fullAccess: true,
    routes: [
      'dashboard', 'triaje', 'registro', 'camas', 'historial',
      'farmacia', 'perfil', 'ajustes',
      'gestion-empleados', 'reportes', 'turnos',
    ],
  },
  doctor: {
    fullAccess: false,
    routes: ['dashboard', 'triaje', 'registro', 'historial', 'perfil'],
  },
  nurse: {
    fullAccess: false,
    routes: ['dashboard', 'triaje', 'camas', 'historial', 'perfil'],
  },
  pharmacist: {
    fullAccess: false,
    routes: ['dashboard', 'farmacia', 'perfil'],
  },
  receptionist: {
    fullAccess: false,
    routes: ['dashboard', 'registro', 'camas', 'perfil'],
  },
}

export function hasAccess(employeeType, route) {
  const permissions = menuPermissions[employeeType]
  if (!permissions) return false
  if (permissions.fullAccess) return true
  return permissions.routes.includes(route)
}

export function getDefaultRoute(employeeType) {
  switch (employeeType) {
    case 'pharmacist':  return '/empleado/farmacia'
    case 'receptionist': return '/empleado/registro'
    default: return '/empleado'
  }
}