"use client";

import Image from "next/image";
import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type Stage =
  | "intro"
  | "nome"
  | "sintomas"
  | "tempo"
  | "tentou"
  | "fora"
  | "whatsapp"
  | "instagram"
  | "origem"
  | "decisao"
  | "fim";
type Picker = "sintomas" | "tempo" | "tentou" | null;
type Message = {
  id: number;
  from: "lu" | "voce";
  content: ReactNode;
  first?: boolean;
};
type Lead = {
  nome: string;
  whatsapp: string;
  instagram: string;
  origem: string;
  sintomas: string[];
  tempo: string;
  tentou: string;
  fora: boolean | null;
  decisao: string;
};

const initialLead: Lead = {
  nome: "",
  whatsapp: "",
  instagram: "",
  origem: "",
  sintomas: [],
  tempo: "",
  tentou: "",
  fora: null,
  decisao: "",
};
const draftKey = "vitoria_bio_draft_v1";
const sessionStorageKey = "vitoria_bio_session_v1";
const contactWhatsapp = "559991431867";
const stages: Stage[] = ["nome", "sintomas", "tempo", "tentou", "fora", "whatsapp", "instagram", "origem", "decisao"];
const questions: Record<string, string> = {
  nome: "Como você se chama?", sintomas: "O que você está sentindo?",
  tempo: "Há quanto tempo você sente isso?", tentou: "O que você já tentou até aqui?",
  fora: "Você mora no Brasil?", whatsapp: "Qual é o seu WhatsApp, com código do país e DDD?",
  instagram: "Qual é o seu Instagram?", origem: "Por onde você me achou?",
  decisao: "O que você prefere?",
};

function trackFunnel(
  sessionId: string,
  eventName: "started" | "answered" | "step_viewed",
  stepKey: string,
  stepIndex: number,
  answer?: unknown,
) {
  if (!sessionId) return;
  void fetch("/api/funnel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      session_id: sessionId,
      event_name: eventName,
      step_key: stepKey,
      step_index: stepIndex,
      answer: answer ?? null,
      metadata: {
        path: window.location.pathname,
        referrer: document.referrer || null,
        utm: Object.fromEntries(Array.from(new URLSearchParams(window.location.search).entries()).filter(([key]) => ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].includes(key))),
      },
    }),
  }).catch(() => undefined);
}

const symptoms = [
  { id: "Dificuldade para emagrecer", label: "Dificuldade para emagrecer" },
  { id: "Fome frequente", label: "Fome frequente" },
  { id: "Vontade/compulsão por doces", label: "Vontade/compulsão por doces" },
  { id: "Sono ou cansaço depois das refeições", label: "Sono ou cansaço depois das refeições" },
  { id: "Falta de energia ao longo do dia", label: "Falta de energia ao longo do dia" },
  { id: "Acúmulo de gordura abdominal", label: "Acúmulo de gordura abdominal" },
  { id: "Formigamento nas mãos e pés", label: "Formigamento nas mãos e pés" },
  { id: "Feridas que demoram a cicatrizar", label: "Feridas que demoram a cicatrizar" },
  { id: "Sede excessiva", label: "Sede excessiva" },
  { id: "Já tenho diagnóstico", label: "Já tenho diagnóstico" },
];

const durations = [
  "Menos de 6 meses",
  "6 meses a 1 ano",
  "1 a 3 anos",
  "Mais de 3 anos",
  "Há tanto tempo que já considerei normal",
];
const attempts = [
  "Cortei glúten, lactose ou açúcar por conta",
  "Probiótico ou laxante da farmácia",
  "Protocolo que vi na internet",
  "Já passei por médico ou nutri",
  "Remédio pra emagrecer",
  "Ainda nada",
];


