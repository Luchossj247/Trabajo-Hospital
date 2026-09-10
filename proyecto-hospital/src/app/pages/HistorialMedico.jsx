import { useState, useEffect, useCallback } from 'react'
import {
  FileText, Search, User, Calendar, Activity, Plus, X, Save,
  Loader2, AlertTriangle, CheckCircle2, Stethoscope, Paperclip,
  ChevronRight, ArrowLeft, CreditCard,
} from 'lucide-react'
import {
  buscarPacientesConHistorial, getHistorialCompleto, actualizarObservaciones,
  crearAtencion, crearDocumentoClinico,
} from '../../services/historialClinicoService'
import { useAuth } from '../context/AuthContext'

const ESTADO_ATENCION = {
  en_curso: { label: 'En curso', bg: '#dbeafe', color: '#2563eb' },
  alta:     { label: 'Alta',     bg: '#dcfce7', color: '#16a34a' },
  derivado: { label: 'Derivado', bg: '#ede9fe', color: '#7c3aed' },
}

// Valores en minúsculas: coinciden con el check constraint de documentoClinico.tipo en la DB.
const TIPOS_DOCUMENTO = [
  { value: 'estudio',     label: 'Estudio' },
  { value: 'imagen',      label: 'Imagen' },
  { value: 'laboratorio', label: 'Laboratorio' },
  { value: 'informe',     label: 'Informe' },
  { value: 'otro',        label: 'Otro' },
]

