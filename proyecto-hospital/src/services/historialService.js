import { supabase } from '../lib/supabaseClient'

// ── Obtener historial por paciente ────────────────────────────
export async function getHistorialByPaciente(pacienteId) {
  const { data, error } = await supabase
    .from('historialClinico')
    .select(`
      *,
      documentoClinico (
        *,
        subidoPorUsuario:subidoPor ( nombre, apellido )
      ),
      paciente ( nombre, apellido, dni, fechaNacimiento )
    `)
    .eq('pacienteId', pacienteId)
    .single()

  if (error) throw error
  return data
}

// ── Actualizar observaciones generales ────────────────────────
export async function updateObservaciones(pacienteId, observaciones) {
  const { data, error } = await supabase
    .from('historialClinico')
    .update({ observacionesGenerales: observaciones })
    .eq('pacienteId', pacienteId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Subir documento clínico ───────────────────────────────────
export async function addDocumento(historialId, subidoPor, documento) {
  const { data, error } = await supabase
    .from('documentoClinico')
    .insert([{ historialId, subidoPor, ...documento }])
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Subir archivo a Supabase Storage ─────────────────────────
export async function uploadArchivoClinico(pacienteId, file) {
  const ext = file.name.split('.').pop()
  const path = `historiales/${pacienteId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('documentos-clinicos')
    .upload(path, file)

  if (uploadError) throw uploadError

  const { data } = supabase.storage
    .from('documentos-clinicos')
    .getPublicUrl(path)

  return data.publicUrl
}

// ── Eliminar documento ────────────────────────────────────────
export async function deleteDocumento(id) {
  const { error } = await supabase
    .from('documentoClinico')
    .delete()
    .eq('id', id)

  if (error) throw error
}