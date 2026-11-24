import { useState, useEffect, useCallback } from 'react'
import { ScrollText, RefreshCw, Loader2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, FileDown, Printer, X } from 'lucide-react'
import { getAuditoria, resolverReferencias } from '../../services/auditoriaService'
import { getUsuarios } from '../../services/usuarioService'
import { describirEvento, TABLAS } from '../../lib/auditoriaLegible'
import { imprimirDocumento, descargarCSV, bloques, fmtFechaHora } from '../../lib/documentos'
import { useAuth } from '../context/AuthContext'

const PAGE = 25
const MAX_EXPORT = 2000

const selectClass = 'px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40'

function Evento({ r, ctx }) {
  const [open, setOpen] = useState(false)
  const ev = describirEvento(r, ctx)
  const { actor, accion, registro, separador, cambios } = ev
  const tipoSeccion = TABLAS[r.tablaAfectada]?.singular?.replace(/^(un|una) /, '') || r.tablaAfectada

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-slate-50 transition-colors"
        aria-expanded={open}
      >
        <span className="mt-0.5 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 w-28 text-center"
          style={{ backgroundColor: accion.bg, color: accion.color }}>
          {accion.label}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] text-slate-900 leading-snug">
            <strong>{actor}</strong> {accion.verbo} {TABLAS[r.tablaAfectada]?.singular || 'un registro'}
            {registro && <>{separador}<strong>{registro}</strong></>}
          </span>
          <span className="block text-sm text-slate-500 mt-0.5">
            {fmtFechaHora(r.createdAt)} · {TABLAS[r.tablaAfectada]?.plural || tipoSeccion}
          </span>
        </span>
        <span className="text-slate-400 mt-1">{open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}</span>
      </button>

      {open && (
        <div className="px-5 pb-4 pl-[8.5rem]">
          {cambios.length === 0 ? (
            <p className="text-sm text-slate-500">No hay cambios visibles para mostrar (solo se modificaron datos internos del sistema).</p>
          ) : (
            <div className="rounded-xl bg-slate-50 border border-slate-200 divide-y divide-slate-200">
              <p className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                {r.accion === 'UPDATE' ? 'Qué cambió' : r.accion === 'INSERT' ? 'Datos cargados' : 'Datos que tenía el registro eliminado'}
              </p>
              {cambios.map((c, i) => (
                <div key={i} className="px-4 py-2.5 text-sm flex flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold text-slate-700 min-w-40">{c.campo}</span>
                  {r.accion === 'UPDATE' ? (
                    <span className="text-slate-700">
                      <span className="text-red-700 bg-red-50 px-1.5 py-0.5 rounded">{c.antes}</span>
                      <span className="mx-2 text-slate-400">→</span>
                      <span className="text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">{c.despues}</span>
                    </span>
                  ) : (
                    <span className="text-slate-800">{c.valor}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function Auditoria() {
  const { perfil } = useAuth()
  const [rows, setRows]       = useState([])
  const [ctx, setCtx]         = useState({})
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(0)
  const [filtros, setFiltros] = useState({ tabla: '', accion: '', usuarioId: '', desde: '', hasta: '' })
  const [personal, setPersonal] = useState([])
  const [loading, setLoading] = useState(true)
  const [exportando, setExportando] = useState('')
  const [error, setError]     = useState('')

  const setFiltro = (k) => (e) => { setFiltros(f => ({ ...f, [k]: e.target.value })); setPage(0) }
  const hayFiltros = Object.values(filtros).some(Boolean)

  const fetchData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const { rows, total } = await getAuditoria({ ...filtros, limit: PAGE, offset: page * PAGE })
      setCtx(await resolverReferencias(rows))
      setRows(rows); setTotal(total)
    } catch (err) { setError(err.message || 'Error al cargar la auditoría.') }
    finally { setLoading(false) }
  }, [filtros, page])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { getUsuarios().then(setPersonal).catch(() => {}) }, [])

  const paginas = Math.max(1, Math.ceil(total / PAGE))

  // Trae todos los eventos del filtro actual (hasta MAX_EXPORT) ya traducidos a texto claro.
  const traerParaExportar = async () => {
    const acumulado = []
    for (let offset = 0; offset < MAX_EXPORT; offset += 1000) {
      const { rows: bloque, total: t } = await getAuditoria({ ...filtros, limit: 1000, offset })
      acumulado.push(...bloque)
      if (acumulado.length >= t) break
    }
    const c = await resolverReferencias(acumulado)
    return acumulado.map(r => ({ r, ev: describirEvento(r, c) }))
  }

  const descripcionFiltros = () => {
    const partes = []
    if (filtros.tabla)     partes.push(`Sección: ${TABLAS[filtros.tabla]?.plural}`)
    if (filtros.accion)    partes.push(`Acción: ${{ INSERT: 'Altas', UPDATE: 'Modificaciones', DELETE: 'Bajas' }[filtros.accion]}`)
    if (filtros.usuarioId) { const u = personal.find(p => p.id === filtros.usuarioId); if (u) partes.push(`Persona: ${u.nombre} ${u.apellido}`) }
    if (filtros.desde)     partes.push(`Desde: ${new Date(filtros.desde + 'T00:00:00').toLocaleDateString('es-AR')}`)
    if (filtros.hasta)     partes.push(`Hasta: ${new Date(filtros.hasta + 'T00:00:00').toLocaleDateString('es-AR')}`)
    return partes.length ? partes.join(' · ') : 'Toda la actividad registrada'
  }

  const exportar = async (formato) => {
    setExportando(formato); setError('')
    try {
      const eventos = await traerParaExportar()
      if (formato === 'csv') {
        descargarCSV('auditoria',
          ['Fecha y hora', 'Persona', 'Acción', 'Sección', 'Qué ocurrió', 'Detalle del cambio'],
          eventos.map(({ r, ev }) => [fmtFechaHora(r.createdAt), ev.actor, ev.accion.label, ev.seccion, ev.frase, ev.resumenCambios]))
      } else {
        imprimirDocumento({
          titulo: 'Informe de auditoría',
          nombreArchivo: 'Informe de auditoria',
          subtitulo: descripcionFiltros(),
          generadoPor: perfil ? `${perfil.nombre} ${perfil.apellido}` : undefined,
          secciones: [
            { titulo: `Eventos (${eventos.length}${total > eventos.length ? ` de ${total}` : ''})`,
              html: bloques.tabla(
                ['Fecha y hora', 'Qué ocurrió', 'Detalle del cambio'],
                eventos.map(({ r, ev }) => [fmtFechaHora(r.createdAt), ev.frase, ev.resumenCambios || '—'])) },
          ],
          pie: 'Registro automático de actividad. Cada fila indica quién realizó la acción, cuándo y qué datos se modificaron.',
        })
      }
    } catch (err) {
      setError(err.message || 'No se pudo generar el archivo.')
    } finally { setExportando('') }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <ScrollText className="h-8 w-8 text-[#013FF6]" /> Auditoría
          </h1>
          <p className="text-slate-600 mt-1 max-w-xl">
            Historial de actividad del sistema: <strong>quién hizo qué y cuándo</strong>.
            Se registra solo, no se puede editar. Tocá un evento para ver qué datos cambiaron.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} disabled={loading} title="Actualizar" className="p-2.5 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => exportar('csv')} disabled={!!exportando || total === 0}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-700 disabled:opacity-50">
            {exportando === 'csv' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Excel (CSV)
          </button>
          <button onClick={() => exportar('pdf')} disabled={!!exportando || total === 0}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-[#0B2A8F] text-white rounded-xl hover:bg-[#08216f] disabled:opacity-50">
            {exportando === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />} Informe PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-slate-600 flex flex-col gap-1">Sección
          <select value={filtros.tabla} onChange={setFiltro('tabla')} className={selectClass}>
            <option value="">Todas</option>
            {Object.entries(TABLAS).map(([k, t]) => <option key={k} value={k}>{t.plural}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600 flex flex-col gap-1">Acción
          <select value={filtros.accion} onChange={setFiltro('accion')} className={selectClass}>
            <option value="">Todas</option>
            <option value="INSERT">Altas (se creó algo)</option>
            <option value="UPDATE">Modificaciones</option>
            <option value="DELETE">Bajas (se eliminó algo)</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600 flex flex-col gap-1">Persona
          <select value={filtros.usuarioId} onChange={setFiltro('usuarioId')} className={selectClass}>
            <option value="">Todas</option>
            {personal.map(p => <option key={p.id} value={p.id}>{p.apellido}, {p.nombre}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600 flex flex-col gap-1">Desde
          <input type="date" value={filtros.desde} max={filtros.hasta || undefined} onChange={setFiltro('desde')} className={selectClass} />
        </label>
        <label className="text-xs font-semibold text-slate-600 flex flex-col gap-1">Hasta
          <input type="date" value={filtros.hasta} min={filtros.desde || undefined} onChange={setFiltro('hasta')} className={selectClass} />
        </label>
        {hayFiltros && (
          <button onClick={() => { setFiltros({ tabla: '', accion: '', usuarioId: '', desde: '', hasta: '' }); setPage(0) }}
            className="flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-[#013FF6] pb-2.5">
            <X className="h-4 w-4" /> Limpiar filtros
          </button>
        )}
        <span className="ml-auto text-sm text-slate-500 pb-2.5">{total} {total === 1 ? 'evento' : 'eventos'}</span>
      </div>

      {total > MAX_EXPORT && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
          Hay más de {MAX_EXPORT} eventos con este filtro: los archivos incluyen los {MAX_EXPORT} más recientes. Acotá las fechas para exportar el resto.
        </p>
      )}
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">{error}</div>}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto" /></div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <ScrollText className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-semibold">No hay eventos para mostrar</p>
            {hayFiltros && <p className="text-sm mt-1">Probá quitando algún filtro.</p>}
          </div>
        ) : (
          rows.map(r => <Evento key={r.id} r={r} ctx={ctx} />)
        )}
      </div>

      {paginas > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm text-slate-600">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="p-2 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
          Página {page + 1} de {paginas}
          <button disabled={page + 1 >= paginas} onClick={() => setPage(p => p + 1)} className="p-2 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  )
}