function calcEdad(fechaNacimiento) {
  if (!fechaNacimiento) return '—'
  const hoy = new Date()
  const nac = new Date(fechaNacimiento)
  let edad = hoy.getFullYear() - nac.getFullYear()
  const m = hoy.getMonth() - nac.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
  return edad
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

// ── Modal: nueva atención médica ────────────────────────────────────
function ModalNuevaAtencion({ onClose, onCreated, historialId, medicoId }) {
  const [motivo, setMotivo]             = useState('')
  const [estado, setEstado]             = useState('en_curso')
  const [observaciones, setObservaciones] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const handleSave = async () => {
    if (!motivo.trim()) return setError('Ingresá el motivo de la atención.')
    setSaving(true); setError('')
    try {
      const nueva = await crearAtencion(historialId, { medicoId, motivo, estado, observaciones })
      onCreated(nueva)
      onClose()
    } catch (err) {
      setError(err.message || 'Error al registrar la atención.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Nueva atención</h2>
            <p className="text-sm text-slate-400 mt-0.5">Se registra con la fecha y hora actual</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Motivo *</label>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2}
              placeholder="Ej: Control post-quirúrgico, seguimiento de HTA..."
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40 resize-none" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Estado</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(ESTADO_ATENCION).map(([key, val]) => (
                <button key={key} onClick={() => setEstado(key)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all
                    ${estado === key ? 'border-transparent' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                  style={estado === key ? { backgroundColor: val.bg, color: val.color } : {}}>
                  {val.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Observaciones (opcional)</label>
            <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={3}
              placeholder="Notas clínicas de esta atención..."
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40 resize-none" />
          </div>

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

// ── Modal: nuevo documento clínico (metadatos) ──────────────────────
function ModalNuevoDocumento({ onClose, onCreated, historialId, subidoPor }) {
  const [tipo, setTipo]               = useState(TIPOS_DOCUMENTO[0].value)
  const [descripcion, setDescripcion] = useState('')
  const [urlArchivo, setUrlArchivo]   = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const handleSave = async () => {
    if (!urlArchivo.trim()) return setError('El link al archivo es obligatorio (subilo primero a Storage).')
    setSaving(true); setError('')
    try {
      const nuevo = await crearDocumentoClinico(historialId, { tipo, descripcion, urlArchivo, subidoPor })
      onCreated(nuevo)
      onClose()
    } catch (err) {
      setError(err.message || 'Error al registrar el documento.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">Nuevo documento clínico</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo</label>
            <div className="flex flex-wrap gap-1.5">
              {TIPOS_DOCUMENTO.map(t => (
                <button key={t.value} onClick={() => setTipo(t.value)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors
                    ${tipo === t.value ? 'bg-[#013FF6] text-white border-transparent' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Descripción</label>
            <input value={descripcion} onChange={e => setDescripcion(e.target.value)}
              placeholder="Ej: Radiografía de tórax, informe de laboratorio..."
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Link al archivo *</label>
            <input value={urlArchivo} onChange={e => setUrlArchivo(e.target.value)}
              placeholder="URL del documento subido a Storage..."
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
          </div>

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

// ── Vista detalle: historial de un paciente seleccionado ────────────
function DetalleHistorial({ paciente, onVolver, medicoId, showToast }) {
  const [historial, setHistorial] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [observaciones, setObservaciones] = useState('')
  const [savingObs, setSavingObs] = useState(false)
  const [modalAtencion, setModalAtencion]   = useState(false)
  const [modalDocumento, setModalDocumento] = useState(false)

  const fetchHistorial = useCallback(async () => {
    setLoading(true)
    try {
      const h = await getHistorialCompleto(paciente.id)
      setHistorial(h)
      setObservaciones(h.observacionesGenerales || '')
    } catch (err) {
      showToast(err.message || 'Error al cargar el historial.', 'error')
    } finally { setLoading(false) }
  }, [paciente.id])

  useEffect(() => { fetchHistorial() }, [fetchHistorial])

  const guardarObservaciones = async () => {
    setSavingObs(true)
    try {
      await actualizarObservaciones(historial.id, observaciones)
      showToast('Observaciones guardadas.')
    } catch (err) {
      showToast(err.message || 'Error al guardar.', 'error')
    } finally { setSavingObs(false) }
  }

  if (loading) {
    return <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto" /></div>
  }

  const hayCambiosObs = observaciones !== (historial?.observacionesGenerales || '')

  return (
    <div className="space-y-5">
      <button onClick={onVolver} className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-[#013FF6]">
        <ArrowLeft className="h-4 w-4" /> Volver a la búsqueda
      </button>

      {/* Encabezado paciente */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#013FF6]/10 flex items-center justify-center flex-shrink-0">
          <span className="text-lg font-extrabold text-[#013FF6]">{(paciente.nombre || 'P')[0].toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-lg">{paciente.apellido}, {paciente.nombre}</p>
          <p className="text-sm text-slate-400">DNI {paciente.dni} · {calcEdad(paciente.fechaNacimiento)} años · Grupo {paciente.grupoSanguineo || '—'}</p>
        </div>
        {paciente.alergias && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded-full flex-shrink-0">
            <AlertTriangle className="h-3.5 w-3.5" /> Alergia: {paciente.alergias}
          </div>
        )}
      </div>

      {/* Observaciones generales (editable) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
          <Activity className="h-4 w-4 text-[#013FF6]" /> Observaciones clínicas generales
        </h3>
        <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={4}
          placeholder="Antecedentes, diagnósticos crónicos, notas relevantes para cualquier médico que atienda al paciente..."
          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40 resize-none" />
        {hayCambiosObs && (
          <div className="flex justify-end mt-2">
            <button onClick={guardarObservaciones} disabled={savingObs}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#013FF6] text-white text-xs font-semibold hover:bg-[#0033cc] disabled:opacity-60">
              {savingObs ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Guardar cambios
            </button>
          </div>
        )}
      </div>

      {/* Atenciones */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <Calendar className="h-4 w-4 text-[#013FF6]" /> Atenciones
          </h3>
          <button onClick={() => setModalAtencion(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#013FF6] hover:underline">
            <Plus className="h-3.5 w-3.5" /> Nueva atención
          </button>
        </div>
        {historial.atencionMedica.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Sin atenciones registradas todavía.</p>
        ) : (
          <div className="space-y-2">
            {historial.atencionMedica.map(a => {
              const est = ESTADO_ATENCION[a.estado] || ESTADO_ATENCION.en_curso
              return (
                <div key={a.id} className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
                  <span className="text-xs font-mono text-slate-400 w-24 flex-shrink-0 pt-0.5">
                    {new Date(a.fecha).toLocaleDateString('es-AR')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{a.motivo}</p>
                    {a.observaciones && <p className="text-xs text-slate-400 mt-0.5">{a.observaciones}</p>}
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ backgroundColor: est.bg, color: est.color }}>
                    {est.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Documentos */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <Paperclip className="h-4 w-4 text-[#013FF6]" /> Documentos clínicos
          </h3>
          <button onClick={() => setModalDocumento(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#013FF6] hover:underline">
            <Plus className="h-3.5 w-3.5" /> Agregar documento
          </button>
        </div>
        {historial.documentoClinico.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Sin documentos cargados.</p>
        ) : (
          <div className="space-y-2">
            {historial.documentoClinico.map(d => (
              <a key={d.id} href={d.urlArchivo} target="_blank" rel="noreferrer"
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                <div className="w-8 h-8 bg-[#013FF6]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="h-4 w-4 text-[#013FF6]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{d.descripcion || d.tipo}</p>
                  <p className="text-xs text-slate-400 capitalize">{d.tipo} · {new Date(d.subidoAt).toLocaleDateString('es-AR')}</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {modalAtencion && (
        <ModalNuevaAtencion
          historialId={historial.id}
          medicoId={medicoId}
          onClose={() => setModalAtencion(false)}
          onCreated={a => setHistorial(prev => ({ ...prev, atencionMedica: [a, ...prev.atencionMedica] }))}
        />
      )}
      {modalDocumento && (
        <ModalNuevoDocumento
          historialId={historial.id}
          subidoPor={medicoId}
          onClose={() => setModalDocumento(false)}
          onCreated={d => setHistorial(prev => ({ ...prev, documentoClinico: [d, ...prev.documentoClinico] }))}
        />
      )}
    </div>
  )
}

// ── Componente principal ────────────────────────────────────────────
export function HistorialMedico() {
  const { perfil } = useAuth()
  const [query, setQuery]         = useState('')
  const [resultados, setResultados] = useState([])
  const [loading, setLoading]     = useState(false)
  const [seleccionado, setSeleccionado] = useState(null)
  const [toast, setToast]         = useState(null)

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResultados([]); return }
    const t = setTimeout(async () => {
      setLoading(true)
      try { setResultados(await buscarPacientesConHistorial(query) || []) }
      catch (err) { showToast(err.message || 'Error al buscar.', 'error') }
      finally { setLoading(false) }
    }, 350)
    return () => clearTimeout(t)
  }, [query])

  return (
    <div className="space-y-6 max-w-4xl">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <Stethoscope className="h-8 w-8 text-[#013FF6]" /> Historial Clínico
        </h1>
        <p className="text-slate-500 mt-1">Vista editable — solo personal médico puede modificar observaciones, atenciones y documentos</p>
      </div>

      {seleccionado ? (
        <DetalleHistorial paciente={seleccionado} onVolver={() => setSeleccionado(null)} medicoId={perfil?.id} showToast={showToast} />
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar paciente por nombre, apellido o DNI..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto" /></div>
            ) : query.length < 2 ? (
              <div className="text-center py-16 text-slate-400">
                <User className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Buscá un paciente para ver o editar su historial</p>
              </div>
            ) : resultados.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Sin resultados</p>
              </div>
            ) : (
              resultados.map(p => (
                <button key={p.id} onClick={() => setSeleccionado(p)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50/70 transition-colors text-left border-b border-slate-100 last:border-0">
                  <div className="w-10 h-10 rounded-xl bg-[#013FF6]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-extrabold text-[#013FF6]">{(p.nombre || 'P')[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900">{p.apellido}, {p.nombre}</p>
                    <p className="text-xs text-slate-400">DNI {p.dni} · {calcEdad(p.fechaNacimiento)} años</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600">
                    <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                    {p.coberturaMedica?.[0]?.obraSocial || 'Particular'}
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}