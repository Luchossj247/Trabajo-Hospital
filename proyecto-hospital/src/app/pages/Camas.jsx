import { useState } from "react";
import {
  BedDouble,
  Bed,
  Plus,
  Activity,
  AlertTriangle,
  Stethoscope,
  Wind,
} from "lucide-react";

const mockBeds = [
  // UTI
  { id: "B1", name: "UTI-1", area: "UTI", status: "Ocupada", equipment: ["Respirador", "Monitor Multi"], patient: "Carlos Gómez" },
  { id: "B2", name: "UTI-2", area: "UTI", status: "Ocupada", equipment: ["Respirador", "Monitor Multi"], patient: "María Paz" },
  { id: "B3", name: "UTI-3", area: "UTI", status: "Libre", equipment: ["Respirador", "Monitor Multi"] },
  { id: "B4", name: "UTI-4", area: "UTI", status: "Limpieza", equipment: ["Monitor Multi"] },
  // Guardia
  { id: "B5", name: "G-1", area: "Guardia", status: "Ocupada", equipment: ["Monitor Básico"], patient: "Luis Fernández" },
  { id: "B6", name: "G-2", area: "Guardia", status: "Libre", equipment: ["Monitor Básico"] },
  { id: "B7", name: "G-3", area: "Guardia", status: "Ocupada", equipment: [], patient: "Julio Sosa" },
  { id: "B8", name: "G-4", area: "Guardia", status: "Libre", equipment: [] },
  { id: "B9", name: "G-5", area: "Guardia", status: "Libre", equipment: ["Monitor Básico"] },
  // Internación General
  { id: "B10", name: "IG-1", area: "Internación General", status: "Ocupada", equipment: [], patient: "Marta López" },
  { id: "B11", name: "IG-2", area: "Internación General", status: "Libre", equipment: [] },
  { id: "B12", name: "IG-3", area: "Internación General", status: "Mantenimiento", equipment: [] },
  { id: "B13", name: "IG-4", area: "Internación General", status: "Libre", equipment: [] },
];

const statusStyles = {
  Libre:         "bg-green-100 border-green-200 text-green-800 hover:bg-green-200",
  Ocupada:       "bg-red-100 border-red-200 text-red-800 hover:bg-red-200",
  Limpieza:      "bg-yellow-100 border-yellow-200 text-yellow-800 hover:bg-yellow-200",
  Mantenimiento: "bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200",
};

const equipIcons = {
  "Respirador":    <Wind className="h-3 w-3" />,
  "Monitor Multi": <Activity className="h-3 w-3" />,
  "Monitor Básico": <Stethoscope className="h-3 w-3" />,
};

export function Beds() {
  const [beds] = useState(mockBeds);
  const [filterArea, setFilterArea] = useState("Todas");

  const filteredBeds = beds.filter((b) => filterArea === "Todas" || b.area === filterArea);

  const stats = {
    total:       beds.length,
    free:        beds.filter((b) => b.status === "Libre").length,
    occupied:    beds.filter((b) => b.status === "Ocupada").length,
    utiOccupied: beds.filter((b) => b.area === "UTI" && b.status === "Ocupada").length,
    utiTotal:    beds.filter((b) => b.area === "UTI").length,
  };

  const isUtiCritical = stats.utiOccupied / stats.utiTotal >= 0.8;

  const areas = ["Todas", "UTI", "Guardia", "Internación General"];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Mapa de Camas y Equipamiento</h2>
          <p className="text-sm text-slate-500">Gestión de internación, terapia intensiva y equipamiento médico</p>
        </div>
        <div className="flex space-x-2">
          <button className="px-4 py-2 rounded-md border border-slate-200 text-sm font-medium hover:bg-slate-50">
            Asignar Equipamiento
          </button>
          <button className="flex items-center px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Asignación
          </button>
        </div>
      </div>

      {isUtiCritical && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-red-900">Alerta de Capacidad: UTI</h4>
            <p className="text-sm text-red-700 mt-1">
              La ocupación de la Unidad de Terapia Intensiva está al {Math.round((stats.utiOccupied / stats.utiTotal) * 100)}%.
              Evite sobreasignación y derive pacientes a centros asociados si es necesario.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Camas", value: stats.total, Icon: BedDouble, bg: "bg-blue-100", color: "text-blue-600" },
          { label: "Disponibles", value: stats.free, Icon: Bed, bg: "bg-green-100", color: "text-green-600" },
          { label: "Ocupadas", value: stats.occupied, Icon: Bed, bg: "bg-red-100", color: "text-red-600" },
          { label: "Ocupación UTI", value: `${stats.utiOccupied}/${stats.utiTotal}`, Icon: Activity, bg: "bg-amber-100", color: "text-amber-600" },
        ].map(({ label, value, Icon, bg, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center space-x-4">
            <div className={`p-3 ${bg} ${color} rounded-full`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros y grid de camas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="py-4 px-6 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-slate-600">Área:</span>
            <div className="flex space-x-2">
              {areas.map((area) => (
                <button
                  key={area}
                  onClick={() => setFilterArea(area)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    filterArea === area
                      ? "bg-slate-800 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4 text-xs font-medium text-slate-600">
            <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span> Libre</div>
            <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span> Ocupada</div>
            <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-yellow-400 mr-2"></span> Limpieza</div>
            <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-slate-300 mr-2"></span> Mantenimiento</div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredBeds.map((bed) => (
              <div
                key={bed.id}
                className={`relative group p-4 rounded-xl border-2 transition-all cursor-pointer ${statusStyles[bed.status]}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="font-bold tracking-tight">{bed.name}</span>
                  <span className="text-[10px] px-1.5 bg-white/50 rounded font-medium shadow-sm">
                    {bed.area.substring(0, 3).toUpperCase()}
                  </span>
                </div>

                <div className="flex justify-center mb-3">
                  <BedDouble className={`h-8 w-8 ${bed.status === "Ocupada" ? "opacity-100" : "opacity-50"}`} />
                </div>

                <div className="text-center min-h-[20px]">
                  {bed.status === "Ocupada" && bed.patient ? (
                    <span className="text-xs font-semibold truncate block w-full" title={bed.patient}>
                      {bed.patient}
                    </span>
                  ) : (
                    <span className="text-xs font-medium">{bed.status}</span>
                  )}
                </div>

                {bed.equipment.length > 0 && (
                  <div className="absolute bottom-2 right-2 flex gap-1">
                    {bed.equipment.map((eq, i) => (
                      <div key={i} className="bg-white/80 p-1 rounded-md shadow-sm" title={eq}>
                        {equipIcons[eq]}
                      </div>
                    ))}
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-slate-900/80 rounded-lg flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="mb-2 h-7 text-xs w-24 rounded-md bg-white text-slate-900 font-medium hover:bg-slate-100">
                    Ver Detalles
                  </button>
                  {bed.status === "Libre" && (
                    <button className="h-7 text-xs w-24 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700">
                      Asignar
                    </button>
                  )}
                  {bed.status === "Ocupada" && (
                    <button className="h-7 text-xs w-24 rounded-md bg-red-600 text-white font-medium hover:bg-red-700">
                      Dar Alta
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
