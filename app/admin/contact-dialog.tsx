"use client";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { answerLabels, collectAnswers, ContactEvent, ContactLead, displayAnswer, firstContact, suggestedPhone, whatsappNumber } from "../../lib/contact-message";
import styles from "./admin.module.css";

export type MessageDraft = { text: string; sender: string; phone: string };
export default function ContactDialog({ id, name, client, onClose, children, savedDraft, onDraftChange, saving }: {
  id: string; name: string; client: SupabaseClient; onClose: () => void; children: ReactNode;
  savedDraft?: MessageDraft; onDraftChange: (draft: MessageDraft) => void; saving: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [history, setHistory] = useState<ContactEvent[]>([]);
  const [lead, setLead] = useState<ContactLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [notice, setNotice] = useState("");
  const [sender, setSender] = useState(savedDraft?.sender || "a equipe de nutrição");
  const [text, setText] = useState(savedDraft?.text || "");
  const [phone, setPhone] = useState(savedDraft?.phone || "");
  const initialized = useRef(false);

  useEffect(() => {
    const element = dialog.current!;
    const trigger = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, []);

  useEffect(() => {
    let live = true;
    setLoading(true); setError("");
    void (async () => {
      try {
        const rows: ContactEvent[] = [];
        for (let offset = 0; ; offset += 1000) {
          const result = await client.from("funnel_events").select("session_id,event_name,step_key,answer,created_at,metadata").eq("session_id", id).order("created_at").order("id").range(offset, offset + 999);
          if (result.error) throw result.error;
          rows.push(...result.data);
          if (result.data.length < 1000) break;
        }
        const result = await client.from("leads_nutricionista").select("session_id,nome,whatsapp,criado_em,cidade,instagram,nivel_interesse,respostas").eq("session_id", id).maybeSingle();
        if (result.error) throw result.error;
        if (live) { setHistory(rows); setLead(result.data); }
      } catch { if (live) setError("Não foi possível carregar as respostas completas. Tente novamente antes de preparar o contato."); }
      finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, [client, id, retry]);

  const replies = useMemo(() => collectAnswers(history, lead), [history, lead]);
  const complete = !!lead || history.some(event => event.event_name === "completed");
  const demo = /^\[DEMO\]/i.test(name) || !!lead?.respostas?.demo || history.some(event => event.metadata?.demo === true);
  const suggestion = useMemo(() => firstContact(replies, complete, sender), [replies, complete, sender]);
  useEffect(() => {
    if (loading || error || initialized.current) return;
    initialized.current = true;
    if (!savedDraft) { setText(suggestion); setPhone(suggestedPhone(replies)); }
  }, [loading, error, savedDraft, suggestion, replies]);
  useEffect(() => {
    if (initialized.current) onDraftChange({ text, sender, phone });
  }, [text, sender, phone, onDraftChange]);
  const number = whatsappNumber(phone);

  async function copy() {
    try { await navigator.clipboard.writeText(text); setNotice("Mensagem copiada. Revise o destinatário antes de enviar."); }
    catch { textarea.current?.focus(); textarea.current?.select(); setNotice("Selecione e copie o texto manualmente; o navegador não permitiu a cópia automática."); }
  }
  return <dialog ref={dialog} className={styles.contactDialog} aria-labelledby="contact-dialog-title" onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}>
    <header className={styles.dialogHeader}>
      <div><p className={styles.eyebrow}>Respostas e primeiro contato</p><h2 id="contact-dialog-title">{name === "—" ? "Contato sem nome" : name}</h2><span>{loading ? "Carregando histórico completo…" : complete ? "Formulário concluído" : "Respostas parciais"}{demo ? " · Demonstração" : ""}</span></div>
      <button autoFocus type="button" disabled={saving} onClick={onClose} aria-label="Fechar respostas">Fechar ×</button>
    </header>
    <div className={styles.dialogBody}>
      {loading ? <p role="status">Buscando todas as respostas deste contato…</p> : error ? <div role="alert"><p>{error}</p><button onClick={() => setRetry(value => value + 1)}>Tentar novamente</button></div> : <>
        <div className={styles.dialogColumns}>
          <section className={styles.responseSummary}>
            <h3>O que a pessoa contou</h3>
            <p>Histórico completo deste formulário, independentemente do período do painel.</p>
            <dl>{Object.entries(answerLabels).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{displayAnswer(replies[key]) || "Não informado"}</dd></div>)}</dl>
          </section>
          <section className={styles.messageComposer}>
            <p className={styles.eyebrow}>Pronto para revisar</p><h3>Seu primeiro contato</h3>
            <p>Texto baseado nas respostas registradas. Ajuste à sua voz antes de enviar.</p>
            <label htmlFor="contact-sender">Quem se apresenta</label>
            <input id="contact-sender" value={sender} maxLength={100} onChange={event => { setSender(event.target.value); setNotice("Clique em Refazer sugestão para aplicar a nova apresentação."); }} />
            <label htmlFor="contact-message">Mensagem editável</label>
            <textarea id="contact-message" ref={textarea} value={text} onChange={event => setText(event.target.value)} rows={14} maxLength={6000} />
            <div className={styles.messageActions}>
              <button type="button" onClick={copy} disabled={!text.trim()}>Copiar mensagem</button>
              <button type="button" onClick={() => { if (text !== suggestion && !window.confirm("Substituir suas edições por uma nova sugestão?")) return; setText(suggestion); setNotice("Sugestão refeita com as respostas do contato."); }}>Refazer sugestão</button>
            </div>
            <label htmlFor="contact-phone">WhatsApp com código do país</label>
            <input id="contact-phone" type="tel" placeholder="+55 DDD e número" value={phone} onChange={event => setPhone(event.target.value)} />
            {demo ? <p>Contato fictício: abertura do WhatsApp desativada.</p> : !number ? <p>Confira o número com + e código do país para habilitar o WhatsApp.</p> : null}
            {!demo && number && text.trim() && <a className={styles.whatsappAction} target="_blank" rel="noopener noreferrer" href={`https://wa.me/${number}?text=${encodeURIComponent(text)}`}>Abrir no WhatsApp</a>}
            <p className={styles.composerHint}>O WhatsApp abre com o texto preenchido; você decide quando enviar. Abrir ou copiar não marca o contato como contatado. As edições ficam nesta página até você atualizar ou sair.</p>
            {notice && <p role="status">{notice}</p>}
          </section>
        </div>
        <details className={styles.historyDetails}><summary>Linha do tempo · {history.length} registros</summary>
          <ol>{history.map((event, index) => <li key={index}><time>{new Date(event.created_at).toLocaleString("pt-BR")}</time><strong>{answerLabels[event.step_key] || event.step_key}</strong> · {event.event_name === "answered" ? displayAnswer(event.answer) : event.event_name === "step_viewed" ? "Pergunta exibida" : event.event_name === "completed" ? "Envio concluído" : "Conversa iniciada"}</li>)}</ol>
        </details>
      </>}
      <section className={styles.followupEditor}><h3>Acompanhamento do contato</h3>{children}</section>
    </div>
  </dialog>;
}
