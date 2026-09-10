import { useState, useEffect, useCallback } from 'react'
import {
  HeartPulse, Plus, X, Save, Loader2, Search, Clock, User,
  AlertTriangle, CheckCircle2, MessageSquare, Send, ArrowRightCircle,
  LogOut, Ambulance, RefreshCw, ShieldAlert, Pill,
} from 'lucide-react'
import {
  getColaGuardia, crearIngresoGuardia, actualizarTriaje,
  cambiarEstadoGuardia, getComentarios, addComentario,
} from '../../services/triajeService'
import { searchPacientes } from '../../services/pacienteService'
import { crearReceta } from '../../services/recetaService'
import { useAuth } from '../context/AuthContext'

// ── Niveles de triaje (estilo ESI/Manchester) ─────────────────────
const NIVELES = [
  { valor: 1, label: 'Rojo — Resucitación',  color: '#ef4444' },
  { valor: 2, label: 'Naranja — Emergencia', color: '#f97316' },
  { valor: 3, label: 'Amarillo — Urgente',   color: '#eab308' },
  { valor: 4, label: 'Verde — Menor urgencia', color: '#22c55e' },
  { valor: 5, label: 'Azul — No urgente',    color: '#3b82f6' },
]

const MEDIOS_INGRESO = [
  { value: 'ambulatorio', label: 'Ambulatorio' },
  { value: 'ambulancia',  label: 'Ambulancia' },
  { value: 'derivacion',  label: 'Derivación' },
  { value: 'traslado',    label: 'Traslado' },
  { value: 'otro',        label: 'Otro' },
]

function nivelInfo(n) {
  return NIVELES.find(x => x.valor === n) || { label: 'Sin evaluar', color: '#94a3b8' }
}

function minutosEspera(iso) {
  if (!iso) return 0
  return Math.floor((Date.now() - new Date(iso)) / 60000)
}

