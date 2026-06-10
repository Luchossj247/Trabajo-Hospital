import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  FileText, Search, User, Calendar, Activity,
  AlertTriangle, ChevronDown, ChevronRight, Shield,
  CreditCard, Loader2, Eye,
} from 'lucide-react'


// ── Calcular edad ─────────────────────────────────────────────
function calcEdad(fechaNacimiento) {
  if (!fechaNacimiento) return '—'
  const hoy = new Date()
  const nac = new Date(fechaNacimiento)
  let edad = hoy.getFullYear() - nac.getFullYear()
  const m = hoy.getMonth() - nac.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
  return edad
}

// ── Panel de historial expandido ──────────────────────────────
function HistorialPanel({ paciente }) {
  const h = paciente.historialClinico?.[0] || {}
  const c = paciente.coberturaMedica?.[0] || null

  const estadoCob = {
    'Cubre': {
      label: 'Cubre',
      color: '#ACEC00',
      text: '#1a1a1a'
    },
    'No cubre': {
      label: 'No cubre',
      color: '#ef4444',
      text: '#fff'
    },
    'Pendiente': {
      label: 'Por verificar',
      color: '#f59e0b',
      text: '#fff'
    }
  }[c?.estadoCobertura] ?? {
    label: 'Sin verificar',
    color: '#94a3b8',
    text: '#fff'
  }

  return (
    <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 space-y-5">

      {/* Aviso de solo lectura */}
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-800">
        <Shield className="h-3.5 w-3.5 flex-shrink-0" />
        Vista de solo lectura — el historial clínico solo puede ser modificado por personal médico
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Datos personales */}
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" /> Datos del paciente
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Edad</span>
              <span className="font-semibold text-slate-900">{calcEdad(paciente.fechaNacimiento)} años</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Sexo</span>
              <span className="font-semibold text-slate-900">{paciente.sexo === 'M' ? 'Masculino' : paciente.sexo === 'F' ? 'Femenino' : 'Otro'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Grupo sanguíneo</span>
              <span className="font-bold text-red-600">{paciente.grupoSanguineo || '—'}</span>
            </div>
            {paciente.alergias && (
              <div className="mt-2 p-2 bg-red-50 rounded-lg flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs font-semibold text-red-700">
                  Alergia: {paciente.alergias}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Cobertura */}
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5" /> Cobertura médica
          </h4>
          {c ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Obra Social</span>
                <span className="font-semibold text-slate-900">{c.obraSocial || 'Particular'}</span>
              </div>
              {c.numeroAfiliado && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Nº Afiliado</span>
                  <span className="font-mono text-xs text-slate-700">{c.numeroAfiliado}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Estado</span>
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: estadoCob.color, color: estadoCob.text }}
                >
                  {estadoCob.label}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Sin cobertura registrada</p>
          )}
        </div>
      </div>

      {/* Observaciones */}
      {h.observacionesGenerales && (
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" /> Observaciones clínicas
          </h4>
          <p className="text-sm text-slate-700">{h.observacionesGenerales}</p>
        </div>
      )}

      {/* Atenciones anteriores */}
      {h.atenciones?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> Atenciones anteriores
          </h4>
          <div className="space-y-2">
            {h.atenciones.map(a => (
              <div key={a.id} className="flex items-center gap-3 text-sm py-2 border-b border-slate-50 last:border-0">
                <span className="text-xs font-mono text-slate-400 w-24 flex-shrink-0">
                  {new Date(a.fecha).toLocaleDateString('es-AR')}
                </span>
                <span className="flex-1 font-medium text-slate-700 truncate">{a.motivo}</span>
                <span className="text-xs text-slate-400 truncate hidden sm:block">{a.medico}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0
                  ${a.estado === 'Alta' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {a.estado}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documentos */}
      {h.documentoClinico?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Documentos clínicos
          </h4>
          <div className="space-y-2">
            {h.documentoClinico.map(d => (
              <div key={d.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                <div className="w-8 h-8 bg-[#013FF6]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="h-4 w-4 text-[#013FF6]" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {d.descripcion || 'Documento clínico'}
                  </p>

                  <p className="text-xs text-slate-400">
                    {d.subidoAt
                      ? new Date(d.subidoAt).toLocaleDateString('es-AR')
                      : 'Fecha no disponible'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
export function HistorialAdmin() {
  const [pacientes, setPacientes] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [expanded, setExpanded]   = useState(null)

  useEffect(() => {
    const fetchPacientes = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('paciente')
          .select(`
            id, nombre, apellido, dni, fechaNacimiento, sexo, telefono, email, grupoSanguineo, alergias,
            coberturaMedica ( obraSocial, numeroAfiliado, estadoCobertura ),
            historialClinico ( observacionesGenerales, documentoClinico (*) )
          `)
          .order('apellido')
        if (error) throw error
        setPacientes(data || [])
      } catch {
        await new Promise(r => setTimeout(r, 500))
        setPacientes([])
      } finally {
        setLoading(false)
      }
    }
    fetchPacientes()
  }, [])

  const filtered = pacientes.filter(p => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return [p.nombre, p.apellido, p.dni].some(v => v?.toLowerCase().includes(q))
  })

  const toggle = id => setExpanded(prev => prev === id ? null : id)

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <FileText className="h-8 w-8 text-[#013FF6]" />
          Historial Clínico
        </h1>
        <p className="text-slate-500 mt-1">
          Acceso de solo lectura para consulta administrativa — cobertura y atenciones previas
        </p>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre o DNI..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40"
        />
      </div>

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading
          ? Array(4).fill(0).map((_, i) => (
              <div key={i} className="h-16 border-b border-slate-100 px-5 py-4">
                <div className="h-4 bg-slate-100 animate-pulse rounded w-64" />
              </div>
            ))
          : filtered.length === 0
          ? (
            <div className="text-center py-16 text-slate-400">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Sin resultados</p>
            </div>
          )
          : filtered.map(p => {
              const isOpen = expanded === p.id
              const c = p.coberturaMedica?.[0]
              return (
                <div key={p.id} className="border-b border-slate-100 last:border-0">
                  <button
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50/70 transition-colors text-left"
                    onClick={() => toggle(p.id)}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-[#013FF6]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-extrabold text-[#013FF6]">
                        {(p.nombre || 'P')[0].toUpperCase()}
                      </span>
                    </div>

                    {/* Nombre / DNI */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900">
                        {p.apellido}, {p.nombre}
                      </p>
                      <p className="text-xs text-slate-400">DNI {p.dni} · {calcEdad(p.fechaNacimiento)} años</p>
                    </div>

                    {/* Cobertura */}
                    <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600">
                      <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                      {c?.obraSocial || 'Particular'}
                    </div>

                    {/* Alergia warning */}
                    {p.alergias && (
                      <div className="hidden md:flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                        <AlertTriangle className="h-3 w-3" />
                        Alergia
                      </div>
                    )}

                    {/* Ver historial */}
                    <div className="flex items-center gap-1 text-xs font-semibold text-[#013FF6] flex-shrink-0">
                      <Eye className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Historial</span>
                      {isOpen
                        ? <ChevronDown className="h-4 w-4" />
                        : <ChevronRight className="h-4 w-4" />
                      }
                    </div>
                  </button>

                  {isOpen && <HistorialPanel paciente={p} />}
                </div>
              )
            })
        }
      </div>
    </div>
  )
}