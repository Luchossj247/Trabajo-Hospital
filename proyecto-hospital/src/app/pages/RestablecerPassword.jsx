import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Lock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

// Pantalla a la que llega el usuario desde el enlace del email de recuperación.
export function RestablecerPassword() {
  const navigate = useNavigate()
  const [listo, setListo] = useState(false)       // hay sesión de recuperación válida
  const [verificando, setVerificando] = useState(true)
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento, sesion) => {
      if (evento === 'PASSWORD_RECOVERY' || (evento === 'SIGNED_IN' && sesion)) setListo(true)
    })
    // Si el evento ya ocurrió antes de montar, la sesión ya existe.
    supabase.auth.getSession().then(({ data }) => { if (data.session) setListo(true) })
    const t = setTimeout(() => setVerificando(false), 1500)
    return () => { subscription.unsubscribe(); clearTimeout(t) }
  }, [])

  const guardar = async (e) => {
    e.preventDefault()
    if (nueva.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.')
    if (!/[A-Za-z]/.test(nueva) || !/\d/.test(nueva)) return setError('Combiná letras y números.')
    if (nueva !== confirmar) return setError('Las contraseñas no coinciden.')
    setGuardando(true); setError('')
    try {
      const { error: err } = await supabase.auth.updateUser({ password: nueva })
      if (err) throw err
      setOk(true)
      await supabase.auth.signOut()
      setTimeout(() => navigate('/'), 2500)
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la contraseña.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-[#013FF6] px-8 py-8 text-center">
          <div className="w-14 h-14 bg-[#ACEC00] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Activity className="w-7 h-7 text-[#013FF6]" strokeWidth={3} />
          </div>
          <h1 className="text-2xl font-extrabold text-white">HMS<span className="text-[#ACEC00]">Pro</span></h1>
        </div>
        <div className="px-8 py-8">
          <h2 className="text-xl font-bold text-slate-900 mb-1">Nueva contraseña</h2>
          {ok ? (
            <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 mt-4">
              <CheckCircle2 className="h-4 w-4 mt-0.5" /> Listo, tu contraseña se actualizó. Te llevamos al inicio para que ingreses.
            </div>
          ) : !listo ? (
            <div className="mt-4 text-sm text-slate-500">
              {verificando
                ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Verificando enlace…</span>
                : <>
                    <p className="flex items-center gap-2 text-red-600 font-medium"><AlertCircle className="h-4 w-4" /> El enlace venció o ya fue usado.</p>
                    <button onClick={() => navigate('/')} className="mt-3 text-[#013FF6] font-semibold hover:underline">Volver al inicio y pedir uno nuevo</button>
                  </>}
            </div>
          ) : (
            <form onSubmit={guardar} className="space-y-4 mt-4">
              {[['Nueva contraseña', nueva, setNueva], ['Repetir contraseña', confirmar, setConfirmar]].map(([label, val, set]) => (
                <div key={label}>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input type="password" value={val} autoComplete="new-password" onChange={e => { set(e.target.value); setError('') }}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
                  </div>
                </div>
              ))}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="h-4 w-4 text-red-500" /><p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              )}
              <button type="submit" disabled={guardando}
                className="w-full py-3 rounded-xl bg-[#013FF6] text-white text-sm font-semibold hover:bg-[#0033cc] disabled:opacity-60 flex items-center justify-center gap-2">
                {guardando && <Loader2 className="h-4 w-4 animate-spin" />} Guardar contraseña
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
