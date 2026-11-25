-- Farmacia necesita ver a qué paciente corresponde cada receta (join receta -> guardia -> paciente).
-- Se limita a las guardias que tienen al menos una receta.
create policy guardia_select_farmacia on public.guardia
  for select to authenticated
  using (
    public.has_rol(array['farmacia'])
    and exists (select 1 from public.receta r where r."guardiaId" = guardia.id)
  );
