import { useNavigate } from 'react-router-dom'
import { Users, UserCog, Activity } from 'lucide-react'

export function TipoUsuario() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Activity className="w-12 h-12 text-[#013FF6]" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Sistema de Gestión Hospitalaria
          </h1>
          <p className="text-slate-600">Seleccione su tipo de acceso al sistema</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Empleado */}
          <button
            onClick={() => navigate('/empleado-login')}
            className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-[#013FF6] text-left"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#013FF6] opacity-5 rounded-bl-full"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-[#013FF6] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <UserCog className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Empleado del Hospital</h2>
              <p className="text-slate-600 mb-6">
                Acceso completo al sistema de gestión hospitalaria para personal médico y administrativo
              </p>
              <ul className="space-y-2 mb-6">
                {['Gestión de triaje y urgencias', 'Control de camas y recursos', 'Historial clínico completo', 'Farmacia e inventario'].map((item) => (
                  <li key={item} className="flex items-center text-sm text-slate-600">
                    <div className="w-1.5 h-1.5 bg-[#ACEC00] rounded-full mr-2"></div>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex items-center text-[#013FF6] font-semibold group-hover:translate-x-2 transition-transform duration-300">
                Iniciar sesión como empleado
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>

          {/* Paciente */}
          <button
            onClick={() => navigate('/')}
            className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-[#ACEC00] text-left opacity-60 cursor-not-allowed"
            disabled
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#ACEC00] opacity-5 rounded-bl-full"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-[#ACEC00] rounded-xl flex items-center justify-center mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Paciente</h2>
              <p className="text-slate-600 mb-6">
                Portal de acceso para pacientes con información médica personalizada
              </p>
              <ul className="space-y-2 mb-6">
                {['Ver mi historial médico', 'Consultar citas y tratamientos', 'Resultados de exámenes', 'Recetas y medicamentos'].map((item) => (
                  <li key={item} className="flex items-center text-sm text-slate-600">
                    <div className="w-1.5 h-1.5 bg-[#013FF6] rounded-full mr-2"></div>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex items-center text-[#ACEC00] font-semibold">
                Próximamente disponible
              </div>
            </div>
          </button>
        </div>

        <div className="text-center mt-8 text-sm text-slate-500">
          <p>¿Necesitas ayuda? Contacta con soporte técnico</p>
        </div>
      </div>
    </div>
  )
}
