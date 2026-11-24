-- =====================================================================
-- HMSPro — Resolución de riesgos y deuda técnica (sección 11 del TP3)
-- Consolida las migraciones aplicadas el 24/11/2026:
--   riesgos_a1 … riesgos_b6 (ver supabase_migrations.schema_migrations)
-- =====================================================================

-- ── Helpers de rol (SECURITY DEFINER, usados por las políticas RLS) ──
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select rol in ('administrador','medico','enfermero','recepcionista','farmacia') from usuario where id = auth.uid()), false)
$$;
create or replace function public.has_rol(roles text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select rol = any(roles) from usuario where id = auth.uid()), false)
$$;
create or replace function public.get_my_paciente_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from paciente where "usuarioId" = auth.uid()
$$;
alter function public.get_my_rol() set search_path = public;

-- ── Riesgo 5: una sola guardia activa por paciente ──
create unique index if not exists guardia_activa_unica_por_paciente
  on public.guardia ("pacienteId") where estado in ('en_espera','en_atencion','internado');

-- Un turno cancelado no bloquea el horario
alter table public.turno drop constraint if exists turno_medico_slot_unico;
create unique index turno_medico_slot_unico on public.turno ("medicoId", fecha, "horaInicio") where estado <> 'cancelado';

-- ── Riesgo 4: internación atómica y coherente con la guardia ──
create or replace function public.crear_internacion(p_guardia uuid, p_cama uuid, p_medico uuid)
returns public.internacion language plpgsql security invoker set search_path = public as $$
declare v_cama public.cama; v_guardia public.guardia; v_int public.internacion;
begin
  select * into v_cama from cama where id = p_cama for update;
  if not found then raise exception 'La cama no existe.'; end if;
  if v_cama.estado <> 'disponible' then raise exception 'La cama % no está disponible.', v_cama.codigo; end if;
  select * into v_guardia from guardia where id = p_guardia for update;
  if not found then raise exception 'La guardia no existe.'; end if;
  if v_guardia.estado not in ('en_espera','en_atencion') then
    raise exception 'El paciente no está en una guardia activa (estado actual: %).', v_guardia.estado;
  end if;
  if exists (select 1 from internacion where "guardiaId" = p_guardia) then
    raise exception 'Esta guardia ya tiene una internación registrada.';
  end if;
  insert into internacion ("guardiaId","camaId","medicoId",estado) values (p_guardia,p_cama,p_medico,'activa') returning * into v_int;
  update cama set estado='ocupada', "updatedAt"=now() where id = p_cama;
  update guardia set estado='internado', "medicoId"=coalesce("medicoId", p_medico), "updatedAt"=now() where id = p_guardia;
  return v_int;
end $$;

create or replace function public.finalizar_internacion(p_internacion uuid)
returns public.internacion language plpgsql security invoker set search_path = public as $$
declare v_int public.internacion;
begin
  select * into v_int from internacion where id = p_internacion for update;
  if not found then raise exception 'La internación no existe.'; end if;
  if v_int.estado <> 'activa' then raise exception 'La internación ya fue finalizada.'; end if;
  update internacion set estado='alta', fin=now(), "updatedAt"=now() where id = p_internacion returning * into v_int;
  update cama set estado='disponible', "updatedAt"=now() where id = v_int."camaId";
  update guardia set estado='alta', "egresoAt"=now(), "updatedAt"=now() where id = v_int."guardiaId";
  return v_int;
end $$;

-- ── Riesgo 3: puente turno → guardia ──
create or replace function public.turno_a_guardia(p_turno uuid, p_nivel smallint, p_medio text default 'ambulatorio', p_enfermero uuid default null)
returns public.guardia language plpgsql security invoker set search_path = public as $$
declare v_t public.turno; v_g public.guardia;
begin
  select * into v_t from turno where id = p_turno for update;
  if not found then raise exception 'El turno no existe.'; end if;
  if v_t.estado not in ('programado','confirmado') then
    raise exception 'El turno está en estado "%" y no puede pasarse a guardia.', v_t.estado;
  end if;
  if exists (select 1 from guardia where "pacienteId" = v_t."pacienteId" and estado in ('en_espera','en_atencion','internado')) then
    raise exception 'El paciente ya tiene una guardia activa.';
  end if;
  insert into guardia ("pacienteId","nivelTriage","medioIngreso","estadoIngreso","comentarioTriage","enfermeroId","medicoId",estado)
  values (v_t."pacienteId", p_nivel, p_medio, 'Derivado desde turno programado',
          coalesce(v_t.motivo,'Turno programado'), p_enfermero, v_t."medicoId", 'en_espera')
  returning * into v_g;
  update turno set estado='realizado', observaciones = trim(both from coalesce(observaciones,'') || ' [Pasó a guardia ' || to_char(now(),'DD/MM HH24:MI') || ']'), "updatedAt"=now() where id = p_turno;
  return v_g;
