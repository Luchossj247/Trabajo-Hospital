import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Bell, CheckCircle2 } from 'lucide-react'
import { getNotificaciones } from '../../services/notificacionesService'

// Lleva la cuenta de lo que el usuario ya vio: al entrar a la pantalla de un aviso,
// ese aviso deja de contar como "nuevo" hasta que aparezcan más pendientes.
const leerVistos = (clave) => {
  try { return JSON.parse(localStorage.getItem(clave)) || {} } catch { return {} }
}

// Campana con los avisos pendientes del rol. Se actualiza al navegar y cada 60 s.
export function CampanaNotificaciones({ perfil }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [items, setItems] = useState([])
  const [abierto, setAbierto] = useState(false)
  const claveVistos = `hmspro.notif.vistos.${perfil?.id}`
  const [vistos, setVistos] = useState(() => leerVistos(claveVistos))
  const ref = useRef(null)

  const cargar = useCallback(async () => {
    try { setItems(await getNotificaciones(perfil)) } catch { /* noop */ }
  }, [perfil])

  useEffect(() => {
    cargar()
    const t = setInterval(cargar, 60_000)
    return () => clearInterval(t)
  }, [cargar, location.pathname])

  useEffect(() => {
    const fuera = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false) }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [])

  // Al estar en la pantalla de un aviso, se marca como visto (y si bajó la cantidad, se ajusta).
  useEffect(() => {
    if (!items.length) return
    let cambio = false
    const nuevo = { ...vistos }
    for (const n of items) {
      const v = nuevo[n.id] ?? 0
      if (n.cantidad < v) { nuevo[n.id] = n.cantidad; cambio = true }
      if (location.pathname === n.ruta && v !== n.cantidad) { nuevo[n.id] = n.cantidad; cambio = true }
    }
    if (cambio) {
      setVistos(nuevo)
      try { localStorage.setItem(claveVistos, JSON.stringify(nuevo)) } catch { /* noop */ }
    }
  }, [items, location.pathname, vistos, claveVistos])

  const conNuevos = useMemo(
    () => items.map(n => ({ ...n, nuevos: Math.max(0, n.cantidad - (vistos[n.id] ?? 0)) })),
    [items, vistos],
  )
  const total = conNuevos.reduce((s, n) => s + n.nuevos, 0)

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setAbierto(a => !a)} aria-label="Notificaciones"
        className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100">
        <Bell className="h-5 w-5" />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>
      {abierto && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 overflow-hidden">
          <p className="px-4 py-3 text-sm font-bold text-slate-800 border-b border-slate-100">Notificaciones</p>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-400 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> No tenés avisos pendientes.</p>
          ) : (
            <ul className="divide-y divide-slate-50 max-h-80 overflow-auto">
              {conNuevos.map(n => (
                <li key={n.id}>
                  <button onClick={() => { setAbierto(false); navigate(n.ruta) }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between gap-3">
                    <span className={`text-sm ${n.nuevos > 0 ? 'text-slate-800 font-semibold' : 'text-slate-400'}`}>{n.texto}</span>
                    <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${n.nuevos > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                      {n.nuevos > 0 ? `${n.nuevos} nuevo${n.nuevos > 1 ? 's' : ''}` : `${n.cantidad} visto${n.cantidad > 1 ? 's' : ''}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
