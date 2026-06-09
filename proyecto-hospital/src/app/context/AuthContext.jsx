import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [perfil,  setPerfil]  = useState(null)
  const [loading, setLoading] = useState(true)

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
    // onAuthStateChange dispara INITIAL_SESSION al montar con la sesión actual
    // (o null si no hay). Es la única fuente de verdad — eliminamos getSession()
    // que competía con este listener y causaba loading infinito en Chrome.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)

        if (session?.user) {
          // Usamos setTimeout para ceder el hilo antes de la query a Supabase.
          // Evita deadlock en Chrome cuando Auth y PostgREST comparten el mismo
          // fetch queue durante el evento INITIAL_SESSION.
          setTimeout(async () => {
            const p = await loadPerfil(session.user.id)
            setPerfil(p)
            setLoading(false)
          }, 0)
        } else {
          setPerfil(null)
          setLoading(false)
        }
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