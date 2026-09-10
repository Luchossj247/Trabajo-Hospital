import { useState, useEffect, useCallback } from 'react'
import {
  BedDouble, RefreshCw, Wrench, CheckCircle2, X, Plus, Loader2,
  AlertTriangle, LogOut, Cpu, User,
} from 'lucide-react'
import {
  getCamas, getEquipamiento, asignarEquipamiento, quitarEquipamiento,
  actualizarCama, getGuardiasSinCama, crearInternacion, finalizarInternacion,
} from '../../services/camaService'
import { useAuth } from '../context/AuthContext'

const ESTADOS = {
  disponible:    { label: 'Disponible',    color: '#22c55e', bg: '#dcfce7' },
  ocupada:       { label: 'Ocupada',       color: '#ef4444', bg: '#fee2e2' },
  mantenimiento: { label: 'Mantenimiento', color: '#f59e0b', bg: '#fef3c7' },
  reservada:     { label: 'Reservada',     color: '#8b5cf6', bg: '#ede9fe' },
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

// ── Modal detalle / asignación de cama ─────────────────────────────
function ModalCama({ cama, equipos, guardias, onClose, onChanged, medicoId }) {
  const [guardiaSel, setGuardiaSel] = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  const equiposAsignados = new Set((cama.camaEquipamiento || []).map(c => c.equipamiento.id))
  const internacionActiva = (cama.internacion || []).find(i => i.estado === 'activa')

  const handleAsignar = async () => {
    if (!guardiaSel) return setError('Seleccioná un paciente en espera de cama.')
    setSaving(true); setError('')
    try {
      await crearInternacion({ guardiaId: guardiaSel, camaId: cama.id, medicoId })
      onChanged()
      onClose()
    } catch (err) { setError(err.message || 'Error al asignar la cama.') }
    finally { setSaving(false) }
  }

  const handleAlta = async () => {
    if (!internacionActiva) return
    if (!confirm('¿Finalizar la internación y liberar la cama?')) return
    setSaving(true)
    try {
      await finalizarInternacion(internacionActiva.id, cama.id)
      onChanged()
      onClose()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const toggleEquipo = async (equipoId) => {
    try {
      if (equiposAsignados.has(equipoId)) await quitarEquipamiento(cama.id, equipoId)
      else await asignarEquipamiento(cama.id, equipoId)
      onChanged()
    } catch (err) { setError(err.message) }
  }

  const toggleMantenimiento = async () => {
    const nuevoEstado = cama.estado === 'mantenimiento' ? 'disponible' : 'mantenimiento'
    try { await actualizarCama(cama.id, { estado: nuevoEstado }); onChanged(); onClose() }
    catch (err) { setError(err.message) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Cama {cama.codigo}</h2>
            <p className="text-sm text-slate-400">{cama.sector} · Piso {cama.piso}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="h-5 w-5" /></button>
        </div>

        {/* Paciente internado */}
        {internacionActiva ? (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-red-500" />
              <span className="text-sm font-semibold text-slate-800">
                {internacionActiva.guardia?.paciente?.nombre} {internacionActiva.guardia?.paciente?.apellido}
              </span>
            </div>
            <button onClick={handleAlta} disabled={saving}
              className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline">
              <LogOut className="h-3.5 w-3.5" /> Dar de alta
            </button>
          </div>
        ) : cama.estado === 'disponible' ? (
          <div className="mb-4 space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Asignar paciente en espera de cama</label>
            <select value={guardiaSel} onChange={e => setGuardiaSel(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40">
              <option value="">Seleccionar paciente...</option>
              {guardias.map(g => (
                <option key={g.id} value={g.id}>{g.paciente?.nombre} {g.paciente?.apellido} — DNI {g.paciente?.dni}</option>
              ))}
            </select>
            <button onClick={handleAsignar} disabled={saving}
              className="w-full py-2 rounded-xl bg-[#013FF6] text-white text-sm font-semibold hover:bg-[#0033cc] flex items-center justify-center gap-2 disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Asignar cama
            </button>
          </div>
        ) : null}

        {/* Equipamiento */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <Cpu className="h-4 w-4" /> Equipamiento asignado
          </label>
          <div className="flex flex-wrap gap-1.5">
            {equipos.map(eq => {
              const activo = equiposAsignados.has(eq.id)
              return (
                <button key={eq.id} onClick={() => toggleEquipo(eq.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors
                    ${activo ? 'bg-[#013FF6] text-white border-transparent' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  {eq.nombre}
                </button>
              )
            })}
          </div>
        </div>

        {/* Mantenimiento */}
        {!internacionActiva && (
          <button onClick={toggleMantenimiento}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            <Wrench className="h-4 w-4" />
            {cama.estado === 'mantenimiento' ? 'Marcar como disponible' : 'Enviar a mantenimiento'}
          </button>
        )}

        {error && (
          <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {error}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Componente principal ────────────────────────────────────────────
export function ControlCamas() {
  const { perfil } = useAuth()
  const [camas, setCamas]         = useState([])
  const [equipos, setEquipos]     = useState([])
  const [guardias, setGuardias]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [toast, setToast]         = useState(null)
  const [selected, setSelected]   = useState(null)
  const [filtroSector, setFiltroSector] = useState('')

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [c, e, g] = await Promise.all([getCamas(), getEquipamiento(), getGuardiasSinCama()])
      setCamas(c || []); setEquipos(e || []); setGuardias(g || [])
    } catch (err) { showToast(err.message || 'Error al cargar camas.', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const sectores = [...new Set(camas.map(c => c.sector))]
  const visibles = filtroSector ? camas.filter(c => c.sector === filtroSector) : camas

  const stats = {
    disponibles: camas.filter(c => c.estado === 'disponible').length,
    ocupadas: camas.filter(c => c.estado === 'ocupada').length,
    mantenimiento: camas.filter(c => c.estado === 'mantenimiento').length,
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <BedDouble className="h-8 w-8 text-[#013FF6]" /> Control de Camas
          </h1>
          <p className="text-slate-500 mt-1">Estado, equipamiento e internaciones</p>
        </div>
        <button onClick={fetchAll} disabled={loading} className="p-2.5 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Disponibles', value: stats.disponibles, color: '#22c55e' },
          { label: 'Ocupadas', value: stats.ocupadas, color: '#ef4444' },
          { label: 'Mantenimiento', value: stats.mantenimiento, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {sectores.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFiltroSector('')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${!filtroSector ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600'}`}>
            Todos los sectores
          </button>
          {sectores.map(s => (
            <button key={s} onClick={() => setFiltroSector(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${filtroSector === s ? 'bg-[#013FF6] text-white border-transparent' : 'border-slate-200 text-slate-600'}`}>
              {s}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto" /></div>
      ) : visibles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-16 text-slate-400">
          <BedDouble className="h-10 w-10 mb-3 opacity-30" />
          <p className="font-semibold">No hay camas cargadas todavía</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {visibles.map(cama => {
            const est = ESTADOS[cama.estado] || ESTADOS.disponible
            const internacionActiva = (cama.internacion || []).find(i => i.estado === 'activa')
            return (
              <button key={cama.id} onClick={() => setSelected(cama)}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-left hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900">{cama.codigo}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: est.bg, color: est.color }}>
                    {est.label}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-2">{cama.sector} · Piso {cama.piso}</p>
                {internacionActiva ? (
                  <p className="text-xs font-semibold text-slate-700 truncate">
                    {internacionActiva.guardia?.paciente?.nombre} {internacionActiva.guardia?.paciente?.apellido}
                  </p>
                ) : (
                  <p className="text-xs text-slate-300">Sin paciente</p>
                )}
                {cama.camaEquipamiento?.length > 0 && (
                  <p className="text-[10px] text-slate-400 mt-1.5 truncate">
                    <Cpu className="inline h-3 w-3 mr-1" />
                    {cama.camaEquipamiento.map(c => c.equipamiento.nombre).join(', ')}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      )}

      {selected && (
        <ModalCama
          cama={selected} equipos={equipos} guardias={guardias}
          onClose={() => setSelected(null)} onChanged={fetchAll} medicoId={perfil?.id}
        />
      )}
    </div>
  )
}