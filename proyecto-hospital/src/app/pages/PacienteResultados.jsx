import { useState, useEffect } from 'react'
import { FlaskConical, Loader2, FileText } from 'lucide-react'
import { getHistorialCompleto } from '../../services/historialClinicoService'
import { usePacienteAuth } from '../context/PacienteAuthContext'

export function PacienteResultados() {
  const { paciente } = usePacienteAuth()
  const [documentos, setDocumentos] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(false)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const historial = await getHistorialCompleto(paciente.id)
        setDocumentos(historial.documentoClinico || [])
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
          <FlaskConical className="h-8 w-8 text-[#013FF6]" /> Mis Resultados
        </h1>
        <p className="text-slate-500 mt-1">Estudios e informes cargados por el equipo médico</p>
      </div>

      {loading ? (
        <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto" /></div>
      ) : error || documentos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-16 text-slate-400">
          <FlaskConical className="h-10 w-10 mb-3 opacity-30" />
          <p className="font-semibold">Todavía no hay resultados cargados</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
          {documentos.map(d => (
            <a key={d.id} href={d.urlArchivo} target="_blank" rel="noreferrer"
              className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-[#013FF6]/10 flex items-center justify-center flex-shrink-0">
                <FileText className="h-4 w-4 text-[#013FF6]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{d.descripcion || 'Documento clínico'}</p>
                <p className="text-xs text-slate-400 capitalize">{d.tipo} · {new Date(d.subidoAt).toLocaleDateString('es-AR')}</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}