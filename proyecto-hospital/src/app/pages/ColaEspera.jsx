import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  Users, Clock, UserPlus, ChevronUp, ChevronDown,
  CheckCircle2, XCircle, Bell, RefreshCw, Stethoscope,
} from 'lucide-react'

// ── Prioridades / triaje ──────────────────────────────────────
const TRIAGE = {
  1: { label: 'Rojo',     color: '#ef4444', bg: '#fee2e2', descripcion: 'Crítico'    },
  2: { label: 'Naranja',  color: '#f97316', bg: '#ffedd5', descripcion: 'Urgente'    },
  3: { label: 'Amarillo', color: '#eab308', bg: '#fef9c3', descripcion: 'Moderado'   },
  4: { label: 'Verde',    color: '#22c55e', bg: '#dcfce7', descripcion: 'Leve'       },
  5: { label: 'Azul',     color: '#3b82f6', bg: '#dbeafe', descripcion: 'No urgente' },
}

const ESTADOS = {
  en_espera:   { label: 'En espera',    color: '#f59e0b' },
  en_atencion: { label: 'En atención',  color: '#013FF6' },
  atendido:    { label: 'Atendido',     color: '#22c55e' },
  derivado:    { label: 'Derivado',     color: '#8b5cf6' },
}

// ── Demo data ─────────────────────────────────────────────────
let _counter = 1
const makeDemo = () => [
  { id: _counter++, numero: 1, paciente: { nombre: 'Carlos',    apellido: 'Méndez',    dni: '28.453.123' }, estado: 'en_atencion', nivelTriage: 3, motivo: 'Dolor abdominal',      ingresoAt: new Date(Date.now() - 55 * 60000).toISOString(), medicoAsignado: 'Dr. Ramírez'  },
  { id: _counter++, numero: 2, paciente: { nombre: 'Ana',       apellido: 'Silva',     dni: '33.120.456' }, estado: 'en_espera',   nivelTriage: 4, motivo: 'Fiebre alta',           ingresoAt: new Date(Date.now() - 40 * 60000).toISOString(), medicoAsignado: null           },
  { id: _counter++, numero: 3, paciente: { nombre: 'Pedro',     apellido: 'Gómez',     dni: '40.987.654' }, estado: 'en_espera',   nivelTriage: 2, motivo: 'Dolor en el pecho',     ingresoAt: new Date(Date.now() - 25 * 60000).toISOString(), medicoAsignado: null           },
  { id: _counter++, numero: 4, paciente: { nombre: 'María',     apellido: 'López',     dni: '25.654.321' }, estado: 'en_espera',   nivelTriage: 5, motivo: 'Consulta general',       ingresoAt: new Date(Date.now() - 18 * 60000).toISOString(), medicoAsignado: null           },
  { id: _counter++, numero: 5, paciente: { nombre: 'Juan',      apellido: 'Fernández', dni: '37.223.789' }, estado: 'en_espera',   nivelTriage: 4, motivo: 'Corte en mano derecha', ingresoAt: new Date(Date.now() - 10 * 60000).toISOString(), medicoAsignado: null           },
  { id: _counter++, numero: 6, paciente: { nombre: 'Lucía',     apellido: 'Torres',    dni: '41.223.001' }, estado: 'atendido',    nivelTriage: 3, motivo: 'Mareos y vómitos',      ingresoAt: new Date(Date.now() - 90 * 60000).toISOString(), medicoAsignado: 'Dra. Varela'  },
  { id: _counter++, numero: 7, paciente: { nombre: 'Roberto',   apellido: 'Díaz',      dni: '29.887.554' }, estado: 'en_espera',   nivelTriage: 4, motivo: 'Dolor de garganta',     ingresoAt: new Date(Date.now() - 5  * 60000).toISOString(), medicoAsignado: null           },
]

// ── Helpers ───────────────────────────────────────────────────
function minutos(isoStr) {
  return Math.floor((Date.now() - new Date(isoStr)) / 60000)
}