end $$;

-- ── Riesgo 1: portal del paciente con Supabase Auth ──
alter table public.paciente
  add column if not exists "usuarioId" uuid unique references public.usuario(id) on delete set null,
  add column if not exists "codigoActivacion" text,
  add column if not exists "codigoActivacionExpira" timestamptz;

create or replace function public.generar_codigo_activacion(p_paciente uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  if not has_rol(array['administrador','recepcionista']) then raise exception 'Sin permiso para generar códigos.'; end if;
  if exists (select 1 from paciente where id = p_paciente and "usuarioId" is not null) then
    raise exception 'El paciente ya tiene una cuenta del portal.';
  end if;
  v_code := upper(substr(md5(random()::text || clock_timestamp()::text || p_paciente::text), 1, 8));
  update paciente set "codigoActivacion" = v_code, "codigoActivacionExpira" = now() + interval '7 days' where id = p_paciente;
  if not found then raise exception 'El paciente no existe.'; end if;
  return v_code;
end $$;

create or replace function public.turnos_ocupados(p_medico uuid, p_fecha date)
returns table(id uuid, "horaInicio" time) language sql stable security definer set search_path = public as $$
  select t.id, t."horaInicio" from turno t where t."medicoId" = p_medico and t.fecha = p_fecha and t.estado <> 'cancelado'
$$;

-- ── Riesgo 11: reportes calculados en SQL ──
create or replace function public.reporte_ocupacion_camas() returns jsonb
language sql stable security invoker set search_path = public as $$
  with s as (
    select sector, count(*)::int total,
      count(*) filter (where estado='disponible')::int disponible,
      count(*) filter (where estado='ocupada')::int ocupada,
      count(*) filter (where estado='mantenimiento')::int mantenimiento,
      count(*) filter (where estado='reservada')::int reservada
    from cama group by sector)
  select jsonb_build_object(
    'porSector', coalesce((select jsonb_agg(to_jsonb(s) order by sector) from s), '[]'::jsonb),
    'totales', jsonb_build_object(
      'total', coalesce((select sum(total) from s),0), 'disponible', coalesce((select sum(disponible) from s),0),
      'ocupada', coalesce((select sum(ocupada) from s),0), 'mantenimiento', coalesce((select sum(mantenimiento) from s),0),
      'reservada', coalesce((select sum(reservada) from s),0)))
$$;
create or replace function public.reporte_pacientes_atendidos(p_desde timestamptz) returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'total', (select count(*) from guardia where "createdAt" >= p_desde),
    'porEstado', coalesce((select jsonb_object_agg(estado, c) from (select estado, count(*) c from guardia where "createdAt" >= p_desde group by 1) x), '{}'::jsonb),
    'porNivel', coalesce((select jsonb_object_agg("nivelTriage"::text, c) from (select "nivelTriage", count(*) c from guardia where "createdAt" >= p_desde group by 1) x), '{}'::jsonb),
    'porMedioIngreso', coalesce((select jsonb_object_agg("medioIngreso", c) from (select "medioIngreso", count(*) c from guardia where "createdAt" >= p_desde group by 1) x), '{}'::jsonb))
$$;
create or replace function public.reporte_facturacion(p_desde timestamptz) returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'cantidadFacturas', (select count(*) from facturacion where "createdAt" >= p_desde),
    'totales', jsonb_build_object(
      'montoTotal', coalesce((select sum("montoTotal") from facturacion where "createdAt" >= p_desde),0),
      'montoObraSocial', coalesce((select sum("montoObraSocial") from facturacion where "createdAt" >= p_desde),0),
      'montoPaciente', coalesce((select sum("montoPaciente") from facturacion where "createdAt" >= p_desde),0)),
    'porEstadoPago', coalesce((select jsonb_object_agg("estadoPago", c) from (select "estadoPago", count(*) c from facturacion where "createdAt" >= p_desde group by 1) x), '{}'::jsonb),
    'porCobertura', coalesce((select jsonb_object_agg("estadoCobertura", c) from (select "estadoCobertura", count(*) c from facturacion where "createdAt" >= p_desde group by 1) x), '{}'::jsonb))
$$;

