"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Patient, PatientEntry, PatientSeed, dateLabel, localInput, patientMetrics, patientSummary, statusLabels, kindLabels, entryStatusLabels } from '../../lib/patients';
import Modal from './modal';
import s from './patients.module.css';

type PatientDraft = Pick<Patient,'name'|'phone'|'start_date'|'end_date'|'status'|'goals'|'notes'|'planned_consultations'|'contact_interval_days'|'source_session_id'>;
type EntryDraft = Pick<PatientEntry,'kind'|'title'|'occurred_at'|'status'|'notes'>;
const emptyPatient = (): PatientDraft => ({ name:'',phone:'',start_date:localInput().slice(0,10),end_date:null,status:'active',goals:'',notes:'',planned_consultations:3,contact_interval_days:7,source_session_id:null });
const emptyEntry = (kind: PatientEntry['kind']): EntryDraft => ({kind,title:kindLabels[kind],occurred_at:localInput(),status:kind==='consultation'?'scheduled':'completed',notes:''});
async function readAll<T>(client:SupabaseClient,table:string):Promise<T[]> {
  const rows:T[]=[];
  for(let offset=0;;offset+=1000) {
    const {data,error}=await client.from(table).select('*').order('id').range(offset,offset+999);
    if(error)throw error;
    rows.push(...data as T[]);if(data.length<1000)return rows;
  }
}

