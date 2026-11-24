import { useState } from 'react'
import { Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

// Enlace "¿Olvidaste tu contraseña?" que despliega un mini formulario.
// Envía un email con un enlace a /restablecer-password.
export function OlvideMiPassword({ emailInicial = '' }) {
  const [abierto, setAbierto] = useState(false)
  const [email, setEmail] = useState(emailInicial)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  const enviar = async (e) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Ingresá un email válido.')
    setEnviando(true); setError('')
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/restablecer-password`,
      })
      if (err) throw err
      setEnviado(true)
    } catch (err) {
      setError(/rate|limit/i.test(err.message || '')
        ? 'Hiciste demasiados intentos. Esperá unos minutos y probá de nuevo.'
        : 'No pudimos enviar el correo. Intentá de nuevo en unos minutos.')
    } finally {
      setEnviando(false)
    }
  }

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)}
        className="text-xs font-semibold text-[#013FF6] hover:underline">
        ¿Olvidaste tu contraseña?
      </button>
    )
  }

  if (enviado) {
    return (
      <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
        <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <p>Si el email está registrado, te enviamos un enlace para crear una contraseña nueva. Revisá también la carpeta de spam.</p>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
      <p className="text-xs text-slate-500">Ingresá tu email y te enviamos un enlace para restablecerla.</p>
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }}
          placeholder="tu@email.com" autoComplete="email"
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-600 font-medium"><AlertCircle className="h-3.5 w-3.5" />{error}</p>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={() => setAbierto(false)}
          className="flex-1 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-white">Cancelar</button>
        <button type="submit" disabled={enviando}
          className="flex-1 py-2 rounded-lg bg-[#013FF6] text-white text-xs font-semibold hover:bg-[#0033cc] disabled:opacity-60 flex items-center justify-center gap-1.5">
          {enviando && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Enviar enlace
        </button>
      </div>
    </form>
  )
}
