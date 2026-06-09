import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  CreditCard, Search, CheckCircle2, XCircle, AlertTriangle,
  RefreshCw, ChevronRight, User, Building2, FileText, Save,
  Loader2, Edit2, X,
} from 'lucide-react'

// ── Estado de cobertura ───────────────────────────────────────
const ESTADO_LABELS = {
  cubre:     { label: 'Cubre',        color: '#ACEC00', textColor: '#1a1a1a', icon: CheckCircle2 },
  no_cubre:  { label: 'No cubre',     color: '#ef4444', textColor: '#fff',    icon: XCircle },
  pendiente: { label: 'Por verificar', color: '#f59e0b', textColor: '#fff',    icon: AlertTriangle },
}

const OBRAS_SOCIALES = [
  'OSDE', 'Swiss Medical', 'Galeno', 'PAMI', 'IOMA',
  'Medifé', 'Sancor Salud', 'OSPEDYC', 'Accord Salud', 'Particular',
]

// ── Demo fallback ─────────────────────────────────────────────
const DEMO_COBERTURAS = [
  {
    id: 1, pacienteId: 101,
    paciente: { nombre: 'Carlos', apellido: 'Méndez', dni: '28.453.123' },
    obraSocial: 'OSDE', plan: '210', numeroAfiliado: 'OSS-4482110',
    estadoCobertura: 'pendiente', activa: true,
    observaciones: '',
  },
  {
    id: 2, pacienteId: 102,
    paciente: { nombre: 'Ana', apellido: 'Silva', dni: '33.120.456' },
    obraSocial: 'Swiss Medical', plan: 'SMG20', numeroAfiliado: 'SM-9920341',
    estadoCobertura: 'cubre', activa: true,
    observaciones: 'Verificado telefónicamente',
  },
  {
    id: 3, pacienteId: 103,
    paciente: { nombre: 'Pedro', apellido: 'Gómez', dni: '40.987.654' },
    obraSocial: 'PAMI', plan: 'Base', numeroAfiliado: 'P-00123456',
    estadoCobertura: 'no_cubre', activa: false,
    observaciones: 'Credencial vencida. Paga el paciente.',
  },
  {
    id: 4, pacienteId: 104,
    paciente: { nombre: 'María', apellido: 'López', dni: '25.654.321' },
    obraSocial: 'Particular', plan: null, numeroAfiliado: null,
    estadoCobertura: 'no_cubre', activa: false,
    observaciones: 'Sin cobertura. Abona en efectivo.',
  },
  {
    id: 5, pacienteId: 105,
    paciente: { nombre: 'Juan', apellido: 'Fernández', dni: '37.223.789' },
    obraSocial: 'IOMA', plan: 'A', numeroAfiliado: 'IOMA-77821',
    estadoCobertura: 'pendiente', activa: true,
    observaciones: '',
  },
]

// ── Modal de edición de cobertura ─────────────────────────────
function ModalCobertura({ cobertura, onClose, onSave }) {
  const [form, setForm] = useState({
    estadoCobertura: cobertura.estadoCobertura,
    obraSocial:      cobertura.obraSocial || '',
    plan:            cobertura.plan || '',
    numeroAfiliado:  cobertura.numeroAfiliado || '',
    observaciones:   cobertura.observaciones || '',
  })
  const [saving, setSaving] = useState(false)

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    onSave({ ...cobertura, ...form })
    setSaving(false)
    onClose()
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
              Verificar Cobertura
            </h2>
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
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Estado de cobertura
            </label>
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

          {/* Obra social */}
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
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Plan</label>
              <input
                value={form.plan}
                onChange={e => setField('plan', e.target.value)}
                placeholder="Ej: 210"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40"
              />
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
              placeholder="Ej: Verificado con la OS. Cubre 80% de la consulta..."
              rows={3}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40 resize-none"
            />
          </div>
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
  const [coberturas, setCoberturas] = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filtroEstado, setFiltroEstado] = useState('all')
  const [selected, setSelected]     = useState(null)

  useEffect(() => {
    const fetchCoberturas = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('coberturaMedica')
          .select(`*, paciente ( nombre, apellido, dni )`)
          .order('createdAt', { ascending: false })

        if (error) throw error
        setCoberturas(data || [])
      } catch {
        // Fallback demo
        await new Promise(r => setTimeout(r, 500))
        setCoberturas(DEMO_COBERTURAS)
      } finally {
        setLoading(false)
      }
    }
    fetchCoberturas()
  }, [])

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
      </div>

      {/* KPI Pills */}
      <div className="flex flex-wrap gap-3">
        {[
          { key: 'all',      label: 'Todos',         count: coberturas.length, bg: 'bg-slate-100',        text: 'text-slate-700' },
          { key: 'pendiente',label: 'Por verificar', count: counts.pendiente,  bg: 'bg-amber-100',        text: 'text-amber-800' },
          { key: 'cubre',    label: 'Cubre',         count: counts.cubre,      bg: 'bg-[#ACEC00]/20',     text: 'text-slate-800' },
          { key: 'no_cubre', label: 'No cubre',      count: counts.no_cubre,   bg: 'bg-red-100',          text: 'text-red-700'   },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFiltroEstado(f.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all
              ${filtroEstado === f.key
                ? 'ring-2 ring-[#013FF6] ring-offset-1 ' + f.bg + ' ' + f.text
                : f.bg + ' ' + f.text + ' opacity-60 hover:opacity-100'}`}
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
              <p className="font-medium">Sin resultados</p>
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

                  {/* Info paciente */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate">
                      {c.paciente?.nombre} {c.paciente?.apellido}
                    </p>
                    <p className="text-xs text-slate-400">DNI {c.paciente?.dni}</p>
                  </div>

                  {/* Obra social */}
                  <div className="hidden sm:flex flex-col min-w-0 w-36">
                    <p className="text-sm font-semibold text-slate-700 truncate flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      {c.obraSocial || 'Particular'}
                    </p>
                    {c.plan && (
                      <p className="text-xs text-slate-400 truncate">Plan {c.plan}</p>
                    )}
                  </div>

                  {/* Estado badge */}
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: estado.color, color: estado.textColor }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {estado.label}
                  </div>

                  {/* Observación */}
                  {c.observaciones && (
                    <p className="text-xs text-slate-400 hidden lg:block max-w-[180px] truncate">
                      {c.observaciones}
                    </p>
                  )}

                  {/* Acción */}
                  <button
                    onClick={() => setSelected(c)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-[#013FF6] hover:text-[#013FF6] transition-colors flex-shrink-0"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Verificar
                  </button>
                </div>
              )
            })
        }
      </div>

      {/* Modal */}
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