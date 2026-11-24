import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Bell, CheckCircle2 } from 'lucide-react'
import { getNotificaciones } from '../../services/notificacionesService'

// Campana con los avisos pendientes del rol. Se actualiza al navegar y cada 60 s.
export function CampanaNotificaciones({ perfil }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [items, setItems] = useState([])
  const [abierto, setAbierto] = useState(false)
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

  const total = items.reduce((s, n) => s + n.cantidad, 0)

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
              {items.map(n => (
                <li key={n.id}>
                  <button onClick={() => { setAbierto(false); navigate(n.ruta) }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-700">{n.texto}</span>
                    <span className="text-xs font-bold bg-red-50 text-red-600 rounded-full px-2 py-0.5">{n.cantidad}</span>
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