function Toast({ msg, type, onClose }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl
      shadow-lg text-white text-sm font-medium
      ${type === 'success' ? 'bg-emerald-600' : 'bg-red-500'}`}>
      {type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      {msg}
      <button onClick={onClose} className="ml-2 hover:opacity-70"><X className="h-4 w-4" /></button>
    </div>
  )
}

// ── Modal: nuevo ingreso a guardia ─────────────────────────────────
function ModalNuevoIngreso({ onClose, onCreated, enfermeroId }) {
  const [query, setQuery]           = useState('')
  const [resultados, setResultados] = useState([])
  const [paciente, setPaciente]     = useState(null)
  const [form, setForm] = useState({
    medioIngreso: 'ambulatorio', estadoIngreso: '', comentarioTriage: '',
    nivelTriage: '', comentarioAnalisis: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    if (!query.trim() || query.length < 2 || paciente) { setResultados([]); return }
    const t = setTimeout(async () => {
      try { setResultados(await searchPacientes(query) || []) } catch { setResultados([]) }
    }, 350)
    return () => clearTimeout(t)
  }, [query, paciente])

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!paciente) return setError('Buscá y seleccioná un paciente.')
    if (!form.nivelTriage) return setError('Asigná un nivel de triaje.')
    setSaving(true); setError('')
    try {
      const nueva = await crearIngresoGuardia({ pacienteId: paciente.id, enfermeroId, ...form })
      onCreated(nueva)
      onClose()
    } catch (err) {
      setError(err.message || 'Error al registrar el ingreso.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Nuevo ingreso a guardia</h2>
            <p className="text-xs text-slate-400 mt-0.5">Registro de enfermería — triaje inicial</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Paciente */}
          <div className="relative">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Paciente *</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={paciente ? `${paciente.nombre} ${paciente.apellido} - DNI ${paciente.dni}` : query}
                onChange={e => { setQuery(e.target.value); setPaciente(null) }}
                placeholder="Buscar por nombre o DNI..."
                className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
            </div>
            {resultados.length > 0 && !paciente && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {resultados.map(p => (
                  <button key={p.id} onClick={() => { setPaciente(p); setQuery('') }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 text-sm border-b border-slate-50 last:border-0">
                    <p className="font-semibold text-slate-800">{p.nombre} {p.apellido}</p>
                    <p className="text-xs text-slate-400">DNI {p.dni}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Medio de ingreso</label>
            <div className="flex flex-wrap gap-1.5">
              {MEDIOS_INGRESO.map(m => (
                <button key={m.value} onClick={() => setField('medioIngreso', m.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                    ${form.medioIngreso === m.value ? 'bg-[#013FF6] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Estado al ingresar</label>
            <input value={form.estadoIngreso} onChange={e => setField('estadoIngreso', e.target.value)}
              placeholder="Ej: consciente, estable, dolor agudo..."
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Motivo de consulta / comentario de triaje</label>
            <textarea value={form.comentarioTriage} onChange={e => setField('comentarioTriage', e.target.value)}
              rows={2} placeholder="Motivo por el que ingresa el paciente..."
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40 resize-none" />
          </div>

          {/* Nivel de triaje */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Nivel de triaje *</label>
            <div className="space-y-1.5">
              {NIVELES.map(n => (
                <button key={n.valor} onClick={() => setField('nivelTriage', n.valor)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-all
                    ${form.nivelTriage === n.valor ? 'border-transparent text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                  style={form.nivelTriage === n.valor ? { backgroundColor: n.color } : {}}>
                  <ShieldAlert className="h-4 w-4 flex-shrink-0" /> {n.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Comentarios de análisis (opcional)</label>
            <textarea value={form.comentarioAnalisis} onChange={e => setField('comentarioAnalisis', e.target.value)}
              rows={2} placeholder="Observaciones adicionales del análisis inicial..."
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40 resize-none" />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {error}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-[#013FF6] text-white text-sm font-semibold hover:bg-[#0033cc] flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Registrar ingreso
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: editar triaje / reordenar manualmente ───────────────────
function ModalEditarTriaje({ guardia, onClose, onSaved }) {
  const [nivel, setNivel]           = useState(guardia.nivelTriage || '')
  const [comentario, setComentario] = useState(guardia.comentarioAnalisis || '')
  const [reordenado, setReordenado] = useState(guardia.reordenadoManual || false)
  const [justificacion, setJustificacion] = useState(guardia.justificacionTriage || '')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const nivelCambio = nivel !== guardia.nivelTriage

  const handleSave = async () => {
    if (!nivel) return setError('Seleccioná un nivel de triaje.')
    if (nivelCambio && reordenado && !justificacion.trim()) {
      return setError('El reordenamiento manual requiere una justificación.')
    }
    setSaving(true); setError('')
    try {
      const updated = await actualizarTriaje(guardia.id, {
        nivelTriage: nivel,
        comentarioAnalisis: comentario || null,
        reordenadoManual: reordenado,
        justificacionTriage: reordenado ? justificacion : null,
      })
      onSaved(updated)
      onClose()
    } catch (err) {
      setError(err.message || 'Error al guardar.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Editar triaje</h2>
            <p className="text-sm text-slate-400 mt-0.5">{guardia.paciente?.nombre} {guardia.paciente?.apellido}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Nivel de triaje</label>
            <div className="space-y-1.5">
              {NIVELES.map(n => (
                <button key={n.valor} onClick={() => setNivel(n.valor)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-all
                    ${nivel === n.valor ? 'border-transparent text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                  style={nivel === n.valor ? { backgroundColor: n.color } : {}}>
                  <ShieldAlert className="h-4 w-4 flex-shrink-0" /> {n.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Comentarios de análisis</label>
            <textarea value={comentario} onChange={e => setComentario(e.target.value)} rows={3}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40 resize-none" />
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={reordenado} onChange={e => setReordenado(e.target.checked)} className="rounded" />
            Reordenamiento manual de la cola
          </label>

          {reordenado && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Justificación *</label>
              <textarea value={justificacion} onChange={e => setJustificacion(e.target.value)} rows={2}
                placeholder="Motivo del reordenamiento manual..."
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40 resize-none" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-[#013FF6] text-white text-sm font-semibold hover:bg-[#0033cc] flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: comentarios adicionales (con fecha y hora) ──────────────
function ModalComentarios({ guardia, onClose, usuarioId }) {
  const [comentarios, setComentarios] = useState([])
  const [loading, setLoading]         = useState(true)
  const [nuevo, setNuevo]             = useState('')
  const [enviando, setEnviando]       = useState(false)

  const fetchComentarios = useCallback(async () => {
    setLoading(true)
    try { setComentarios(await getComentarios(guardia.id)) } catch { setComentarios([]) } finally { setLoading(false) }
  }, [guardia.id])

  useEffect(() => { fetchComentarios() }, [fetchComentarios])

  const handleEnviar = async () => {
    if (!nuevo.trim()) return
    setEnviando(true)
    try {
      const c = await addComentario(guardia.id, usuarioId, nuevo.trim())
      setComentarios(prev => [...prev, c])
      setNuevo('')
    } catch { /* noop */ } finally { setEnviando(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-[#013FF6]" /> Comentarios
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{guardia.paciente?.nombre} {guardia.paciente?.apellido}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-400 mx-auto" />
          ) : comentarios.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Sin comentarios todavía.</p>
          ) : comentarios.map(c => (
            <div key={c.id} className="bg-slate-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-700">{c.usuario?.nombre} {c.usuario?.apellido}</span>
                <span className="text-[10px] text-slate-400">
                  {new Date(c.createdAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-slate-700">{c.contenido}</p>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 flex gap-2">
          <input value={nuevo} onChange={e => setNuevo(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEnviar()}
            placeholder="Agregar comentario..."
            className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
          <button onClick={handleEnviar} disabled={enviando || !nuevo.trim()}
            className="px-4 py-2.5 rounded-xl bg-[#013FF6] text-white disabled:opacity-50">
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: recetar medicamentos (solo si el paciente está en_atencion) ────
function ModalRecetar({ guardia, medicoId, onClose, onCreated }) {
  const [items, setItems] = useState([{ medicamentoNombre: '', dosis: '', frecuencia: '', indicaciones: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const setItem = (i, campo, valor) =>
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [campo]: valor } : it))

  const addItem = () => setItems(prev => [...prev, { medicamentoNombre: '', dosis: '', frecuencia: '', indicaciones: '' }])
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    const validos = items.filter(it => it.medicamentoNombre.trim())
    if (validos.length === 0) return setError('Agregá al menos un medicamento con nombre.')
    setSaving(true); setError('')
    try {
      const receta = await crearReceta({ guardiaId: guardia.id, medicoId, items: validos })
      onCreated(receta)
      onClose()
    } catch (err) {
      setError(err.message || 'Error al generar la receta.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Recetar medicamentos</h2>
            <p className="text-xs text-slate-400 mt-0.5">{guardia.paciente?.nombre} {guardia.paciente?.apellido} — se envía a Farmacia sin verificar stock</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {items.map((it, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-3 space-y-2 relative">
              {items.length > 1 && (
                <button onClick={() => removeItem(i)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500">
                  <X className="h-4 w-4" />
                </button>
              )}
              <input value={it.medicamentoNombre} onChange={e => setItem(i, 'medicamentoNombre', e.target.value)}
                placeholder="Medicamento *"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
              <div className="grid grid-cols-2 gap-2">
                <input value={it.dosis} onChange={e => setItem(i, 'dosis', e.target.value)}
                  placeholder="Dosis (ej: 500mg)"
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
                <input value={it.frecuencia} onChange={e => setItem(i, 'frecuencia', e.target.value)}
                  placeholder="Frecuencia (ej: cada 8hs)"
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
              </div>
              <input value={it.indicaciones} onChange={e => setItem(i, 'indicaciones', e.target.value)}
                placeholder="Indicaciones adicionales (opcional)"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
            </div>
          ))}

          <button onClick={addItem} className="text-xs font-semibold text-[#013FF6] hover:underline">
            + Agregar otro medicamento
          </button>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {error}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-[#013FF6] text-white text-sm font-semibold hover:bg-[#0033cc] flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enviar a Farmacia
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Fila de paciente en la cola ─────────────────────────────────────
function FilaGuardia({ item, posicion, onEditar, onComentarios, onAtender, onAlta, onRecetar }) {
  const nivel  = nivelInfo(item.nivelTriage)
  const espera = minutosEspera(item.ingresoAt)

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors border-b border-slate-100/80 last:border-0">
      <span className="w-7 text-center text-sm font-extrabold text-slate-400 flex-shrink-0">{posicion}</span>

      <span
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black text-white flex-shrink-0"
        style={{ backgroundColor: nivel.color }}
        title={nivel.label}
      >
        {item.nivelTriage || '?'}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate flex items-center gap-1.5">
          {item.paciente?.nombre} {item.paciente?.apellido}
          {item.reordenadoManual && (
            <span title={item.justificacionTriage} className="text-amber-500"><ShieldAlert className="h-3.5 w-3.5" /></span>
          )}
        </p>
        <p className="text-xs text-slate-400 truncate">DNI {item.paciente?.dni} · {item.comentarioTriage || 'sin motivo registrado'}</p>
      </div>

      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 flex-shrink-0">
        <Ambulance className="h-3 w-3" /> {item.medioIngreso}
      </span>

      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0
        ${item.estado === 'en_atencion' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
        {item.estado === 'en_atencion' ? 'En atención' : 'En espera'}
      </span>

      <div className="hidden lg:flex items-center gap-1 text-xs text-slate-400 flex-shrink-0 w-16 justify-end">
        <Clock className="h-3 w-3" /> {espera} min
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={() => onEditar(item)} title="Editar triaje" className="p-1.5 rounded-lg text-slate-400 hover:text-[#013FF6] hover:bg-[#013FF6]/10"><ShieldAlert className="h-4 w-4" /></button>
        <button onClick={() => onComentarios(item)} title="Comentarios" className="p-1.5 rounded-lg text-slate-400 hover:text-[#013FF6] hover:bg-[#013FF6]/10"><MessageSquare className="h-4 w-4" /></button>
        {item.estado === 'en_espera' && (
          <button onClick={() => onAtender(item)} title="Pasar a atención" className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"><ArrowRightCircle className="h-4 w-4" /></button>
        )}
        {item.estado === 'en_atencion' && (
          <button onClick={() => onRecetar(item)} title="Recetar medicamentos" className="p-1.5 rounded-lg text-slate-400 hover:text-[#013FF6] hover:bg-[#013FF6]/10"><Pill className="h-4 w-4" /></button>
        )}
        <button onClick={() => onAlta(item)} title="Dar de alta" className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"><LogOut className="h-4 w-4" /></button>
      </div>
    </div>
  )
}

// ── Componente principal ────────────────────────────────────────────
export function Triaje() {
  const { perfil } = useAuth()
  const [cola, setCola]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [toast, setToast]         = useState(null)
  const [modalNuevo, setModalNuevo]   = useState(false)
  const [modalEditar, setModalEditar] = useState(null)
  const [modalComentarios, setModalComentarios] = useState(null)
  const [modalRecetar, setModalRecetar] = useState(null)

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const fetchCola = useCallback(async () => {
    setLoading(true)
    try { setCola(await getColaGuardia()) }
    catch (err) { showToast(err.message || 'Error al cargar la cola.', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchCola() }, [fetchCola])

  const handleCreated = (nueva) => { setCola(prev => [...prev, nueva]); showToast('Ingreso registrado.') }
  const handleSaved   = (upd)   => { setCola(prev => prev.map(g => g.id === upd.id ? { ...g, ...upd } : g)); showToast('Triaje actualizado.') }

  const handleAtender = async (item) => {
    try {
      const upd = await cambiarEstadoGuardia(item.id, 'en_atencion', perfil?.rol === 'medico' ? perfil.id : item.medicoId)
      setCola(prev => prev.map(g => g.id === item.id ? { ...g, ...upd } : g))
    } catch (err) { showToast(err.message, 'error') }
  }

  const handleAlta = async (item) => {
    if (!confirm(`¿Dar de alta a ${item.paciente?.nombre}?`)) return
    try {
      const upd = await cambiarEstadoGuardia(item.id, 'alta')
      setCola(prev => prev.filter(g => g.id !== item.id))
      showToast('Paciente dado de alta.')
    } catch (err) { showToast(err.message, 'error') }
  }

  const enEspera   = cola.filter(g => g.estado === 'en_espera').length
  const enAtencion = cola.filter(g => g.estado === 'en_atencion').length
  const graves     = cola.filter(g => g.nivelTriage <= 2).length

  return (
    <div className="space-y-6 max-w-5xl">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <HeartPulse className="h-8 w-8 text-[#013FF6]" /> Triaje y Urgencias
          </h1>
          <p className="text-slate-500 mt-1">Cola ordenada por gravedad y orden de llegada</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchCola} disabled={loading} className="p-2.5 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setModalNuevo(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#013FF6] text-white text-sm font-semibold rounded-xl hover:bg-[#0033cc] shadow-lg shadow-[#013FF6]/20">
            <Plus className="h-4 w-4" /> Nuevo ingreso
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'En espera',   value: enEspera,   color: '#f59e0b' },
          { label: 'En atención', value: enAtencion, color: '#013FF6' },
          { label: 'Nivel grave (1-2)', value: graves, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto" /></div>
        ) : cola.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <HeartPulse className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-semibold">Sin pacientes en guardia</p>
          </div>
        ) : (
          cola.map((item, i) => (
            <FilaGuardia
              key={item.id} item={item} posicion={i + 1}
              onEditar={setModalEditar} onComentarios={setModalComentarios}
              onAtender={handleAtender} onAlta={handleAlta} onRecetar={setModalRecetar}
            />
          ))
        )}
      </div>

      {modalNuevo && (
        <ModalNuevoIngreso onClose={() => setModalNuevo(false)} onCreated={handleCreated} enfermeroId={perfil?.id} />
      )}
      {modalEditar && (
        <ModalEditarTriaje guardia={modalEditar} onClose={() => setModalEditar(null)} onSaved={handleSaved} />
      )}
      {modalComentarios && (
        <ModalComentarios guardia={modalComentarios} onClose={() => setModalComentarios(null)} usuarioId={perfil?.id} />
      )}
      {modalRecetar && (
        <ModalRecetar
          guardia={modalRecetar}
          medicoId={perfil?.id}
          onClose={() => setModalRecetar(null)}
          onCreated={() => showToast('Receta enviada a Farmacia.')}
        />
      )}
    </div>
  )
}