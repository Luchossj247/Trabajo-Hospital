import { useState, useEffect, useCallback, useRef } from 'react'
import {
  MessageSquare, Send, Loader2, Search, Plus, X, User, ArrowLeft,
} from 'lucide-react'
import {
  getConversaciones, getHiloMensajes, enviarMensaje,
  marcarConversacionLeida, getUsuariosParaMensajear,
} from '../../services/mensajeriaService'
import { useAuth } from '../context/AuthContext'

const ROL_LABELS = {
  administrador: 'Administrador',
  medico:        'Médico',
  enfermero:     'Enfermero/a',
  farmacia:      'Farmacéutico',
  recepcionista: 'Recepcionista',
}

function iniciales(nombre, apellido) {
  return `${nombre?.[0] || ''}${apellido?.[0] || ''}`.toUpperCase() || '?'
}

function fmtHora(iso) {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function fmtFechaCorta(iso) {
  const d = new Date(iso)
  const hoy = new Date()
  if (d.toDateString() === hoy.toDateString()) return fmtHora(iso)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

// ── Modal: elegir un contacto para iniciar conversación nueva ────────
function ModalNuevoContacto({ onClose, onElegido, propioId }) {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')

  useEffect(() => {
    (async () => {
      setLoading(true)
      try { setUsuarios(await getUsuariosParaMensajear(propioId)) }
      catch { setUsuarios([]) }
      finally { setLoading(false) }
    })()
  }, [propioId])

  const filtrados = usuarios.filter(u => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return `${u.nombre} ${u.apellido}`.toLowerCase().includes(q) || u.rol.toLowerCase().includes(q)
  })

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Nueva conversación</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o rol..."
              className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400 mx-auto" /></div>
          ) : filtrados.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">Sin resultados.</p>
          ) : (
            filtrados.map(u => (
              <button key={u.id} onClick={() => onElegido(u)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 text-left">
                <div className="w-9 h-9 rounded-full bg-[#013FF6]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-[#013FF6]">{iniciales(u.nombre, u.apellido)}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{u.nombre} {u.apellido}</p>
                  <p className="text-xs text-slate-400">{ROL_LABELS[u.rol] || u.rol}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export function Mensajes() {
  const { perfil } = useAuth()
  const [conversaciones, setConversaciones] = useState([])
  const [loadingConv, setLoadingConv]       = useState(true)
  const [seleccionado, setSeleccionado]     = useState(null) // { id, nombre, apellido, rol }
  const [hilo, setHilo]                     = useState([])
  const [loadingHilo, setLoadingHilo]       = useState(false)
  const [texto, setTexto]                   = useState('')
  const [enviando, setEnviando]             = useState(false)
  const [modalNuevo, setModalNuevo]         = useState(false)
  const bottomRef = useRef(null)

  const fetchConversaciones = useCallback(async () => {
    if (!perfil?.id) return
    setLoadingConv(true)
    try { setConversaciones(await getConversaciones(perfil.id)) }
    catch (err) { console.error(err) }
    finally { setLoadingConv(false) }
  }, [perfil?.id])

  useEffect(() => { fetchConversaciones() }, [fetchConversaciones])

  const abrirConversacion = useCallback(async (contacto) => {
    setSeleccionado(contacto)
    setLoadingHilo(true)
    try {
      const data = await getHiloMensajes(perfil.id, contacto.id)
      setHilo(data)
      await marcarConversacionLeida(perfil.id, contacto.id)
      setConversaciones(prev => prev.map(c => c.contacto.id === contacto.id ? { ...c, noLeidos: 0 } : c))
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingHilo(false)
    }
  }, [perfil?.id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [hilo])

  const handleEnviar = async () => {
    if (!texto.trim() || !seleccionado) return
    setEnviando(true)
    try {
      const nuevo = await enviarMensaje(perfil.id, seleccionado.id, texto.trim())
      setHilo(prev => [...prev, nuevo])
      setTexto('')
      fetchConversaciones()
    } catch (err) {
      console.error(err)
    } finally {
      setEnviando(false)
    }
  }

  const handleNuevoContacto = (usuario) => {
    setModalNuevo(false)
    const yaExiste = conversaciones.find(c => c.contacto.id === usuario.id)
    abrirConversacion(yaExiste ? yaExiste.contacto : usuario)
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

      {/* ── Lista de conversaciones ─────────────────────────── */}
      <div className={`w-full sm:w-80 flex-shrink-0 border-r border-slate-100 flex flex-col ${seleccionado ? 'hidden sm:flex' : 'flex'}`}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[#013FF6]" /> Mensajes
          </h2>
          <button onClick={() => setModalNuevo(true)} title="Nueva conversación"
            className="p-1.5 rounded-lg text-[#013FF6] hover:bg-[#013FF6]/10">
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConv ? (
            <div className="p-4 space-y-2">{Array(4).fill(0).map((_, i) => <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-xl" />)}</div>
          ) : conversaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 px-6 text-center">
              <MessageSquare className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm font-medium">Sin conversaciones todavía</p>
              <button onClick={() => setModalNuevo(true)} className="text-xs font-semibold text-[#013FF6] hover:underline mt-2">
                Empezar una conversación
              </button>
            </div>
          ) : (
            conversaciones.map(c => (
              <button key={c.contacto.id} onClick={() => abrirConversacion(c.contacto)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-50 text-left transition-colors
                  ${seleccionado?.id === c.contacto.id ? 'bg-[#013FF6]/5' : ''}`}>
                <div className="w-10 h-10 rounded-full bg-[#013FF6]/10 flex items-center justify-center flex-shrink-0 relative">
                  <span className="text-sm font-bold text-[#013FF6]">{iniciales(c.contacto.nombre, c.contacto.apellido)}</span>
                  {c.noLeidos > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {c.noLeidos}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${c.noLeidos > 0 ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                    {c.contacto.nombre} {c.contacto.apellido}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{c.ultimoMensaje.contenido}</p>
                </div>
                <span className="text-[10px] text-slate-300 flex-shrink-0">{fmtFechaCorta(c.ultimoMensaje.enviadoAt)}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Hilo de conversación ─────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 ${seleccionado ? 'flex' : 'hidden sm:flex'}`}>
        {!seleccionado ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
            <MessageSquare className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm font-medium text-slate-400">Elegí una conversación para empezar</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100">
              <button onClick={() => setSeleccionado(null)} className="sm:hidden p-1 text-slate-400"><ArrowLeft className="h-4 w-4" /></button>
              <div className="w-9 h-9 rounded-full bg-[#013FF6]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-[#013FF6]">{iniciales(seleccionado.nombre, seleccionado.apellido)}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{seleccionado.nombre} {seleccionado.apellido}</p>
                <p className="text-xs text-slate-400">{ROL_LABELS[seleccionado.rol] || seleccionado.rol}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/50">
              {loadingHilo ? (
                <div className="flex justify-center pt-10"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
              ) : hilo.length === 0 ? (
                <p className="text-sm text-slate-400 text-center pt-10">Todavía no hay mensajes. Escribí el primero.</p>
              ) : (
                hilo.map(m => {
                  const esMio = m.emisorId === perfil.id
                  return (
                    <div key={m.id} className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-3.5 py-2 rounded-2xl text-sm
                        ${esMio ? 'bg-[#013FF6] text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm'}`}>
                        <p>{m.contenido}</p>
                        <p className={`text-[10px] mt-1 ${esMio ? 'text-white/60' : 'text-slate-400'}`}>{fmtHora(m.enviadoAt)}</p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>

            <div className="p-4 border-t border-slate-100 flex gap-2">
              <input value={texto} onChange={e => setTexto(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleEnviar())}
                placeholder="Escribí un mensaje..."
                className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40" />
              <button onClick={handleEnviar} disabled={enviando || !texto.trim()}
                className="px-4 py-2.5 rounded-xl bg-[#013FF6] text-white disabled:opacity-50 flex-shrink-0">
                {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </>
        )}
      </div>

      {modalNuevo && (
        <ModalNuevoContacto propioId={perfil.id} onClose={() => setModalNuevo(false)} onElegido={handleNuevoContacto} />
      )}
    </div>
  )
}