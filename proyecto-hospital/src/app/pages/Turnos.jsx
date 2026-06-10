import { useState, useEffect, useCallback } from 'react'
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Search,
  Clock, User, Stethoscope, X, Save, Loader2,
  CheckCircle2, AlertCircle, XCircle, RefreshCw,
  Edit2, Trash2, Phone, CalendarX,
} from 'lucide-react'
import {
  getTurnosByRango, createTurno, updateTurno, cancelarTurno,
  getSlotsDisponibles, getMedicos,
} from '../../services/turnoService'
import { searchPacientes } from '../../services/pacienteService'
import { useAuth } from '../context/AuthContext'

// ── Constantes ────────────────────────────────────────────────
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DIAS_FULL = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const ESTADO_CONFIG = {
  programado: { label: 'Programado', color: '#013FF6', bg: '#dbeafe' },
  confirmado:  { label: 'Confirmado', color: '#059669', bg: '#d1fae5' },
  cancelado:   { label: 'Cancelado',  color: '#6b7280', bg: '#f3f4f6' },
  ausente:     { label: 'Ausente',    color: '#dc2626', bg: '#fee2e2' },
  realizado:   { label: 'Realizado',  color: '#7c3aed', bg: '#ede9fe' },
}

// ── Helpers ───────────────────────────────────────────────────
function isoDate(date) {
  return date.toISOString().split('T')[0]
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function startOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day + 1) // Lunes
  return d
}