-- ── Riesgo 8: resolución de cambios de turno de horario ──
create or replace function public.resolver_cambio_horario(p_cambio uuid, p_aprobar boolean) returns public."cambioHorario"
language plpgsql security definer set search_path = public as $$
declare v_c public."cambioHorario";
begin
  select * into v_c from "cambioHorario" where id = p_cambio for update;
  if not found then raise exception 'La solicitud no existe.'; end if;
  if v_c.estado <> 'pendiente' then raise exception 'La solicitud ya fue resuelta.'; end if;
  if not (has_rol(array['administrador']) or v_c."usuarioReceptorId" = auth.uid()) then
    raise exception 'Solo el receptor o un administrador pueden resolver el cambio.';
  end if;
  if p_aprobar then
    update horario set "usuarioId" = v_c."usuarioReceptorId" where id = v_c."horarioOriginalId" and "usuarioId" = v_c."usuarioSolicitanteId";
    if not found then raise exception 'El horario ya no pertenece al solicitante.'; end if;
  end if;
  update "cambioHorario" set estado = case when p_aprobar then 'aprobado' else 'rechazado' end, "resueltaAt" = now() where id = p_cambio returning * into v_c;
  return v_c;
end $$;

-- ── Riesgo 7: auditoría automática ──
create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_old jsonb; v_new jsonb; v_id uuid; v_uid uuid;
begin
  if tg_op <> 'INSERT' then v_old := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then v_new := to_jsonb(new); end if;
  begin v_id := coalesce(v_new->>'id', v_old->>'id')::uuid; exception when others then v_id := null; end;
  select id into v_uid from usuario where id = auth.uid();
  v_old := v_old - 'codigoActivacion'; v_new := v_new - 'codigoActivacion';
  insert into auditoria ("usuarioId","tablaAfectada","registroId",accion,"datosAnteriores","datosNuevos")
  values (v_uid, tg_table_name, v_id, tg_op, v_old, v_new);
  return null;
end $$;
do $$
declare t text;
begin
  foreach t in array array['paciente','historialClinico','atencionMedica','documentoClinico','guardia','internacion','turno','receta','facturacion','usuario','pedidoMedicamento','medicamento','cama','horario','cambioHorario'] loop
    execute format('create trigger trg_audit_%s after insert or update or delete on public.%I for each row execute function public.audit_row()', lower(t), t);
  end loop;
end $$;
create index if not exists idx_auditoria_createdat on public.auditoria ("createdAt" desc);
create index if not exists idx_auditoria_tabla on public.auditoria ("tablaAfectada");

-- Anti escalada de privilegios sobre usuario
create or replace function public.proteger_rol_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and (new.rol is distinct from old.rol or new.activo is distinct from old.activo or new.email is distinct from old.email)
     and not exists (select 1 from usuario where id = auth.uid() and rol = 'administrador') then
    raise exception 'No tenés permiso para modificar rol, estado o email.';
  end if;
  return new;
end $$;
create trigger trg_proteger_rol_usuario before update on public.usuario for each row execute function public.proteger_rol_usuario();

-- ── Riesgo 6: documentos en Supabase Storage (bucket privado) ──
alter table public."documentoClinico" alter column "urlArchivo" drop not null;
alter table public."documentoClinico" add column if not exists "rutaStorage" text, add column if not exists "nombreArchivo" text;
alter table public."documentoClinico" add constraint documento_tiene_archivo check ("urlArchivo" is not null or "rutaStorage" is not null);
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos-clinicos','documentos-clinicos', false, 10485760, array['application/pdf','image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;
create policy docs_staff_select on storage.objects for select to authenticated using (bucket_id = 'documentos-clinicos' and has_rol(array['administrador','medico','enfermero']));
create policy docs_staff_insert on storage.objects for insert to authenticated with check (bucket_id = 'documentos-clinicos' and has_rol(array['administrador','medico']));
create policy docs_staff_delete on storage.objects for delete to authenticated using (bucket_id = 'documentos-clinicos' and has_rol(array['administrador','medico']));
create policy docs_paciente_select on storage.objects for select to authenticated using (bucket_id = 'documentos-clinicos' and (storage.foldername(name))[1] = get_my_paciente_id()::text);

