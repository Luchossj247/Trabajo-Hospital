import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, ArrowLeft, AlertCircle, Loader2, Mail, Lock } from 'lucide-react'
import { loginPaciente } from '../../services/portalPacienteService'
import { usePacienteAuth } from '../context/PacienteAuthContext'

export function PacienteLogin() {
  const navigate = useNavigate()
  const { setPaciente } = usePacienteAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e?.preventDefault()
    if (!email.trim() || !password) {
      setError('Completá tu email y contraseña.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const paciente = await loginPaciente(email, password)
      setPaciente(paciente)
      navigate('/paciente')
    } catch (err) {
      setError(err.message || 'Error al acceder. Verificá tus datos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate('/')}
          className="flex items-center text-slate-500 hover:text-[#013FF6] mb-8 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Volver al inicio
        </button>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-[#ACEC00] px-8 py-8 text-center">
            <div className="w-14 h-14 bg-[#013FF6] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Activity className="w-7 h-7 text-white" strokeWidth={3} />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Portal del Paciente
            </h1>
            <p className="text-slate-700/70 text-sm mt-1">
              Consultá tu historial, turnos y resultados
            </p>
          </div>

          <div className="px-8 py-8">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Iniciar sesión</h2>
            <p className="text-sm text-slate-400 mb-6">Ingresá con el email y la contraseña de tu cuenta</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#013FF6] text-white text-sm font-semibold hover:bg-[#0033cc] shadow-lg shadow-[#013FF6]/20 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Ingresar
              </button>
            </form>

            <p className="text-xs text-slate-400 text-center mt-6">
              Si ya sos paciente del hospital y todavía no tenés cuenta, pedí un código de activación en recepción y usalo al registrarte.
            </p>

            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-500">
                ¿No tenés cuenta?{' '}
                <button type="button" onClick={() => navigate('/paciente-registro')}
                  className="font-semibold text-[#013FF6] hover:underline">
                  Crear cuenta
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}