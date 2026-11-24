import { useState } from 'react'
import { UserCog, Loader2, CheckCircle2, AlertCircle, Lock, X } from 'lucide-react'
import { usePacienteAuth } from '../context/PacienteAuthContext'
import { actualizarMisDatos } from '../../services/portalPacienteService'

const inputClass = 'w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40'

function Toast({ msg, type, onClose }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium
      ${type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
      {type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      {msg}
      <button onClick={onClose} className="ml-2 hover:opacity-70"><X className="h-4 w-4" /></button>
    </div>
  )
}

function Fijo({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-base font-medium text-slate-800 mt-0.5">{value || <span className="text-slate-400">—</span>}</p>
    </div>
  )
}

export function PacienteMisDatos() {
  const { paciente, setPaciente } = usePacienteAuth()
  const [form, setForm] = useState({
    telefono: paciente.telefono || '',
    email: paciente.email || '',
    direccion: paciente.direccion || '',
    contactoEmergenciaNombre: paciente.contactoEmergenciaNombre || '',
    contactoEmergenciaTelefono: paciente.contactoEmergenciaTelefono || '',
  })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500) }
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleGuardar = async (e) => {
    e.preventDefault()
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      return showToast('Ingresá un email válido.', 'error')
    }
    setSaving(true)
    try {
      const actualizado = await actualizarMisDatos(paciente.id, form)
      setPaciente(prev => ({ ...prev, ...actualizado }))
      showToast('Tus datos se guardaron correctamente.')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const sexo = { M: 'Masculino', F: 'Femenino', X: 'Otro / No especifica' }[paciente.sexo]

  return (
    <div className="space-y-6 max-w-2xl">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <UserCog className="h-8 w-8 text-[#013FF6]" /> Mis Datos
        </h1>
        <p className="text-slate-600 mt-1">Mantené actualizados tus datos de contacto</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Lock className="h-4 w-4 text-slate-500" /> Datos de identidad
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Fijo label="Nombre" value={`${paciente.nombre} ${paciente.apellido}`} />
          <Fijo label="DNI" value={paciente.dni} />
          <Fijo label="Fecha de nacimiento" value={paciente.fechaNacimiento && new Date(paciente.fechaNacimiento + 'T00:00:00').toLocaleDateString('es-AR')} />
          <Fijo label="Sexo" value={sexo} />
        </div>
        <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3.5 py-2.5">
          Estos datos y tu información médica los carga y corrige el personal del hospital.
          Si hay un error, avisá en Recepción con tu DNI.
        </p>
      </div>

      <form onSubmit={handleGuardar} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Teléfono</label>
          <input value={form.telefono} onChange={set('telefono')} inputMode="tel" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email de contacto</label>
          <input type="email" value={form.email} onChange={set('email')} className={inputClass} />
          <p className="text-sm text-slate-500 mt-1">Es el email con el que te contactamos. No cambia el email con el que iniciás sesión.</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Dirección</label>
          <input value={form.direccion} onChange={set('direccion')} className={inputClass} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contacto de emergencia</label>
            <input value={form.contactoEmergenciaNombre} onChange={set('contactoEmergenciaNombre')} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Teléfono de emergencia</label>
            <input value={form.contactoEmergenciaTelefono} onChange={set('contactoEmergenciaTelefono')} inputMode="tel" className={inputClass} />
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-3 rounded-xl bg-[#013FF6] text-white text-base font-semibold hover:bg-[#0033cc] shadow-lg shadow-[#013FF6]/20 disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Guardar cambios
        </button>
      </form>
    </div>
  )
}