function fmtMin(min) {
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)}h ${min % 60}m`
}

// ── Componente tarjeta de paciente ────────────────────────────
function PacienteCard({ item, onEstado, onLlamar }) {
  const t = TRIAGE[item.nivelTriage] || TRIAGE[5]
  const e = ESTADOS[item.estado]    || ESTADOS.en_espera
  const espera = minutos(item.ingresoAt)

  return (
    <div
      className={`bg-white rounded-2xl border-2 shadow-sm p-4 transition-all
        ${item.estado === 'en_atencion' ? 'border-[#013FF6]/40 shadow-[#013FF6]/10' : 'border-slate-100'}`}
    >
      <div className="flex items-start gap-3">
        {/* Número de turno */}
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
          <span className="text-lg font-extrabold text-slate-700">#{item.numero}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-slate-900">
              {item.paciente.nombre} {item.paciente.apellido}
            </p>
            {/* Triage badge */}
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: t.bg, color: t.color }}
            >
              {t.label} · {t.descripcion}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">DNI {item.paciente.dni}</p>
          <p className="text-sm text-slate-600 mt-1 font-medium truncate">{item.motivo}</p>

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="h-3 w-3" />
              Esperando {fmtMin(espera)}
            </span>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${e.color}20`, color: e.color }}
            >
              {e.label}
            </span>
            {item.medicoAsignado && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Stethoscope className="h-3 w-3" />
                {item.medicoAsignado}
              </span>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          {item.estado === 'en_espera' && (
            <>
              <button
                onClick={() => onLlamar(item.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#013FF6] text-white hover:bg-[#0033cc] transition-colors"
              >
                <Bell className="h-3 w-3" /> Llamar
              </button>
              <button
                onClick={() => onEstado(item.id, 'en_atencion')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#ACEC00]/20 text-slate-700 hover:bg-[#ACEC00]/40 transition-colors"
              >
                <CheckCircle2 className="h-3 w-3" /> Llamar
              </button>
            </>
          )}
          {item.estado === 'en_atencion' && (
            <button
              onClick={() => onEstado(item.id, 'atendido')}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
            >
              <CheckCircle2 className="h-3 w-3" /> Finalizar
            </button>
          )}
          {(item.estado === 'en_espera' || item.estado === 'en_atencion') && (
            <button
              onClick={() => onEstado(item.id, 'derivado')}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <XCircle className="h-3 w-3" /> Derivar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
export function ColaEspera() {
  const [lista, setLista]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [filtro, setFiltro]     = useState('activos')
  const tickRef = useRef(null)

  const fetchCola = async () => {
    try {
      const { data, error } = await supabase
        .from('guardia')
        .select(`id, numero, estado, nivelTriage, motivo, ingresoAt, medicoAsignado:medicoId, paciente ( nombre, apellido, dni )`)
        .order('nivelTriage', { ascending: true })
        .order('ingresoAt',   { ascending: true })
      if (error) throw error
      setLista(data || [])
    } catch {
      setLista(makeDemo())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCola()
    // Refrescar cada 60s para actualizar tiempos de espera
    tickRef.current = setInterval(() => setLista(l => [...l]), 30000)
    return () => clearInterval(tickRef.current)
  }, [])

  const handleEstado = (id, nuevoEstado) => {
    setLista(prev => prev.map(p => p.id === id ? { ...p, estado: nuevoEstado } : p))
  }

  const handleLlamar = (id) => {
    // En producción: llamar al paciente por pantalla / altavoz
    setLista(prev => prev.map(p => p.id === id ? { ...p, estado: 'en_atencion' } : p))
  }

  const activos  = lista.filter(p => ['en_espera', 'en_atencion'].includes(p.estado))
  const cerrados = lista.filter(p => ['atendido', 'derivado'].includes(p.estado))
  const mostrar  = filtro === 'activos' ? activos : cerrados

  // Stats
  const criticos = activos.filter(p => p.nivelTriage <= 2).length
  const maxEspera = activos.length
    ? Math.max(...activos.map(p => minutos(p.ingresoAt)))
    : 0

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8 text-[#013FF6]" />
            Cola de Espera
          </h1>
          <p className="text-slate-500 mt-1">Orden de llegada del día — actualizado automáticamente</p>
        </div>
        <button
          onClick={fetchCola}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
          <p className="text-3xl font-extrabold text-slate-900">{activos.filter(p => p.estado === 'en_espera').length}</p>
          <p className="text-xs font-semibold text-slate-500 mt-1">En espera</p>
        </div>
        <div className={`rounded-2xl border shadow-sm p-4 text-center ${criticos > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'}`}>
          <p className={`text-3xl font-extrabold ${criticos > 0 ? 'text-red-600' : 'text-slate-900'}`}>{criticos}</p>
          <p className="text-xs font-semibold text-slate-500 mt-1">Críticos / Urgentes</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
          <p className="text-3xl font-extrabold text-slate-900">{fmtMin(maxEspera)}</p>
          <p className="text-xs font-semibold text-slate-500 mt-1">Máx. espera</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'activos',  label: `Activos (${activos.length})` },
          { key: 'cerrados', label: `Cerrados hoy (${cerrados.length})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setFiltro(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors
              ${filtro === t.key ? 'bg-[#013FF6] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {loading
          ? Array(4).fill(0).map((_, i) => (
              <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-2xl" />
            ))
          : mostrar.length === 0
          ? (
            <div className="text-center py-16 text-slate-400">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">
                {filtro === 'activos' ? 'No hay pacientes en espera' : 'Sin atenciones finalizadas hoy'}
              </p>
            </div>
          )
          : mostrar.map(item => (
              <PacienteCard
                key={item.id}
                item={item}
                onEstado={handleEstado}
                onLlamar={handleLlamar}
              />
            ))
        }
      </div>
    </div>
  )
}