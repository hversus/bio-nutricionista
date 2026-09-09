"use client";

import Image from "next/image";
import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";

type Step = { message: string; options?: string[]; multi?: boolean; field?: boolean };
type Answer = string | string[];

const steps: Step[] = [
  { message: "O que mais te trouxe até aqui hoje?", options: ["Emagrecimento", "Saúde intestinal", "Compulsão alimentar", "Reeducação alimentar", "Hipertrofia", "Nutrição esportiva", "Outro"] },
  { message: "Quais dessas dificuldades aparecem com mais frequência?", options: ["Inchaço", "Gases", "Prisão de ventre", "Cansaço", "Ansiedade com comida", "Dificuldade de seguir uma rotina", "Efeito sanfona", "Intestino irregular", "Nenhuma dessas"], multi: true },
  { message: "Há quanto tempo isso te incomoda?", options: ["Menos de 6 meses", "De 6 meses a 1 ano", "De 1 a 3 anos", "Mais de 3 anos", "Há tanto tempo que já considerei normal"] },
  { message: "O que você já tentou antes?", options: ["Dieta por conta própria", "Consulta com nutricionista", "Remédio para emagrecer", "Academia ou treino", "Cortar glúten, lactose ou açúcar", "Probióticos ou suplementos", "Protocolos da internet", "Ainda não tentei nada"], multi: true },
  { message: "Qual opção combina mais com o seu momento?", options: ["Quero agendar uma consulta", "Quero entender como funciona", "Quero saber valores", "Ainda estou pesquisando"] },
  { message: "Para eu te receber melhor, como você se chama?", field: true },
  { message: "Qual WhatsApp é melhor para falar com você?", field: true },
  { message: "Em qual cidade você está?", field: true },
  { message: "Se quiser, deixe seu Instagram.", field: true },
  { message: "Qual o melhor horário para eu te chamar?", field: true },
];

const iconProps = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, strokeWidth: 1.8 };

