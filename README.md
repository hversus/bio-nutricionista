# Bio interativa para nutricionista

Funil conversacional em Next.js, React, TypeScript, Tailwind e Supabase, preparado para deploy na Vercel.

## Rodar localmente

1. Instale Node.js 18.17+.
2. Execute `npm install` e depois `npm run dev`.
3. Copie `.env.example` para `.env.local` e preencha as variáveis.

## Configurar o Supabase

No SQL Editor do projeto, execute [`supabase/schema.sql`](./supabase/schema.sql). A tabela usa RLS e não permite leitura pública; apenas a rota do servidor, com `SUPABASE_SERVICE_ROLE_KEY`, insere os leads.

## Vercel

Importe o repositório, configure `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `NEXT_PUBLIC_WHATSAPP_NUMBER` nas Environment Variables e faça o deploy. Nunca coloque a service role key em uma variável `NEXT_PUBLIC_`.

## Consultar leads

No Supabase, abra Table Editor > `leads_nutricionista`, ou use o SQL Editor com `select * from public.leads_nutricionista order by criado_em desc;` usando uma sessão administrativa.
