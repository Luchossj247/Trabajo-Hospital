import { useState, useEffect, useCallback } from 'react'
import { ScrollText, RefreshCw, Loader2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { getAuditoria, getTablasAuditadas } from '../../services/auditoriaService'

const ACCION_STYLE = {
  INSERT: { label: 'Alta',          bg: '#dcfce7', color: '#16a34a' },
  UPDATE: { label: 'Modificación',  bg: '#dbeafe', color: '#2563eb' },
  DELETE: { label: 'Baja',          bg: '#fee2e2', color: '#dc2626' },
}
const PAGE = 50

// Campos que cambiaron entre el estado anterior y el nuevo
function diff(prev, next) {
  if (!prev || !next) return null
  return Object.keys(next)
    .filter(k => JSON.stringify(prev[k]) !== JSON.stringify(next[k]) && k !== 'updatedAt')
    .map(k => ({ campo: k, antes: prev[k], despues: next[k] }))
}

const fmt = (v) => (v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v))

function Fila({ r }) {
  const [open, setOpen] = useState(false)
  const st = ACCION_STYLE[r.accion] || ACCION_STYLE.UPDATE
  const cambios = r.accion === 'UPDATE' ? diff(r.datosAnteriores, r.datosNuevos) : null
  return (
    <>
      <tr className="border-b border-slate-50 hover:bg-slate-50/60 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{new Date(r.createdAt).toLocaleString('es-AR')}</td>
        <td className="px-4 py-3 text-sm text-slate-700">
          {r.usuario ? `${r.usuario.nombre} ${r.usuario.apellido}` : <span className="text-slate-400">Sistema</span>}
          {r.usuario?.rol && <span className="ml-1.5 text-[10px] text-slate-400 capitalize">({r.usuario.rol})</span>}
        </td>
        <td className="px-4 py-3">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
        </td>
        <td className="px-4 py-3 text-sm font-mono text-slate-600">{r.tablaAfectada}</td>
        <td className="px-4 py-3 text-right text-slate-300">{open ? <ChevronUp className="h-4 w-4 inline" /> : <ChevronDown className="h-4 w-4 inline" />}</td>
      </tr>
      {open && (
        <tr className="bg-slate-50/70">
          <td colSpan={5} className="px-4 py-3">
            <p className="text-[11px] text-slate-400 mb-2 font-mono">registro {r.registroId || '—'}</p>
            {cambios ? (
              cambios.length === 0 ? <p className="text-xs text-slate-400">Sin cambios relevantes.</p> : (
                <div className="space-y-1">
                  {cambios.map(c => (
                    <p key={c.campo} className="text-xs text-slate-600">
                      <span className="font-semibold">{c.campo}:</span>{' '}
                      <span className="text-red-500 line-through">{fmt(c.antes)}</span> → <span className="text-emerald-600">{fmt(c.despues)}</span>
                    </p>
                  ))}
                </div>
              )
            ) : (
              <pre className="text-[11px] text-slate-600 whitespace-pre-wrap break-all max-h-48 overflow-auto">
                {JSON.stringify(r.datosNuevos || r.datosAnteriores, null, 2)}
              </pre>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

export function Auditoria() {
  const [rows, setRows]       = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(0)
  const [tabla, setTabla]     = useState('')
  const [accion, setAccion]   = useState('')
  const [tablas, setTablas]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const { rows, total } = await getAuditoria({ tabla, accion, limit: PAGE, offset: page * PAGE })
      setRows(rows); setTotal(total)
    } catch (err) { setError(err.message || 'Error al cargar la auditoría.') }
    finally { setLoading(false) }
  }, [tabla, accion, page])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { getTablasAuditadas().then(setTablas).catch(() => {}) }, [])

  const paginas = Math.max(1, Math.ceil(total / PAGE))

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <ScrollText className="h-8 w-8 text-[#013FF6]" /> Auditoría
          </h1>
          <p className="text-slate-500 mt-1">Registro automático de altas, modificaciones y bajas sobre datos sensibles</p>
        </div>
        <button onClick={fetchData} disabled={loading} className="p-2.5 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={tabla} onChange={e => { setTabla(e.target.value); setPage(0) }}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40">
          <option value="">Todas las tablas</option>
          {tablas.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={accion} onChange={e => { setAccion(e.target.value); setPage(0) }}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40">
          <option value="">Todas las acciones</option>
          <option value="INSERT">Altas</option>
          <option value="UPDATE">Modificaciones</option>
          <option value="DELETE">Bajas</option>
        </select>
        <span className="ml-auto self-center text-xs text-slate-400">{total} eventos</span>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">{error}</div>}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto" /></div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <ScrollText className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-semibold">Todavía no hay eventos registrados</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3 font-semibold">Usuario</th>
                <th className="px-4 py-3 font-semibold">Acción</th>
                <th className="px-4 py-3 font-semibold">Tabla</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>{rows.map(r => <Fila key={r.id} r={r} />)}</tbody>
          </table>
        )}
      </div>

      {paginas > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm text-slate-500">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
          Página {page + 1} de {paginas}
          <button disabled={page + 1 >= paginas} onClick={() => setPage(p => p + 1)} className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  )
}
