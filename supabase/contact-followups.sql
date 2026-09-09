begin;
create table public.contact_followups (
session_id uuid primary key,
status text not null default 'Novo' check (status in ('Novo','Contatado','Consulta agendada','Não avançou')),
notes text not null default '' check (length(notes) <= 5000),
updated_at timestamptz not null default now()
);
alter table public.contact_followups enable row level security;
revoke all on public.contact_followups from anon, authenticated;
grant select, insert, update on public.contact_followups to authenticated;
create policy followups_admin on public.contact_followups for all to authenticated
using ((select auth.uid()) in ('b0acc903-3992-4b78-8c3b-22dcafcad804'::uuid,'331d8efb-22a7-4362-8f49-ed5d3ee709cc'::uuid))
with check ((select auth.uid()) in ('b0acc903-3992-4b78-8c3b-22dcafcad804'::uuid,'331d8efb-22a7-4362-8f49-ed5d3ee709cc'::uuid));
alter policy funnel_events_admin_read on public.funnel_events using ((select auth.uid()) in ('b0acc903-3992-4b78-8c3b-22dcafcad804'::uuid,'331d8efb-22a7-4362-8f49-ed5d3ee709cc'::uuid));
alter policy leads_admin_read on public.leads_nutricionista using ((select auth.uid()) in ('b0acc903-3992-4b78-8c3b-22dcafcad804'::uuid,'331d8efb-22a7-4362-8f49-ed5d3ee709cc'::uuid));
commit;
