import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  Shield, Plus, Search, Edit2, Trash2, X, Save, Loader2,
  Stethoscope, Users, Pill, ClipboardList, CheckCircle2, AlertCircle,
} from 'lucide-react'

const ROLES = [
  { id: 'admin',        label: 'Administrador',  icon: Shield,        color: '#013FF6' },
  { id: 'doctor',       label: 'Médico',          icon: Stethoscope,   color: '#8b5cf6' },
  { id: 'nurse',        label: 'Enfermero/a',     icon: Users,          color: '#06b6d4' },
  { id: 'pharmacist',   label: 'Farmacéutico',   icon: Pill,           color: '#10b981' },
  { id: 'receptionist', label: 'Recepcionista',  icon: ClipboardList, color: '#f59e0b' },
]

const EMPTY_FORM = { nombre: '', email: '', dni: '', cargo: 'doctor', codigo_acceso: '', active: true }

const Toast = ({ msg, type, onClose }) => (
  <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all
    ${type === 'success' ? 'bg-emerald-600' : 'bg-red-500'}`}>
    {type === 'success' ? <CheckCircle2 className="h-4 w-4"/> : <AlertCircle className="h-4 w-4"/>}
    {msg}
    <button onClick={onClose}><X className="h-4 w-4"/></button>
  </div>
)

// ── Demo data when Supabase table doesn't exist ────────────────────────────
const DEMO_EMPLOYEES = [
  { id: 1, nombre: 'Dr. Carlos Ramírez',   email: 'cramírez@hospital.com',  dni: '20.111.222', cargo: 'doctor',        codigo_acceso: 'DOC001', active: true,  created_at: '2024-01-10T00:00:00Z' },
  { id: 2, nombre: 'Enf. Laura Torres',    email: 'ltorres@hospital.com',   dni: '28.333.444', cargo: 'nurse',         codigo_acceso: 'NUR001', active: true,  created_at: '2024-02-05T00:00:00Z' },
  { id: 3, nombre: 'Farm. Miguel Díaz',    email: 'mdiaz@hospital.com',     dni: '31.555.666', cargo: 'pharmacist',    codigo_acceso: 'FAR001', active: true,  created_at: '2024-03-01T00:00:00Z' },
  { id: 4, nombre: 'Rec. Sofía García',    email: 'sgarcia@hospital.com',   dni: '36.777.888', cargo: 'receptionist',  codigo_acceso: 'REC001', active: true,  created_at: '2024-03-15T00:00:00Z' },
  { id: 5, nombre: 'Dr. Ana Varela',       email: 'avarela@hospital.com',   dni: '22.999.000', cargo: 'doctor',        codigo_acceso: 'DOC002', active: false, created_at: '2024-01-20T00:00:00Z' },
]

export function GestionEmpleados() {
  const [employees, setEmployees] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [toast, setToast] = useState(null)
  const [useDemo, setUseDemo] = useState(false)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('employees').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setEmployees(data || [])
      setUseDemo(false)
    } catch {
      setEmployees(DEMO_EMPLOYEES)
      setUseDemo(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEmployees() }, [])

  useEffect(() => {
    let list = employees
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        (e.nombre || '').toLowerCase().includes(q) ||
        (e.email || '').toLowerCase().includes(q) ||
        (e.dni || '').toLowerCase().includes(q)
      )
    }
    if (roleFilter !== 'all') list = list.filter(e => e.cargo === roleFilter)
    setFiltered(list)
  }, [employees, search, roleFilter])

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (emp) => { setEditTarget(emp); setForm({ ...emp }); setShowModal(true) }

  const handleSave = async () => {
    if (!form.nombre.trim()) return showToast('El nombre es obligatorio.', 'error')
    setSaving(true)
    try {
      if (useDemo) {
        // Local demo mode
        if (editTarget) {
          setEmployees(prev => prev.map(e => e.id === editTarget.id ? { ...form, id: editTarget.id } : e))
        } else {
          setEmployees(prev => [{ ...form, id: Date.now(), created_at: new Date().toISOString() }, ...prev])
        }
        showToast(editTarget ? 'Empleado actualizado.' : 'Empleado creado.')
      } else {
        if (editTarget) {
          const { error } = await supabase.from('employees').update(form).eq('id', editTarget.id)
          if (error) throw error
        } else {
          const { error } = await supabase.from('employees').insert([form])
          if (error) throw error
        }
        await fetchEmployees()
        showToast(editTarget ? 'Empleado actualizado.' : 'Empleado creado.')
      }
      setShowModal(false)
    } catch (e) {
      showToast(e.message || 'Error al guardar.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (emp) => {
    if (!confirm(`¿Eliminar a ${emp.nombre}?`)) return
    try {
      if (useDemo) {
        setEmployees(prev => prev.filter(e => e.id !== emp.id))
      } else {
        const { error } = await supabase.from('employees').delete().eq('id', emp.id)
        if (error) throw error
        await fetchEmployees()
      }
      showToast('Empleado eliminado.')
    } catch (e) {
      showToast(e.message || 'Error al eliminar.', 'error')
    }
  }

  const toggleActive = async (emp) => {
    const updated = { ...emp, active: !emp.active }
    try {
      if (useDemo) {
        setEmployees(prev => prev.map(e => e.id === emp.id ? updated : e))
      } else {
        await supabase.from('employees').update({ active: updated.active }).eq('id', emp.id)
        await fetchEmployees()
      }
    } catch {}
  }

  const roleLabel = (id) => ROLES.find(r => r.id === id)?.label || id
  const roleColor = (id) => ROLES.find(r => r.id === id)?.color || '#94a3b8'

  return (
    <div className="space-y-6 max-w-6xl">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Shield className="h-8 w-8 text-[#013FF6]" />
            Gestión de Personal
          </h1>
          <p className="text-slate-500 mt-1">Administración de empleados y permisos</p>
          {useDemo && (
            <span className="inline-block mt-2 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
              Modo demo – tabla "employees" no encontrada en Supabase
            </span>
          )}
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#013FF6] text-white text-sm font-semibold rounded-xl hover:bg-[#0033cc] shadow-lg shadow-[#013FF6]/20 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nuevo Empleado
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email o DNI..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors
              ${roleFilter === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            Todos
          </button>
          {ROLES.map(r => (
            <button
              key={r.id}
              onClick={() => setRoleFilter(r.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors
                ${roleFilter === r.id ? 'text-white border-transparent' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              style={roleFilter === r.id ? { backgroundColor: r.color } : {}}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {Array(5).fill(0).map((_,i) => <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg"/>)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-10 w-10 text-slate-300 mx-auto mb-3"/>
            <p className="text-slate-400 font-medium">Sin resultados</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Empleado</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">DNI</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cargo</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Código</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp, i) => (
                <tr key={emp.id} className={`border-b border-slate-100/60 hover:bg-slate-50/50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/20'}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white" style={{ backgroundColor: roleColor(emp.cargo) }}>
                        {(emp.nombre || 'E')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{emp.nombre}</p>
                        <p className="text-xs text-slate-400">{emp.email || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell">{emp.dni || '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: roleColor(emp.cargo) }}>
                      {roleLabel(emp.cargo)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-600">{emp.codigo_acceso || '—'}</code>
                  </td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => toggleActive(emp)} className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors
                      ${emp.active !== false ? 'bg-[#ACEC00]/20 text-slate-700 hover:bg-[#ACEC00]/40' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${emp.active !== false ? 'bg-[#7cc300]' : 'bg-slate-300'}`}/>
                      {emp.active !== false ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(emp)} className="p-1.5 rounded-lg text-slate-400 hover:text-[#013FF6] hover:bg-[#013FF6]/10 transition-colors">
                        <Edit2 className="h-4 w-4"/>
                      </button>
                      <button onClick={() => handleDelete(emp)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="h-4 w-4"/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-slate-900">{editTarget ? 'Editar Empleado' : 'Nuevo Empleado'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="h-5 w-5"/>
              </button>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Nombre completo *', key: 'nombre', placeholder: 'Ej: Dr. Carlos Ramírez' },
                { label: 'Email', key: 'email', placeholder: 'email@hospital.com', type: 'email' },
                { label: 'DNI', key: 'dni', placeholder: '28.123.456' },
                { label: 'Código de Acceso', key: 'codigo_acceso', placeholder: 'Ej: DOC001' },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
                  <input
                    type={type || 'text'}
                    value={form[key] || ''}
                    onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cargo</label>
                <select
                  value={form.cargo}
                  onChange={e => setForm(prev => ({ ...prev, cargo: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40"
                >
                  {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setForm(prev => ({ ...prev, active: !prev.active }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.active ? 'bg-[#013FF6]' : 'bg-slate-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.active ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
                <span className="text-sm font-medium text-slate-700">Empleado activo</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-[#013FF6] text-white text-sm font-semibold hover:bg-[#0033cc] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}
                {editTarget ? 'Guardar Cambios' : 'Crear Empleado'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}