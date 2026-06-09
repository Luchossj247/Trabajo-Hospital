import { useState, useEffect, useCallback } from 'react'
import {
  getUsuarios, createUsuario, updateUsuario,
  deleteUsuario, toggleUsuarioActivo, searchUsuarios, resetPassword,
} from '../../services/usuarioService'
import {
  Shield, Plus, Search, Edit2, Trash2, X, Save, Loader2,
  Stethoscope, Users, Pill, ClipboardList, CheckCircle2,
  AlertCircle, RefreshCw, KeyRound,
} from 'lucide-react'

// ── Constantes ────────────────────────────────────────────────
const ROLES = [
  { id: 'administrador', label: 'Administrador',  icon: Shield,        color: '#013FF6' },
  { id: 'medico',        label: 'Médico',          icon: Stethoscope,   color: '#8b5cf6' },
  { id: 'enfermero',     label: 'Enfermero/a',     icon: Users,         color: '#06b6d4' },
  { id: 'farmacia',      label: 'Farmacéutico',    icon: Pill,          color: '#10b981' },
  { id: 'recepcionista', label: 'Recepcionista',   icon: ClipboardList, color: '#f59e0b' },
]

const EMPTY_FORM = {
  nombre: '', apellido: '', email: '',
  passwordHash: '', rol: 'medico', activo: true,
}

