import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPacienteConCobertura } from '../../services/pacienteService'
import {
  UserPlus, Save, X, Activity, User, Phone,
  MapPin, Calendar, CreditCard, Loader2, CheckCircle2,
} from 'lucide-react'

const EMPTY_FORM = {
  // Datos personales
  nombre:          '',
  apellido:        '',
  fechaNacimiento: '',
  sexo:            '',
  dni:             '',
  telefono:        '',
  email:           '',
  direccion:       '',
  // Contacto de emergencia
  contactoEmergenciaNombre:   '',
  contactoEmergenciaTelefono: '',
  // Clínico
  grupoSanguineo: '',
  alergias:       '',
  // Cobertura
  obraSocial:     '',
  numeroAfiliado: '',
}

const Field = ({ label, error, children }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-slate-700">{label}</label>
    {children}
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
)

const inputClass = (hasError) =>
  `flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none
   focus-visible:ring-2 focus-visible:ring-[#013FF6] focus-visible:ring-offset-1
   ${hasError ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`

const selectClass = (hasError) =>
  `flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none
   focus-visible:ring-2 focus-visible:ring-[#013FF6] focus-visible:ring-offset-1
   ${hasError ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`

function validate(form) {
  const errors = {}
  if (!form.nombre.trim())       errors.nombre          = 'El nombre es obligatorio'
  if (!form.apellido.trim())     errors.apellido        = 'El apellido es obligatorio'
  if (!form.dni.trim())          errors.dni             = 'El DNI es obligatorio'
  if (!form.fechaNacimiento)     errors.fechaNacimiento = 'La fecha de nacimiento es obligatoria'
  if (!form.sexo)                errors.sexo            = 'Seleccioná el sexo'
  return errors
}

