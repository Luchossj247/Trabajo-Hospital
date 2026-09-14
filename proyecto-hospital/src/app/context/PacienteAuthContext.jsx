import { createContext, useContext, useState } from 'react'

const PacienteAuthContext = createContext(null)
const STORAGE_KEY = 'hmspro-paciente-portal'

function loadPaciente() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function PacienteAuthProvider({ children }) {
  const [paciente, setPacienteState] = useState(loadPaciente)

  const setPaciente = (p) => {
    setPacienteState(p)
    try {
      if (p) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(p))
      else sessionStorage.removeItem(STORAGE_KEY)
    } catch { /* noop */ }
  }

  const logout = () => setPaciente(null)

  return (
    <PacienteAuthContext.Provider value={{ paciente, setPaciente, logout }}>
      {children}
    </PacienteAuthContext.Provider>
  )
}

export function usePacienteAuth() {
  const ctx = useContext(PacienteAuthContext)
  if (!ctx) throw new Error('usePacienteAuth debe usarse dentro de <PacienteAuthProvider>')
  return ctx
}