function Icon({
  name,
}: {
  name:
    | "back"
    | "video"
    | "phone"
    | "menu"
    | "lock"
    | "smile"
    | "send"
    | "close"
    | "list"
    | "link";
}) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
  };
  const paths: Record<string, ReactNode> = {
    back: <path d="M15 5l-7 7 7 7" />,
    video: (
      <>
        <rect height="10" rx="2" width="13" x="3" y="7" />
        <path d="M16 11l5-3v8l-5-3" />
      </>
    ),
    phone: (
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
    ),
    menu: (
      <>
        <circle cx="12" cy="5" fill="currentColor" r="2" stroke="none" />
        <circle cx="12" cy="12" fill="currentColor" r="2" stroke="none" />
        <circle cx="12" cy="19" fill="currentColor" r="2" stroke="none" />
      </>
    ),
    lock: (
      <>
        <rect height="10" rx="2" width="14" x="5" y="11" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </>
    ),
    smile: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" />
        <circle cx="9" cy="10" fill="currentColor" r=".6" />
        <circle cx="15" cy="10" fill="currentColor" r=".6" />
      </>
    ),
    send: (
      <path d="M3 3l18 9-18 9 3-9-3-9zm3.6 8H12L6.6 9.2 6.6 11zm0 2v1.8L12 13H6.6z" />
    ),
    close: (
      <>
        <path d="m6 6 12 12" />
        <path d="M18 6 6 18" />
      </>
    ),
    list: (
      <>
        <path d="M9 6h11M9 12h11M9 18h11" />
        <circle cx="4" cy="6" r="1" />
        <circle cx="4" cy="12" r="1" />
        <circle cx="4" cy="18" r="1" />
      </>
    ),
    link: (
      <>
        <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1" />
        <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      height={name === "lock" ? 12 : 20}
      viewBox="0 0 24 24"
      width={name === "lock" ? 12 : 20}
      {...common}
    >
      {paths[name]}
    </svg>
  );
}


