import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  Receipt, Search, CheckCircle2, Clock, AlertTriangle,
  Building2, User, DollarSign, ChevronRight, X, Save,
  Loader2, Filter, Download,
} from 'lucide-react'

// ── Tipos de factura ──────────────────────────────────────────
const RESPONSABLE = {
  obra_social: { label: 'Obra Social', color: '#013FF6', bg: '#013FF620', icon: Building2 },
  paciente:    { label: 'Paciente',    color: '#8b5cf6', bg: '#8b5cf620', icon: User },
}

const ESTADO_PAGO = {
  pendiente: { label: 'Pendiente',  color: '#f59e0b', bg: '#fef3c7' },
  emitida:   { label: 'Emitida',   color: '#013FF6', bg: '#dbeafe' },
  pagada:    { label: 'Pagada',    color: '#059669', bg: '#d1fae5' },
  anulada:   { label: 'Anulada',   color: '#6b7280', bg: '#f3f4f6' },
}

// ── Demo data ─────────────────────────────────────────────────
const DEMO_FACTURAS = [
  {
    id: 1, fecha: new Date().toISOString(),
    paciente: { nombre: 'Carlos', apellido: 'Méndez', dni: '28.453.123' },
    obraSocial: 'OSDE', plan: '210',
    responsable: 'obra_social',
    estado: 'emitida',
    monto: 12500,
    concepto: 'Consulta + Laboratorio',
    nroFactura: 'FA-2025-0041',
  },
  {
    id: 2, fecha: new Date(Date.now() - 3600000).toISOString(),
    paciente: { nombre: 'Ana', apellido: 'Silva', dni: '33.120.456' },
    obraSocial: null, plan: null,
    responsable: 'paciente',
    estado: 'pagada',
    monto: 8000,
    concepto: 'Consulta general',
    nroFactura: 'FA-2025-0040',
  },
  {
    id: 3, fecha: new Date(Date.now() - 7200000).toISOString(),
    paciente: { nombre: 'Pedro', apellido: 'Gómez', dni: '40.987.654' },
    obraSocial: 'PAMI', plan: 'Base',
    responsable: 'paciente',
    estado: 'pendiente',
    monto: 5500,
    concepto: 'Consulta — credencial vencida',
    nroFactura: null,
  },
  {
    id: 4, fecha: new Date(Date.now() - 86400000).toISOString(),
    paciente: { nombre: 'María', apellido: 'López', dni: '25.654.321' },
    obraSocial: null, plan: null,
    responsable: 'paciente',
    estado: 'pagada',
    monto: 9200,
    concepto: 'Guardia + medicación',
    nroFactura: 'FA-2025-0038',
  },
  {
    id: 5, fecha: new Date(Date.now() - 172800000).toISOString(),
    paciente: { nombre: 'Juan', apellido: 'Fernández', dni: '37.223.789' },
    obraSocial: 'IOMA', plan: 'A',
    responsable: 'obra_social',
    estado: 'pendiente',
    monto: 18000,
    concepto: 'Internación 2 días',
    nroFactura: null,
  },
]

