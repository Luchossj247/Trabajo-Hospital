import { useState, useEffect, useCallback } from 'react'
import {
  BarChart2, RefreshCw, Loader2, BedDouble, HeartPulse, Receipt,
  Ambulance, ShieldAlert,
} from 'lucide-react'
import {
  getOcupacionCamas, getPacientesAtendidos, getFacturacionResumen,
} from '../../services/reportesService'

const RANGOS = [
  { value: 'hoy',  label: 'Hoy',      dias: 0 },
  { value: '7d',   label: '7 días',   dias: 7 },
  { value: '30d',  label: '30 días',  dias: 30 },
]

const NIVEL_LABEL = { 1: 'Rojo (1)', 2: 'Naranja (2)', 3: 'Amarillo (3)', 4: 'Verde (4)', 5: 'Azul (5)', sin_evaluar: 'Sin evaluar' }
const NIVEL_COLOR = { 1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#22c55e', 5: '#3b82f6', sin_evaluar: '#94a3b8' }

const ESTADO_GUARDIA_LABEL = { en_espera: 'En espera', en_atencion: 'En atención', internado: 'Internado', alta: 'Alta', derivado: 'Derivado' }
const ESTADO_COBERTURA_LABEL = { pendiente_verificacion: 'Pendiente', cubre_total: 'Cubre total', cubre_parcial: 'Cubre parcial', sin_cobertura: 'Sin cobertura' }
const ESTADO_PAGO_LABEL = { pendiente: 'Pendiente', parcial: 'Parcial', pagado: 'Pagado', deuda: 'Deuda' }
const ESTADO_PAGO_COLOR = { pendiente: '#f59e0b', parcial: '#013FF6', pagado: '#22c55e', deuda: '#ef4444' }

function fmtMoneda(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)
}

