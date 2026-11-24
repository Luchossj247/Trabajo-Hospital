-- Edición de datos del paciente: autoservicio acotado (portal) y correcciones del personal.
--
-- Reglas (se aplican en la base, no solo en la interfaz):
--  * Paciente (portal): solo puede cambiar teléfono, email de contacto, dirección y contacto de emergencia
--    de SU propia ficha. Nada más.
--  * Personal: el vínculo con la cuenta del portal (usuarioId) nunca se toca desde la API;
--    el DNI solo se corrige si el paciente aún no tiene cuenta; grupo sanguíneo y alergias
--    (datos clínicos) solo los cambian médico o administrador.
--  * Llamadas sin sesión de usuario (service_role / mantenimiento SQL) no se restringen.

create or replace function public.proteger_campos_paciente()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_libres text[] := array['telefono','email','direccion','contactoEmergenciaNombre','contactoEmergenciaTelefono','updatedAt'];
begin
  if auth.uid() is null then
    return new;
  end if;

  if new."usuarioId" is distinct from old."usuarioId" then
    raise exception 'El vínculo con la cuenta del portal no se puede modificar.' using errcode = '42501';
  end if;

  if not is_staff() then
    -- Paciente: solo campos de contacto.
    if (to_jsonb(new) - v_libres) is distinct from (to_jsonb(old) - v_libres) then
      raise exception 'Solo podés modificar tus datos de contacto (teléfono, email, dirección y contacto de emergencia).' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.dni is distinct from old.dni then
    if old."usuarioId" is not null then
      raise exception 'No se puede cambiar el DNI: el paciente ya tiene una cuenta en el portal.' using errcode = '42501';
    end if;
    if not has_rol(array['administrador','recepcionista']) then
      raise exception 'Solo recepción o administración pueden corregir el DNI.' using errcode = '42501';
    end if;
  end if;

  if (new."grupoSanguineo" is distinct from old."grupoSanguineo" or new.alergias is distinct from old.alergias)
     and not has_rol(array['administrador','medico']) then
    raise exception 'Solo un médico o un administrador puede modificar grupo sanguíneo y alergias.' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_proteger_campos_paciente on public.paciente;
create trigger trg_proteger_campos_paciente
  before update on public.paciente
  for each row execute function public.proteger_campos_paciente();

-- El paciente puede actualizar únicamente su propia ficha (las columnas las limita el trigger).
drop policy if exists paciente_update_propio on public.paciente;
create policy paciente_update_propio on public.paciente
  for update to authenticated
  using (id = get_my_paciente_id())
  with check (id = get_my_paciente_id());
