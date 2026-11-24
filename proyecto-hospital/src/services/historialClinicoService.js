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
      atencionMedica ( *, medico:medicoId ( nombre, apellido ) ),
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
      .select(`*, atencionMedica ( *, medico:medicoId ( nombre, apellido ) ), documentoClinico ( * )`)
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

// ── Documentos clínicos con archivo real en Supabase Storage ─────────
// Bucket privado "documentos-clinicos". Ruta: {pacienteId}/{uuid}-{nombre}.
// El acceso lo controlan las políticas RLS de storage.objects (personal clínico y
// el propio paciente) y los archivos se sirven con URLs firmadas de corta duración.
const BUCKET = 'documentos-clinicos'
const MAX_BYTES = 10 * 1024 * 1024
const TIPOS_PERMITIDOS = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']

// tipo debe ser: 'estudio' | 'imagen' | 'laboratorio' | 'informe' | 'otro' (check constraint en DB).
export async function subirDocumentoClinico({ historialId, pacienteId, tipo, descripcion, archivo, subidoPor }) {
  if (!archivo) throw new Error('Seleccioná un archivo.')
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) throw new Error('Formato no permitido. Subí un PDF o una imagen (PNG, JPG, WEBP).')
  if (archivo.size > MAX_BYTES) throw new Error('El archivo supera el máximo de 10 MB.')

  const limpio = archivo.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')
  const ruta = `${pacienteId}/${crypto.randomUUID()}-${limpio}`

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(ruta, archivo, { contentType: archivo.type })
  if (upErr) throw new Error(upErr.message || 'No se pudo subir el archivo.')

  const { data, error } = await supabase
    .from('documentoClinico')
    .insert([{
      historialClinicoId: historialId,
      tipo,
      descripcion: descripcion || null,
      rutaStorage: ruta,
      nombreArchivo: archivo.name,
      subidoPor,
      subidoAt: new Date().toISOString(),
    }])
    .select()
    .single()

  if (error) {
    await supabase.storage.from(BUCKET).remove([ruta]) // evita archivos huérfanos
    throw error
  }
  return data
}

// Devuelve una URL válida 5 minutos para abrir/descargar el documento.
export async function getUrlDocumento(doc) {
  if (doc.rutaStorage) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.rutaStorage, 300)
    if (error) throw new Error('No se pudo acceder al archivo.')
    return data.signedUrl
  }
  return doc.urlArchivo // documentos antiguos con link externo
}

export async function abrirDocumento(doc) {
  const url = await getUrlDocumento(doc)
  window.open(url, '_blank', 'noopener,noreferrer')
}

export async function eliminarDocumentoClinico(doc) {
  if (doc.rutaStorage) {
    const { error: e1 } = await supabase.storage.from(BUCKET).remove([doc.rutaStorage])
    if (e1) throw e1
  }
  const { error } = await supabase.from('documentoClinico').delete().eq('id', doc.id)
  if (error) throw error
}
