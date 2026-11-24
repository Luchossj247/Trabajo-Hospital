import { useState, useEffect, useCallback } from 'react'
import {
  Pill, RefreshCw, Loader2, X, CheckCircle2, AlertTriangle, Clock,
  User, Stethoscope, PackageCheck, RefreshCcw, PackagePlus, Ban, Send, Boxes, FileDown, Plus, Search,
} from 'lucide-react'
import {
  getPedidosPendientes, getPedidosResueltos, tomarPedido,
  resolverItem, finalizarPedido, getMedicamentos, ingresarStock,
} from '../../services/farmaciaService'
import { useAuth } from '../context/AuthContext'
import { BotonDocumento } from '../components/BotonDocumento'
import { imprimirComprobanteEntrega, imprimirReposicionStock } from '../../lib/plantillas'
import { descargarCSV, nombreDe } from '../../lib/documentos'

const ACCIONES = {
  entregar:   { label: 'Entregar',   icon: PackageCheck, color: '#16a34a', bg: '#dcfce7' },
  reemplazar: { label: 'Reemplazar', icon: RefreshCcw,   color: '#d97706', bg: '#fef3c7' },
  agregar:    { label: 'Agregar',    icon: PackagePlus,  color: '#2563eb', bg: '#dbeafe' },
  cancelar:   { label: 'Cancelar',   icon: Ban,          color: '#dc2626', bg: '#fee2e2' },
}