// ── Toast ─────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3
      rounded-xl shadow-lg text-white text-sm font-medium
      ${type === 'success' ? 'bg-emerald-600' : 'bg-red-500'}`}>
      {type === 'success'
        ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
        : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
      {msg}
      <button onClick={onClose} className="ml-2 hover:opacity-70">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// ── Modal Nuevo / Editar Turno ────────────────────────────────
function ModalTurno({ turno, fechaInicial, medicos, onClose, onSave, currentUserId }) {
  const isEdit = !!turno

  const [form, setForm] = useState({
    medicoId:     turno?.medicoId    || turno?.medico?.id    || '',
    pacienteId:   turno?.pacienteId  || turno?.paciente?.id  || '',
    fecha:        turno?.fecha       || fechaInicial         || isoDate(new Date()),
    horaInicio:   turno?.horaInicio?.slice(0,5) || '',
    horaFin:      turno?.horaFin?.slice(0,5)    || '',
    motivo:       turno?.motivo      || '',
    observaciones: turno?.observaciones || '',
    estado:       turno?.estado      || 'programado',
  })

  const [slots, setSlots]           = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [pacienteQuery, setPacienteQuery] = useState(
    turno ? `${turno.paciente?.nombre || ''} ${turno.paciente?.apellido || ''}`.trim() : ''
  )
  const [pacienteResults, setPacienteResults] = useState([])
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(
    turno?.paciente || null
  )
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Cargar slots cuando cambia médico o fecha
  useEffect(() => {
    if (!form.medicoId || !form.fecha) { setSlots([]); return }
    setLoadingSlots(true)
    getSlotsDisponibles(form.medicoId, form.fecha)
      .then(s => setSlots(s))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [form.medicoId, form.fecha])

  // Buscar pacientes con debounce
  useEffect(() => {
    if (!pacienteQuery.trim() || pacienteQuery.length < 2) {
      setPacienteResults([])
      return
    }
    if (pacienteSeleccionado) return // ya eligió uno
    const t = setTimeout(async () => {
      try {
        const r = await searchPacientes(pacienteQuery)
        setPacienteResults(r || [])
      } catch { setPacienteResults([]) }
    }, 350)
    return () => clearTimeout(t)
  }, [pacienteQuery, pacienteSeleccionado])

  const selectSlot = (slot) => {
    if (!slot.disponible && !isEdit) return
    setField('horaInicio', slot.horaInicio)
    setField('horaFin',    slot.horaFin)
  }

  const selectPaciente = (p) => {
    setPacienteSeleccionado(p)
    setField('pacienteId', p.id)
    setPacienteQuery(`${p.nombre} ${p.apellido}`)
    setPacienteResults([])
  }

  const clearPaciente = () => {
    setPacienteSeleccionado(null)
    setField('pacienteId', '')
    setPacienteQuery('')
  }

  const handleSave = async () => {
    if (!form.medicoId)    return setError('Seleccioná un médico.')
    if (!form.pacienteId)  return setError('Buscá y seleccioná un paciente.')
    if (!form.fecha)       return setError('Ingresá la fecha.')
    if (!form.horaInicio)  return setError('Seleccioná un horario.')

    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        recepcionistaId: currentUserId,
      }
      if (isEdit) {
        await onSave(await updateTurno(turno.id, payload))
      } else {
        await onSave(await createTurno(payload))
      }
      onClose()
    } catch (err) {
      setError(err.message || 'Error al guardar el turno.')
    } finally {
      setSaving(false)
    }
  }

  const slotsDisp  = slots.filter(s => s.disponible)
  const slotsOcup  = slots.filter(s => !s.disponible)

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEdit ? 'Editar Turno' : 'Nuevo Turno'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEdit ? 'Modificá los datos del turno' : 'Completá los datos para reservar'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Médico */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Médico *
            </label>
            <select
              value={form.medicoId}
              onChange={e => { setField('medicoId', e.target.value); setField('horaInicio', ''); setField('horaFin', '') }}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40"
            >
              <option value="">Seleccionar médico...</option>
              {medicos.map(m => (
                <option key={m.id} value={m.id}>Dr/a. {m.apellido}, {m.nombre}</option>
              ))}
            </select>
          </div>

          {/* Paciente */}
          <div className="relative">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Paciente *
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={pacienteQuery}
                onChange={e => { setPacienteQuery(e.target.value); if (pacienteSeleccionado) clearPaciente() }}
                placeholder="Buscar por nombre o DNI..."
                className="w-full pl-9 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40"
              />
              {pacienteSeleccionado && (
                <button onClick={clearPaciente} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {/* Resultados búsqueda */}
            {pacienteResults.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                {pacienteResults.slice(0, 5).map(p => (
                  <button
                    key={p.id}
                    onClick={() => selectPaciente(p)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#013FF6]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-[#013FF6]">{p.nombre[0]}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{p.nombre} {p.apellido}</p>
                      <p className="text-xs text-slate-400">DNI {p.dni}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {/* Badge paciente seleccionado */}
            {pacienteSeleccionado && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-[#013FF6]/5 rounded-lg border border-[#013FF6]/20">
                <User className="h-4 w-4 text-[#013FF6]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {pacienteSeleccionado.nombre} {pacienteSeleccionado.apellido}
                  </p>
                  <p className="text-xs text-slate-400">DNI {pacienteSeleccionado.dni}</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              </div>
            )}
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fecha *</label>
            <input
              type="date"
              value={form.fecha}
              min={isoDate(new Date())}
              onChange={e => { setField('fecha', e.target.value); setField('horaInicio', ''); setField('horaFin', '') }}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40"
            />
          </div>

          {/* Slots */}
          {form.medicoId && form.fecha && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Horario disponible *
                {loadingSlots && <Loader2 className="inline h-3.5 w-3.5 ml-2 animate-spin text-slate-400" />}
              </label>

              {!loadingSlots && slots.length === 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                  <CalendarX className="h-4 w-4 flex-shrink-0" />
                  El médico no tiene agenda para ese día.
                </div>
              )}

              {!loadingSlots && slots.length > 0 && (
                <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {slots.map(slot => {
                    const isSelected = form.horaInicio === slot.horaInicio
                    const isOcupado  = !slot.disponible && slot.turnoId !== turno?.id

                    return (
                      <button
                        key={slot.horaInicio}
                        onClick={() => !isOcupado && selectSlot(slot)}
                        disabled={isOcupado}
                        className={`px-2 py-2 rounded-lg text-xs font-semibold text-center transition-all
                          ${isSelected
                            ? 'bg-[#013FF6] text-white shadow-sm'
                            : isOcupado
                              ? 'bg-slate-100 text-slate-300 cursor-not-allowed line-through'
                              : 'bg-white border border-slate-200 text-slate-700 hover:border-[#013FF6] hover:text-[#013FF6]'}`}
                      >
                        {slot.horaInicio}
                      </button>
                    )
                  })}
                </div>
              )}

              {slots.length > 0 && (
                <p className="text-xs text-slate-400 mt-2">
                  <span className="font-semibold text-emerald-600">{slotsDisp.length}</span> disponibles ·{' '}
                  <span className="font-semibold text-slate-400">{slotsOcup.length}</span> ocupados
                </p>
              )}
            </div>
          )}

          {/* Motivo */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Motivo de consulta</label>
            <input
              value={form.motivo}
              onChange={e => setField('motivo', e.target.value)}
              placeholder="Ej: Control anual, seguimiento HTA..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40"
            />
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Observaciones</label>
            <textarea
              value={form.observaciones}
              onChange={e => setField('observaciones', e.target.value)}
              rows={2}
              placeholder="Notas adicionales..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40 resize-none"
            />
          </div>

          {/* Estado (solo en edición) */}
          {isEdit && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Estado</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(ESTADO_CONFIG).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => setField('estado', key)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all
                      ${form.estado === key ? 'border-transparent text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                    style={form.estado === key ? { backgroundColor: val.color } : {}}
                  >
                    {val.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-[#013FF6] text-white text-sm font-semibold hover:bg-[#0033cc] flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? 'Guardar cambios' : 'Reservar turno'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Confirmar Cancelación ───────────────────────────────
function ModalCancelar({ turno, onClose, onConfirm }) {
  const [obs, setObs]     = useState('')
  const [saving, setSaving] = useState(false)

  const handleConfirm = async () => {
    setSaving(true)
    try {
      await onConfirm(turno.id, obs)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <CalendarX className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Cancelar turno</h2>
            <p className="text-xs text-slate-400">
              {turno.paciente?.nombre} {turno.paciente?.apellido} — {turno.horaInicio?.slice(0,5)}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Motivo de cancelación (opcional)
            </label>
            <textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              rows={2}
              placeholder="Ej: Paciente no pudo asistir..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400/40 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Volver
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Cancelar turno
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tarjeta de turno ──────────────────────────────────────────
function TurnoCard({ turno, onEdit, onCancelar }) {
  const est = ESTADO_CONFIG[turno.estado] || ESTADO_CONFIG.programado
  const cancelable = ['programado','confirmado'].includes(turno.estado)

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 transition-all hover:shadow-md
      ${turno.estado === 'cancelado' ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Hora */}
        <div className="flex-shrink-0 text-center min-w-[48px]">
          <p className="text-lg font-extrabold text-slate-900 leading-none">
            {turno.horaInicio?.slice(0,5)}
          </p>
          <p className="text-[10px] text-slate-400">{turno.horaFin?.slice(0,5)}</p>
        </div>

        <div className="w-px bg-slate-100 self-stretch flex-shrink-0" />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-slate-900 text-sm">
              {turno.paciente?.nombre} {turno.paciente?.apellido}
            </p>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: est.bg, color: est.color }}
            >
              {est.label}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">DNI {turno.paciente?.dni}</p>

          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Stethoscope className="h-3 w-3" />
              Dr/a. {turno.medico?.apellido}
            </span>
            {turno.motivo && (
              <span className="text-xs text-slate-500 truncate max-w-[180px]">{turno.motivo}</span>
            )}
            {turno.paciente?.telefono && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Phone className="h-3 w-3" />
                {turno.paciente.telefono}
              </span>
            )}
          </div>
        </div>

        {/* Acciones */}
        {cancelable && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onEdit(turno)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-[#013FF6] hover:bg-[#013FF6]/10 transition-colors"
              title="Editar"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => onCancelar(turno)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Cancelar turno"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
export function Turnos() {
  const { perfil } = useAuth()

  const [semanaBase, setSemanaBase]     = useState(() => startOfWeek(new Date()))
  const [diaSeleccionado, setDiaSel]   = useState(isoDate(new Date()))
  const [filtroMedico, setFiltroMedico] = useState('')
  const [medicos, setMedicos]           = useState([])
  const [turnosRango, setTurnosRango]   = useState([])
  const [loading, setLoading]           = useState(true)

  const [modalNuevo, setModalNuevo]     = useState(false)
  const [modalEdit, setModalEdit]       = useState(null)
  const [modalCancelar, setModalCancelar] = useState(null)
  const [toast, setToast]               = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Semana actual: lunes a domingo
  const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(semanaBase, i))
  const desde = isoDate(diasSemana[0])
  const hasta = isoDate(diasSemana[6])

  const fetchTurnos = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getTurnosByRango(desde, hasta, filtroMedico || null)
      setTurnosRango(data || [])
    } catch (err) {
      console.error(err)
      showToast('Error al cargar turnos.', 'error')
    } finally {
      setLoading(false)
    }
  }, [desde, hasta, filtroMedico])

  useEffect(() => {
    getMedicos().then(setMedicos).catch(console.error)
  }, [])

  useEffect(() => { fetchTurnos() }, [fetchTurnos])

  // Turnos del día seleccionado
  const turnosDia = turnosRango
    .filter(t => t.fecha === diaSeleccionado)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))

  // Contar turnos por día para el mini-calendario
  const countByDay = {}
  turnosRango.forEach(t => {
    countByDay[t.fecha] = (countByDay[t.fecha] || 0) + 1
  })

  const handleNuevoTurno = async (turno) => {
    setTurnosRango(prev => [
      ...prev.filter(t => t.id !== turno.id),
      turno,
    ])
    showToast('Turno reservado correctamente.')
  }

  const handleEditTurno = async (turno) => {
    setTurnosRango(prev => prev.map(t => t.id === turno.id ? turno : t))
    showToast('Turno actualizado.')
  }

  const handleCancelar = async (id, obs) => {
    try {
      const updated = await cancelarTurno(id, obs)
      setTurnosRango(prev => prev.map(t => t.id === id ? updated : t))
      showToast('Turno cancelado.')
    } catch (err) {
      showToast(err.message || 'Error al cancelar.', 'error')
      throw err
    }
  }

  const semanaLabel = () => {
    const ini = diasSemana[0]
    const fin = diasSemana[6]
    if (ini.getMonth() === fin.getMonth()) {
      return `${ini.getDate()} – ${fin.getDate()} de ${MESES[ini.getMonth()]} ${ini.getFullYear()}`
    }
    return `${ini.getDate()} ${MESES[ini.getMonth()]} – ${fin.getDate()} ${MESES[fin.getMonth()]} ${fin.getFullYear()}`
  }

  const today = isoDate(new Date())

  return (
    <div className="space-y-6 max-w-5xl">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Calendar className="h-8 w-8 text-[#013FF6]" />
            Turnos
          </h1>
          <p className="text-slate-500 mt-1">Agenda de consultas y gestión de reservas</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTurnos}
            disabled={loading}
            className="p-2.5 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setModalNuevo(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#013FF6] text-white text-sm font-semibold rounded-xl hover:bg-[#0033cc] shadow-lg shadow-[#013FF6]/20 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nuevo Turno
          </button>
        </div>
      </div>

      {/* Filtro médico */}
      <div className="flex items-center gap-3">
        <Stethoscope className="h-4 w-4 text-slate-400 flex-shrink-0" />
        <select
          value={filtroMedico}
          onChange={e => setFiltroMedico(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40 bg-white"
        >
          <option value="">Todos los médicos</option>
          {medicos.map(m => (
            <option key={m.id} value={m.id}>Dr/a. {m.apellido}, {m.nombre}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Mini calendario semanal ──────────────────────── */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

            {/* Navegación semana */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <button
                onClick={() => setSemanaBase(s => addDays(s, -7))}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-xs font-semibold text-slate-600 text-center">
                {semanaLabel()}
              </p>
              <button
                onClick={() => setSemanaBase(s => addDays(s, 7))}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Días */}
            <div className="p-3 space-y-1">
              {diasSemana.map(dia => {
                const iso    = isoDate(dia)
                const isHoy  = iso === today
                const isSel  = iso === diaSeleccionado
                const count  = countByDay[iso] || 0

                return (
                  <button
                    key={iso}
                    onClick={() => setDiaSel(iso)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all
                      ${isSel
                        ? 'bg-[#013FF6] text-white'
                        : isHoy
                          ? 'bg-[#ACEC00]/20 text-slate-900'
                          : 'hover:bg-slate-50 text-slate-700'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`text-xs font-semibold w-8 ${isSel ? 'text-white/70' : 'text-slate-400'}`}>
                        {DIAS[dia.getDay()]}
                      </span>
                      <span className="text-sm font-bold">
                        {dia.getDate()}
                      </span>
                      {isHoy && !isSel && (
                        <span className="text-[9px] font-bold text-[#013FF6] bg-[#013FF6]/10 px-1.5 py-0.5 rounded-full">
                          Hoy
                        </span>
                      )}
                    </div>
                    {count > 0 && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                        ${isSel ? 'bg-white/20 text-white' : 'bg-[#013FF6]/10 text-[#013FF6]'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Ir a hoy */}
            <div className="px-3 pb-3">
              <button
                onClick={() => { setSemanaBase(startOfWeek(new Date())); setDiaSel(today) }}
                className="w-full py-2 text-xs font-semibold text-[#013FF6] border border-[#013FF6]/20 rounded-xl hover:bg-[#013FF6]/5 transition-colors"
              >
                Ir a hoy
              </button>
            </div>
          </div>
        </div>

        {/* ── Lista de turnos del día ──────────────────────── */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

            {/* Header día */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">
                  {DIAS_FULL[new Date(diaSeleccionado + 'T00:00:00').getDay()]}{' '}
                  {new Date(diaSeleccionado + 'T00:00:00').getDate()} de{' '}
                  {MESES[new Date(diaSeleccionado + 'T00:00:00').getMonth()]}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {turnosDia.filter(t => t.estado !== 'cancelado').length} turno{turnosDia.filter(t => t.estado !== 'cancelado').length !== 1 ? 's' : ''} activo{turnosDia.filter(t => t.estado !== 'cancelado').length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setModalNuevo(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#013FF6] border border-[#013FF6]/20 px-3 py-1.5 rounded-lg hover:bg-[#013FF6]/5"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar
              </button>
            </div>

            {/* Turnos */}
            <div className="p-4 space-y-2">
              {loading
                ? Array(3).fill(0).map((_, i) => (
                    <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-xl" />
                  ))
                : turnosDia.length === 0
                  ? (
                    <div className="flex flex-col items-center justify-center py-14 text-slate-400">
                      <Calendar className="h-10 w-10 mb-3 opacity-30" />
                      <p className="font-medium text-sm">Sin turnos para este día</p>
                      <button
                        onClick={() => setModalNuevo(true)}
                        className="mt-3 text-xs font-semibold text-[#013FF6] hover:underline"
                      >
                        Reservar el primero →
                      </button>
                    </div>
                  )
                  : turnosDia.map(t => (
                      <TurnoCard
                        key={t.id}
                        turno={t}
                        onEdit={setModalEdit}
                        onCancelar={setModalCancelar}
                      />
                    ))
              }
            </div>
          </div>
        </div>
      </div>

      {/* Modales */}
      {modalNuevo && (
        <ModalTurno
          fechaInicial={diaSeleccionado}
          medicos={medicos}
          onClose={() => setModalNuevo(false)}
          onSave={handleNuevoTurno}
          currentUserId={perfil?.id}
        />
      )}

      {modalEdit && (
        <ModalTurno
          turno={modalEdit}
          medicos={medicos}
          onClose={() => setModalEdit(null)}
          onSave={handleEditTurno}
          currentUserId={perfil?.id}
        />
      )}

      {modalCancelar && (
        <ModalCancelar
          turno={modalCancelar}
          onClose={() => setModalCancelar(null)}
          onConfirm={handleCancelar}
        />
      )}
    </div>
  )
}