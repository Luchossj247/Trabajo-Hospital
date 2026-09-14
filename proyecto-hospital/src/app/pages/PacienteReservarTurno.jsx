import { useState, useEffect, useCallback } from 'react'
import { CalendarPlus, Loader2, CheckCircle2, AlertCircle, Clock, CalendarX, X } from 'lucide-react'
import { getMedicos, getSlotsDisponibles, createTurno } from '../../services/turnoService'
import { usePacienteAuth } from '../context/PacienteAuthContext'

function isoDate(d) { return d.toISOString().split('T')[0] }

function Toast({ msg, type, onClose }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium
      ${type === 'success' ? 'bg-emerald-600' : 'bg-red-500'}`}>
      {type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      {msg}
      <button onClick={onClose} className="ml-2 hover:opacity-70"><X className="h-4 w-4" /></button>
    </div>
  )
}

export function PacienteReservarTurno() {
  const { paciente } = usePacienteAuth()
  const [medicos, setMedicos]     = useState([])
  const [medicoId, setMedicoId]   = useState('')
  const [fecha, setFecha]         = useState(isoDate(new Date()))
  const [motivo, setMotivo]       = useState('')
  const [slots, setSlots]         = useState([])
  const [slotElegido, setSlotElegido] = useState(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState(null)
  const [confirmado, setConfirmado] = useState(null)

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500) }

  useEffect(() => {
    (async () => {
      try { setMedicos(await getMedicos()) }
      catch { setMedicos([]) }
    })()
  }, [])

  const fetchSlots = useCallback(async () => {
    if (!medicoId || !fecha) { setSlots([]); return }
    setLoadingSlots(true)
    setSlotElegido(null)
    try { setSlots(await getSlotsDisponibles(medicoId, fecha)) }
    catch { setSlots([]) }
    finally { setLoadingSlots(false) }
  }, [medicoId, fecha])

  useEffect(() => { fetchSlots() }, [fetchSlots])

  const handleConfirmar = async () => {
    if (!medicoId) return showToast('Elegí un médico.', 'error')
    if (!slotElegido) return showToast('Elegí un horario disponible.', 'error')
    setSaving(true)
    try {
      const nuevo = await createTurno({
        pacienteId: paciente.id,
        medicoId,
        fecha,
        horaInicio: slotElegido.horaInicio,
        horaFin: slotElegido.horaFin,
        motivo: motivo.trim() || null,
        estado: 'programado',
        recepcionistaId: null, // reservado por el propio paciente, sin intervención de recepción
      })
      setConfirmado(nuevo)
      showToast('¡Turno reservado con éxito!')
    } catch (err) {
      showToast(err.message || 'Error al reservar el turno.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const medico = medicos.find(m => m.id === medicoId)

  if (confirmado) {
    return (
      <div className="max-w-lg mx-auto text-center py-10">
        {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Turno confirmado</h1>
        <p className="text-slate-500 mb-6">Te esperamos en la fecha y horario indicados.</p>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-left space-y-2">
          <p className="text-sm"><span className="font-semibold text-slate-700">Médico:</span> Dr/a. {medico?.apellido}, {medico?.nombre}</p>
          <p className="text-sm"><span className="font-semibold text-slate-700">Fecha:</span> {new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <p className="text-sm"><span className="font-semibold text-slate-700">Horario:</span> {slotElegido.horaInicio}</p>
        </div>
        <button onClick={() => { setConfirmado(null); setSlotElegido(null); setMotivo('') }}
          className="mt-6 text-sm font-semibold text-[#013FF6] hover:underline">
          Reservar otro turno
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <CalendarPlus className="h-8 w-8 text-[#013FF6]" /> Reservar Turno
        </h1>
        <p className="text-slate-500 mt-1">Elegí médico, fecha y horario disponible</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Médico</label>
          <div className="flex flex-wrap gap-1.5">
            {medicos.map(m => (
              <button key={m.id} onClick={() => setMedicoId(m.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                  ${medicoId === m.id ? 'bg-[#013FF6] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                Dr/a. {m.apellido}, {m.nombre}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fecha</label>
          <input type="date" value={fecha} min={isoDate(new Date())}
            onChange={e => setFecha(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
        </div>

        {medicoId && fecha && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              Horario disponible
              {loadingSlots && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
            </label>
            {!loadingSlots && slots.length === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                <CalendarX className="h-4 w-4 flex-shrink-0" /> El médico no tiene agenda para ese día.
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 max-h-52 overflow-y-auto pr-1">
                {slots.map(slot => (
                  <button key={slot.horaInicio} disabled={!slot.disponible}
                    onClick={() => setSlotElegido(slot)}
                    className={`px-2 py-2 rounded-lg text-xs font-semibold text-center transition-all flex items-center justify-center gap-1
                      ${slotElegido?.horaInicio === slot.horaInicio
                        ? 'bg-[#013FF6] text-white shadow-sm'
                        : !slot.disponible
                          ? 'bg-slate-50 text-slate-300 cursor-not-allowed line-through'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                    <Clock className="h-3 w-3" /> {slot.horaInicio}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Motivo de la consulta (opcional)</label>
          <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2}
            placeholder="Contanos brevemente el motivo..."
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40 resize-none" />
        </div>

        <button onClick={handleConfirmar} disabled={saving || !slotElegido}
          className="w-full py-3 rounded-xl bg-[#013FF6] text-white text-sm font-semibold hover:bg-[#0033cc] shadow-lg shadow-[#013FF6]/20 disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Confirmar turno
        </button>
      </div>
    </div>
  )
}