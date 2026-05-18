drop policy if exists "deliveries_manage_stable" on public.deliveries;
drop policy if exists "deliveries_select_stable" on public.deliveries;

create policy "deliveries_admin_company_insert"
on public.deliveries
for insert
to authenticated
with check (
  has_role(auth.uid(), 'admin'::public.app_role)
  or company_id in (
    select c.id
    from public.companies c
    where c.user_id = auth.uid()
  )
);

create policy "deliveries_admin_company_driver_update"
on public.deliveries
for update
to authenticated
using (
  has_role(auth.uid(), 'admin'::public.app_role)
  or company_id in (
    select c.id
    from public.companies c
    where c.user_id = auth.uid()
  )
  or driver_id in (
    select dd.id
    from public.delivery_drivers dd
    where dd.user_id = auth.uid()
  )
)
with check (
  has_role(auth.uid(), 'admin'::public.app_role)
  or company_id in (
    select c.id
    from public.companies c
    where c.user_id = auth.uid()
  )
  or driver_id in (
    select dd.id
    from public.delivery_drivers dd
    where dd.user_id = auth.uid()
  )
);

create policy "deliveries_authenticated_select"
on public.deliveries
for select
to authenticated
using (true);