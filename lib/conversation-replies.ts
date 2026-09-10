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
  const diagnosisOnly = selected.has("Já tenho diagnóstico") && !descriptions.length;
  const opening = diagnosisOnly
    ? `${greeting(context.nome)}ter o diagnóstico já nos esclarece muitas coisas. Que bom que você buscou ajuda, assim vai ter o direcionamento certo.`
    : descriptions.length
    ? `${greeting(context.nome)}você me contou sobre ${join(descriptions)}.`
    : `${greeting(context.nome)}obrigada por compartilhar sua história comigo.`;
  if (selected.has("Já tenho diagnóstico")) {
    return diagnosisOnly
      ? opening
      : `${opening} Como você também marcou que já tem um diagnóstico, vou precisar conhecer o acompanhamento que você já faz e o que ainda te incomoda hoje.`;
  }
  if (selected.has("Formigamento nas mãos e pés") || selected.has("Feridas que demoram a cicatrizar") || selected.has("Sede excessiva")) {
    return `${opening} Vou buscar entender como esses sinais aparecem no seu dia a dia e se você já buscou uma avaliação para eles.`;
  }
  if (selected.has("Fome frequente") || selected.has("Vontade/compulsão por doces")) {
    return `${opening} Vou precisar entender seus horários, suas refeições e os momentos em que isso acontece, sem julgamentos sobre o que você come.`;
  }
  if (selected.has("Sono ou cansaço depois das refeições") || selected.has("Falta de energia ao longo do dia")) {
    return `${opening} Vou precisar conhecer sua alimentação e seu descanso, e entender em quais momentos você sente mais essa mudança na disposição.`;
  }
  return `${opening} Vou precisar entender o que mudou no seu corpo e quais são as suas expectativas, para pensar em um acompanhamento que caiba na sua rotina.`;
}

const symptomDurationReplies: Record<string, string> = {
  "Menos de 6 meses": "Você percebeu isso há menos de seis meses. Falaremos sobre o que mudou na sua rotina nesse período e como você estava antes.",
  "6 meses a 1 ano": "Já são alguns meses convivendo com isso. Falaremos sobre a frequência ou se houve fases em que você se sentiu melhor.",
  "1 a 3 anos": "Entre um e três anos é uma parte da sua história que merece ser ouvida. Falaremos sobre o que mudou nesse caminho e o que mais te incomoda hoje.",
  "Mais de 3 anos": "Você convive com isso há mais de três anos. Quero ouvir essa trajetória com calma, incluindo o que já ajudou e o que continua difícil.",
  "Há tanto tempo que já considerei normal": "Entendi. Quando algo faz parte da rotina por tanto tempo, a gente pode acabar se acostumando. Quero dar espaço para você falar do que sente e do que gostaria de mudar.",
};

const diagnosisDurationReplies: Record<string, string> = {
  "Menos de 6 meses": "Você teve o diagnóstico recentemente. Falaremos sobre o que mudou na sua rotina nesse período e como você estava antes.",
  "6 meses a 1 ano": "Já são alguns meses convivendo com esse resultado. Falaremos sobre o que mudou e o que mais tem te incomodado.",
  "1 a 3 anos": "Entre um e três anos de diagnóstico é uma parte da sua história que merece ser ouvida. Falaremos sobre o que mudou nesse caminho e o que mais te incomoda hoje.",
  "Mais de 3 anos": "Você convive com isso há mais de três anos. Quero ouvir essa trajetória com calma, incluindo o que já ajudou e o que continua difícil.",
  "Há tanto tempo que já considerei normal": "Quando algo faz parte da rotina por tanto tempo, a gente pode acabar se acostumando. Mas não podemos deixar como está. Quero dar espaço para você falar do que sente e do que gostaria de mudar.",
};

export function durationReply(context: Context): string {
  const replies = context.sintomas.includes("Já tenho diagnóstico")
    ? diagnosisDurationReplies
    : symptomDurationReplies;
  return replies[context.tempo] ?? "Obrigada por me contar há quanto tempo isso faz parte da sua rotina.";
}

const attemptReplies: Record<string, string> = {
  "Cortou açúcar e carboidratos": "Você já tentou cortar açúcar e carboidratos. Muitas pacientes já relataram isso, mas existem estratégias que precisam estar alinhadas para que dê certo. Cortar totalmente não é para todas, depende da realidade de cada uma. É isso que vamos analisar juntas.",
  "Protocolo da internet": "Você tentou seguir um protocolo da internet. Normalmente, as pacientes que relatam isso dizem que desistiram na primeira ou segunda semana, justamente porque um protocolo da internet não foi feito especificamente para você, para a sua rotina e para as intercorrências que podem acontecer. Mas vamos construir seu próprio protocolo juntas.",
  "Passou por médico ou nutri": "Se você já buscou ajuda profissional antes, vamos conversar sobre as orientações que recebeu, o que deu certo, o que não conseguiu manter, o que foi fácil, o que foi difícil e, claro, o motivo de não ter dado certo antes e quais mudanças precisaremos fazer para que dê certo dessa vez.",
  "Remédio pra emagrecer": "Você já tentou um remédio para emagrecer. Isso é muito comum hoje em dia. Entenda: o uso de remédios com acompanhamento médico e nutricional é totalmente válido. Inclusive, se você quer ou precisa continuar com o uso, fico feliz em ter me procurado. O erro é achar que o remédio sozinho consegue os resultados por você; ele vai auxiliar, assim como o médico e o nutricionista auxiliam. 90% do seu resultado depende apenas de você.",
  "Chás e shots matinais": "Se você já tentou incluir chás e shots matinais na rotina, saiba que eu não sou contra. Se você gosta, podemos incluir no seu protocolo. Você só precisa ter consciência de que os resultados não vêm apenas deles, mas do conjunto de estratégias que vamos usar.",
  "Ainda nada": "Eu amo essa resposta, sabe por quê? Isso me diz muito sobre o seu perfil de paciente: aquela que reconhece que precisa de ajuda, tira todas as dúvidas comigo, confia no que eu digo, coloca em prática e vê resultados. Não vai atrás de coisas aleatórias na internet, porque sabe que tratamentos de saúde são individualizados. Gosto muito de trabalhar com esse perfil de paciente e espero que eu esteja certa sobre você. Ansiosa para saber.",
};

export function attemptReply(value: string, _context: Context): string {
  return attemptReplies[value] ?? "Quero entender sua experiência e o que faz sentido para a sua rotina.";
}
