import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stethoscope, Users, Pill, ClipboardList, Shield, Activity, ArrowLeft, Lock } from 'lucide-react'

const employeeTypes = [
  { id: 'admin', name: 'Administrador', icon: Shield, color: '#013FF6', accessCode: 'ADM123', description: 'Acceso total al sistema', available: true },
  { id: 'doctor', name: 'Médico', icon: Stethoscope, color: '#94a3b8', accessCode: null, description: 'Acceso completo a historiales y diagnósticos', available: false },
  { id: 'nurse', name: 'Enfermero/a', icon: Users, color: '#94a3b8', accessCode: null, description: 'Gestión de triaje y cuidado de pacientes', available: false },
  { id: 'pharmacist', name: 'Farmacéutico', icon: Pill, color: '#94a3b8', accessCode: null, description: 'Gestión de farmacia e inventario', available: false },
  { id: 'receptionist', name: 'Recepcionista', icon: ClipboardList, color: '#94a3b8', accessCode: null, description: 'Registro de pacientes y citas', available: false },
]

export function LoginEmpleado() {
  const navigate = useNavigate()
  const [selectedType, setSelectedType] = useState(null)
  const [accessCode, setAccessCode] = useState('')
  const [error, setError] = useState('')
  const [showCodeInput, setShowCodeInput] = useState(false)

  const handleTypeSelect = (type) => {
    if (!type.available) return
    setSelectedType(type.id)
    setShowCodeInput(true)
    setError('')
    setAccessCode('')
  }

  const handleLogin = () => {
    const employeeType = employeeTypes.find((t) => t.id === selectedType)
    if (accessCode === employeeType?.accessCode) {
      sessionStorage.setItem('employeeType', selectedType)
      sessionStorage.setItem('employeeName', employeeType.name)
      navigate('/empleado')
    } else {
      setError('Código de acceso incorrecto')
      setAccessCode('')
    }
  }

  const handleBack = () => {
    if (showCodeInput) {
      setShowCodeInput(false)
      setSelectedType(null)
      setAccessCode('')
      setError('')
    } else {
      navigate('/')
    }
  }

  const selectedEmployee = employeeTypes.find((t) => t.id === selectedType)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-5xl">
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center text-slate-600 hover:text-[#013FF6] mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver
          </button>
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Activity className="w-12 h-12 text-[#013FF6]" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Acceso de Empleados</h1>
            <p className="text-slate-600">
              {showCodeInput ? 'Ingrese su código de acceso' : 'Seleccione su cargo u ocupación'}
            </p>
          </div>
        </div>

        {!showCodeInput ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employeeTypes.map((type) => {
              const Icon = type.icon
              return (
                <button
                  key={type.id}
                  onClick={() => handleTypeSelect(type)}
                  disabled={!type.available}
                  className={`group relative bg-white rounded-xl p-6 shadow-lg transition-all duration-300 border-2 text-left ${
                    type.available
                      ? 'hover:shadow-xl border-transparent hover:border-[#013FF6] cursor-pointer'
                      : 'border-transparent opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div
                    className="absolute top-0 right-0 w-24 h-24 opacity-5 rounded-bl-full"
                    style={{ backgroundColor: type.color }}
                  />
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                        style={{ backgroundColor: type.color }}
                      >
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      {!type.available && (
                        <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-1 rounded-full">
                          No disponible
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{type.name}</h3>
                    <p className="text-sm text-slate-600">{type.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-slate-200">
              {selectedEmployee && (
                <div className="text-center mb-6">
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: selectedEmployee.color }}
                  >
                    <selectedEmployee.icon className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">{selectedEmployee.name}</h2>
                  <p className="text-sm text-slate-600">{selectedEmployee.description}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Lock className="w-4 h-4 inline mr-2" />
                    Código de Acceso
                  </label>
                  <input
                    type="password"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    placeholder="Ingrese su código"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#013FF6] focus:border-transparent"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleLogin}
                  className="w-full px-6 py-3 bg-[#013FF6] text-white rounded-lg font-semibold hover:bg-[#012acc] transition-colors"
                >
                  Ingresar al Sistema
                </button>

                <div className="pt-4 border-t border-slate-200 text-center">
                  <p className="text-xs text-slate-500">
                    Código de demostración: ADM123
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}