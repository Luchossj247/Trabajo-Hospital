export const menuPermissions = {
  // Administrador del SISTEMA — acceso total
  admin: {
    fullAccess: true,
    routes: [
      'dashboard', 'triaje', 'registro', 'camas', 'historial',
      'farmacia', 'perfil', 'ajustes',
      'gestion-empleados', 'reportes', 'turnos',
    ],
  },

  // Recepcionista — admisión de pacientes
  receptionist: {
    fullAccess: false,
    routes: ['dashboard', 'registro', 'perfil', 'ajustes'],
  },

  // Roles pendientes de implementación
  doctor: {
    fullAccess: false,
    routes: ['dashboard', 'perfil'],
  },
  nurse: {
    fullAccess: false,
    routes: ['dashboard', 'perfil'],
  },
  pharmacist: {
    fullAccess: false,
    routes: ['dashboard', 'perfil'],
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
    case 'receptionist': return '/empleado'
    default:             return '/empleado'
  }
}