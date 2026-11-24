import { supabase } from '../lib/supabaseClient'
import { getHistorialCompleto } from './historialClinicoService'
import { imprimirHistorialClinico, imprimirFichaPaciente, imprimirEpicrisis } from '../lib/plantillas'

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


// Epicrisis (o resumen, si la internación sigue activa) con evolución y medicación.
export async function exportarEpicrisis(internacionId, generadoPor) {
  const { data: internacion, error } = await supabase
    .from('internacion')
    .select(`
      *,
      cama:camaId ( codigo, sector ),
      medico:medicoId ( nombre, apellido ),
      guardia:guardiaId (
        *,
        comentarioGuardia ( contenido, createdAt, usuario:usuarioId ( nombre, apellido ) ),
        receta ( id, recetaItem ( * ) ),
        paciente:pacienteId ( *, coberturaMedica ( * ) )
      )
    `)
    .eq('id', internacionId)
    .single()
  if (error) throw error
  const { paciente: pac, comentarioGuardia, receta, ...guardia } = internacion.guardia
  const { coberturaMedica, ...paciente } = pac
  const comentarios = [...(comentarioGuardia || [])].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  imprimirEpicrisis({
    internacion: { ...internacion, guardia },
    paciente,
    cobertura: coberturaMedica?.[0] || null,
    comentarios,
    recetas: receta || [],
    generadoPor,
  })
}
