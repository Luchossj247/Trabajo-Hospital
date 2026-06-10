import { useState, useEffect, useCallback } from 'react'
import {
  CalendarDays, Plus, Edit2, Trash2, X, Save,
  Loader2, CheckCircle2, AlertCircle, RefreshCw,
  Stethoscope, Clock, ToggleLeft, ToggleRight,
} from 'lucide-react'
import {
  getTodasAgendas, createAgenda, updateAgenda, deleteAgenda, getMedicos,
} from '../../services/turnoService'

// ── Constantes ────────────────────────────────────────────────
const DIAS_SEMANA = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
]

const SLOTS_OPTIONS = [15, 20, 30, 45, 60]

const EMPTY_FORM = {
  medicoId:     '',
  diaSemana:    1,
  horaInicio:   '08:00',
  horaFin:      '13:00',
  duracionSlot: 30,
  activo:       true,
}

// ── Calcular cantidad de turnos que genera una franja ─────────
function calcularSlots(horaInicio, horaFin, duracion) {
  if (!horaInicio || !horaFin || !duracion) return 0
  const [hIni, mIni] = horaInicio.split(':').map(Number)
  const [hFin, mFin] = horaFin.split(':').map(Number)
  const totalMin = (hFin * 60 + mFin) - (hIni * 60 + mIni)
  if (totalMin <= 0) return 0
  return Math.floor(totalMin / duracion)
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

// ── Modal Crear / Editar Franja ───────────────────────────────
function ModalAgenda({ agenda, medicos, onClose, onSave }) {
  const isEdit = !!agenda
  const [form, setForm] = useState(
    isEdit
      ? {
          medicoId:     agenda.medicoId,
          diaSemana:    agenda.diaSemana,
          horaInicio:   agenda.horaInicio?.slice(0,5) || '08:00',
          horaFin:      agenda.horaFin?.slice(0,5)    || '13:00',
          duracionSlot: agenda.duracionSlot,
          activo:       agenda.activo,
        }
      : { ...EMPTY_FORM }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const slotsPreview = calcularSlots(form.horaInicio, form.horaFin, form.duracionSlot)

  const handleSave = async () => {
    if (!form.medicoId)    return setError('Seleccioná un médico.')
    if (!form.horaInicio || !form.horaFin) return setError('Completá los horarios.')
    if (form.horaFin <= form.horaInicio)   return setError('La hora de fin debe ser mayor a la de inicio.')
    if (slotsPreview === 0)                return setError('Con esa configuración no se generan turnos.')

    setSaving(true)
    setError('')
    try {
      if (isEdit) {
        await onSave(await updateAgenda(agenda.id, form))
      } else {
        await onSave(await createAgenda(form))
      }
      onClose()
    } catch (err) {
      setError(err.message || 'Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEdit ? 'Editar franja horaria' : 'Nueva franja horaria'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Define cuándo atiende el médico y la duración de cada turno
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Médico */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Médico *</label>
            <select
              value={form.medicoId}
              onChange={e => setField('medicoId', e.target.value)}
              disabled={isEdit}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40 disabled:opacity-50 disabled:bg-slate-50"
            >
              <option value="">Seleccionar médico...</option>
              {medicos.map(m => (
                <option key={m.id} value={m.id}>Dr/a. {m.apellido}, {m.nombre}</option>
              ))}
            </select>
          </div>

          {/* Día de semana */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Día de la semana *</label>
            <div className="grid grid-cols-4 gap-1.5">
              {DIAS_SEMANA.map(d => (
                <button
                  key={d.value}
                  onClick={() => setField('diaSemana', d.value)}
                  className={`py-2 rounded-lg text-xs font-semibold transition-all
                    ${form.diaSemana === d.value
                      ? 'bg-[#013FF6] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {d.label.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Horarios */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Hora inicio *</label>
              <input
                type="time"
                value={form.horaInicio}
                onChange={e => setField('horaInicio', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Hora fin *</label>
              <input
                type="time"
                value={form.horaFin}
                onChange={e => setField('horaFin', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40"
              />
            </div>
          </div>

          {/* Duración slot */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Duración por turno
            </label>
            <div className="flex gap-2">
              {SLOTS_OPTIONS.map(min => (
                <button
                  key={min}
                  onClick={() => setField('duracionSlot', min)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all
                    ${form.duracionSlot === min
                      ? 'bg-[#013FF6] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {min}min
                </button>
              ))}
            </div>
          </div>

          {/* Preview slots */}
          {slotsPreview > 0 && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-[#ACEC00]/15 border border-[#ACEC00]/30 rounded-xl">
              <Clock className="h-4 w-4 text-slate-600 flex-shrink-0" />
              <p className="text-sm font-semibold text-slate-700">
                Se generarán <span className="text-[#013FF6]">{slotsPreview} turnos</span> por día
              </p>
            </div>
          )}

          {/* Toggle activo */}
          <div
            className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer"
            onClick={() => setField('activo', !form.activo)}
          >
            <div>
              <p className="text-sm font-semibold text-slate-700">Franja activa</p>
              <p className="text-xs text-slate-400">Los recepcionistas pueden reservar turnos en este horario</p>
            </div>
            {form.activo
              ? <ToggleRight className="h-6 w-6 text-[#013FF6]" />
              : <ToggleLeft  className="h-6 w-6 text-slate-300" />
            }
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
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
            {isEdit ? 'Guardar cambios' : 'Crear franja'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
export function GestionAgenda() {
  const [agendas, setAgendas]       = useState([])
  const [medicos, setMedicos]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [filtroMedico, setFiltro]   = useState('')
  const [modalNueva, setModalNueva] = useState(false)
  const [modalEdit, setModalEdit]   = useState(null)
  const [toast, setToast]           = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchAgendas = useCallback(async () => {
    setLoading(true)
    try {
      const [a, m] = await Promise.all([getTodasAgendas(), getMedicos()])
      setAgendas(a || [])
      setMedicos(m || [])
    } catch (err) {
      showToast('Error al cargar agendas.', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAgendas() }, [fetchAgendas])

  const handleCrear = (nueva) => {
    setAgendas(prev => [...prev, nueva])
    showToast('Franja creada correctamente.')
  }

  const handleEditar = (updated) => {
    setAgendas(prev => prev.map(a => a.id === updated.id ? updated : a))
    showToast('Franja actualizada.')
  }

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar esta franja horaria? Los turnos ya reservados no se verán afectados.')) return
    try {
      await deleteAgenda(id)
      setAgendas(prev => prev.filter(a => a.id !== id))
      showToast('Franja eliminada.')
    } catch (err) {
      showToast(err.message || 'Error al eliminar.', 'error')
    }
  }

  const handleToggleActivo = async (agenda) => {
    try {
      const updated = await updateAgenda(agenda.id, { activo: !agenda.activo })
      setAgendas(prev => prev.map(a => a.id === agenda.id ? { ...a, ...updated } : a))
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  // Agrupar por médico
  const filtered = filtroMedico
    ? agendas.filter(a => a.medicoId === filtroMedico)
    : agendas

  const porMedico = filtered.reduce((acc, a) => {
    const key = a.medicoId
    if (!acc[key]) acc[key] = { medico: a.medico, franjas: [] }
    acc[key].franjas.push(a)
    return acc
  }, {})

  return (
    <div className="space-y-6 max-w-4xl">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <CalendarDays className="h-8 w-8 text-[#013FF6]" />
            Agenda Médica
          </h1>
          <p className="text-slate-500 mt-1">
            Configurá los horarios de atención de cada médico
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAgendas}
            disabled={loading}
            className="p-2.5 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setModalNueva(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#013FF6] text-white text-sm font-semibold rounded-xl hover:bg-[#0033cc] shadow-lg shadow-[#013FF6]/20 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nueva franja
          </button>
        </div>
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-3">
        <Stethoscope className="h-4 w-4 text-slate-400 flex-shrink-0" />
        <select
          value={filtroMedico}
          onChange={e => setFiltro(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40 bg-white"
        >
          <option value="">Todos los médicos</option>
          {medicos.map(m => (
            <option key={m.id} value={m.id}>Dr/a. {m.apellido}, {m.nombre}</option>
          ))}
        </select>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="space-y-4">
          {Array(2).fill(0).map((_, i) => (
            <div key={i} className="h-40 bg-slate-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : Object.keys(porMedico).length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <CalendarDays className="h-12 w-12 mb-3 opacity-20" />
            <p className="font-semibold">Sin agendas configuradas</p>
            <p className="text-sm mt-1">Creá la primera franja horaria para un médico</p>
            <button
              onClick={() => setModalNueva(true)}
              className="mt-4 text-sm font-semibold text-[#013FF6] hover:underline"
            >
              Crear primera franja →
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.values(porMedico).map(({ medico, franjas }) => (
            <div key={medico?.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

              {/* Header médico */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#013FF6]/10 flex items-center justify-center">
                    <Stethoscope className="h-5 w-5 text-[#013FF6]" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">
                      Dr/a. {medico?.apellido}, {medico?.nombre}
                    </p>
                    <p className="text-xs text-slate-400">
                      {franjas.filter(f => f.activo).length} franja{franjas.filter(f => f.activo).length !== 1 ? 's' : ''} activa{franjas.filter(f => f.activo).length !== 1 ? 's' : ''}
                      {' · '}
                      {franjas.filter(f => f.activo).reduce((sum, f) => sum + calcularSlots(f.horaInicio?.slice(0,5), f.horaFin?.slice(0,5), f.duracionSlot), 0)} turnos/semana aprox.
                    </p>
                  </div>
                </div>
              </div>

              {/* Franjas */}
              <div className="divide-y divide-slate-100">
                {franjas
                  .sort((a, b) => a.diaSemana - b.diaSemana || a.horaInicio.localeCompare(b.horaInicio))
                  .map(franja => {
                    const dia = DIAS_SEMANA.find(d => d.value === franja.diaSemana)
                    const slots = calcularSlots(
                      franja.horaInicio?.slice(0,5),
                      franja.horaFin?.slice(0,5),
                      franja.duracionSlot
                    )

                    return (
                      <div
                        key={franja.id}
                        className={`flex items-center gap-4 px-5 py-3.5 transition-colors
                          ${!franja.activo ? 'opacity-50' : 'hover:bg-slate-50/50'}`}
                      >
                        {/* Día */}
                        <div className="w-24 flex-shrink-0">
                          <span className="text-sm font-bold text-slate-900">{dia?.label}</span>
                        </div>

                        {/* Horario */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-sm font-semibold text-slate-700">
                            {franja.horaInicio?.slice(0,5)} – {franja.horaFin?.slice(0,5)}
                          </span>
                        </div>

                        {/* Duración */}
                        <span className="text-xs text-slate-500 flex-shrink-0">
                          {franja.duracionSlot} min/turno
                        </span>

                        {/* Slots */}
                        <span className="text-xs font-semibold text-[#013FF6] bg-[#013FF6]/10 px-2 py-0.5 rounded-full flex-shrink-0">
                          {slots} turnos
                        </span>

                        {/* Estado */}
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0
                          ${franja.activo
                            ? 'bg-[#ACEC00]/20 text-slate-700'
                            : 'bg-slate-100 text-slate-400'}`}>
                          {franja.activo ? 'Activa' : 'Inactiva'}
                        </span>

                        {/* Acciones */}
                        <div className="ml-auto flex items-center gap-1">
                          <button
                            onClick={() => handleToggleActivo(franja)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#013FF6] hover:bg-[#013FF6]/10 transition-colors"
                            title={franja.activo ? 'Desactivar' : 'Activar'}
                          >
                            {franja.activo
                              ? <ToggleRight className="h-4 w-4 text-[#013FF6]" />
                              : <ToggleLeft  className="h-4 w-4" />
                            }
                          </button>
                          <button
                            onClick={() => setModalEdit(franja)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#013FF6] hover:bg-[#013FF6]/10 transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEliminar(franja.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modales */}
      {modalNueva && (
        <ModalAgenda
          medicos={medicos}
          onClose={() => setModalNueva(false)}
          onSave={handleCrear}
        />
      )}
      {modalEdit && (
        <ModalAgenda
          agenda={modalEdit}
          medicos={medicos}
          onClose={() => setModalEdit(null)}
          onSave={handleEditar}
        />
      )}
    </div>
  )
}