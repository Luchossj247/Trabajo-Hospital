-- El paciente puede cancelar sus propios turnos (hasta 2 horas antes).
create or replace function public.cancelar_mi_turno(p_turno uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t record;
begin
  select * into t from turno where id = p_turno for update;
  if not found or t."pacienteId" is distinct from get_my_paciente_id() then
    raise exception 'Turno inexistente';
  end if;
  if t.estado not in ('programado','confirmado') then
    raise exception 'Este turno ya no se puede cancelar';
  end if;
  if (t.fecha + t."horaInicio") < (now() at time zone 'America/Argentina/Buenos_Aires') + interval '2 hours' then
    raise exception 'Solo se puede cancelar con al menos 2 horas de anticipación. Comunicate con recepción.';
  end if;
  update turno set estado = 'cancelado', observaciones = coalesce(nullif(observaciones,'') || ' · ', '') || 'Cancelado por el paciente', "updatedAt" = now()
   where id = p_turno;
end $$;
revoke execute on function public.cancelar_mi_turno(uuid) from public, anon;
grant execute on function public.cancelar_mi_turno(uuid) to authenticated;
