import { UserPlus, Calendar, Clock, BedDouble } from "lucide-react";
import { Link } from "react-router";

export function ReceptionistDashboard() {
  const stats = [
    { label: "Pacientes Registrados Hoy", value: "18", icon: UserPlus, color: "#ACEC00" },
    { label: "Citas Agendadas", value: "24", icon: Calendar, color: "#013FF6" },
    { label: "En Sala de Espera", value: "7", icon: Clock, color: "#ACEC00" },
    { label: "Camas Disponibles", value: "12", icon: BedDouble, color: "#013FF6" },
  ];

  const waitingRoom = [
    { name: "Carlos Méndez", arrival: "09:15 AM", type: "Consulta General", waitTime: "15 min" },
    { name: "Ana Silva", arrival: "09:30 AM", type: "Cardiología", waitTime: "10 min" },
    { name: "Pedro Gómez", arrival: "09:45 AM", type: "Laboratorio", waitTime: "5 min" },
  ];

  const upcomingAppointments = [
    { time: "10:30 AM", patient: "María López", doctor: "Dr. Carlos Ramírez", specialty: "Cardiología" },
    { time: "11:00 AM", patient: "Juan Pérez", doctor: "Dra. Ana Torres", specialty: "Medicina General" },
    { time: "11:30 AM", patient: "Carmen Ruiz", doctor: "Dr. Luis Pérez", specialty: "Pediatría" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Panel de Recepción</h1>
        <p className="text-slate-600 mt-1">Gestión de pacientes y citas</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: `${stat.color}20` }}>
                  <Icon className="h-6 w-6" style={{ color: stat.color }} />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</div>
              <div className="text-sm text-slate-600">{stat.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sala de Espera */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Sala de Espera</h2>
            <Link to="/empleado/registro" className="text-sm text-[#013FF6] hover:underline">
              Registrar paciente
            </Link>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {waitingRoom.map((patient, index) => (
                <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-[#ACEC00] transition-colors cursor-pointer">
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-semibold text-slate-900">{patient.name}</div>
                    <span className="text-xs text-slate-500">Llegada: {patient.arrival}</span>
                  </div>
                  <div className="text-sm text-slate-600 mb-1">{patient.type}</div>
                  <div className="text-xs text-[#013FF6] font-medium">Esperando: {patient.waitTime}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Próximas Citas */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Próximas Citas</h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {upcomingAppointments.map((apt, index) => (
                <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-[#013FF6]">{apt.time}</span>
                    <Clock className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="font-semibold text-slate-900">{apt.patient}</div>
                  <div className="text-sm text-slate-600">{apt.doctor} - {apt.specialty}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