-- ── Riesgo 2: políticas RLS por tabla y rol (se eliminan allow_all_* y las de anon) ──
-- Tablas que tenían RLS activo sin ninguna política:
create policy internacion_select on public.internacion for select to authenticated using (has_rol(array['administrador','medico','enfermero','recepcionista']));
create policy internacion_insert on public.internacion for insert to authenticated with check (has_rol(array['administrador','medico','enfermero']));
create policy internacion_update on public.internacion for update to authenticated using (has_rol(array['administrador','medico','enfermero'])) with check (has_rol(array['administrador','medico','enfermero']));
create policy internacion_delete on public.internacion for delete to authenticated using (has_rol(array['administrador']));
create policy equipamiento_select on public.equipamiento for select to authenticated using (is_staff());
create policy equipamiento_admin on public.equipamiento for all to authenticated using (has_rol(array['administrador'])) with check (has_rol(array['administrador']));
create policy camaequip_select on public."camaEquipamiento" for select to authenticated using (is_staff());
create policy camaequip_insert on public."camaEquipamiento" for insert to authenticated with check (has_rol(array['administrador','medico','enfermero']));
create policy camaequip_delete on public."camaEquipamiento" for delete to authenticated using (has_rol(array['administrador','medico','enfermero']));
create policy comentarioguardia_select on public."comentarioGuardia" for select to authenticated using (has_rol(array['administrador','medico','enfermero','recepcionista']));
create policy comentarioguardia_insert on public."comentarioGuardia" for insert to authenticated with check (has_rol(array['administrador','medico','enfermero']) and "usuarioId" = auth.uid());
create policy auditoria_select_admin on public.auditoria for select to authenticated using (has_rol(array['administrador']));
create policy cambiohorario_select on public."cambioHorario" for select to authenticated using (has_rol(array['administrador']) or "usuarioSolicitanteId" = auth.uid() or "usuarioReceptorId" = auth.uid());
create policy cambiohorario_insert on public."cambioHorario" for insert to authenticated with check ("usuarioSolicitanteId" = auth.uid() and is_staff());
create policy cambiohorario_update on public."cambioHorario" for update to authenticated using (has_rol(array['administrador']) or "usuarioReceptorId" = auth.uid()) with check (has_rol(array['administrador']) or "usuarioReceptorId" = auth.uid());

-- Políticas abiertas / anónimas eliminadas
drop policy if exists "agendaMedico_select_anon" on public."agendaMedico";
drop policy if exists agenda_all on public."agendaMedico";
drop policy if exists agenda_select on public."agendaMedico";
drop policy if exists "Medicos pueden actualizar sus atenciones" on public."atencionMedica";
drop policy if exists "Medicos pueden crear atenciones" on public."atencionMedica";
drop policy if exists "Medicos y admin pueden ver atenciones" on public."atencionMedica";
drop policy if exists "atencionMedica_select_anon" on public."atencionMedica";
drop policy if exists allow_all_cama on public.cama;
drop policy if exists cama_select on public.cama;
drop policy if exists "allow_all_coberturaMedica" on public."coberturaMedica";
drop policy if exists "documentoClinico_select_anon" on public."documentoClinico";
drop policy if exists auth_insert on public.facturacion;
drop policy if exists auth_select on public.facturacion;
drop policy if exists auth_update on public.facturacion;
drop policy if exists allow_all_guardia on public.guardia;
drop policy if exists auth_insert on public.guardia;
drop policy if exists auth_select on public.guardia;
drop policy if exists auth_update on public.guardia;
drop policy if exists "allow_all_historialClinico" on public."historialClinico";
drop policy if exists allow_all_horario on public.horario;
drop policy if exists horario_select on public.horario;
drop policy if exists allow_all_paciente on public.paciente;
drop policy if exists auth_insert on public.paciente;
drop policy if exists auth_select on public.paciente;
drop policy if exists auth_update on public.paciente;
drop policy if exists paciente_update on public.paciente;
drop policy if exists paciente_select on public.paciente;
drop policy if exists "pedidoMedicamento_insert" on public."pedidoMedicamento";
drop policy if exists "recetaItem_insert" on public."recetaItem";
drop policy if exists allow_all_receta on public.receta;
drop policy if exists turno_all on public.turno;
drop policy if exists turno_insert_anon on public.turno;
drop policy if exists turno_select on public.turno;
drop policy if exists turno_select_anon on public.turno;
drop policy if exists allow_all_usuario on public.usuario;
drop policy if exists autenticados_pueden_leer_usuarios on public.usuario;
drop policy if exists usuarios_select on public.usuario;
drop policy if exists "mensajeInterno_insert" on public."mensajeInterno";

