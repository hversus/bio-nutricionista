create extension if not exists pgcrypto;

create table if not exists public.leads_nutricionista (
  id uuid primary key default gen_random_uuid(), nome text not null, whatsapp text not null, cidade text not null,
  instagram text, objetivo text not null, nivel_interesse text not null, respostas jsonb not null default '{}'::jsonb,
  consentimento boolean not null default false, origem text not null default 'bio_instagram', status text not null default 'novo', criado_em timestamptz not null default now()
);
alter table public.leads_nutricionista enable row level security;
revoke all on public.leads_nutricionista from anon, authenticated;
