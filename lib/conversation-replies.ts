type Context = { nome: string; sintomas: string[]; tempo: string };

const symptomDescriptions: Record<string, string> = {
  "Dificuldade para emagrecer": "a dificuldade para emagrecer",
  "Fome frequente": "a fome frequente",
  "Vontade/compulsão por doces": "a vontade intensa de comer doces",
  "Sono ou cansaço depois das refeições": "o sono ou cansaço depois das refeições",
  "Falta de energia ao longo do dia": "a falta de energia ao longo do dia",
  "Acúmulo de gordura abdominal": "o acúmulo de gordura abdominal",
  "Formigamento nas mãos e pés": "o formigamento nas mãos e pés",
  "Feridas que demoram a cicatrizar": "as feridas que demoram a cicatrizar",
  "Sede excessiva": "a sede excessiva",
};

function join(items: string[]) {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

function greeting(name: string) {
  const first = name.trim().split(/\s+/)[0];
  return first ? `${first}, ` : "";
}

export function symptomReply(context: Context): string {
  const selected = new Set(context.sintomas);
  const descriptions = Object.entries(symptomDescriptions)
    .filter(([key]) => selected.has(key)).map(([, description]) => description);
  const opening = descriptions.length
    ? `${greeting(context.nome)}você me contou sobre ${join(descriptions)}.`
    : `${greeting(context.nome)}obrigada por compartilhar sua história comigo.`;
  if (selected.has("Já tenho diagnóstico")) {
    return `${opening} Como você também marcou que já tem um diagnóstico, quero conhecer o acompanhamento que você já faz e o que ainda te incomoda hoje.`;
  }
  if (selected.has("Formigamento nas mãos e pés") || selected.has("Feridas que demoram a cicatrizar") || selected.has("Sede excessiva")) {
    return `${opening} Quero entender como esses sinais aparecem no seu dia a dia e se você já buscou uma avaliação para eles.`;
  }
  if (selected.has("Fome frequente") || selected.has("Vontade/compulsão por doces")) {
    return `${opening} No meu acompanhamento, busco entender seus horários, suas refeições e os momentos em que isso acontece, sem julgamentos sobre o que você come.`;
  }
  if (selected.has("Sono ou cansaço depois das refeições") || selected.has("Falta de energia ao longo do dia")) {
    return `${opening} Quero conhecer sua alimentação e seu descanso, e entender em quais momentos você sente mais essa mudança na disposição.`;
  }
  return `${opening} Quero entender o que mudou no seu corpo e quais são as suas expectativas, para pensar em um acompanhamento que caiba na sua rotina.`;
}

const durationReplies: Record<string, string> = {
  "Menos de 6 meses": "Você percebeu isso há pouco tempo. Vamos analisar o que mudou...",
  "6 meses a 1 ano": "Já são alguns meses convivendo com isso. Quero entender se acontece com frequência ou se houve fases em que você se sentiu melhor.",
  "1 a 3 anos": "Entre um e três anos é uma parte da sua história que merece ser ouvida. Quero conhecer o que mudou nesse caminho e o que mais te incomoda hoje.",
  "Mais de 3 anos": "Você convive com isso há mais de três anos. Quero ouvir essa trajetória com calma, incluindo o que já ajudou e o que continua difícil.",
  "Há tanto tempo que já considerei normal": "Entendi. Quando algo faz parte da rotina por tanto tempo, a gente pode acabar se acostumando. Quero dar espaço para você falar do que sente e do que gostaria de mudar.",
};

export function durationReply(context: Context): string {
  return durationReplies[context.tempo] ?? "Obrigada por me contar há quanto tempo isso faz parte da sua rotina.";
}

const attemptReplies: Record<string, string> = {
  "Cortou açúcar e carboidratos": "Se você já tentou cortar açúcar e carboidratos. Vou precisar saber como se sentiu com essas mudanças e o que foi possível manter na sua rotina.",
  "Protocolo da internet": "Você tentou seguir um protocolo da internet. Quero ouvir como foi colocar isso em prática e quais partes combinaram, ou não, com a sua rotina.",
  "Passou por médico ou nutri": "Você já buscou ajuda profissional. Quero conhecer as orientações que recebeu, o que funcionou para você e o que ainda precisa de atenção.",
  "Chás e shots matinais": "Você já tentou incluir chás e shots matinais na rotina. Quero entender o que esperava dessas mudanças, como se sentiu e o que percebeu depois de começar.",
  "Cortei glúten, lactose ou açúcar por conta": "Você já tentou tirar alimentos por conta própria. Quero entender como se sentiu com essas mudanças e o que foi possível manter na sua rotina.",
  "Probiótico ou laxante da farmácia": "Você buscou uma alternativa na farmácia. Quero saber o que motivou esse uso e como você se sentiu depois, para conhecer melhor o que já tentou.",
  "Protocolo que vi na internet": "Você tentou seguir um protocolo da internet. Quero ouvir como foi colocar isso em prática e quais partes combinaram, ou não, com a sua rotina.",
  "Já passei por médico ou nutri": "Você já buscou ajuda profissional. Quero conhecer as orientações que recebeu, o que funcionou para você e o que ainda precisa de atenção.",
  "Remédio pra emagrecer": "Você já tentou um remédio para emagrecer. Quero conhecer essa experiência e o acompanhamento que você recebeu, para considerar essa parte da sua história também.",
  "Ainda nada": "Tudo bem começar daqui. Antes de sair tentando mudanças por conta própria, podemos conhecer melhor sua alimentação, seus hábitos e o que você está sentindo.",
};

export function attemptReply(value: string, context: Context): string {
  const response = attemptReplies[value] ?? "Quero entender sua experiência e o que faz sentido para a sua rotina.";
  const longDuration = ["1 a 3 anos", "Mais de 3 anos", "Há tanto tempo que já considerei normal"].includes(context.tempo);
  const bridge = context.sintomas.includes("Já tenho diagnóstico")
    ? " Vou considerar também o diagnóstico que você mencionou e os cuidados que já fazem parte da sua rotina."
    : longDuration
      ? " Como você contou que isso já vem de bastante tempo, quero conhecer essa trajetória antes de combinar os próximos passos."
      : "";
  return `${response}${bridge}`;
}
