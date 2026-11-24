import { useState, useEffect, useCallback } from 'react'
import { CalendarClock, Plus, Trash2, Loader2, Repeat, Check, X, AlertTriangle, CheckCircle2, Save } from 'lucide-react'
import {
  getHorarios, crearHorario, eliminarHorario, getPersonal,
  getCambiosHorario, solicitarCambio, resolverCambio,
} from '../../services/horarioService'
import { useAuth } from '../context/AuthContext'

const TIPOS = { fijo: 'Fijo', guardia: 'Guardia', asignado: 'Asignado' }
const ESTADO_CAMBIO = {
  pendiente: { label: 'Pendiente', bg: '#fef3c7', color: '#b45309' },
  aprobado:  { label: 'Aprobado',  bg: '#dcfce7', color: '#16a34a' },
  rechazado: { label: 'Rechazado', bg: '#fee2e2', color: '#dc2626' },
}
const iso = (d) => d.toISOString().split('T')[0]
const fechaLarga = (f) => new Date(f + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })

function Toast({ msg, type, onClose }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${type === 'success' ? 'bg-emerald-600' : 'bg-red-500'}`}>
      {type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      {msg}
      <button onClick={onClose} className="ml-2 hover:opacity-70"><X className="h-4 w-4" /></button>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40'

function ModalNuevoHorario({ personal, onClose, onCreated }) {
  const [f, setF] = useState({ usuarioId: '', fecha: iso(new Date()), horaInicio: '08:00', horaFin: '16:00', tipo: 'fijo', esGuardia: false })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const guardar = async () => {
    if (!f.usuarioId) return setError('Elegí a quién asignar el horario.')
    if (f.horaFin <= f.horaInicio) return setError('La hora de fin debe ser posterior al inicio.')
    setSaving(true); setError('')
    try { onCreated(await crearHorario({ ...f, esGuardia: f.tipo === 'guardia' })); onClose() }
    catch (err) { setError(err.message || 'Error al guardar.') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-900">Nuevo horario</h2>
        <select value={f.usuarioId} onChange={e => set('usuarioId', e.target.value)} className={inputCls}>
          <option value="">Seleccionar personal...</option>
          {personal.map(p => <option key={p.id} value={p.id}>{p.apellido}, {p.nombre} ({p.rol})</option>)}
        </select>
        <input type="date" value={f.fecha} onChange={e => set('fecha', e.target.value)} className={inputCls} />
        <div className="grid grid-cols-2 gap-3">
          <input type="time" value={f.horaInicio} onChange={e => set('horaInicio', e.target.value)} className={inputCls} />
          <input type="time" value={f.horaFin} onChange={e => set('horaFin', e.target.value)} className={inputCls} />
        </div>
        <div className="flex gap-1.5">
          {Object.entries(TIPOS).map(([k, v]) => (
            <button key={k} onClick={() => set('tipo', k)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold border-2 ${f.tipo === k ? 'bg-[#013FF6] text-white border-transparent' : 'border-slate-200 text-slate-600'}`}>{v}</button>
          ))}
        </div>
        {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={guardar} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#013FF6] text-white text-sm font-semibold hover:bg-[#0033cc] flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalCambio({ horario, personal, miId, onClose, onSent }) {
  const [receptor, setReceptor] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const enviar = async () => {
    if (!receptor) return setError('Elegí con quién querés cambiar.')
    setSaving(true); setError('')
    try { onSent(await solicitarCambio({ horarioOriginalId: horario.id, usuarioSolicitanteId: miId, usuarioReceptorId: receptor })); onClose() }
    catch (err) { setError(err.message || 'No se pudo enviar la solicitud.') }
    finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Pedir cambio de turno</h2>
          <p className="text-xs text-slate-400">{fechaLarga(horario.fecha)} · {horario.horaInicio.slice(0, 5)}–{horario.horaFin.slice(0, 5)}</p>
        </div>
        <select value={receptor} onChange={e => setReceptor(e.target.value)} className={inputCls}>
          <option value="">Colega que tomaría el horario...</option>
          {personal.filter(p => p.id !== miId).map(p => <option key={p.id} value={p.id}>{p.apellido}, {p.nombre}</option>)}
        </select>
        {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={enviar} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#013FF6] text-white text-sm font-semibold hover:bg-[#0033cc] flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Repeat className="h-4 w-4" />} Enviar
          </button>
        </div>
      </div>
    </div>
  )
}

export function GestionHorarios() {
  const { perfil } = useAuth()
  const esAdmin = perfil?.rol === 'administrador'
  const [tab, setTab] = useState('horarios')
  const [horarios, setHorarios] = useState([])
  const [cambios, setCambios]   = useState([])
  const [personal, setPersonal] = useState([])
  const [loading, setLoading]   = useState(true)
  const [toast, setToast]       = useState(null)
  const [modalNuevo, setModalNuevo]   = useState(false)
  const [modalCambio, setModalCambio] = useState(null)

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500) }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const hoy = new Date(); const hasta = new Date(); hasta.setDate(hasta.getDate() + 30)
      const [h, c, p] = await Promise.all([
        getHorarios({ desde: iso(hoy), hasta: iso(hasta), usuarioId: esAdmin ? undefined : perfil.id }),
        getCambiosHorario(), getPersonal(),
      ])
      setHorarios(h || []); setCambios(c || []); setPersonal(p || [])
    } catch (err) { showToast(err.message || 'Error al cargar horarios.', 'error') }
    finally { setLoading(false) }
  }, [esAdmin, perfil?.id])

  useEffect(() => { fetchAll() }, [fetchAll])

  const borrar = async (h) => {
    if (!confirm('¿Eliminar este horario?')) return
    try { await eliminarHorario(h.id); setHorarios(prev => prev.filter(x => x.id !== h.id)); showToast('Horario eliminado.') }
    catch (err) { showToast(err.message || 'No se pudo eliminar.', 'error') }
  }

  const resolver = async (c, aprobar) => {
    try { await resolverCambio(c.id, aprobar); showToast(aprobar ? 'Cambio aprobado: el horario fue transferido.' : 'Cambio rechazado.'); fetchAll() }
    catch (err) { showToast(err.message || 'No se pudo resolver.', 'error') }
  }

  const pendientesParaMi = cambios.filter(c => c.estado === 'pendiente' && (c.usuarioReceptorId === perfil?.id || esAdmin))

  return (
    <div className="space-y-6 max-w-4xl">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <CalendarClock className="h-8 w-8 text-[#013FF6]" /> Horarios
          </h1>
          <p className="text-slate-500 mt-1">{esAdmin ? 'Horarios del personal (próximos 30 días)' : 'Tus horarios de los próximos 30 días'}</p>
        </div>
        {esAdmin && (
          <button onClick={() => setModalNuevo(true)} className="flex items-center gap-2 px-4 py-2.5 bg-[#013FF6] text-white text-sm font-semibold rounded-xl hover:bg-[#0033cc] shadow-lg shadow-[#013FF6]/20">
            <Plus className="h-4 w-4" /> Nuevo horario
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {[['horarios', 'Horarios'], ['cambios', `Cambios de turno${pendientesParaMi.length ? ` (${pendientesParaMi.length})` : ''}`]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border ${tab === k ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto" /></div>
      ) : tab === 'horarios' ? (
        horarios.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-16 text-slate-400">
            <CalendarClock className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-semibold">No hay horarios cargados para este período</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
            {horarios.map(h => (
              <div key={h.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-24 flex-shrink-0 text-sm font-semibold text-slate-700 capitalize">{fechaLarga(h.fecha)}</div>
                <div className="text-sm text-slate-500 w-28 flex-shrink-0">{h.horaInicio.slice(0, 5)} – {h.horaFin.slice(0, 5)}</div>
                <div className="flex-1 min-w-0 text-sm text-slate-700 truncate">
                  {h.usuario ? `${h.usuario.apellido}, ${h.usuario.nombre}` : '—'}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${h.esGuardia ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>{TIPOS[h.tipo] || h.tipo}</span>
                {h.usuarioId === perfil?.id && (
                  <button onClick={() => setModalCambio(h)} title="Pedir cambio de turno" className="p-1.5 rounded-lg text-slate-400 hover:text-[#013FF6] hover:bg-[#013FF6]/10"><Repeat className="h-4 w-4" /></button>
                )}
                {esAdmin && (
                  <button onClick={() => borrar(h)} title="Eliminar" className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        cambios.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-16 text-slate-400">
            <Repeat className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-semibold">No hay solicitudes de cambio</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
            {cambios.map(c => {
              const st = ESTADO_CAMBIO[c.estado]
              const puedeResolver = c.estado === 'pendiente' && (c.usuarioReceptorId === perfil?.id || esAdmin)
              return (
                <div key={c.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800">
                      <span className="font-semibold">{c.solicitante?.apellido}, {c.solicitante?.nombre}</span> cede su horario a{' '}
                      <span className="font-semibold">{c.receptor?.apellido}, {c.receptor?.nombre}</span>
                    </p>
                    <p className="text-xs text-slate-400 capitalize">
                      {c.horario ? `${fechaLarga(c.horario.fecha)} · ${c.horario.horaInicio.slice(0, 5)}–${c.horario.horaFin.slice(0, 5)}` : ''}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
                  {puedeResolver && (
                    <div className="flex gap-1">
                      <button onClick={() => resolver(c, true)} title="Aprobar" className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"><Check className="h-4 w-4" /></button>
                      <button onClick={() => resolver(c, false)} title="Rechazar" className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"><X className="h-4 w-4" /></button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {modalNuevo && <ModalNuevoHorario personal={personal} onClose={() => setModalNuevo(false)} onCreated={h => { setHorarios(prev => [...prev, h].sort((a, b) => a.fecha.localeCompare(b.fecha))); showToast('Horario creado.') }} />}
      {modalCambio && <ModalCambio horario={modalCambio} personal={personal} miId={perfil.id} onClose={() => setModalCambio(null)} onSent={c => { setCambios(prev => [c, ...prev]); setTab('cambios'); showToast('Solicitud enviada.') }} />}
    </div>
  )
}
