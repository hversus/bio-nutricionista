"use client";

import { createClient, Session } from "@supabase/supabase-js";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { supabasePublishableKey, supabaseUrl } from "../../lib/supabase-config";
import styles from "./admin.module.css";

type EventRow = {
  id: number;
  session_id: string;
  event_name: "started" | "answered" | "step_viewed" | "completed";
  step_key: string;
  step_index: number;
  answer: unknown;
  metadata: Record<string, unknown>;
  created_at: string;
};

type LeadRow = {
  id: string;
  session_id: string;
  nome: string;
  whatsapp: string;
  cidade: string;
  instagram: string | null;
  objetivo: string;
  nivel_interesse: string;
  respostas: {
    sintomas?: string[];
    tempo?: string | null;
    tentativas?: string | null;
    mora_fora?: boolean;
    origem?: string | null;
  };
  origem: string;
  status: string;
  criado_em: string;
};

const adminEmail = "matheusgaleno11@gmail.com";
const supabase = createClient(supabaseUrl, supabasePublishableKey);
const stepLabels: Record<string, string> = {
  inicio: "Iniciou",
  nome: "Informou o nome",
  sintomas: "Selecionou sintomas",
  tempo: "Informou o tempo",
  tentou: "Contou o que tentou",
  fora: "Informou o país",
  whatsapp: "Informou o WhatsApp",
  instagram: "Informou o Instagram",
  origem: "Informou a origem",
  decisao: "Escolheu o próximo passo",
  completed: "Formulário concluído",
};
const orderedSteps = [
  "inicio",
  "nome",
  "sintomas",
  "tempo",
  "tentou",
  "fora",
  "whatsapp",
  "instagram",
  "origem",
  "decisao",
  "completed",
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function percent(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function Login() {
  const [email, setEmail] = useState(adminEmail);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
        shouldCreateUser: true,
      },
    });
    setMessage(
      error
        ? "Não foi possível enviar o acesso. Confira o e-mail."
        : "Enviamos um link de acesso para o seu e-mail.",
    );
    setLoading(false);
  }

  return (
    <main className={styles.loginPage}>
      <section className={styles.loginCard}>
        <div className={styles.brandMark}>LT</div>
        <p className={styles.eyebrow}>Área privada</p>
        <h1>Análise do formulário</h1>
        <p>
          Entre com o e-mail autorizado para visualizar respostas e conversão.
        </p>
        <form onSubmit={submit}>
          <label htmlFor="admin-email">E-mail</label>
          <input
            id="admin-email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
          <button disabled={loading} type="submit">
            {loading ? "Enviando..." : "Receber link de acesso"}
          </button>
        </form>
        {message && <div className={styles.loginMessage}>{message}</div>}
      </section>
    </main>
  );
}

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [days, setDays] = useState("30");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const loadData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError("");
    const cutoff =
      days === "all"
        ? null
        : new Date(Date.now() - Number(days) * 86400000).toISOString();

    let eventsQuery = supabase
      .from("funnel_events")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(10000);
    let leadsQuery = supabase
      .from("leads_nutricionista")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(5000);
    if (cutoff) {
      eventsQuery = eventsQuery.gte("created_at", cutoff);
      leadsQuery = leadsQuery.gte("criado_em", cutoff);
    }

    const [eventsResult, leadsResult] = await Promise.all([
      eventsQuery,
      leadsQuery,
    ]);
    if (eventsResult.error || leadsResult.error) {
      setError(
        "Não foi possível carregar os dados. Confirme se este e-mail tem acesso.",
      );
    } else {
      setEvents((eventsResult.data ?? []) as EventRow[]);
      setLeads((leadsResult.data ?? []) as LeadRow[]);
    }
    setLoading(false);
  }, [days, session]);

  useEffect(() => {
    if (session?.user.email === adminEmail) void loadData();
    else setLoading(false);
  }, [loadData, session]);

  const analysis = useMemo(() => {
    const sessions = new Map<
      string,
      {
        startedAt: number;
        completedAt?: number;
        maxIndex: number;
        lastStep: string;
      }
    >();
    const reached = new Map<string, Set<string>>();
    const distributions = new Map<string, Map<string, number>>();

    for (const event of events) {
      const timestamp = new Date(event.created_at).getTime();
      const current = sessions.get(event.session_id) ?? {
        startedAt: timestamp,
        maxIndex: 0,
        lastStep: "inicio",
      };
      current.startedAt = Math.min(current.startedAt, timestamp);
      if (event.step_index >= current.maxIndex) {
        current.maxIndex = event.step_index;
        current.lastStep = event.step_key;
      }
      if (event.event_name === "completed") current.completedAt = timestamp;
      sessions.set(event.session_id, current);

      if (event.event_name === "started") {
        if (!reached.has("inicio")) reached.set("inicio", new Set());
        reached.get("inicio")?.add(event.session_id);
      }
      if (event.event_name === "step_viewed") {
        if (!reached.has(event.step_key))
          reached.set(event.step_key, new Set());
        reached.get(event.step_key)?.add(event.session_id);
      }
      if (event.event_name === "completed") {
        if (!reached.has("completed")) reached.set("completed", new Set());
        reached.get("completed")?.add(event.session_id);
      }

      if (event.event_name === "answered") {
        const values = Array.isArray(event.answer)
          ? event.answer
          : [event.answer];
        const bucket =
          distributions.get(event.step_key) ?? new Map<string, number>();
        for (const raw of values) {
          const value =
            typeof raw === "string" ? raw : JSON.stringify(raw ?? "");
          if (value) bucket.set(value, (bucket.get(value) ?? 0) + 1);
        }
        distributions.set(event.step_key, bucket);
      }
    }

    for (const lead of leads) {
      const timestamp = new Date(lead.criado_em).getTime();
      const current = sessions.get(lead.session_id) ?? {
        startedAt: timestamp,
        maxIndex: 10,
        lastStep: "completed",
      };
      current.completedAt = timestamp;
      current.maxIndex = Math.max(current.maxIndex, 10);
      current.lastStep = "completed";
      sessions.set(lead.session_id, current);
      if (!reached.has("completed")) reached.set("completed", new Set());
      reached.get("completed")?.add(lead.session_id);
    }

    const started = reached.get("inicio")?.size ?? 0;
    const completed = reached.get("completed")?.size ?? 0;
    const abandoned = Math.max(0, started - completed);
    const completedDurations = Array.from(sessions.values())
      .filter((item) => item.completedAt)
      .map((item) => (item.completedAt! - item.startedAt) / 60000)
      .filter((value) => value >= 0 && value < 1440);
    const averageMinutes = completedDurations.length
      ? completedDurations.reduce((sum, value) => sum + value, 0) /
        completedDurations.length
      : 0;

    const funnel = orderedSteps.map((key) => {
      const count = reached.get(key)?.size ?? 0;
      return {
        key,
        label: stepLabels[key],
        count,
        rate: percent(count, started),
      };
    });

    const dropoffs = new Map<string, number>();
    for (const item of Array.from(sessions.values())) {
      if (!item.completedAt)
        dropoffs.set(item.lastStep, (dropoffs.get(item.lastStep) ?? 0) + 1);
    }

    const responseGroups = [
      "sintomas",
      "tempo",
      "tentou",
      "fora",
      "origem",
      "decisao",
    ]
      .map((key) => ({
        key,
        label: stepLabels[key],
        values: Array.from(distributions.get(key)?.entries() ?? [])
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count),
      }))
      .filter((group) => group.values.length);

    return {
      started,
      completed,
      abandoned,
      completionRate: percent(completed, started),
      averageMinutes,
      funnel,
      dropoffs: Array.from(dropoffs.entries())
        .map(([key, count]) => ({ key, label: stepLabels[key] ?? key, count }))
        .sort((a, b) => b.count - a.count),
      responseGroups,
    };
  }, [events, leads]);

  const filteredLeads = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    if (!normalized) return leads;
    return leads.filter((lead) =>
      [lead.nome, lead.whatsapp, lead.instagram, lead.nivel_interesse]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [leads, query]);

  function exportCsv() {
    const headers = [
      "Data",
      "Nome",
      "WhatsApp",
      "Instagram",
      "Local",
      "Interesse",
      "Sintomas",
      "Tempo",
      "Tentativas",
      "Origem",
    ];
    const rows = leads.map((lead) => [
      formatDate(lead.criado_em),
      lead.nome,
      lead.whatsapp,
      lead.instagram ?? "",
      lead.cidade,
      lead.nivel_interesse,
      (lead.respostas.sintomas ?? []).join(" | "),
      lead.respostas.tempo ?? "",
      lead.respostas.tentativas ?? "",
      lead.respostas.origem ?? lead.origem,
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
    );
    link.download = `formularios-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  if (!authReady)
    return <main className={styles.statePage}>Carregando acesso...</main>;
  if (!session) return <Login />;
  if (session.user.email !== adminEmail)
    return (
      <main className={styles.statePage}>
        <section className={styles.denied}>
          <h1>Acesso não autorizado</h1>
          <p>Este e-mail não tem permissão para visualizar as respostas.</p>
          <button onClick={() => supabase.auth.signOut()} type="button">
            Sair
          </button>
        </section>
      </main>
    );

  return (
    <main className={styles.dashboard}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>LT</div>
        <div>
          <strong>Luana Turque</strong>
          <span>Análise do formulário</span>
        </div>
        <nav>
          <a className={styles.active} href="#visao-geral">
            Visão geral
          </a>
          <a href="#funil">Funil</a>
          <a href="#respostas">Respostas</a>
          <a href="#formularios">Formulários</a>
        </nav>
        <button
          className={styles.signOut}
          onClick={() => supabase.auth.signOut()}
          type="button"
        >
          Sair
        </button>
      </aside>

      <section className={styles.content}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.eyebrow}>Painel de conversão</p>
            <h1>Desempenho do formulário</h1>
          </div>
          <div className={styles.filters}>
            <select
              aria-label="Período"
              onChange={(event) => setDays(event.target.value)}
              value={days}
            >
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="all">Todo o período</option>
            </select>
            <button onClick={() => void loadData()} type="button">
              Atualizar
            </button>
          </div>
        </header>

        {error && <div className={styles.error}>{error}</div>}
        {loading ? (
          <div className={styles.loading}>Calculando os indicadores...</div>
        ) : (
          <>
            <section className={styles.kpis} id="visao-geral">
              <article>
                <span>Formulários iniciados</span>
                <strong>{analysis.started}</strong>
                <small>Sessões que abriram a conversa</small>
              </article>
              <article>
                <span>Formulários completos</span>
                <strong>{analysis.completed}</strong>
                <small>{analysis.completionRate}% de conversão</small>
              </article>
              <article>
                <span>Abandonos</span>
                <strong>{analysis.abandoned}</strong>
                <small>
                  {percent(analysis.abandoned, analysis.started)}% não
                  concluíram
                </small>
              </article>
              <article>
                <span>Tempo médio</span>
                <strong>{analysis.averageMinutes.toFixed(1)} min</strong>
                <small>Entre o início e a conclusão</small>
              </article>
            </section>

            <section className={styles.gridTwo} id="funil">
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.eyebrow}>Conversão por etapa</p>
                    <h2>Funil de respostas</h2>
                  </div>
                </div>
                <div className={styles.funnel}>
                  {analysis.funnel.map((step) => (
                    <div className={styles.funnelRow} key={step.key}>
                      <span>{step.label}</span>
                      <div>
                        <i style={{ width: `${step.rate}%` }} />
                      </div>
                      <strong>{step.count}</strong>
                      <small>{step.rate}%</small>
                    </div>
                  ))}
                </div>
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.eyebrow}>Pontos de atenção</p>
                    <h2>Onde as pessoas pararam</h2>
                  </div>
                </div>
                {analysis.dropoffs.length ? (
                  <div className={styles.dropoffs}>
                    {analysis.dropoffs.map((item, index) => (
                      <div key={item.key}>
                        <span className={styles.rank}>{index + 1}</span>
                        <span>{item.label}</span>
                        <strong>{item.count}</strong>
                        <small>{percent(item.count, analysis.started)}%</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.empty}>
                    Ainda não há abandonos registrados.
                  </p>
                )}
              </article>
            </section>

            <section className={styles.answersSection} id="respostas">
              <div className={styles.sectionTitle}>
                <p className={styles.eyebrow}>Perfil das respostas</p>
                <h2>O que as pessoas estão respondendo</h2>
              </div>
              <div className={styles.answerGrid}>
                {analysis.responseGroups.map((group) => {
                  const maximum = Math.max(
                    ...group.values.map((item) => item.count),
                    1,
                  );
                  return (
                    <article className={styles.panel} key={group.key}>
                      <h3>{group.label}</h3>
                      <div className={styles.answerBars}>
                        {group.values.slice(0, 10).map((item) => (
                          <div key={item.label}>
                            <span title={item.label}>{item.label}</span>
                            <div>
                              <i
                                style={{
                                  width: `${(item.count / maximum) * 100}%`,
                                }}
                              />
                            </div>
                            <strong>{item.count}</strong>
                          </div>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className={styles.panel} id="formularios">
              <div className={styles.tableHeader}>
                <div>
                  <p className={styles.eyebrow}>Leads concluídos</p>
                  <h2>Formulários completos</h2>
                </div>
                <div>
                  <input
                    aria-label="Buscar formulário"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar nome ou WhatsApp"
                    value={query}
                  />
                  <button
                    disabled={!leads.length}
                    onClick={exportCsv}
                    type="button"
                  >
                    Exportar CSV
                  </button>
                </div>
              </div>
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Contato</th>
                      <th>Local</th>
                      <th>Interesse</th>
                      <th>Principais respostas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id}>
                        <td>{formatDate(lead.criado_em)}</td>
                        <td>
                          <strong>{lead.nome}</strong>
                          <span>{lead.whatsapp}</span>
                          {lead.instagram && <span>{lead.instagram}</span>}
                        </td>
                        <td>{lead.cidade}</td>
                        <td>
                          <span className={styles.status}>
                            {lead.nivel_interesse}
                          </span>
                        </td>
                        <td>
                          <span>
                            {(lead.respostas.sintomas ?? [])
                              .slice(0, 3)
                              .join(", ") || "—"}
                          </span>
                          <small>
                            {lead.respostas.tempo || "Tempo não informado"}
                          </small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filteredLeads.length && (
                  <p className={styles.empty}>
                    Nenhum formulário completo neste período.
                  </p>
                )}
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
