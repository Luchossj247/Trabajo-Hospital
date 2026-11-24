-- Al registrar la entrega de un medicamento en farmacia se vincula con el catálogo
-- y se descuenta 1 unidad del stock (nunca por debajo de 0).
create or replace function public.pedidoitem_descontar_stock()
returns trigger language plpgsql security definer set search_path = public as $$
declare med_id uuid;
begin
  if new.accion in ('entregar','reemplazar','agregar') and new."medicamentoEntregado" is not null then
    select id into med_id from medicamento
     where lower(nombre) like lower(split_part(new."medicamentoEntregado",' ',1)) || '%'
     order by (lower(nombre) = lower(new."medicamentoEntregado")) desc, length(nombre) limit 1;
    if med_id is not null then
      if new."medicamentoId" is null then new."medicamentoId" := med_id; end if;
      update medicamento set "stockActual" = greatest("stockActual" - 1, 0), "updatedAt" = now() where id = med_id;
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.pedidoitem_descontar_stock() from public, anon, authenticated;

drop trigger if exists trg_pedidoitem_descontar_stock on public."pedidoItem";
create trigger trg_pedidoitem_descontar_stock before insert on public."pedidoItem"
  for each row execute function public.pedidoitem_descontar_stock();
