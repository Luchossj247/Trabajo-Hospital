import { useState, useEffect } from 'react'
import { supabase } from "../../lib/supabaseClient";
import { Calendar, Clock, Plus, ChevronLeft, ChevronRight, X, Loader2, Save } from 'lucide-react'

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const SHIFTS = [
  { id: 'morning',   label: 'Mañana',   hours: '06:00 – 14:00', color: '#ACEC00', textColor: '#374151' },
  { id: 'afternoon', label: 'Tarde',    hours: '14:00 – 22:00', color: '#013FF6', textColor: '#ffffff' },
  { id: 'night',     label: 'Noche',    hours: '22:00 – 06:00', color: '#1e293b', textColor: '#ffffff' },
]

const DEMO_SCHEDULE = [
  { id: 1, employee_name: 'Dr. Carlos Ramírez',  cargo: 'doctor',  day: 0, shift: 'morning' },
  { id: 2, employee_name: 'Enf. Laura Torres',   cargo: 'nurse',   day: 0, shift: 'afternoon' },
  { id: 3, employee_name: 'Farm. Miguel Díaz',   cargo: 'pharmacist', day: 1, shift: 'morning' },
  { id: 4, employee_name: 'Rec. Sofía García',   cargo: 'receptionist', day: 1, shift: 'morning' },
  { id: 5, employee_name: 'Dr. Ana Varela',      cargo: 'doctor',  day: 2, shift: 'night' },
  { id: 6, employee_name: 'Dr. Carlos Ramírez',  cargo: 'doctor',  day: 3, shift: 'morning' },
  { id: 7, employee_name: 'Enf. Laura Torres',   cargo: 'nurse',   day: 4, shift: 'morning' },
  { id: 8, employee_name: 'Rec. Sofía García',   cargo: 'receptionist', day: 5, shift: 'afternoon' },
]

