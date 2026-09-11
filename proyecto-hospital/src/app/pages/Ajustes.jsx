import { useState } from 'react'
import { Settings, User, KeyRound, Save, Loader2, CheckCircle2, AlertTriangle, X } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { updateUsuario } from '../../services/usuarioService'
import { useAuth } from '../context/AuthContext'

const ROL_LABELS = {
  administrador: 'Administrador',
  medico:        'Médico',
  enfermero:     'Enfermero/a',
  farmacia:      'Farmacéutico',
  recepcionista: 'Recepcionista',
}

function Toast({ msg, type, onClose }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium
      ${type === 'success' ? 'bg-emerald-600' : 'bg-red-500'}`}>
      {type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      {msg}
      <button onClick={onClose} className="ml-2 hover:opacity-70"><X className="h-4 w-4" /></button>
    </div>
  )
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
        <Icon className="h-4 w-4 text-[#013FF6]" />
        <span className="font-bold text-slate-900">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export function Ajustes() {
  const { perfil, refreshPerfil } = useAuth()
  const [toast, setToast] = useState(null)
  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  // ── Datos personales ──────────────────────────────────────────
  const [nombre, setNombre]     = useState(perfil?.nombre || '')
  const [apellido, setApellido] = useState(perfil?.apellido || '')
  const [savingDatos, setSavingDatos] = useState(false)

  const hayCambiosDatos = nombre !== (perfil?.nombre || '') || apellido !== (perfil?.apellido || '')

  const guardarDatos = async () => {
    if (!nombre.trim() || !apellido.trim()) {
      return showToast('Nombre y apellido no pueden estar vacíos.', 'error')
    }
    setSavingDatos(true)
    try {
      await updateUsuario(perfil.id, { nombre: nombre.trim(), apellido: apellido.trim() })
      if (refreshPerfil) await refreshPerfil()
      showToast('Datos actualizados.')
    } catch (err) {
      showToast(err.message || 'Error al guardar los datos.', 'error')
    } finally {
      setSavingDatos(false)
    }
  }

  // ── Cambiar contraseña ────────────────────────────────────────
  const [passwordActual, setPasswordActual] = useState('') // solo informativo, no se valida contra Supabase
  const [passwordNueva, setPasswordNueva]   = useState('')
  const [passwordConfirmar, setPasswordConfirmar] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const cambiarPassword = async () => {
    if (passwordNueva.length < 6) {
      return showToast('La nueva contraseña debe tener al menos 6 caracteres.', 'error')
    }
    if (passwordNueva !== passwordConfirmar) {
      return showToast('Las contraseñas no coinciden.', 'error')
    }
    setSavingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordNueva })
      if (error) throw error
      setPasswordActual('')
      setPasswordNueva('')
      setPasswordConfirmar('')
      showToast('Contraseña actualizada.')
    } catch (err) {
      showToast(err.message || 'Error al cambiar la contraseña.', 'error')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <Settings className="h-8 w-8 text-[#013FF6]" /> Configuración
        </h1>
        <p className="text-slate-500 mt-1">Tus datos personales y seguridad de la cuenta</p>
      </div>

      {/* ── Datos personales ─────────────────────────────────── */}
      <SectionCard title="Datos personales" icon={User}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Apellido</label>
              <input value={apellido} onChange={e => setApellido(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
            <input value={perfil?.email || ''} disabled
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-400 cursor-not-allowed" />
            <p className="text-xs text-slate-400 mt-1">El email no se puede cambiar desde acá — contactá a un administrador.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Rol</label>
            <span className="inline-block px-3 py-1.5 rounded-xl text-xs font-bold bg-[#013FF6]/10 text-[#013FF6]">
              {ROL_LABELS[perfil?.rol] || perfil?.rol}
            </span>
          </div>

          {hayCambiosDatos && (
            <div className="flex justify-end pt-2">
              <button onClick={guardarDatos} disabled={savingDatos}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#013FF6] text-white text-sm font-semibold hover:bg-[#0033cc] disabled:opacity-60">
                {savingDatos ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar cambios
              </button>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── Cambiar contraseña ───────────────────────────────── */}
      <SectionCard title="Cambiar contraseña" icon={KeyRound}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nueva contraseña</label>
            <input type="password" value={passwordNueva} onChange={e => setPasswordNueva(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirmar nueva contraseña</label>
            <input type="password" value={passwordConfirmar} onChange={e => setPasswordConfirmar(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={cambiarPassword} disabled={savingPassword || !passwordNueva}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#013FF6] text-white text-sm font-semibold hover:bg-[#0033cc] disabled:opacity-60">
              {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Actualizar contraseña
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}