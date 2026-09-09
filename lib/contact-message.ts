export type ContactEvent = { session_id: string; event_name: string; step_key: string; answer: unknown; created_at: string; metadata?: Record<string, unknown> };
export type ContactLead = {
  session_id: string; nome: string; whatsapp: string; criado_em: string;
  cidade?: string; instagram?: string | null; nivel_interesse?: string;
  respostas?: { sintomas?: string[]; tempo?: string | null; tentativas?: string | null; mora_fora?: boolean; origem?: string | null; demo?: boolean };
};
export const answerLabels: Record<string, string> = {
  nome: "Nome", sintomas: "Sintomas relatados", tempo: "Há quanto tempo",
  tentou: "O que já tentou", fora: "Onde mora", whatsapp: "WhatsApp",
  instagram: "Instagram", origem: "Como chegou", decisao: "Próximo passo escolhido",
};
export function displayAnswer(value: unknown): string {
  if (Array.isArray(value)) return value.filter(v => typeof v === "string").join(", ");
  return typeof value === "string" ? value.trim() : "";
}
export function collectAnswers(events: ContactEvent[], lead?: ContactLead | null): Record<string, unknown> {
  const replies: Record<string, unknown> = {};
  for (const event of [...events].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))) {
    if (event.event_name === "answered") replies[event.step_key] = event.answer;
  }
  // A completed submission is the final snapshot, including explicitly skipped fields.
  if (lead) {
    const data = lead.respostas;
    const snapshot = {
      nome: lead.nome, whatsapp: lead.whatsapp, instagram: lead.instagram ?? undefined,
      sintomas: data?.sintomas, tempo: data?.tempo, tentou: data?.tentativas,
      fora: data?.mora_fora === true ? "Fora do Brasil" : data?.mora_fora === false ? "Brasil" : lead.cidade,
      origem: data?.origem, decisao: lead.nivel_interesse,
    };
    for (const [key, value] of Object.entries(snapshot)) if (value !== undefined && value !== null) replies[key] = value;
  }
  return replies;
}
export function firstContact(replies: Record<string, unknown>, complete: boolean, sender: string): string {
  const name = displayAnswer(replies.nome).replace(/^\[DEMO\]\s*/i, "").split(/\s+/)[0];
  const rawSymptoms = Array.isArray(replies.sintomas) ? replies.sintomas.filter((value): value is string => typeof value === "string") : [];
  const reportsDiagnosis = rawSymptoms.some(value => /já tenho diagnóstico/i.test(value));
  const symptoms = rawSymptoms.length ? rawSymptoms.filter(value => !/já tenho diagnóstico/i.test(value)).join(", ") : displayAnswer(replies.sintomas);
  const duration = displayAnswer(replies.tempo);
  const attempt = displayAnswer(replies.tentou);
  const decision = displayAnswer(replies.decisao);
  const paragraphs = [`Oi${name ? `, ${name}` : ""}! Tudo bem? Aqui é ${sender.trim() || "a equipe de nutrição"}. Obrigada por compartilhar suas respostas no formulário.`];
  const durationPhrases: Record<string, string> = { "Menos de 6 meses": "há menos de seis meses", "6 meses a 1 ano": "há seis meses a um ano", "1 a 3 anos": "há um a três anos", "Mais de 3 anos": "há mais de três anos", "Há tanto tempo que já considerei normal": "há tanto tempo que você já chegou a considerar normal", "Há alguns meses": "há alguns meses", "Há mais de 1 ano": "há mais de um ano", "Há vários anos": "há vários anos" };
  const timeContext = durationPhrases[duration] ? `, que você relata sentir ${durationPhrases[duration]}` : duration ? ` e vi que você marcou “${duration}” sobre há quanto tempo isso acontece` : "";
  if (symptoms) paragraphs.push(`Li o que você contou sobre ${symptoms.charAt(0).toLowerCase() + symptoms.slice(1)}${timeContext}. Quero entender como isso está afetando o seu dia a dia.`);
  else if (duration) paragraphs.push(`Vi que você marcou “${duration}” sobre há quanto tempo sente esses incômodos. Quero ouvir um pouco mais sobre o que está acontecendo.`);
  if (reportsDiagnosis) paragraphs.push("Você sinalizou que já tem um diagnóstico. Se quiser, me conta qual foi e como está o seu acompanhamento hoje.");
  if (attempt) {
    if (/^(ainda nada|ainda não tentei nada)$/i.test(attempt)) paragraphs.push("Você comentou que ainda não tentou nenhuma abordagem. Podemos conversar com calma sobre como começar.");
    else paragraphs.push(`Você também marcou “${attempt}”. Gostaria de entender como foi essa experiência e o que fez diferença para você.`);
  }
  // Respect an explicit hesitation even if the final submission has not arrived.
  if (/ainda não|não quero|nao quero/i.test(decision)) paragraphs.push("Vi que você prefere não começar agora, e tudo bem. Se quiser conversar, qual é a principal dúvida que ficou? Sem compromisso.");
  else if (!complete) paragraphs.push("Recebi parte das suas respostas. Ficou alguma dúvida ou algo que dificultou continuar? Se preferir, podemos conversar por aqui, no seu tempo.");
  else if (/direto|acompanhamento/i.test(decision) && !/diagnóstico|diagnostico/i.test(decision)) paragraphs.push("Vi que você tem interesse no acompanhamento. Posso te explicar os próximos passos e entender o que você espera desse processo?");
  else if (/diagnóstico|diagnostico/i.test(decision)) paragraphs.push("Vi que você quer começar pela consulta de diagnóstico. Quer que eu te passe as opções de horário para conversarmos sobre o seu caso?");
  else paragraphs.push("O que você mais gostaria de melhorar neste momento? Quero entender suas prioridades antes de explicar os próximos passos.");
  if (/fora/i.test(displayAnswer(replies.fora))) paragraphs.push("Como você mora fora do Brasil, me conta também o seu fuso horário para combinarmos um horário confortável para você.");
  return paragraphs.join("\n\n");
}
export function suggestedPhone(replies: Record<string, unknown>): string {
  const raw = displayAnswer(replies.whatsapp);
  if (!/^[+\d\s().-]+$/.test(raw)) return "";
  const digits = raw.replace(/\D/g, "");
  const country = displayAnswer(replies.fora);
  const brazil = /brasil/i.test(country) && !/fora/i.test(country);
  if (!raw.startsWith("+") && brazil && (digits.length === 10 || digits.length === 11)) return `+55${digits}`;
  if (raw.startsWith("+") || (brazil && digits.startsWith("55") && digits.length >= 12)) return `+${digits}`;
  return raw;
}
export function whatsappNumber(raw: string): string | null {
  if (!/^\+[\d\s().-]+$/.test(raw.trim())) return null;
  const digits = raw.replace(/\D/g, "");
  return /^[1-9]\d{9,14}$/.test(digits) ? digits : null;
}
