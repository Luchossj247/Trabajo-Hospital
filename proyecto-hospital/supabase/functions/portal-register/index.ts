import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// verify_jwt = false: es el endpoint público de alta del portal. Toda la lógica
// sensible (código de activación, creación de la cuenta) se valida acá, con service_role.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  try {
    const b = await req.json()
    const dni = String(b.dni ?? '').replace(/\D/g, '')
    const email = String(b.email ?? '').trim().toLowerCase()
    const password = String(b.password ?? '')
    const codigo = String(b.codigo ?? '').trim().toUpperCase()

    if (dni.length < 6 || dni.length > 9) return json({ error: 'DNI inválido.' }, 400)
    if (!EMAIL_RE.test(email)) return json({ error: 'Email inválido.' }, 400)
    if (password.length < 8) return json({ error: 'La contraseña debe tener al menos 8 caracteres.' }, 400)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const { data: existente } = await admin.from('paciente').select('*').eq('dni', dni).maybeSingle()

    let paciente = existente
    let creadoNuevo = false

    if (existente) {
      // Paciente cargado por el hospital: se reclama con código de activación
      if (existente.usuarioId) return json({ error: 'Ese paciente ya tiene una cuenta. Iniciá sesión.' }, 409)
      const vigente = existente.codigoActivacion && existente.codigoActivacionExpira && new Date(existente.codigoActivacionExpira) > new Date()
      if (!codigo || !vigente || existente.codigoActivacion !== codigo) {
        return json({ error: 'Ya existe un paciente con ese DNI. Pedí un código de activación en recepción e ingresalo.' }, 403)
      }
    } else {
      // Paciente nuevo: autoregistro
      const nombre = String(b.nombre ?? '').trim()
      const apellido = String(b.apellido ?? '').trim()
      const fechaNacimiento = String(b.fechaNacimiento ?? '')
      const sexo = String(b.sexo ?? '')
      if (!nombre || !apellido || !/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento) || !['M', 'F', 'X'].includes(sexo)) {
        return json({ error: 'Completá nombre, apellido, fecha de nacimiento y sexo.' }, 400)
      }
      const { data: nuevo, error: e1 } = await admin.from('paciente').insert([{
        nombre, apellido, dni, fechaNacimiento, sexo, email,
        telefono: b.telefono || null, direccion: b.direccion || null,
      }]).select().single()
      if (e1) return json({ error: e1.message }, 400)
      paciente = nuevo
      creadoNuevo = true
      await admin.from('historialClinico').insert([{ pacienteId: nuevo.id }])
    }

    const { data: au, error: ae } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (ae) {
      if (creadoNuevo) await admin.from('paciente').delete().eq('id', paciente.id)
      const msg = ae.message.includes('already') ? 'Ya existe una cuenta con ese email.' : ae.message
      return json({ error: msg }, 400)
    }

    const { error: ue } = await admin.from('usuario').insert([{
      id: au.user.id, nombre: paciente.nombre, apellido: paciente.apellido, email, rol: 'paciente', activo: true,
    }])
    if (ue) {
      await admin.auth.admin.deleteUser(au.user.id)
      if (creadoNuevo) await admin.from('paciente').delete().eq('id', paciente.id)
      return json({ error: ue.message }, 500)
    }

    await admin.from('paciente').update({
      usuarioId: au.user.id, email, codigoActivacion: null, codigoActivacionExpira: null,
    }).eq('id', paciente.id)

    return json({ ok: true }, 201)
  } catch (_err) {
    return json({ error: 'No se pudo completar el registro.' }, 500)
  }
})
