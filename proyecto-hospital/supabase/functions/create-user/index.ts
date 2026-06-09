import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verificar que quien llama es un admin autenticado
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cliente con el JWT del usuario que llama (para verificar su rol)
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verificar que el usuario que llama existe y es administrador
    const { data: { user: caller }, error: callerError } = await supabaseUser.auth.getUser()
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: callerPerfil, error: perfilError } = await supabaseUser
      .from('usuario')
      .select('rol')
      .eq('id', caller.id)
      .single()

    if (perfilError || callerPerfil?.rol !== 'administrador') {
      return new Response(JSON.stringify({ error: 'Solo los administradores pueden crear usuarios' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Leer el body con los datos del nuevo usuario
    const { nombre, apellido, email, password, rol, activo = true } = await req.json()

    if (!nombre || !apellido || !email || !password || !rol) {
      return new Response(JSON.stringify({ error: 'Faltan campos obligatorios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Cliente admin (service_role) — puede crear usuarios en Auth
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 4. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // sin necesidad de confirmar email
    })

    if (authError) {
      // Traducir errores comunes
      const msg = authError.message.includes('already registered')
        ? 'Ya existe un usuario con ese email'
        : authError.message
      return new Response(JSON.stringify({ error: msg }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const newUserId = authData.user.id

    // 5. Insertar en tabla `usuario` con el mismo UUID
    const { data: perfil, error: insertError } = await supabaseAdmin
      .from('usuario')
      .insert([{ id: newUserId, nombre, apellido, email, rol, activo }])
      .select()
      .single()

    if (insertError) {
      // Rollback: eliminar el usuario de Auth si falló el insert
      await supabaseAdmin.auth.admin.deleteUser(newUserId)
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ user: perfil }), {
      status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})