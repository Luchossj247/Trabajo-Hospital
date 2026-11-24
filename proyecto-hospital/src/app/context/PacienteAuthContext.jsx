import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { getMiPaciente, logoutPaciente } from '../../services/portalPacienteService'

const PacienteAuthContext = createContext(null)

// La sesión del paciente es una sesión real de Supabase Auth (JWT).
// El paciente se obtiene de la tabla `paciente` vía RLS (solo puede leer el suyo).
export function PacienteAuthProvider({ children }) {
  const [paciente, setPaciente] = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setPaciente(null)
        setLoading(false)
        return
      }
      // Cedemos el hilo antes de consultar (mismo motivo que en AuthContext).
      setTimeout(async () => {
        try { setPaciente(await getMiPaciente()) }
        catch { setPaciente(null) }
        finally { setLoading(false) }
      }, 0)
    })
    return () => subscription.unsubscribe()
  }, [])

  const logout = useCallback(async () => {
    await logoutPaciente()
    setPaciente(null)
  }, [])

  const refresh = useCallback(async () => {
    setPaciente(await getMiPaciente())
  }, [])

  return (
    <PacienteAuthContext.Provider value={{ paciente, setPaciente, loading, logout, refresh }}>
      {children}
    </PacienteAuthContext.Provider>
  )
}

export function usePacienteAuth() {
  const ctx = useContext(PacienteAuthContext)
  if (!ctx) throw new Error('usePacienteAuth debe usarse dentro de <PacienteAuthProvider>')
  return ctx
}
