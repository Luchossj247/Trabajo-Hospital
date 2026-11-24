import { useState } from 'react'
import { Printer, Loader2 } from 'lucide-react'

// Botón para generar un documento (PDF/impresión o CSV). Muestra el progreso y, si falla,
// el motivo debajo del botón, sin usar ventanas emergentes.
export function BotonDocumento({ onGenerar, children = 'Imprimir / PDF', icon: Icon = Printer, compact = false, title, className = '' }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const click = async (e) => {
    e.stopPropagation()
    setLoading(true); setError('')
    try { await onGenerar() }
    catch (err) { setError(err.message || 'No se pudo generar el documento.') }
    finally { setLoading(false) }
  }

  const icono = loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />

  return (
    <span className="inline-flex flex-col items-start">
      {compact ? (
        <button type="button" onClick={click} disabled={loading} title={title || String(children)} aria-label={title || String(children)}
          className={`p-1.5 rounded-lg text-slate-400 hover:text-[#013FF6] hover:bg-[#013FF6]/10 transition-colors disabled:opacity-50 ${className}`}>
          {icono}
        </button>
      ) : (
        <button type="button" onClick={click} disabled={loading} title={title}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-700 disabled:opacity-50 ${className}`}>
          {icono} {children}
        </button>
      )}
      {error && <span className="text-xs text-red-600 mt-1 max-w-[220px]">{error}</span>}
    </span>
  )
}