// ── Modal emisión de factura ──────────────────────────────────
function ModalFactura({ factura, onClose, onSave }) {
  const [form, setForm] = useState({
    responsable: factura.responsable || 'obra_social',
    estado:      factura.estado      || 'pendiente',
    monto:       factura.monto       || '',
    concepto:    factura.concepto    || '',
    nroFactura:  factura.nroFactura  || '',
  })
  const [saving, setSaving] = useState(false)
  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    const nro = form.nroFactura || `FA-2025-${String(Math.floor(Math.random() * 9000) + 1000)}`
    onSave({ ...factura, ...form, nroFactura: nro })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Gestionar Factura</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {factura.paciente.nombre} {factura.paciente.apellido}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Responsable de pago */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">¿Quién paga?</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(RESPONSABLE).map(([key, val]) => {
                const Icon = val.icon
                const sel = form.responsable === key
                return (
                  <button
                    key={key}
                    onClick={() => setField('responsable', key)}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all
                      ${sel ? 'border-transparent text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                    style={sel ? { backgroundColor: val.color } : {}}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {val.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Monto y concepto */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Monto ($)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="number"
                  value={form.monto}
                  onChange={e => setField('monto', e.target.value)}
                  placeholder="0"
                  className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Estado</label>
              <select
                value={form.estado}
                onChange={e => setField('estado', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40"
              >
                {Object.entries(ESTADO_PAGO).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Concepto</label>
            <input
              value={form.concepto}
              onChange={e => setField('concepto', e.target.value)}
              placeholder="Ej: Consulta + Laboratorio"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nº de Factura</label>
            <input
              value={form.nroFactura}
              onChange={e => setField('nroFactura', e.target.value)}
              placeholder="Se genera automáticamente"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-[#013FF6] text-white text-sm font-semibold hover:bg-[#0033cc] flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
export function Facturacion() {
  const [facturas, setFacturas]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filtroEstado, setFiltroEstado] = useState('all')
  const [selected, setSelected]     = useState(null)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('facturacion')
          .select(`*, paciente ( nombre, apellido, dni )`)
          .order('createdAt', { ascending: false })
        if (error) throw error
        setFacturas(data || [])
      } catch {
        await new Promise(r => setTimeout(r, 500))
        setFacturas(DEMO_FACTURAS)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const handleSave = updated =>
    setFacturas(prev => prev.map(f => f.id === updated.id ? updated : f))

  const filtered = facturas.filter(f => {
    const ms = search.toLowerCase()
    const matchSearch = !search.trim() || [
      f.paciente?.nombre, f.paciente?.apellido, f.paciente?.dni, f.nroFactura,
    ].some(v => v?.toLowerCase().includes(ms))
    const matchEstado = filtroEstado === 'all' || f.estado === filtroEstado
    return matchSearch && matchEstado
  })

  const totalPendiente = facturas
    .filter(f => f.estado === 'pendiente')
    .reduce((s, f) => s + (f.monto || 0), 0)

  const totalHoy = facturas
    .filter(f => new Date(f.fecha).toDateString() === new Date().toDateString())
    .reduce((s, f) => s + (f.monto || 0), 0)

  const fmt = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Receipt className="h-8 w-8 text-[#013FF6]" />
            Facturación
          </h1>
          <p className="text-slate-500 mt-1">Estado de pagos y asignación a obra social o paciente</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600">
          <Download className="h-4 w-4" /> Exportar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Pendientes de cobro</p>
          <p className="text-2xl font-extrabold text-amber-600">{fmt(totalPendiente)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{facturas.filter(f => f.estado === 'pendiente').length} facturas</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Facturado hoy</p>
          <p className="text-2xl font-extrabold text-[#013FF6]">{fmt(totalHoy)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{facturas.filter(f => new Date(f.fecha).toDateString() === new Date().toDateString()).length} facturas</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">A obra social</p>
          <p className="text-2xl font-extrabold text-slate-900">
            {facturas.filter(f => f.responsable === 'obra_social').length}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {facturas.filter(f => f.responsable === 'paciente').length} a cargo del paciente
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar paciente o Nº factura..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40"
          />
        </div>
        <div className="flex gap-1.5">
          {['all', 'pendiente', 'emitida', 'pagada'].map(k => (
            <button
              key={k}
              onClick={() => setFiltroEstado(k)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors
                ${filtroEstado === k
                  ? 'bg-[#013FF6] text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {k === 'all' ? 'Todos' : ESTADO_PAGO[k]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de facturas */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70">
              {['Paciente', 'Concepto', 'Responsable', 'Monto', 'Estado', 'Nº Factura', ''].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array(4).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array(7).fill(0).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-slate-100 animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.map((f, i) => {
                  const resp = RESPONSABLE[f.responsable] || RESPONSABLE.paciente
                  const est  = ESTADO_PAGO[f.estado]      || ESTADO_PAGO.pendiente
                  const RIcon = resp.icon
                  return (
                    <tr key={f.id} className={`border-b border-slate-100/60 hover:bg-slate-50/50 ${i % 2 ? 'bg-slate-50/20' : ''}`}>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-900">
                          {f.paciente?.nombre} {f.paciente?.apellido}
                        </p>
                        <p className="text-xs text-slate-400">DNI {f.paciente?.dni}</p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 max-w-[180px] truncate">{f.concepto}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: resp.bg, color: resp.color }}
                        >
                          <RIcon className="h-3 w-3" />
                          {resp.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {f.monto ? fmt(f.monto) : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: est.bg, color: est.color }}
                        >
                          {est.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 text-xs font-mono">
                        {f.nroFactura || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => setSelected(f)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#013FF6] hover:bg-[#013FF6]/10 transition-colors"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
            }
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">Sin facturas</p>
          </div>
        )}
      </div>

      {selected && (
        <ModalFactura
          factura={selected}
          onClose={() => setSelected(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}