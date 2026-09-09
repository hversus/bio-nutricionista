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
const draftKey = "luana_bio_draft_v2";
const diagnosticBrazil = "R$ 350";
const diagnosticAbroad = "60€";
const sessionStorageKey = "luana_bio_session_v1";

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
      },
    }),
  }).catch(() => undefined);
}

const symptoms = [
  { id: "Inchaço abdominal constante", label: "Vivo inchada" },
  {
    id: "Intestino preso / constipação",
    label: "Fico dias sem ir ao banheiro",
  },
  { id: "Candidíase de repetição", label: "Candidíase que volta todo mês" },
  { id: "Gases e desconforto digestivo", label: "Gases o tempo todo" },
  { id: "Cansaço e falta de energia", label: "Vivo cansada" },
  { id: "Ansiedade ou compulsão alimentar", label: "Ansiedade e compulsão" },
  { id: "Acne ou pele que não melhora", label: "Pele que não melhora" },
  { id: "Dificuldade para emagrecer", label: "Não consigo emagrecer" },
  { id: "Diarreia ou intestino irregular", label: "Intestino imprevisível" },
  {
    id: "Já tenho diagnóstico (disbiose, SIBO, SII...)",
    label: "Já tenho diagnóstico",
  },
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

const attemptReplies: Record<string, string> = {
  "Cortei glúten, lactose ou açúcar por conta":
    "Cortar no escuro é o que eu mais vejo: você tira o glúten, depois a lactose, depois o açúcar, sem saber se é isso mesmo que te faz inchar. A lista vai ficando menor e o sintoma continua. Quase sempre o problema não é o alimento, é como o seu intestino está processando o que você come.",
  "Probiótico ou laxante da farmácia":
    "Laxante e probiótico de farmácia compram uns dias de paz. Sem a sua alimentação ajustada no lugar certo, na semana seguinte você volta a ficar presa e inchada. O sintoma some, a causa continua ali.",
  "Protocolo que vi na internet":
    "O protocolo que viralizou é de outra pessoa. As bactérias que vivem no seu intestino são suas, com a sua história e a sua rotina. Receita copiada não enxerga isso, e por isso trava.",
  "Já passei por médico ou nutri":
    "Então você provavelmente já ouviu que “é normal”, ou saiu com um cardápio na mão e o resto por sua conta. O que costuma faltar é investigar a causa e ter alguém ajustando a rota com você quando a semana aperta.",
  "Remédio pra emagrecer":
    "Remédio pra emagrecer alivia por um tempo, mas com o intestino desorganizado o corpo trabalha contra você mesmo com o déficit certo. Quando a raiz é ajustada, o resto destrava.",
  "Ainda nada":
    "Então você chegou antes de gastar dinheiro tentando no escuro. É o melhor momento pra investigar a causa, antes de cortar alimento por conta ou entrar em protocolo de internet.",
};

const testimonials: Record<
  string,
  { name: string; badge: string; text: string }
> = {
  "Inchaço abdominal constante": {
    name: "Marília Simon",
    badge: "Parou de estufar",
    text: "Sofria com estufamento abdominal diário há muitos anos e foi com os testes que fizemos em minha dieta que consegui parar de ter esse sintoma.",
  },
  "Gases e desconforto digestivo": {
    name: "Marília Simon",
    badge: "Parou de estufar",
    text: "Sofria com estufamento abdominal diário há muitos anos e foi com os testes que fizemos em minha dieta que consegui parar de ter esse sintoma.",
  },
  "Intestino preso / constipação": {
    name: "Beatriz Ribeiro",
    badge: "1x por semana → 3 a 4x",
    text: "O meu “normal” era ficar sete dias sem ir ao banheiro. Passei de uma vez por semana para três a quatro vezes.",
  },
  "Diarreia ou intestino irregular": {
    name: "Helena Oenning",
    badge: "Regulado em semanas",
    text: "Antes da consulta estava dependente de laxante. Hoje meu intestino é muito mais regulado, mesmo com poucas semanas de acompanhamento.",
  },
  "Acne ou pele que não melhora": {
    name: "Nami Studio",
    badge: "Resolvido em 3 meses",
    text: "Chamei a Lu para tratar algo em que eu estava há dois anos gastando dinheiro com diversos tratamentos. Em 3 meses ela resolveu!",
  },
  "Candidíase de repetição": {
    name: "Marina Menegaz",
    badge: "Nunca mais teve",
    text: "Tive candidíase de repetição por um ano e ter conhecido a Lu foi a minha salvação. Nunca mais tive nenhum tipo de problema.",
  },
  "Dificuldade para emagrecer": {
    name: "Bruna",
    badge: "Voltou ao normal em 3 meses",
    text: "Em 3 meses descobrimos vários poréns do meu corpo, adequamos a dieta e conseguimos voltar para quase um normal.",
  },
  "Cansaço e falta de energia": {
    name: "Yasmin Febit",
    badge: "Resultado em menos de 2 semanas",
    text: "Antes eu ficava dias sem ir ao banheiro e agora, com menos de duas semanas, estou tendo resultado todos os dias!",
  },
  "Ansiedade ou compulsão alimentar": {
    name: "Micleide Celestino",
    badge: "Fim do terrorismo alimentar",
    text: "A Lu trabalha com evidências. Isso poupa pacientes do sofrimento causado por terrorismo alimentar.",
  },
  "Já tenho diagnóstico (disbiose, SIBO, SII...)": {
    name: "Beatriz Ribeiro",
    badge: "Depois de tentar tudo",
    text: "Já tinha tentado inúmeras consultas, profissionais e dietas rigorosas. A Lu mudou a minha mente sobre constância.",
  },
};

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

function Testimonial({
  data,
}: {
  data: { name: string; badge: string; text: string };
}) {
  return (
    <div className="cit">
      <b>{data.name}</b>
      <small>
        Avaliação no Google · <span aria-label="5 de 5 estrelas">★★★★★</span> ·{" "}
        {data.badge}
      </small>
      <p>{data.text}</p>
    </div>
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

  const updateLead = useCallback((patch: Partial<Lead>) => {
    const next = { ...leadRef.current, ...patch };
    leadRef.current = next;
    setLead(next);
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({ timestamp: Date.now(), data: next }),
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
    trackFunnel(sessionId.current, "started", "inicio", 0);
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || "null");
      if (saved?.data && Date.now() - saved.timestamp < 604800000)
        updateLead(saved.data);
    } catch {}
    (async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      await addLu("Oi. Eu sou a Lu, nutricionista do seu intestino.", 700);
      await addLu(
        "Se você chegou até aqui, é porque alguma coisa no seu corpo não anda bem. Pode ficar tranquila: vai ser um prazer te ajudar a resolver o que você está sentindo.",
        1300,
      );
      await addLu(
        "Antes de qualquer coisa, eu quero te conhecer melhor. São 8 perguntas rápidas, uns 3 minutos, e no fim eu te explico como funciona comigo.",
        1300,
      );
      await addLu("Pra começar: como você se chama?", 700);
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
          Prazer, {firstName(value)}. O que você sente hoje? Marca tudo que for
          seu.
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
    const unique = Array.from(
      new Map(
        values
          .map((value) => testimonials[value])
          .filter(Boolean)
          .map((item) => [item.name, item]),
      ).values(),
    ).slice(0, 2);
    if (unique.length) {
      await addLu(
        "Isso que você marcou eu vejo toda semana no consultório. Olha quem chegou assim e escreveu depois no Google:",
        1100,
      );
      for (const item of unique) await addLu(<Testimonial data={item} />, 700);
    }
    await addLu("Há quanto tempo é assim?", 700);
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
    await addLu(attemptReplies[value] || "Faz sentido.", 1300);
    await addLu(
      <>
        É por isso que eu não começo com cardápio. Eu começo{" "}
        <b>investigando a causa</b>: como o seu intestino se move, o que ele
        absorve e quais bactérias estão desequilibradas. É daí que sai o
        protocolo, e é assim que funciona comigo:
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
    const diagnostic = outside ? diagnosticAbroad : diagnosticBrazil;
    await addLu(
      <>
        Última coisa, {firstName(leadRef.current.nome)}. Você não precisa
        decidir os 90 dias agora. Dá pra começar pelo{" "}
        <b>diagnóstico completo</b>, por <b>{diagnostic}</b>, abatidos depois se
        você seguir comigo.
        <p className="mt">
          Uma consulta comigo, por vídeo, só pra investigar o seu caso:
          histórico, sintomas, o que você já tentou e os exames que você já tem.
          Você sai sabendo o que costuma estar por trás do que sente e qual
          caminho eu seguiria com você.
        </p>
      </>,
      1300,
    );
    await addLu(
      <>
        Pra ficar claro:
        <div className="caixa">
          <div className="l">
            <span>Diagnóstico completo</span>
            <b>{diagnostic}</b>
          </div>
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
          <div className="l">
            <span>Fez o diagnóstico e seguiu?</span>
            <b>{diagnostic} abatidos</b>
          </div>
        </div>
        <p className="nota">
          Se você não seguir, fica só o diagnóstico, sem compromisso.
        </p>
      </>,
      1100,
    );
    await addLu("O que você prefere?", 600);
    setStage("decisao");
    trackFunnel(sessionId.current, "step_viewed", "decisao", 9);
  }

  async function chooseDecision(kind: "diag" | "direto" | "nao") {
    const outside = !!leadRef.current.fora;
    const diagnostic = outside ? diagnosticAbroad : diagnosticBrazil;
    const decision =
      kind === "diag"
        ? `Quero fazer o diagnóstico (${diagnostic})`
        : kind === "direto"
          ? "Quero ir direto pro acompanhamento"
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
        kind === "diag" ? (
          <>
            Obrigada por me contar tudo isso, {name}. Eu mesma vou te chamar no
            WhatsApp pra combinar o dia do seu diagnóstico. Se quiser adiantar,
            me chama por aqui que a mensagem já vai pronta.
          </>
        ) : kind === "direto" ? (
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
    `Olá, Lu! Sou a ${firstName(lead.nome)}, acabei de preencher o link da bio e optei pela opção: ${lead.decisao}.`,
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
            <b>Luana Turque</b>
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
        <section aria-live="polite" className="fio" ref={feed}>
          <span className="dia">Hoje</span>
          <span className="aviso">
            <Icon name="lock" /> Suas respostas são confidenciais e só a Luana
            lê. Luana Turque Nutrição · CRN-4 19100494.
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
                onClick={() => chooseDecision("diag")}
                type="button"
              >
                Quero fazer o diagnóstico (
                {lead.fora ? diagnosticAbroad : diagnosticBrazil})
              </button>
              <button
                className="bot"
                disabled={saving}
                onClick={() => chooseDecision("direto")}
                type="button"
              >
                Quero ir direto pro acompanhamento
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
          {stage === "fim" && lead.decisao !== "Ainda não" && (
            <div className="botoes">
              <a
                className="bot"
                href={`https://wa.me/5522981090202?text=${whatsappText}`}
                rel="noreferrer"
                target="_blank"
              >
                <Icon name="link" />
                Chamar a Lu no WhatsApp
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
