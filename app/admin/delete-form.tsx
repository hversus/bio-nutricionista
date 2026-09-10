"use client";
import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import Modal from './modal';
import s from './patients.module.css';
export default function DeleteForm({client,sessionIds,name,onDeleted,onClose}:{client:SupabaseClient;sessionIds:string[];name:string;onDeleted:()=>void;onClose:()=>void}) {
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const plural=sessionIds.length>1;
  async function remove(){
    if(busy)return;setBusy(true);setError('');
    try{const {error}=await client.rpc('delete_form_sessions',{target_sessions:sessionIds});if(error)throw error;onDeleted();}
    catch{setError('Não foi possível excluir. Tente novamente.');setBusy(false);}
  }
  return <Modal title={plural?'Excluir formulários e respostas?':'Excluir formulário e respostas?'} subtitle={name==='—'?'Contato sem nome':name} onClose={onClose} busy={busy}><p>Esta ação apaga permanentemente {plural?'todas as respostas dos formulários selecionados':'todas as respostas deste formulário'}, o histórico da conversa e as observações do contato, incluindo dados fora do período selecionado.</p><p>Os indicadores serão recalculados. Se houver paciente cadastrado, o cadastro e a trajetória de atendimento serão mantidos na aba Pacientes.</p>{error&&<p role="alert" className={s.error}>{error}</p>}<div className={s.actions}><button disabled={busy} onClick={onClose}>Cancelar</button><button disabled={busy} className={s.danger} onClick={remove}>{busy?'Excluindo…':plural?`Excluir ${sessionIds.length} formulários`:'Excluir formulário e respostas'}</button></div></Modal>;
}
