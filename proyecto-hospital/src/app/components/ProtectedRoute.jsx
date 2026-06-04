import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { hasAccess } from '../config/employeePermissions.js'

export function ProtectedRoute({ children, requiredRoute }) {
  const navigate = useNavigate()
  const location = useLocation()
  const employeeType = sessionStorage.getItem('employeeType')

  useEffect(() => {
    if (!employeeType) {
      navigate('/empleado-login', { replace: true })
      return
    }
    if (!hasAccess(employeeType, requiredRoute)) {
      navigate('/empleado', { replace: true })
    }
  }, [employeeType, requiredRoute, navigate, location])

  if (!employeeType || !hasAccess(employeeType, requiredRoute)) {
    return null
  }

  return <>{children}</>
}
