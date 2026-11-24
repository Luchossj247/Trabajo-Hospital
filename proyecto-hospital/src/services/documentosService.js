import { supabase } from '../lib/supabaseClient'
import { getHistorialCompleto } from './historialClinicoService'
import { imprimirHistorialClinico, imprimirFichaPaciente } from '../lib/plantillas'

async function getPacienteConCobertura(pacienteId) {
  const { data, error } = await supabase
    .from('paciente')
    .select('*, coberturaMedica ( * )')
    .eq('id', pacienteId)
    .single()
  if (error) throw error
  const { coberturaMedica, ...paciente } = data
  return { paciente, cobertura: coberturaMedica?.[0] || null }
}

// Trae todo lo necesario y abre el PDF del historial clínico completo de un paciente.
export async function exportarHistorialClinico(pacienteId, generadoPor) {
  const [{ paciente, cobertura }, historial] = await Promise.all([
    getPacienteConCobertura(pacienteId),
    getHistorialCompleto(pacienteId),
  ])
  imprimirHistorialClinico({ paciente, cobertura, historial, generadoPor })
}

export async function exportarFichaPaciente(pacienteId, generadoPor) {
  const { paciente, cobertura } = await getPacienteConCobertura(pacienteId)
  imprimirFichaPaciente({ paciente, cobertura, generadoPor })
}
