import { useState, useEffect, useCallback } from 'react'
import {
  Pill, RefreshCw, Loader2, X, CheckCircle2, AlertTriangle, Clock,
  User, Stethoscope, PackageCheck, RefreshCcw, PackagePlus, Ban, Send,
} from 'lucide-react'
import {
  getPedidosPendientes, getPedidosResueltos, tomarPedido,
  resolverItem, finalizarPedido,
} from '../../services/farmaciaService'
import { useAuth } from '../context/AuthContext'

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

// ── Componente principal ────────────────────────────────────────────
export function Farmacia() {
  const { perfil } = useAuth()
  const [pedidos, setPedidos] = useState([])
  const [resueltosHist, setResueltosHist] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast]     = useState(null)
  const [vista, setVista]     = useState('pendientes') // 'pendientes' | 'historial'

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
    vista === 'pendientes' ? fetchPendientes() : fetchHistorial()
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
        <button onClick={() => vista === 'pendientes' ? fetchPendientes() : fetchHistorial()} disabled={loading}
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
      </div>

      {loading ? (
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
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full
                  ${p.estado === 'completado' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                  {p.estado === 'completado' ? 'Completado' : 'Cancelado'}
                </span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}