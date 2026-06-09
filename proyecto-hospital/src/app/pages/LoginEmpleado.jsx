import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Activity, Mail, Lock, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react'

export function LoginEmpleado() {
  const navigate        = useNavigate()
  const { signIn }      = useAuth()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async (e) => {
    e?.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Completá el email y la contraseña.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await signIn(email.trim(), password)
      navigate('/empleado')
    } catch (err) {
      // Supabase devuelve mensajes en inglés, los traducimos
      if (
        err.message?.includes('Invalid login') ||
        err.message?.includes('invalid_credentials')
      ) {
        setError('Email o contraseña incorrectos.')
      } else if (err.message?.includes('Email not confirmed')) {
        setError('El email no está confirmado. Contactá al administrador.')
      } else {
        setError('Error al iniciar sesión. Intentá de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">

        {/* Volver */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center text-slate-500 hover:text-[#013FF6] mb-8 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Volver al inicio
        </button>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">

          {/* Header azul */}
          <div className="bg-[#013FF6] px-8 py-8 text-center">
            <div className="w-14 h-14 bg-[#ACEC00] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Activity className="w-7 h-7 text-[#013FF6]" strokeWidth={3} />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              HMS<span className="text-[#ACEC00]">Pro</span>
            </h1>
            <p className="text-blue-200 text-sm mt-1">
              Sistema de Gestión Hospitalaria
            </p>
          </div>

          {/* Formulario */}
          <div className="px-8 py-8">
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              Acceso de empleados
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Ingresá con tu email institucional
            </p>

            <form onSubmit={handleLogin} className="space-y-4">

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError('') }}
                    placeholder="usuario@hospital.com"
                    autoComplete="email"
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm
                      focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40 focus:border-[#013FF6]
                      transition-colors"
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError('') }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm
                      focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40 focus:border-[#013FF6]
                      transition-colors"
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#013FF6] text-white rounded-xl font-semibold text-sm
                  hover:bg-[#0033cc] transition-colors shadow-lg shadow-[#013FF6]/20
                  disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2
                  mt-2"
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Ingresando...</>
                  : 'Ingresar al sistema'
                }
              </button>

            </form>

            {/* Contacto admin */}
            <p className="text-xs text-slate-400 text-center mt-6">
              ¿No tenés acceso?{' '}
              <span className="text-slate-500 font-medium">
                Contactá al administrador del sistema
              </span>
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}