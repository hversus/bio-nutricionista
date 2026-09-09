drop policy if exists funnel_events_admin_read on public.funnel_events;
create policy funnel_events_admin_read on public.funnel_events
for select to authenticated
using (((select auth.jwt()) ->> 'email') = 'matheusgaleno11@gmail.com');

drop policy if exists leads_admin_read on public.leads_nutricionista;
create policy leads_admin_read on public.leads_nutricionista
for select to authenticated
using (((select auth.jwt()) ->> 'email') = 'matheusgaleno11@gmail.com');
