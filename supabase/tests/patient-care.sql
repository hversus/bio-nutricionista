-- Synthetic data only; every mutation is rolled back.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','b0acc903-3992-4b78-8c3b-22dcafcad804',true);
do $$
declare p uuid; s uuid := gen_random_uuid(); e uuid;
begin
  insert into public.funnel_events(session_id,event_name,step_key,step_index) values(s,'started','inicio',0);
  insert into public.leads_nutricionista(session_id,nome,whatsapp,cidade,objetivo,nivel_interesse,consentimento)
  values(s,'Teste transacional','00000000000','Teste','Teste','Teste',true);
  insert into public.contact_followups(session_id) values(s);
  insert into public.patients(name,source_session_id) values('Teste transacional',s) returning id into p;
  insert into public.patient_entries(patient_id,kind,title,occurred_at) values(p,'contact','Contato de teste',now()-interval '1 day') returning id into e;
  perform set_config('test.patient_id',p::text,true);
  perform set_config('test.session_id',s::text,true);
  update public.patients set notes='Editado' where id=p;
  if not exists(select 1 from public.patients where id=p and notes='Editado') then raise exception 'Admin update failed'; end if;
  begin
    insert into public.patient_entries(patient_id,kind,title,occurred_at) values(p,'contact','Data inválida',now()+interval '1 day');
    raise exception 'Future completed entry accepted';
  exception when check_violation then null;
  end;
end $$;
-- Second administrator must see and edit the same care record.
select set_config('request.jwt.claim.sub','331d8efb-22a7-4362-8f49-ed5d3ee709cc',true);
do $$
declare p uuid := current_setting('test.patient_id')::uuid;
begin
  if not exists(select 1 from public.patients where id=p) then raise exception 'Second admin cannot read'; end if;
  update public.patient_entries set notes='Segundo admin' where patient_id=p;
  if not exists(select 1 from public.patient_entries where patient_id=p and notes='Segundo admin') then raise exception 'Second admin cannot update'; end if;
end $$;
-- Unrelated authenticated users get no access to patient records or deletions.
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
do $$
declare affected integer;
begin
  if exists(select 1 from public.patients) or exists(select 1 from public.patient_entries) then raise exception 'Patient data leaked'; end if;
  update public.patients set notes='Unauthorized' where id=current_setting('test.patient_id')::uuid;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Unauthorized update'; end if;
  delete from public.patient_entries where patient_id=current_setting('test.patient_id')::uuid;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Unauthorized deletion'; end if;
  begin
    insert into public.patients(name) values('Unauthorized');
    raise exception 'Unauthorized insertion';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.delete_form_session(current_setting('test.session_id')::uuid);
    raise exception 'Unauthorized RPC';
  exception when insufficient_privilege then null;
  end;
end $$;
set local role anon;
do $$
begin
  begin perform 1 from public.patients; raise exception 'Anon can read patients'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.patient_entries; raise exception 'Anon can read entries'; exception when insufficient_privilege then null; end;
  begin perform public.delete_form_session(current_setting('test.session_id')::uuid); raise exception 'Anon can delete'; exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','b0acc903-3992-4b78-8c3b-22dcafcad804',true);
do $$
declare p uuid := current_setting('test.patient_id')::uuid; s uuid := current_setting('test.session_id')::uuid;
begin
  perform public.delete_form_session(s);
  if exists(select 1 from public.funnel_events where session_id=s) or exists(select 1 from public.leads_nutricionista where session_id=s) or exists(select 1 from public.contact_followups where session_id=s) then raise exception 'Incomplete form deletion'; end if;
  if not exists(select 1 from public.patients where id=p and source_session_id is null) then raise exception 'Patient not preserved after form deletion'; end if;
  if not exists(select 1 from public.patient_entries where patient_id=p) then raise exception 'Care history removed with form'; end if;
  delete from public.patients where id=p;
  if exists(select 1 from public.patient_entries where patient_id=p) then raise exception 'Patient cascade failed'; end if;
end $$;
select 'PASS: admin CRUD, both admins, anon denied, unrelated user denied, atomic deletion, preserved care history, cascade and date validation' as result;
rollback;
