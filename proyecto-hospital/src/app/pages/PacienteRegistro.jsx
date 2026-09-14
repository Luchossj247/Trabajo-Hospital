import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, ArrowLeft, AlertCircle, Loader2, UserPlus } from 'lucide-react'
import { registrarPaciente } from '../../services/portalPacienteService'
import { usePacienteAuth } from '../context/PacienteAuthContext'

const SEXO_OPCIONES = [
  { value: 'F', label: 'Femenino' },
  { value: 'M', label: 'Masculino' },
  { value: 'X', label: 'Otro / prefiero no decir' },
]

export function PacienteRegistro() {
  const navigate = useNavigate()
  const { setPaciente } = usePacienteAuth()

  const [form, setForm] = useState({
    nombre: '', apellido: '', dni: '', fechaNacimiento: '', sexo: '',
    telefono: '', email: '',
  })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!form.nombre.trim() || !form.apellido.trim() || !form.dni.trim() || !form.fechaNacimiento || !form.sexo) {
      setError('Completá nombre, apellido, DNI, fecha de nacimiento y sexo.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const paciente = await registrarPaciente(form)
      setPaciente(paciente)
      navigate('/paciente/reservar-turno')
    } catch (err) {
      setError(err.message || 'Error al registrarte. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 py-10">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate('/paciente-login')}
          className="flex items-center text-slate-500 hover:text-[#013FF6] mb-8 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Volver al login
        </button>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-[#013FF6] px-8 py-8 text-center">
            <div className="w-14 h-14 bg-[#ACEC00] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <UserPlus className="w-7 h-7 text-[#013FF6]" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Registrarme como paciente</h1>
            <p className="text-blue-200 text-sm mt-1">Para poder sacar un turno por primera vez</p>
          </div>

          <div className="px-8 py-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre *</label>
                  <input value={form.nombre} onChange={e => setField('nombre', e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Apellido *</label>
                  <input value={form.apellido} onChange={e => setField('apellido', e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">DNI *</label>
                <input value={form.dni} onChange={e => setField('dni', e.target.value)} placeholder="Sin puntos"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fecha de nacimiento *</label>
                <input type="date" value={form.fechaNacimiento} onChange={e => setField('fechaNacimiento', e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Sexo *</label>
                <div className="flex gap-1.5">
                  {SEXO_OPCIONES.map(o => (
                    <button key={o.value} type="button" onClick={() => setField('sexo', o.value)}
                      className={`flex-1 px-2 py-2 rounded-lg text-xs font-semibold border-2 transition-all
                        ${form.sexo === o.value ? 'border-transparent bg-[#013FF6] text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Teléfono</label>
                  <input value={form.telefono} onChange={e => setField('telefono', e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={e => setField('email', e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-[#013FF6] text-white text-sm font-semibold hover:bg-[#0033cc] shadow-lg shadow-[#013FF6]/20 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Registrarme y continuar
              </button>
            </form>

            <p className="text-xs text-slate-400 text-center mt-6">
              Tu obra social y tu historial clínico los va a cargar el hospital en tu primera consulta presencial.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}