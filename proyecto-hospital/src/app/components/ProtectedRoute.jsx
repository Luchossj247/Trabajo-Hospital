import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { hasAccess } from '../config/employeePermissions.js'
import { Loader2 } from 'lucide-react'
import { Outlet } from 'react-router-dom'

export function ProtectedRoute({ children, requiredRoute }) {
  const navigate              = useNavigate()
  const { session, perfil, loading } = useAuth()

  useEffect(() => {
    if (loading) return

    // Sin sesión → al login
    if (!session) {
      navigate('/empleado-login', { replace: true })
      return
    }

    // Con sesión pero sin perfil cargado → esperar
    if (!perfil) return

    // Sin permiso para esta ruta → al dashboard
    if (!hasAccess(perfil.rol, requiredRoute)) {
      navigate('/empleado', { replace: true })
    }
  }, [session, perfil, loading, requiredRoute, navigate])

  // Cargando sesión
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-[#013FF6]" />
      </div>
    )
  }

  // Sin sesión o sin permiso → no renderizar nada (el useEffect redirige)
  if (!session || !perfil || !hasAccess(perfil.rol, requiredRoute)) {
    return null
  }
  return <>{children ?? <Outlet />}</>
}