import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  Receipt, Search, CheckCircle2, Clock, AlertTriangle,
  XCircle, DollarSign, ChevronRight, X, Save,
  Loader2, Download, RefreshCw, Plus, User, ChevronDown,
} from 'lucide-react'

// ── Mapeos según los CHECK constraints de la BD ───────────────
const ESTADO_COBERTURA = {
  pendiente_verificacion: { label: 'Pendiente',      color: '#f59e0b', bg: '#fef3c7', icon: Clock },
  cubre_total:            { label: 'Cubre total',    color: '#059669', bg: '#d1fae5', icon: CheckCircle2 },
  cubre_parcial:          { label: 'Cubre parcial',  color: '#013FF6', bg: '#dbeafe', icon: CheckCircle2 },
  sin_cobertura:          { label: 'Sin cobertura',  color: '#ef4444', bg: '#fee2e2', icon: XCircle },
}

const ESTADO_PAGO = {
  pendiente: { label: 'Pendiente', color: '#f59e0b', bg: '#fef3c7' },
  parcial:   { label: 'Parcial',   color: '#013FF6', bg: '#dbeafe' },
  pagado:    { label: 'Pagado',    color: '#059669', bg: '#d1fae5' },
  deuda:     { label: 'Deuda',     color: '#ef4444', bg: '#fee2e2' },
}

