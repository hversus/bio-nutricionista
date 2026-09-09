export type Patient = {
  id: string; source_session_id: string | null; name: string; phone: string;
  start_date: string; end_date: string | null; status: 'active' | 'paused' | 'completed';
  goals: string; notes: string; planned_consultations: number; contact_interval_days: number;
  created_at: string; updated_at: string;
};
export type PatientEntry = {
  id: string; patient_id: string; kind: 'consultation' | 'contact' | 'diet' | 'note';
  title: string; occurred_at: string; status: 'scheduled' | 'completed' | 'cancelled';
  notes: string; created_at: string; updated_at: string;
};
export type PatientSeed = { sessionId: string; name: string; phone: string };
export const kindLabels = { consultation: 'Consulta', contact: 'Contato', diet: 'Alteração de dieta', note: 'Observação' };
export const statusLabels = { active: 'Em acompanhamento', paused: 'Pausado', completed: 'Concluído' };
export const entryStatusLabels = { scheduled: 'Agendado', completed: 'Realizado', cancelled: 'Cancelado' };
export function dateLabel(value: string | null | undefined, time = false) {
  if (!value) return 'Não registrado';
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? 'Data inválida' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', ...(time ? { timeStyle: 'short' as const } : {}) }).format(date);
}
export function localInput(value = new Date().toISOString()) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0,16);
}
export function patientMetrics(patient: Patient, entries: PatientEntry[], now = Date.now()) {
  const history = entries.filter(e => e.patient_id === patient.id);
  const completed = history.filter(e => e.status === 'completed' && Date.parse(e.occurred_at) <= now).sort((a,b) => Date.parse(b.occurred_at)-Date.parse(a.occurred_at));
  const lastContact = completed.find(e => e.kind === 'contact' || e.kind === 'consultation');
  const lastDiet = completed.find(e => e.kind === 'diet');
  const next = history.filter(e => e.kind === 'consultation' && e.status === 'scheduled' && Date.parse(e.occurred_at) >= now).sort((a,b) => Date.parse(a.occurred_at)-Date.parse(b.occurred_at))[0];
  const overdue = history.filter(e => e.status === 'scheduled' && Date.parse(e.occurred_at) < now);
  const reference = lastContact?.occurred_at || `${patient.start_date}T00:00:00`;
  const daysWithoutContact = Math.max(0, Math.floor((now-Date.parse(reference))/86400000));
  const contactDue = patient.status === 'active' && daysWithoutContact >= patient.contact_interval_days;
  const count = completed.filter(e => e.kind === 'consultation').length;
  return { history, completed, lastContact, lastDiet, next, overdue, daysWithoutContact, contactDue, count, progress: Math.min(100,Math.round(count/patient.planned_consultations*100)) };
}
export function patientSummary(patient: Patient, entries: PatientEntry[], now = Date.now()) {
  const m = patientMetrics(patient,entries,now);
  const lastConsultation = m.completed.find(e => e.kind === 'consultation');
  return [
    `RESUMO DO ACOMPANHAMENTO — ${patient.name}`,
    `Gerado em ${dateLabel(new Date(now).toISOString(),true)} · com base nos registros salvos.`,
    `Situação: ${statusLabels[patient.status]}. Início: ${dateLabel(patient.start_date)}.${patient.end_date ? ` Término previsto: ${dateLabel(patient.end_date)}.` : ''}`,
    `Objetivos: ${patient.goals || 'Não registrados.'}`,
    `Consultas realizadas: ${m.count} de ${patient.planned_consultations} previstas.`,
    `Última consulta: ${lastConsultation ? `${dateLabel(lastConsultation.occurred_at,true)} — ${lastConsultation.title}${lastConsultation.notes ? `. ${lastConsultation.notes}` : ''}` : 'Não registrada.'}`,
    `Próxima consulta: ${m.next ? `${dateLabel(m.next.occurred_at,true)} — ${m.next.title}` : 'Nenhuma agendada.'}`,
    `Último contato (inclui consultas): ${m.lastContact ? `${dateLabel(m.lastContact.occurred_at,true)} — ${m.lastContact.title}` : 'Não registrado.'}`,
    `Última alteração de dieta: ${m.lastDiet ? `${dateLabel(m.lastDiet.occurred_at,true)} — ${m.lastDiet.title}${m.lastDiet.notes ? `. ${m.lastDiet.notes}` : ''}` : 'Não registrada.'}`,
    `Pendências: ${m.overdue.length ? `${m.overdue.length} registro(s) agendado(s) com data passada; confirmar realização ou reagendar.` : 'Nenhum agendamento vencido.'}${m.contactDue ? ` Retomar contato: ${m.daysWithoutContact} dias ${m.lastContact ? 'desde o último contato' : 'desde o início, sem contato registrado'}.` : ''}`,
    `Observações do acompanhamento: ${patient.notes || 'Não registradas.'}`,
    ...(m.completed.filter(e => e.kind === 'note').slice(0,3).map(e => `Observação em ${dateLabel(e.occurred_at)}: ${e.title}${e.notes ? ` — ${e.notes}` : ''}`)),
  ].join('\n\n');
}