function Toast({ msg, type, onClose }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium
      ${type === 'success' ? 'bg-emerald-600' : 'bg-red-500'}`}>
      {type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      {msg}
      <button onClick={onClose} className="ml-2 hover:opacity-70"><X className="h-4 w-4" /></button>
    </div>
  )
}

// ── Fila de un ítem de receta dentro del pedido ─────────────────────
function ItemRow({ item, pedidoId, resuelto, onResuelto }) {
  const [accionElegida, setAccionElegida] = useState(null)
  const [medicamentoEntregado, setMedicamentoEntregado] = useState('')
  const [motivoReemplazo, setMotivoReemplazo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  if (resuelto) {
    const est = ACCIONES[resuelto.accion] || ACCIONES.entregar
    const Icon = est.icon
    return (
      <div className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">{item.medicamentoNombre}</p>
          <p className="text-xs text-slate-400">{item.dosis} · {item.frecuencia}</p>
          {resuelto.medicamentoEntregado && (
            <p className="text-xs text-slate-500 mt-0.5">Entregado: {resuelto.medicamentoEntregado}</p>
          )}
          {resuelto.motivoReemplazo && (
            <p className="text-xs text-amber-600 mt-0.5">Motivo: {resuelto.motivoReemplazo}</p>
          )}
        </div>
        <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ backgroundColor: est.bg, color: est.color }}>
          <Icon className="h-3.5 w-3.5" /> {est.label}
        </span>
      </div>
    )
  }

  const confirmar = async () => {
    if (!accionElegida) return setError('Elegí una acción para este medicamento.')
    if (accionElegida === 'reemplazar' && !medicamentoEntregado.trim()) {
      return setError('Indicá con qué medicamento se reemplaza.')
    }
    setSaving(true); setError('')
    try {
      const resultado = await resolverItem(pedidoId, item.id, {
        accion: accionElegida,
        medicamentoEntregado: accionElegida === 'reemplazar' ? medicamentoEntregado : (accionElegida === 'entregar' ? item.medicamentoNombre : null),
        motivoReemplazo: accionElegida === 'reemplazar' ? motivoReemplazo : null,
      })
      onResuelto(resultado)
    } catch (err) {
      setError(err.message || 'Error al registrar la acción.')
    } finally { setSaving(false) }
  }

  return (
    <div className="py-3 border-b border-slate-50 last:border-0 space-y-2">
      <div>
        <p className="text-sm font-semibold text-slate-800">{item.medicamentoNombre}</p>
        <p className="text-xs text-slate-400">
          {item.dosis || 'sin dosis especificada'} · {item.frecuencia || 'sin frecuencia especificada'}
        </p>
        {item.indicaciones && <p className="text-xs text-slate-400 italic mt-0.5">{item.indicaciones}</p>}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {Object.entries(ACCIONES).map(([key, val]) => {
          const Icon = val.icon
          const sel = accionElegida === key
          return (
            <button key={key} onClick={() => setAccionElegida(key)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors
                ${sel ? 'border-transparent' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
              style={sel ? { backgroundColor: val.bg, color: val.color } : {}}>
              <Icon className="h-3.5 w-3.5" /> {val.label}
            </button>
          )
        })}
      </div>

      {accionElegida === 'reemplazar' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input value={medicamentoEntregado} onChange={e => setMedicamentoEntregado(e.target.value)}
            placeholder="Medicamento entregado *"
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
          <input value={motivoReemplazo} onChange={e => setMotivoReemplazo(e.target.value)}
            placeholder="Motivo del reemplazo"
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
        </div>
      )}

      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

      {accionElegida && (
        <button onClick={confirmar} disabled={saving}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#013FF6] hover:underline disabled:opacity-60">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Confirmar
        </button>
      )}
    </div>
  )
}

// ── Tarjeta de un pedido completo ────────────────────────────────────
function PedidoCard({ pedido, farmaciaUsuarioId, onChanged, showToast }) {
  const [resueltos, setResueltos] = useState(pedido.pedidoItem || [])
  const [finalizando, setFinalizando] = useState(false)

  const items = pedido.receta?.recetaItem || []
  const paciente = pedido.receta?.guardia?.paciente
  const medico = pedido.receta?.medico

  const resueltoDe = (recetaItemId) => resueltos.find(r => r.recetaItemId === recetaItemId)
  const todosResueltos = items.length > 0 && items.every(it => resueltoDe(it.id))

  const handleTomar = async () => {
    try {
      await tomarPedido(pedido.id, farmaciaUsuarioId)
      onChanged()
    } catch (err) { showToast(err.message || 'Error al tomar el pedido.', 'error') }
  }

  const handleFinalizar = async () => {
    setFinalizando(true)
    try {
      const huboCancelaciones = resueltos.every(r => r.accion === 'cancelar')
      await finalizarPedido(pedido.id, pedido.receta.id, { cancelado: huboCancelaciones })
      showToast('Pedido finalizado. Receta generada para el paciente.')
      onChanged()
    } catch (err) {
      showToast(err.message || 'Error al finalizar.', 'error')
    } finally { setFinalizando(false) }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-slate-900 flex items-center gap-2">
            <User className="h-4 w-4 text-slate-400" /> {paciente?.nombre} {paciente?.apellido}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">DNI {paciente?.dni}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400 flex items-center gap-1 justify-end">
            <Stethoscope className="h-3 w-3" /> Dr/a. {medico?.apellido}
          </p>
          <p className="text-xs text-slate-300 flex items-center gap-1 justify-end mt-0.5">
            <Clock className="h-3 w-3" /> {new Date(pedido.createdAt).toLocaleString('es-AR')}
          </p>
        </div>
      </div>

      <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full mb-3
        ${pedido.estado === 'pendiente' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
        {pedido.estado === 'pendiente' ? 'Pendiente de tomar' : 'En proceso'}
      </span>

      {pedido.estado === 'pendiente' ? (
        <button onClick={handleTomar}
          className="w-full py-2.5 rounded-xl bg-[#013FF6] text-white text-sm font-semibold hover:bg-[#0033cc] flex items-center justify-center gap-2">
          <Send className="h-4 w-4" /> Tomar pedido
        </button>
      ) : (
        <>
          <div className="divide-y divide-slate-50">
            {items.map(it => (
              <ItemRow
                key={it.id}
                item={it}
                pedidoId={pedido.id}
                resuelto={resueltoDe(it.id)}
                onResuelto={nuevo => setResueltos(prev => [...prev, nuevo])}
              />
            ))}
          </div>

          {todosResueltos && (
            <button onClick={handleFinalizar} disabled={finalizando}
              className="w-full mt-3 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2 disabled:opacity-60">
              {finalizando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Finalizar y generar receta
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ── Inventario: estado del stock, alertas e ingreso de unidades ─────
function situacionStock(m) {
  if (m.stockActual === 0) return { label: 'Sin stock', cls: 'bg-red-100 text-red-700', orden: 0 }
  if (m.stockActual <= m.stockMinimo) return { label: 'Stock bajo', cls: 'bg-amber-100 text-amber-700', orden: 1 }
  return { label: 'Normal', cls: 'bg-emerald-100 text-emerald-700', orden: 2 }
}

function InventarioPanel({ perfil, showToast, onAlertas }) {
  const [meds, setMeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [buscar, setBuscar] = useState('')
  const [soloAlertas, setSoloAlertas] = useState(false)
  const [cantidades, setCantidades] = useState({})
  const [guardando, setGuardando] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getMedicamentos()
      setMeds(data)
      onAlertas?.(data.filter(m => m.stockActual <= m.stockMinimo).length)
    } catch (err) { showToast(err.message || 'Error al cargar el inventario.', 'error') }
    finally { setLoading(false) }
  }, [onAlertas, showToast])

  useEffect(() => { cargar() }, [cargar])

  const ingresar = async (m) => {
    const cant = parseInt(cantidades[m.id], 10)
    if (!cant || cant <= 0) return showToast('Ingresá una cantidad mayor a 0.', 'error')
    setGuardando(m.id)
    try {
      await ingresarStock(m.id, cant)
      setCantidades(c => ({ ...c, [m.id]: '' }))
      showToast(`Se ingresaron ${cant} unidades de ${m.nombre}.`)
      await cargar()
    } catch (err) { showToast(err.message || 'No se pudo ingresar el stock.', 'error') }
    finally { setGuardando(null) }
  }

  const visibles = meds
    .filter(m => m.nombre.toLowerCase().includes(buscar.toLowerCase()))
    .filter(m => !soloAlertas || m.stockActual <= m.stockMinimo)
    .sort((a, b) => situacionStock(a).orden - situacionStock(b).orden || a.nombre.localeCompare(b.nombre))

  const alertas = meds.filter(m => m.stockActual <= m.stockMinimo)

  const exportar = () => descargarCSV('inventario_farmacia',
    ['Medicamento', 'Stock actual', 'Stock mínimo', 'Situación'],
    meds.map(m => [m.nombre, m.stockActual, m.stockMinimo, situacionStock(m).label]))

  if (loading) return <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto" /></div>

  return (
    <div className="space-y-4">
      {alertas.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-bold">{alertas.length} medicamento(s) necesitan reposición</p>
            <p className="text-xs mt-0.5">{alertas.map(a => a.nombre).join(' · ')}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar medicamento…"
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input type="checkbox" checked={soloAlertas} onChange={e => setSoloAlertas(e.target.checked)} /> Solo alertas
        </label>
        <button onClick={exportar} className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5">
          <FileDown className="h-3.5 w-3.5" /> CSV
        </button>
        <BotonDocumento className="!px-3 !py-2 !text-xs" onGenerar={() => imprimirReposicionStock({ medicamentos: meds, generadoPor: nombreDe(perfil) })}>
          Informe de reposición
        </BotonDocumento>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_90px_90px_110px_190px] gap-3 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 bg-slate-50">
          <span>Medicamento</span><span className="text-right">Stock</span><span className="text-right">Mínimo</span><span>Situación</span><span>Ingresar unidades</span>
        </div>
        <div className="divide-y divide-slate-50">
          {visibles.map(m => {
            const sit = situacionStock(m)
            return (
              <div key={m.id} className="grid grid-cols-2 sm:grid-cols-[1fr_90px_90px_110px_190px] gap-3 items-center px-5 py-3">
                <p className="text-sm font-semibold text-slate-800 col-span-2 sm:col-span-1">{m.nombre}</p>
                <p className="text-sm font-bold text-slate-900 sm:text-right">{m.stockActual}</p>
                <p className="text-sm text-slate-500 sm:text-right">{m.stockMinimo}</p>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full w-fit ${sit.cls}`}>{sit.label}</span>
                <div className="flex gap-1.5 col-span-2 sm:col-span-1">
                  <input type="number" min="1" value={cantidades[m.id] || ''} onChange={e => setCantidades(c => ({ ...c, [m.id]: e.target.value }))}
                    placeholder="Cantidad" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
                  <button onClick={() => ingresar(m)} disabled={guardando === m.id}
                    className="px-2.5 py-1.5 rounded-lg bg-[#013FF6] text-white text-xs font-semibold hover:bg-[#0033cc] disabled:opacity-60 flex items-center gap-1">
                    {guardando === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Sumar
                  </button>
                </div>
              </div>
            )
          })}
          {visibles.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-400">No hay medicamentos que coincidan.</p>}
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ────────────────────────────────────────────
export function Farmacia() {
  const { perfil } = useAuth()
  const [pedidos, setPedidos] = useState([])
  const [resueltosHist, setResueltosHist] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast]     = useState(null)
  const [vista, setVista]     = useState('pendientes') // 'pendientes' | 'historial' | 'inventario'
  const [alertasStock, setAlertasStock] = useState(null)

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const fetchPendientes = useCallback(async () => {
    setLoading(true)
    try { setPedidos(await getPedidosPendientes()) }
    catch (err) { showToast(err.message || 'Error al cargar pedidos.', 'error') }
    finally { setLoading(false) }
  }, [])

  const fetchHistorial = useCallback(async () => {
    setLoading(true)
    try { setResueltosHist(await getPedidosResueltos()) }
    catch (err) { showToast(err.message || 'Error al cargar historial.', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (vista === 'pendientes') fetchPendientes()
    else if (vista === 'historial') fetchHistorial()
    else setLoading(false)
  }, [vista, fetchPendientes, fetchHistorial])

  const stats = {
    pendientes: pedidos.filter(p => p.estado === 'pendiente').length,
    enProceso:  pedidos.filter(p => p.estado === 'en_proceso').length,
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Pill className="h-8 w-8 text-[#013FF6]" /> Farmacia
          </h1>
          <p className="text-slate-500 mt-1">Recepción de pedidos, verificación de stock y entrega</p>
        </div>
        <button onClick={() => vista === 'pendientes' ? fetchPendientes() : vista === 'historial' ? fetchHistorial() : setVista('inventario')} disabled={loading}
          className="p-2.5 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {vista === 'pendientes' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-extrabold text-amber-600">{stats.pendientes}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Pendientes de tomar</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-extrabold text-blue-600">{stats.enProceso}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">En proceso</p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => setVista('pendientes')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border
            ${vista === 'pendientes' ? 'bg-[#013FF6] text-white border-transparent' : 'border-slate-200 text-slate-600'}`}>
          Cola de pedidos
        </button>
        <button onClick={() => setVista('historial')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border
            ${vista === 'historial' ? 'bg-[#013FF6] text-white border-transparent' : 'border-slate-200 text-slate-600'}`}>
          Historial
        </button>
        <button onClick={() => setVista('inventario')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1.5
            ${vista === 'inventario' ? 'bg-[#013FF6] text-white border-transparent' : 'border-slate-200 text-slate-600'}`}>
          <Boxes className="h-3.5 w-3.5" /> Inventario
          {alertasStock > 0 && <span className="bg-red-500 text-white rounded-full px-1.5 text-[10px] leading-4">{alertasStock}</span>}
        </button>
      </div>

      {vista === 'inventario' ? (
        <InventarioPanel perfil={perfil} showToast={showToast} onAlertas={setAlertasStock} />
      ) : loading ? (
        <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto" /></div>
      ) : vista === 'pendientes' ? (
        pedidos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-16 text-slate-400">
            <Pill className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-semibold">No hay pedidos pendientes</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pedidos.map(p => (
              <PedidoCard key={p.id} pedido={p} farmaciaUsuarioId={perfil?.id} onChanged={fetchPendientes} showToast={showToast} />
            ))}
          </div>
        )
      ) : (
        resueltosHist.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-16 text-slate-400">
            <Pill className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-semibold">Sin pedidos resueltos todavía</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
            {resueltosHist.map(p => (
              <div key={p.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {p.receta?.guardia?.paciente?.nombre} {p.receta?.guardia?.paciente?.apellido}
                  </p>
                  <p className="text-xs text-slate-400">
                    DNI {p.receta?.guardia?.paciente?.dni} · {p.pedidoItem?.length || 0} ítem(s)
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <BotonDocumento compact onGenerar={() => imprimirComprobanteEntrega({ pedido: p, generadoPor: nombreDe(perfil) })}>
                    Comprobante
                  </BotonDocumento>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full
                    ${p.estado === 'completado' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                    {p.estado === 'completado' ? 'Completado' : 'Cancelado'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}