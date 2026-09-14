import { useState, useEffect } from 'react'
import { FileText, Activity, Calendar, Loader2, ShieldAlert } from 'lucide-react'
import { getHistorialCompleto } from '../../services/historialClinicoService'
import { usePacienteAuth } from '../context/PacienteAuthContext'

const ESTADO_ATENCION = {
  en_curso: { label: 'En curso', bg: '#dbeafe', color: '#2563eb' },
  alta:     { label: 'Alta',     bg: '#dcfce7', color: '#16a34a' },
  derivado: { label: 'Derivado', bg: '#ede9fe', color: '#7c3aed' },
}

export function PacienteHistorial() {
  const { paciente } = usePacienteAuth()
  const [historial, setHistorial] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(false)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        setHistorial(await getHistorialCompleto(paciente.id))
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    })()
  }, [paciente.id])

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <FileText className="h-8 w-8 text-[#013FF6]" /> Mi Historial Clínico
        </h1>
        <p className="text-slate-500 mt-1">Solo lectura — la información la carga el equipo médico</p>
      </div>

      {loading ? (
        <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto" /></div>
      ) : error || !historial ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-16 text-slate-400">
          <FileText className="h-10 w-10 mb-3 opacity-30" />
          <p className="font-semibold">Todavía no hay historial clínico cargado</p>
        </div>
      ) : (
        <>
          {/* Alergias, si tiene */}
          {paciente.alergias && (
            <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-2xl">
              <ShieldAlert className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm font-semibold text-red-700">Alergia registrada: {paciente.alergias}</p>
            </div>
          )}

          {/* Observaciones generales */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
              <Activity className="h-4 w-4 text-[#013FF6]" /> Observaciones generales
            </h3>
            {historial.observacionesGenerales ? (
              <p className="text-sm text-slate-700 leading-relaxed">{historial.observacionesGenerales}</p>
            ) : (
              <p className="text-sm text-slate-400">Sin observaciones registradas.</p>
            )}
          </div>

          {/* Atenciones */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
              <Calendar className="h-4 w-4 text-[#013FF6]" /> Atenciones
            </h3>
            {historial.atencionMedica.length === 0 ? (
              <p className="text-sm text-slate-400">Sin atenciones registradas todavía.</p>
            ) : (
              <div className="space-y-2">
                {historial.atencionMedica.map(a => {
                  const est = ESTADO_ATENCION[a.estado] || ESTADO_ATENCION.en_curso
                  return (
                    <div key={a.id} className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
                      <span className="text-xs font-mono text-slate-400 w-24 flex-shrink-0 pt-0.5">
                        {new Date(a.fecha).toLocaleDateString('es-AR')}
                      </span>
                      <p className="flex-1 text-sm font-medium text-slate-700">{a.motivo}</p>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                        style={{ backgroundColor: est.bg, color: est.color }}>
                        {est.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}