export function RegistroPaciente() {
  const navigate = useNavigate()
  const [form, setForm]       = useState(EMPTY_FORM)
  const [errors, setErrors]   = useState({})
  const [saving, setSaving]   = useState(false)
  const [success, setSuccess] = useState(false)

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }))
  }

  const handleSubmit = async () => {
    const validationErrors = validate(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSaving(true)
    try {
      const pacienteData = {
        nombre:                    form.nombre.trim(),
        apellido:                  form.apellido.trim(),
        dni:                       form.dni.trim(),
        fechaNacimiento:           form.fechaNacimiento,
        sexo:                      form.sexo,
        telefono:                  form.telefono.trim()  || null,
        email:                     form.email.trim()     || null,
        direccion:                 form.direccion.trim() || null,
        contactoEmergenciaNombre:  form.contactoEmergenciaNombre.trim()   || null,
        contactoEmergenciaTelefono: form.contactoEmergenciaTelefono.trim() || null,
        grupoSanguineo:            form.grupoSanguineo   || null,
        alergias:                  form.alergias.trim()  || null,
      }

      const coberturaData = {
        obraSocial:     form.obraSocial.trim()     || null,
        numeroAfiliado: form.numeroAfiliado.trim() || null,
      }

      await createPacienteConCobertura(pacienteData, coberturaData)
      setSuccess(true)
      setTimeout(() => navigate('/empleado/registro'), 2000)
    } catch (err) {
      if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
        setErrors({ dni: 'Ya existe un paciente con ese DNI' })
      } else {
        setErrors({ _general: err.message || 'Error al guardar el paciente' })
      }
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Paciente registrado con éxito</h2>
        <p className="text-slate-500 text-sm">Redirigiendo...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <UserPlus className="h-8 w-8 text-[#013FF6]" />
            Registro de Pacientes
          </h2>
          <p className="text-slate-500 font-medium mt-1">
            Ingreso de nuevos pacientes al sistema hospitalario
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/empleado/registro')}
            className="flex items-center px-4 py-2 rounded-xl border border-slate-200
              text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <X className="h-4 w-4 mr-2" /> Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center px-4 py-2 rounded-xl bg-[#ACEC00] text-slate-900
              text-sm font-semibold shadow-lg shadow-[#ACEC00]/20 hover:bg-[#9fd600]
              transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving
              ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              : <Save className="h-4 w-4 mr-2" />}
            Guardar Paciente
          </button>
        </div>
      </div>

      {/* Error general */}
      {errors._general && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
          {errors._general}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* ── Datos Personales ─────────────────────────────── */}
        <div className="col-span-12 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center gap-2">
            <User className="h-5 w-5 text-[#013FF6]" />
            <h3 className="text-base font-semibold text-[#013FF6]">Datos Personales</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">

            <Field label="Nombres *" error={errors.nombre}>
              <input
                value={form.nombre}
                onChange={e => setField('nombre', e.target.value)}
                placeholder="Ej: Juan Carlos"
                className={inputClass(errors.nombre)}
              />
            </Field>

            <Field label="Apellidos *" error={errors.apellido}>
              <input
                value={form.apellido}
                onChange={e => setField('apellido', e.target.value)}
                placeholder="Ej: Pérez"
                className={inputClass(errors.apellido)}
              />
            </Field>

            <Field label="DNI *" error={errors.dni}>
              <input
                value={form.dni}
                onChange={e => setField('dni', e.target.value)}
                placeholder="Ej: 12345678"
                className={inputClass(errors.dni)}
              />
            </Field>

            <Field label="Fecha de Nacimiento *" error={errors.fechaNacimiento}>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={form.fechaNacimiento}
                  onChange={e => setField('fechaNacimiento', e.target.value)}
                  className={`${inputClass(errors.fechaNacimiento)} pl-9`}
                />
              </div>
            </Field>

            <Field label="Sexo *" error={errors.sexo}>
              <select
                value={form.sexo}
                onChange={e => setField('sexo', e.target.value)}
                className={selectClass(errors.sexo)}
              >
                <option value="">Seleccionar...</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="X">Otro</option>
              </select>
            </Field>

            <Field label="Grupo Sanguíneo">
              <select
                value={form.grupoSanguineo}
                onChange={e => setField('grupoSanguineo', e.target.value)}
                className={selectClass(false)}
              >
                <option value="">Desconocido</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>

            <Field label="Alergias Conocidas">
              <input
                value={form.alergias}
                onChange={e => setField('alergias', e.target.value)}
                placeholder="Ej: Penicilina, Yodo..."
                className={inputClass(false)}
              />
            </Field>

          </div>
        </div>

        {/* ── Contacto ─────────────────────────────────────── */}
        <div className="col-span-12 md:col-span-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center gap-2">
            <Phone className="h-5 w-5 text-[#013FF6]" />
            <h3 className="text-base font-semibold text-[#013FF6]">Información de Contacto</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">

            <div className="md:col-span-2">
              <Field label="Dirección">
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    value={form.direccion}
                    onChange={e => setField('direccion', e.target.value)}
                    placeholder="Ej: Av. Corrientes 1234"
                    className={`${inputClass(false)} pl-9`}
                  />
                </div>
              </Field>
            </div>

            <Field label="Teléfono">
              <input
                value={form.telefono}
                onChange={e => setField('telefono', e.target.value)}
                placeholder="11 1234-5678"
                className={inputClass(false)}
              />
            </Field>

            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={e => setField('email', e.target.value)}
                placeholder="correo@ejemplo.com"
                className={inputClass(false)}
              />
            </Field>

            <div className="md:col-span-2 pt-3 border-t border-slate-100">
              <p className="text-sm font-semibold text-[#013FF6] mb-3">Contacto de Emergencia</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nombre">
                  <input
                    value={form.contactoEmergenciaNombre}
                    onChange={e => setField('contactoEmergenciaNombre', e.target.value)}
                    placeholder="Familiar o amigo"
                    className={inputClass(false)}
                  />
                </Field>
                <Field label="Teléfono">
                  <input
                    value={form.contactoEmergenciaTelefono}
                    onChange={e => setField('contactoEmergenciaTelefono', e.target.value)}
                    placeholder="Teléfono de emergencia"
                    className={inputClass(false)}
                  />
                </Field>
              </div>
            </div>

          </div>
        </div>

        {/* ── Cobertura Médica ──────────────────────────────── */}
        <div className="col-span-12 md:col-span-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="bg-[#ACEC00]/10 border-b border-[#ACEC00]/20 px-6 py-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[#013FF6]" />
            <h3 className="text-base font-semibold text-slate-900">Cobertura Médica</h3>
          </div>
          <div className="p-6 space-y-5">

            <Field label="Obra Social / Prepaga">
              <select
                value={form.obraSocial}
                onChange={e => setField('obraSocial', e.target.value)}
                className={selectClass(false)}
              >
                <option value="">Particular / Sin cobertura</option>
                <option value="OSDE">OSDE</option>
                <option value="Swiss Medical">Swiss Medical</option>
                <option value="Galeno">Galeno</option>
                <option value="PAMI">PAMI</option>
                <option value="IOMA">IOMA</option>
                <option value="Medifé">Medifé</option>
                <option value="Sancor Salud">Sancor Salud</option>
              </select>
            </Field>

            <Field label="Nº de Afiliado">
              <input
                value={form.numeroAfiliado}
                onChange={e => setField('numeroAfiliado', e.target.value)}
                placeholder="Número de credencial"
                disabled={!form.obraSocial}
                className={`${inputClass(false)} disabled:opacity-50 disabled:cursor-not-allowed`}
              />
            </Field>

            {/* Info de cobertura por defecto */}
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs text-blue-700 font-medium flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 flex-shrink-0" />
                Por defecto se asume que la obra social cubre la atención. Puede ajustarse posteriormente.
              </p>
            </div>

          </div>
        </div>

      </div>

      {/* Botones finales */}
      <div className="flex justify-end gap-3 pb-6">
        <button
          onClick={() => navigate('/empleado/registro')}
          className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-medium
            hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-[#013FF6] text-white text-sm font-semibold
            shadow-lg shadow-[#013FF6]/20 hover:bg-[#0033cc] transition-colors
            disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Save className="h-4 w-4" />}
          Confirmar y Registrar Paciente
        </button>
      </div>
    </div>
  )
}