-- Políticas nuevas
create policy cama_select on public.cama for select to authenticated using (is_staff());
create policy agenda_select on public."agendaMedico" for select to authenticated using (is_staff() or has_rol(array['paciente']));
create policy agenda_write on public."agendaMedico" for all to authenticated using (has_rol(array['administrador','medico','recepcionista'])) with check (has_rol(array['administrador','medico','recepcionista']));
create policy atencion_select on public."atencionMedica" for select to authenticated using (
  has_rol(array['administrador','medico','enfermero','recepcionista'])
  or "historialClinicoId" in (select id from public."historialClinico" where "pacienteId" = get_my_paciente_id()));
create policy atencion_insert on public."atencionMedica" for insert to authenticated with check (has_rol(array['administrador','medico']));
create policy atencion_update on public."atencionMedica" for update to authenticated using (has_rol(array['administrador','medico'])) with check (has_rol(array['administrador','medico']));
create policy cobertura_select_paciente on public."coberturaMedica" for select to authenticated using ("pacienteId" = get_my_paciente_id());
create policy documento_select_paciente on public."documentoClinico" for select to authenticated using (
  "historialClinicoId" in (select id from public."historialClinico" where "pacienteId" = get_my_paciente_id()));
create policy facturacion_select on public.facturacion for select to authenticated using (is_staff());
create policy facturacion_insert on public.facturacion for insert to authenticated with check (is_staff());
create policy facturacion_update on public.facturacion for update to authenticated using (is_staff()) with check (is_staff());
create policy historial_select_paciente on public."historialClinico" for select to authenticated using ("pacienteId" = get_my_paciente_id());
create policy horario_select on public.horario for select to authenticated using (is_staff());
create policy paciente_select on public.paciente for select to authenticated using (has_rol(array['administrador','medico','enfermero','recepcionista','farmacia']) or id = get_my_paciente_id());
create policy paciente_update on public.paciente for update to authenticated using (has_rol(array['administrador','medico','recepcionista'])) with check (has_rol(array['administrador','medico','recepcionista']));
create policy pedidomed_insert on public."pedidoMedicamento" for insert to authenticated with check (has_rol(array['administrador','medico','farmacia']));
create policy recetaitem_insert on public."recetaItem" for insert to authenticated with check (has_rol(array['administrador','medico']));
create policy mensaje_insert on public."mensajeInterno" for insert to authenticated with check (auth.uid() = "emisorId" and is_staff());
create policy turno_select on public.turno for select to authenticated using (is_staff() or "pacienteId" = get_my_paciente_id());
create policy turno_insert on public.turno for insert to authenticated with check (has_rol(array['administrador','medico','recepcionista']) or "pacienteId" = get_my_paciente_id());
create policy turno_update on public.turno for update to authenticated using (has_rol(array['administrador','medico','recepcionista']) or "pacienteId" = get_my_paciente_id()) with check (has_rol(array['administrador','medico','recepcionista']) or "pacienteId" = get_my_paciente_id());
create policy turno_delete on public.turno for delete to authenticated using (has_rol(array['administrador']));
create policy usuario_select on public.usuario for select to authenticated using (is_staff() or id = auth.uid());
create policy usuario_select_medicos_paciente on public.usuario for select to authenticated using (rol = 'medico' and activo and has_rol(array['paciente']));

-- ── Permisos de ejecución: nada para anon; solo lo necesario para authenticated ──
revoke execute on function public.is_staff(), public.has_rol(text[]), public.get_my_paciente_id(), public.generar_codigo_activacion(uuid),
  public.turnos_ocupados(uuid,date), public.reporte_ocupacion_camas(), public.reporte_pacientes_atendidos(timestamptz),
  public.reporte_facturacion(timestamptz), public.resolver_cambio_horario(uuid,boolean), public.crear_internacion(uuid,uuid,uuid),
  public.finalizar_internacion(uuid), public.turno_a_guardia(uuid,smallint,text,uuid) from public, anon;
grant execute on function public.is_staff(), public.has_rol(text[]), public.get_my_paciente_id(), public.generar_codigo_activacion(uuid),
  public.turnos_ocupados(uuid,date), public.reporte_ocupacion_camas(), public.reporte_pacientes_atendidos(timestamptz),
  public.reporte_facturacion(timestamptz), public.resolver_cambio_horario(uuid,boolean), public.crear_internacion(uuid,uuid,uuid),
  public.finalizar_internacion(uuid), public.turno_a_guardia(uuid,smallint,text,uuid) to authenticated;
revoke execute on function public.audit_row(), public.proteger_rol_usuario(), public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.get_my_rol() from public, anon;
grant execute on function public.get_my_rol() to authenticated;