export default function Patients({client,seed,onSeedHandled}: {client:SupabaseClient;seed:PatientSeed|null;onSeedHandled:()=>void}) {
  const [patients,setPatients]=useState<Patient[]>([]);
  const [entries,setEntries]=useState<PatientEntry[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState('all');
  const [selected,setSelected]=useState('');
  const [now,setNow]=useState(Date.now());
  const [editor,setEditor]=useState<PatientDraft|null>(null);
  const [editingId,setEditingId]=useState('');
  const [eventEditor,setEventEditor]=useState<EntryDraft|null>(null);
  const [eventId,setEventId]=useState('');
  const [modalError,setModalError]=useState('');
  const [summary,setSummary]=useState(false);
  const [timelineFilter,setTimelineFilter]=useState('all');
  const [removal,setRemoval]=useState<{kind:'patient'|'entry';id:string;name:string}|null>(null);
  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try { const [p,e]=await Promise.all([readAll<Patient>(client,'patients'),readAll<PatientEntry>(client,'patient_entries')]);setPatients(p);setEntries(e); }
    catch {setError('Não foi possível carregar os pacientes. Tente atualizar.');}
    finally{setLoading(false);}
  },[client]);
  useEffect(()=>{void load();const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer);},[load]);
  useEffect(()=>{window.scrollTo({top:0});},[selected]);
  useEffect(()=>{
    if(!editor&&!eventEditor)return;
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',warn);
    return()=>window.removeEventListener('beforeunload',warn);
  },[editor,eventEditor]);
  useEffect(()=>{
    if(!seed||loading||error)return;
    const existing=patients.find(p=>p.source_session_id===seed.sessionId);
    if(existing){setSelected(existing.id);setNotice('Este contato já tem um acompanhamento.');}
    else{setEditingId('');setEditor({...emptyPatient(),name:seed.name==='—'?'':seed.name,phone:seed.phone,source_session_id:seed.sessionId});setModalError('');}
    onSeedHandled();
  },[seed,loading,error,patients,onSeedHandled]);
  const current=patients.find(p=>p.id===selected);
  const metricMap=useMemo(()=>new Map(patients.map(p=>[p.id,patientMetrics(p,entries,now)])),[patients,entries,now]);
  const metrics=current?metricMap.get(current.id)!:null;
  const shown=patients.filter(p=>`${p.name} ${p.phone} ${p.goals}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))&&(filter==='all'||p.status===filter||(filter==='attention'&&(metricMap.get(p.id)!.contactDue||metricMap.get(p.id)!.overdue.length>0)))).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  const upcoming=entries.filter(e=>e.kind==='consultation'&&e.status==='scheduled'&&Date.parse(e.occurred_at)>=now&&patients.find(p=>p.id===e.patient_id)?.status==='active').sort((a,b)=>Date.parse(a.occurred_at)-Date.parse(b.occurred_at)).slice(0,4);
  const text=current?patientSummary(current,entries,now):'';

  function editPatient(patient?:Patient){setEditingId(patient?.id||'');setEditor(patient?{name:patient.name,phone:patient.phone,start_date:patient.start_date,end_date:patient.end_date,status:patient.status,goals:patient.goals,notes:patient.notes,planned_consultations:patient.planned_consultations,contact_interval_days:patient.contact_interval_days,source_session_id:patient.source_session_id}:emptyPatient());setModalError('');}
  function editEntry(kind:PatientEntry['kind'],entry?:PatientEntry){setEventId(entry?.id||'');setEventEditor(entry?{kind:entry.kind,title:entry.title,occurred_at:localInput(entry.occurred_at),status:entry.status,notes:entry.notes}:emptyEntry(kind));setModalError('');}
  function closeEditor(){if(busy)return;if(!window.confirm('Fechar sem salvar este formulário?'))return;setEditor(null);setEventEditor(null);}
  async function savePatient(event:FormEvent){
    event.preventDefault();if(!editor||busy)return;setBusy(true);setModalError('');
    try{
      const payload={...editor,name:editor.name.trim(),phone:editor.phone.trim(),end_date:editor.end_date||null,updated_at:new Date().toISOString()};
      const result=editingId?await client.from('patients').update(payload).eq('id',editingId).select().single():await client.from('patients').insert(payload).select().single();
      if(result.error)throw result.error;
      setPatients(rows=>[...rows.filter(p=>p.id!==result.data.id),result.data]);setSelected(result.data.id);setEditor(null);setNotice('Dados do paciente salvos.');
    }catch(e){setModalError((e as {code?:string}).code==='23505'?'Este formulário já está vinculado a um paciente. Feche e atualize a lista.':'Não foi possível salvar. Confira os campos e tente novamente.');}
    finally{setBusy(false);}
  }
  async function saveEntry(event:FormEvent){
    event.preventDefault();if(!eventEditor||!current||busy)return;
    if(eventEditor.status==='completed'&&new Date(eventEditor.occurred_at).getTime()>Date.now()){setModalError('Um registro realizado precisa ter uma data de hoje ou anterior. Para o futuro, use Agendado.');return;}
    setBusy(true);setModalError('');
    try{
      const payload={...eventEditor,title:eventEditor.title.trim(),occurred_at:new Date(eventEditor.occurred_at).toISOString(),patient_id:current.id,updated_at:new Date().toISOString()};
      const result=eventId?await client.from('patient_entries').update(payload).eq('id',eventId).eq('patient_id',current.id).select().single():await client.from('patient_entries').insert(payload).select().single();
      if(result.error)throw result.error;
      setEntries(rows=>[...rows.filter(e=>e.id!==result.data.id),result.data]);setEventEditor(null);setNow(Date.now());setNotice('Registro salvo na trajetória do paciente.');
    }catch{setModalError('Não foi possível salvar o registro. Seu texto continua aqui; tente novamente.');}finally{setBusy(false);}
  }
  async function remove(){
    if(!removal||busy)return;setBusy(true);setModalError('');
    try{
      const result=await client.from(removal.kind==='patient'?'patients':'patient_entries').delete().eq('id',removal.id).select('id').single();
      if(result.error)throw result.error;
      if(removal.kind==='patient'){setPatients(rows=>rows.filter(p=>p.id!==removal.id));setEntries(rows=>rows.filter(e=>e.patient_id!==removal.id));setSelected('');}
      else setEntries(rows=>rows.filter(e=>e.id!==removal.id));
      setRemoval(null);setNotice('Registro excluído.');
    }catch{setModalError('Não foi possível excluir. Tente novamente.');}finally{setBusy(false);}
  }
  async function copySummary(){try{await navigator.clipboard.writeText(text);setNotice('Resumo copiado.');}catch{setNotice('Não foi possível copiar automaticamente. Selecione o resumo e copie manualmente.');}}

  return <div className={s.workspace}>
    <header className={s.heading}><div><p className={s.eyebrow}>Cuidado próximo · Vitória Serafim</p><h1>{current?current.name:'Pacientes'}</h1><p>{current?'Uma visão completa de cada etapa do acompanhamento.':'Da primeira consulta ao próximo passo, tudo no mesmo lugar.'}</p></div><div className={s.actions}>{current?<><button onClick={()=>{setSelected('');setNotice('');}}>← Todos os pacientes</button><button className={s.primary} onClick={()=>{setSummary(true);setNotice('');}}>✧ Resumo do paciente</button></>:<><button disabled={loading} onClick={()=>void load()}>Atualizar</button><button className={s.primary} onClick={()=>editPatient()}>+ Novo paciente</button></>}</div></header>
    {notice&&<div className={s.notice} role="status">{notice}</div>}{error&&<div className={s.error} role="alert">{error} <button onClick={()=>void load()}>Tentar novamente</button></div>}
    {loading?<div className={s.empty} role="status">Carregando acompanhamentos…</div>:current&&metrics?<>
      <div className={s.profileStrip}><span className={s.avatar}>{current.name.split(' ').slice(0,2).map(w=>w[0]).join('')}</span><div><span className={`${s.badge} ${current.status==='active'?s.green:''}`}>{statusLabels[current.status]}</span><p>{current.phone||'Telefone não informado'} · Início em {dateLabel(current.start_date)}{current.end_date?` · Término previsto em ${dateLabel(current.end_date)}`:''}</p></div><button onClick={()=>editPatient(current)}>Editar cadastro</button></div>
      <section className={s.stats}><article><span>Consultas realizadas</span><strong>{metrics.count}<small> / {current.planned_consultations}</small></strong><div className={s.progress}><i style={{width:`${metrics.progress}%`}}/></div></article><article><span>Próxima consulta</span><strong className={s.date}>{metrics.next?dateLabel(metrics.next.occurred_at,true):'A agendar'}</strong><small>{metrics.next?.title||'Planeje o próximo encontro'}</small></article><article><span>Último contato</span><strong className={s.date}>{metrics.lastContact?dateLabel(metrics.lastContact.occurred_at):'Sem registro'}</strong><small>{metrics.lastContact?`Há ${metrics.daysWithoutContact} dia(s) · inclui consultas`:'Registre os contatos realizados'}</small></article><article><span>Última alteração de dieta</span><strong className={s.date}>{metrics.lastDiet?dateLabel(metrics.lastDiet.occurred_at):'Sem registro'}</strong><small>{metrics.lastDiet?.title||'Acompanhe cada ajuste'}</small></article></section>
      {(metrics.contactDue||metrics.overdue.length>0)&&<div className={s.attention}><strong>Próximos cuidados</strong>{metrics.contactDue&&<p>{metrics.daysWithoutContact} dias {metrics.lastContact?'desde o último contato':'desde o início, sem contato registrado'}. O intervalo definido é de {current.contact_interval_days} dias.</p>}{metrics.overdue.length>0&&<p>{metrics.overdue.length} agendamento(s) com data passada. Confirme a realização ou reagende na linha do tempo.</p>}</div>}
      <div className={s.detailGrid}><section className={s.card}><div className={s.sectionHeading}><div><p className={s.eyebrow}>Cada encontro importa</p><h2>Trajetória do paciente</h2></div><select aria-label="Filtrar trajetória" value={timelineFilter} onChange={e=>setTimelineFilter(e.target.value)}><option value="all">Todos os registros</option>{Object.entries(kindLabels).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></div><div className={s.quickActions}>{Object.entries(kindLabels).map(([key,label])=><button key={key} onClick={()=>editEntry(key as PatientEntry['kind'])}>+ {label}</button>)}</div>
        <ol className={s.timeline}>{metrics.history.filter(e=>timelineFilter==='all'||e.kind===timelineFilter).sort((a,b)=>Date.parse(b.occurred_at)-Date.parse(a.occurred_at)).map(entry=><li key={entry.id} className={entry.status==='cancelled'?s.cancelled:''}><div className={s.dot}>{entry.kind==='consultation'?'◷':entry.kind==='contact'?'↗':entry.kind==='diet'?'≋':'·'}</div><article><div className={s.entryMeta}><span>{kindLabels[entry.kind]}</span><time>{dateLabel(entry.occurred_at,true)}</time><span className={`${s.badge} ${entry.status==='completed'?s.green:entry.status==='scheduled'?s.gold:''}`}>{entry.status==='scheduled'&&Date.parse(entry.occurred_at)<now?'Confirmar realização':entryStatusLabels[entry.status]}</span></div><h3>{entry.title}</h3>{entry.notes&&<p className={s.prewrap}>{entry.notes}</p>}<div className={s.entryActions}><button onClick={()=>editEntry(entry.kind,entry)}>{entry.status==='scheduled'?'Editar / concluir':'Editar'}</button><button className={s.dangerText} onClick={()=>{setRemoval({kind:'entry',id:entry.id,name:entry.title});setModalError('');}}>Excluir</button></div></article></li>)}<li><div className={s.dot}>✓</div><article><time>{dateLabel(current.start_date)}</time><h3>Início do acompanhamento</h3><p>Um novo capítulo de cuidado.</p></article></li></ol>
      </section><aside className={s.sideCards}><section className={s.card}><p className={s.eyebrow}>Direção do cuidado</p><h2>Objetivos</h2><p className={s.prewrap}>{current.goals||'Adicione os objetivos combinados com o paciente em Editar cadastro.'}</p></section><section className={s.card}><h2>Observações importantes</h2><p className={s.prewrap}>{current.notes||'Use este espaço para registrar preferências e pontos de atenção do acompanhamento.'}</p></section><section className={s.card}><h2>Ritmo do acompanhamento</h2><p>Revisar contato a cada <b>{current.contact_interval_days} dias</b>.</p><p>Os lembretes aparecem neste painel. Marcar uma consulta como realizada também atualiza o último contato.</p></section><button className={s.dangerText} onClick={()=>{setRemoval({kind:'patient',id:current.id,name:current.name});setModalError('');}}>Excluir paciente e trajetória</button></aside></div>
    </>:<>
      <section className={s.stats}><article><span>Em acompanhamento</span><strong>{patients.filter(p=>p.status==='active').length}</strong><small>Pacientes ativos</small></article><article><span>Consultas nos próximos 7 dias</span><strong>{entries.filter(e=>e.kind==='consultation'&&e.status==='scheduled'&&Date.parse(e.occurred_at)>=now&&Date.parse(e.occurred_at)<now+7*86400000&&patients.find(p=>p.id===e.patient_id)?.status==='active').length}</strong><small>Agenda de pacientes ativos</small></article><article><span>Precisam de atenção</span><strong>{patients.filter(p=>p.status==='active'&&(metricMap.get(p.id)!.contactDue||metricMap.get(p.id)!.overdue.length)).length}</strong><small>Contato ou agendamento pendente</small></article><article><span>Acompanhamentos concluídos</span><strong>{patients.filter(p=>p.status==='completed').length}</strong><small>Histórico preservado</small></article></section>
      <div className={s.listGrid}><section className={s.card}><div className={s.sectionHeading}><div><p className={s.eyebrow}>Seu consultório</p><h2>Todos os pacientes <small>({shown.length})</small></h2></div></div><div className={s.searchBar}><input aria-label="Buscar paciente" placeholder="Buscar nome, telefone ou objetivo…" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="Filtrar pacientes" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Todos os pacientes</option><option value="active">Em acompanhamento</option><option value="attention">Precisam de atenção</option><option value="paused">Pausados</option><option value="completed">Concluídos</option></select></div>
        {shown.length?<div className={s.patientList}>{shown.map(p=>{const m=metricMap.get(p.id)!;return <button className={s.patientRow} key={p.id} onClick={()=>{setSelected(p.id);setNotice('');setTimelineFilter('all');}}><span className={s.avatar}>{p.name.split(' ').slice(0,2).map(w=>w[0]).join('')}</span><span className={s.patientIdentity}><strong>{p.name}</strong><small>{statusLabels[p.status]} · Desde {dateLabel(p.start_date)}</small></span><span className={s.patientProgress}><b>{m.count}/{p.planned_consultations}</b><small>consultas</small></span><span className={s.patientNext}>{p.status==='active'&&(m.contactDue||m.overdue.length)?<span className={`${s.badge} ${s.gold}`}>Atenção</span>:<small>{m.next?`Próxima: ${dateLabel(m.next.occurred_at)}`:'Sem próxima consulta'}</small>}<span aria-hidden="true"> →</span></span></button>;})}</div>:<div className={s.empty}><span className={s.emptyIcon}>✧</span><h3>{patients.length?'Nenhum paciente neste filtro':'O cuidado começa aqui'}</h3><p>{patients.length?'Tente outro nome ou altere o filtro.':'Cadastre seu primeiro paciente ou abra um contato do formulário e clique em Iniciar acompanhamento.'}</p>{!patients.length&&<button className={s.primary} onClick={()=>editPatient()}>Cadastrar paciente</button>}</div>}
      </section><aside className={s.card}><p className={s.eyebrow}>Prepare o próximo encontro</p><h2>Próximas consultas</h2>{upcoming.length?upcoming.map(e=><button key={e.id} className={s.agendaItem} onClick={()=>{setSelected(e.patient_id);setNotice('');}}><span className={s.calendarDate}>{new Date(e.occurred_at).getDate()}<small>{new Date(e.occurred_at).toLocaleDateString('pt-BR',{month:'short'})}</small></span><span><strong>{patients.find(p=>p.id===e.patient_id)?.name}</strong><small>{dateLabel(e.occurred_at,true)}</small><small>{e.title}</small></span></button>):<p className={s.muted}>As próximas consultas dos pacientes ativos aparecerão aqui assim que forem agendadas.</p>}</aside></div>
    </>}

    {editor&&<Modal title={editingId?'Editar paciente':'Novo acompanhamento'} subtitle="Dados e objetivos" onClose={closeEditor} busy={busy}><form className={s.form} onSubmit={savePatient}><div className={s.formGrid}><label>Nome completo<input required minLength={2} maxLength={160} value={editor.name} onChange={e=>setEditor({...editor,name:e.target.value})}/></label><label>WhatsApp<input type="tel" maxLength={40} value={editor.phone} onChange={e=>setEditor({...editor,phone:e.target.value})}/></label><label>Data de início<input required type="date" value={editor.start_date} onChange={e=>setEditor({...editor,start_date:e.target.value})}/></label><label>Término previsto (opcional)<input type="date" min={editor.start_date} value={editor.end_date||''} onChange={e=>setEditor({...editor,end_date:e.target.value||null})}/></label><label>Situação<select value={editor.status} onChange={e=>setEditor({...editor,status:e.target.value as Patient['status']})}>{Object.entries(statusLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>Consultas previstas<input required type="number" min={1} max={100} value={editor.planned_consultations} onChange={e=>setEditor({...editor,planned_consultations:Number(e.target.value)})}/></label></div><label>Objetivos combinados<textarea maxLength={5000} rows={3} value={editor.goals} onChange={e=>setEditor({...editor,goals:e.target.value})} placeholder="O que vocês pretendem trabalhar neste acompanhamento?"/></label><label>Observações importantes<textarea maxLength={10000} rows={3} value={editor.notes} onChange={e=>setEditor({...editor,notes:e.target.value})}/></label><label>Lembrar de revisar o contato a cada (dias)<input required type="number" min={1} max={365} value={editor.contact_interval_days} onChange={e=>setEditor({...editor,contact_interval_days:Number(e.target.value)})}/></label>{modalError&&<p className={s.error} role="alert">{modalError}</p>}<footer className={s.actions}><button type="button" disabled={busy} onClick={closeEditor}>Cancelar</button><button className={s.primary} disabled={busy} type="submit">{busy?'Salvando…':'Salvar paciente'}</button></footer></form></Modal>}
    {eventEditor&&<Modal title={eventId?'Editar registro':'Registrar na trajetória'} subtitle={current?.name} onClose={closeEditor} busy={busy}><form className={s.form} onSubmit={saveEntry}><div className={s.formGrid}><label>Tipo<select value={eventEditor.kind} onChange={e=>setEventEditor({...eventEditor,kind:e.target.value as PatientEntry['kind']})}>{Object.entries(kindLabels).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label><label>Situação<select value={eventEditor.status} onChange={e=>setEventEditor({...eventEditor,status:e.target.value as PatientEntry['status']})}>{Object.entries(entryStatusLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></div><label>Título<input required minLength={2} maxLength={160} value={eventEditor.title} onChange={e=>setEventEditor({...eventEditor,title:e.target.value})}/></label><label>Data e horário (seu horário local)<input required type="datetime-local" value={eventEditor.occurred_at} onChange={e=>setEventEditor({...eventEditor,occurred_at:e.target.value})}/></label><label>{eventEditor.kind==='diet'?'O que foi alterado na dieta?':'Detalhes e próximos passos'}<textarea rows={6} maxLength={10000} value={eventEditor.notes} onChange={e=>setEventEditor({...eventEditor,notes:e.target.value})} placeholder={eventEditor.kind==='contact'?'Canal, assunto conversado e o que ficou combinado…':'Registre o que é importante para o próximo encontro…'}/></label>{modalError&&<p className={s.error} role="alert">{modalError}</p>}<footer className={s.actions}><button type="button" disabled={busy} onClick={closeEditor}>Cancelar</button><button type="submit" disabled={busy} className={s.primary}>{busy?'Salvando…':'Salvar registro'}</button></footer></form></Modal>}
    {summary&&current&&<Modal title="Resumo do paciente" subtitle={current.name} onClose={()=>setSummary(false)} wide><p className={s.muted}>Consolidado dos registros salvos. Nenhum dado clínico é inferido.</p><textarea className={s.summary} aria-label="Resumo do acompanhamento" readOnly value={text}/><div className={s.actions}><button className={s.primary} onClick={copySummary}>Copiar resumo</button><button onClick={()=>setSummary(false)}>Voltar ao acompanhamento</button></div>{notice&&<p role="status">{notice}</p>}</Modal>}
    {removal&&<Modal title={removal.kind==='patient'?'Excluir paciente?':'Excluir registro?'} onClose={()=>{if(!busy)setRemoval(null);}} busy={busy}><p>Você está excluindo <strong>{removal.name}</strong>.</p><p>{removal.kind==='patient'?'O cadastro e toda a trajetória deste paciente serão apagados permanentemente. O formulário de origem permanece no painel de formulários.':'Este registro será apagado permanentemente e deixará de aparecer no resumo e nos indicadores.'}</p>{modalError&&<p role="alert" className={s.error}>{modalError}</p>}<div className={s.actions}><button disabled={busy} onClick={()=>setRemoval(null)}>Cancelar</button><button disabled={busy} className={s.danger} onClick={remove}>{busy?'Excluindo…':'Confirmar exclusão'}</button></div></Modal>}
  </div>;
}
