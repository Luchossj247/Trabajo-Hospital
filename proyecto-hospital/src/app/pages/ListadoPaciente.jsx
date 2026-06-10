import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPacientes, searchPacientes } from '../../services/pacienteService'
import {
  UserPlus, Search, User, CheckCircle2, XCircle,
  ChevronRight, Loader2, RefreshCw,
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

export function ListadoPacientes() {
  const navigate = useNavigate()
  const [pacientes, setPacientes]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [searching, setSearching]   = useState(false)

  const fetchPacientes = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPacientes()
      setPacientes(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPacientes() }, [fetchPacientes])

  // Búsqueda con debounce
  useEffect(() => {
    if (!search.trim()) {
      fetchPacientes()
      return
    }
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const data = await searchPacientes(search)
        setPacientes(data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <User className="h-8 w-8 text-[#013FF6]" />
            Pacientes
          </h2>
          <p className="text-slate-500 font-medium mt-1">
            {loading ? '...' : `${pacientes.length} paciente${pacientes.length !== 1 ? 's' : ''} registrado${pacientes.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchPacientes}
            disabled={loading}
            className="p-2.5 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/empleado/registro/nuevo')}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#013FF6] text-white text-sm
              font-semibold rounded-xl hover:bg-[#0033cc] shadow-lg shadow-[#013FF6]/20 transition-colors"
          >
            <UserPlus className="h-4 w-4" /> Nuevo Paciente
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        {searching && (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
        )}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, apellido o DNI..."
          className="w-full pl-10 pr-10 py-3 text-sm border border-slate-200 rounded-xl
            focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40 bg-white"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70">
              {['Paciente', 'DNI', 'Edad', 'Cobertura', 'Registrado', ''].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array(6).fill(0).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-slate-100 animate-pulse rounded-md" />
                      </td>
                    ))}
                  </tr>
                ))
              : pacientes.length === 0
                ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <User className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 font-medium">
                        {search ? `No se encontraron pacientes para "${search}"` : 'No hay pacientes registrados'}
                      </p>
                    </td>
                  </tr>
                )
                : pacientes.map((p, i) => {
                  const cobertura = p.coberturaMedica?.[0]
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-slate-100/60 hover:bg-slate-50/50 transition-colors
                        ${i % 2 === 0 ? '' : 'bg-slate-50/20'}`}
                    >
                      {/* Paciente */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#013FF6]/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-[#013FF6]">
                              {p.nombre[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{p.nombre} {p.apellido}</p>
                            <p className="text-xs text-slate-400 capitalize">{p.sexo === 'M' ? 'Masculino' : p.sexo === 'F' ? 'Femenino' : 'Otro'}</p>
                          </div>
                        </div>
                      </td>

                      {/* DNI */}
                      <td className="px-5 py-3.5 text-slate-600 font-mono text-sm">
                        {p.dni}
                      </td>

                      {/* Edad */}
                      <td className="px-5 py-3.5 text-slate-600">
                        {calcularEdad(p.fechaNacimiento)}
                      </td>

                      {/* Cobertura */}
                      <td className="px-5 py-3.5">
                        {cobertura?.obraSocial ? (
                          <div className="flex items-center gap-1.5">
                            {['cubre_total','cubre_parcial'].includes(cobertura.estadoCobertura)
                              ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                              : <XCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                            }
                            <span className="text-sm text-slate-700">{cobertura.obraSocial}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Particular</span>
                        )}
                      </td>

                      {/* Fecha registro */}
                      <td className="px-5 py-3.5 text-xs text-slate-400">
                        {p.createdAt
                          ? new Date(p.createdAt).toLocaleDateString('es-AR', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })
                          : '—'}
                      </td>

                      {/* Acción */}
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => navigate(`/empleado/registro/${p.id}`)}
                          className="flex items-center gap-1 text-xs font-semibold text-[#013FF6]
                            hover:underline"
                        >
                          Ver <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })
            }
          </tbody>
        </table>

        {!loading && pacientes.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-400">
              {pacientes.length} resultado{pacientes.length !== 1 ? 's' : ''}
              {search && ` para "${search}"`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}