import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(undefined)
  const [perfil,  setPerfil]    = useState(null)
  const [loading, setLoading]   = useState(true)

  // Carga el perfil desde tabla `usuario` usando el id del auth user
  const loadPerfil = async (userId) => {
    const { data, error } = await supabase
      .from('usuario')
      .select('id, nombre, apellido, rol, activo')
      .eq('id', userId)
      .single()

    if (error || !data) {
      console.error('No se encontró perfil para el usuario:', userId)
      return null
    }
    return data
  }

  useEffect(() => {
    // Sesión actual al montar
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        const p = await loadPerfil(session.user.id)
        setPerfil(p)
      }
      setLoading(false)
    })

    // Escucha cambios de sesión (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        if (session?.user) {
          const p = await loadPerfil(session.user.id)
          setPerfil(p)
        } else {
          setPerfil(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setPerfil(null)
  }

  return (
    <AuthContext.Provider value={{ session, perfil, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}