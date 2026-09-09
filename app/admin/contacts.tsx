"use client";
import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import styles from "./admin.module.css";

type Event = { session_id: string; event_name: string; step_key: string; answer: unknown; created_at: string };
type Lead = { session_id: string; nome: string; whatsapp: string; criado_em: string };
type RecordRow = { session_id: string; status: string; notes: string };
const labels: Record<string, string> = { inicio: "Início", nome: "Nome", sintomas: "Sintomas", tempo: "Há quanto tempo", tentou: "Tentativas anteriores", fora: "País", whatsapp: "WhatsApp", instagram: "Instagram", origem: "Origem", decisao: "Decisão", completed: "Concluído" };
const statuses = ["Novo", "Contatado", "Consulta agendada", "Não avançou"];
function answer(value: unknown) { return Array.isArray(value) ? value.join(", ") : value == null ? "—" : String(value); }

export default function Contacts({ events, leads, client }: { events: Event[]; leads: Lead[]; client: SupabaseClient }) {
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState("Novo");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let live = true;
    void (async () => {
      const rows: RecordRow[] = [];
      for (let offset = 0; ; offset += 1000) {
        const result = await client.from("contact_followups").select("session_id,status,notes").order("session_id").range(offset, offset + 999);
        if (result.error) { if (live) setMessage("Não foi possível carregar o acompanhamento. Atualize antes de editar."); return; }
        rows.push(...result.data);
        if (result.data.length < 1000) break;
      }
      if (live) setRecords(rows);
    })();
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => { live = false; clearInterval(timer); };
  }, [client]);
  const contacts = useMemo(() => {
    const groups = new Map<string, Event[]>();
    for (const event of events) groups.set(event.session_id, [...(groups.get(event.session_id) || []), event]);
    for (const lead of leads) if (!groups.has(lead.session_id)) groups.set(lead.session_id, []);
    return Array.from(groups, ([id, history]) => {
      const lead = leads.find(row => row.session_id === id);
      const replies = Object.fromEntries(history.filter(e => e.event_name === "answered").map(e => [e.step_key, e.answer]));
      const last = history[history.length - 1];
      const complete = !!lead || history.some(e => e.event_name === "completed");
      const lastAt = last?.created_at || lead!.criado_em;
      return { id, history, name: lead?.nome || answer(replies.nome), phone: lead?.whatsapp || (typeof replies.whatsapp === "string" ? replies.whatsapp : ""), lastAt, step: last?.step_key || "completed", state: complete ? "Concluído" : now - Date.parse(lastAt) >= 1800000 ? "Possível abandono" : "Em andamento", record: records.find(r => r.session_id === id) };
    }).sort((a, b) => Date.parse(b.lastAt) - Date.parse(a.lastAt));
  }, [events, leads, records, now]);
  const current = contacts.find(c => c.id === selected);
  async function save() {
    setSaving(true); setMessage("");
    try {
      const result = await client.from("contact_followups").upsert({ session_id: selected, status, notes, updated_at: new Date().toISOString() }).select("session_id,status,notes").single();
      if (result.error) throw result.error;
      setRecords(rows => [...rows.filter(r => r.session_id !== selected), result.data]);
      setMessage("Acompanhamento salvo.");
    } catch { setMessage("Não foi possível salvar. Suas alterações continuam aqui; tente novamente."); }
    finally { setSaving(false); }
  }
  return <section className={styles.panel}>
    <h2>Todos os contatos e histórico</h2>
    <p>Inclui respostas parciais. Possível abandono: sem nova resposta há pelo menos 30 minutos. Uma nova resposta reabre o andamento.</p>
    <div className={styles.tableHeader}>
      <input aria-label="Buscar contato" placeholder="Nome ou WhatsApp" value={query} onChange={e => setQuery(e.target.value)} />
      <select aria-label="Filtrar andamento" value={filter} onChange={e => setFilter(e.target.value)}>{["Todos", "Em andamento", "Possível abandono", "Concluído", ...statuses].map(s => <option key={s}>{s}</option>)}</select>
    </div>
    {message && <p role="status">{message}</p>}
    <div className={styles.tableWrap}><table><thead><tr><th>Contato</th><th>Formulário</th><th>Última etapa</th><th>Atendimento</th><th>Histórico</th></tr></thead><tbody>
      {contacts.filter(c => `${c.name} ${c.phone}`.toLowerCase().includes(query.toLowerCase()) && (filter === "Todos" || c.state === filter || (c.record?.status || "Novo") === filter)).map(c => <tr key={c.id}><td>{c.name === "—" ? "Nome não informado" : c.name}<span>{c.phone}</span></td><td>{c.state}</td><td>{labels[c.step] || c.step}<span>{new Date(c.lastAt).toLocaleString("pt-BR")}</span></td><td>{c.record?.status || "Novo"}</td><td><button disabled={saving} onClick={() => {setSelected(c.id); setStatus(c.record?.status || "Novo"); setNotes(c.record?.notes || ""); setMessage("");}}>Abrir</button></td></tr>)}
    </tbody></table></div>
    {!contacts.length && <p>Nenhum contato neste período.</p>}
    {current && <section className={styles.panel} aria-label="Detalhes do contato">
      <h3>{current.name === "—" ? "Contato sem nome" : current.name}</h3>
      <p>Histórico disponível no período selecionado. Se faltar o início, selecione todo o período.</p>
      <ol>{current.history.map((event, index) => <li key={index}><time>{new Date(event.created_at).toLocaleString("pt-BR")}</time> · {labels[event.step_key] || event.step_key} · {event.event_name === "answered" ? answer(event.answer) : event.event_name === "step_viewed" ? "Pergunta exibida" : event.event_name === "completed" ? "Envio concluído" : "Conversa iniciada"}</li>)}</ol>
      <label>Etapa do atendimento <select value={status} onChange={e => setStatus(e.target.value)}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label>
      <label style={{ display: "block", marginTop: 16 }}>Observações<textarea style={{ display: "block", width: "100%", minHeight: 100 }} maxLength={5000} value={notes} onChange={e => setNotes(e.target.value)} /></label>
      <button disabled={saving} onClick={save}>{saving ? "Salvando..." : "Salvar acompanhamento"}</button>{" "}
      <button disabled={saving} onClick={() => setSelected("")}>Fechar</button>
    </section>}
  </section>;
}
