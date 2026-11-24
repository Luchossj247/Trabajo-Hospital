import { useEffect, useState, useCallback } from 'react'
import { ShieldCheck, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

// Activar / desactivar la verificación en dos pasos (app autenticadora, TOTP).
export function VerificacionDosPasos() {
  const [cargando, setCargando] = useState(true)
  const [factor, setFactor] = useState(null)        // factor TOTP verificado
  const [alta, setAlta] = useState(null)            // { factorId, qr, secreto } durante el alta
  const [codigo, setCodigo] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    const { data } = await supabase.auth.mfa.listFactors()
    setFactor(data?.totp?.[0] || null)             // listFactors.totp solo trae los verificados
    setCargando(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const iniciar = async () => {
    setTrabajando(true); setError(''); setOk('')
    try {
      // Limpia intentos anteriores sin terminar
      const { data: todos } = await supabase.auth.mfa.listFactors()
      for (const f of (todos?.all || []).filter(x => x.status !== 'verified')) {
        await supabase.auth.mfa.unenroll({ factorId: f.id })
      }
      const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `HMSPro ${new Date().toLocaleDateString('es-AR')}` })
      if (err) throw err
      setAlta({ factorId: data.id, qr: data.totp.qr_code, secreto: data.totp.secret })
    } catch (err) { setError(err.message || 'No se pudo iniciar la activación.') }
    finally { setTrabajando(false) }
  }

  const confirmar = async () => {
    if (!/^\d{6}$/.test(codigo)) return setError('Ingresá los 6 dígitos que muestra la app.')
    setTrabajando(true); setError('')
    try {
      const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId: alta.factorId, code: codigo })
      if (err) throw err
      setAlta(null); setCodigo(''); setOk('Verificación en dos pasos activada.')
      await cargar()
    } catch { setError('El código no es válido. Revisá la hora del celular e intentá de nuevo.') }
    finally { setTrabajando(false) }
  }

  const desactivar = async () => {
    setTrabajando(true); setError(''); setOk('')
    try {
      const { error: err } = await supabase.auth.mfa.unenroll({ factorId: factor.id })
      if (err) throw err
      setOk('Verificación en dos pasos desactivada.')
      await cargar()
    } catch (err) { setError(err.message || 'No se pudo desactivar.') }
    finally { setTrabajando(false) }
  }

  const cancelarAlta = async () => {
    if (alta) await supabase.auth.mfa.unenroll({ factorId: alta.factorId })
    setAlta(null); setCodigo(''); setError('')
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
        <ShieldCheck className="h-4 w-4 text-[#013FF6]" />
        <span className="font-bold text-slate-900">Verificación en dos pasos</span>
      </div>
      <div className="p-5 space-y-4">
        {cargando ? (
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        ) : alta ? (
          <>
            <p className="text-sm text-slate-600">1. Escaneá el código QR con Google Authenticator, Microsoft Authenticator o similar.</p>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <img src={alta.qr} alt="Código QR para la app autenticadora" className="w-40 h-40 border border-slate-200 rounded-xl bg-white p-1" />
              <div className="text-xs text-slate-500 space-y-1">
                <p>¿No podés escanear? Ingresá esta clave manualmente:</p>
                <p className="font-mono text-sm text-slate-800 break-all select-all">{alta.secreto}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">2. Escribí el código de 6 dígitos que muestra la app:</p>
            <input inputMode="numeric" maxLength={6} value={codigo} onChange={e => { setCodigo(e.target.value.replace(/\D/g, '')); setError('') }}
              placeholder="000000" className="w-40 text-center tracking-[0.4em] text-lg font-bold py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
            <div className="flex gap-2">
              <button onClick={cancelarAlta} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={confirmar} disabled={trabajando}
                className="px-4 py-2 rounded-xl bg-[#013FF6] text-white text-sm font-semibold hover:bg-[#0033cc] disabled:opacity-60 flex items-center gap-2">
                {trabajando && <Loader2 className="h-4 w-4 animate-spin" />} Activar
              </button>
            </div>
          </>
        ) : factor ? (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-emerald-700 font-semibold flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Activada: al ingresar te vamos a pedir un código.</p>
            <button onClick={desactivar} disabled={trabajando}
              className="px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 disabled:opacity-60">Desactivar</button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-slate-500 max-w-md">Sumá una capa extra de seguridad: además de la contraseña, se pide un código temporal desde tu celular.</p>
            <button onClick={iniciar} disabled={trabajando}
              className="px-4 py-2 rounded-xl bg-[#013FF6] text-white text-sm font-semibold hover:bg-[#0033cc] disabled:opacity-60 flex items-center gap-2">
              {trabajando && <Loader2 className="h-4 w-4 animate-spin" />} Activar
            </button>
          </div>
        )}
        {error && <p className="text-xs font-semibold text-red-600 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> {error}</p>}
        {ok && <p className="text-xs font-semibold text-emerald-600">{ok}</p>}
      </div>
    </div>
  )
}
