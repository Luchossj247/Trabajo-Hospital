import { useState } from "react";
import { BedDouble, Info, CheckCircle2, AlertTriangle, Settings, RefreshCw, Layers } from "lucide-react";

const bedData = [
  { id: "UTI-1", area: "Unidad de Cuidados Intensivos", status: "occupied", patient: "Juan Pérez", doctor: "Dra. Gómez", days: 12 },
  { id: "UTI-2", area: "Unidad de Cuidados Intensivos", status: "occupied", patient: "María Silva", doctor: "Dr. López", days: 5 },
  { id: "UTI-3", area: "Unidad de Cuidados Intensivos", status: "free", patient: null, doctor: null, days: 0 },
  { id: "UTI-4", area: "Unidad de Cuidados Intensivos", status: "maintenance", patient: null, doctor: null, days: 0 },
  { id: "UTI-5", area: "Unidad de Cuidados Intensivos", status: "free", patient: null, doctor: null, days: 0 },

  { id: "INT-101", area: "Internación General", status: "occupied", patient: "Carlos Ríos", doctor: "Dra. Gómez", days: 2 },
  { id: "INT-102", area: "Internación General", status: "occupied", patient: "Ana Juárez", doctor: "Dra. Díaz", days: 4 },
  { id: "INT-103", area: "Internación General", status: "free", patient: null, doctor: null, days: 0 },
  { id: "INT-104", area: "Internación General", status: "free", patient: null, doctor: null, days: 0 },
  { id: "INT-105", area: "Internación General", status: "occupied", patient: "Luis M.", doctor: "Dr. Paz", days: 1 },
  { id: "INT-106", area: "Internación General", status: "cleaning", patient: null, doctor: null, days: 0 },

  { id: "PED-201", area: "Pediatría", status: "occupied", patient: "Niño 1", doctor: "Dra. Varela", days: 1 },
  { id: "PED-202", area: "Pediatría", status: "free", patient: null, doctor: null, days: 0 },
  { id: "PED-203", area: "Pediatría", status: "free", patient: null, doctor: null, days: 0 },
  { id: "PED-204", area: "Pediatría", status: "occupied", patient: "Niño 2", doctor: "Dr. Varela", days: 3 },
];

function getStatusColor(status) {
  switch (status) {
    case "free":        return "bg-[#ACEC00]/10 border-[#ACEC00] text-slate-800";
    case "occupied":    return "bg-[#013FF6]/5 border-[#013FF6] text-slate-800 shadow-sm";
    case "maintenance": return "bg-slate-100 border-slate-300 text-slate-500 opacity-60";
    case "cleaning":    return "bg-amber-50 border-amber-300 text-amber-800";
    default:            return "bg-slate-50 border-slate-200";
  }
}

function getStatusIcon(status) {
  switch (status) {
    case "free":        return <CheckCircle2 className="h-4 w-4 text-[#ACEC00] stroke-[3]" />;
    case "occupied":    return <BedDouble className="h-4 w-4 text-[#013FF6]" />;
    case "maintenance": return <Settings className="h-4 w-4 text-slate-400" />;
    case "cleaning":    return <RefreshCw className="h-4 w-4 text-amber-500 animate-spin-slow" />;
    default:            return null;
  }
}

export function ControlCamas() {
  const areas = [...new Set(bedData.map((bed) => bed.area))];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1 flex items-center gap-3">
            <BedDouble className="h-8 w-8 text-[#013FF6]" />
            Control de Camas
          </h2>
          <p className="text-slate-500 font-medium">Mapa visual de ocupación y disponibilidad</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center px-4 py-2 rounded-md border border-slate-200 text-sm font-medium hover:bg-slate-50">
            <Layers className="h-4 w-4 mr-2" />
            Por Planta
          </button>
          <button className="flex items-center px-4 py-2 rounded-md bg-[#013FF6] text-white text-sm font-medium shadow-lg shadow-[#013FF6]/20 hover:bg-[#0033cc]">
            <BedDouble className="h-4 w-4 mr-2" />
            Asignar Cama
          </button>
        </div>
      </div>

      {/* Leyenda de estados */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-[#013FF6]" />
          <div>
            <span className="block text-sm font-semibold">Ocupadas</span>
            <span className="block text-xs text-slate-500">6 (40%)</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-[#ACEC00]" />
          <div>
            <span className="block text-sm font-semibold">Disponibles</span>
            <span className="block text-xs text-slate-500">7 (46%)</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-amber-400" />
          <div>
            <span className="block text-sm font-semibold">En Limpieza</span>
            <span className="block text-xs text-slate-500">1 (7%)</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-slate-300" />
          <div>
            <span className="block text-sm font-semibold">Mantenimiento</span>
            <span className="block text-xs text-slate-500">1 (7%)</span>
          </div>
        </div>
      </div>

      {/* Camas por área */}
      <div className="space-y-8">
        {areas.map((area) => {
          const areaBeds = bedData.filter((b) => b.area === area);
          const freeBeds = areaBeds.filter((b) => b.status === "free").length;
          return (
            <div key={area} className="space-y-4">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 flex justify-between items-center">
                {area}
                <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                  {freeBeds} libres / {areaBeds.length} total
                </span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {areaBeds.map((bed) => (
                  <div
                    key={bed.id}
                    className={`relative p-4 rounded-xl border-2 transition-all hover:scale-105 cursor-pointer ${getStatusColor(bed.status)}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-bold text-lg tracking-tight">{bed.id}</span>
                      {getStatusIcon(bed.status)}
                    </div>

                    {bed.status === "occupied" ? (
                      <div className="space-y-1 mt-2">
                        <p className="font-semibold text-sm line-clamp-1">{bed.patient}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          {bed.doctor}
                        </p>
                        <div className="mt-3 pt-3 border-t border-black/5 text-xs font-medium text-slate-500">
                          Internado hace {bed.days} días
                        </div>
                      </div>
                    ) : bed.status === "free" ? (
                      <div className="mt-6 flex flex-col items-center justify-center opacity-80">
                        <p className="text-sm font-semibold text-slate-600 mb-2">Disponible</p>
                        <button className="w-full text-xs h-7 py-0 rounded-md bg-[#ACEC00] text-slate-900 font-medium hover:bg-[#9fd600]">
                          Ocupar
                        </button>
                      </div>
                    ) : (
                      <div className="mt-6 flex items-center justify-center h-[52px]">
                        <span className="text-xs font-semibold uppercase tracking-wider">
                          {bed.status === "cleaning" ? "Limpieza" : "Mantenimiento"}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
