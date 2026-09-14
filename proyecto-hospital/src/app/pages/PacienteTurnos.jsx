import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Loader2, Clock, User, CalendarPlus } from 'lucide-react'
import { getTurnos } from '../../services/turnoService'
import { usePacienteAuth } from '../context/PacienteAuthContext'

const ESTADO_TURNO = {
  programado: { label: 'Programado', bg: '#dbeafe', color: '#2563eb' },
  confirmado: { label: 'Confirmado', bg: '#dcfce7', color: '#16a34a' },
  cancelado:  { label: 'Cancelado',  bg: '#fee2e2', color: '#dc2626' },
  ausente:    { label: 'Ausente',    bg: '#fef3c7', color: '#d97706' },
  realizado:  { label: 'Realizado',  bg: '#ede9fe', color: '#7c3aed' },
}

export function PacienteTurnos() {
  const { paciente } = usePacienteAuth()
  const [turnos, setTurnos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try { setTurnos(await getTurnos({ pacienteId: paciente.id })) }
      catch { setTurnos([]) }
      finally { setLoading(false) }
    })()
  }, [paciente.id])

  const hoy = new Date().toISOString().split('T')[0]
  const proximos = turnos.filter(t => t.fecha >= hoy && t.estado !== 'cancelado')
  const pasados   = turnos.filter(t => t.fecha < hoy || t.estado === 'cancelado')

  const TurnoRow = ({ t }) => {
    const est = ESTADO_TURNO[t.estado] || ESTADO_TURNO.programado
    return (
      <div className="flex items-center gap-4 py-3 border-b border-slate-50 last:border-0">
        <div className="w-14 text-center flex-shrink-0">
          <p className="text-lg font-extrabold text-slate-800 leading-none">{new Date(t.fecha + 'T00:00:00').getDate()}</p>
          <p className="text-[10px] font-semibold text-slate-400 uppercase">{new Date(t.fecha + 'T00:00:00').toLocaleDateString('es-AR', { month: 'short' })}</p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-slate-400" /> Dr/a. {t.medico?.apellido}, {t.medico?.nombre}
          </p>
          <p className="text-xs text-slate-400 truncate">{t.motivo || 'Consulta general'}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-shrink-0">
          <Clock className="h-3 w-3" /> {t.horaInicio?.slice(0, 5)}
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0" style={{ backgroundColor: est.bg, color: est.color }}>
          {est.label}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Calendar className="h-8 w-8 text-[#013FF6]" /> Mis Turnos
          </h1>
          <p className="text-slate-500 mt-1">Tus turnos programados y tu historial</p>
        </div>
        <Link to="/paciente/reservar-turno"
          className="flex items-center gap-2 px-4 py-2.5 bg-[#013FF6] text-white text-sm font-semibold rounded-xl hover:bg-[#0033cc] shadow-lg shadow-[#013FF6]/20">
          <CalendarPlus className="h-4 w-4" /> Reservar turno
        </Link>
      </div>

      {loading ? (
        <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto" /></div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-2">Próximos turnos</h3>
            {proximos.length === 0 ? (
              <p className="text-sm text-slate-400 py-4">No tenés turnos programados.</p>
            ) : (
              proximos.map(t => <TurnoRow key={t.id} t={t} />)
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-2">Historial de turnos</h3>
            {pasados.length === 0 ? (
              <p className="text-sm text-slate-400 py-4">Sin turnos anteriores.</p>
            ) : (
              pasados.map(t => <TurnoRow key={t.id} t={t} />)
            )}
          </div>
        </>
      )}
    </div>
  )
}