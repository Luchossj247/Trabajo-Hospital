import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPacienteById, updatePaciente, updateCobertura } from '../../services/pacienteService'
import {
  User, Phone, CreditCard, FileText, ArrowLeft,
  Edit2, Save, X, Loader2, CheckCircle2, XCircle,
  AlertTriangle, Activity,
} from 'lucide-react'

function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return '—'
  const hoy = new Date()
  const nac = new Date(fechaNacimiento)
  let edad = hoy.getFullYear() - nac.getFullYear()
  const m = hoy.getMonth() - nac.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
  return `${edad} años`
}

// Mapeo de estadoCobertura → visual (consistente con VerificacionCobertura)
const ESTADO_COB = {
  pendiente:  { label: 'Por verificar', bg: 'bg-amber-50',   text: 'text-amber-700',  Icon: AlertTriangle },
  cubre:      { label: 'Cubre',         bg: 'bg-emerald-50', text: 'text-emerald-700', Icon: CheckCircle2  },
  no_cubre:   { label: 'No cubre',      bg: 'bg-red-50',     text: 'text-red-600',     Icon: XCircle       },
}

// activa se deriva del estadoCobertura para mantener consistencia en la BD
function activaDesdeEstado(estado) {
  return estado === 'cubre'
}

const inputClass = 'flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#013FF6] focus-visible:ring-offset-1'
const selectClass = 'flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#013FF6] focus-visible:ring-offset-1'

