import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  Users, RefreshCw, Search, Shield, ShieldOff, UserPlus,
} from 'lucide-react'
import { Link } from 'react-router-dom'

function minutos(isoStr) {
  if (!isoStr) return 0
  return Math.floor((Date.now() - new Date(isoStr)) / 60000)
}

function fmtMin(min) {
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)}h ${min % 60}m`
}

function fmtHora(isoStr) {
  if (!isoStr) return '—'
  return new Date(isoStr).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

const ESTADO_COLORS = {
  en_espera:   { label: 'En espera',   bg: '#fef3c7', color: '#92400e' },
  en_atencion: { label: 'En atención', bg: '#dbeafe', color: '#1e40af' },
  atendido:    { label: 'Atendido',    bg: '#d1fae5', color: '#065f46' },
  derivado:    { label: 'Derivado',    bg: '#ede9fe', color: '#5b21b6' },
}

function FilaPaciente({ item, numero }) {
  const espera    = minutos(item.ingresoAt)
  const isLarga   = espera > 60
  const estado    = ESTADO_COLORS[item.estado] || ESTADO_COLORS.en_espera
  const cobertura = item.paciente?.coberturaMedica?.[0]

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors border-b border-slate-100/80 last:border-0">
      <span className="w-7 text-center text-sm font-extrabold text-slate-400 flex-shrink-0">{numero}</span>
      <div className="w-9 h-9 rounded-full bg-[#013FF6]/10 flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-bold text-[#013FF6]">
          {(item.paciente?.nombre?.[0] || 'P').toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">
          {item.paciente?.nombre} {item.paciente?.apellido}
        </p>
        <p className="text-xs text-slate-400">DNI {item.paciente?.dni || '—'}</p>
      </div>
      <p className="hidden md:block text-xs text-slate-500 truncate max-w-[160px] flex-shrink-0">
        {item.motivo || '—'}
      </p>
      <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
        {cobertura?.obraSocial ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#ACEC00]/20 text-slate-700">
            <Shield className="h-3 w-3 text-[#013FF6]" />
            {cobertura.obraSocial}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
            <ShieldOff className="h-3 w-3" />
            Particular
          </span>
        )}
      </div>
      <span
        className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
        style={{ backgroundColor: estado.bg, color: estado.color }}
      >
        {estado.label}
      </span>
      <div className="hidden lg:flex flex-col items-end flex-shrink-0 text-right">
        <span className="text-xs font-semibold text-slate-700">{fmtHora(item.ingresoAt)}</span>
        <span className={`text-[10px] font-medium ${isLarga ? 'text-red-400' : 'text-slate-400'}`}>
          {fmtMin(espera)}{isLarga && ' ⚠'}
        </span>
      </div>
    </div>
  )
}

export function ColaEspera() {
  const [lista, setLista]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState('activos')
  const tickRef = useRef(null)

  const fetchCola = useCallback(async () => {
    setError(null)
    try {
      const { data: guardias, error: e1 } = await supabase
        .from('guardia')
        .select(`
          id, estado, "ingresoAt", "medioIngreso",
          paciente (
            id, nombre, apellido, dni
          )
        `)
        .order('ingresoAt', { ascending: true })

      if (e1) throw e1

      const pacienteIds = [...new Set(guardias.map(g => g.paciente?.id).filter(Boolean))]

      let coberturas = []
      if (pacienteIds.length) {
        const { data: cob, error: e2 } = await supabase
          .from('coberturaMedica')
          .select('"pacienteId", "obraSocial", "estadoCobertura"')
          .in('pacienteId', pacienteIds)

        if (e2) throw e2
        coberturas = cob || []
      }

      const cobByPaciente = coberturas.reduce((acc, c) => {
        const pid = c.pacienteId
        if (!acc[pid]) acc[pid] = []
        acc[pid].push(c)
        return acc
      }, {})

      setLista(guardias.map(g => ({
        ...g,
        paciente: g.paciente
          ? { ...g.paciente, coberturaMedica: cobByPaciente[g.paciente.id] || [] }
          : null,
      })))
    } catch (err) {
      setError(err.message || 'Error al cargar la cola')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCola()
    tickRef.current = setInterval(() => setLista(l => [...l]), 30_000)
    return () => clearInterval(tickRef.current)
  }, [fetchCola])

  const activos  = lista.filter(p => ['en_espera', 'en_atencion'].includes(p.estado))
  const cerrados = lista.filter(p => ['atendido', 'derivado'].includes(p.estado))
  const base     = filtro === 'activos' ? activos : cerrados

  const mostrar = base.filter(p => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return [p.paciente?.nombre, p.paciente?.apellido, p.paciente?.dni]
      .some(v => v?.toLowerCase().includes(q))
  })

  const esperando    = activos.filter(p => p.estado === 'en_espera').length
  const conCobertura = activos.filter(p => p.paciente?.coberturaMedica?.[0]?.obraSocial).length
  const maxEspera    = activos.length ? Math.max(...activos.map(p => minutos(p.ingresoAt))) : 0
  const esperaLarga  = activos.filter(p => minutos(p.ingresoAt) > 60).length

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8 text-[#013FF6]" />
            Cola de Espera
          </h1>
          <p className="text-slate-500 mt-1">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
            {' · '}orden de llegada
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCola}
            disabled={loading}
            className="p-2.5 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/empleado/registro"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#013FF6] text-white text-sm font-semibold rounded-xl hover:bg-[#0033cc] shadow-lg shadow-[#013FF6]/20 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Registrar paciente
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'En espera',     value: esperando,         color: '#f59e0b' },
          { label: 'Con cobertura', value: conCobertura,      color: '#013FF6' },
          { label: 'Máx. espera',   value: fmtMin(maxEspera), color: '#8b5cf6' },
          { label: 'Espera larga',  value: esperaLarga,       color: esperaLarga > 0 ? '#ef4444' : '#22c55e' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-extrabold" style={{ color }}>{value}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex gap-1.5">
            {[
              { key: 'activos',  label: `Activos (${activos.length})` },
              { key: 'cerrados', label: `Cerrados (${cerrados.length})` },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setFiltro(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                  ${filtro === t.key ? 'bg-[#013FF6] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o DNI..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40"
            />
          </div>
        </div>

        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4">
                <div className="w-7 h-4 bg-slate-100 animate-pulse rounded" />
                <div className="w-9 h-9 rounded-full bg-slate-100 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-40 bg-slate-100 animate-pulse rounded" />
                  <div className="h-3 w-24 bg-slate-100 animate-pulse rounded" />
                </div>
                <div className="h-5 w-20 bg-slate-100 animate-pulse rounded-full" />
              </div>
            ))}
          </div>
        ) : mostrar.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Users className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-semibold">
              {filtro === 'activos' ? 'No hay pacientes en espera' : 'Sin atenciones cerradas hoy'}
            </p>
            {filtro === 'activos' && (
              <Link to="/empleado/registro" className="mt-3 text-sm font-semibold text-[#013FF6] hover:underline">
                Registrar el primero →
              </Link>
            )}
          </div>
        ) : (
          mostrar.map((item, idx) => (
            <FilaPaciente key={item.id} item={item} numero={idx + 1} />
          ))
        )}

        {!loading && mostrar.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-400">
              <span className="font-semibold text-slate-600">{mostrar.length}</span> paciente{mostrar.length !== 1 ? 's' : ''}
              {conCobertura > 0 && filtro === 'activos' && (
                <> · <span className="font-semibold text-slate-600">{conCobertura}</span> con cobertura</>
              )}
              {esperaLarga > 0 && filtro === 'activos' && (
                <> · <span className="font-semibold text-red-500">{esperaLarga} con espera {'>'} 1h</span></>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}