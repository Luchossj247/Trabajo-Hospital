// Las keys deben coincidir EXACTAMENTE con los valores de `rol` en la tabla `usuario`

export const menuPermissions = {

  // ── Administrador — acceso total ──────────────────────────
  administrador: {
    fullAccess: true,
    routes: [
      'dashboard', 'triaje', 'registro', 'camas', 'historial', 'historial-admin' ,
      'farmacia', 'cobertura', 'facturacion', 'perfil', 'ajustes',
      'gestion-empleados', 'reportes', 'turnos', 'cola-espera',
    ],
  },

  // ── Médico — atención clínica ─────────────────────────────
  medico: {
    fullAccess: false,
    routes: [
      'dashboard', 'triaje', 'camas', 'historial',
      'perfil', 'ajustes',
    ],
  },

  // ── Enfermero/a — soporte clínico ─────────────────────────
  enfermero: {
    fullAccess: false,
    routes: [
      'dashboard', 'triaje', 'camas',
      'perfil', 'ajustes',
    ],
  },

  // ── Farmacéutico — farmacia e inventario ──────────────────
  farmacia: {
    fullAccess: false,
    routes: [
      'dashboard', 'farmacia',
      'perfil', 'ajustes',
    ],
  },

  // ── Recepcionista — admisión y gestión administrativa ─────
  recepcionista: {
    fullAccess: false,
    routes: [
      'dashboard', 'registro', 'cobertura', 'facturacion', 'historial-admin', 'turnos',
      'perfil', 'ajustes', 'cola-espera',
    ],
  },
}

export function hasAccess(rol, route) {
  const permissions = menuPermissions[rol]
  if (!permissions) return false
  if (permissions.fullAccess) return true
  return permissions.routes.includes(route)
}

export function getDefaultRoute(rol) {
  // Todos arrancan en el dashboard; el layout muestra lo que corresponde según rol
  return '/empleado'
}