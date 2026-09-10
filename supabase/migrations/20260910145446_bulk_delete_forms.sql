-- Delete one or more form sessions atomically while preserving patient care records.
begin;

create or replace function public.delete_form_sessions(target_sessions uuid[]) returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  cleaned_sessions uuid[];
begin
  if auth.uid() is null or auth.uid() not in (
    'b0acc903-3992-4b78-8c3b-22dcafcad804'::uuid,
    '331d8efb-22a7-4362-8f49-ed5d3ee709cc'::uuid
  ) then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  select coalesce(array_agg(distinct session_value), '{}'::uuid[])
    into cleaned_sessions
    from unnest(target_sessions) as session_value
    where session_value is not null;

  if cardinality(cleaned_sessions) = 0 then
    raise exception 'At least one session is required';
  end if;
  if cardinality(cleaned_sessions) > 500 then
    raise exception 'A maximum of 500 sessions can be deleted at once';
  end if;

  update public.patients
    set source_session_id = null, updated_at = now()
    where source_session_id = any(cleaned_sessions);
  delete from public.contact_followups where session_id = any(cleaned_sessions);
  delete from public.funnel_events where session_id = any(cleaned_sessions);
  delete from public.leads_nutricionista where session_id = any(cleaned_sessions);

  return cardinality(cleaned_sessions);
end;
$$;

revoke all on function public.delete_form_sessions(uuid[]) from public, anon;
grant execute on function public.delete_form_sessions(uuid[]) to authenticated;

commit;