function StatCard({ label, value, sub, icon: Icon, accent, loading }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${accent}18` }}>
        <Icon className="h-5 w-5" style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        {loading
          ? <div className="h-7 w-16 bg-slate-100 animate-pulse rounded mb-1" />
          : <p className="text-2xl font-extrabold text-slate-900 leading-none">{value}</p>}
        <p className="text-sm font-medium text-slate-500 mt-1 leading-tight">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
        <Icon className="h-4 w-4 text-[#013FF6]" />
        <span className="font-bold text-slate-900">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// Barra horizontal simple para desgloses (label + cantidad + proporción visual)
function BarraDesglose({ items }) {
  const max = Math.max(...items.map(i => i.value), 1)
  return (
    <div className="space-y-2.5">
      {items.map(item => (
        <div key={item.label}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-slate-600">{item.label}</span>
            <span className="font-bold text-slate-800">{item.value}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: item.color || '#013FF6' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function Reportes() {
  const [rango, setRango]         = useState('7d')
  const [ocupacion, setOcupacion] = useState(null)
  const [pacientes, setPacientes] = useState(null)
  const [facturacion, setFacturacion] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const dias = RANGOS.find(r => r.value === rango)?.dias ?? 7
      const desde = new Date()
      desde.setHours(0, 0, 0, 0)
      desde.setDate(desde.getDate() - dias)

      const [ocup, pac, fact] = await Promise.all([
        getOcupacionCamas(),
        getPacientesAtendidos(desde.toISOString()),
        getFacturacionResumen(desde.toISOString()),
      ])

      setOcupacion(ocup)
      setPacientes(pac)
      setFacturacion(fact)
    } catch (err) {
      console.error('Error al cargar reportes:', err)
    } finally {
      setLoading(false)
      setLastRefresh(new Date())
    }
  }, [rango])

  useEffect(() => { fetchAll() }, [fetchAll])

  const pctOcupacion = ocupacion?.totales.total
    ? Math.round((ocupacion.totales.ocupada / ocupacion.totales.total) * 100)
    : 0

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <BarChart2 className="h-8 w-8 text-[#013FF6]" /> Reportes
          </h1>
          <p className="text-slate-500 mt-1">Ocupación, pacientes atendidos y facturación</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {RANGOS.map(r => (
              <button key={r.value} onClick={() => setRango(r.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                  ${rango === r.value ? 'bg-white text-[#013FF6] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {r.label}
              </button>
            ))}
          </div>
          <button onClick={fetchAll} disabled={loading} className="p-2.5 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-400 -mt-4">Actualizado {lastRefresh.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>

      {/* ── Ocupación de camas ─────────────────────────────── */}
      <SectionCard title="Ocupación de camas" icon={BedDouble}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <StatCard label="Ocupación general" value={`${pctOcupacion}%`} sub={`${ocupacion?.totales.ocupada ?? 0} de ${ocupacion?.totales.total ?? 0} camas`} icon={BedDouble} accent="#013FF6" loading={loading} />
          <StatCard label="Disponibles" value={ocupacion?.totales.disponible ?? 0} icon={BedDouble} accent="#22c55e" loading={loading} />
          <StatCard label="En mantenimiento" value={ocupacion?.totales.mantenimiento ?? 0} icon={BedDouble} accent="#f59e0b" loading={loading} />
        </div>

        {!loading && ocupacion?.porSector.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Por sector</p>
            {ocupacion.porSector.map(s => {
              const pct = s.total ? Math.round((s.ocupada / s.total) * 100) : 0
              return (
                <div key={s.sector}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">{s.sector}</span>
                    <span className="text-slate-400">{s.ocupada}/{s.total} ocupadas ({pct}%)</span>
                  </div>
                  <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                    <div className="bg-[#013FF6]" style={{ width: `${(s.ocupada / s.total) * 100}%` }} />
                    <div className="bg-[#ACEC00]" style={{ width: `${(s.disponible / s.total) * 100}%` }} />
                    <div className="bg-slate-200 flex-1" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>

      {/* ── Pacientes atendidos ────────────────────────────── */}
      <SectionCard title="Pacientes atendidos" icon={HeartPulse}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <StatCard label="Total en el período" value={pacientes?.total ?? 0} icon={HeartPulse} accent="#013FF6" loading={loading} />
          <StatCard label="Dados de alta" value={pacientes?.porEstado?.alta ?? 0} icon={HeartPulse} accent="#22c55e" loading={loading} />
          <StatCard label="Derivados" value={pacientes?.porEstado?.derivado ?? 0} icon={Ambulance} accent="#8b5cf6" loading={loading} />
        </div>

        {!loading && pacientes && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" /> Por nivel de triaje
              </p>
              <BarraDesglose items={
                Object.entries(pacientes.porNivel)
                  .sort(([a], [b]) => (a === 'sin_evaluar' ? 99 : +a) - (b === 'sin_evaluar' ? 99 : +b))
                  .map(([nivel, cant]) => ({ label: NIVEL_LABEL[nivel] || nivel, value: cant, color: NIVEL_COLOR[nivel] }))
              } />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Ambulance className="h-3.5 w-3.5" /> Por medio de ingreso
              </p>
              <BarraDesglose items={
                Object.entries(pacientes.porMedioIngreso).map(([medio, cant]) => ({ label: medio, value: cant }))
              } />
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Facturación ────────────────────────────────────── */}
      <SectionCard title="Facturación" icon={Receipt}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <StatCard label="Total facturado" value={fmtMoneda(facturacion?.totales.montoTotal)} sub={`${facturacion?.cantidadFacturas ?? 0} facturas`} icon={Receipt} accent="#013FF6" loading={loading} />
          <StatCard label="A cargo de obra social" value={fmtMoneda(facturacion?.totales.montoObraSocial)} icon={Receipt} accent="#22c55e" loading={loading} />
          <StatCard label="A cargo del paciente" value={fmtMoneda(facturacion?.totales.montoPaciente)} icon={Receipt} accent="#f59e0b" loading={loading} />
        </div>

        {!loading && facturacion && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Por estado de pago</p>
              <BarraDesglose items={
                Object.entries(facturacion.porEstadoPago).map(([estado, cant]) => ({ label: ESTADO_PAGO_LABEL[estado] || estado, value: cant, color: ESTADO_PAGO_COLOR[estado] }))
              } />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Por cobertura</p>
              <BarraDesglose items={
                Object.entries(facturacion.porCobertura).map(([estado, cant]) => ({ label: ESTADO_COBERTURA_LABEL[estado] || estado, value: cant }))
              } />
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  )
}