export function Turnos() {
  const [schedule, setSchedule] = useState(DEMO_SCHEDULE)
  const [employees, setEmployees] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ employee_id: '', employee_name: '', cargo: '', day: 0, shift: 'morning' })
  const [saving, setSaving] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)

  useEffect(() => {
    supabase.from('employees').select('id, nombre, cargo')
      .then(({ data }) => { if (data) setEmployees(data) })
      .catch(() => setEmployees([
        { id: 1, nombre: 'Dr. Carlos Ramírez', cargo: 'doctor' },
        { id: 2, nombre: 'Enf. Laura Torres',  cargo: 'nurse' },
        { id: 3, nombre: 'Farm. Miguel Díaz',  cargo: 'pharmacist' },
        { id: 4, nombre: 'Rec. Sofía García',  cargo: 'receptionist' },
      ]))
  }, [])

  // Week dates
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7)
  const weekDates = DAYS.map((_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return d
  })

  const getCell = (day, shift) => schedule.filter(s => s.day === day && s.shift === shift)

  const addShift = () => {
    const emp = employees.find(e => String(e.id) === String(form.employee_id))
    const newEntry = {
      id: Date.now(),
      employee_name: emp?.nombre || form.employee_name,
      cargo: emp?.cargo || '',
      day: Number(form.day),
      shift: form.shift,
    }
    setSchedule(prev => [...prev, newEntry])
    setShowModal(false)
  }

  const removeShift = (id) => setSchedule(prev => prev.filter(s => s.id !== id))

  const shiftStyle = (id) => SHIFTS.find(s => s.id === id) || SHIFTS[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Calendar className="h-8 w-8 text-[#013FF6]"/>
            Gestión de Turnos
          </h1>
          <p className="text-slate-500 mt-1">Programación semanal del personal</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#013FF6] text-white text-sm font-semibold rounded-xl hover:bg-[#0033cc] shadow-lg shadow-[#013FF6]/20"
        >
          <Plus className="h-4 w-4"/> Asignar Turno
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap">
        {SHIFTS.map(s => (
          <div key={s.id} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }}/>
            <span className="font-medium text-slate-600">{s.label}</span>
            <span className="text-slate-400">{s.hours}</span>
          </div>
        ))}
      </div>

      {/* Week Navigation */}
      <div className="flex items-center gap-3">
        <button onClick={() => setWeekOffset(w => w-1)} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
          <ChevronLeft className="h-4 w-4 text-slate-600"/>
        </button>
        <span className="font-semibold text-slate-900 text-sm min-w-48 text-center">
          {weekDates[0].toLocaleDateString('es-AR', { day:'2-digit', month:'short' })} –{' '}
          {weekDates[6].toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric' })}
        </span>
        <button onClick={() => setWeekOffset(w => w+1)} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
          <ChevronRight className="h-4 w-4 text-slate-600"/>
        </button>
        {weekOffset !== 0 && (
          <button onClick={() => setWeekOffset(0)} className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600">
            Hoy
          </button>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="w-28 py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left bg-slate-50/70">Turno</th>
              {weekDates.map((d, i) => {
                const isToday = d.toDateString() === today.toDateString()
                return (
                  <th key={i} className="py-3 px-2 text-center">
                    <div className={`inline-flex flex-col items-center ${isToday ? 'text-[#013FF6]' : 'text-slate-600'}`}>
                      <span className="text-xs font-medium uppercase">{DAYS[i]}</span>
                      <span className={`text-lg font-extrabold leading-none mt-0.5 w-8 h-8 flex items-center justify-center rounded-full
                        ${isToday ? 'bg-[#013FF6] text-white' : ''}`}>
                        {d.getDate()}
                      </span>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {SHIFTS.map(shift => (
              <tr key={shift.id} className="border-b border-slate-100/60">
                <td className="py-3 px-4 bg-slate-50/30">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: shift.color }}/>
                    <div>
                      <p className="text-xs font-bold text-slate-700">{shift.label}</p>
                      <p className="text-[10px] text-slate-400">{shift.hours}</p>
                    </div>
                  </div>
                </td>
                {DAYS.map((_, dayIdx) => {
                  const entries = getCell(dayIdx, shift.id)
                  return (
                    <td key={dayIdx} className="py-2 px-1.5 align-top min-h-16">
                      <div className="space-y-1 min-h-12">
                        {entries.map(e => (
                          <div key={e.id} className="group relative rounded-lg px-2 py-1.5 text-[11px] font-semibold leading-tight transition-all"
                            style={{ backgroundColor: `${shift.color}20`, color: '#1e293b', border: `1.5px solid ${shift.color}50` }}>
                            <span className="block truncate">{e.employee_name}</span>
                            <span className="block text-[10px] font-normal opacity-60 capitalize truncate">{e.cargo}</span>
                            <button
                              onClick={() => removeShift(e.id)}
                              className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-slate-400 hover:text-red-500"
                            >
                              <X className="h-2.5 w-2.5"/>
                            </button>
                          </div>
                        ))}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-slate-900">Asignar Turno</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="h-5 w-5"/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Empleado</label>
                {employees.length > 0 ? (
                  <select value={form.employee_id} onChange={e => setForm(p => ({ ...p, employee_id: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40">
                    <option value="">Seleccionar...</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                ) : (
                  <input value={form.employee_name} onChange={e => setForm(p => ({ ...p, employee_name: e.target.value }))}
                    placeholder="Nombre del empleado"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40"/>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Día</label>
                <div className="grid grid-cols-7 gap-1">
                  {DAYS.map((d, i) => (
                    <button key={i} onClick={() => setForm(p => ({ ...p, day: i }))}
                      className={`py-2 text-xs font-semibold rounded-lg transition-colors ${Number(form.day) === i ? 'bg-[#013FF6] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Turno</label>
                <div className="space-y-2">
                  {SHIFTS.map(s => (
                    <button key={s.id} onClick={() => setForm(p => ({ ...p, shift: s.id }))}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border-2 transition-colors text-left
                        ${form.shift === s.id ? 'border-[#013FF6] bg-[#013FF6]/5' : 'border-slate-200 hover:border-slate-300'}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }}/>
                        <span className="text-sm font-semibold text-slate-900">{s.label}</span>
                      </div>
                      <span className="text-xs text-slate-500">{s.hours}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={addShift} className="flex-1 py-2.5 rounded-xl bg-[#013FF6] text-white text-sm font-semibold hover:bg-[#0033cc] flex items-center justify-center gap-2">
                <Save className="h-4 w-4"/> Asignar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}