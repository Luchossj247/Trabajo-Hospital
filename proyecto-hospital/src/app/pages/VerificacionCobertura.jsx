import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  CreditCard, Search, CheckCircle2, XCircle, AlertTriangle,
  RefreshCw, Edit2, X, Save, Loader2, User, Building2,
  FileText,
} from 'lucide-react'

// ── Estado de cobertura ───────────────────────────────────────
const ESTADO_LABELS = {
  cubre:     { label: 'Cubre',         color: '#ACEC00', textColor: '#1a1a1a', icon: CheckCircle2 },
  no_cubre:  { label: 'No cubre',      color: '#ef4444', textColor: '#fff',    icon: XCircle      },
  pendiente: { label: 'Por verificar', color: '#f59e0b', textColor: '#fff',    icon: AlertTriangle },
}

const OBRAS_SOCIALES = [
  'OSDE', 'Swiss Medical', 'Galeno', 'PAMI', 'IOMA',
  'Medifé', 'Sancor Salud', 'OSPEDYC', 'Accord Salud', 'Particular',
]

// ── Tooltip de observaciones ──────────────────────────────────
function ObsTooltip({ text }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!text) {
    return (
      <div className="w-8 h-8 flex items-center justify-center opacity-20 pointer-events-none">
        <FileText className="h-4 w-4 text-slate-400" />
      </div>
    )
  }

  return (
    <div ref={ref} className="relative flex items-center justify-center">
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors
          ${open
            ? 'bg-[#013FF6]/10 border-[#013FF6] text-[#013FF6]'
            : 'border-slate-200 text-[#013FF6] hover:bg-[#013FF6]/5 hover:border-[#013FF6]'
          }`}
        title="Ver observaciones"
      >
        <FileText className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 z-20 w-56 bg-white border border-slate-200 rounded-xl shadow-lg p-3">
          <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Observaciones</p>
          <p className="text-sm text-slate-700 leading-relaxed">{text}</p>
        </div>
      )}
    </div>
  )
}

// ── Modal de edición ──────────────────────────────────────────
function ModalCobertura({ cobertura, onClose, onSave }) {
  const [form, setForm] = useState({
    estadoCobertura: cobertura.estadoCobertura || 'cubre',
    obraSocial:      cobertura.obraSocial      || '',
    numeroAfiliado:  cobertura.numeroAfiliado  || '',
    observaciones:   cobertura.observaciones   || '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('coberturaMedica')
        .update({
          estadoCobertura: form.estadoCobertura,
          obraSocial:      form.obraSocial || null,
          numeroAfiliado:  form.numeroAfiliado || null,
          observaciones:   form.observaciones  || null,
        })
        .eq('id', cobertura.id)
        .select('*, paciente(nombre, apellido, dni)')
        .single()

      if (error) throw error
      onSave(data)
      onClose()
    } catch (err) {
      setError(err.message || 'Error al guardar')
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
            <h2 className="text-lg font-bold text-slate-900">Verificar Cobertura</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {cobertura.paciente.nombre} {cobertura.paciente.apellido} — DNI {cobertura.paciente.dni}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Estado */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Estado de cobertura</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(ESTADO_LABELS).map(([key, val]) => {
                const Icon = val.icon
                const selected = form.estadoCobertura === key
                return (
                  <button
                    key={key}
                    onClick={() => setField('estadoCobertura', key)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-semibold transition-all
                      ${selected ? 'border-transparent' : 'border-slate-200 hover:border-slate-300'}`}
                    style={selected ? { backgroundColor: val.color, color: val.textColor } : {}}
                  >
                    <Icon className="h-4 w-4" />
                    {val.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Obra Social</label>
              <select
                value={form.obraSocial}
                onChange={e => setField('obraSocial', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40"
              >
                <option value="">Particular</option>
                {OBRAS_SOCIALES.map(os => <option key={os} value={os}>{os}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nº de Afiliado</label>
            <input
              value={form.numeroAfiliado}
              onChange={e => setField('numeroAfiliado', e.target.value)}
              placeholder="Número de credencial"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Observaciones</label>
            <textarea
              value={form.observaciones}
              onChange={e => setField('observaciones', e.target.value)}
              placeholder="Ej: Verificado con la OS. Cubre 80%..."
              rows={3}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40 resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 font-medium">{error}</p>
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
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
export function VerificacionCobertura() {
  const [coberturas, setCoberturas]     = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [search, setSearch]             = useState('')
  const [filtroEstado, setFiltroEstado] = useState('all')
  const [selected, setSelected]         = useState(null)

  const fetchCoberturas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('coberturaMedica')
        .select('*, paciente(nombre, apellido, dni)')
        .order('createdAt', { ascending: false })

      if (error) throw error
      setCoberturas(data || [])
    } catch (err) {
      setError(err.message || 'Error al cargar coberturas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCoberturas() }, [fetchCoberturas])

  const handleSave = (updated) => {
    setCoberturas(prev => prev.map(c => c.id === updated.id ? updated : c))
  }

  const filtered = coberturas.filter(c => {
    const matchSearch = !search.trim() || [
      c.paciente?.nombre, c.paciente?.apellido, c.paciente?.dni, c.obraSocial,
    ].some(v => v?.toLowerCase().includes(search.toLowerCase()))
    const matchEstado = filtroEstado === 'all' || c.estadoCobertura === filtroEstado
    return matchSearch && matchEstado
  })

  const counts = {
    pendiente: coberturas.filter(c => c.estadoCobertura === 'pendiente').length,
    cubre:     coberturas.filter(c => c.estadoCobertura === 'cubre').length,
    no_cubre:  coberturas.filter(c => c.estadoCobertura === 'no_cubre').length,
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-[#013FF6]" />
            Verificación de Cobertura
          </h1>
          <p className="text-slate-500 mt-1">
            Confirmá si la obra social cubre la atención o si abona el paciente
          </p>
        </div>
        <button
          onClick={fetchCoberturas}
          disabled={loading}
          className="p-2.5 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* KPI Pills */}
      <div className="flex flex-wrap gap-3">
        {[
          { key: 'all',       label: 'Todos',          count: coberturas.length, bg: 'bg-slate-100',    text: 'text-slate-700' },
          { key: 'pendiente', label: 'Por verificar',  count: counts.pendiente,  bg: 'bg-amber-100',    text: 'text-amber-800' },
          { key: 'cubre',     label: 'Cubre',          count: counts.cubre,      bg: 'bg-[#ACEC00]/20', text: 'text-slate-800' },
          { key: 'no_cubre',  label: 'No cubre',       count: counts.no_cubre,   bg: 'bg-red-100',      text: 'text-red-700'   },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFiltroEstado(f.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all
              ${filtroEstado === f.key
                ? `ring-2 ring-[#013FF6] ring-offset-1 ${f.bg} ${f.text}`
                : `${f.bg} ${f.text} opacity-60 hover:opacity-100`}`}
          >
            {f.label}
            <span className="bg-white/60 rounded-full px-1.5 py-0.5 text-xs font-bold">{f.count}</span>
          </button>
        ))}
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, DNI u obra social..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40"
        />
      </div>

      {/* Encabezado de columnas */}
      {!loading && filtered.length > 0 && (
        <div className="flex items-center gap-4 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">
          <div className="w-11 flex-shrink-0" />
          <div className="flex-1">Paciente</div>
          <div className="w-44 flex-shrink-0">Obra social</div>
          <div className="w-36 flex-shrink-0">Estado</div>
          <div className="w-8 flex-shrink-0" />
          <div className="w-24 flex-shrink-0" />
        </div>
      )}

      {/* Lista */}
      <div className="space-y-2">
        {loading
          ? Array(4).fill(0).map((_, i) => (
              <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-2xl" />
            ))
          : filtered.length === 0
          ? (
            <div className="text-center py-16 text-slate-400">
              <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{error ? 'Error al cargar' : 'Sin resultados'}</p>
            </div>
          )
          : filtered.map(c => {
              const estado = ESTADO_LABELS[c.estadoCobertura] || ESTADO_LABELS.pendiente
              const Icon = estado.icon
              return (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
                >
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-xl bg-[#013FF6]/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-[#013FF6]" />
                  </div>

                  {/* Paciente */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate">
                      {c.paciente?.nombre} {c.paciente?.apellido}
                    </p>
                    <p className="text-xs text-slate-400">DNI {c.paciente?.dni}</p>
                  </div>

                  {/* Obra social — ancho fijo para alinear */}
                  <div className="hidden sm:flex items-center gap-1.5 w-44 flex-shrink-0 text-sm text-slate-600 truncate">
                    <Building2 className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{c.obraSocial || 'Particular'}</span>
                  </div>

                  {/* Estado — ancho fijo para alinear */}
                  <div className="w-36 flex-shrink-0">
                    <div
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                      style={{ backgroundColor: estado.color, color: estado.textColor }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {estado.label}
                    </div>
                  </div>

                  {/* Observaciones — ícono con popover */}
                  <div className="w-8 flex-shrink-0 flex justify-center">
                    <ObsTooltip text={c.observaciones} />
                  </div>

                  {/* Acción */}
                  <button
                    onClick={() => setSelected(c)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-[#013FF6] hover:text-[#013FF6] transition-colors flex-shrink-0 w-24 justify-center"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Verificar
                  </button>
                </div>
              )
            })
        }
      </div>

      {selected && (
        <ModalCobertura
          cobertura={selected}
          onClose={() => setSelected(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}