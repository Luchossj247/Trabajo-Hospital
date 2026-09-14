import { supabase } from '../lib/supabaseClient'

// ── Buscar pacientes (para elegir a quién editarle el historial) ────
export async function buscarPacientesConHistorial(query) {
  const { data, error } = await supabase
    .from('paciente')
    .select(`
      id, nombre, apellido, dni, fechaNacimiento, sexo, grupoSanguineo, alergias,
      coberturaMedica ( obraSocial, estadoCobertura ),
      historialClinico ( id, observacionesGenerales )
    `)
    .or(`nombre.ilike.%${query}%,apellido.ilike.%${query}%,dni.ilike.%${query}%`)
    .order('apellido')
    .limit(20)

  if (error) throw error
  return data
}

// ── Historial completo de un paciente (observaciones + atenciones + documentos) ──
export async function getHistorialCompleto(pacienteId) {
  const { data, error } = await supabase
    .from('historialClinico')
    .select(`
      *,
      atencionMedica ( * ),
      documentoClinico ( * )
    `)
    .eq('pacienteId', pacienteId)
    .maybeSingle()

  if (error) throw error

  // Auto-reparación: todo paciente debería tener un historialClinico (se crea
  // automáticamente tanto en el alta por Recepción como en el auto-registro
  // del Portal Paciente), pero por si falta —por ejemplo, pacientes creados
  // antes de que esa lógica existiera—, se crea acá en vez de romper la
  // pantalla del médico.
  if (!data) {
    const { data: nuevo, error: errCreate } = await supabase
      .from('historialClinico')
      .insert([{ pacienteId }])
      .select(`*, atencionMedica ( * ), documentoClinico ( * )`)
      .single()

    if (errCreate) {
      // Código 23505 = unique_violation: otra llamada (ej. el doble efecto
      // de React StrictMode en desarrollo) ya creó el historial una fracción
      // de segundo antes. No es un error real — se busca la fila que ya
      // existe en vez de romper la pantalla.
      if (errCreate.code === '23505') {
        return getHistorialCompleto(pacienteId)
      }
      throw errCreate
    }
    return { ...nuevo, atencionMedica: [], documentoClinico: [] }
  }

  // ordenar atenciones y documentos por fecha desc
  data.atencionMedica = (data.atencionMedica || []).sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  data.documentoClinico = (data.documentoClinico || []).sort((a, b) => new Date(b.subidoAt) - new Date(a.subidoAt))
  return data
}

// ── Actualizar observaciones generales (rol médico) ──────────────────
export async function actualizarObservaciones(historialId, observacionesGenerales) {
  const { data, error } = await supabase
    .from('historialClinico')
    .update({ observacionesGenerales, updatedAt: new Date().toISOString() })
    .eq('id', historialId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Agregar una atención médica al historial ─────────────────────────
export async function crearAtencion(historialId, { medicoId, motivo, estado, observaciones }) {
  const { data, error } = await supabase
    .from('atencionMedica')
    .insert([{
      historialClinicoId: historialId,
      medicoId,
      fecha: new Date().toISOString(),
      motivo,
      estado, // 'en_curso' | 'alta' | 'derivado'
      observaciones: observaciones || null,
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Editar el estado/observaciones de una atención existente ────────
export async function actualizarAtencion(atencionId, campos) {
  const { data, error } = await supabase
    .from('atencionMedica')
    .update(campos)
    .eq('id', atencionId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Registrar metadatos de un documento clínico (estudio, informe, etc.) ──
// tipo debe ser uno de: 'estudio' | 'imagen' | 'laboratorio' | 'informe' | 'otro' (check constraint en DB).
// subidoPor es obligatorio en la tabla (uuid del usuario que lo sube).
export async function crearDocumentoClinico(historialId, { tipo, descripcion, urlArchivo, subidoPor }) {
  const { data, error } = await supabase
    .from('documentoClinico')
    .insert([{
      historialClinicoId: historialId,
      tipo,
      descripcion: descripcion || null,
      urlArchivo,
      subidoPor,
      subidoAt: new Date().toISOString(),
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function eliminarDocumentoClinico(id) {
  const { error } = await supabase.from('documentoClinico').delete().eq('id', id)
  if (error) throw error
}