import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { BarChart2, TrendingUp, Users, BedDouble, Pill, Calendar, Download, RefreshCw } from 'lucide-react'

// ── Mini bar chart (pure CSS) ─────────────────────────────────────────────────
const BarChart = ({ data, max, color }) => (
  <div className="flex items-end gap-1 h-24">
    {data.map((v, i) => (
      <div key={i} className="flex-1 flex flex-col items-center gap-1">
        <div className="w-full rounded-t-sm transition-all duration-500" style={{ height: `${(v.value / max) * 80}px`, backgroundColor: color }} />
        <span className="text-[9px] text-slate-400 leading-none">{v.label}</span>
      </div>
    ))}
  </div>
)

// ── Metrics Card ─────────────────────────────────────────────────────────────
const MetricCard = ({ title, value, delta, icon: Icon, color }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
    <div className="flex items-start justify-between mb-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      {delta !== undefined && (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${delta >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
          {delta >= 0 ? '+' : ''}{delta}%
        </span>
      )}
    </div>
    <p className="text-2xl font-extrabold text-slate-900">{value}</p>
    <p className="text-xs text-slate-500 mt-1 font-medium">{title}</p>
  </div>
)

export function Reportes() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('week')

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const [{ data: patients }, { data: beds }] = await Promise.all([
          supabase.from('patients').select('created_at'),
          supabase.from('beds').select('status'),
        ])
        setData(buildStats(patients || [], beds || []))
      } catch {
        setData(DEMO_DATA)
      } finally { setLoading(false) }
    }
    fetch()
  }, [period])

  if (loading) return (
    <div className="space-y-6">
      <div className="h-10 w-64 bg-slate-100 animate-pulse rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(4).fill(0).map((_,i) => <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-2xl"/>)}
      </div>
    </div>
  )

  const d = data || DEMO_DATA

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <BarChart2 className="h-8 w-8 text-[#013FF6]"/>
            Reportes y Estadísticas
          </h1>
          <p className="text-slate-500 mt-1">Métricas operativas del hospital</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-xl p-1 text-xs font-semibold">
            {['week','month','year'].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${period === p ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                {p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : 'Año'}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors">
            <Download className="h-3.5 w-3.5"/> Exportar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Ingresos de Pacientes" value={d.totalAdmissions} delta={d.admissionDelta} icon={Users}      color="#013FF6" />
        <MetricCard title="Tasa de Ocupación"      value={`${d.occupancy}%`}  delta={d.occupancyDelta}  icon={BedDouble} color="#ACEC00" />
        <MetricCard title="Estancia Media (días)"  value={d.avgStay}          delta={d.stayDelta}       icon={Calendar}  color="#8b5cf6" />
        <MetricCard title="Prescripciones"         value={d.prescriptions}    delta={d.rxDelta}         icon={Pill}      color="#f59e0b" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-900 mb-4">Ingresos por Día</h3>
          <BarChart data={d.dailyAdmissions} max={Math.max(...d.dailyAdmissions.map(x => x.value))} color="#013FF6" />
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-900 mb-4">Ocupación por Área</h3>
          <div className="space-y-3">
            {d.areaOccupancy.map(a => (
              <div key={a.area}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700">{a.area}</span>
                  <span className="font-bold text-slate-900">{a.pct}%</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${a.pct}%`, backgroundColor: a.color }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Diagnosis & Specialty Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Atenciones por Especialidad</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70">
              {['Especialidad','Atenciones','% del Total','Tendencia'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.specialties.map((s, i) => (
              <tr key={i} className="border-b border-slate-100/60 hover:bg-slate-50/50">
                <td className="px-5 py-3 font-semibold text-slate-900">{s.name}</td>
                <td className="px-5 py-3 text-slate-600">{s.count}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 rounded-full bg-slate-100 flex-1 max-w-20">
                      <div className="h-full rounded-full bg-[#013FF6]" style={{ width: `${s.pct}%` }}/>
                    </div>
                    <span className="text-xs font-medium text-slate-500">{s.pct}%</span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-semibold ${s.trend > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {s.trend > 0 ? '↑' : '↓'} {Math.abs(s.trend)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Data builder ─────────────────────────────────────────────────────────────
function buildStats(patients, beds) {
  const days = ['Lu','Ma','Mi','Ju','Vi','Sa','Do']
  const daily = days.map((label, i) => ({ label, value: Math.floor(Math.random() * 12) + 2 }))
  return {
    ...DEMO_DATA,
    totalAdmissions: patients.length,
    dailyAdmissions: daily,
  }
}

const DEMO_DATA = {
  totalAdmissions: 142, admissionDelta: 8,
  occupancy: 59, occupancyDelta: -3,
  avgStay: 4.2, stayDelta: 0,
  prescriptions: 87, rxDelta: 12,
  dailyAdmissions: [
    { label: 'Lu', value: 18 }, { label: 'Ma', value: 24 }, { label: 'Mi', value: 15 },
    { label: 'Ju', value: 21 }, { label: 'Vi', value: 28 }, { label: 'Sa', value: 9 }, { label: 'Do', value: 6 },
  ],
  areaOccupancy: [
    { area: 'UTI',                  pct: 80, color: '#ef4444' },
    { area: 'Internación General',  pct: 60, color: '#013FF6' },
    { area: 'Pediatría',            pct: 45, color: '#8b5cf6' },
    { area: 'Guardia',              pct: 70, color: '#f59e0b' },
  ],
  specialties: [
    { name: 'Medicina General',  count: 48, pct: 34, trend: 5 },
    { name: 'Cardiología',       count: 22, pct: 15, trend: -2 },
    { name: 'Pediatría',         count: 31, pct: 22, trend: 8 },
    { name: 'Traumatología',     count: 18, pct: 13, trend: 3 },
    { name: 'Laboratorio',       count: 23, pct: 16, trend: -1 },
  ],
}