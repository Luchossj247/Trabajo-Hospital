import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [perfil,  setPerfil]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [mfaPendiente, setMfaPendiente] = useState(false)

  // ¿La cuenta tiene verificación en dos pasos activa y esta sesión todavía no la completó?
  const requiereMfa = async () => {
    try {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      return data?.nextLevel === 'aal2' && data?.currentLevel !== 'aal2'
    } catch { return false }
  }

  const loadPerfil = async (userId) => {
    const { data, error } = await supabase
      .from('usuario')
      .select('id, nombre, apellido, email, rol, activo')
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
            if (p && p.rol !== 'paciente' && await requiereMfa()) {
              setMfaPendiente(true)
              setPerfil(null)
            } else {
              setMfaPendiente(false)
              setPerfil(p)
            }
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

    // Las cuentas de pacientes usan el Portal del Paciente, no el panel de empleados.
    const p = await loadPerfil(data.user.id)
    if (!p || p.rol === 'paciente') {
      await supabase.auth.signOut()
      throw new Error('Esta cuenta no es de personal del hospital. Ingresá por el Portal del Paciente.')
    }
    if (p.activo === false) {
      await supabase.auth.signOut()
      throw new Error('Tu usuario está desactivado. Contactá a un administrador.')
    }
    if (await requiereMfa()) return { ...data, mfaRequired: true }
    return data
  }

  // Segundo paso del login: código de 6 dígitos de la app autenticadora.
  const verificarMfa = async (codigo) => {
    const { data: factores, error: e1 } = await supabase.auth.mfa.listFactors()
    if (e1) throw e1
    const factor = factores?.totp?.[0]
    if (!factor) throw new Error('No hay un autenticador configurado para esta cuenta.')
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: codigo })
    if (error) throw new Error('El código no es válido o venció. Probá con el siguiente.')
    const { data: { user } } = await supabase.auth.getUser()
    setPerfil(await loadPerfil(user.id))
    setMfaPendiente(false)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setPerfil(null)
    setMfaPendiente(false)
  }

  // Vuelve a traer el perfil del usuario actual desde la tabla `usuario`.
  // Se usa después de editar datos propios (ej. desde Ajustes) para que
  // el nombre/rol mostrado en el sidebar y el resto de la app quede al día
  // sin necesidad de recargar la página.
  const refreshPerfil = async () => {
    if (!session?.user) return null
    const p = await loadPerfil(session.user.id)
    setPerfil(p)
    return p
  }

  return (
    <AuthContext.Provider value={{ session, perfil, loading, mfaPendiente, signIn, verificarMfa, signOut, refreshPerfil }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}