function PickerSheet({
  type,
  initial,
  onClose,
  onChoose,
}: {
  type: Exclude<Picker, null>;
  initial: string[];
  onClose: () => void;
  onChoose: (values: string[]) => void;
}) {
  const multi = type === "sintomas";
  const options =
    type === "sintomas"
      ? symptoms.map((item) => ({ id: item.id, label: item.label }))
      : (type === "tempo" ? durations : attempts).map((item) => ({
          id: item,
          label: item,
        }));
  const title =
    type === "sintomas"
      ? "O que você sente hoje?"
      : type === "tempo"
        ? "Há quanto tempo é assim?"
        : "O que você já tentou?";
  const subtitle =
    type === "sintomas"
      ? "Marca tudo que for seu"
      : type === "tempo"
        ? "Escolhe uma"
        : "O que mais se parece com o seu caso";
  const [selected, setSelected] = useState(new Set(initial));

  useEffect(() => {
    const escape = (event: KeyboardEvent) =>
      event.key === "Escape" && onClose();
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [onClose]);

  function toggle(id: string) {
    if (!multi) return onChoose([id]);
    setSelected((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div
      className="veu"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section aria-modal="true" className="folha" role="dialog">
        <header className="folha-cab">
          <button
            aria-label="Fechar"
            className="fechar"
            onClick={onClose}
            type="button"
          >
            <Icon name="close" />
          </button>
          <b>{title}</b>
        </header>
        <p className="folha-rotulo">{subtitle}</p>
        <div className="folha-lista">
          {options.map((option) => (
            <button
              aria-checked={selected.has(option.id)}
              className="item"
              key={option.id}
              onClick={() => toggle(option.id)}
              role={multi ? "checkbox" : "radio"}
              type="button"
            >
              <span>{option.label}</span>
              <i className={multi ? "cx" : "rd"} />
            </button>
          ))}
        </div>
        {multi && (
          <footer className="folha-pe">
            <button
              className="enviar"
              disabled={!selected.size}
              onClick={() => onChoose(Array.from(selected))}
              type="button"
            >
              Confirmar
            </button>
          </footer>
        )}
      </section>
    </div>
  );
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("intro");
  const [picker, setPicker] = useState<Picker>(null);
  const [lead, setLead] = useState<Lead>(initialLead);
  const leadRef = useRef(lead);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const feed = useRef<HTMLElement>(null);
  const messageId = useRef(0);
  const started = useRef(false);
  const sessionId = useRef("");
  const nextStage = useRef<Stage>("nome");

  const updateLead = useCallback((patch: Partial<Lead>) => {
    const next = { ...leadRef.current, ...patch };
    leadRef.current = next;
    setLead(next);
    const field = Object.keys(patch)[0];
    const index = stages.indexOf(field as Stage);
    if (Object.keys(patch).length === 1 && index >= 0)
      nextStage.current = stages[Math.min(index + 1, stages.length - 1)];
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({ timestamp: Date.now(), data: next, nextStage: nextStage.current }),
      );
    } catch {}
  }, []);

  const addMine = useCallback((content: ReactNode) => {
    setMessages((current) => [
      ...current,
      { id: ++messageId.current, from: "voce", content, first: true },
    ]);
  }, []);

  const addLu = useCallback(async (content: ReactNode, delay = 750) => {
    setTyping(true);
    await new Promise((resolve) => window.setTimeout(resolve, delay));
    setTyping(false);
    setMessages((current) => [
      ...current,
      { id: ++messageId.current, from: "lu", content, first: true },
    ]);
  }, []);

  useEffect(() => {
    feed.current?.scrollTo({
      top: feed.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, typing, stage, picker]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    try {
      sessionId.current =
        localStorage.getItem(sessionStorageKey) || crypto.randomUUID();
      localStorage.setItem(sessionStorageKey, sessionId.current);
    } catch {
      sessionId.current = crypto.randomUUID();
    }
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || "null");
      if (saved?.data && Date.now() - saved.timestamp < 604800000 && stages.includes(saved.nextStage)) {
        nextStage.current = saved.nextStage;
        updateLead(saved.data);
        const resume = saved.nextStage as Stage;
        setMessages([
          { id: ++messageId.current, from: "lu", content: "Vamos continuar de onde você parou. Suas respostas anteriores foram recuperadas neste navegador." },
          ...Object.entries(saved.data).filter(([key, value]) => key !== "decisao" && value !== "" && value !== null && (!Array.isArray(value) || value.length)).map(([key, value]) => ({ id: ++messageId.current, from: "voce" as const, content: `${questions[key] || key}: ${Array.isArray(value) ? value.join(", ") : typeof value === "boolean" ? (value ? "Fora do Brasil" : "Brasil") : String(value)}` })),
          { id: ++messageId.current, from: "lu", content: resume === "decisao" ? `Acompanhamento de 90 dias: ${saved.data.fora ? "300€" : "R$ 1.497 no Pix ou 12x de R$ 150"}. Quer começar seu acompanhamento?` : questions[resume] },
        ]);
        setStage(resume);
        trackFunnel(sessionId.current, "step_viewed", resume, stages.indexOf(resume) + 1);
        return;
      }
    } catch {}
    sessionId.current = crypto.randomUUID();
    try { localStorage.setItem(sessionStorageKey, sessionId.current); } catch {}
    trackFunnel(sessionId.current, "started", "inicio", 0);
    (async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      await addLu("Oie. Sou a Vitória, sua futura nutri.", 700);
      await addLu(
        "Se você chegou até aqui, é porque entendeu que alguma coisa no seu corpo não está funcionando bem. Mas pode ficar tranquila, vai ser um prazer te ajudar a resolver o que você está sentindo.",
        1300,
      );
      await addLu(
        "Antes de qualquer coisa, preciso te conhecer melhor. São perguntas bem rápidas, leva apenas uns 3 minutos, e no fim te explico como funciona comigo.",
        1300,
      );
      await addLu("Para começar, qual é o seu nome?", 700);
      setStage("nome");
      trackFunnel(sessionId.current, "step_viewed", "nome", 1);
    })();
  }, [addLu, updateLead]);

  function firstName(name: string) {
    return name.trim().split(/\s+/)[0] || name;
  }
  function normalizeInstagram(value: string) {
    const cleaned = value
      .trim()
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
      .replace(/[/?#].*$/, "")
      .replace(/^@+/, "");
    return cleaned ? `@${cleaned}` : "";
  }

  async function submitText(event: FormEvent) {
    event.preventDefault();
    setError("");
    const value = draft.trim();
    if (stage === "nome") {
      if (value.length < 2)
        return setError("Me conta seu nome pra eu saber com quem falo.");
      updateLead({ nome: value });
      addMine(value);
      trackFunnel(sessionId.current, "answered", "nome", 1, value);
      setDraft("");
      setStage("intro");
      await addLu(
        <>
          Prazer, {firstName(value)}. E o que você vem sentindo? Marque tudo o
          que você conseguir lembrar.
        </>,
        900,
      );
      setStage("sintomas");
      trackFunnel(sessionId.current, "step_viewed", "sintomas", 2);
    } else if (stage === "whatsapp") {
      if (value.replace(/\D/g, "").length < 10)
        return setError("Preciso do DDD e do número completo.");
      updateLead({ whatsapp: value });
      addMine(value);
      trackFunnel(sessionId.current, "answered", "whatsapp", 6, value);
      setDraft("");
      setStage("intro");
      await addLu(
        "E o seu @ do Instagram? Eu gosto de dar uma olhada no perfil antes de te chamar, pra já chegar te conhecendo.",
        900,
      );
      setStage("instagram");
      trackFunnel(sessionId.current, "step_viewed", "instagram", 7);
    } else if (stage === "instagram") {
      const instagram = normalizeInstagram(value);
      if (!/^@[A-Za-z0-9._]{2,}$/.test(instagram))
        return setError("Confere o seu @ pra mim.");
      await chooseInstagram(instagram);
    }
  }

  async function chooseSymptoms(values: string[]) {
    setPicker(null);
    updateLead({ sintomas: values });
    addMine(
      values
        .map(
          (value) => symptoms.find((item) => item.id === value)?.label ?? value,
        )
        .join(", "),
    );
    trackFunnel(sessionId.current, "answered", "sintomas", 2, values);
    setStage("intro");
    if (values.includes("Já tenho diagnóstico")) {
      await addLu("Você marcou que já tem um diagnóstico. Quero conhecer essa história e entender como está o seu acompanhamento hoje.", 900);
    } else if (values.some(value => ["Formigamento nas mãos e pés", "Feridas que demoram a cicatrizar", "Sede excessiva"].includes(value))) {
      await addLu("Obrigada por me contar o que você está sentindo. Quero entender quando esses sinais começaram e como eles aparecem no seu dia a dia.", 900);
    } else if (values.some(value => ["Fome frequente", "Vontade/compulsão por doces"].includes(value))) {
      await addLu("Você contou sobre sua fome e sua relação com os doces. Quero te ouvir sem julgamentos e entender como isso acontece na sua rotina.", 900);
    } else {
      await addLu("Obrigada por compartilhar isso comigo. Quero entender seus incômodos, sua rotina e o que você gostaria de melhorar com o acompanhamento.", 900);
    }
    await addLu("Há quanto tempo você sente isso?", 700);
    setStage("tempo");
    trackFunnel(sessionId.current, "step_viewed", "tempo", 3);
  }

  async function chooseDuration(value: string) {
    setPicker(null);
    updateLead({ tempo: value });
    addMine(value);
    trackFunnel(sessionId.current, "answered", "tempo", 3, value);
    setStage("intro");
    await addLu(
      "E o que você já tentou até aqui? Marca o que mais se parece com o seu caso.",
      900,
    );
    setStage("tentou");
    trackFunnel(sessionId.current, "step_viewed", "tentou", 4);
  }

  async function chooseAttempt(value: string) {
    setPicker(null);
    updateLead({ tentou: value });
    addMine(value);
    trackFunnel(sessionId.current, "answered", "tentou", 4, value);
    setStage("intro");
    await addLu("Obrigada por me contar. Quero entender sua experiência e o que faz sentido para a sua rotina.", 1300);
    await addLu(
      <>
        Quero conhecer sua alimentação, seus sintomas e sua rotina para
        conversar sobre um acompanhamento individualizado:
        <ul className="lista">
          <li>
            <b>90 dias</b> · Acompanhamento próximo, 100% online, com protocolo
            individual
          </li>
          <li>
            <b>3 consultas</b> · Por videochamada, uma a cada 30 dias
          </li>
          <li>
            <b>Ajustes a cada 7-15 dias</b> · Conforme o seu corpo responde
          </li>
          <li>
            <b>WhatsApp aberto</b> · Suporte diário comigo pra tirar dúvidas
          </li>
        </ul>
      </>,
      1200,
    );
    await addLu("Você mora no Brasil?", 700);
    setStage("fora");
    trackFunnel(sessionId.current, "step_viewed", "fora", 5);
  }

  async function chooseCountry(outside: boolean) {
    const answer = outside ? "Moro fora do Brasil" : "Sim, moro no Brasil";
    updateLead({ fora: outside });
    addMine(answer);
    trackFunnel(sessionId.current, "answered", "fora", 5, answer);
    setStage("intro");
    await addLu("Me passa seu WhatsApp? É por onde eu te respondo.", 800);
    setStage("whatsapp");
    trackFunnel(sessionId.current, "step_viewed", "whatsapp", 6);
  }

  async function chooseInstagram(value: string) {
    const instagram = value === "Não uso Instagram" ? "" : value;
    updateLead({ instagram });
    addMine(value);
    trackFunnel(sessionId.current, "answered", "instagram", 7, value);
    setDraft("");
    setStage("intro");
    await addLu("Por onde você me achou?", 700);
    setStage("origem");
    trackFunnel(sessionId.current, "step_viewed", "origem", 8);
  }

  async function chooseOrigin(id: string, label: string) {
    updateLead({ origem: id });
    addMine(label);
    trackFunnel(sessionId.current, "answered", "origem", 8, label);
    setStage("intro");
    const outside = !!leadRef.current.fora;
    await addLu(
      <>
        {firstName(leadRef.current.nome)}, agora que te conheço um pouco melhor,
        quero te apresentar o meu <b>acompanhamento nutricional de 90 dias</b>.
        <p className="mt">
          Vamos conversar sobre seu histórico, seus sintomas, o que você já tentou
          e os exames que você já tem, para construir um plano individualizado
          e acompanhar sua evolução.
        </p>
      </>,
      1300,
    );
    await addLu(
      <>
        Pra ficar claro:
        <div className="caixa">
          <div className="l">
            <span>
              Acompanhamento de 90 dias{outside ? " (fora do Brasil)" : ""}
            </span>
            <b>{outside ? "300€" : "R$ 1.497 no Pix"}</b>
          </div>
          {!outside && (
            <div className="l">
              <span>ou no cartão</span>
              <b>12x de R$ 150</b>
            </div>
          )}
        </div>
      </>,
      1100,
    );
    await addLu("Quer começar seu acompanhamento?", 600);
    setStage("decisao");
    trackFunnel(sessionId.current, "step_viewed", "decisao", 9);
  }

  async function chooseDecision(kind: "direto" | "nao") {
    const decision =
      kind === "direto"
          ? "Quero começar meu acompanhamento"
          : "Ainda não";
    updateLead({ decisao: decision });
    addMine(decision);
    trackFunnel(sessionId.current, "answered", "decisao", 9, decision);
    setSaving(true);
    setStage("intro");
    setError("");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId.current,
          ...leadRef.current,
          decisao: decision,
          consentimento: true,
          utm: Object.fromEntries(
            [
              "utm_source",
              "utm_medium",
              "utm_campaign",
              "utm_term",
              "utm_content",
            ]
              .map((key) => [
                key.slice(4),
                new URLSearchParams(location.search).get(key),
              ])
              .filter((entry) => entry[1]),
          ),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          result.error || "Não consegui salvar agora. Tenta de novo.",
        );
      try {
        localStorage.removeItem(draftKey);
        localStorage.removeItem(sessionStorageKey);
      } catch {}
      const name = firstName(leadRef.current.nome);
      await addLu(
        kind === "direto" ? (
          <>
            Obrigada por me contar tudo isso, {name}. Eu mesma vou te chamar no
            WhatsApp pra gente combinar o começo dos seus 90 dias. Se quiser
            adiantar, me chama por aqui que a mensagem já vai pronta.
          </>
        ) : (
          <>
            Tudo bem, {name}. Guardei o que você escreveu, e quando fizer
            sentido eu estou aqui.
          </>
        ),
        1200,
      );
      setStage("fim");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não consegui salvar agora. Tenta de novo.",
      );
      setStage("decisao");
    } finally {
      setSaving(false);
    }
  }

  const inputMode =
    stage === "nome" || stage === "whatsapp" || stage === "instagram";
  const placeholder =
    stage === "nome"
      ? "Seu nome"
      : stage === "whatsapp"
        ? "DDD + número"
        : stage === "instagram"
          ? "@seuperfil"
          : "Toca numa opção acima";
  const whatsappText = encodeURIComponent(
    `Olá, Vitória! Sou a ${firstName(lead.nome)}, acabei de preencher o link da bio e optei pela opção: ${lead.decisao}.`,
  );

  return (
    <main className="bio">
      <div className="fone">
        <header className="cab">
          <span aria-hidden="true" className="volta">
            <Icon name="back" />
          </span>
          <span className="av">
            <Image alt="" fill priority sizes="40px" src="/profile.jpg" />
          </span>
          <span className="quem">
            <b>Vitória Serafim</b>
            <small className={typing ? "dig" : ""}>
              {typing ? "digitando..." : "online"}
            </small>
          </span>
          <span aria-hidden="true" className="acoes">
            <Icon name="video" />
            <Icon name="phone" />
            <Icon name="menu" />
          </span>
        </header>
        {stage !== "intro" && stage !== "fim" && <div style={{ padding: "8px 16px", fontSize: 14, background: "#fff" }}>Pergunta {stages.indexOf(stage) + 1} de {stages.length} · Progresso guardado neste navegador</div>}
        <section aria-live="polite" className="fio" ref={feed}>
          <span className="dia">Hoje</span>
          <span className="aviso">
            <Icon name="lock" /> Suas respostas são registradas ao longo da conversa para preparar seu atendimento e entender o preenchimento. Apenas a equipe autorizada tem acesso. O progresso fica neste navegador por até 7 dias.
          </span>
          {messages.map((message) => (
            <div
              className={`msg ${message.from === "voce" ? "voce" : ""} ${message.first ? "primeira" : ""}`}
              key={message.id}
            >
              <div className="balao">
                <div className="txt">{message.content}</div>
                <span className="meta">
                  {new Date().toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {message.from === "voce" && (
                    <span className="tiques">✓✓</span>
                  )}
                </span>
              </div>
            </div>
          ))}
          {typing && (
            <div className="msg primeira">
              <div className="balao digitando">
                <i />
                <i />
                <i />
              </div>
            </div>
          )}
          {error && (
            <span className="aviso erro" role="alert">
              {error}
            </span>
          )}
          {stage === "sintomas" && (
            <div className="botoes">
              <button
                className="bot"
                onClick={() => setPicker("sintomas")}
                type="button"
              >
                <Icon name="list" />
                Marcar o que eu sinto
              </button>
            </div>
          )}
          {stage === "tempo" && (
            <div className="botoes">
              <button
                className="bot"
                onClick={() => setPicker("tempo")}
                type="button"
              >
                <Icon name="list" />
                Escolher
              </button>
            </div>
          )}
          {stage === "tentou" && (
            <div className="botoes">
              <button
                className="bot"
                onClick={() => setPicker("tentou")}
                type="button"
              >
                <Icon name="list" />
                Escolher
              </button>
            </div>
          )}
          {stage === "fora" && (
            <div className="botoes">
              <button
                className="bot"
                onClick={() => chooseCountry(false)}
                type="button"
              >
                Sim, moro no Brasil
              </button>
              <button
                className="bot"
                onClick={() => chooseCountry(true)}
                type="button"
              >
                Moro fora do Brasil
              </button>
            </div>
          )}
          {stage === "instagram" && (
            <div className="botoes">
              <button
                className="bot"
                onClick={() => chooseInstagram("Não uso Instagram")}
                type="button"
              >
                Não uso Instagram
              </button>
            </div>
          )}
          {stage === "origem" && (
            <div className="botoes">
              {[
                ["instagram", "Instagram"],
                ["tiktok", "TikTok"],
                ["indicacao", "Indicação de alguém"],
              ].map(([id, label]) => (
                <button
                  className="bot"
                  key={id}
                  onClick={() => chooseOrigin(id, label)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {stage === "decisao" && (
            <div className="botoes">
              <button
                className="bot"
                disabled={saving}
                onClick={() => chooseDecision("direto")}
                type="button"
              >
                Quero começar meu acompanhamento
              </button>
              <button
                className="bot"
                disabled={saving}
                onClick={() => chooseDecision("nao")}
                type="button"
              >
                Ainda não
              </button>
            </div>
          )}
          {stage === "fim" && lead.decisao !== "Ainda não" && contactWhatsapp && (
            <div className="botoes">
              <a
                className="bot"
                href={`https://wa.me/${contactWhatsapp}?text=${whatsappText}`}
                rel="noreferrer"
                target="_blank"
              >
                <Icon name="link" />
                Chamar a Vitória no WhatsApp
              </a>
            </div>
          )}
        </section>
        <footer className="barra">
          <form className="compor" onSubmit={submitText}>
            <label className="campo">
              <Icon name="smile" />
              <input
                aria-label={placeholder}
                autoCapitalize={stage === "instagram" ? "none" : "words"}
                autoComplete={
                  stage === "whatsapp"
                    ? "tel"
                    : stage === "nome"
                      ? "given-name"
                      : "off"
                }
                disabled={!inputMode || saving}
                enterKeyHint="send"
                inputMode={stage === "whatsapp" ? "tel" : "text"}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={placeholder}
                type={stage === "whatsapp" ? "tel" : "text"}
                value={draft}
              />
            </label>
            <button
              aria-label="Enviar"
              disabled={!inputMode || !draft.trim() || saving}
              type="submit"
            >
              <Icon name="send" />
            </button>
          </form>
        </footer>
        {picker === "sintomas" && (
          <PickerSheet
            initial={lead.sintomas}
            onChoose={chooseSymptoms}
            onClose={() => setPicker(null)}
            type="sintomas"
          />
        )}
        {picker === "tempo" && (
          <PickerSheet
            initial={lead.tempo ? [lead.tempo] : []}
            onChoose={(values) => chooseDuration(values[0])}
            onClose={() => setPicker(null)}
            type="tempo"
          />
        )}
        {picker === "tentou" && (
          <PickerSheet
            initial={lead.tentou ? [lead.tentou] : []}
            onChoose={(values) => chooseAttempt(values[0])}
            onClose={() => setPicker(null)}
            type="tentou"
          />
        )}
      </div>
    </main>
  );
}
