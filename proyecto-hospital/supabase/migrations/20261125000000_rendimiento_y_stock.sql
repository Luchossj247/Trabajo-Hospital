-- Rendimiento: auth.uid() evaluado una sola vez por consulta (initplan) en las políticas señaladas por el linter.
alter policy usuario_select on public.usuario
  using (is_staff() or id = (select auth.uid()));
alter policy usuarios_update on public.usuario
  using ((select get_my_rol()) = 'administrador' or id = (select auth.uid()))
  with check ((select get_my_rol()) = 'administrador' or id = (select auth.uid()));
alter policy documento_update on public."documentoClinico"
  using ((select get_my_rol()) = 'administrador' or "subidoPor" = (select auth.uid()))
  with check ((select get_my_rol()) = 'administrador' or "subidoPor" = (select auth.uid()));
alter policy comentarioguardia_insert on public."comentarioGuardia"
  with check (has_rol(array['administrador','medico','enfermero']) and "usuarioId" = (select auth.uid()));
alter policy cambiohorario_insert on public."cambioHorario"
  with check ("usuarioSolicitanteId" = (select auth.uid()) and is_staff());
alter policy cambiohorario_select on public."cambioHorario"
  using (has_rol(array['administrador']) or "usuarioSolicitanteId" = (select auth.uid()) or "usuarioReceptorId" = (select auth.uid()));
alter policy cambiohorario_update on public."cambioHorario"
  using (has_rol(array['administrador']) or "usuarioReceptorId" = (select auth.uid()))
  with check (has_rol(array['administrador']) or "usuarioReceptorId" = (select auth.uid()));
alter policy "mensajeInterno_delete_admin" on public."mensajeInterno"
  using ((select get_my_rol()) = 'administrador' or (select auth.uid()) = "emisorId");
alter policy "mensajeInterno_select" on public."mensajeInterno"
  using ((select auth.uid()) = "emisorId" or (select auth.uid()) = "receptorId");
alter policy "mensajeInterno_update" on public."mensajeInterno"
  using ((select auth.uid()) = "emisorId" or (select auth.uid()) = "receptorId");
alter policy mensaje_insert on public."mensajeInterno"
  with check ((select auth.uid()) = "emisorId" and is_staff());

-- Índices para claves foráneas sin cobertura
create index if not exists idx_atencion_historial on public."atencionMedica" ("historialClinicoId");
create index if not exists idx_atencion_medico on public."atencionMedica" ("medicoId");
create index if not exists idx_auditoria_usuario on public.auditoria ("usuarioId");
create index if not exists idx_camaequip_equip on public."camaEquipamiento" ("equipamientoId");
create index if not exists idx_cambio_horario on public."cambioHorario" ("horarioOriginalId");
create index if not exists idx_cambio_receptor on public."cambioHorario" ("usuarioReceptorId");
create index if not exists idx_cambio_solicitante on public."cambioHorario" ("usuarioSolicitanteId");
create index if not exists idx_cobertura_paciente on public."coberturaMedica" ("pacienteId");
create index if not exists idx_comentario_guardia on public."comentarioGuardia" ("guardiaId");
create index if not exists idx_comentario_usuario on public."comentarioGuardia" ("usuarioId");
create index if not exists idx_documento_historial on public."documentoClinico" ("historialClinicoId");
create index if not exists idx_documento_subidopor on public."documentoClinico" ("subidoPor");
create index if not exists idx_factura_paciente on public.facturacion ("pacienteId");
create index if not exists idx_guardia_enfermero on public.guardia ("enfermeroId");
create index if not exists idx_guardia_medico on public.guardia ("medicoId");
create index if not exists idx_internacion_cama on public.internacion ("camaId");
create index if not exists idx_internacion_medico on public.internacion ("medicoId");
create index if not exists idx_mensaje_emisor on public."mensajeInterno" ("emisorId");
create index if not exists idx_pedidoitem_med on public."pedidoItem" ("medicamentoId");
create index if not exists idx_pedidoitem_pedido on public."pedidoItem" ("pedidoId");
create index if not exists idx_pedidoitem_recetaitem on public."pedidoItem" ("recetaItemId");
create index if not exists idx_pedido_farmacia on public."pedidoMedicamento" ("farmaciaUsuarioId");
create index if not exists idx_pedido_receta on public."pedidoMedicamento" ("recetaId");
create index if not exists idx_receta_guardia on public.receta ("guardiaId");
create index if not exists idx_receta_medico on public.receta ("medicoId");
create index if not exists idx_recetaitem_receta on public."recetaItem" ("recetaId");
create index if not exists idx_turno_recepcionista on public.turno ("recepcionistaId");

-- La extensión no debe vivir en el esquema public
create schema if not exists extensions;
alter extension btree_gist set schema extensions;

-- Ingreso de stock (Farmacia / administrador): suma unidades y deja registro vía auditoría de medicamento
create or replace function public.ingresar_stock(p_medicamento uuid, p_cantidad integer)
returns integer language plpgsql security definer set search_path = public as $$
declare nuevo integer;
begin
  if not has_rol(array['farmacia','administrador']) then
    raise exception 'Sin permiso para ingresar stock';
  end if;
  if p_cantidad is null or p_cantidad <= 0 or p_cantidad > 100000 then
    raise exception 'Cantidad inválida';
  end if;
  update medicamento set "stockActual" = "stockActual" + p_cantidad, "updatedAt" = now()
   where id = p_medicamento returning "stockActual" into nuevo;
  if nuevo is null then raise exception 'Medicamento inexistente'; end if;
  return nuevo;
end $$;
revoke execute on function public.ingresar_stock(uuid, integer) from public, anon;
grant execute on function public.ingresar_stock(uuid, integer) to authenticated;