function Icon({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return <svg aria-hidden="true" height={size} viewBox="0 0 24 24" width={size} {...iconProps}>{children}</svg>;
}

function ChatHeader({ typing }: { typing: boolean }) {
  return (
    <header className="chat-header">
      <button aria-label="Voltar" className="header-action header-back" type="button"><Icon size={25}><path d="m15 18-6-6 6-6" /></Icon></button>
      <Image alt="Foto de perfil de Luana Turque" className="profile-photo" height={42} priority src="/profile.jpg" width={42} />
      <div className="profile-copy"><strong>Luana Turque</strong><span>{typing ? "digitando..." : "online"}</span></div>
      <div className="header-actions">
        <button aria-label="Videochamada" className="header-action" type="button"><Icon><rect height="12" rx="2" width="14" x="2.5" y="6" /><path d="m16.5 10 4-2.5v9l-4-2.5" /></Icon></button>
        <button aria-label="Ligação" className="header-action" type="button"><Icon><path d="M7.1 3.5 9.5 7l-2 2a15.5 15.5 0 0 0 7.5 7.5l2-2 3.5 2.4-.8 3a2 2 0 0 1-2 1.5C9.4 20.8 3.2 14.6 2.6 6.3a2 2 0 0 1 1.5-2Z" /></Icon></button>
        <button aria-label="Mais opções" className="header-action" type="button"><Icon><circle cx="12" cy="5" fill="currentColor" r="1" stroke="none" /><circle cx="12" cy="12" fill="currentColor" r="1" stroke="none" /><circle cx="12" cy="19" fill="currentColor" r="1" stroke="none" /></Icon></button>
      </div>
    </header>
  );
}

function PrivacyNotice() {
  return (
    <div className="privacy-notice">
      <Icon size={12}><rect height="8" rx="1" width="8" x="8" y="11" /><path d="M10 11V8.8a2 2 0 0 1 4 0V11" /></Icon>
      <span>Suas respostas são confidenciais e só a Luana lê. Luana Turque<br />Nutrição · CRN-4 19100494.</span>
    </div>
  );
}

function MessageBubble({ children, mine = false }: { children: ReactNode; mine?: boolean }) {
  return <div className={`message-bubble ${mine ? "message-mine" : "message-luana"}`}>{children}</div>;
}

export default function Home() {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [messages, setMessages] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(true);
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const scrollArea = useRef<HTMLDivElement>(null);
  const step = steps[stepIndex];
  const selected = (answers[stepIndex] as string[] | undefined) ?? [];

  useEffect(() => {
    const timer = window.setTimeout(() => setTyping(false), 700);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    scrollArea.current?.scrollTo({ top: scrollArea.current.scrollHeight, behavior: "smooth" });
  }, [messages, stepIndex, typing]);

  function advance(value: string) {
    if (!step) return;
    const answer = step.multi ? selected.join(", ") : value.trim();
    if (!answer) return;
    setAnswers((current) => ({ ...current, [stepIndex]: step.multi ? selected : answer }));
    setMessages((current) => [...current, answer]);
    setDraft("");
    setError("");
    setTyping(true);
    window.setTimeout(() => { setStepIndex((current) => current + 1); setTyping(false); }, 650);
  }

  function selectOption(option: string) {
    if (!step) return;
    if (!step.multi) return advance(option);
    setAnswers((current) => {
      const currentSelection = (current[stepIndex] as string[] | undefined) ?? [];
      return { ...current, [stepIndex]: currentSelection.includes(option) ? currentSelection.filter((item) => item !== option) : [...currentSelection, option] };
    });
  }

  function handleComposerSubmit(event: FormEvent) {
    event.preventDefault();
    if (step?.field) advance(draft);
  }

  async function submitLead() {
    if (!consent) return setError("Marque o consentimento para concluir.");
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: answers[5], whatsapp: answers[6], cidade: answers[7], instagram: answers[8], horario: answers[9],
          objetivo: answers[0], sintomas: answers[1], tempo: answers[2], tentativas: answers[3],
          nivel_interesse: answers[4], consentimento: true,
        }),
      });
      if (!response.ok) throw new Error("Falha ao enviar");
      setSent(true);
    } catch {
      setError("Não consegui enviar agora. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return <main className="app-shell"><div className="phone-frame"><ChatHeader typing={false} /><section className="chat-wallpaper success-screen"><MessageBubble><strong>Mensagem enviada 💚</strong><span>Recebi suas respostas e vou falar com você com carinho.</span></MessageBubble></section></div></main>;
  }

  return (
    <main className="app-shell">
      <div className="phone-frame">
        <ChatHeader typing={typing} />
        <section className="chat-wallpaper">
          <div className="conversation" ref={scrollArea}>
            <div className="day-pill">HOJE</div>
            <PrivacyNotice />
            <div className="message-list" aria-live="polite">
              {messages.map((message, index) => (
                <div className="exchange" key={`${message}-${index}`}>
                  <MessageBubble>{steps[index].message}</MessageBubble>
                  <MessageBubble mine>{message}</MessageBubble>
                </div>
              ))}
              {typing && <div className="typing-bubble"><i /><i /><i /></div>}
              {!typing && step && (
                <div className="current-step">
                  <MessageBubble>{step.message}</MessageBubble>
                  {step.options && (
                    <div className="option-grid">
                      {step.options.map((option) => {
                        const active = step.multi && selected.includes(option);
                        return <button aria-pressed={active} className={`option-button ${active ? "option-selected" : ""}`} key={option} onClick={() => selectOption(option)} type="button">{active && <span className="option-check">✓</span>}{option}</button>;
                      })}
                      {step.multi && <button className="confirm-options" disabled={selected.length === 0} onClick={() => advance("")} type="button">Enviar respostas</button>}
                    </div>
                  )}
                </div>
              )}
              {!typing && !step && (
                <div className="consent-card">
                  <MessageBubble>Obrigada por me contar tudo isso. Posso usar suas respostas para organizar nosso primeiro contato?<small>Este formulário não substitui consulta, não realiza diagnóstico e não garante resultado.</small></MessageBubble>
                  <label className="consent-label"><input checked={consent} onChange={(event) => setConsent(event.target.checked)} type="checkbox" /><span>Concordo que minhas respostas sejam usadas apenas para triagem inicial e organização do contato profissional.</span></label>
                  {error && <p className="form-error">{error}</p>}
                  <button className="confirm-options" disabled={sending} onClick={submitLead} type="button">{sending ? "Enviando..." : "Enviar mensagem"}</button>
                </div>
              )}
            </div>
          </div>
          <form className="composer" onSubmit={handleComposerSubmit}>
            <button aria-label="Emoji" className="composer-icon" type="button"><Icon size={23}><circle cx="12" cy="12" r="9" /><circle cx="9" cy="10" fill="currentColor" r=".8" stroke="none" /><circle cx="15" cy="10" fill="currentColor" r=".8" stroke="none" /><path d="M8.5 14.2c1.8 1.8 5.2 1.8 7 0" /></Icon></button>
            <input aria-label="Sua resposta" disabled={!step?.field || typing} onChange={(event) => setDraft(event.target.value)} placeholder={step?.field ? "Digite uma mensagem" : "Toca numa opção acima"} value={draft} />
            <button aria-label="Enviar" className="send-button" disabled={!step?.field || !draft.trim()} type="submit"><Icon size={23}><path d="m4 4 17 8-17 8 3-8Z" /><path d="M7 12h14" /></Icon></button>
          </form>
        </section>
      </div>
    </main>
  );
}