// ── Modal CREAR factura ───────────────────────────────────────
function ModalCrearFactura({ onClose, onCreated }) {
  const [guardias, setGuardias]     = useState([])
  const [loadingG, setLoadingG]     = useState(true)
  const [guardiaId, setGuardiaId]   = useState('')
  const [guardiaInfo, setGuardiaInfo] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchG, setSearchG]       = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState(null)

  const [form, setForm] = useState({
    estadoCobertura: 'pendiente_verificacion',
    estadoPago:      'pendiente',
    montoTotal:      '',
    montoObraSocial: '',
    montoPaciente:   '',
    observaciones:   '',
  })

  // Cargar guardias atendidas/derivadas sin factura aún
  useEffect(() => {
    const fetchGuardias = async () => {
      setLoadingG(true)
      try {
        // Traer guardias cerradas
        const { data: gData, error: gErr } = await supabase
          .from('guardia')
          .select(`
            id, estado, "ingresoAt", "comentarioTriage",
            paciente ( id, nombre, apellido, dni )
          `)
          .in('estado', ['alta', 'derivado'])
          .order('"ingresoAt"', { ascending: false })

        if (gErr) throw gErr

        // Traer guardiaIds ya facturados
        const { data: fData, error: fErr } = await supabase
          .from('facturacion')
          .select('"guardiaId"')

        if (fErr) throw fErr

        const facturadosSet = new Set((fData || []).map(f => f.guardiaId))
        setGuardias((gData || []).filter(g => !facturadosSet.has(g.id)))
      } catch (err) {
        setError('Error al cargar guardias: ' + err.message)
      } finally {
        setLoadingG(false)
      }
    }
    fetchGuardias()
  }, [])

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleMontoChange = (field, value) => {
    const val = parseFloat(value) || 0
    if (field === 'montoTotal' || field === 'montoObraSocial') {
      const total = field === 'montoTotal'      ? val : (parseFloat(form.montoTotal)      || 0)
      const os    = field === 'montoObraSocial' ? val : (parseFloat(form.montoObraSocial) || 0)
      setForm(p => ({ ...p, [field]: value, montoPaciente: Math.max(0, total - os) }))
    } else {
      setField(field, value)
    }
  }

  const selectGuardia = (g) => {
    setGuardiaId(g.id)
    setGuardiaInfo(g)
    setDropdownOpen(false)
    setSearchG('')
  }

  const filteredGuardias = guardias.filter(g => {
    const q = searchG.toLowerCase()
    return !q || [g.paciente?.nombre, g.paciente?.apellido, g.paciente?.dni]
      .some(v => v?.toLowerCase().includes(q))
  })

  const fmt = n => {
    const num = parseFloat(n)
    if (!n && n !== 0) return ''
    return new Intl.NumberFormat('es-AR', {
      style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
    }).format(num)
  }

  const handleSave = async () => {
    if (!guardiaId) return setError('Seleccioná una guardia.')
    setSaving(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('facturacion')
        .insert([{
          guardiaId,
          pacienteId:      guardiaInfo.paciente.id,
          estadoCobertura: form.estadoCobertura,
          estadoPago:      form.estadoPago,
          montoTotal:      parseFloat(form.montoTotal)      || 0,
          montoObraSocial: parseFloat(form.montoObraSocial) || 0,
          montoPaciente:   parseFloat(form.montoPaciente)   || 0,
          observaciones:   form.observaciones || null,
        }])
        .select(`
          id, "guardiaId", "pacienteId", "estadoCobertura",
          "montoTotal", "montoObraSocial", "montoPaciente",
          "estadoPago", observaciones, "createdAt",
          datosPaciente:paciente!facturacion_pacienteId_fkey ( nombre, apellido, dni )
        `)
        .single()

      if (error) throw error
      onCreated(data)
      onClose()
    } catch (err) {
      setError(err.message || 'Error al crear la factura.')
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Nueva Factura</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Seleccioná una guardia cerrada para facturar
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5">

          {/* Selector de guardia */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Guardia *
            </label>
            {loadingG ? (
              <div className="h-11 bg-slate-100 animate-pulse rounded-xl" />
            ) : (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(v => !v)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 border rounded-xl text-sm transition-colors
                    ${guardiaId
                      ? 'border-[#013FF6] bg-[#013FF6]/5 text-slate-900'
                      : 'border-slate-200 text-slate-400 hover:border-slate-300'
                    }`}
                >
                  {guardiaInfo ? (
                    <span className="font-medium text-slate-900">
                      {guardiaInfo.paciente?.nombre} {guardiaInfo.paciente?.apellido}
                      <span className="text-slate-400 font-normal ml-2">
                        — DNI {guardiaInfo.paciente?.dni}
                      </span>
                    </span>
                  ) : (
                    <span>
                      {guardias.length === 0
                        ? 'No hay guardias sin facturar'
                        : 'Seleccionar guardia...'}
                    </span>
                  )}
                  <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && guardias.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    {/* Búsqueda dentro del dropdown */}
                    <div className="p-2 border-b border-slate-100">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          autoFocus
                          value={searchG}
                          onChange={e => setSearchG(e.target.value)}
                          placeholder="Buscar paciente..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40"
                          onClick={e => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredGuardias.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">Sin resultados</p>
                      ) : filteredGuardias.map(g => (
                        <button
                          key={g.id}
                          onClick={() => selectGuardia(g)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors border-b border-slate-50 last:border-0"
                        >
                          <div className="w-8 h-8 rounded-full bg-[#013FF6]/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-[#013FF6]">
                              {(g.paciente?.nombre?.[0] || 'P').toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {g.paciente?.nombre} {g.paciente?.apellido}
                            </p>
                            <p className="text-xs text-slate-400">DNI {g.paciente?.dni}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0
                            ${g.estado === 'alta'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-purple-100 text-purple-700'}`}
                          >
                            {g.estado}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Montos — solo si hay guardia seleccionada */}
          {guardiaId && (
            <>
              {/* Divider */}
              <div className="border-t border-slate-100 pt-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Datos de facturación
                </p>
              </div>

              {/* Estado de cobertura */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Estado de cobertura
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(ESTADO_COBERTURA).map(([key, val]) => {
                    const Icon = val.icon
                    const sel  = form.estadoCobertura === key
                    return (
                      <button
                        key={key}
                        onClick={() => setField('estadoCobertura', key)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all text-left
                          ${sel ? 'border-transparent' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                        style={sel ? { backgroundColor: val.bg, color: val.color, borderColor: val.color } : {}}
                      >
                        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                        {val.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Montos */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Monto total',          field: 'montoTotal' },
                  { label: 'A cargo obra social',   field: 'montoObraSocial' },
                  { label: 'A cargo paciente',      field: 'montoPaciente' },
                ].map(({ label, field }) => (
                  <div key={field}>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">{label}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form[field]}
                        onChange={e => handleMontoChange(field, e.target.value)}
                        placeholder="0"
                        readOnly={field === 'montoPaciente'}
                        className={`w-full pl-6 pr-2 py-2.5 border border-slate-200 rounded-xl text-sm
                          focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40
                          ${field === 'montoPaciente' ? 'bg-slate-50 text-slate-500' : ''}`}
                      />
                    </div>
                    {form[field] !== '' && (
                      <p className="text-[10px] text-slate-400 mt-0.5">{fmt(form[field])}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Estado de pago */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Estado de pago
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(ESTADO_PAGO).map(([key, val]) => {
                    const sel = form.estadoPago === key
                    return (
                      <button
                        key={key}
                        onClick={() => setField('estadoPago', key)}
                        className={`px-2 py-2 rounded-xl border-2 text-xs font-semibold transition-all
                          ${sel ? 'border-transparent' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                        style={sel ? { backgroundColor: val.bg, color: val.color, borderColor: val.color } : {}}
                      >
                        {val.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Observaciones
                </label>
                <textarea
                  value={form.observaciones}
                  onChange={e => setField('observaciones', e.target.value)}
                  placeholder="Ej: OSDE autorización N° 44821 — cubre internación completa"
                  rows={3}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm
                    focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40 resize-none"
                />
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
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
            disabled={saving || !guardiaId}
            className="flex-1 py-2.5 rounded-xl bg-[#013FF6] text-white text-sm font-semibold
              hover:bg-[#0033cc] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Crear Factura
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal de gestión (editar) ─────────────────────────────────
function ModalFactura({ factura, onClose, onSave }) {
  const [form, setForm] = useState({
    estadoCobertura: factura.estadoCobertura ?? 'pendiente_verificacion',
    estadoPago:      factura.estadoPago      ?? 'pendiente',
    montoTotal:      factura.montoTotal      ?? '',
    montoObraSocial: factura.montoObraSocial ?? '',
    montoPaciente:   factura.montoPaciente   ?? '',
    observaciones:   factura.observaciones   ?? '',
  })
  const [saving, setSaving] = useState(false)

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleMontoChange = (field, value) => {
    const val = parseFloat(value) || 0
    if (field === 'montoTotal' || field === 'montoObraSocial') {
      const total = field === 'montoTotal'      ? val : (parseFloat(form.montoTotal)      || 0)
      const os    = field === 'montoObraSocial' ? val : (parseFloat(form.montoObraSocial) || 0)
      setForm(p => ({ ...p, [field]: value, montoPaciente: Math.max(0, total - os) }))
    } else {
      setField(field, value)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        estadoCobertura: form.estadoCobertura,
        estadoPago:      form.estadoPago,
        montoTotal:      parseFloat(form.montoTotal)      || 0,
        montoObraSocial: parseFloat(form.montoObraSocial) || 0,
        montoPaciente:   parseFloat(form.montoPaciente)   || 0,
        observaciones:   form.observaciones || null,
      }
      const { data, error } = await supabase
        .from('facturacion')
        .update(payload)
        .eq('id', factura.id)
        .select()
        .single()

      if (error) throw error
      onSave({ ...factura, ...(data || payload) })
    } catch {
      onSave({ ...factura, ...form })
    } finally {
      setSaving(false)
      onClose()
    }
  }

  const fmt = n => {
    const num = parseFloat(n)
    if (!n && n !== 0) return ''
    return new Intl.NumberFormat('es-AR', {
      style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
    }).format(num)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Gestionar Facturación</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {factura.datosPaciente?.nombre} {factura.datosPaciente?.apellido} — DNI {factura.datosPaciente?.dni}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Estado de cobertura */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Estado de cobertura</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ESTADO_COBERTURA).map(([key, val]) => {
                const Icon = val.icon
                const sel  = form.estadoCobertura === key
                return (
                  <button
                    key={key}
                    onClick={() => setField('estadoCobertura', key)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all text-left
                      ${sel ? 'border-transparent' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                    style={sel ? { backgroundColor: val.bg, color: val.color, borderColor: val.color } : {}}
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                    {val.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Montos */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Monto total',          field: 'montoTotal' },
              { label: 'A cargo obra social',   field: 'montoObraSocial' },
              { label: 'A cargo paciente',      field: 'montoPaciente' },
            ].map(({ label, field }) => (
              <div key={field}>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">{label}</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form[field]}
                    onChange={e => handleMontoChange(field, e.target.value)}
                    placeholder="0"
                    readOnly={field === 'montoPaciente'}
                    className={`w-full pl-6 pr-2 py-2.5 border border-slate-200 rounded-xl text-sm
                      focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40
                      ${field === 'montoPaciente' ? 'bg-slate-50 text-slate-500' : ''}`}
                  />
                </div>
                {form[field] && (
                  <p className="text-[10px] text-slate-400 mt-0.5">{fmt(form[field])}</p>
                )}
              </div>
            ))}
          </div>

          {/* Estado de pago */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Estado de pago</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(ESTADO_PAGO).map(([key, val]) => {
                const sel = form.estadoPago === key
                return (
                  <button
                    key={key}
                    onClick={() => setField('estadoPago', key)}
                    className={`px-2 py-2 rounded-xl border-2 text-xs font-semibold transition-all
                      ${sel ? 'border-transparent' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                    style={sel ? { backgroundColor: val.bg, color: val.color, borderColor: val.color } : {}}
                  >
                    {val.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Observaciones</label>
            <textarea
              value={form.observaciones}
              onChange={e => setField('observaciones', e.target.value)}
              placeholder="Ej: OSDE autorización N° 44821 — cubre internación completa"
              rows={3}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm
                focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40 resize-none"
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
            className="flex-1 py-2.5 rounded-xl bg-[#013FF6] text-white text-sm font-semibold
              hover:bg-[#0033cc] flex items-center justify-center gap-2 disabled:opacity-60"
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
  const [facturas, setFacturas]               = useState([])
  const [loading, setLoading]                 = useState(true)
  const [search, setSearch]                   = useState('')
  const [filtroCobertura, setFiltroCobertura] = useState('all')
  const [filtroPago, setFiltroPago]           = useState('all')
  const [selected, setSelected]               = useState(null)
  const [showCrear, setShowCrear]             = useState(false)

  const fetchFacturas = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('facturacion')
        .select(`
          id,
          "guardiaId",
          "pacienteId",
          "estadoCobertura",
          "montoTotal",
          "montoObraSocial",
          "montoPaciente",
          "estadoPago",
          observaciones,
          "createdAt",
          datosPaciente:paciente!facturacion_pacienteId_fkey ( nombre, apellido, dni )
        `)
        .order('"createdAt"', { ascending: false })

      if (error) throw error
      setFacturas(data || [])
    } catch (err) {
      console.error('Facturacion error:', err)
      setFacturas([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFacturas() }, [])

  const handleSave    = updated => setFacturas(prev => prev.map(f => f.id === updated.id ? updated : f))
  const handleCreated = nueva  => setFacturas(prev => [nueva, ...prev])

  const filtered = facturas.filter(f => {
    const q = search.toLowerCase()
    const matchSearch = !search.trim() || [
      f.datosPaciente?.nombre, f.datosPaciente?.apellido, f.datosPaciente?.dni,
    ].some(v => v?.toLowerCase().includes(q))
    const matchCobertura = filtroCobertura === 'all' || f.estadoCobertura === filtroCobertura
    const matchPago      = filtroPago      === 'all' || f.estadoPago      === filtroPago
    return matchSearch && matchCobertura && matchPago
  })

  const fmt = n =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
    }).format(n ?? 0)

  // KPIs
  const totalPendienteCobro = facturas
    .filter(f => f.estadoPago === 'pendiente' || f.estadoPago === 'deuda')
    .reduce((s, f) => s + (f.montoPaciente ?? 0), 0)

  const totalObraSocial = facturas.reduce((s, f) => s + (f.montoObraSocial ?? 0), 0)
  const sinVerificar    = facturas.filter(f => f.estadoCobertura === 'pendiente_verificacion').length

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Receipt className="h-8 w-8 text-[#013FF6]" />
            Facturación
          </h1>
          <p className="text-slate-500 mt-1">
            Montos, estado de coberturas y pagos de guardia
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchFacturas}
            disabled={loading}
            className="p-2.5 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600">
            <Download className="h-4 w-4" /> Exportar
          </button>
          <button
            onClick={() => setShowCrear(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#013FF6] text-white text-sm
              font-semibold rounded-xl hover:bg-[#0033cc] shadow-lg shadow-[#013FF6]/20 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nueva Factura
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Pendiente de cobro
          </p>
          <p className="text-2xl font-extrabold text-amber-600">{fmt(totalPendienteCobro)}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {facturas.filter(f => f.estadoPago === 'pendiente' || f.estadoPago === 'deuda').length} facturas sin saldar
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            A cargo obra social
          </p>
          <p className="text-2xl font-extrabold text-[#013FF6]">{fmt(totalObraSocial)}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {facturas.filter(f => f.estadoCobertura === 'cubre_total' || f.estadoCobertura === 'cubre_parcial').length} con cobertura
          </p>
        </div>
        <div className={`rounded-2xl border shadow-sm p-5 ${sinVerificar > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Sin verificar
          </p>
          <p className={`text-2xl font-extrabold ${sinVerificar > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {sinVerificar}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">coberturas pendientes</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o DNI..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm
              focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFiltroCobertura('all')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors
              ${filtroCobertura === 'all' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            Cobertura: todas
          </button>
          {Object.entries(ESTADO_COBERTURA).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setFiltroCobertura(key)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors
                ${filtroCobertura === key ? 'text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              style={filtroCobertura === key ? { backgroundColor: val.color } : {}}
            >
              {val.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFiltroPago('all')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors
              ${filtroPago === 'all' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            Pago: todos
          </button>
          {Object.entries(ESTADO_PAGO).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setFiltroPago(key)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors
                ${filtroPago === key ? 'text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              style={filtroPago === key ? { backgroundColor: val.color } : {}}
            >
              {val.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70">
              {['Paciente', 'Cobertura', 'Monto total', 'Obra social', 'A cargo pac.', 'Pago', ''].map((h, i) => (
                <th key={i} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array(7).fill(0).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-slate-100 animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.length === 0
                ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <Receipt className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                      <p className="text-slate-400 font-medium text-sm">Sin facturas</p>
                      <button
                        onClick={() => setShowCrear(true)}
                        className="mt-3 text-sm font-semibold text-[#013FF6] hover:underline"
                      >
                        Crear la primera →
                      </button>
                    </td>
                  </tr>
                )
                : filtered.map((f, i) => {
                    const cob  = ESTADO_COBERTURA[f.estadoCobertura] || ESTADO_COBERTURA.pendiente_verificacion
                    const pago = ESTADO_PAGO[f.estadoPago]           || ESTADO_PAGO.pendiente
                    const CobIcon = cob.icon
                    return (
                      <tr
                        key={f.id}
                        className={`border-b border-slate-100/60 hover:bg-slate-50/50 transition-colors
                          ${i % 2 ? 'bg-slate-50/20' : ''}`}
                      >
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-slate-900">
                            {f.datosPaciente?.nombre} {f.datosPaciente?.apellido}
                          </p>
                          <p className="text-xs text-slate-400">DNI {f.datosPaciente?.dni}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ backgroundColor: cob.bg, color: cob.color }}
                          >
                            <CobIcon className="h-3 w-3" />
                            {cob.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-900">{fmt(f.montoTotal)}</td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {f.montoObraSocial > 0 ? fmt(f.montoObraSocial) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {f.montoPaciente > 0 ? fmt(f.montoPaciente) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ backgroundColor: pago.bg, color: pago.color }}
                          >
                            {pago.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => setSelected(f)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#013FF6] hover:bg-[#013FF6]/10 transition-colors"
                            title="Editar"
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

        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-400">
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Modales */}
      {showCrear && (
        <ModalCrearFactura
          onClose={() => setShowCrear(false)}
          onCreated={handleCreated}
        />
      )}
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