// ── Sub-componentes ───────────────────────────────────────────
const Toast = ({ msg, type, onClose }) => (
  <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl
    shadow-lg text-white text-sm font-medium animate-in slide-in-from-bottom-4 duration-300
    ${type === 'success' ? 'bg-emerald-600' : 'bg-red-500'}`}>
    {type === 'success'
      ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
      : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
    {msg}
    <button onClick={onClose} className="ml-2 hover:opacity-70 transition-opacity">
      <X className="h-4 w-4" />
    </button>
  </div>
)

const RoleBadge = ({ rol }) => {
  const r = ROLES.find(r => r.id === rol)
  if (!r) return <span className="text-xs text-slate-400">{rol}</span>
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: r.color }}
    >
      {r.label}
    </span>
  )
}

const SkeletonRow = () => (
  <tr className="border-b border-slate-100">
    {Array(6).fill(0).map((_, i) => (
      <td key={i} className="px-5 py-4">
        <div className="h-4 bg-slate-100 animate-pulse rounded-md" style={{ width: `${60 + i * 10}%` }} />
      </td>
    ))}
  </tr>
)

// ── Componente principal ──────────────────────────────────────
export function GestionEmpleados() {
  const [usuarios, setUsuarios]         = useState([])
  const [filtered, setFiltered]         = useState([])
  const [search, setSearch]             = useState('')
  const [roleFilter, setRoleFilter]     = useState('all')
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [showModal, setShowModal]       = useState(false)
  const [editTarget, setEditTarget]     = useState(null)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [toast, setToast]               = useState(null)

  // Estado para modal de reseteo de contraseña
  const [resetTarget, setResetTarget]   = useState(null)
  const [newPassword, setNewPassword]   = useState('')
  const [resetting, setResetting]       = useState(false)

  // ── Toast helper ─────────────────────────────────────────────
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Fetch ─────────────────────────────────────────────────────
  const fetchUsuarios = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getUsuarios()
      setUsuarios(data)
    } catch (err) {
      showToast(err.message || 'Error al cargar usuarios.', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsuarios() }, [fetchUsuarios])

  // ── Filtrado local ────────────────────────────────────────────
  useEffect(() => {
    let list = usuarios
    if (roleFilter !== 'all') list = list.filter(u => u.rol === roleFilter)
    setFiltered(list)
  }, [usuarios, roleFilter])

  // ── Búsqueda con debounce ─────────────────────────────────────
  useEffect(() => {
    if (!search.trim()) {
      fetchUsuarios()
      return
    }
    const timer = setTimeout(async () => {
      try {
        const data = await searchUsuarios(search)
        setUsuarios(data)
      } catch (err) {
        showToast(err.message, 'error')
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Modal helpers ─────────────────────────────────────────────
  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit   = (u)  => { setEditTarget(u);  setForm({ ...u, passwordHash: '' }); setShowModal(true) }
  const closeModal = ()   => { setShowModal(false); setEditTarget(null) }

  const openReset  = (u)  => { setResetTarget(u); setNewPassword('') }
  const closeReset = ()   => { setResetTarget(null); setNewPassword('') }

  const setField = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  // ── Guardar usuario ───────────────────────────────────────────
  const handleSave = async () => {
    if (!form.nombre.trim() || !form.apellido.trim()) {
      return showToast('Nombre y apellido son obligatorios.', 'error')
    }
    if (!editTarget && !form.email.trim()) {
      return showToast('El email es obligatorio.', 'error')
    }
    if (!editTarget && !form.passwordHash.trim()) {
      return showToast('La contraseña es obligatoria.', 'error')
    }

    setSaving(true)
    try {
      if (editTarget) {
        await updateUsuario(editTarget.id, form)
        showToast('Usuario actualizado correctamente.')
      } else {
        await createUsuario(form)
        showToast('Usuario creado correctamente.')
      }
      closeModal()
      fetchUsuarios()
    } catch (err) {
      showToast(err.message || 'Error al guardar.', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Eliminar ──────────────────────────────────────────────────
  const handleDelete = async (u) => {
    if (!confirm(`¿Eliminar a ${u.nombre} ${u.apellido}? Esta acción no se puede deshacer.`)) return
    try {
      await deleteUsuario(u.id)
      showToast('Usuario eliminado.')
      fetchUsuarios()
    } catch (err) {
      showToast(err.message || 'Error al eliminar.', 'error')
    }
  }

  // ── Toggle activo ─────────────────────────────────────────────
  const handleToggle = async (u) => {
    try {
      await toggleUsuarioActivo(u.id, u.activo)
      setUsuarios(prev =>
        prev.map(x => x.id === u.id ? { ...x, activo: !x.activo } : x)
      )
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  // ── Resetear contraseña ───────────────────────────────────────
  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      return showToast('Ingresá la nueva contraseña.', 'error')
    }
    if (newPassword.length < 6) {
      return showToast('La contraseña debe tener al menos 6 caracteres.', 'error')
    }

    setResetting(true)
    try {
      await resetPassword(resetTarget.id, newPassword)
      showToast(`Contraseña de ${resetTarget.nombre} actualizada correctamente.`)
      closeReset()
    } catch (err) {
      showToast(err.message || 'Error al cambiar la contraseña.', 'error')
    } finally {
      setResetting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────
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
          <p className="text-slate-500 mt-1">Administración de usuarios y permisos del sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsuarios}
            disabled={loading}
            className="p-2.5 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors"
            title="Recargar"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#013FF6] text-white text-sm
              font-semibold rounded-xl hover:bg-[#0033cc] shadow-lg shadow-[#013FF6]/20 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, apellido o email..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors
              ${roleFilter === 'all'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            Todos ({usuarios.length})
          </button>
          {ROLES.map(r => {
            const count = usuarios.filter(u => u.rol === r.id).length
            return (
              <button
                key={r.id}
                onClick={() => setRoleFilter(r.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors
                  ${roleFilter === r.id
                    ? 'text-white border-transparent'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                style={roleFilter === r.id ? { backgroundColor: r.color } : {}}
              >
                {r.label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70">
              {['Usuario', 'Email', 'Rol', 'Estado', 'Alta', 'Acciones'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array(5).fill(0).map((_, i) => <SkeletonRow key={i} />)
              : filtered.length === 0
                ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <Users className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 font-medium">Sin resultados</p>
                    </td>
                  </tr>
                )
                : filtered.map((u, i) => {
                  const rol = ROLES.find(r => r.id === u.rol)
                  return (
                    <tr
                      key={u.id}
                      className={`border-b border-slate-100/60 hover:bg-slate-50/50 transition-colors
                        ${i % 2 === 0 ? '' : 'bg-slate-50/20'}`}
                    >
                      {/* Usuario */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
                            style={{ backgroundColor: rol?.color || '#94a3b8' }}
                          >
                            {(u.nombre || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{u.nombre} {u.apellido}</p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell">{u.email}</td>

                      {/* Rol */}
                      <td className="px-5 py-3.5"><RoleBadge rol={u.rol} /></td>

                      {/* Estado */}
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleToggle(u)}
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1
                            rounded-full transition-colors
                            ${u.activo
                              ? 'bg-[#ACEC00]/20 text-slate-700 hover:bg-[#ACEC00]/40'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.activo ? 'bg-[#7cc300]' : 'bg-slate-300'}`} />
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>

                      {/* Fecha alta */}
                      <td className="px-5 py-3.5 text-xs text-slate-400 hidden lg:table-cell">
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString('es-AR', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })
                          : '—'}
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#013FF6] hover:bg-[#013FF6]/10 transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openReset(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                            title="Cambiar contraseña"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
            }
          </tbody>
        </table>

        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-400">
              Mostrando <span className="font-semibold text-slate-600">{filtered.length}</span> de{' '}
              <span className="font-semibold text-slate-600">{usuarios.length}</span> usuarios
            </p>
          </div>
        )}
      </div>

      {/* ── Modal crear / editar ────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editTarget ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editTarget ? 'Modificá los datos del usuario' : 'Completá los datos para crear el usuario'}
                </p>
              </div>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Nombre *',   key: 'nombre',   placeholder: 'Ej: Carlos' },
                  { label: 'Apellido *', key: 'apellido', placeholder: 'Ej: Ramírez' },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
                    <input
                      value={form[key] || ''}
                      onChange={e => setField(key, e.target.value)}
                      placeholder={placeholder}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email *</label>
                <input
                  type="email"
                  value={form.email || ''}
                  onChange={e => setField('email', e.target.value)}
                  placeholder="usuario@hospital.com"
                  disabled={!!editTarget}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40 disabled:opacity-50 disabled:bg-slate-50"
                />
                {editTarget && (
                  <p className="text-xs text-slate-400 mt-1">El email no se puede modificar. Usá el botón 🔑 para cambiar la contraseña.</p>
                )}
              </div>

              {!editTarget && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contraseña *</label>
                  <input
                    type="password"
                    value={form.passwordHash || ''}
                    onChange={e => setField('passwordHash', e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#013FF6]/40"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Rol</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ROLES.map(r => {
                    const Icon = r.icon
                    const selected = form.rol === r.id
                    return (
                      <button
                        key={r.id}
                        onClick={() => setField('rol', r.id)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left
                          transition-all text-xs font-semibold
                          ${selected ? 'text-white border-transparent' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                        style={selected ? { backgroundColor: r.color } : {}}
                      >
                        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                        {r.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer"
                onClick={() => setField('activo', !form.activo)}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-700">Usuario activo</p>
                  <p className="text-xs text-slate-400">Puede iniciar sesión en el sistema</p>
                </div>
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${form.activo ? 'bg-[#013FF6]' : 'bg-slate-200'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                    ${form.activo ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-[#013FF6] text-white text-sm font-semibold
                  hover:bg-[#0033cc] flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editTarget ? 'Guardar Cambios' : 'Crear Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal resetear contraseña ───────────────────────── */}
      {resetTarget && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closeReset}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <KeyRound className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Cambiar contraseña</h2>
                  <p className="text-xs text-slate-400">{resetTarget.nombre} {resetTarget.apellido}</p>
                </div>
              </div>
              <button onClick={closeReset} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoFocus
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm
                    focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                />
              </div>
              <p className="text-xs text-slate-400">
                El empleado podrá usar esta contraseña la próxima vez que inicie sesión.
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeReset}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetting}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold
                  hover:bg-amber-600 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Cambiar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}