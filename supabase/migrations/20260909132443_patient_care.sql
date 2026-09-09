-- Private patient care and atomic form deletion.
begin;
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  source_session_id uuid unique,
  name text not null check (length(trim(name)) between 2 and 160),
  phone text not null default '' check (length(phone) <= 40),
  start_date date not null default current_date,
  end_date date,
  status text not null default 'active' check (status in ('active','paused','completed')),
  goals text not null default '' check (length(goals) <= 5000),
  notes text not null default '' check (length(notes) <= 10000),
  planned_consultations integer not null default 3 check (planned_consultations between 1 and 100),
  contact_interval_days integer not null default 7 check (contact_interval_days between 1 and 365),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);
create table public.patient_entries (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  kind text not null check (kind in ('consultation','contact','diet','note')),
  title text not null check (length(trim(title)) between 2 and 160),
  occurred_at timestamptz not null,
  status text not null default 'completed' check (status in ('scheduled','completed','cancelled')),
  notes text not null default '' check (length(notes) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'completed' or occurred_at <= now())
);
create index patients_status_start_idx on public.patients(status,start_date);
create index patient_entries_patient_date_idx on public.patient_entries(patient_id,occurred_at desc);
alter table public.patients enable row level security;
alter table public.patient_entries enable row level security;
revoke all on public.patients,public.patient_entries from anon,authenticated;
grant select,insert,update,delete on public.patients,public.patient_entries to authenticated;
create policy patients_admin on public.patients for all to authenticated
using ((select auth.uid()) in ('b0acc903-3992-4b78-8c3b-22dcafcad804'::uuid,'331d8efb-22a7-4362-8f49-ed5d3ee709cc'::uuid))
with check ((select auth.uid()) in ('b0acc903-3992-4b78-8c3b-22dcafcad804'::uuid,'331d8efb-22a7-4362-8f49-ed5d3ee709cc'::uuid));
create policy patient_entries_admin on public.patient_entries for all to authenticated
using ((select auth.uid()) in ('b0acc903-3992-4b78-8c3b-22dcafcad804'::uuid,'331d8efb-22a7-4362-8f49-ed5d3ee709cc'::uuid))
with check ((select auth.uid()) in ('b0acc903-3992-4b78-8c3b-22dcafcad804'::uuid,'331d8efb-22a7-4362-8f49-ed5d3ee709cc'::uuid));
grant delete on public.funnel_events,public.leads_nutricionista,public.contact_followups to authenticated;
create policy funnel_events_admin_delete on public.funnel_events for delete to authenticated
using ((select auth.uid()) in ('b0acc903-3992-4b78-8c3b-22dcafcad804'::uuid,'331d8efb-22a7-4362-8f49-ed5d3ee709cc'::uuid));
create policy leads_admin_delete on public.leads_nutricionista for delete to authenticated
using ((select auth.uid()) in ('b0acc903-3992-4b78-8c3b-22dcafcad804'::uuid,'331d8efb-22a7-4362-8f49-ed5d3ee709cc'::uuid));

-- All session data is removed in one transaction, under the caller's RLS.
create function public.delete_form_session(target_session uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or auth.uid() not in ('b0acc903-3992-4b78-8c3b-22dcafcad804'::uuid,'331d8efb-22a7-4362-8f49-ed5d3ee709cc'::uuid) then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  if target_session is null then raise exception 'Session required'; end if;
  update public.patients set source_session_id = null, updated_at = now() where source_session_id = target_session;
  delete from public.contact_followups where session_id = target_session;
  delete from public.funnel_events where session_id = target_session;
  delete from public.leads_nutricionista where session_id = target_session;
end;
$$;
revoke all on function public.delete_form_session(uuid) from public,anon;
grant execute on function public.delete_form_session(uuid) to authenticated;
commit;