export function DetallePaciente() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [paciente, setPaciente]           = useState(null)
  const [loading, setLoading]             = useState(true)
  const [editando, setEditando]           = useState(false)
  const [editandoCobertura, setEditandoCobertura] = useState(false)
  const [saving, setSaving]               = useState(false)
  const [toast, setToast]                 = useState(null)

  const [formPaciente, setFormPaciente]   = useState({})
  const [formCobertura, setFormCobertura] = useState({})

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const data = await getPacienteById(id)
        setPaciente(data)
        setFormPaciente({
          nombre:                     data.nombre,
          apellido:                   data.apellido,
          telefono:                   data.telefono || '',
          email:                      data.email || '',
          direccion:                  data.direccion || '',
          contactoEmergenciaNombre:   data.contactoEmergenciaNombre || '',
          contactoEmergenciaTelefono: data.contactoEmergenciaTelefono || '',
          grupoSanguineo:             data.grupoSanguineo || '',
          alergias:                   data.alergias || '',
        })
        const cob = data.coberturaMedica?.[0]
        setFormCobertura({
          obraSocial:      cob?.obraSocial      || '',
          plan:            cob?.plan            || '',
          numeroAfiliado:  cob?.numeroAfiliado  || '',
          estadoCobertura: cob?.estadoCobertura || 'pendiente',
        })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id])

  const handleSavePaciente = async () => {
    setSaving(true)
    try {
      const updated = await updatePaciente(id, formPaciente)
      setPaciente(prev => ({ ...prev, ...updated }))
      setEditando(false)
      showToast('Datos del paciente actualizados.')
    } catch (err) {
      showToast(err.message || 'Error al guardar.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCobertura = async () => {
    setSaving(true)
    try {
      // Guardamos estadoCobertura y derivamos activa para mantener ambos campos en sync
      const payload = {
        ...formCobertura,
        activa: activaDesdeEstado(formCobertura.estadoCobertura),
      }
      await updateCobertura(id, payload)
      setPaciente(prev => ({
        ...prev,
        coberturaMedica: [{ ...prev.coberturaMedica?.[0], ...payload }],
      }))
      setEditandoCobertura(false)
      showToast('Cobertura actualizada.')
    } catch (err) {
      showToast(err.message || 'Error al guardar.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {Array(3).fill(0).map((_, i) => (
        <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-2xl" />
      ))}
    </div>
  )

  if (!paciente) return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
      <p className="font-semibold">Paciente no encontrado</p>
      <button onClick={() => navigate('/empleado/registro')} className="mt-3 text-sm text-[#013FF6] hover:underline">
        Volver al listado
      </button>
    </div>
  )

  const cobertura = paciente.coberturaMedica?.[0]
  const historial = paciente.historialClinico?.[0]
  const estadoCobDisplay = ESTADO_COB[cobertura?.estadoCobertura] ?? ESTADO_COB.pendiente

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl
          shadow-lg text-white text-sm font-medium
          ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-500'}`}>
          {toast.type === 'success'
            ? <CheckCircle2 className="h-4 w-4" />
            : <AlertTriangle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/empleado/registro')}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </button>
        <div className="flex-1">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {paciente.nombre} {paciente.apellido}
          </h2>
          <p className="text-slate-500 mt-0.5">
            DNI {paciente.dni} · {calcularEdad(paciente.fechaNacimiento)} ·{' '}
            {paciente.sexo === 'M' ? 'Masculino' : paciente.sexo === 'F' ? 'Femenino' : 'Otro'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* ── Datos Personales ─────────────────────────────── */}
        <div className="col-span-12 md:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-[#013FF6]" />
              <h3 className="font-semibold text-[#013FF6]">Datos Personales</h3>
            </div>
            {!editando
              ? (
                <button
                  onClick={() => setEditando(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#013FF6] transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Editar
                </button>
              )
              : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditando(false)}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" /> Cancelar
                  </button>
                  <button
                    onClick={handleSavePaciente}
                    disabled={saving}
                    className="flex items-center gap-1 text-xs font-semibold text-[#013FF6] hover:underline"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Guardar
                  </button>
                </div>
              )
            }
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
            {editando ? (
              <>
                {[
                  { label: 'Nombre',    key: 'nombre' },
                  { label: 'Apellido',  key: 'apellido' },
                  { label: 'Teléfono', key: 'telefono' },
                  { label: 'Email',    key: 'email' },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">{label}</label>
                    <input
                      value={formPaciente[key] || ''}
                      onChange={e => setFormPaciente(p => ({ ...p, [key]: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Dirección</label>
                  <input
                    value={formPaciente.direccion || ''}
                    onChange={e => setFormPaciente(p => ({ ...p, direccion: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Contacto emergencia</label>
                  <input
                    value={formPaciente.contactoEmergenciaNombre || ''}
                    onChange={e => setFormPaciente(p => ({ ...p, contactoEmergenciaNombre: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Tel. emergencia</label>
                  <input
                    value={formPaciente.contactoEmergenciaTelefono || ''}
                    onChange={e => setFormPaciente(p => ({ ...p, contactoEmergenciaTelefono: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Grupo sanguíneo</label>
                  <select
                    value={formPaciente.grupoSanguineo || ''}
                    onChange={e => setFormPaciente(p => ({ ...p, grupoSanguineo: e.target.value }))}
                    className={selectClass}
                  >
                    <option value="">Desconocido</option>
                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Alergias</label>
                  <input
                    value={formPaciente.alergias || ''}
                    onChange={e => setFormPaciente(p => ({ ...p, alergias: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </>
            ) : (
              <>
                {[
                  { label: 'Teléfono',             value: paciente.telefono },
                  { label: 'Email',                value: paciente.email },
                  { label: 'Dirección',            value: paciente.direccion },
                  { label: 'Fecha de nacimiento',  value: paciente.fechaNacimiento ? new Date(paciente.fechaNacimiento + 'T00:00:00').toLocaleDateString('es-AR') : null },
                  { label: 'Grupo sanguíneo',      value: paciente.grupoSanguineo },
                  { label: 'Alergias',             value: paciente.alergias },
                  { label: 'Contacto emergencia',  value: paciente.contactoEmergenciaNombre },
                  { label: 'Tel. emergencia',      value: paciente.contactoEmergenciaTelefono },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                    <p className="text-sm font-medium text-slate-800 mt-0.5">{value || <span className="text-slate-300">—</span>}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* ── Cobertura ─────────────────────────────────────── */}
        <div className="col-span-12 md:col-span-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#013FF6]" />
                <h3 className="font-semibold text-slate-900 text-sm">Cobertura</h3>
              </div>
              {!editandoCobertura
                ? (
                  <button
                    onClick={() => setEditandoCobertura(true)}
                    className="text-xs font-semibold text-slate-400 hover:text-[#013FF6] flex items-center gap-1"
                  >
                    <Edit2 className="h-3 w-3" /> Editar
                  </button>
                )
                : (
                  <div className="flex gap-2">
                    <button onClick={() => setEditandoCobertura(false)} className="text-xs text-slate-400 hover:text-slate-600">
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveCobertura}
                      disabled={saving}
                      className="text-xs font-semibold text-[#013FF6] hover:underline flex items-center gap-1"
                    >
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      Guardar
                    </button>
                  </div>
                )
              }
            </div>
            <div className="p-5 space-y-3">
              {editandoCobertura ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Obra Social</label>
                    <select
                      value={formCobertura.obraSocial || ''}
                      onChange={e => setFormCobertura(p => ({ ...p, obraSocial: e.target.value }))}
                      className={selectClass}
                    >
                      <option value="">Particular</option>
                      <option value="OSDE">OSDE</option>
                      <option value="Swiss Medical">Swiss Medical</option>
                      <option value="Galeno">Galeno</option>
                      <option value="PAMI">PAMI</option>
                      <option value="IOMA">IOMA</option>
                      <option value="Medifé">Medifé</option>
                      <option value="Sancor Salud">Sancor Salud</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Plan</label>
                    <input
                      value={formCobertura.plan || ''}
                      onChange={e => setFormCobertura(p => ({ ...p, plan: e.target.value }))}
                      placeholder="Ej: 210"
                      disabled={!formCobertura.obraSocial}
                      className={`${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Nº Afiliado</label>
                    <input
                      value={formCobertura.numeroAfiliado || ''}
                      onChange={e => setFormCobertura(p => ({ ...p, numeroAfiliado: e.target.value }))}
                      className={inputClass}
                      disabled={!formCobertura.obraSocial}
                    />
                  </div>
                  {/* Selector de estado — 3 opciones claras */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Estado de cobertura</label>
                    <div className="flex flex-col gap-1.5">
                      {Object.entries(ESTADO_COB).map(([valor, { label, bg, text, Icon }]) => (
                        <button
                          key={valor}
                          type="button"
                          onClick={() => setFormCobertura(p => ({ ...p, estadoCobertura: valor }))}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors
                            ${formCobertura.estadoCobertura === valor
                              ? `${bg} ${text} border-current`
                              : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Obra Social</p>
                    <p className="text-sm font-medium text-slate-800 mt-0.5">{cobertura?.obraSocial || 'Particular'}</p>
                  </div>
                  {cobertura?.plan && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Plan</p>
                      <p className="text-sm font-medium text-slate-800 mt-0.5">{cobertura.plan}</p>
                    </div>
                  )}
                  {cobertura?.numeroAfiliado && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Nº Afiliado</p>
                      <p className="text-sm font-medium text-slate-800 mt-0.5">{cobertura.numeroAfiliado}</p>
                    </div>
                  )}
                  {/* Estado de cobertura */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold
                    ${estadoCobDisplay.bg} ${estadoCobDisplay.text}`}>
                    <estadoCobDisplay.Icon className="h-4 w-4" />
                    {estadoCobDisplay.label}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Historial Clínico (solo lectura) ─────────────── */}
        <div className="col-span-12 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#013FF6]" />
            <h3 className="font-semibold text-[#013FF6]">Historial Clínico</h3>
            <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Solo lectura</span>
          </div>
          <div className="p-6">
            {historial?.observacionesGenerales ? (
              <p className="text-sm text-slate-700 leading-relaxed">{historial.observacionesGenerales}</p>
            ) : (
              <p className="text-sm text-slate-400 text-center py-6">
                Sin observaciones clínicas registradas.
              </p>
            )}

            {historial?.documentoClinico?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Documentos</p>
                <div className="space-y-2">
                  {historial.documentoClinico.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <Activity className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate capitalize">{doc.tipo}</p>
                        {doc.descripcion && <p className="text-xs text-slate-400 truncate">{doc.descripcion}</p>}
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(doc.subidoAt).toLocaleDateString('es-AR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}