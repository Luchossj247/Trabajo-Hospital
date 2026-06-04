import { useState } from "react";
import { UserPlus, Save, X, Activity, User, Phone, MapPin, Calendar, CreditCard } from "lucide-react";

export function RegistroPaciente() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dob: "",
    gender: "",
    docType: "DNI",
    docNumber: "",
    phone: "",
    email: "",
    address: "",
    insurance: "",
    insurancePlan: "",
    insuranceNumber: "",
    emergencyContact: "",
    emergencyPhone: "",
    bloodType: "",
    allergies: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Patient data:", formData);
    alert("Paciente registrado con éxito");
  };

  const selectClass =
    "flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#013FF6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1 flex items-center gap-3">
            <UserPlus className="h-8 w-8 text-[#013FF6]" />
            Registro de Pacientes
          </h2>
          <p className="text-slate-500 font-medium">
            Ingreso de nuevos pacientes al sistema hospitalario
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            className="flex items-center px-4 py-2 rounded-md border border-slate-200 text-sm font-medium hover:bg-slate-50"
            onClick={() => window.history.back()}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </button>
          <button
            className="flex items-center px-4 py-2 rounded-md bg-[#ACEC00] text-slate-900 text-sm font-medium shadow-lg shadow-[#ACEC00]/20 hover:bg-[#9fd600]"
            onClick={handleSubmit}
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar Paciente
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

          {/* Datos Personales */}
          <div className="col-span-1 md:col-span-12 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-[#013FF6]" />
                <h3 className="text-lg font-semibold text-[#013FF6]">Datos Personales</h3>
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="firstName">Nombres</label>
                <input id="firstName" name="firstName" className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#013FF6]" placeholder="Ej. Juan Carlos" value={formData.firstName} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="lastName">Apellidos</label>
                <input id="lastName" name="lastName" className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#013FF6]" placeholder="Ej. Pérez Gómez" value={formData.lastName} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="dob">Fecha de Nacimiento</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input id="dob" name="dob" type="date" className="flex h-10 w-full rounded-md border border-slate-200 pl-9 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#013FF6]" value={formData.dob} onChange={handleChange} required />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="gender">Género</label>
                <select id="gender" name="gender" className={selectClass} value={formData.gender} onChange={handleChange}>
                  <option value="">Seleccionar...</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="O">Otro</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="docType">Tipo de Documento</label>
                <select id="docType" name="docType" className={selectClass} value={formData.docType} onChange={handleChange}>
                  <option value="DNI">DNI</option>
                  <option value="Pasaporte">Pasaporte</option>
                  <option value="LC">LC</option>
                  <option value="LE">LE</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="docNumber">Número de Documento</label>
                <input id="docNumber" name="docNumber" className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#013FF6]" placeholder="Ej. 12345678" value={formData.docNumber} onChange={handleChange} required />
              </div>
            </div>
          </div>

          {/* Contacto */}
          <div className="col-span-1 md:col-span-6 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-[#013FF6]" />
                <h3 className="text-lg font-semibold text-[#013FF6]">Información de Contacto</h3>
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="address">Dirección</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input id="address" name="address" className="flex h-10 w-full rounded-md border border-slate-200 pl-9 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#013FF6]" placeholder="Ej. Av. Siempreviva 742" value={formData.address} onChange={handleChange} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="phone">Teléfono</label>
                <input id="phone" name="phone" className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#013FF6]" placeholder="Ej. 11 1234 5678" value={formData.phone} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="email">Email</label>
                <input id="email" name="email" type="email" className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#013FF6]" placeholder="Ej. correo@ejemplo.com" value={formData.email} onChange={handleChange} />
              </div>
              <div className="space-y-2 md:col-span-2 mt-2 pt-4 border-t border-slate-100">
                <span className="text-sm font-semibold text-[#013FF6]">Contacto de Emergencia</span>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="emergencyContact">Nombre</label>
                <input id="emergencyContact" name="emergencyContact" className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#013FF6]" placeholder="Familiar o amigo" value={formData.emergencyContact} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="emergencyPhone">Teléfono</label>
                <input id="emergencyPhone" name="emergencyPhone" className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#013FF6]" placeholder="Teléfono de emergencia" value={formData.emergencyPhone} onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* Cobertura & Clínica */}
          <div className="col-span-1 md:col-span-6 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="bg-[#ACEC00]/10 border-b border-[#ACEC00]/20 px-6 py-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#013FF6]" />
                <h3 className="text-lg font-semibold text-slate-900">Cobertura & Clínica</h3>
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="insurance">Obra Social / Prepaga</label>
                <select id="insurance" name="insurance" className={selectClass} value={formData.insurance} onChange={handleChange}>
                  <option value="">Particular / Sin cobertura</option>
                  <option value="OSDE">OSDE</option>
                  <option value="Swiss Medical">Swiss Medical</option>
                  <option value="Galeno">Galeno</option>
                  <option value="PAMI">PAMI</option>
                  <option value="IOMA">IOMA</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="insurancePlan">Plan</label>
                <input id="insurancePlan" name="insurancePlan" className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#013FF6] disabled:opacity-50" placeholder="Ej. 210, 310, Classic..." value={formData.insurancePlan} onChange={handleChange} disabled={!formData.insurance} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="insuranceNumber">Nº de Afiliado</label>
                <input id="insuranceNumber" name="insuranceNumber" className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#013FF6] disabled:opacity-50" placeholder="Número credencial" value={formData.insuranceNumber} onChange={handleChange} disabled={!formData.insurance} />
              </div>
              <div className="space-y-2 md:col-span-2 mt-2 pt-4 border-t border-slate-100">
                <span className="text-sm font-semibold text-[#013FF6] flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Alertas Clínicas
                </span>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="bloodType">Grupo Sanguíneo</label>
                <select id="bloodType" name="bloodType" className={selectClass} value={formData.bloodType} onChange={handleChange}>
                  <option value="">Desconocido</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="allergies">Alergias Conocidas</label>
                <input id="allergies" name="allergies" className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#013FF6]" placeholder="Ej. Penicilina, Yodo..." value={formData.allergies} onChange={handleChange} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button type="button" className="mr-4 px-8 py-2 rounded-md border border-slate-200 text-sm font-medium hover:bg-slate-50" onClick={() => window.history.back()}>
            Cancelar
          </button>
          <button type="submit" className="px-8 py-2 rounded-md bg-[#013FF6] text-white text-sm font-medium shadow-lg shadow-[#013FF6]/20 hover:bg-[#0033cc]">
            Confirmar y Registrar Paciente
          </button>
        </div>
      </form>
    </div>
  );
}
